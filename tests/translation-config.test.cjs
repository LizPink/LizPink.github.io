"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const configuration = import("../scripts/translation-config.mjs");

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lizpink-translation-config-"));
  t.after(async () => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("lizpink-translation-config-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

test("default translation settings use non-thinking mode with suitable output and timeout limits", async t => {
  const { loadTranslationConfig, resolveTranslationConfig } = await configuration;
  const expected = {
    baseURL: "https://api.deepseek.com", model: "deepseek-flash", reasoningEffort: "none",
    temperature: 0.2, maxTokens: 16384, timeoutMs: 60000
  };
  assert.deepEqual(resolveTranslationConfig(), expected);
  assert.deepEqual(await loadTranslationConfig({ root: await temporary(t), env: {} }), expected);
  for (const reasoningEffort of ["low", "high", "max"]) {
    const result = resolveTranslationConfig({ file: { reasoningEffort } });
    assert.equal(result.reasoningEffort, reasoningEffort);
    assert.equal(result.maxTokens, 65536);
    assert.equal(result.timeoutMs, 180000);
  }
});

test("overrides take precedence over non-empty environment settings, then file settings, then defaults", async t => {
  const { loadTranslationConfig, resolveTranslationConfig } = await configuration;
  const root = await temporary(t);
  const file = { baseURL: "https://api.deepseek.com/v1", model: "file-model", reasoningEffort: "low", temperature: 0.8, maxTokens: 2048, timeoutMs: 10000 };
  await fs.writeFile(path.join(root, "translation.config.json"), JSON.stringify(file));
  const env = { DEEPSEEK_MODEL: "env-model", DEEPSEEK_REASONING_EFFORT: "high", DEEPSEEK_TEMPERATURE: "0.5", DEEPSEEK_MAX_TOKENS: "8192" };
  const overrides = { model: "future-model", temperature: 0, timeoutMs: 25000 };
  const expected = { baseURL: file.baseURL, model: "future-model", reasoningEffort: "high", temperature: 0, maxTokens: 8192, timeoutMs: 25000 };
  assert.deepEqual(resolveTranslationConfig({ file, env, overrides }), expected);
  assert.deepEqual(await loadTranslationConfig({ root, env, overrides }), expected);
  assert.deepEqual(file, { baseURL: "https://api.deepseek.com/v1", model: "file-model", reasoningEffort: "low", temperature: 0.8, maxTokens: 2048, timeoutMs: 10000 });
  assert.equal(resolveTranslationConfig({ env: { DEEPSEEK_MAX_TOKENS: "not-numeric" }, overrides: { maxTokens: 99 } }).maxTokens, 99);
});

test("empty repository variables fall back to file settings and dynamic defaults follow the final effort", async () => {
  const { resolveTranslationConfig } = await configuration;
  const env = Object.fromEntries(["BASE_URL", "MODEL", "REASONING_EFFORT", "TEMPERATURE", "MAX_TOKENS", "TIMEOUT_MS"].map(name => [`DEEPSEEK_${name}`, ""]));
  assert.equal(resolveTranslationConfig({ file: { model: "file-model", temperature: 0.7 }, env }).model, "file-model");
  assert.equal(resolveTranslationConfig({ file: { model: "file-model", temperature: 0.7 }, env }).temperature, 0.7);
  assert.equal(resolveTranslationConfig({ file: { reasoningEffort: "none" }, env: { DEEPSEEK_REASONING_EFFORT: "max" } }).maxTokens, 65536);
  assert.equal(resolveTranslationConfig({ file: { reasoningEffort: "max" }, overrides: { reasoningEffort: "none" } }).timeoutMs, 60000);
  assert.equal(resolveTranslationConfig({ file: { reasoningEffort: "max", maxTokens: 1000, timeoutMs: 10000 } }).maxTokens, 1000);
  assert.equal(resolveTranslationConfig({ overrides: { model: undefined } }).model, "deepseek-flash");
});

test("configuration files and overrides reject unknown or secret settings without echoing their contents", async t => {
  const { loadTranslationConfig, resolveTranslationConfig } = await configuration;
  const root = await temporary(t);
  const secret = "sk-private-test-value";
  for (const file of [{ apiKey: secret }, { [secret]: "unexpected" }, null, [], "invalid"]) {
    await fs.writeFile(path.join(root, "translation.config.json"), JSON.stringify(file));
    await assert.rejects(loadTranslationConfig({ root, env: {} }), error => {
      assert.ok(!error.message.includes(secret));
      assert.match(error.message, /translation.config.json/);
      return true;
    });
  }
  assert.throws(() => resolveTranslationConfig({ overrides: { apiKey: secret } }), error => !error.message.includes(secret) && /unsupported/.test(error.message));
  assert.throws(() => resolveTranslationConfig({ overrides: [] }), /object/);
});

test("invalid JSON reports useful syntax guidance without leaking pasted credentials", async t => {
  const { loadTranslationConfig } = await configuration;
  const root = await temporary(t);
  await fs.writeFile(path.join(root, "translation.config.json"), '{"model":"sk-secret-pasted-here",}');
  await assert.rejects(loadTranslationConfig({ root, env: {} }), error => {
    assert.match(error.message, /not valid JSON/);
    assert.ok(!error.message.includes("sk-secret"));
    return true;
  });
  await fs.writeFile(path.join(root, "translation.config.json"), '\ufeff{"model":"future-model"}');
  assert.equal((await loadTranslationConfig({ root, env: {} })).model, "future-model");
});

test("HTTPS endpoints, model names and thinking efforts are validated without restricting future model identifiers", async () => {
  const { resolveTranslationConfig } = await configuration;
  for (const baseURL of ["http://api.deepseek.com", "https://name:secret@api.deepseek.com", "https://api.deepseek.com?token=secret", "https://api.deepseek.com#fragment", "https://api.deepseek.com?", "not a URL", 42, " https://api.deepseek.com", "https://api.deepseek.com\n"]) {
    assert.throws(() => resolveTranslationConfig({ file: { baseURL } }), /baseURL/);
  }
  for (const model of ["", "   ", "model\nother", "model\rother", 10, null]) assert.throws(() => resolveTranslationConfig({ file: { model } }), /model/);
  for (const reasoningEffort of ["medium", "enabled", "HIGH", " high", "", 1, null]) assert.throws(() => resolveTranslationConfig({ file: { reasoningEffort } }), /reasoningEffort/);
  assert.equal(resolveTranslationConfig({ file: { model: "future-provider-model-2030" } }).model, "future-provider-model-2030");
});

test("numeric limits accept their boundaries and reject invalid types, ranges and non-finite values", async () => {
  const { resolveTranslationConfig } = await configuration;
  for (const temperature of [0, 2]) assert.equal(resolveTranslationConfig({ file: { temperature } }).temperature, temperature);
  for (const temperature of [-0.1, 2.1, NaN, Infinity, "0.2", null]) assert.throws(() => resolveTranslationConfig({ file: { temperature } }), /temperature/);
  for (const maxTokens of [1, 393216]) assert.equal(resolveTranslationConfig({ file: { maxTokens } }).maxTokens, maxTokens);
  for (const maxTokens of [0, -1, 393217, 1.5, Infinity, "100", null]) assert.throws(() => resolveTranslationConfig({ file: { maxTokens } }), /maxTokens/);
  for (const timeoutMs of [1000, 600000]) assert.equal(resolveTranslationConfig({ file: { timeoutMs } }).timeoutMs, timeoutMs);
  for (const timeoutMs of [999, 600001, 1000.5, NaN, "1000", null]) assert.throws(() => resolveTranslationConfig({ file: { timeoutMs } }), /timeoutMs/);
});

test("environment numbers require complete finite decimal values and do not accept whitespace, hexadecimal or partial parsing", async () => {
  const { resolveTranslationConfig } = await configuration;
  for (const variable of ["DEEPSEEK_TEMPERATURE", "DEEPSEEK_MAX_TOKENS", "DEEPSEEK_TIMEOUT_MS"]) {
    for (const value of [" ", " 1", "1 ", "\t1", "1\n", "NaN", "Infinity", "1e999", "0x10", "10tokens", "01", null, 1000]) {
      assert.throws(() => resolveTranslationConfig({ env: { [variable]: value } }), /DEEPSEEK_|temperature|maxTokens|timeoutMs/);
    }
  }
  const result = resolveTranslationConfig({ env: { DEEPSEEK_TEMPERATURE: "0.25", DEEPSEEK_MAX_TOKENS: "16384", DEEPSEEK_TIMEOUT_MS: "1.8e5" } });
  assert.equal(result.temperature, 0.25);
  assert.equal(result.maxTokens, 16384);
  assert.equal(result.timeoutMs, 180000);
});
