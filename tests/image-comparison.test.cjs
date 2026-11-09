const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../site/assets/js/image-comparison.js"), "utf8");

class Element {
  constructor() {
    this.children = []; this.attributes = new Map(); this.listeners = new Map(); this.dataset = {};
    this.classes = new Set(); this.classList = { add: value => this.classes.add(value), remove: value => this.classes.delete(value) };
    this.properties = new Map(); this.style = { setProperty: (name, value) => this.properties.set(name, value) };
    this.hidden = false;
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
  append(child) { child.parent = this; this.children.push(child); }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  addEventListener(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
  }
  dispatchEvent(event) { (this.listeners.get(event.type) || []).forEach(fn => fn(event)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    if (selector.includes("data-comparison-status") || selector.includes("data-comparison-originals")) {
      return this.children.filter(child => selector.includes("data-comparison-status") && child.attributes.has("data-comparison-status") ||
        selector.includes("data-comparison-originals") && child.attributes.has("data-comparison-originals"));
    }
    return [];
  }
}

function harness() {
  const frames = [];
  const document = { readyState: "complete", querySelectorAll: () => frames, createElement: () => new Element() };
  const window = { customElements: { get: () => true } };
  class CustomEvent { constructor(type, options) { this.type = type; Object.assign(this, options); } }
  vm.runInNewContext(source, { document, window, CustomEvent, Event });
  return {
    api: window.LIZPINK_IMAGE_COMPARISON,
    picture({ width = 1641, height = 1015, pendingSecond = false } = {}) {
      const frame = new Element(), slider = new Element(), figure = new Element(), expand = new Element(), labels = new Element();
      const first = new Element(), second = new Element();
      Object.assign(first, { complete: true, naturalWidth: width, naturalHeight: height, src: "./before.png?v=one" });
      Object.assign(second, { complete: !pendingSecond, naturalWidth: pendingSecond ? 0 : 1650, naturalHeight: pendingSecond ? 0 : 1042, src: "./after.png?v=two" });
      slider.value = 50;
      slider.querySelector = selector => selector.includes('"first"') ? first : second;
      const originalQuery = frame.querySelector.bind(frame);
      frame.querySelector = selector => selector === "img-comparison-slider" ? slider : selector === ".comparison-labels" ? labels : originalQuery(selector);
      frame.matches = selector => selector === "[data-image-comparison]";
      frame.closest = () => figure;
      figure.querySelector = () => expand;
      frames.push(frame);
      return { frame, slider, figure, expand, labels, first, second,
        get status() { return originalQuery("[data-comparison-status]"); } };
    }
  };
}

test("different image dimensions use the first image's shared canvas and retain both originals", () => {
  const h = harness(), p = h.picture();
  h.api.init();
  assert.equal(p.frame.dataset.comparisonState, "ready");
  assert.equal(p.frame.properties.get("--comparison-ratio"), String(1641 / 1015));
  assert.equal(p.figure.properties.get("--asset-width"), "1641px");
  assert.equal(p.second.naturalWidth, 1650);
  assert.equal(p.second.naturalHeight, 1042);
  assert.equal(p.slider.getAttribute("aria-disabled"), "false");
  assert.equal(p.expand.disabled, false);
});

test("both images must finish loading before comparison, and repeated init is inert", () => {
  const h = harness(), p = h.picture({ pendingSecond: true });
  h.api.init(p.frame); h.api.init(p.frame);
  assert.equal(p.frame.dataset.comparisonState, "loading");
  assert.equal(p.slider.keyboard, "disabled");
  assert.equal(p.expand.disabled, true);
  assert.equal(p.second.listeners.get("load").size, 1);
  Object.assign(p.second, { complete: true, naturalWidth: 1650, naturalHeight: 1042 });
  p.second.dispatchEvent({ type: "load" });
  assert.equal(p.frame.dataset.comparisonState, "ready");
  assert.equal(p.status.hidden, true);
});

test("one broken image cannot masquerade as a successful comparison", () => {
  const h = harness(), p = h.picture({ pendingSecond: true });
  h.api.init();
  p.second.complete = true;
  p.second.dispatchEvent({ type: "error" });
  assert.equal(p.frame.dataset.comparisonState, "error");
  assert.equal(p.slider.hidden, true);
  assert.equal(p.expand.disabled, true);
  assert.match(p.status.textContent, /第二张图片暂时无法加载/);
  const originals = p.frame.querySelector("[data-comparison-originals]");
  assert.deepEqual(originals.children.map(link => link.href), ["./before.png?v=one", "./after.png?v=two"]);
});

test("a clone with stale ready markup receives its own loading lifecycle", () => {
  const h = harness(), p = h.picture({ pendingSecond: true });
  p.frame.dataset.comparisonState = "ready"; p.frame.classList.add("comparison-ready");
  const stale = new Element(); stale.setAttribute("data-comparison-status", ""); p.frame.append(stale);
  h.api.init(p.frame);
  assert.equal(p.frame.dataset.comparisonState, "loading");
  assert.equal(p.frame.classes.has("comparison-ready"), false);
  assert.equal(p.frame.querySelectorAll("[data-comparison-status]").length, 1);
  assert.notEqual(p.status, stale);
});

test("Home and End expose complete images and update the accessible value without scrolling", () => {
  const h = harness(), p = h.picture(); h.api.init();
  for (const [key, value] of [["Home", 0], ["End", 100]]) {
    const event = { type: "keydown", key, prevented: false, stopped: false,
      preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
    p.slider.dispatchEvent(event);
    assert.equal(event.prevented, true); assert.equal(event.stopped, true);
    assert.equal(p.slider.value, value);
    assert.equal(p.slider.getAttribute("aria-valuenow"), String(value));
  }
});

test("a cancelled vertical gesture ends the component's touch session before the next drag", () => {
  const h = harness(), p = h.picture(); h.api.init();
  let ended = 0;
  p.slider.addEventListener("touchend", () => { ended += 1; });
  p.slider.dispatchEvent({ type: "touchcancel" });
  assert.equal(ended, 1);
});
