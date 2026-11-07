"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const { stringify } = require("yaml");

const builder = import("../scripts/build-content.mjs");
const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="gold"/></svg>';

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

async function fixture(t, { body = "", files = {} } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "html-content-test-"));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("html-content-test-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  const contentDir = path.join(root, "content");
  const outputDir = path.join(root, "output");
  const entryDir = path.join(contentDir, "entries", "article");
  const source = path.join(entryDir, "index.md");
  await write(path.join(contentDir, "site.yml"), stringify({
    name: "HTML reader", greeting: "Hello", role: "Student", interests: [],
    about: { paragraphs: [] }, resume: { sections: [], pdfUrl: "" },
    paths: ["life", "resume", "project"].map(id => ({ id, title: id }))
  }));
  const setBody = value => write(source,
    `---\n${stringify({ title: "Article", sections: ["project"], publishedAt: "2026-11-01" })}---\n${value}\n`);
  await setBody(body);
  for (const [name, value] of Object.entries(files)) await write(path.join(entryDir, name), value);
  return {
    root, contentDir, outputDir, entryDir, source, setBody,
    async build() { return (await builder).buildContent({ contentDir, outputDir }); }
  };
}

function assertVersionedPicture(body) {
  assert.match(body, /<figure\b[^>]*class="sample-media"/);
  assert.match(body, /class="media-zoom"/);
  assert.match(body, /src="\.\/assets\/content\/article\/photos\/box\.svg\?v=[a-f0-9]{16}"/);
  assert.doesNotMatch(body, /<p>\s*<figure\b/);
}

test("ordinary HTML links and inline formatting render alongside Markdown without active attributes", async t => {
  const f = await fixture(t, { body: [
    '<p>HTML <strong>bold</strong> and <em>emphasis</em>, <code>BRDF</code>, <a href="https://example.org/render?x=1&amp;y=2" onclick="alert(1)">project</a>.</p>',
    "",
    "Markdown **still works** and [another link](https://example.org/notes)."
  ].join("\n") });
  const body = (await f.build()).samples.article.body;
  assert.match(body, /<strong>bold<\/strong>/);
  assert.match(body, /<em>emphasis<\/em>/);
  assert.match(body, /<code>BRDF<\/code>/);
  assert.match(body, /href="https:\/\/example\.org\/render\?x=1&amp;y=2"/);
  assert.match(body, />project<\/a>/);
  assert.match(body, /<strong>still works<\/strong>/);
  assert.match(body, /href="https:\/\/example\.org\/notes"/);
  assert.doesNotMatch(body, /\bonclick\s*=/i);
});

test("HTML headings contribute article outline metadata and use existing internal heading links", async t => {
  const f = await fixture(t, { body: '<h2>Section &amp; One</h2>\n\n<p><a href="#section-one">Jump here</a></p>\n\n<h3>Details</h3>' });
  const sample = (await f.build()).samples.article;
  assert.deepEqual(sample.headings.map(({ text, level }) => ({ text, level })), [
    { text: "Section & One", level: 2 }, { text: "Details", level: 3 }
  ]);
  assert.match(sample.body, /<h2\b[^>]*id="article-section-one"/);
  assert.match(sample.body, /data-article-anchor="article-section-one"/);
  assert.match(sample.body, /href="#project\/article"/);
});

test("HTML lists and tables preserve semantic text and formatting", async t => {
  const f = await fixture(t, { body: '<ul><li>One <strong>item</strong></li><li>Two</li></ul>\n\n<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>Lambert</td><td>0.8</td></tr></tbody></table>' });
  const body = (await f.build()).samples.article.body;
  assert.match(body, /<ul>/);
  assert.match(body, /<li>One <strong>item<\/strong><\/li>/);
  assert.match(body, /<table>/);
  assert.match(body, /<th>Name<\/th>/);
  assert.match(body, /<td>Lambert<\/td>/);
  assert.match(body, /<td>0\.8<\/td>/);
});

test("HTML images use the same copied assets, captions and image viewer as Markdown media", async t => {
  const f = await fixture(t, {
    body: '<p>Before the image. <img src="./photos/box.svg" alt="Box &amp; light" onerror="alert(1)"> After the image.</p>',
    files: { "photos/box.svg": picture }
  });
  const sample = (await f.build()).samples.article;
  assertVersionedPicture(sample.body);
  assert.match(sample.body, /alt="Box &amp; light"/);
  assert.match(sample.body, /<figcaption\b[^>]*>Box &amp; light/);
  assert.match(sample.body, /Before the image\./);
  assert.match(sample.body, /After the image\./);
  assert.doesNotMatch(sample.body, /\bonerror\s*=/i);
  assert.equal(sample.mediaCounts.images, 1);
  assert.equal(await fs.readFile(path.join(f.outputDir, "assets/content/article/photos/box.svg"), "utf8"), picture);
});

