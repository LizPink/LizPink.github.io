"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { stringify } = require("yaml");

const builder = import("../scripts/build-content.mjs");
const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="gold"/></svg>';

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

async function fixture(t, body) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-comparison-content-test-"));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("image-comparison-content-test-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  const contentDir = path.join(root, "content"), outputDir = path.join(root, "output");
  const entryDir = path.join(contentDir, "entries", "article");
  const source = path.join(entryDir, "index.md");
  await write(path.join(contentDir, "site.yml"), stringify({
    name: "Comparison reader", greeting: "Hello", role: "Student", interests: [],
    about: { paragraphs: [] }, resume: { sections: [], pdfUrl: "" },
    paths: ["life", "resume", "project"].map(id => ({ id, title: id }))
  }));
  const setBody = value => write(source,
    `---\n${stringify({ title: "Article", sections: ["project"] })}---\n${value}\n`);
  await setBody(body);
  await write(path.join(entryDir, "photos", "before.svg"), picture);
  await write(path.join(entryDir, "photos", "after(1).svg"), picture.replace("gold", "red"));
  return {
    root, outputDir, entryDir, source, setBody,
    async build() { return (await builder).buildContent({ contentDir, outputDir }); }
  };
}

const before = '![Only direct light](photos/before.svg)';
const after = '![With indirect light](<photos/after(1).svg>)';
const compare = (body = `${before}\n${after}`) => `:::compare\n${body}\n:::`;

test("two Markdown images become one comparison while retaining managed assets, counts and surrounding prose", async t => {
  const f = await fixture(t, `First paragraph.\n\n${compare()}\n\n## Details\n\nAfter the comparison.`);
  const original = await fs.readFile(f.source, "utf8");
  const sample = (await f.build()).samples.article;
  assert.equal(sample.text, "First paragraph.");
  assert.deepEqual(sample.mediaCounts, { images: 2, videos: 0 });
  assert.deepEqual(sample.headings.map(item => item.text), ["Details"]);
  assert.equal((sample.body.match(/<figure\b/g) || []).length, 1);
  assert.match(sample.body, /<figure class="sample-media sample-comparison"/);
  assert.match(sample.body, /<img-comparison-slider value="50" tabindex="0"/);
  assert.match(sample.body, /slot="first" src="\.\/assets\/content\/article\/photos\/before\.svg\?v=[a-f0-9]{16}"/);
  assert.match(sample.body, /slot="second" src="\.\/assets\/content\/article\/photos\/after\(1\)\.svg\?v=[a-f0-9]{16}"/);
  assert.match(sample.body, /data-comparison-label="first">Only direct light<\/span>/);
  assert.match(sample.body, /data-comparison-expand>放大对比<\/button>/);
  assert.match(sample.body, /After the comparison\./);
  assert.doesNotMatch(sample.body, /:::|lz-article-comparison|class="media-zoom"|<p>\s*<figure/);
  assert.equal(await fs.readFile(f.source, "utf8"), original);
  assert.equal(await fs.readFile(path.join(f.outputDir, "assets/content/article/photos/before.svg"), "utf8"), picture);
});

test("HTML screenshots preserve first-image sizing and normalize Windows editor paths without active attributes", async t => {
  const f = await fixture(t, compare([
    '<img src=".\\photos\\before.svg" alt="Before &amp; light" style="zoom:33%;width:600px;position:fixed" onerror="alert(1)">',
    '',
    '<img src="C:\\Users\\old\\Web\\content\\entries\\article\\photos\\after(1).svg" alt="After" style="zoom:50%">'
  ].join("\n")));
  const sample = (await f.build()).samples.article;
  assert.deepEqual(sample.mediaCounts, { images: 2, videos: 0 });
  assert.match(sample.body, /--asset-display-width:600px;--asset-scale:0\.33/);
  assert.match(sample.body, /alt="Before &amp; light"/);
  assert.match(sample.body, /<figcaption[^>]*>Before &amp; light \/ After<\/figcaption>/);
  assert.doesNotMatch(sample.body, /position:fixed|onerror|--asset-scale:0\.5|C:[\\/]/);
});

test("comparison markers inside fenced, indented and inline code remain literal", async t => {
  const f = await fixture(t, [
    '`:::compare` is an example.', '',
    '```markdown', ':::compare', '![Missing](photos/missing.svg)', ':::', '```', '',
    '    :::compare', '    ![Missing](photos/also-missing.svg)', '    :::', '',
    before
  ].join("\n"));
  const sample = (await f.build()).samples.article;
  assert.deepEqual(sample.mediaCounts, { images: 1, videos: 0 });
  assert.doesNotMatch(sample.body, /<img-comparison-slider/);
  assert.match(sample.body, /<pre><code[^>]*>:::compare/);
  assert.match(sample.body, /class="media-zoom"/);
});

test("multiple comparison blocks and reference-style Markdown images preserve their order and definitions", async t => {
  const f = await fixture(t, [
    compare('![First][before]\n![Second][after]'), '',
    'Between comparisons.', '', compare(), '',
    '[before]: photos/before.svg', '[after]: <photos/after(1).svg>'
  ].join("\n"));
  const sample = (await f.build()).samples.article;
  assert.deepEqual(sample.mediaCounts, { images: 4, videos: 0 });
  assert.equal((sample.body.match(/<img-comparison-slider\b/g) || []).length, 2);
  assert.match(sample.body, /<figcaption[^>]*>First \/ Second<\/figcaption>[\s\S]*Between comparisons\.[\s\S]*<figcaption[^>]*>Only direct light \/ With indirect light/);
});

test("incomplete, nested and non-image comparison blocks fail with a source-specific message", async t => {
  const invalid = [
    ':::compare\n' + before,
    ':::compare\n:::compare\n' + before + '\n:::\n:::',
    compare(''), compare(before), compare(`${before}\n${after}\n${before}`),
    compare(`Extra prose.\n\n${before}\n${after}`),
    compare(`## Heading\n\n${before}\n${after}`),
    compare(`[${before}](https://example.org)\n${after}`),
    compare(`<video src="photos/before.svg"></video>\n${after}`),
    compare('```\n' + before + '\n' + after + '\n```')
  ];
  const f = await fixture(t, "");
  for (const body of invalid) {
    await f.setBody(body);
    await assert.rejects(f.build(), error => /index\.md: 图片对比块/.test(error.message), body);
  }
});

test("comparison images retain existing local-file and image-type restrictions", async t => {
  const f = await fixture(t, "");
  await write(path.join(f.root, "outside.svg"), picture);
  await write(path.join(f.entryDir, "photos", "clip.mp4"), "video");
  for (const badImage of [
    '![Remote](https://example.org/before.svg)',
    '![Escape](../../../outside.svg)',
    '![Video](photos/clip.mp4)',
    '<img src="data:image/svg+xml;base64,PHN2Zy8+">'
  ]) {
    await f.setBody(compare(`${badImage}\n${after}`));
    await assert.rejects(f.build(), undefined, badImage);
  }
});

test("author HTML cannot impersonate generated comparison markers", async t => {
  const f = await fixture(t, `<lz-article-comparison data-index="0"></lz-article-comparison>\n\n${compare()}`);
  const sample = (await f.build()).samples.article;
  assert.match(sample.body, /&lt;lz-article-comparison/);
  assert.equal((sample.body.match(/<img-comparison-slider\b/g) || []).length, 1);
  assert.deepEqual(sample.mediaCounts, { images: 2, videos: 0 });
});
