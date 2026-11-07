"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const read = name => fs.readFileSync(path.join(__dirname, "../dist/assets/js", name), "utf8");
const source = read("content-index.js");
const plain = value => JSON.parse(JSON.stringify(value));
function load(...values) {
  const window = {};
  const context = vm.createContext({ window });
  if (values.length) window.LIZPINK_CONTENT = values[0];
  else vm.runInContext(read("content.js"), context);
  vm.runInContext(source, context);
  return { api: window.LIZPINK_CONTENT_INDEX, content: window.LIZPINK_CONTENT };
}

test("bundled examples keep each route's order, shared items and explicit artificial date flags", () => {
  const { api, content } = load();
  assert.equal(Object.isFrozen(api), true);
  for (const route of ["life", "resume", "project"]) {
    const expected = content.paths.find(item => item.id === route).items;
    assert.deepEqual(plain(api.items(route).map(item => item.key)), plain(expected));
    api.items(route).forEach(item => {
      assert.equal(item.route, route);
      assert.equal(item.title, content.samples[item.key].title);
      assert.equal(item.type, content.samples[item.key].type);
      assert.equal(item.example, true);
      assert.equal(item.date.value, content.samples[item.key].publishedAt);
      assert.equal(item.date.label, "发布");
      assert.equal(item.date.example, true);
    });
  }
  assert.equal(api.get("resume", "geometry").route, "resume");
  assert.equal(api.get("project", "geometry").route, "project");
  assert.equal(api.get("life", "geometry"), null);
});

test("combined indexes use first path reference as canonical route", () => {
  const { api } = load();
  const expected = ["journal", "notebook", "profile", "geometry", "question", "animation"];
  for (const route of ["home", "help", "unknown", undefined]) {
    assert.deepEqual(plain(api.items(route).map(item => item.key)), expected);
    assert.equal(api.items(route).find(item => item.key === "geometry").route, "resume");
  }
  for (const route of ["home", "help", "unknown", "research"]) assert.equal(api.get(route, "geometry"), null);
});

test("missing, duplicate, inherited and malformed entries are omitted, including unreferenced samples", () => {
  const samples = Object.assign(Object.create({ inherited: { title: "Not content" } }), {
    a: { title: "A" }, shared: { title: "Shared" }, b: { title: "B" }, c: { title: "C" },
    orphan: { title: "Hidden" }, broken: null, primitive: "invalid"
  });
  const { api } = load({
    paths: [
      { id: "unknown", items: ["orphan"] },
      { id: "life", items: ["a", "a", "missing", "shared", "inherited", "broken", "primitive", null, 4] },
      { id: "resume", items: ["shared", "b"] },
      { id: "project", items: ["c", "shared", ""] },
      { id: "life", items: false }, null
    ], samples
  });
  assert.deepEqual(plain(api.items("life").map(item => item.key)), ["a", "shared"]);
  assert.deepEqual(plain(api.items("home").map(item => item.key)), ["a", "shared", "b", "c"]);
  assert.equal(api.items("home").find(item => item.key === "shared").route, "life");
  assert.equal(api.get("project", "shared").route, "project");
  assert.equal(api.get("life", "orphan"), null);
  assert.equal(api.get("life", "a").date, null);
});

test("canonical route follows data order rather than a fixed route priority", () => {
  const { content } = load();
  content.paths = [content.paths[2], content.paths[0], content.paths[1]];
  const { api } = load(content);
  assert.equal(api.items("home").find(item => item.key === "geometry").route, "project");
  assert.equal(api.get("resume", "geometry").route, "resume");
});

test("excerpt only collapses whitespace and never truncates or replaces the original text", () => {
  const text = " \n 中文\t记录 \r\n <em>原文</em>\u00a0保留标点。 " + "很长的段落。".repeat(200);
  const { api, content } = load({
    paths: [{ id: "project", items: ["long"] }],
    samples: { long: { title: "  原标题  ", text, type: "text", example: false } }
  });
  const item = api.get("project", "long");
  assert.equal(item.excerpt, "中文 记录 <em>原文</em> 保留标点。 " + "很长的段落。".repeat(200));
  assert.equal(item.title, "  原标题  ");
  assert.equal(item.example, false);
  assert.equal(content.samples.long.text, text);
});

test("date formatting validates actual Gregorian calendar days without time conversion", () => {
  const { api } = load();
  for (const value of ["0001-01-01", "1900-02-28", "2000-02-29", "2024-02-29", "2026-11-07", "9999-12-31"]) {
    assert.deepEqual(plain(api.formatDate(value)), { value, text: value.replaceAll("-", ".") });
  }
  for (const value of [
    "0000-01-01", "1900-02-29", "2100-02-29", "2023-02-29", "2026-04-31", "2026-11-31",
    "2026-00-10", "2026-13-10", "2026-01-00", "2026-01-32", "2026-1-01", "26-01-01",
    "2026-01-1", "2026-11-07T00:00:00Z", "2026-11-07+08:00", " 2026-11-07 ",
    "", null, undefined, 20261107, new Date("2026-11-07T00:00:00Z")
  ]) assert.equal(api.formatDate(value), null, String(value));
});