test("HTML image width and Typora zoom hints become bounded figure sizing rather than arbitrary CSS", async t => {
  const f = await fixture(t, {
    body: '<img src="./photos/box.svg" alt="Width" width="320">\n\n<img src="./photos/box.svg" alt="Zoom" style="zoom:33%;position:fixed;inset:0" />',
    files: { "photos/box.svg": picture }
  });
  const body = (await f.build()).samples.article.body;
  assert.match(body, /--asset-display-width:\s*320px/);
  assert.match(body, /--asset-scale:\s*(?:0?\.33|33%)/);
  assert.doesNotMatch(body, /position\s*:\s*fixed|inset\s*:\s*0/i);
  assert.equal((body.match(/<figure\b/g) || []).length, 2);
});

test("relative backslash paths work in both Markdown and HTML without rewriting author files", async t => {
  const f = await fixture(t, {
    body: '![Markdown](.\\photos\\box.svg)\n\n<img src=".\\photos\\box.svg" alt="HTML">\n\n[PDF](.\\docs\\guide.pdf)',
    files: { "photos/box.svg": picture, "docs/guide.pdf": "%PDF-test" }
  });
  const original = await fs.readFile(f.source, "utf8");
  const sample = (await f.build()).samples.article;
  assertVersionedPicture(sample.body);
  assert.equal(sample.mediaCounts.images, 2);
  assert.match(sample.body, /href="\.\/assets\/content\/article\/docs\/guide\.pdf\?v=[a-f0-9]{16}"/);
  assert.equal(await fs.readFile(f.source, "utf8"), original);
  assert.deepEqual(await fs.readdir(path.join(f.outputDir, "assets/content/article/photos")), ["box.svg"]);
});

test("Windows separators before filename punctuation survive Markdown destination parsing", async t => {
  const f = await fixture(t, { files: { "photos/_frame.svg": picture, "photos/[frame].svg": picture } });
  const images = [
    "![Underscore](.\\photos\\_frame.svg)",
    "![Brackets](<.\\photos\\[frame].svg>)",
    "![Portable file URL](<file:///C:/old/content/entries/article/photos\\_frame.svg>)",
    "![Reference image][windows-frame]\n\n[windows-frame]: .\\photos\\_frame.svg"
  ];
  if (process.platform === "win32") {
    images.push(`![Native underscore](<${path.join(f.entryDir, "photos", "_frame.svg")}>)`);
    images.push(`![Native brackets](<${path.join(f.entryDir, "photos", "[frame].svg")}>)`);
  }
  await f.setBody(images.join("\n\n"));
  const original = await fs.readFile(f.source, "utf8");
  const sample = (await f.build()).samples.article;
  assert.equal(sample.mediaCounts.images, images.length);
  assert.match(sample.body, /src="\.\/assets\/content\/article\/photos\/_frame\.svg\?v=[a-f0-9]{16}"/);
  assert.match(sample.body, /src="\.\/assets\/content\/article\/photos\/%5Bframe%5D\.svg\?v=[a-f0-9]{16}"/);
  assert.equal(await fs.readFile(f.source, "utf8"), original);
});

test("ordinary forward-slash Markdown paths keep standard escaped parentheses", async t => {
  const f = await fixture(t, {
    body: '![Escaped parentheses](./photos/escaped\\(name\\).svg)',
    files: { "photos/escaped(name).svg": picture }
  });
  const sample = (await f.build()).samples.article;
  assert.equal(sample.mediaCounts.images, 1);
  assert.match(sample.body, /src="\.\/assets\/content\/article\/photos\/escaped\(name\)\.svg\?v=[a-f0-9]{16}"/);
});

test("a non-semantic HTML span around an image reuses the normal figure asset flow", async t => {
  const f = await fixture(t, {
    body: '<p><span><img src="./photos/box.svg" alt="Box"></span></p>',
    files: { "photos/box.svg": picture }
  });
  const sample = (await f.build()).samples.article;
  assertVersionedPicture(sample.body);
  assert.equal(sample.mediaCounts.images, 1);
  assert.match(sample.body, /<figcaption\b[^>]*>Box/);
});

test("absolute native paths and file URLs resolve only inside the current article", async t => {
  const f = await fixture(t, { files: { "photos/box.svg": picture } });
  const nativePath = path.join(f.entryDir, "photos", "box.svg");
  const fileUrl = pathToFileURL(nativePath).href;
  const markdownPaths = [nativePath, fileUrl];
  if (process.platform === "win32") markdownPaths.push(nativePath.replaceAll("\\", "/"));
  await f.setBody([
    `<img src="${nativePath}" alt="Native path">`,
    `<img src="${fileUrl}" alt="File URL">`,
    ...markdownPaths.map((value, index) => `![Markdown absolute ${index}](<${value}>)`)
  ].join("\n\n"));
  const source = await fs.readFile(f.source, "utf8");
  const sample = (await f.build()).samples.article;
  assertVersionedPicture(sample.body);
  assert.equal(sample.mediaCounts.images, 2 + markdownPaths.length);
  assert.doesNotMatch(sample.body, /file:\/\/|[A-Z]:[\\/]/i);
  assert.equal(await fs.readFile(f.source, "utf8"), source);
});

