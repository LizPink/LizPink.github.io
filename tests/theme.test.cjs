"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../site/assets/js/theme.js"), "utf8");
const preferenceKey = "lizpink-theme";

function harness({ saved = null, url = "https://example.test/#project", ready = true,
  readError = false, writeError = false, historyError = false, prefersLight = false } = {}) {
  const listeners = new Map();
  const writes = [];
  const historyCalls = [];
  let controlsReady = ready;
  let stored = saved;
  const location = new URL(url);
  const buttons = ["light", "dark"].map(theme => ({
    dataset: { themeOption: theme },
    attributes: { "aria-pressed": String(theme === "dark"), "aria-label": `${theme === "dark" ? "深色" : "浅色"}模式` },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; }
  }));
  const meta = {
    attributes: { content: "#080a08" },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; }
  };
  const document = {
    documentElement: { dataset: { theme: "dark" } },
    readyState: ready ? "complete" : "loading",
    querySelector(selector) {
      if (selector === 'meta[name="theme-color"]' || selector === "meta[name='theme-color']") return meta;
      return null;
    },
    querySelectorAll(selector) { return controlsReady && selector.includes("data-theme-option") ? buttons : []; },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    }
  };
  const localStorage = {
    getItem(key) {
      assert.equal(key, preferenceKey);
      if (readError) throw new Error("Storage unavailable");
      return stored;
    },
    setItem(key, value) {
      if (writeError) throw new Error("Storage full");
      writes.push([key, value]);
      stored = value;
    }
  };
  const history = {
    state: { from: "project" },
    replaceState(state, title, target) {
      if (historyError) throw new Error("History unavailable");
      const next = new URL(String(target), location);
      historyCalls.push({ state, title, url: next });
      location.href = next.href;
    }
  };
  const matchMedia = query => ({ matches: query === "(prefers-color-scheme: light)" ? prefersLight : !prefersLight });
  const window = { location, localStorage, history, matchMedia };
  vm.runInNewContext(source, { window, document, localStorage, location, history, URL, URLSearchParams, matchMedia });
  return {
    api: window.LIZPINK_THEME, document, buttons, meta, writes, historyCalls, location,
    stored: () => stored,
    mountControls() {
      controlsReady = true;
      document.readyState = "interactive";
      for (const listener of listeners.get("DOMContentLoaded") || []) listener();
    }
  };
}

function assertTheme(h, theme, { controls = true } = {}) {
  assert.equal(h.api.current(), theme);
  assert.equal(h.document.documentElement.dataset.theme, theme);
  assert.equal(h.meta.getAttribute("content"), theme === "dark" ? "#080a08" : "#f7f6f2");
  if (controls) {
    for (const button of h.buttons) {
      assert.equal(button.getAttribute("aria-pressed"), String(button.dataset.themeOption === theme));
    }
  }
}

test("first visit defaults to dark even when the operating system prefers light", () => {
  for (const prefersLight of [false, true]) {
    const h = harness({ prefersLight });
    assertTheme(h, "dark");
    assert.deepEqual(Object.entries(h.api.names), [["dark", "深色模式"], ["light", "浅色模式"]]);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.historyCalls, []);
  }
});

test("explicit valid URL mode wins over saved preference without changing that preference", () => {
  for (const [theme, saved] of [["light", "dark"], ["dark", "light"]]) {
    const h = harness({ saved, url: `https://example.test/?theme=${theme}#project` });
    assertTheme(h, theme);
    assert.equal(h.stored(), saved);
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.historyCalls, []);
  }
});

test("saved light preference is restored when the URL has no valid override", () => {
  for (const query of ["", "?theme=missing", "?theme="]) {
    const h = harness({ saved: "light", url: `https://example.test/${query}#life` });
    assertTheme(h, "light");
    assert.deepEqual(h.writes, []);
    assert.deepEqual(h.historyCalls, []);
  }
});

test("retired amber and green preferences and links resolve to dark without passive writes", () => {
  for (const legacy of ["amber", "green"]) {
    const saved = harness({ saved: legacy });
    assertTheme(saved, "dark");
    assert.equal(saved.stored(), legacy);
    assert.deepEqual(saved.writes, []);
    const linked = harness({ saved: "light", url: `https://example.test/?theme=${legacy}#project` });
    assertTheme(linked, "dark");
    assert.equal(linked.stored(), "light");
    assert.equal(linked.location.searchParams.get("theme"), legacy);
    assert.deepEqual(linked.historyCalls, []);
  }
});

