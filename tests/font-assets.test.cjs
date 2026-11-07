"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

test("self-hosted Noto Sans SC subsets are complete, valid WOFF2 assets and cover Chinese interface copy", async () => {
  const directory = path.resolve(__dirname, "../site/assets/fonts");
  const css = await fs.readFile(path.join(directory, "noto-sans-sc.css"), "utf8");
  const faces = [...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map(match => match[1]);
  assert.ok(faces.length > 1, "Chinese fonts should retain on-demand Unicode subsets");
  const urls = new Set();
  const ranges = [];
  for (const face of faces) {
    const url = /src:\s*url\(([^)]+)\)\s*format\('woff2'\)/.exec(face)?.[1];
    assert.ok(url?.startsWith("./noto-sans-sc/") && url.endsWith(".woff2"), "No remote or system-installed font dependency");
    const file = path.resolve(directory, url);
    assert.equal(path.dirname(file), path.join(directory, "noto-sans-sc"));
    assert.ok(!urls.has(url), "A subset should only be declared once");
    urls.add(url);
    const bytes = await fs.readFile(file);
    assert.equal(bytes.toString("ascii", 0, 4), "wOF2");
    assert.equal(bytes.readUInt32BE(8), bytes.length, "Downloaded WOFF2 header length must match the complete asset");
    assert.ok(bytes.readUInt16BE(12) > 0);
    assert.match(face, /font-weight:\s*400 700\s*;/);
    assert.match(face, /font-display:\s*swap\s*;/);
    const unicode = /unicode-range:\s*([^;]+);/.exec(face)?.[1];
    assert.ok(unicode);
    ranges.push(...unicode.split(",").map(range => {
      const match = /^\s*U\+([\da-f]+)(?:-([\da-f]+))?\s*$/i.exec(range);
      assert.ok(match);
      return [parseInt(match[1], 16), parseInt(match[2] || match[1], 16)];
    }));
  }
  const files = await fs.readdir(path.join(directory, "noto-sans-sc"));
  assert.equal(files.filter(file => file.endsWith(".woff2")).length, urls.size);
  for (const character of "你好我是浅色深色模式内容目录输入命令查询帮助执行补全历史返回阅读离开") {
    const point = character.codePointAt(0);
    assert.ok(ranges.some(([start, end]) => point >= start && point <= end), `Missing interface glyph: ${character}`);
  }
  assert.match(await fs.readFile(path.join(directory, "NotoSansSC-OFL.txt"), "utf8"), /SIL OPEN FONT LICENSE/);
});
