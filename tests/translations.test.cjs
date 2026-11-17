"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const modulePromise = import("../scripts/translations.mjs");

function content() {
  return {
    name: "LizPink", greeting: "你好，LizPink", role: "学生", interests: ["Graphics", "游戏"],
    about: { paragraphs: ["我的网站"] }, resume: { pdfUrl: "./files/中文简历.pdf", sections: [{ heading: "教育", items: [{ title: "学校", detail: "研究图形学" }] }] },
    paths: [{ id: "project", command: "project", title: "项目", description: "项目实践", items: ["中文路径"] }],
    samples: {
      中文路径: {
        title: "我的项目", text: "项目实践", publishedAt: "2026-11-17", updatedAt: "2026-11-17", mediaCounts: { images: 1 },
        body: '<h2 id="稳定章节">章节标题</h2><p>图形学介绍 <code>中文代码</code> <span class="article-math-display" aria-label="独立公式"><span class="katex"><math><annotation>中文公式</annotation></math></span></span></p><figure><a href="./中文图片.png" aria-label="查看大图"><img src="./中文图片.png?v=123" alt="渲染效果"></a><figcaption>渲染效果</figcaption></figure><pre>中文示例代码</pre><p translate="no">保留的中文</p>',
        headings: [{ id: "稳定章节", level: 2, text: "章节标题" }]
      }
    },
    uiMessages: { "中文键保持不变": "内容目录", nested: ["返回阅读", "Press /"], count: 2 }
  };
}