test("unrecognized or prototype-named theme values fall back safely", () => {
  for (const saved of [null, "", "missing", "constructor", "__proto__", "toString"]) {
    const h = harness({ saved, url: "https://example.test/?theme=constructor#home" });
    assertTheme(h, "dark");
    assert.deepEqual(h.writes, []);
  }
});

test("head script applies the saved mode before markup and synchronizes buttons when the DOM mounts", () => {
  const h = harness({ saved: "light", ready: false });
  assertTheme(h, "light", { controls: false });
  assert.equal(h.buttons.find(button => button.dataset.themeOption === "dark").getAttribute("aria-pressed"), "true");
  h.mountControls();
  assertTheme(h, "light");
  assert.deepEqual(h.writes, []);
});

test("programmatic apply changes mode and all button states without remembering by default", () => {
  const h = harness({ url: "https://example.test/?theme=dark#project" });
  assert.equal(h.api.apply("light"), true);
  assertTheme(h, "light");
  assert.equal(h.api.apply("dark"), true);
  assertTheme(h, "dark");
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.historyCalls, []);
  assert.equal(h.location.searchParams.get("theme"), "dark");
});

test("remembered selection saves the canonical mode and updates an existing URL without losing route or other parameters", () => {
  const h = harness({ saved: "green", url: "https://example.test/?theme=green&view=reader&label=one%20two#project/geometry" });
  assert.equal(h.api.apply("light", { remember: true }), true);
  assertTheme(h, "light");
  assert.deepEqual(h.writes, [[preferenceKey, "light"]]);
  assert.equal(h.location.searchParams.get("theme"), "light");
  assert.equal(h.location.searchParams.get("view"), "reader");
  assert.equal(h.location.searchParams.get("label"), "one two");
  assert.equal(h.location.hash, "#project/geometry");
  assert.deepEqual(h.historyCalls[0].state, { from: "project" });
  assert.equal(h.api.apply("dark", { remember: true }), true);
  assertTheme(h, "dark");
  assert.equal(h.stored(), "dark");
  assert.equal(h.location.searchParams.get("theme"), "dark");
});

test("remembering a selection does not add a theme parameter to an ordinary link", () => {
  const h = harness({ url: "https://example.test/?view=reader#resume" });
  assert.equal(h.api.apply("light", { remember: true }), true);
  assertTheme(h, "light");
  assert.deepEqual(h.writes, [[preferenceKey, "light"]]);
  assert.equal(h.location.href, "https://example.test/?view=reader#resume");
  assert.deepEqual(h.historyCalls, []);
});

test("invalid explicit modes leave the active mode, controls, storage and URL unchanged", () => {
  const h = harness({ saved: "light", url: "https://example.test/?theme=light#project" });
  for (const value of ["green", "amber", "constructor", "__proto__", "", null, undefined]) {
    assert.equal(h.api.apply(value, { remember: true }), false);
    assertTheme(h, "light");
  }
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.historyCalls, []);
  assert.equal(h.location.href, "https://example.test/?theme=light#project");
});

test("blocked storage does not prevent initial mode or later explicit selection", () => {
  const h = harness({ readError: true, writeError: true, url: "https://example.test/?theme=dark&view=reader#life" });
  assertTheme(h, "dark");
  assert.equal(h.api.apply("light", { remember: true }), true);
  assertTheme(h, "light");
  assert.equal(h.location.searchParams.get("theme"), "light");
  assert.equal(h.location.hash, "#life");
  assert.deepEqual(h.writes, []);
  const defaults = harness({ readError: true, prefersLight: true });
  assertTheme(defaults, "dark");
});

test("restricted URL history does not prevent switching or saving a preference", () => {
  const h = harness({ historyError: true, url: "file:///preview/index.html?theme=dark#project" });
  assert.equal(h.api.apply("light", { remember: true }), true);
  assertTheme(h, "light");
  assert.deepEqual(h.writes, [[preferenceKey, "light"]]);
  assert.deepEqual(h.historyCalls, []);
});
