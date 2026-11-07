"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const modulePromise = import(pathToFileURL(path.join(__dirname, "../scripts/asset-version.mjs")).href);

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "asset-version-test-"));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("asset-version-test-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

test("text asset versions are stable across Windows and CI line endings", async t => {
  const { assetVersion } = await modulePromise;
  const root = await temporary(t);
  const lf = "第一行\nsecond line\n";
  const expected = createHash("sha256").update(lf).digest("hex").slice(0, 16);
  for (const extension of ["JS", "mjs", "cjs", "css", "html", "htm", "svg", "vtt", "json", "txt"]) {
    const file = path.join(root, `source.${extension}`);
    await fs.writeFile(file, lf.replace(/\n/g, "\r\n"));
    assert.equal(await assetVersion(file), expected, `${extension}: CRLF`);
    await fs.writeFile(file, lf);
    assert.equal(await assetVersion(file), expected, `${extension}: LF`);
    await fs.writeFile(file, `${lf}changed`);
    assert.notEqual(await assetVersion(file), expected, `${extension}: changed content`);
  }
});

test("binary media and PDF versions use every original byte", async t => {
  const { assetVersion } = await modulePromise;
  const root = await temporary(t);
  const bytes = Buffer.from([0, 255, 13, 10, 128, 10]);
  const expected = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  for (const extension of ["MP4", "png", "pdf"]) {
    const file = path.join(root, `binary.${extension}`);
    await fs.writeFile(file, bytes);
    assert.equal(await assetVersion(file), expected);
    await fs.writeFile(file, Buffer.from([0, 255, 10, 128, 10]));
    assert.notEqual(await assetVersion(file), expected);
  }
  await assert.rejects(assetVersion(path.join(root, "missing.js")), { code: "ENOENT" });
});

test("versioned URLs preserve relative paths, query encoding, flags and fragments", async () => {
  const { withAssetVersion } = await modulePromise;
  for (const [input, expected] of [
    ["./assets/a%20b.svg", "./assets/a%20b.svg?v=abc123"],
    ["../file.pdf#page=2", "../file.pdf?v=abc123#page=2"],
    ["file.js?", "file.js?v=abc123"],
    ["/file.pdf?download=one%20two&flag&x=%2f#part?x=1", "/file.pdf?download=one%20two&flag&x=%2f&v=abc123#part?x=1"],
    ["./file.js?x=1&v=old&flag#section", "./file.js?x=1&v=abc123&flag#section"],
    ["./file.js?v=old&v=duplicate&x=1", "./file.js?v=abc123&x=1"],
    ["./file.js?%76=old&value=v%3Dold", "./file.js?v=abc123&value=v%3Dold"],
    ["./file.js?bad%=kept#v=old", "./file.js?bad%=kept&v=abc123#v=old"],
    ["./中文 空格.pdf?token=a+b#page=2", "./中文 空格.pdf?token=a+b&v=abc123#page=2"]
  ]) assert.equal(withAssetVersion(input, "abc123"), expected);
  assert.equal(withAssetVersion("file.js?x=1", "a +/#"), "file.js?x=1&v=a%20%2B%2F%23");
});
