"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { stringify } = require("yaml");

const project = path.resolve(__dirname, "..");
const script = path.join(project, "scripts/build-content.mjs");
const modulePromise = import(pathToFileURL(script).href);
const plain = value => JSON.parse(JSON.stringify(value));
const defaultSite = () => ({
  name: "Test", greeting: "Hello", role: "Student", interests: ["Graphics"],
  about: { paragraphs: ["Introduction"] }, resume: { sections: [], pdfUrl: "" },
  paths: ["life", "resume", "project"].map(id => ({ id, title: id }))
});
async function write(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value);
}
async function temporary(t, parent = os.tmpdir()) {
  const directory = await fs.mkdtemp(path.join(parent, "content-builder-test-"));
  t.after(async () => {
    assert.equal(path.dirname(directory), path.resolve(parent));
    assert.ok(path.basename(directory).startsWith("content-builder-test-"));
    await fs.rm(directory, { recursive: true, force: true });
  });
  return directory;
}
async function fixture(t, { site = defaultSite(), entries = [{ key: "article" }], files = {} } = {}) {
  const root = await temporary(t);
  const contentDir = path.join(root, "content"), outputDir = path.join(root, "output");
  await write(path.join(contentDir, "site.yml"), stringify(site));
  await fs.mkdir(path.join(contentDir, "entries"), { recursive: true });
  for (const entry of entries) {
    const metadata = { title: entry.key, sections: ["project"], ...entry.metadata };
    await write(path.join(contentDir, "entries", entry.key, "index.md"),
      `---\n${stringify(metadata)}---\n${entry.body ?? "First paragraph."}\n`);
    for (const [name, value] of Object.entries(entry.files || {})) {
      await write(path.join(contentDir, "entries", entry.key, name), value);
    }
  }
  for (const [name, value] of Object.entries(files)) await write(path.join(contentDir, name), value);
  return {
    root, contentDir, outputDir,
    async build() { return (await modulePromise).buildContent({ contentDir, outputDir }); },
    async output() { return fs.readFile(path.join(outputDir, "assets/js/content.js"), "utf8"); }
  };
}
function assertNoLegacyFlags(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.hasOwn(value, "example"), false);
  assert.equal(Object.hasOwn(value, "dateExample"), false);
  Object.values(value).forEach(assertNoLegacyFlags);
}

test("build returns the legacy data API, shared memberships, and deterministic date/order/key sorting", async t => {
  const site = defaultSite();
  site.example = true;
  site.about.dateExample = true;
  const f = await fixture(t, { site, entries: [
    { key: "shared", metadata: { sections: ["resume", "project", "resume"], publishedAt: "2026-10-20", order: 20 } },
    { key: "newest", metadata: { publishedAt: "2026-11-01", order: 99 } },
    { key: "tie-b", metadata: { publishedAt: "2026-10-20", order: 1 } },
    { key: "tie-a", metadata: { publishedAt: "2026-10-20", order: 1 } },
    { key: "old", metadata: { sections: ["life"], publishedAt: "2024-02-29", updatedAt: "2029-01-01" } },
    { key: "undated", metadata: { order: 0 } }
  ] });
  const content = await f.build();
  assert.deepEqual(content.paths.find(item => item.id === "project").items, ["newest", "tie-a", "tie-b", "shared", "undated"]);
  assert.deepEqual(content.paths.find(item => item.id === "resume").items, ["shared"]);
  assert.deepEqual(content.paths.find(item => item.id === "life").items, ["old"]);
  assert.equal(Object.keys(content.samples).length, 6);
  assert.equal(content.samples.old.publishedAt, "2024-02-29");
  assert.equal(content.samples.old.updatedAt, "2029-01-01");
  assert.equal(content.samples.shared.type, "text");
  assert.deepEqual(content.samples.shared.mediaCounts, { images: 0, videos: 0 });
  assertNoLegacyFlags(content);
  const first = await f.output();
  const context = { window: {} };
  require("node:vm").runInNewContext(first, context);
  assert.deepEqual(plain(context.window.LIZPINK_CONTENT), plain(content));
  await f.build();
  assert.equal(await f.output(), first);
});