test("HTML inside fenced or inline code remains literal and does not load image assets", async t => {
  const f = await fixture(t, { body: [
    'Inline `<img src="./missing.svg">` and `C:\\notes\\file.md`.',
    "",
    "```html",
    '<img src=".\\photos\\missing.svg" onerror="alert(1)">',
    '<a href="javascript:alert(1)">literal example</a>',
    "```",
    "",
    "Line one.\\",
    "Line two."
  ].join("\n") });
  const sample = (await f.build()).samples.article;
  assert.equal(sample.mediaCounts.images, 0);
  assert.match(sample.body, /<code[^>]*>[\s\S]*&lt;img/);
  assert.match(sample.body, /C:\\notes\\file\.md/);
  assert.match(sample.body, /<br\s*\/?>(?:\n)?Line two\./);
  assert.doesNotMatch(sample.body, /<img\b|<a\s+href="javascript:/i);
});

test("machine-specific Windows article paths remain portable without rewriting the author source", async t => {
  const f = await fixture(t, { files: { "photos/box.svg": picture } });
  const oldPath = "C:\\Users\\someone\\Desktop\\Web\\lizpink-terminal\\content\\entries\\article\\photos\\box.svg";
  const oldFileUrl = "file:///C:/Users/someone/Desktop/Web/lizpink-terminal/content/entries/article/photos/box.svg";
  await f.setBody([
    `<img src="${oldPath}" alt="Windows editor image">`,
    `<img src="${oldFileUrl}" alt="Windows file URL">`,
    `![Markdown Windows path](<${oldPath}>)`,
    `![Markdown Windows URL](<${oldFileUrl}>)`
  ].join("\n\n"));
  const original = await fs.readFile(f.source, "utf8");
  const sample = (await f.build()).samples.article;
  assertVersionedPicture(sample.body);
  assert.equal(sample.mediaCounts.images, 4);
  assert.doesNotMatch(sample.body, /someone|file:\/\/|C:[\\/]/i);
  assert.equal(await fs.readFile(f.source, "utf8"), original);
  assert.equal(await fs.readFile(path.join(f.outputDir, "assets/content/article/photos/box.svg"), "utf8"), picture);
});

test("unsupported executable HTML stays escaped while allowed surrounding content survives", async t => {
  const f = await fixture(t, { body: '<script>globalThis.compromised = true</script>\n\n<svg onload="alert(1)"><circle r="5"/></svg>\n\n<p>Ordinary <strong>content</strong>.</p>' });
  const body = (await f.build()).samples.article.body;
  assert.match(body, /&lt;script&gt;/);
  assert.match(body, /&lt;svg\b/);
  assert.match(body, /<strong>content<\/strong>/);
  assert.doesNotMatch(body, /<script\b|<svg\b|<circle\b/i);
});

test("HTML entity obfuscation cannot enable unsafe link or media schemes", async t => {
  for (const body of [
    '<a href="java&#x73;cript:alert(1)">Bad link</a>',
    '<a href="java&#10;script:alert(1)">Bad newline link</a>',
    '<img src="jav&#97;script:alert(1)" alt="Bad image">',
    '<img src="data:image/svg+xml;base64,PHN2Zy8+" alt="Bad data image">'
  ]) {
    const f = await fixture(t, { body });
    await assert.rejects(f.build());
  }
});

test("HTML and normalized backslash media reject remote files and escapes from the article directory", async t => {
  const f = await fixture(t, { files: { "photos/box.svg": picture } });
  const outside = path.join(f.root, "outside.svg");
  await write(outside, picture);
  for (const body of [
    '<img src="https://example.org/remote.svg" alt="Remote">',
    '<img src="//example.org/remote.svg" alt="Protocol relative">',
    '![Escape](..\\..\\..\\outside.svg)',
    '<img src="..\\..\\..\\outside.svg" alt="Escape">',
    '<img src="C:\\legacy\\content\\entries\\another-article\\photos\\box.svg" alt="Other article">',
    '<img src="C:\\legacy\\content\\entries\\article\\..\\outside.svg" alt="Portable escape">',
    `<img src="${outside}" alt="Absolute escape">`,
    `<img src="${pathToFileURL(outside).href}" alt="File URL escape">`
  ]) {
    await f.setBody(body);
    await assert.rejects(f.build());
  }
});