test("valid publication date takes precedence, otherwise valid update date is used", () => {
  const { api } = load({
    paths: [{ id: "life", items: ["published", "updated", "onlyUpdate", "invalid"] }],
    samples: {
      published: { publishedAt: "2024-02-29", updatedAt: "2026-11-07" },
      updated: { publishedAt: "2023-02-29", updatedAt: "2026-11-07" },
      onlyUpdate: { updatedAt: "2026-10-28" },
      invalid: { publishedAt: "2026-04-31", updatedAt: "yesterday" }
    }
  });
  assert.deepEqual(plain(api.get("life", "published").date), { value: "2024-02-29", text: "2024.02.29", label: "发布", example: false });
  assert.deepEqual(plain(api.get("life", "updated").date), { value: "2026-11-07", text: "2026.11.07", label: "更新", example: false });
  assert.equal(api.get("life", "onlyUpdate").date.label, "更新");
  assert.equal(api.get("life", "invalid").date, null);
});

test("hash parsing validates route membership and preserves valid routes for bad keys", () => {
  const { api } = load();
  for (const route of ["home", "life", "resume", "project", "help"]) {
    assert.deepEqual(plain(api.parseHash(`#${route}`)), { route, key: null });
  }
  for (const route of ["resume", "project"]) {
    assert.deepEqual(plain(api.parseHash(`#${route}/geometry`)), { route, key: "geometry" });
  }
  for (const value of ["#life/geometry", "#life/missing", "#life/", "#life/journal/extra"]) {
    assert.deepEqual(plain(api.parseHash(value)), { route: "life", key: null });
  }
  for (const value of ["#research/geometry", "#3/geometry", "#关于", "#PROJECT/geometry", "", "#", null, 3]) {
    assert.deepEqual(plain(api.parseHash(value)), { route: "home", key: null });
  }
  assert.deepEqual(plain(api.parseHash("#help/geometry")), { route: "help", key: null });
});

test("hash round trips Unicode, reserved characters, slash and literal percent exactly once", () => {
  const keys = ["中文 / %?#+🧪", "a/b", "a%2Fb"];
  const { api } = load({
    paths: [{ id: "project", items: keys }],
    samples: Object.fromEntries(keys.map(key => [key, { title: key }]))
  });
  keys.forEach(key => {
    const value = `#project/${encodeURIComponent(key)}`;
    assert.equal(api.hash("project", key), value);
    assert.deepEqual(plain(api.parseHash(value)), { route: "project", key });
  });
  assert.deepEqual(plain(api.parseHash("#%70roject/a%2Fb")), { route: "project", key: "a/b" });
});

test("malformed URI input safely falls back to home", () => {
  const { api } = load();
  for (const value of ["#project/%", "#project/%E0%A4%A", "#%ZZ/geometry", "#project/geometry/%ZZ", "#project/\ud800"]) {
    assert.deepEqual(plain(api.parseHash(value)), { route: "home", key: null });
  }
});

test("hash generation drops invalid or cross-route keys and never accepts legacy routes", () => {
  const { api } = load();
  assert.equal(api.hash("project", "geometry"), "#project/geometry");
  assert.equal(api.hash("resume", "geometry"), "#resume/geometry");
  assert.equal(api.hash("life", "geometry"), "#life");
  assert.equal(api.hash("project", "missing"), "#project");
  assert.equal(api.hash("project", null), "#project");
  assert.equal(api.hash("help", "geometry"), "#help");
  assert.equal(api.hash("research", "geometry"), "#home");
  assert.equal(api.hash(undefined, "geometry"), "#home");
  const key = "\ud800";
  const { api: invalidUnicode } = load({ paths: [{ id: "project", items: [key] }], samples: { [key]: {} } });
  assert.equal(invalidUnicode.hash("project", key), "#project");
});

test("missing or malformed source is safe", () => {
  for (const content of [undefined, null, {}, { paths: false, samples: null }, { paths: [null, 2], samples: {} }]) {
    const { api } = load(content);
    assert.deepEqual(plain(api.items("home")), []);
    assert.equal(api.get("project", "geometry"), null);
    assert.deepEqual(plain(api.parseHash("#project/geometry")), { route: "project", key: null });
  }
});

test("all APIs leave frozen source data intact and returned objects are independent", () => {
  const content = {
    paths: [{ id: "project", items: ["sample"] }],
    samples: { sample: { title: "Original", text: " a\n b ", example: true, publishedAt: "2026-11-07" } }
  };
  const before = JSON.stringify(content);
  const freeze = value => {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  };
  freeze(content);
  const { api } = load(content);
  const item = api.items("project")[0];
  item.title = "Changed";
  item.date.value = "1900-01-01";
  api.parseHash(api.hash("project", "sample"));
  api.get("project", "sample");
  api.formatDate("2024-02-29");
  assert.equal(JSON.stringify(content), before);
  assert.equal(api.items("project")[0].title, "Original");
  assert.equal(api.items("project")[0].date.value, "2026-11-07");
});
