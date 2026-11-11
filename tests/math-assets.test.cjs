"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const { stringify } = require("yaml");

const project = path.resolve(__dirname, "..");
const fontUrls = css => [...new Set([...css.matchAll(/url\(\s*(["']?)([^"'()\s]+)\1\s*\)/g)].map(match => match[2]))];

async function temporary(t) {
  const parent = path.join(project, ".build");
  await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, "math-assets-test-"));
  t.after(async () => {
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith("math-assets-test-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

test("math assets preserve the installed stylesheet, license and every referenced font without browser JavaScript", async t => {
  const { copyMathAssets } = await import("../scripts/math-assets.mjs");
  const root = await temporary(t);
  await copyMathAssets(root);
  const source = path.dirname(require.resolve("katex"));
  const output = path.join(root, "assets/vendor/katex");
  const css = await fs.readFile(path.join(output, "katex.min.css"), "utf8");
  assert.equal(css, await fs.readFile(path.join(source, "katex.min.css"), "utf8"));
  assert.equal(await fs.readFile(path.join(output, "LICENSE"), "utf8"), await fs.readFile(path.join(source, "../LICENSE"), "utf8"));
  const fonts = fontUrls(css);
  assert.ok(fonts.length > 10);
  for (const font of fonts) {
    assert.match(font, /^fonts\/[\w-]+\.(?:woff2?|ttf)$/);
    assert.deepEqual(await fs.readFile(path.join(output, font)), await fs.readFile(path.join(source, font)), font);
  }
  assert.deepEqual((await fs.readdir(output)).sort(), ["LICENSE", "fonts", "katex.min.css"]);
});

test("full builds publish versioned local math styles and fonts in dependency order", async t => {
  const { build } = await import("../scripts/build.mjs");
  const { assetVersion } = await import("../scripts/asset-version.mjs");
  const root = await temporary(t);
  await fs.cp(path.join(project, "site"), path.join(root, "site"), { recursive: true });
  await fs.mkdir(path.join(root, "content/entries"), { recursive: true });
  await fs.writeFile(path.join(root, "content/site.yml"), stringify({
    name: "Math test", greeting: "Hello", role: "Student", interests: [],
    about: { paragraphs: [] }, resume: { sections: [], pdfUrl: "" },
    paths: ["life", "resume", "project"].map(id => ({ id, title: id }))
  }));
  await build(root);
  const html = await fs.readFile(path.join(root, "dist/index.html"), "utf8");
  const vendor = /href="(\.\/assets\/vendor\/katex\/katex\.min\.css\?v=[a-f0-9]{16})"/.exec(html);
  const ownStyle = /href="(\.\/assets\/css\/math\.css\?v=[a-f0-9]{16})"/.exec(html);
  assert.ok(vendor); assert.ok(ownStyle); assert.ok(vendor.index < ownStyle.index);
  assert.doesNotMatch(html, /<script\b[^>]*src=["'][^"']*katex/i);
  const cssFile = path.join(root, "dist/assets/vendor/katex/katex.min.css");
  assert.equal(new URL(vendor[1], "https://example.test/").searchParams.get("v"), await assetVersion(cssFile));
  const css = await fs.readFile(cssFile, "utf8");
  for (const font of fontUrls(css)) {
    assert.match(font, /^fonts\/[\w-]+\.(?:woff2?|ttf)\?v=[a-f0-9]{16}$/);
    const url = new URL(font, "https://example.test/assets/vendor/katex/");
    assert.equal(url.origin, "https://example.test");
    const file = path.join(root, "dist", decodeURIComponent(url.pathname));
    assert.equal(url.searchParams.get("v"), await assetVersion(file));
  }
  assert.match(await fs.readFile(path.join(root, "dist/assets/vendor/katex/LICENSE"), "utf8"), /The MIT License/);
});