test("build and client display agree on update-first sorting across years, stable ties and shared routes", async t => {
  const f = await fixture(t, { entries: [
    { key: "renewed", metadata: { sections: ["life", "project"], publishedAt: "2024-02-29", updatedAt: "2029-01-01", order: 99 } },
    { key: "yearEnd", metadata: { sections: ["life"], publishedAt: "2026-12-31" } },
    { key: "newYear", metadata: { sections: ["life"], publishedAt: "2027-01-01", order: 0 } },
    { key: "tie-b", metadata: { sections: ["life"], updatedAt: "2027-01-01", order: 1 } },
    { key: "tie-a", metadata: { sections: ["life"], publishedAt: "2027-01-01", order: 1 } },
    { key: "backdatedUpdate", metadata: { sections: ["life"], publishedAt: "2030-01-01", updatedAt: "2025-12-31" } },
    { key: "undated-z", metadata: { sections: ["life"], order: 0 } },
    { key: "undated-a", metadata: { sections: ["life"], order: 0 } }
  ] });
  const content = await f.build();
  const expected = ["renewed", "newYear", "tie-a", "tie-b", "yearEnd", "backdatedUpdate", "undated-a", "undated-z"];
  assert.deepEqual(content.paths.find(item => item.id === "life").items, expected);
  assert.deepEqual(content.paths.find(item => item.id === "project").items, ["renewed"]);
  const window = { LIZPINK_CONTENT: content };
  require("node:vm").runInNewContext(await fs.readFile(path.join(project, "site/assets/js/content-index.js"), "utf8"), { window });
  const api = window.LIZPINK_CONTENT_INDEX;
  assert.deepEqual(plain(api.items("life").map(item => item.key)), expected);
  assert.deepEqual(plain(api.get("life", "renewed").date), { value: "2029-01-01", text: "2029.01.01", label: "更新" });
  assert.deepEqual(plain(api.get("life", "yearEnd").date), { value: "2026-12-31", text: "2026.12.31", label: "日期" });
  assert.equal(api.get("life", "backdatedUpdate").date.value, "2025-12-31");
  assert.equal(api.get("life", "undated-a").date, null);
  assert.equal(api.items("home").find(item => item.key === "renewed").route, "life");
  assert.equal(api.get("project", "renewed").route, "project");
});

test("column descriptions replace legacy introductions and obsolete fields fail with migration guidance", async t => {
  const site = defaultSite();
  site.paths[0].description = "Combined column introduction";
  const f = await fixture(t, { site });
  const content = await f.build();
  assert.equal(content.paths[0].description, site.paths[0].description);
  assert.ok(content.paths.every(item => !Object.hasOwn(item, "introduction")));
  assert.equal(Object.hasOwn(content.resume, "introduction"), false);
  for (const value of ["Legacy introduction", "", []]) {
    const legacy = defaultSite(); legacy.paths[0].introduction = value;
    const bad = await fixture(t, { site: legacy });
    await write(path.join(bad.outputDir, "assets/js/content.js"), "previous content");
    await assert.rejects(bad.build(), /paths\.life\.introduction已合并到description/);
    assert.equal(await bad.output(), "previous content");
  }
  const legacyResume = defaultSite(); legacyResume.resume.introduction = "Legacy resume introduction";
  const badResume = await fixture(t, { site: legacyResume });
  await assert.rejects(badResume.build(), /resume\.introduction已移除.*about\.paragraphs/);
});

test("site-wide description is optional and discarded while column descriptions remain", async t => {
  const site = defaultSite(); site.paths[0].description = "Visible life description";
  const f = await fixture(t, { site });
  const content = await f.build();
  assert.equal(Object.hasOwn(content, "description"), false);
  assert.equal(content.paths[0].description, "Visible life description");
  site.description = "obsolete site description must not be published";
  await write(path.join(f.contentDir, "site.yml"), stringify(site));
  const legacy = await f.build();
  assert.equal(Object.hasOwn(legacy, "description"), false);
  assert.equal(legacy.paths[0].description, "Visible life description");
  assert.doesNotMatch(await f.output(), /obsolete site description must not be published/);
});