async function completeManifest(source, dictionary = {}) {
  const module = await modulePromise;
  const manifest = module.emptyManifest();
  for (const segment of module.collectTranslationSegments(source)) manifest.segments[segment.hash] = {
    source: segment.source, text: dictionary[segment.source] || `English ${segment.id}`
  };
  return manifest;
}

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lizpink-translations-"));
  t.after(async () => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("lizpink-translations-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

test("translation extraction includes visible content and nested UI values while preserving code, formulas and routing", async () => {
  const { collectTranslationSegments } = await modulePromise;
  const source = content();
  const segments = collectTranslationSegments(source);
  const texts = segments.map(item => item.source);
  for (const text of ["学生", "游戏", "学校", "图形学介绍", "查看大图", "渲染效果", "章节标题", "内容目录", "返回阅读", "独立公式"]) assert.ok(texts.includes(text), text);
  for (const text of ["LizPink", "Graphics", "中文路径", "中文代码", "中文公式", "中文示例代码", "保留的中文", "./中文图片.png?v=123", "中文键保持不变"]) assert.ok(!texts.includes(text), text);
  assert.equal(texts.filter(text => text === "项目实践").length, 1);
  assert.equal(texts.filter(text => text === "渲染效果").length, 1);
  assert.equal(source.samples.中文路径.headings[0].text, "章节标题");
});

test("localization derives outline titles from translated HTML and leaves IDs, links, dates, code and formulas intact", async () => {
  const { localizeContent, translationStatus } = await modulePromise;
  const source = content();
  const manifest = await completeManifest(source, { "章节标题": "Chapter title", "渲染效果": "Render & results", "图形学介绍": "An introduction to graphics" });
  assert.equal(translationStatus(source, manifest).complete, true);
  const translated = localizeContent(source, manifest, { strict: true });
  const sample = translated.samples.中文路径;
  assert.match(sample.body, /<h2 id="稳定章节">Chapter title<\/h2>/);
  assert.match(sample.body, /Render &amp; results/);
  assert.match(sample.body, /<code>中文代码<\/code>/);
  assert.match(sample.body, /<annotation>中文公式<\/annotation>/);
  assert.match(sample.body, /src="\.\/中文图片\.png\?v=123"/);
  assert.match(sample.body, /translate="no">保留的中文/);
  assert.equal(sample.headings[0].id, "稳定章节");
  assert.equal(sample.headings[0].text, "Chapter title");
  assert.equal(sample.publishedAt, "2026-11-17");
  assert.equal(translated.resume.pdfUrl, source.resume.pdfUrl);
  assert.equal(translated.paths[0].items[0], "中文路径");
  assert.equal(translated.uiMessages.count, 2);
  assert.notEqual(translated.uiMessages["中文键保持不变"], "内容目录");
  assert.equal(source.samples.中文路径.headings[0].text, "章节标题");
});

test("missing or stale translations are detected; local previews may retain untranslated source", async () => {
  const { localizeContent, translationStatus, emptyManifest } = await modulePromise;
  const source = content();
  assert.equal(translationStatus(source, emptyManifest()).complete, false);
  assert.equal(localizeContent(source, emptyManifest()).role, "学生");
  assert.throws(() => localizeContent(source, emptyManifest(), { strict: true }), /missing or outdated/);
  const manifest = await completeManifest(source);
  source.about.paragraphs.push("新增段落");
  assert.deepEqual(translationStatus(source, manifest).missing.map(item => item.source), ["新增段落"]);
});

test("mathematical heading labels include the original TeX once instead of duplicating KaTeX representations", async () => {
  const { localizeContent } = await modulePromise;
  const source = { paths: [], samples: { formula: {
    title: "Formula", body: '<h2 id="formula">中文标题 <span class="katex"><span class="katex-mathml"><math><semantics><mi>x</mi><annotation encoding="application/x-tex">x</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">x</span></span></h2>',
    headings: [{ id: "formula", text: "中文标题 x", level: 2 }]
  } } };
  const manifest = await completeManifest(source, { "中文标题": "Title" });
  const result = localizeContent(source, manifest, { strict: true });
  assert.equal(result.samples.formula.headings[0].text, "Title x");
  assert.match(result.samples.formula.body, /<annotation encoding="application\/x-tex">x<\/annotation>/);
});

test("status validation scans the complete cache once, not once per segment", async () => {
  const { translationStatus } = await modulePromise;
  const source = { paths: [], samples: {}, uiMessages: {} };
  for (let index = 0; index < 200; index++) source.uiMessages[index] = `测试文案${index}`;
  const manifest = await completeManifest(source);
  let scans = 0;
  manifest.segments = new Proxy(manifest.segments, { ownKeys(target) { scans++; return Reflect.ownKeys(target); } });
  assert.equal(translationStatus(source, manifest).complete, true);
  assert.equal(scans, 1);
});

test("DeepSeek requests send structured segments without enabling tools; only changed segments are translated and deleted ones are removed", async () => {
  const { collectTranslationSegments, emptyManifest, translateSegments, translationHash } = await modulePromise;
  const source = content();
  const all = collectTranslationSegments(source);
  const manifest = emptyManifest();
  manifest.segments[all[0].hash] = { source: all[0].source, text: "A manually reviewed translation", reviewed: true };
  manifest.segments[translationHash("已删除内容")] = { source: "已删除内容", text: "Deleted content" };
  const calls = [];
  const fetchImpl = async (url, options) => {
    assert.equal(url, "https://api.deepseek.com/chat/completions");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    const body = JSON.parse(options.body);
    calls.push(body);
    assert.equal(body.model, "deepseek-flash");
    assert.deepEqual(body.thinking, { type: "disabled" });
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.equal(body.tools, undefined);
    assert.match(body.messages[0].content, /json/);
    const segments = JSON.parse(body.messages[1].content).segments;
    assert.ok(!segments.some(segment => segment.id === all[0].id));
    return { ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ translations: segments.map(segment => ({ id: segment.id, text: `Translated ${segment.id}` })) }) } }] }) };
  };
  const result = await translateSegments(all, manifest, { apiKey: "test-key", fetchImpl, maxSegments: 4 });
  assert.equal(result.translated, all.length - 1);
  assert.equal(result.reused, 1);
  assert.ok(calls.length > 1);
  assert.deepEqual(result.manifest.segments[all[0].hash], manifest.segments[all[0].hash]);
  assert.equal(result.manifest.segments[translationHash("已删除内容")], undefined);
  assert.equal(Object.keys(manifest.segments).length, 2);
  const cached = await translateSegments(all, result.manifest, { fetchImpl: () => assert.fail("cached segments must not call API") });
  assert.equal(cached.translated, 0);
});

