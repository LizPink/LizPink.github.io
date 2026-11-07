"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const read = name => fs.readFileSync(path.join(__dirname, "../dist/assets/js", name), "utf8");
const source = fs.readFileSync(path.join(__dirname, "../site/assets/js/content-index.js"), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
function load(...values) {
  const window = {};
  const context = vm.createContext({ window });
  if (values.length) window.LIZPINK_CONTENT = values[0];
  else vm.runInContext(read("content.js"), context);
  vm.runInContext(source, context);
  return { api: window.LIZPINK_CONTENT_INDEX, content: window.LIZPINK_CONTENT };
}

test("generated articles sort by displayed date and keep shared membership", () => {
  const { api, content } = load();
  assert.equal(Object.isFrozen(api), true);
  const expected = { life: ["notebook", "journal"], resume: ["geometry", "profile"], project: ["geometry", "animation", "question"] };
  for (const route of ["life", "resume", "project"]) {
    const routeTitle = content.paths.find(item => item.id === route).title;
    assert.deepEqual(plain(api.items(route).map(item => item.key)), expected[route]);
    api.items(route).forEach(item => {
      assert.equal(item.route, route);
      assert.equal(item.routeTitle, routeTitle);
      assert.equal(item.title, content.samples[item.key].title);
      assert.equal(item.type, content.samples[item.key].type);
      assert.equal(item.date.value, content.samples[item.key].updatedAt || content.samples[item.key].publishedAt);
      assert.equal(item.date.label, content.samples[item.key].updatedAt ? "更新" : "日期");
    });
  }
  assert.equal(api.get("resume", "geometry").route, "resume");
  assert.equal(api.get("project", "geometry").route, "project");
  assert.equal(api.get("life", "geometry"), null);
});

test("combined indexes use first path reference as canonical route", () => {
  const { api } = load();
  const expected = ["geometry", "animation", "notebook", "question", "journal", "profile"];
  for (const route of ["home", "help", "unknown", undefined]) {
    assert.deepEqual(plain(api.items(route).map(item => item.key)), expected);
    assert.equal(api.items(route).find(item => item.key === "geometry").route, "resume");
    assert.equal(api.items(route).find(item => item.key === "geometry").routeTitle, "经历");
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
    samples: { long: { title: "  原标题  ", text, type: "text" } }
  });
  const item = api.get("project", "long");
  assert.equal(item.excerpt, "中文 记录 <em>原文</em> 保留标点。 " + "很长的段落。".repeat(200));
  assert.equal(item.title, "  原标题  ");
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

test("valid update date takes precedence, otherwise a valid publication date is used", () => {
  const { api } = load({
    paths: [{ id: "life", items: ["published", "updated", "onlyUpdate", "invalidUpdate", "olderUpdate", "invalid", "missing"] }],
    samples: {
      published: { publishedAt: "2024-02-29", updatedAt: "2026-11-07" },
      updated: { publishedAt: "2023-02-29", updatedAt: "2026-11-07" },
      onlyUpdate: { updatedAt: "2026-10-28" },
      invalidUpdate: { publishedAt: "2024-02-29", updatedAt: "2026-02-29" },
      olderUpdate: { publishedAt: "2029-01-01", updatedAt: "2025-01-01" },
      invalid: { publishedAt: "2026-04-31", updatedAt: "yesterday" },
      missing: {}
    }
  });
  assert.deepEqual(plain(api.get("life", "published").date), { value: "2026-11-07", text: "2026.11.07", label: "更新" });
  assert.deepEqual(plain(api.get("life", "updated").date), { value: "2026-11-07", text: "2026.11.07", label: "更新" });
  assert.equal(api.get("life", "onlyUpdate").date.label, "更新");
  assert.deepEqual(plain(api.get("life", "invalidUpdate").date), { value: "2024-02-29", text: "2024.02.29", label: "日期" });
  assert.equal(api.get("life", "olderUpdate").date.value, "2025-01-01");
  assert.equal(api.get("life", "invalid").date, null);
  assert.equal(api.get("life", "missing").date, null);
});

test("chronological order crosses year boundaries and brings recently updated older articles first", () => {
  const { api } = load({
    paths: [{ id: "life", items: ["yearEnd", "missing", "publication", "invalid", "newYear", "fallback", "oldYear"] }],
    samples: {
      yearEnd: { publishedAt: "2026-12-31" },
      missing: {},
      publication: { publishedAt: "2025-01-01", updatedAt: "2029-01-01" },
      invalid: { publishedAt: "2027-02-29", updatedAt: "not a date" },
      newYear: { publishedAt: "2027-01-01" },
      fallback: { publishedAt: "2026-02-30", updatedAt: "2026-12-30" },
      oldYear: { publishedAt: "2025-12-31" }
    }
  });
  assert.deepEqual(plain(api.items("life").map(item => item.key)), ["publication", "newYear", "yearEnd", "fallback", "oldYear", "missing", "invalid"]);
  assert.equal(api.get("life", "fallback").date.label, "更新");
  assert.deepEqual(plain(api.get("life", "publication").date), { value: "2029-01-01", text: "2029.01.01", label: "更新" });
});

test("equal dates and undated entries remain stable after sorting and canonical ownership is chosen before sorting", () => {
  const { api } = load({
    paths: [
      { id: "life", title: "日常", items: ["firstUndated", "firstTie", "shared", "secondTie", "invalidUndated"] },
      { id: "resume", title: "履历", items: ["shared", "thirdTie", "lastUndated", "newest"] }
    ],
    samples: {
      firstUndated: {}, firstTie: { publishedAt: "2026-10-05" },
      shared: { publishedAt: "2026-10-05" }, secondTie: { publishedAt: "2026-10-05" },
      invalidUndated: { publishedAt: "2026-11-31" }, thirdTie: { updatedAt: "2026-10-05" },
      lastUndated: {}, newest: { publishedAt: "2026-11-01" }
    }
  });
  for (const route of ["home", "help"]) {
    const entries = api.items(route);
    assert.deepEqual(plain(entries.map(item => item.key)), ["newest", "firstTie", "shared", "secondTie", "thirdTie", "firstUndated", "invalidUndated", "lastUndated"]);
    assert.equal(entries.filter(item => item.key === "shared").length, 1);
    assert.equal(entries.find(item => item.key === "shared").route, "life");
    assert.equal(entries.find(item => item.key === "shared").routeTitle, "日常");
  }
  assert.equal(api.get("resume", "shared").routeTitle, "履历");
  assert.deepEqual(plain(api.items("life").map(item => item.key)), ["firstTie", "shared", "secondTie", "firstUndated", "invalidUndated"]);
});

test("route titles come from each owning path and fall back to short names only when missing or unusable", () => {
  const { api } = load({
    paths: [
      { id: "life", title: " 自定义生活 ", items: ["custom"] },
      { id: "life", items: ["defaultLife"] },
      { id: "resume", title: "   ", items: ["defaultResume"] },
      { id: "project", title: 123, items: ["defaultProject"] }
    ],
    samples: { custom: {}, defaultLife: {}, defaultResume: {}, defaultProject: {} }
  });
  assert.deepEqual(plain(api.items("home").map(({ key, routeTitle }) => [key, routeTitle])), [
    ["custom", " 自定义生活 "], ["defaultLife", "生活"], ["defaultResume", "经历"], ["defaultProject", "项目"]
  ]);
});

test("sorting frozen multi-route data leaves path order, key arrays and metadata untouched", () => {
  const content = {
    paths: [
      { id: "life", title: "生活", items: ["old", "shared", "undated"] },
      { id: "project", title: "项目", items: ["shared", "new"] }
    ],
    samples: {
      old: { title: "Old", publishedAt: "2024-12-31", updatedAt: "2027-01-01" },
      shared: { title: "Shared", publishedAt: "2025-01-01" },
      undated: { title: "Undated" }, new: { title: "New", publishedAt: "2026-01-01" }
    }
  };
  const before = JSON.stringify(content);
  const freeze = value => {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  };
  freeze(content);
  const { api } = load(content);
  assert.deepEqual(plain(api.items("home").map(item => item.key)), ["old", "new", "shared", "undated"]);
  assert.deepEqual(plain(api.items("life").map(item => item.key)), ["old", "shared", "undated"]);
  assert.deepEqual(plain(api.items("project").map(item => item.key)), ["new", "shared"]);
  const output = api.items("home"); output.reverse(); output[0].routeTitle = "Changed";
  assert.equal(api.get("project", "shared").routeTitle, "项目");
  assert.equal(api.items("home").find(item => item.key === "shared").routeTitle, "生活");
  assert.equal(JSON.stringify(content), before);
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
    samples: { sample: { title: "Original", text: " a\n b ", publishedAt: "2026-11-07" } }
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
