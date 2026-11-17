"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function answer(options) {
  const body = JSON.parse(options.body);
  const segments = JSON.parse(body.messages[1].content).segments;
  return { ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: {
    reasoning_content: "This content is never published.",
    content: JSON.stringify({ translations: segments.map(item => ({ id: item.id, text: "English text" })) })
  } }] }) };
}

test("model and effort settings map to DeepSeek request parameters, budgets and provenance", async () => {
  const { collectTranslationSegments, translateSegments, emptyManifest } = await import("../scripts/translations.mjs");
  const segments = collectTranslationSegments({ greeting: "你好", paths: [], samples: {} });
  for (const reasoningEffort of ["none", "low", "high", "max"]) {
    let sent;
    const result = await translateSegments(segments, emptyManifest(), {
      apiKey: "test-key", model: "deepseek-v4-pro", reasoningEffort, temperature: 0.35,
      fetchImpl: async (url, options) => { sent = JSON.parse(options.body); return answer(options); }
    });
    assert.equal(sent.model, "deepseek-v4-pro");
    assert.deepEqual(sent.thinking, { type: reasoningEffort === "none" ? "disabled" : "enabled" });
    assert.equal(sent.reasoning_effort, reasoningEffort === "none" ? undefined : reasoningEffort);
    assert.equal(sent.temperature, reasoningEffort === "none" ? 0.35 : undefined);
    assert.equal(sent.max_tokens, reasoningEffort === "none" ? 16384 : 65536);
    const cached = result.manifest.segments[segments[0].hash];
    assert.equal(cached.model, "deepseek-v4-pro");
    assert.equal(cached.reasoningEffort, reasoningEffort);
    assert.equal(cached.text, "English text");
    assert.equal(cached.reasoning_content, undefined);
    const reused = await translateSegments(segments, result.manifest, {
      model: "deepseek-flash", reasoningEffort: "none", fetchImpl: () => assert.fail("Existing translations must be retained.")
    });
    assert.equal(reused.reused, 1);
    assert.equal(reused.manifest.segments[segments[0].hash].model, "deepseek-v4-pro");
  }
});

test("invalid engine configuration is rejected before making any request", async () => {
  const { collectTranslationSegments, translateSegments, emptyManifest } = await import("../scripts/translations.mjs");
  const segments = collectTranslationSegments({ greeting: "你好", paths: [], samples: {} });
  for (const options of [{ reasoningEffort: "medium" }, { maxTokens: -1 }, { timeoutMs: 0 }, { temperature: Infinity }]) {
    await assert.rejects(translateSegments(segments, emptyManifest(), {
      apiKey: "test-key", fetchImpl: () => assert.fail("Invalid configuration must not call the API."), ...options
    }));
  }
});

test("translation CLI reads the repository configuration and keeps the key out of configuration and saved text", async t => {
  const { translate } = await import("../scripts/translate.mjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lizpink-model-config-"));
  t.after(async () => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("lizpink-model-config-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  await fs.mkdir(path.join(root, "content/entries"), { recursive: true });
  await fs.writeFile(path.join(root, "translation.config.json"), JSON.stringify({ model: "deepseek-v4-pro", reasoningEffort: "high" }));
  await fs.writeFile(path.join(root, "content/site.yml"), [
    "name: Test", "greeting: 你好", "role: Student", "interests: []", "resume:", "  sections: []", '  pdfUrl: ""', "paths:",
    ...["life", "resume", "project"].flatMap(id => [`  - id: ${id}`, `    title: ${id}`, '    description: ""'])
  ].join("\n"));
  const result = await translate({ root, options: { apiKey: "private-test-key", fetchImpl: async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.model, "deepseek-v4-pro");
    assert.equal(body.reasoning_effort, "high");
    assert.equal(body.max_tokens, 65536);
    return answer(options);
  } } });
  assert.equal(result.configuration.reasoningEffort, "high");
  assert.equal(result.configuration.apiKey, undefined);
  const saved = await fs.readFile(path.join(root, "content/translations/en.json"), "utf8");
  assert.ok(!saved.includes("private-test-key"));
  assert.ok(!saved.includes("This content is never published."));
});