test("transient, blank and truncated responses retry, and invalid IDs or placeholders never modify the previous manifest", async () => {
  const { collectTranslationSegments, emptyManifest, translateSegments } = await modulePromise;
  const segments = collectTranslationSegments({ greeting: "你好，{name}", samples: {}, paths: [] });
  const manifest = emptyManifest();
  let attempts = 0;
  const fetchImpl = async () => {
    attempts++;
    if (attempts === 1) return { ok: false, status: 429 };
    if (attempts === 2) return { ok: true, json: async () => ({ choices: [{ finish_reason: "length", message: { content: "{}" } }] }) };
    return { ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ translations: [{ id: segments[0].id, text: "Hello, {name}" }] }) } }] }) };
  };
  const result = await translateSegments(segments, manifest, { apiKey: "test-key", fetchImpl, wait: async () => {} });
  assert.equal(attempts, 3);
  assert.equal(result.manifest.segments[segments[0].hash].text, "Hello, {name}");
  assert.deepEqual(manifest, emptyManifest());
  for (const translations of [[], [{ id: "unexpected", text: "Hello" }], [{ id: segments[0].id, text: "Hello" }], [{ id: segments[0].id, text: "<script>alert(1)</script>" }]]) {
    await assert.rejects(translateSegments(segments, manifest, {
      apiKey: "test-key", attempts: 1,
      fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ translations }) } }] }) })
    }), /segments|invalid/);
    assert.deepEqual(manifest, emptyManifest());
  }
});

test("authentication failures do not retry or expose server bodies and missing keys fail before requesting", async () => {
  const { collectTranslationSegments, emptyManifest, translateSegments } = await modulePromise;
  const segments = collectTranslationSegments({ greeting: "你好", samples: {}, paths: [] });
  await assert.rejects(translateSegments(segments, emptyManifest(), { fetchImpl: () => assert.fail("no key") }), /DEEPSEEK_API_KEY is required/);
  let calls = 0;
  await assert.rejects(translateSegments(segments, emptyManifest(), { apiKey: "private-test-value", fetchImpl: async () => { calls++; return { ok: false, status: 401, text: async () => "private-test-value" }; } }), error => {
    assert.match(error.message, /HTTP 401/);
    assert.ok(!error.message.includes("private-test-value"));
    return true;
  });
  assert.equal(calls, 1);
});

test("a failed later batch never mutates cached translations or returns a partial result", async () => {
  const { collectTranslationSegments, emptyManifest, translateSegments } = await modulePromise;
  const segments = collectTranslationSegments({ greeting: "你好", role: "学生", samples: {}, paths: [] });
  const manifest = emptyManifest();
  let calls = 0;
  await assert.rejects(translateSegments(segments, manifest, {
    apiKey: "test-key", maxSegments: 1,
    fetchImpl: async (url, options) => {
      calls++;
      if (calls === 2) return { ok: false, status: 401 };
      const item = JSON.parse(JSON.parse(options.body).messages[1].content).segments[0];
      return { ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ translations: [{ id: item.id, text: "Hello" }] }) } }] }) };
    }
  }), /HTTP 401/);
  assert.equal(calls, 2);
  assert.deepEqual(manifest, emptyManifest());
});

test("manifest saves are atomic, validated, preserve manual revisions and reject malformed cached records", async t => {
  const { readManifest, writeManifest, emptyManifest } = await modulePromise;
  const root = await temporary(t);
  const file = path.join(root, "translations/en.json");
  assert.deepEqual(await readManifest(file), emptyManifest());
  const manifest = await completeManifest(content());
  await writeManifest(file, manifest);
  assert.deepEqual(await readManifest(file), manifest);
  assert.deepEqual(await fs.readdir(path.dirname(file)), ["en.json"]);
  const previous = await fs.readFile(file, "utf8");
  await assert.rejects(writeManifest(file, { version: 1, segments: {} }), /invalid/);
  assert.equal(await fs.readFile(file, "utf8"), previous);
  const key = Object.keys(manifest.segments)[0];
  manifest.segments[key].text = "<img src=x onerror=alert(1)>";
  await fs.writeFile(file, JSON.stringify(manifest));
  await assert.rejects(readManifest(file), /Unsupported/);
});