test("Chinese/spaced image, uppercase MP4, optional poster/subtitles and PDF produce usable independent assets", async t => {
  const f = await fixture(t, { entries: [{ key: "mixed", metadata: { publishedAt: "2026-10-22" },
    body: [
      "本文为排版示例，日期为演示日期。", "",
      "前面文字 ![图片说明](<./图片 示例.svg>) 后面文字。", "",
      "![视频说明](<./演示 空格.MP4>)", "",
      "[下载附件](<./资料 手册.pdf#page=2>)", "",
      "[前往方法](#方法)", "", "## 方法", "### 子主题", "## 方法", "## 方法-2"
    ].join("\n"),
    files: { "图片 示例.svg": '<svg width="200" height="100"/>', "演示 空格.MP4": "video bytes",
      "演示 空格.poster.png": "poster bytes", "演示 空格.zh.vtt": "WEBVTT\n", "资料 手册.pdf": "%PDF-test" }
  }] });
  const content = await f.build();
  const sample = content.samples.mixed;
  assert.equal(sample.text, "本文为排版示例，日期为演示日期。");
  assert.equal(sample.publishedAt, "2026-10-22");
  assert.equal(sample.type, "video");
  assert.deepEqual(sample.mediaCounts, { images: 1, videos: 1 });
  assert.equal((sample.body.match(/<figure class="sample-media"/g) || []).length, 2);
  assert.doesNotMatch(sample.body, /<p>(?:(?!<\/p>)[\s\S])*<figure/);
  assert.match(sample.body, /<p>前面文字 <\/p>/);
  assert.match(sample.body, /<p> 后面文字。<\/p>/);
  assert.match(sample.body, /class="media-zoom"/);
  assert.match(sample.body, /loading="lazy" decoding="async" width="960" height="540"/);
  assert.match(sample.body, /controls preload="none" playsinline width="640" height="360"/);
  assert.match(sample.body, /\.poster\.png\?v=[0-9a-f]{16}"/);
  assert.match(sample.body, /kind="captions"[^>]+\.zh\.vtt\?v=[0-9a-f]{16}"[^>]+default/);
  assert.match(sample.body, /%20/);
  assert.match(sample.body, /\.pdf\?v=[0-9a-f]{16}#page=2/);
  assert.match(sample.body, /data-article-anchor="mixed-方法"/);
  assert.match(sample.body, /href="#project\/mixed"/);
  assert.deepEqual(sample.headings.map(item => item.level), [2, 3, 2, 2]);
  assert.equal(new Set(sample.headings.map(item => item.id)).size, 4);
  assert.ok(sample.headings.every(item => item.id.startsWith("mixed-")));
  for (const name of ["图片 示例.svg", "演示 空格.MP4", "演示 空格.poster.png", "演示 空格.zh.vtt", "资料 手册.pdf"]) {
    assert.ok((await fs.stat(path.join(f.outputDir, "assets/content/mixed", name))).isFile());
    const encoded = encodeURIComponent(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(sample.body, new RegExp(`${encoded}\\?v=[0-9a-f]{16}`));
  }
});

test("multiple nested videos retain their own posters, captions, copy paths and independent versions", async t => {
  const videos = [
    { src: "videos/demo-a.mp4", poster: "videos/demo-a.poster.svg", captions: "videos/demo-a.zh.vtt" },
    { src: "videos/demo-b.mp4", poster: "videos/demo-b.poster.png", captions: "videos/demo-b.zh.vtt" },
    { src: "videos/one/demo.mp4", poster: "videos/one/demo.poster.svg", captions: "videos/one/demo.zh.vtt" },
    { src: "videos/two/demo.mp4", poster: "videos/two/demo.poster.svg", captions: "videos/two/demo.zh.vtt" }
  ];
  const files = { "photos/a.svg": "<svg><title>Photo</title></svg>" };
  videos.forEach((video, index) => {
    files[video.src] = `video bytes ${index}`;
    files[video.poster] = `poster bytes ${index}`;
    files[video.captions] = `WEBVTT\n\n00:00.000 --> 00:01.000\nCaption ${index}\n`;
  });
  const f = await fixture(t, { entries: [{ key: "multiple", files,
    body: ["![Photo](./photos/a.svg)", ...videos.map((video, index) => `![Video ${index}](./${video.src})`)].join("\n\n")
  }] });
  function urlFor(tag, attribute) {
    const match = tag.match(new RegExp(`\\b${attribute}="([^"]+)"`));
    assert.ok(match, `${attribute} must be present`);
    const url = new URL(match[1].replace(/&amp;/g, "&"), "https://example.test/");
    assert.match(url.searchParams.get("v") || "", /^[0-9a-f]{16}$/);
    return url;
  }
  function players(body) {
    const blocks = [...body.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/g)];
    assert.equal(blocks.length, 4);
    const result = new Map();
    for (const [, attributes, children] of blocks) {
      const src = urlFor(attributes, "src"), poster = urlFor(attributes, "poster");
      const tracks = [...children.matchAll(/<track\b[^>]*>/g)];
      assert.equal(tracks.length, 1);
      assert.match(tracks[0][0], /kind="captions"/);
      const captions = urlFor(tracks[0][0], "src");
      result.set(src.pathname, { src, poster, captions });
    }
    assert.equal(result.size, 4);
    return result;
  }
  const sample = (await f.build()).samples.multiple;
  assert.deepEqual(sample.mediaCounts, { images: 1, videos: 4 });
  assert.equal(sample.type, "video");
  assert.match(sample.body, /src="\.\/assets\/content\/multiple\/photos\/a\.svg\?v=[0-9a-f]{16}"/);
  const before = players(sample.body);
  for (const video of videos) {
    const player = before.get(`/assets/content/multiple/${video.src}`);
    assert.ok(player, video.src);
    assert.equal(player.poster.pathname, `/assets/content/multiple/${video.poster}`);
    assert.equal(player.captions.pathname, `/assets/content/multiple/${video.captions}`);
  }
  for (const [name, bytes] of Object.entries(files)) {
    assert.equal(await fs.readFile(path.join(f.outputDir, "assets/content/multiple", name), "utf8"), bytes, name);
  }
  for (const role of ["src", "poster", "captions"]) {
    assert.notEqual(before.get("/assets/content/multiple/videos/one/demo.mp4")[role].search,
      before.get("/assets/content/multiple/videos/two/demo.mp4")[role].search, `${role}: same basename must not share versions`);
    const name = videos[2][role];
    await write(path.join(f.contentDir, "entries/multiple", name), `${files[name]} changed`);
  }
  const after = players((await f.build()).samples.multiple.body);
  for (const video of videos) {
    const key = `/assets/content/multiple/${video.src}`;
    for (const role of ["src", "poster", "captions"]) {
      if (video === videos[2]) assert.notEqual(after.get(key)[role].href, before.get(key)[role].href);
      else assert.equal(after.get(key)[role].href, before.get(key)[role].href, `${video.src} ${role} must stay unchanged`);
    }
  }
});

test("changing only asset bytes updates its URL and generated script without changing routes or author query parameters", async t => {
  const files = { "pic.svg": "<svg/>\n", "clip.mp4": "video bytes", "clip.poster.png": "poster bytes",
    "clip.zh.vtt": "WEBVTT\n", "guide.pdf": "%PDF-test" };
  const f = await fixture(t, { entries: [{ key: "article", files,
    body: "![Image](./pic.svg?size=one%20two&flag&v=old#image)\n\n![Video](./clip.mp4)\n\n[PDF](./guide.pdf?download=yes#page=2)\n\n[Section](#section)\n\n## Section"
  }] });
  const sourceFile = path.join(f.contentDir, "entries/article/index.md");
  const source = await fs.readFile(sourceFile, "utf8");
  function urls(body) {
    const result = new Map();
    for (const [, attribute] of body.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) {
      const url = new URL(attribute.replace(/&amp;/g, "&"), "https://example.test/");
      if (!url.pathname.startsWith("/assets/content/")) continue;
      assert.match(url.searchParams.get("v") || "", /^[0-9a-f]{16}$/);
      assert.equal(url.searchParams.getAll("v").length, 1);
      result.set(path.posix.basename(url.pathname), url);
    }
    return result;
  }
  let previous = urls((await f.build()).samples.article.body);
  assert.equal(previous.size, 5);
  assert.match(previous.get("pic.svg").href, /\?size=one%20two&flag&v=[0-9a-f]{16}#image$/);
  assert.equal(previous.get("guide.pdf").hash, "#page=2");
  let previousScript = await f.output();
  for (const [name, bytes] of Object.entries(files)) {
    await write(path.join(f.contentDir, "entries/article", name), `${bytes}changed`);
    const sample = (await f.build()).samples.article;
    const current = urls(sample.body);
    for (const [other, url] of previous) {
      if (other === name) assert.notEqual(current.get(other).searchParams.get("v"), url.searchParams.get("v"), name);
      else assert.equal(current.get(other).href, url.href, `${name} must not invalidate ${other}`);
    }
    assert.notEqual(await f.output(), previousScript);
    assert.match(sample.body, /<a(?=[^>]*href="#project\/article")(?=[^>]*data-article-anchor="article-section")[^>]*>/);
    assert.equal(await fs.readFile(sourceFile, "utf8"), source);
    previous = current; previousScript = await f.output();
  }
});

test("CRLF-only text media changes keep generated URLs stable across separate builds", async t => {
  const f = await fixture(t, { entries: [{ key: "article", body: "![Image](./pic.svg)\n\n![Video](./clip.mp4)",
    files: { "pic.svg": "<svg>\n</svg>\n", "clip.mp4": "video bytes", "clip.zh.vtt": "WEBVTT\n\n00:00.000 --> 00:01.000\nCaption\n" }
  }] });
  await f.build();
  const first = await f.output();
  for (const name of ["pic.svg", "clip.zh.vtt"]) {
    const file = path.join(f.contentDir, "entries/article", name);
    await write(file, (await fs.readFile(file, "utf8")).replace(/\n/g, "\r\n"));
  }
  await f.build();
  assert.equal(await f.output(), first);
  assert.match(await fs.readFile(path.join(f.outputDir, "assets/content/article/clip.zh.vtt"), "utf8"), /\r\n/);
});

test("summary stays plain, body preserves rich Markdown and executable HTML is escaped", async t => {
  const f = await fixture(t, { entries: [{ key: "safe", metadata: { title: '</script><script>bad()</script>', summary: " 简短\n 摘要 " },
    body: '<script>globalThis.compromised = true</script>\n\n## A **bold** heading\n\nText with **bold**, `code`, and [website](https://example.org/).'
  }] });
  const content = await f.build();
  assert.equal(content.samples.safe.text, "简短 摘要");
  assert.match(content.samples.safe.body, /&lt;script&gt;/);
  assert.doesNotMatch(content.samples.safe.body, /<script>/);
  assert.match(content.samples.safe.body, /<strong>bold<\/strong>/);
  assert.equal(content.samples.safe.headings[0].text, "A bold heading");
  const context = { window: {} };
  require("node:vm").runInNewContext(await f.output(), context);
  assert.equal(context.compromised, undefined);
  assert.equal(context.window.LIZPINK_CONTENT.samples.safe.title, '</script><script>bad()</script>');
});

test("project changelogs separate entries without changing rich titles, anchors or unrelated sections", async t => {
  const f = await fixture(t, { entries: [
    { key: "updates", body: [
      "[Jump to bold update](#2026-11-09-bold)",
      "## 更新日志", "### 2026-11-04 First", "First update.",
      "### 2026-11-09 **Bold**", "Second update.",
      "### 2026-11-10 [Linked](https://example.org/notes)", "#### Implementation", "Details.",
      "### Next **steps**", "Undated update.",
      "### 2026-11-? Preview", "Preview update.",
      "### 2026-11-？ Specular", "Another preview.",
      "## Guide", "### 2026-11-11 Ordinary", "Regular section.",
      "## Release notes", "### 2026-11-12 Release", "A new log section.",
      "## Changelog", "### Undated release", "Another log section."
    ].join("\n\n") },
    { key: "journal", metadata: { sections: ["life"] },
      body: "## 更新日志\n\n### 2026-11-04 Ordinary journal heading\n\nJournal text." }
  ] });
  const content = await f.build(), sample = content.samples.updates;
  const { parseFragment } = await import("parse5");
  function descendants(node) { return [node, ...(node.childNodes || []).flatMap(descendants)]; }
  const nodes = descendants(parseFragment(sample.body));
  const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
  const hasClass = (node, name) => (attr(node, "class") || "").split(/\s+/).includes(name);
  const headings = nodes.filter(node => /^h[2-6]$/.test(node.tagName || ""));
  const byId = id => headings.find(node => attr(node, "id") === id);
  assert.deepEqual(sample.headings, [
    { id: "updates-更新日志", text: "更新日志", level: 2 },
    { id: "updates-2026-11-04-first", text: "2026-11-04 First", level: 3 },
    { id: "updates-2026-11-09-bold", text: "2026-11-09 Bold", level: 3 },
    { id: "updates-2026-11-10-linked", text: "2026-11-10 Linked", level: 3 },
    { id: "updates-implementation", text: "Implementation", level: 4 },
    { id: "updates-next-steps", text: "Next steps", level: 3 },
    { id: "updates-2026-11--preview", text: "2026-11-? Preview", level: 3 },
    { id: "updates-2026-11--specular", text: "2026-11-？ Specular", level: 3 },
    { id: "updates-guide", text: "Guide", level: 2 },
    { id: "updates-2026-11-11-ordinary", text: "2026-11-11 Ordinary", level: 3 },
    { id: "updates-release-notes", text: "Release notes", level: 2 },
    { id: "updates-2026-11-12-release", text: "2026-11-12 Release", level: 3 },
    { id: "updates-changelog", text: "Changelog", level: 2 },
    { id: "updates-undated-release", text: "Undated release", level: 3 }
  ]);
  assert.deepEqual(headings.filter(node => hasClass(node, "article-update-heading")).map(node => attr(node, "id")), [
    "updates-2026-11-04-first", "updates-2026-11-09-bold", "updates-2026-11-10-linked",
    "updates-next-steps", "updates-2026-11--preview", "updates-2026-11--specular",
    "updates-2026-11-12-release", "updates-undated-release"
  ]);
  assert.deepEqual(headings.filter(node => hasClass(node, "article-update-heading-next")).map(node => attr(node, "id")), [
    "updates-2026-11-09-bold", "updates-2026-11-10-linked", "updates-next-steps",
    "updates-2026-11--preview", "updates-2026-11--specular"
  ]);
  for (const id of ["updates-2026-11-04-first", "updates-2026-11-09-bold", "updates-2026-11-10-linked",
    "updates-2026-11--preview", "updates-2026-11--specular", "updates-2026-11-12-release"]) {
    const parts = descendants(byId(id));
    assert.equal(parts.filter(node => hasClass(node, "article-update-date")).length, 1, id);
    assert.equal(parts.filter(node => hasClass(node, "article-update-title")).length, 1, id);
  }
  assert.equal(descendants(byId("updates-next-steps")).some(node => hasClass(node, "article-update-date")), false);
  assert.match(sample.body, /<span class="article-update-title"><strong>Bold<\/strong><\/span>/);
  assert.match(sample.body, /<span class="article-update-title"><a href="https:\/\/example\.org\/notes"[^>]*>Linked<\/a><\/span>/);
  assert.match(sample.body, /Next <strong>steps<\/strong>/);
  assert.ok(nodes.some(node => node.tagName === "a" && attr(node, "data-article-anchor") === "updates-2026-11-09-bold"
    && attr(node, "href") === "#project/updates"));
  assert.doesNotMatch(content.samples.journal.body, /article-update-/);
});

test("reserved JavaScript property names remain ordinary own article keys", async t => {
  const keys = ["__proto__", "constructor", "prototype"];
  const f = await fixture(t, { entries: keys.map(key => ({ key })) });
  const content = await f.build();
  keys.forEach(key => assert.equal(Object.hasOwn(content.samples, key), true));
  assert.equal(Object.getPrototypeOf(content.samples), null);
  const context = { window: {} };
  require("node:vm").runInNewContext(await f.output(), context);
  keys.forEach(key => assert.equal(Object.hasOwn(context.window.LIZPINK_CONTENT.samples, key), true));
});

test("rebuilding replaces only managed media and retains unrelated runtime files", async t => {
  const f = await fixture(t, { entries: [{ key: "article", body: "![One](./one.svg)", files: { "one.svg": "<svg/>" } }] });
  await write(path.join(f.outputDir, "assets/js/app.js"), "runtime sentinel");
  await f.build();
  await write(path.join(f.contentDir, "entries/article/index.md"), "---\ntitle: Article\nsections: [project]\n---\nOnly text now.\n");
  await f.build();
  await assert.rejects(fs.stat(path.join(f.outputDir, "assets/content/article/one.svg")), { code: "ENOENT" });
  assert.equal(await fs.readFile(path.join(f.outputDir, "assets/js/app.js"), "utf8"), "runtime sentinel");
});

test("removing the final entry produces zero samples, retains three empty sections and clears all managed media", async t => {
  const f = await fixture(t, { entries: [{ key: "article", body: "![Image](./pic.svg)", files: { "pic.svg": "<svg/>" } }] });
  await f.build();
  assert.ok((await fs.stat(path.join(f.outputDir, "assets/content/article/pic.svg"))).isFile());
  const entryDir = path.resolve(f.contentDir, "entries/article");
  assert.equal(path.dirname(entryDir), path.resolve(f.contentDir, "entries"));
  await fs.rm(entryDir, { recursive: true });
  await write(path.join(f.contentDir, "entries/.gitkeep"), "");
  const content = await f.build();
  assert.deepEqual(Object.keys(content.samples), []);
  assert.deepEqual(content.paths.map(item => item.id).sort(), ["life", "project", "resume"]);
  content.paths.forEach(item => assert.deepEqual(item.items, []));
  assert.deepEqual(await fs.readdir(path.join(f.outputDir, "assets/content")), []);
  assert.deepEqual(await fs.readdir(path.join(f.contentDir, "entries")), [".gitkeep"]);
  const window = {};
  require("node:vm").runInNewContext(await f.output(), { window });
  assert.deepEqual(Object.keys(window.LIZPINK_CONTENT.samples), []);
});

test("validation failure leaves previous content.js and media untouched", async t => {
  const f = await fixture(t, { entries: [{ key: "article", body: "![Missing](./missing.png)" }] });
  await write(path.join(f.outputDir, "assets/js/content.js"), "previous content");
  await write(path.join(f.outputDir, "assets/content/previous.txt"), "previous media");
  await assert.rejects(f.build());
  assert.equal(await f.output(), "previous content");
  assert.equal(await fs.readFile(path.join(f.outputDir, "assets/content/previous.txt"), "utf8"), "previous media");
});

for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html;base64,PHNjcmlwdD4=", "vbscript:msgbox(1)", "//evil.test/file"]) {
  test(`dangerous URL is rejected: ${href.split(":")[0]}`, async t => {
    const f = await fixture(t, { entries: [{ key: "unsafe", body: `[Bad](<${href}>)` }] });
    await assert.rejects(f.build(), /协议/);
  });
}

for (const target of ["../secret.svg", "%2e%2e/secret.svg", "/secret.svg", "C:/secret.svg", "..%5Csecret.svg"]) {
  test(`resource escape is rejected: ${target}`, async t => {
    const f = await fixture(t, { entries: [{ key: "unsafe", body: `![Bad](<${target}>)` }], files: { "entries/secret.svg": "<svg/>" } });
    await assert.rejects(f.build());
  });
}

test("symlinked media cannot escape its entry", async t => {
  const f = await fixture(t, { entries: [{ key: "unsafe", body: "![Bad](./linked/secret.svg)" }] });
  const outside = path.join(f.root, "outside");
  await write(path.join(outside, "secret.svg"), "<svg/>");
  try {
    await fs.symlink(outside, path.join(f.contentDir, "entries/unsafe/linked"), process.platform === "win32" ? "junction" : "dir");
  } catch (failure) {
    if (["EPERM", "EACCES"].includes(failure.code)) { t.skip("OS does not allow creating this test symlink"); return; }
    throw failure;
  }
  await assert.rejects(f.build(), /目录内|越过/);
});

test("dates validate leap days and reject invalid calendar values", async t => {
  const valid = await fixture(t, { entries: [{ key: "leap", metadata: { publishedAt: "2000-02-29", updatedAt: "2026-11-07" } }] });
  assert.equal((await valid.build()).samples.leap.publishedAt, "2000-02-29");
  for (const value of ["1900-02-29", "2026-02-29", "2026-04-31", "2026-13-01", "0000-01-01", "2026-1-01", "2026-11-07T00:00:00Z"]) {
    for (const field of ["publishedAt", "updatedAt"]) {
      const f = await fixture(t, { entries: [{ key: "bad", metadata: { publishedAt: "2024-02-29", [field]: value } }] });
      await assert.rejects(f.build(), /有效的YYYY-MM-DD/);
    }
  }
});

test("frontmatter schema and heading rules reject invalid or ambiguous source", async t => {
  for (const metadata of [{ title: "" }, { sections: [] }, { sections: ["research"] }, { sections: [["project"]] },
    { order: "first" }, { example: true }, { dateExample: true }]) {
    const f = await fixture(t, { entries: [{ key: "bad", metadata }] });
    await assert.rejects(f.build());
  }
  for (const body of ["# Duplicate title", "[Missing heading](#absent)", "[![Nested image](./pic.svg)](https://example.org/)", "## ![Heading image](./pic.svg)"]) {
    const f = await fixture(t, { entries: [{ key: "bad", body, files: { "pic.svg": "<svg/>" } }] });
    await assert.rejects(f.build());
  }
});

test("valid article hashes survive while absent destinations fail", async t => {
  const f = await fixture(t, { entries: [
    { key: "one", body: "[Two](#project/two) and [Home](#home)." }, { key: "two" }
  ] });
  assert.match((await f.build()).samples.one.body, /href="#project\/two"/);
  await write(path.join(f.contentDir, "entries/one/index.md"), "---\ntitle: One\nsections: [project]\n---\n[Missing](#life/two)\n");
  await assert.rejects(f.build(), /找不到/);
});

test("resume PDF is validated and versioned but full-build retains copy ownership", async t => {
  const site = defaultSite(); site.resume.pdfUrl = "./files/简历 文档.pdf?download=yes&v=old#page=2";
  const f = await fixture(t, { site, files: { "files/简历 文档.pdf": "%PDF-test" } });
  const first = (await f.build()).resume.pdfUrl;
  assert.match(first, /^\.\/files\/简历 文档\.pdf\?download=yes&v=[0-9a-f]{16}#page=2$/);
  await write(path.join(f.contentDir, "files/简历 文档.pdf"), "%PDF-changed");
  assert.notEqual((await f.build()).resume.pdfUrl, first);
  await assert.rejects(fs.stat(path.join(f.outputDir, "files/简历 文档.pdf")), { code: "ENOENT" });
  for (const value of ["./files/missing.pdf", "./files/../entries/article/index.md", "../outside.pdf", "http://example.org/resume.pdf"]) {
    const badSite = defaultSite(); badSite.resume.pdfUrl = value;
    const bad = await fixture(t, { site: badSite });
    await assert.rejects(bad.build());
  }
  const remoteSite = defaultSite(); remoteSite.resume.pdfUrl = "https://example.org/resume.pdf?download=yes&v=external#page=2";
  const remote = await fixture(t, { site: remoteSite });
  assert.equal((await remote.build()).resume.pdfUrl, remoteSite.resume.pdfUrl);
});

test("site text and list fields reject authoring mistakes before generating broken UI data", async t => {
  const changes = [
    site => { delete site.name; }, site => { site.greeting = "  "; }, site => { site.greeting = 42; },
    site => { site.role = ["Student"]; }, site => { site.interests = "Graphics"; },
    site => { site.interests = [12]; }, site => { site.paths[0].title = {}; },
    site => { site.paths[0].description = null; }
  ];
  for (const change of changes) {
    const site = defaultSite(); change(site);
    const f = await fixture(t, { site });
    await write(path.join(f.outputDir, "assets/js/content.js"), "previous content");
    await assert.rejects(f.build(), /site\.yml:/);
    assert.equal(await f.output(), "previous content");
  }
});

test("resume sections validate the exact heading/items/title/detail shape used by the frontend", async t => {
  for (const section of [null, "education", {}, { heading: 12, items: [] }, { heading: "Education", items: {} },
    { heading: "Education", items: [null] }, { heading: "Education", items: [{ title: 12, detail: "Description" }] },
    { heading: "Education", items: [{ title: "School", detail: [] }] }]) {
    const site = defaultSite(); site.resume.sections = [section];
    const f = await fixture(t, { site });
    await assert.rejects(f.build(), /resume\.sections/);
  }
  const site = defaultSite();
  site.resume.sections = [{ heading: "Education", items: [{ title: "School", detail: "First line\nSecond line" }] }];
  const f = await fixture(t, { site });
  assert.deepEqual((await f.build()).resume.sections, site.resume.sections);
});

test("importing a builder copy does not execute its CLI or generate output", async t => {
  // Keeping this copy beneath the repository lets Node resolve the real dependencies.
  const root = await temporary(t, __dirname);
  const copy = path.join(root, "scripts/build-content.mjs");
  await write(copy, await fs.readFile(script));
  await write(path.join(root, "scripts/asset-version.mjs"), await fs.readFile(path.join(project, "scripts/asset-version.mjs")));
  await write(path.join(root, "scripts/content-dates.mjs"), await fs.readFile(path.join(project, "scripts/content-dates.mjs")));
  for (const name of ["html-content.mjs", "content-paths.mjs", "build-files.mjs"]) {
    await write(path.join(root, "scripts", name), await fs.readFile(path.join(project, "scripts", name)));
  }
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(copy).href)});`], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.equal(result.stdout, "");
  await assert.rejects(fs.stat(path.join(root, "dist")), { code: "ENOENT" });
});
