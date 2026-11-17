"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../site/assets/js/i18n.js"), "utf8");

function harness({ url = "https://example.test/?theme=light#project/article", saved = null, browser = "zh-CN", storageError = false, english = true } = {}) {
  const events = new Map();
  const documentEvents = new Map();
  const dispatched = [];
  const queried = [];
  const writes = [];
  const location = new URL(url);
  const node = text => ({ textContent: text, dataset: {}, attributes: {},
    setAttribute(key, value) { this.attributes[key] = String(value); },
    getAttribute(key) { return this.attributes[key] ?? null; } });
  const toggle = node("EN");
  const skip = node("跳到正文");
  const light = node("");
  light.attributes["aria-label"] = "浅色模式";
  light.attributes.title = "浅色模式";
  const article = node("这是文章，不应由界面字典修改。");
  const chinese = { name: "LizPink", greeting: "你好", samples: { article: { body: article.textContent } } };
  const en = { name: "LizPink", greeting: "Hello", samples: { article: { body: "This is an article." } }, uiMessages: { "就绪": "All set" } };
  const window = {
    LIZPINK_CONTENT: chinese,
    LIZPINK_LOCALES: { "zh-CN": chinese, ...(english ? { en } : {}) },
    location, navigator: { language: browser },
    localStorage: { getItem() { if (storageError) throw Error("blocked"); return saved; }, setItem(key, value) { if (storageError) throw Error("blocked"); writes.push([key, value]); } },
    history: { state: { retained: true }, replaceState(state, title, target) { location.href = String(target); } },
    addEventListener(name, callback) { events.set(name, [...events.get(name) || [], callback]); },
    dispatchEvent(event) { dispatched.push(event); for (const callback of events.get(event.type) || []) callback(event); }
  };
  const document = {
    documentElement: { dataset: {} },
    querySelector(selector) { return selector === "#language-toggle" ? toggle : null; },
    querySelectorAll(selector) {
      queried.push(selector);
      if (selector === ".skip-link") return [skip];
      if (selector === "[data-theme-option]") return [light];
      return [];
    },
    addEventListener(name, callback) { documentEvents.set(name, callback); }
  };
  class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  vm.runInNewContext(source, { window, document, URL, URLSearchParams, CustomEvent });
  return { api: window.LIZPINK_I18N, window, document, dispatched, queried, writes, location, toggle, skip, light, article,
    clickToggle() { documentEvents.get("click")({ target: { closest: () => toggle } }); } };
}

test("explicit language wins over saved and browser preferences without overwriting them", () => {
  const h = harness({ url: "https://example.test/?lang=zh&theme=light#project/article", saved: "en", browser: "en-US" });
  assert.equal(h.api.current(), "zh-CN");
  assert.equal(h.window.LIZPINK_CONTENT.greeting, "你好");
  assert.equal(h.document.documentElement.lang, "zh-CN");
  assert.equal(h.skip.textContent, "跳到正文");
  assert.equal(h.writes.length, 0);
});

test("saved language and browser language are normalized, with a safe Chinese default", () => {
  assert.equal(harness({ saved: "en", browser: "zh-CN" }).api.current(), "en");
  assert.equal(harness({ browser: "en-GB" }).api.current(), "en");
  assert.equal(harness({ browser: "fr", saved: "invalid" }).api.current(), "zh-CN");
  assert.equal(harness({ browser: "en", english: false }).api.current(), "zh-CN");
});

test("switching preserves the article, theme and other URL parameters while persisting only the language", () => {
  const h = harness({ url: "https://example.test/?theme=light&source=resume#project/article" });
  assert.equal(h.api.setLanguage("en"), true);
  assert.equal(h.location.hash, "#project/article");
  assert.equal(h.location.searchParams.get("theme"), "light");
  assert.equal(h.location.searchParams.get("source"), "resume");
  assert.equal(h.location.searchParams.get("lang"), "en");
  assert.deepEqual(h.writes, [["lizpink-language", "en"]]);
  assert.equal(h.window.LIZPINK_CONTENT.greeting, "Hello");
  assert.equal(h.dispatched.length, 1);
  assert.equal(h.dispatched[0].type, "lizpink:languagechange");
  assert.equal(h.dispatched[0].detail.previousLanguage, "zh-CN");
  assert.equal(h.dispatched[0].detail.language, "en");
});

test("static text and accessibility labels switch in both directions without visiting article content", () => {
  const h = harness();
  h.clickToggle();
  assert.equal(h.skip.textContent, "Skip to content");
  assert.equal(h.light.attributes["aria-label"], "Light mode");
  assert.equal(h.toggle.textContent, "中文");
  assert.equal(h.api.t("就绪"), "All set");
  assert.equal(h.api.t("已打开：{title}", { title: "Glass" }), "Opened: Glass");
  assert.equal(h.article.textContent, "这是文章，不应由界面字典修改。");
  assert.equal(h.queried.some(selector => selector.includes("article")), false);
  h.clickToggle();
  assert.equal(h.skip.textContent, "跳到正文");
  assert.equal(h.light.attributes["aria-label"], "浅色模式");
  assert.equal(h.toggle.textContent, "EN");
});

test("optional preference storage and invalid language choices do not break switching", () => {
  const h = harness({ storageError: true });
  assert.equal(h.api.setLanguage("de"), false);
  assert.equal(h.api.setLanguage("en"), true);
  assert.equal(h.api.t("unknown {value}", { value: "text" }), "unknown text");
  assert.equal(h.api.setLanguage("en"), true);
  assert.equal(h.dispatched.length, 1);
});