test("valid outdated recipes can be regenerated, while corrupted or unknown-format manifests are never silently discarded", async t => {
  const { readManifest, emptyManifest } = await modulePromise;
  const root = await temporary(t);
  const file = path.join(root, "en.json");
  const old = { version: 1, glossaryVersion: "graphics-v0", recipeVersion: "en-v0", segments: {} };
  const source = "人工修订";
  const hash = createHash("sha256").update(`${old.recipeVersion}\n${old.glossaryVersion}\n${source}`).digest("hex");
  old.segments[hash] = { source, text: "Reviewed wording", reviewed: true };
  await fs.writeFile(file, JSON.stringify(old));
  const previous = await fs.readFile(file, "utf8");
  await assert.rejects(readManifest(file), /recipe/);
  assert.deepEqual(await readManifest(file, { allowOutdated: true }), emptyManifest());
  assert.equal(await fs.readFile(file, "utf8"), previous);
  for (const bad of [
    { ...old, version: 0 },
    { ...old, recipeVersion: "invalid\nrecipe" },
    { ...old, segments: { [hash]: { source: "篡改原文", text: "Reviewed wording" } } },
    { ...old, segments: { [hash]: { source, text: "<script>bad()</script>" } } }
  ]) {
    await fs.writeFile(file, JSON.stringify(bad));
    await assert.rejects(readManifest(file, { allowOutdated: true }), /Unsupported or invalid/);
  }
});

test("translation CLI checks and failures leave manifests untouched and remove only its temporary directory", async t => {
  const { translate } = await import("../scripts/translate.mjs");
  const root = await temporary(t);
  await fs.mkdir(path.join(root, "content/entries"), { recursive: true });
  const site = [
    "name: Test", 'greeting: "你好"', 'role: "学生"', "interests: []", "resume:", "  sections: []", '  pdfUrl: ""', "paths:",
    ...["life", "resume", "project"].flatMap(id => [`  - id: ${id}`, `    title: ${id}`, '    description: ""'])
  ].join("\n");
  await fs.writeFile(path.join(root, "content/site.yml"), site);
  await fs.mkdir(path.join(root, ".build/keep-this"), { recursive: true });
  await assert.rejects(translate({ root, check: true }), /missing or outdated/);
  assert.deepEqual(await fs.readdir(path.join(root, ".build")), ["keep-this"]);
  await assert.rejects(translate({ root, options: { apiKey: "" } }), /DEEPSEEK_API_KEY/);
  await assert.rejects(fs.stat(path.join(root, "content/translations/en.json")), { code: "ENOENT" });
  const translatorOptions = {
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      const segments = JSON.parse(JSON.parse(options.body).messages[1].content).segments;
      return { ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ translations: segments.map(item => ({ id: item.id, text: `English ${item.id}` })) }) } }] }) };
    }
  };
  const result = await translate({ root, options: translatorOptions });
  assert.equal(result.translated, 2);
  const previous = await fs.readFile(path.join(root, "content/translations/en.json"), "utf8");
  assert.equal((await translate({ root, check: true })).reused, 2);
  assert.equal(await fs.readFile(path.join(root, "content/translations/en.json"), "utf8"), previous);
  assert.deepEqual(await fs.readdir(path.join(root, ".build")), ["keep-this"]);
  const stale = JSON.parse(previous);
  stale.recipeVersion = "en-v0";
  stale.segments = Object.fromEntries(Object.values(stale.segments).map(item => [
    createHash("sha256").update(`${stale.recipeVersion}\n${stale.glossaryVersion}\n${item.source}`).digest("hex"), item
  ]));
  const staleText = JSON.stringify(stale);
  await fs.writeFile(path.join(root, "content/translations/en.json"), staleText);
  await assert.rejects(translate({ root, check: true }), /recipe/);
  await assert.rejects(translate({ root, options: { apiKey: "" } }), /DEEPSEEK_API_KEY/);
  assert.equal(await fs.readFile(path.join(root, "content/translations/en.json"), "utf8"), staleText);
  assert.equal((await translate({ root, options: translatorOptions })).translated, 2);
  assert.equal((await translate({ root, check: true })).reused, 2);
  assert.deepEqual(await fs.readdir(path.join(root, ".build")), ["keep-this"]);
});
