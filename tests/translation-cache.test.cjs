"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const cacheModule = import("../scripts/translation-cache.mjs");
const translations = import("../scripts/translations.mjs");
const env = { GITHUB_REPOSITORY: "example/site", GITHUB_SHA: "a".repeat(40), GITHUB_TOKEN: "secret-test-token" };
const blobSha = "b".repeat(40);

async function fixture(t, entries = []) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lizpink-cache-"));
  t.after(async () => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith("lizpink-cache-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  const { emptyManifest, translationHash, writeManifest } = await translations;
  const manifest = emptyManifest();
  for (const [source, text] of entries) manifest.segments[translationHash(source)] = { source, text };
  const file = path.join(root, "content/translations/en.json");
  await writeManifest(file, manifest);
  return { root, file, manifest };
}

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function fileResponse(manifest, sha = blobSha) {
  return response({ sha, encoding: "base64", content: Buffer.from(JSON.stringify(manifest)).toString("base64") });
}

function outdatedManifest(manifest) {
  const old = { ...manifest, glossaryVersion: "old-glossary", recipeVersion: "en-v0" };
  old.segments = Object.fromEntries(Object.values(manifest.segments).map(item => [
    createHash("sha256").update(`${old.recipeVersion}\n${old.glossaryVersion}\n${item.source}`).digest("hex"), { ...item }
  ]));
  return old;
}

function queue(responses, calls) {
  return async (url, options) => {
    assert.ok(url.startsWith("https://api.github.com/repos/example/site/"));
    assert.equal(options.headers.Authorization, `Bearer ${env.GITHUB_TOKEN}`);
    assert.equal(options.redirect, "error");
    assert.ok(!url.includes(env.GITHUB_TOKEN));
    assert.ok(!String(options.body).includes(env.GITHUB_TOKEN));
    calls.push({ url, ...options, body: options.body === undefined ? undefined : JSON.parse(options.body) });
    assert.ok(responses.length, "unexpected GitHub request");
    return responses.shift();
  };
}

test("restore tolerates a missing branch/file without modifying the source manifest", async t => {
  const { restoreTranslationCache } = await cacheModule;
  const f = await fixture(t, [["原文", "Reviewed wording"]]);
  const original = await fs.readFile(f.file, "utf8"), calls = [];
  const result = await restoreTranslationCache({ root: f.root, env, fetchImpl: queue([response({}, 404)], calls) });
  assert.equal(result.restored, false);
  assert.equal(await fs.readFile(f.file, "utf8"), original);
  assert.match(calls[0].url, /contents\/content\/translations\/en.json\?ref=i18n-cache$/);
});

test("restore validates and merges remote entries, preserving local reviewed translations", async t => {
  const { restoreTranslationCache } = await cacheModule;
  const { emptyManifest, readManifest, translationHash } = await translations;
  const f = await fixture(t, [["同一原文", "Locally reviewed wording"]]);
  const remote = emptyManifest();
  remote.segments[translationHash("同一原文")] = { source: "同一原文", text: "Previous automatic wording" };
  remote.segments[translationHash("新增原文")] = { source: "新增原文", text: "Cached new text" };
  const result = await restoreTranslationCache({ root: f.root, env, fetchImpl: queue([fileResponse(remote)], []) });
  const restored = await readManifest(f.file);
  assert.equal(result.segments, 2);
  assert.equal(restored.segments[translationHash("同一原文")].text, "Locally reviewed wording");
  assert.equal(restored.segments[translationHash("新增原文")].text, "Cached new text");
  assert.deepEqual(await fs.readdir(path.join(f.root, ".build")), []);
});

test("old glossary caches are ignored; malformed current caches cannot overwrite local content", async t => {
  const { restoreTranslationCache } = await cacheModule;
  const f = await fixture(t, [["原文", "Original reviewed text"]]);
  const original = await fs.readFile(f.file, "utf8");
  const old = outdatedManifest(f.manifest);
  assert.equal((await restoreTranslationCache({ root: f.root, env, fetchImpl: queue([fileResponse(old)], []) })).restored, false);
  const bad = structuredClone(f.manifest);
  Object.values(bad.segments)[0].text = "<script>injected</script>";
  await assert.rejects(restoreTranslationCache({ root: f.root, env, fetchImpl: queue([fileResponse(bad)], []) }), /invalid or unsupported/);
  assert.equal(await fs.readFile(f.file, "utf8"), original);
  assert.deepEqual(await fs.readdir(path.join(f.root, ".build")), []);
});

test("outdated remote caches must still have valid hashes, text and manifest structure", async t => {
  const { restoreTranslationCache } = await cacheModule;
  const f = await fixture(t, [["原文", "Source-owned wording"]]);
  const original = await fs.readFile(f.file, "utf8");
  const old = outdatedManifest(f.manifest);
  const key = Object.keys(old.segments)[0];
  for (const bad of [
    { ...old, segments: { [key]: { source: "已被篡改", text: "Old wording" } } },
    { ...old, segments: { [key]: { source: "原文", text: "<script>injected</script>" } } },
    { ...old, recipeVersion: "invalid\nrecipe" }
  ]) {
    await assert.rejects(restoreTranslationCache({ root: f.root, env, fetchImpl: queue([fileResponse(bad)], []) }), /invalid or unsupported/);
    assert.equal(await fs.readFile(f.file, "utf8"), original);
    assert.deepEqual(await fs.readdir(path.join(f.root, ".build")), []);
  }
});

test("restore permits a valid outdated source manifest to migrate and rejects damaged source data before contacting GitHub", async t => {
  const { restoreTranslationCache } = await cacheModule;
  const { readManifest } = await translations;
  const f = await fixture(t, [["原文", "Current cached wording"]]);
  const old = outdatedManifest(f.manifest);
  Object.values(old.segments)[0].text = "Old source-owned wording";
  const oldText = JSON.stringify(old);
  await fs.writeFile(f.file, oldText);
  const missing = await restoreTranslationCache({ root: f.root, env, fetchImpl: queue([response({}, 404)], []) });
  assert.equal(missing.restored, false);
  assert.equal(missing.segments, 0);
  assert.equal(await fs.readFile(f.file, "utf8"), oldText);
  assert.equal((await restoreTranslationCache({ root: f.root, env, fetchImpl: queue([fileResponse(f.manifest)], []) })).restored, true);
  assert.deepEqual(await readManifest(f.file), f.manifest);
  const bad = outdatedManifest(f.manifest);
  Object.values(bad.segments)[0].source = "损坏的原文";
  await fs.writeFile(f.file, JSON.stringify(bad));
  await assert.rejects(restoreTranslationCache({ root: f.root, env, fetchImpl: () => assert.fail("damaged local data must fail before network") }), /Unsupported or invalid/);
});

test("save creates only the cache branch from the deployment commit and updates its single file", async t => {
  const { saveTranslationCache } = await cacheModule;
  const f = await fixture(t, [["原文", "English text"]]), calls = [];
  const result = await saveTranslationCache({ root: f.root, env, fetchImpl: queue([
    response({}, 404), response({}, 201), response({}, 404), response({}, 201)
  ], calls) });
  assert.equal(result.saved, true);
  assert.equal(calls[0].method, "GET");
  assert.match(calls[0].url, /git\/ref\/heads\/i18n-cache$/);
  assert.equal(calls[1].method, "POST");
  assert.deepEqual(calls[1].body, { ref: "refs/heads/i18n-cache", sha: env.GITHUB_SHA });
  assert.equal(calls[3].method, "PUT");
  assert.equal(calls[3].body.branch, "i18n-cache");
  assert.equal(calls[3].body.sha, undefined);
  assert.deepEqual(JSON.parse(Buffer.from(calls[3].body.content, "base64").toString("utf8")), f.manifest);
  assert.equal(calls.some(call => call.body?.branch === "main" || call.body?.ref === "refs/heads/main"), false);
});

test("save skips unchanged data, independent of JSON property ordering", async t => {
  const { saveTranslationCache } = await cacheModule;
  const f = await fixture(t, [["第一段", "First"], ["第二段", "Second"]]), calls = [];
  const remote = { segments: Object.fromEntries(Object.entries(f.manifest.segments).reverse()), ...f.manifest };
  remote.segments = Object.fromEntries(Object.entries(f.manifest.segments).reverse());
  const result = await saveTranslationCache({ root: f.root, env, fetchImpl: queue([
    response({ ref: "refs/heads/i18n-cache" }), fileResponse(remote)
  ], calls) });
  assert.equal(result.unchanged, true);
  assert.equal(result.saved, false);
  assert.equal(calls.length, 2);
});

test("save uses the existing file SHA when replacing changed cache data", async t => {
  const { saveTranslationCache } = await cacheModule;
  const { emptyManifest } = await translations;
  const f = await fixture(t, [["原文", "English"]]), calls = [];
  await saveTranslationCache({ root: f.root, env, fetchImpl: queue([
    response({}), fileResponse(emptyManifest()), response({})
  ], calls) });
  assert.equal(calls[2].body.sha, blobSha);
  assert.equal(calls[2].body.branch, "i18n-cache");
});

test("API and network failures never expose tokens or GitHub response bodies", async t => {
  const { restoreTranslationCache } = await cacheModule;
  const f = await fixture(t);
  for (const fetchImpl of [
    async () => response({ message: `Unauthorized: ${env.GITHUB_TOKEN}` }, 403),
    async () => { throw new Error(`Authorization: Bearer ${env.GITHUB_TOKEN}`); }
  ]) {
    await assert.rejects(restoreTranslationCache({ root: f.root, env, fetchImpl }), error => {
      assert.ok(!error.message.includes(env.GITHUB_TOKEN));
      assert.match(error.message, /HTTP 403|could not connect/);
      return true;
    });
  }
});

test("invalid configuration and CLI actions fail before any network request", async t => {
  const { restoreTranslationCache, main } = await cacheModule;
  const f = await fixture(t);
  const fetchImpl = () => assert.fail("invalid configuration must not call GitHub");
  for (const values of [
    { ...env, GITHUB_REPOSITORY: "example/site?token=secret" },
    { ...env, GITHUB_REPOSITORY: "../site" },
    { ...env, GITHUB_SHA: "main" }, { ...env, GITHUB_TOKEN: "" }
  ]) await assert.rejects(restoreTranslationCache({ root: f.root, env: values, fetchImpl }), /GITHUB_/);
  await assert.rejects(main(["delete"], { root: f.root, env, fetchImpl }), /Usage:/);
});
