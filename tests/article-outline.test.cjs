"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../site/assets/js/article-outline.js"), "utf8");

class Signals {
  listeners = new Map();
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, values = {}) {
    const event = { type, prevented: false, preventDefault() { this.prevented = true; }, ...values };
    [...(this.listeners.get(type) || [])].forEach(listener => listener(event)); return event;
  }
  count(type) { return this.listeners.get(type)?.size || 0; }
}

function harness({ width = 1200, rootWidth = width, height = 400, scrollHeight = 900, detached = false } = {}) {
  let document, scrollRoot;
  class Node extends Signals {
    constructor(tag, className = "", id = "") {
      super(); Object.assign(this, { tagName: tag.toUpperCase(), className, id, children: [], parentElement: null,
        attributes: {}, dataset: {}, text: "", open: false, hidden: false, clientWidth: width, clientHeight: height,
        scrollHeight, scrollTop: 0, offsetHeight: 0, absoluteTop: 0 });
      this.style = { setProperty(key, value) { this[key] = value; } };
    }
    append(...nodes) { nodes.forEach(node => { node.parentElement = this; this.children.push(node); }); }
    insertBefore(node, before) {
      const index = this.children.indexOf(before); assert.notEqual(index, -1);
      node.parentElement = this; this.children.splice(index, 0, node);
    }
    remove() {
      if (!this.parentElement) return;
      this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null;
    }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    descendants() { return this.children.flatMap(node => [node, ...node.descendants()]); }
    querySelectorAll(selector) {
      return this.descendants().filter(node => selector === "[id]" ? Boolean(node.id)
        : selector.startsWith(".") ? node.className.split(/\s+/).includes(selector.slice(1)) : false);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) {
      for (let node = this; node; node = node.parentElement) {
        if (selector === "[data-outline-target]" ? node.dataset.outlineTarget !== undefined
          : node.className.split(/\s+/).includes(selector.slice(1))) return node;
      }
      return null;
    }
    get isConnected() { return document?.body.contains(this) || false; }
    set textContent(value) { this.text = String(value); this.children = []; }
    get textContent() { return this.text + this.children.map(node => node.textContent).join(""); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    hasAttribute(name) { return this.attributes[name] !== undefined; }
    removeAttribute(name) { delete this.attributes[name]; }
    getClientRects() { return this.isConnected && !this.hidden ? [{}] : []; }
    getBoundingClientRect() {
      return { top: this.absoluteTop - (scrollRoot?.contains(this) && this !== scrollRoot ? scrollRoot.scrollTop : 0), width: this.clientWidth };
    }
    focus(options) { document.activeElement = this; this.lastFocusOptions = options; }
  }
  const bodyRoot = new Node("body");
  const fontReady = [];
  document = { body: bodyRoot, activeElement: bodyRoot, createElement: tag => new Node(tag), fonts: { ready: { then(callback) { fontReady.push(callback); } } } };
  const container = new Node("div", "frame-main");
  scrollRoot = new Node("main"); scrollRoot.clientWidth = rootWidth;
  const composer = new Node("section", "command-area"); composer.offsetHeight = 68;
  container.append(scrollRoot, composer); bodyRoot.append(container);
  const layout = new Node("section", "article-layout");
  const body = new Node("div", "article-body");
  layout.append(body); if (!detached) scrollRoot.append(layout);
  const targets = [new Node("h3", "", "first"), new Node("h4", "", "second"), new Node("h3", "", "last")];
  [80, 300, 650].forEach((top, index) => { targets[index].absoluteTop = top; body.append(targets[index]); });
  const headings = [{ id: "first", text: "第一节", level: 2 }, { id: "second", text: "子节", level: 3 }, { id: "last", text: "最后一节", level: 2 }];
  const frames = new Map(); let nextFrame = 0;
  const window = Object.assign(new Signals(), {
    location: { hash: "#project/example" },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    scrollTo() { throw new Error("Outline navigation must not scroll the window"); }
  });
  const observers = [];
  const context = vm.createContext({ document, window, ResizeObserver: class {
    constructor(callback) { Object.assign(this, { callback, nodes: new Set(), disconnected: false }); observers.push(this); }
    observe(node) { this.nodes.add(node); }
    disconnect() { this.nodes.clear(); this.disconnected = true; }
  } });
  vm.runInContext(source, context);
  const api = window.LIZPINK_OUTLINE;
  let navigations = 0, layouts = 0;
  const args = { layout, body, headings, scrollRoot, onNavigate: () => { navigations += 1; }, onLayout: () => { layouts += 1; } };
  return {
    api, args, document, window, container, scrollRoot, layout, body, headings, targets, frames, observers, fontReady, Node,
    mount(options = {}) { return api.mount({ ...args, ...options }); },
    aside: () => layout.querySelector(".article-outline"),
    links: () => layout.querySelectorAll(".article-outline-link"),
    details: () => layout.querySelector(".article-outline-details"),
    nav: () => layout.querySelector(".article-outline-nav"),
    active: () => layout.querySelectorAll(".article-outline-link").find(node => node.getAttribute("aria-current") === "location")?.dataset.outlineTarget,
    get navigations() { return navigations; }, get layouts() { return layouts; },
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
    resize() { observers.forEach(observer => { if (!observer.disconnected) observer.callback(); }); },
    click(index) { return this.nav().emit("click", { target: this.links()[index] }); }
  };
}

test("outline requires two actual unique metadata headings and accepts rendered h3/h4/h5 levels", () => {
  const h = harness();
  h.mount({ headings: [h.headings[0], h.headings[0], { id: "absent", text: "不存在", level: 2 }] });
  assert.equal(h.aside(), null);
  const extra = new h.Node("div", "", "not-heading"); h.body.append(extra);
  h.targets[2].tagName = "H5";
  h.mount({ headings: [...h.headings, { id: "not-heading", text: "正文", level: 2 }, { id: "first", text: "重复", level: 2 }] });
  assert.equal(h.links().length, 3);
  assert.equal(h.links()[1].parentElement.dataset.level, "3");
  assert.equal(h.active(), "first");
});

test("wide mode uses the reading container width, even when the window/root is narrower", () => {
  const h = harness({ width: 1000, rootWidth: 985 }); h.mount();
  assert.equal(h.aside().dataset.wide, "true"); assert.equal(h.details().open, true);
  assert.equal(h.aside().style["--outline-max-height"], "260px");
  h.container.clientWidth = 999; h.resize(); h.flush();
  assert.equal(h.aside().dataset.wide, "false"); assert.equal(h.details().open, false);
  h.details().open = true; h.details().emit("toggle"); h.flush();
  assert.equal(h.details().open, true);
  h.container.clientWidth = 1200; h.resize(); h.flush(); assert.equal(h.details().open, true);
  h.container.clientWidth = 900; h.resize(); h.flush(); assert.equal(h.details().open, false);
});

test("clicks stay in the scroll root, preserve the route, focus the heading and collapse narrow details", () => {
  const h = harness({ width: 800 }); const dispose = h.mount();
  h.details().open = true;
  const event = h.click(2);
  assert.equal(event.prevented, true); assert.equal(h.navigations, 1);
  assert.equal(h.window.location.hash, "#project/example");
  assert.equal(h.scrollRoot.scrollTop, 500);
  assert.equal(h.document.activeElement, h.targets[2]);
  assert.equal(h.targets[2].lastFocusOptions.preventScroll, true);
  assert.equal(h.targets[2].getAttribute("tabindex"), "-1");
  assert.equal(h.details().open, false); assert.equal(h.active(), "last");
  h.flush(); assert.equal(h.active(), "last");
  dispose(); assert.equal(h.targets[2].hasAttribute("tabindex"), false);
});

test("scroll work is coalesced, highlights the last short section at bottom and does not change focus", () => {
  const h = harness(); h.mount();
  h.scrollRoot.scrollTop = 350; h.scrollRoot.emit("scroll"); h.scrollRoot.emit("scroll");
  assert.equal(h.frames.size, 1); h.flush(); assert.equal(h.active(), "second");
  assert.equal(h.document.activeElement, h.document.body);
  h.scrollRoot.scrollTop = 500; h.scrollRoot.emit("scroll"); h.flush();
  assert.equal(h.active(), "last");
});

test("media load and geometry changes recompute section positions and input safety height", () => {
  const h = harness(); h.mount();
  h.scrollRoot.scrollTop = 350; h.scrollRoot.emit("scroll"); h.flush(); assert.equal(h.active(), "second");
  h.targets[1].absoluteTop = 450; h.body.emit("load"); h.body.emit("loadedmetadata");
  assert.equal(h.frames.size, 1); h.flush(); assert.equal(h.active(), "first");
  h.scrollRoot.clientHeight = 300; h.resize(); h.flush();
  assert.equal(h.aside().style["--outline-max-height"], "160px");
});

test("mount before attachment activates on resize and resolves its actual reader container", () => {
  const h = harness({ width: 1000, rootWidth: 985, detached: true }); h.mount();
  assert.notEqual(h.aside(), null);
  h.scrollRoot.append(h.layout); h.resize(); h.flush();
  assert.equal(h.details().open, true);
  assert.equal(h.observers[0].nodes.has(h.container), true);
  h.layout.remove(); h.resize(); h.flush();
  assert.equal(h.aside(), null); assert.equal(h.scrollRoot.count("scroll"), 0);
});

test("remounting the same layout replaces its outline without multiplying listeners", () => {
  const h = harness(); h.mount(); const oldAside = h.aside(), oldLinks = h.links();
  h.mount();
  assert.notEqual(h.aside(), oldAside);
  assert.equal(oldAside.parentElement, null);
  assert.equal(h.layout.querySelectorAll(".article-outline").length, 1);
  assert.equal(h.scrollRoot.count("scroll"), 1);
  assert.equal(oldLinks[0].getAttribute("aria-current"), "location");
  assert.equal(h.observers[0].disconnected, true);
});

test("multiple article outlines coexist and disposing one leaves the other usable", () => {
  const h = harness(); const firstDispose = h.mount();
  const secondLayout = new h.Node("section", "article-layout"), secondBody = new h.Node("div", "article-body");
  secondLayout.append(secondBody); h.scrollRoot.append(secondLayout);
  ["other-a", "other-b"].forEach(id => secondBody.append(new h.Node("h4", "", id)));
  h.api.mount({ ...h.args, layout: secondLayout, body: secondBody, headings: [
    { id: "other-a", text: "A", level: 2 }, { id: "other-b", text: "B", level: 3 }
  ] });
  assert.equal(h.scrollRoot.count("scroll"), 2);
  firstDispose(); assert.equal(h.scrollRoot.count("scroll"), 1);
  assert.notEqual(secondLayout.querySelector(".article-outline"), null);
  h.api.clear(); assert.equal(h.scrollRoot.count("scroll"), 0);
  assert.equal(secondLayout.querySelector(".article-outline"), null);
});

test("clear cancels work, listeners and observers and late font callbacks cannot restart it", () => {
  const h = harness(); h.mount(); h.scrollRoot.emit("scroll");
  const oldNav = h.nav(), oldDetails = h.details();
  h.api.clear(); h.api.clear();
  assert.equal(h.frames.size, 0);
  assert.equal(h.scrollRoot.count("scroll"), 0); assert.equal(h.window.count("resize"), 0);
  assert.equal(h.body.count("load"), 0); assert.equal(h.body.count("loadedmetadata"), 0); assert.equal(h.body.count("error"), 0);
  assert.equal(oldNav.count("click"), 0); assert.equal(oldDetails.count("toggle"), 0);
  assert.equal(h.observers.every(observer => observer.disconnected && observer.nodes.size === 0), true);
  h.fontReady.forEach(callback => callback()); h.window.emit("resize"); h.body.emit("load");
  assert.equal(h.frames.size, 0); assert.equal(h.aside(), null);
});

test("existing heading focus attributes survive navigation and cleanup", () => {
  const h = harness(); h.targets[1].setAttribute("tabindex", "0"); h.mount(); h.click(1); h.api.clear();
  assert.equal(h.targets[1].getAttribute("tabindex"), "0");
});
