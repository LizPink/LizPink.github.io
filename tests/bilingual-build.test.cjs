"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { stringify } = require("yaml");
const project = path.resolve(__dirname, "..");

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lizpink-bilingual-"));
  t.after(async () => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("lizpink-bilingual-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.cp(path.join(project, "site"), path.join(root, "site"), { recursive: true });
  await fs.mkdir(path.join(root, "content/entries/article"), { recursive: true });
  await fs.writeFile(path.join(root, "content/site.yml"), stringify({
    name: "Author", greeting: "你好 Author", featuredEntry: "article", role: "学生", interests: ["Graphics"],
    about: { paragraphs: ["中文介绍"] }, resume: { sections: [], pdfUrl: "" },
    paths: ["life", "resume", "project"].map(id => ({ id, title: "中文栏目", description: "栏目介绍" }))
  }));
  await fs.writeFile(path.join(root, "content/entries/article/index.md"),
    '---\ntitle: 中文文章\nsections: [project]\npreviewTitle: 推荐短标题\nsummary: 推荐摘要\ncover: image.svg\ncoverAlt: 光照效果\npublishedAt: "2026-11-01"\n---\n中文正文\n\n## 第一节\n\n`保留代码` and $x^2$\n\n## 第二节\n\n![图注](image.svg)\n');
  await fs.writeFile(path.join(root, "content/entries/article/image.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return root;
}

test("bilingual release preserves shared IDs, dates, code, formulas and media", async t => {
  const { build } = await import("../scripts/build.mjs");
  const { attachUIMessages } = await import("../scripts/ui-messages.mjs");
  const { emptyManifest, collectTranslationSegments, writeManifest } = await import("../scripts/translations.mjs");
  const root = await fixture(t);
  const source = await attachUIMessages(await build(root), root);
  const manifest = emptyManifest();
  for (const segment of collectTranslationSegments(source)) {
    manifest.segments[segment.hash] = { source: segment.source, text: `English: ${segment.source}` };
  }
  await writeManifest(path.join(root, "content/translations/en.json"), manifest);
  await build(root, { requireTranslations: true });
  const window = {};
  vm.runInNewContext(await fs.readFile(path.join(root, "dist/assets/js/content.js"), "utf8"), { window });
  const { "zh-CN": chinese, en: english } = window.LIZPINK_LOCALES;
  assert.equal(window.LIZPINK_CONTENT, chinese);
  assert.equal(window.LIZPINK_TRANSLATIONS.complete, true);
  assert.equal(english.greeting, "English: 你好 Author");
  assert.equal(chinese.greeting, "你好 Author");
  assert.equal(english.featuredEntry, "article");
  assert.equal(chinese.featuredEntry, english.featuredEntry);
  assert.equal(english.samples.article.previewTitle, "English: 推荐短标题");
  assert.equal(english.samples.article.text, "English: 推荐摘要");
  assert.equal(english.samples.article.coverAlt, "English: 光照效果");
  assert.ok(chinese.samples.article.cover);
  assert.equal(english.samples.article.cover, chinese.samples.article.cover);
  assert.ok(chinese.samples.article.body.includes(chinese.samples.article.cover));
  assert.deepEqual(english.samples.article.headings.map(item => item.id), chinese.samples.article.headings.map(item => item.id));
  assert.ok(english.samples.article.headings.every(item => item.text.startsWith("English:")));
  assert.equal(english.samples.article.publishedAt, chinese.samples.article.publishedAt);
  assert.equal(english.samples.article.updatedAt, chinese.samples.article.updatedAt);
  assert.match(english.samples.article.body, /<code>保留代码<\/code>/);
  assert.equal(english.samples.article.body.match(/class="katex"[\s\S]*?<\/annotation>/)?.[0], chinese.samples.article.body.match(/class="katex"[\s\S]*?<\/annotation>/)?.[0]);
  assert.equal(english.samples.article.body.match(/src="([^"]+)"/)[1], chinese.samples.article.body.match(/src="([^"]+)"/)[1]);
  const published = await fs.readFile(path.join(root, "dist/assets/js/content.js"), "utf8");
  await fs.appendFile(path.join(root, "content/entries/article/index.md"), "\n新增段落\n");
  await assert.rejects(build(root, { requireTranslations: true }), /missing or outdated/);
  assert.equal(await fs.readFile(path.join(root, "dist/assets/js/content.js"), "utf8"), published);
  assert.deepEqual(await fs.readdir(path.join(root, ".build")), []);
});
