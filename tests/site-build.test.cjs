"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const project = path.resolve(__dirname, "..");

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lizpink-site-"));
  t.after(async () => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("lizpink-site-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.cp(path.join(project, "site"), path.join(root, "site"), { recursive: true });
  await fs.cp(path.join(project, "content"), path.join(root, "content"), { recursive: true });
  return root;
}

test("full build renders author settings, copies PDF and replaces stale generated assets", async t => {
  const { build } = await import("../scripts/build.mjs");
  const root = await fixture(t);
  const config = path.join(root, "content/site.yml");
  let yaml = await fs.readFile(config, "utf8");
  yaml = yaml.replace(/^name:.*$/m, 'name: "Author & <name>"').replace(/^greeting:.*$/m, 'greeting: "Hello, Author & <name>"')
    .replace('pdfUrl: ""', 'pdfUrl: "./files/resume.pdf"');
  await fs.writeFile(config, yaml);
  await fs.mkdir(path.join(root, "content/files"), { recursive: true });
  await fs.writeFile(path.join(root, "content/files/resume.pdf"), "%PDF-1.4\nfixture");
  const content = await build(root);
  const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8");
  assert.match(html, /Author &amp; &lt;name&gt;/);
  assert.doesNotMatch(html, /\{\{SITE_/);
  assert.match(html, /Hello, <span>Author &amp; &lt;name&gt;<\/span>/);
  assert.equal(await fs.readFile(path.join(root, "dist/files/resume.pdf"), "utf8"), "%PDF-1.4\nfixture");
  const window = {};
  vm.runInNewContext(await fs.readFile(path.join(root, "dist/assets/js/content.js"), "utf8"), { window });
  assert.equal(window.LIZPINK_CONTENT.name, content.name);
  assert.equal(Object.keys(window.LIZPINK_CONTENT.samples).length, 6);
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
  const markdown = path.join(root, "content/entries/geometry/index.md");
  const original = await fs.readFile(markdown, "utf8");
  await fs.writeFile(markdown, original.replace("2026-10-22", "2026-02-31"));
  await assert.rejects(build(root), /publishedAt/);
  assert.equal(await fs.readFile(path.join(root, "dist/assets/js/content.js"), "utf8"), previous);
  assert.deepEqual(await fs.readdir(path.join(root, ".build")), []);
  await fs.writeFile(markdown, original);
  await build(root);
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
