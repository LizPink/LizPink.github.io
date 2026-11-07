"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { parse, stringify } = require("yaml");
const project = path.resolve(__dirname, "..");

async function fixture(t, { article = true } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lizpink-site-"));
  t.after(async () => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("lizpink-site-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.cp(path.join(project, "site"), path.join(root, "site"), { recursive: true });
  const entries = path.join(root, "content/entries");
  await fs.mkdir(entries, { recursive: true });
  await fs.writeFile(path.join(root, "content/site.yml"), stringify({
    name: "Test author", greeting: "Hello, Test author", role: "Student", interests: ["Graphics"],
    about: { paragraphs: ["A temporary test site."] }, resume: { sections: [], pdfUrl: "" },
    paths: ["life", "resume", "project"].map(id => ({ id, title: id, description: `${id} description` }))
  }));
  await fs.writeFile(path.join(entries, ".gitkeep"), "");
  if (article) {
    await fs.mkdir(path.join(entries, "article"));
    await fs.writeFile(path.join(entries, "article/index.md"),
      '---\ntitle: Test article\nsections: [project]\npublishedAt: "2026-10-22"\n---\nA temporary test article.\n');
  }
  return root;
}

test("an empty content directory builds all three empty sections and removes previous published media", async t => {
  const { build } = await import("../scripts/build.mjs");
  const root = await fixture(t, { article: false });
  const oldMedia = path.join(root, "dist/assets/content/previous");
  await fs.mkdir(oldMedia, { recursive: true });
  await fs.writeFile(path.join(oldMedia, "old.svg"), "<svg/>");
  const content = await build(root);
  assert.deepEqual(Object.keys(content.samples), []);
  assert.deepEqual(content.paths.map(item => item.id).sort(), ["life", "project", "resume"]);
  content.paths.forEach(item => assert.deepEqual(item.items, []));
  assert.deepEqual(await fs.readdir(path.join(root, "content/entries")), [".gitkeep"]);
  assert.deepEqual(await fs.readdir(path.join(root, "dist/assets/content")), []);
  const window = {};
  vm.runInNewContext(await fs.readFile(path.join(root, "dist/assets/js/content.js"), "utf8"), { window });
  assert.deepEqual(Object.keys(window.LIZPINK_CONTENT.samples), []);
  assert.doesNotMatch(await fs.readFile(path.join(root, "dist/index.html"), "utf8"), /\{\{SITE_|undefined/);
  assert.deepEqual(await fs.readdir(path.join(root, ".build")), []);
});

test("full build without a site description escapes author settings, copies PDF and replaces stale generated assets", async t => {
  const { build } = await import("../scripts/build.mjs");
  const root = await fixture(t);
  const config = path.join(root, "content/site.yml");
  const settings = parse(await fs.readFile(config, "utf8"));
  settings.name = "Author & <name>";
  settings.greeting = "Hello, Author & <name> <script>bad()</script>";
  settings.resume.pdfUrl = "./files/resume.pdf";
  assert.equal(Object.hasOwn(settings, "description"), false);
  await fs.writeFile(config, stringify(settings));
  await fs.mkdir(path.join(root, "content/files"), { recursive: true });
  await fs.writeFile(path.join(root, "content/files/resume.pdf"), "%PDF-1.4\nfixture");
  const content = await build(root);
  const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8");
  assert.match(html, /Author &amp; &lt;name&gt;/);
  assert.doesNotMatch(html, /\{\{SITE_/);
  assert.match(html, /Hello, <span>Author &amp; &lt;name&gt;<\/span>/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<name>|<script>bad\(\)<\/script>|undefined|<meta\b[^>]*\bname=["']description["']/i);
  assert.equal(Object.hasOwn(content, "description"), false);
  assert.ok(content.paths.every(item => typeof item.description === "string" && item.description.length > 0));
  assert.equal(await fs.readFile(path.join(root, "dist/files/resume.pdf"), "utf8"), "%PDF-1.4\nfixture");
  const window = {};
  vm.runInNewContext(await fs.readFile(path.join(root, "dist/assets/js/content.js"), "utf8"), { window });
  assert.equal(window.LIZPINK_CONTENT.name, content.name);
  assert.equal(Object.hasOwn(window.LIZPINK_CONTENT, "description"), false);
  assert.deepEqual(Object.keys(window.LIZPINK_CONTENT.samples), ["article"]);
  await fs.writeFile(path.join(root, "dist/stale.txt"), "old generated content");
  await build(root);
  await assert.rejects(fs.stat(path.join(root, "dist/stale.txt")), { code: "ENOENT" });
  assert.deepEqual(await fs.readdir(path.join(root, ".build")), []);
});

test("invalid content preserves the complete previous website and releases its build lock", async t => {
  const { build } = await import("../scripts/build.mjs");
  const root = await fixture(t);
  await build(root);
  const previous = await fs.readFile(path.join(root, "dist/assets/js/content.js"), "utf8");
  const markdown = path.join(root, "content/entries/article/index.md");
  const original = await fs.readFile(markdown, "utf8");
  await fs.writeFile(markdown, original.replace("2026-10-22", "2026-02-31"));
  await assert.rejects(build(root), /publishedAt/);
  assert.equal(await fs.readFile(path.join(root, "dist/assets/js/content.js"), "utf8"), previous);
  assert.deepEqual(await fs.readdir(path.join(root, ".build")), []);
  await fs.writeFile(markdown, original);
  await build(root);
});

function assetReferences(html) {
  return new Map([...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)]
    .map(match => match[1].replace(/&amp;/g, "&"))
    .map(url => [url.split(/[?#]/, 1)[0], url]));
}

test("published assets have deterministic versions that follow code, styles and font changes", async t => {
  const { build } = await import("../scripts/build.mjs");
  const { assetVersion } = await import("../scripts/asset-version.mjs");
  const root = await fixture(t);
  const htmlFile = path.join(root, "site/index.html");
  const source = (await fs.readFile(htmlFile, "utf8"))
    .replace('./assets/js/theme.js"', './assets/js/theme.js?mode=one%20two&amp;v=old#boot"');
  await fs.writeFile(htmlFile, source);
  const styleFile = path.join(root, "site/assets/css/styles.css");
  const cssSource = await fs.readFile(styleFile, "utf8");
  await build(root);
  const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8");
  const before = assetReferences(html);
  for (const [pathname, url] of before) {
    const version = new URL(url, "https://example.test/").searchParams.get("v");
    assert.match(version, /^[a-f0-9]{16}$/);
    assert.equal(version, await assetVersion(path.join(root, "dist", pathname)));
  }
  assert.match(before.get("./assets/js/theme.js"), /\?mode=one%20two&v=[a-f0-9]{16}#boot$/);
  assert.equal(await fs.readFile(htmlFile, "utf8"), source);
  assert.equal(await fs.readFile(styleFile, "utf8"), cssSource);
  const css = await fs.readFile(path.join(root, "dist/assets/css/styles.css"), "utf8");
  for (const match of css.matchAll(/url\("([^"]+)"\)/g)) {
    const url = new URL(match[1], "https://example.test/assets/css/styles.css");
    assert.match(url.searchParams.get("v"), /^[a-f0-9]{16}$/);
    const preload = before.get(`.${url.pathname}`);
    if (preload) assert.equal(new URL(preload, "https://example.test/").search, url.search);
  }
  await build(root);
  assert.equal(await fs.readFile(path.join(root, "dist/index.html"), "utf8"), html);
  // A code-only update must change its URL without invalidating unrelated CSS.
  await fs.appendFile(path.join(root, "site/assets/js/commands.js"), "\n// cache regression update\n");
  await build(root);
  const codeUpdate = assetReferences(await fs.readFile(path.join(root, "dist/index.html"), "utf8"));
  assert.notEqual(codeUpdate.get("./assets/js/commands.js"), before.get("./assets/js/commands.js"));
  assert.equal(codeUpdate.get("./assets/css/styles.css"), before.get("./assets/css/styles.css"));
  // A font replacement updates both its preload and the CSS that refers to it.
  await fs.appendFile(path.join(root, "site/assets/fonts/IBMPlexMono-Regular.woff2"), Buffer.from([1]));
  await build(root);
  const fontUpdate = assetReferences(await fs.readFile(path.join(root, "dist/index.html"), "utf8"));
  assert.notEqual(fontUpdate.get("./assets/fonts/IBMPlexMono-Regular.woff2"), before.get("./assets/fonts/IBMPlexMono-Regular.woff2"));
  assert.notEqual(fontUpdate.get("./assets/css/styles.css"), before.get("./assets/css/styles.css"));
  assert.equal(fontUpdate.get("./assets/js/commands.js"), codeUpdate.get("./assets/js/commands.js"));
});

test("missing static references preserve the prior release, while external URLs remain unchanged", async t => {
  const { build } = await import("../scripts/build.mjs");
  const root = await fixture(t);
  const file = path.join(root, "site/index.html");
  const source = await fs.readFile(file, "utf8");
  const external = '<link rel="stylesheet" href="https://example.test/external.css?v=remote">';
  await fs.writeFile(file, source.replace("</head>", `${external}</head>`));
  await build(root);
  const previous = await fs.readFile(path.join(root, "dist/index.html"), "utf8");
  assert.ok(previous.includes(external));
  await fs.writeFile(file, source.replace("./assets/js/theme.js", "./assets/js/missing.js"));
  await assert.rejects(build(root), { code: "ENOENT" });
  assert.equal(await fs.readFile(path.join(root, "dist/index.html"), "utf8"), previous);
  assert.deepEqual(await fs.readdir(path.join(root, ".build")), []);
  await fs.writeFile(file, source.replace("./assets/js/theme.js", "../package.json"));
  await assert.rejects(build(root), /静态资源必须位于发布目录内/);
  assert.equal(await fs.readFile(path.join(root, "dist/index.html"), "utf8"), previous);
});

test("preview serves usable MP4 ranges and HEAD responses without exposing parent files", async t => {
  const { serve } = await import("../scripts/serve.mjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lizpink-http-"));
  await fs.writeFile(path.join(root, "movie.MP4"), "0123456789");
  const app = serve({ root, port: 0 }); await app.ready;
  t.after(async () => {
    app.close();
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("lizpink-http-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const response = await fetch(`${base}/movie.MP4`, { headers: { Range: "bytes=2-5" } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-type"), "video/mp4");
  assert.equal(response.headers.get("content-range"), "bytes 2-5/10");
  assert.equal(await response.text(), "2345");
  const suffix = await fetch(`${base}/movie.MP4`, { headers: { Range: "bytes=-3" } });
  assert.equal(await suffix.text(), "789");
  const invalid = await fetch(`${base}/movie.MP4`, { headers: { Range: "bytes=20-" } });
  assert.equal(invalid.status, 416);
  const head = await fetch(`${base}/movie.MP4`, { method: "HEAD" });
  assert.equal(head.headers.get("content-length"), "10");
  assert.equal(await head.text(), "");
  const traversal = await fetch(`${base}/..%5cpackage.json`);
  assert.ok([403, 404].includes(traversal.status));
});
