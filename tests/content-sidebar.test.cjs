"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../dist/assets/js/content-sidebar.js"), "utf8");

class Signals {
  listeners = new Map();
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, values = {}) {
    const event = { type, prevented: false, stopped: false,
      preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...values };
    [...(this.listeners.get(type) || [])].forEach(listener => listener(event));
    return event;
  }
  count(type) { return this.listeners.get(type)?.size || 0; }
}

function harness({ mobile = false, width = 1200, entries } = {}) {
  let document;
  class Node extends Signals {
    constructor(tagName, id = "") {
      super();
      Object.assign(this, { tagName, id, children: [], parentElement: null, dataset: {}, attributes: {}, hidden: false,
        inert: false, scrollTop: 0, className: "", text: "", clientWidth: width, captures: new Set() });
      this.style = { userSelect: "text", setProperty(name, value) { this[name] = value; } };
    }
    append(...nodes) { nodes.forEach(node => { node.parentElement = this; this.children.push(node); }); }
    replaceChildren(...nodes) {
      if (this.contains(document.activeElement)) document.activeElement = document.body;
      this.children.forEach(node => { node.parentElement = null; }); this.children = []; this.append(...nodes);
    }
    set textContent(text) { this.text = String(text); this.children = []; }
    get textContent() { return this.text + this.children.map(node => node.textContent).join(""); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    focus() { document.activeElement = this; }
    closest() { for (let node = this; node; node = node.parentElement) if (node.hidden || node.inert) return node; return null; }
    getClientRects() { return this.closest() ? [] : [{}]; }
    descendants() { return this.children.flatMap(node => [node, ...node.descendants()]); }
    querySelectorAll(selector) {
      return this.descendants().filter(node => selector === "[data-route]" ? node.dataset.route !== undefined
        : selector === "[data-content-key]" ? node.dataset.contentKey !== undefined
        : selector.startsWith("button:not") ? (node.tagName === "button" && !node.attributes.disabled)
        : false);
    }
    setPointerCapture(id) { this.captures.add(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
    releasePointerCapture(id) { this.captures.delete(id); this.emit("lostpointercapture", { pointerId: id }); }
  }
  const nodes = {};
  const make = (name, tag = "div") => (nodes[name] = new Node(tag, name));
  const body = make("body", "body");
  document = Object.assign(new Signals(), {
    body, activeElement: body, createElement: tag => new Node(tag),
    querySelector: selector => nodes[selector.slice(1)]
  });
  const frame = make("terminal-frame");
  const layout = make("frame-layout");
  const reading = make("frame-main");
  const menu = make("route-menu", "nav");
  const reveal = make("menu-reveal", "button");
  const collapse = make("menu-close", "button");
  const backdrop = make("menu-backdrop", "button");
  const resizer = make("sidebar-resizer");
  const list = make("content-list", "ul");
  menu.append(collapse);
  ["home", "life", "resume", "project"].forEach(route => {
    const button = new Node("button"); button.dataset.route = route; menu.append(button);
  });
  menu.append(make("content-index-title", "h2"), make("content-index-count", "span"), list);
  layout.append(menu, resizer, reading, backdrop); frame.append(reveal, layout); body.append(frame);
  const preference = Object.assign(new Signals(), { matches: mobile });
  const frames = new Map();
  let sequence = 0, observer;
  const window = Object.assign(new Signals(), {
    innerWidth: width, matchMedia: () => preference,
    requestAnimationFrame(callback) { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame(id) { frames.delete(id); }
  });
  const data = entries || [
    { key: "one", route: "project", title: "<one>", excerpt: "第一条的简介", type: "text", example: true, date: { value: "2026-11-01", text: "2026.11.01", label: "发布", example: true } },
    { key: "two", route: "project", title: "第二条", excerpt: "第二条的简介", type: "image", example: false, date: null },
    { key: "three", route: "life", title: "日常", excerpt: "日常记录", type: "video", example: true, date: { value: "2026-10-31", text: "2026.10.31", label: "更新" } }
  ];
  window.LIZPINK_CONTENT_INDEX = { items: route => ["project", "life", "resume"].includes(route) ? data.filter(item => item.route === route) : data };
  const context = vm.createContext({ window, document, ResizeObserver: class { constructor(callback) { observer = callback; } observe() {} } });
  vm.runInContext(source, context);
  let layoutNotifications = 0;
  const api = window.LIZPINK_SIDEBAR;
  api.init({ onLayout: () => { layoutNotifications += 1; } });
  return {
    api, nodes, document, window, frames,
    get notifications() { return layoutNotifications; },
    currentWidth: () => Number(resizer.getAttribute("aria-valuenow")),
    controls: () => menu.querySelectorAll("button:not([disabled])"),
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
    geometry(value) { layout.clientWidth = value; observer(); },
    mobile(value) { preference.matches = value; preference.emit("change"); },
    dragStart(x = 200) { return resizer.emit("pointerdown", { button: 0, isPrimary: true, pointerId: 7, clientX: x }); },
    move(x) { window.emit("pointermove", { pointerId: 7, clientX: x }); },
    up(x) { window.emit("pointerup", { pointerId: 7, clientX: x }); }
  };
}

test("desktop initializes open with width and separator semantics; init is idempotent", () => {
  const h = harness();
  assert.equal(h.api.isOpen(), true);
  assert.equal(h.currentWidth(), 200);
  assert.equal(h.nodes["route-menu"].hidden, false);
  assert.equal(h.nodes["frame-main"].inert, false);
  assert.equal(h.nodes["sidebar-resizer"].hidden, false);
  assert.equal(h.nodes["sidebar-resizer"].getAttribute("aria-valuemin"), "180");
  assert.equal(h.nodes["sidebar-resizer"].getAttribute("aria-valuemax"), "420");
  h.api.init(); assert.equal(h.document.count("keydown"), 1);
});

test("keyboard resizing observes limits and leaves unhandled keys untouched", () => {
  const h = harness(), separator = h.nodes["sidebar-resizer"];
  assert.equal(separator.emit("keydown", { key: "ArrowLeft" }).prevented, true);
  assert.equal(h.currentWidth(), 184);
  separator.emit("keydown", { key: "Home" }); assert.equal(h.currentWidth(), 180);
  separator.emit("keydown", { key: "ArrowLeft" }); assert.equal(h.currentWidth(), 180);
  separator.emit("keydown", { key: "End" }); assert.equal(h.currentWidth(), 420);
  assert.equal(separator.emit("keydown", { key: "a" }).prevented, false);
  separator.emit("dblclick"); assert.equal(h.currentWidth(), 200);
});

test("container shrink preserves reading space and restores preferred width when it grows", () => {
  const h = harness();
  h.nodes["sidebar-resizer"].emit("keydown", { key: "End" });
  h.geometry(600); assert.equal(h.currentWidth(), 280);
  assert.equal(h.nodes["sidebar-resizer"].getAttribute("aria-valuemax"), "280");
  h.geometry(1000); assert.equal(h.currentWidth(), 420);
});

test("pointer moves are batched and pointerup flushes the final position and cleans up", () => {
  const h = harness();
  assert.equal(h.dragStart().prevented, true);
  h.move(340); h.move(380);
  assert.equal(h.frames.size, 1); assert.equal(h.currentWidth(), 200);
  h.flush(); assert.equal(h.currentWidth(), 380);
  h.up(399); assert.equal(h.currentWidth(), 399);
  assert.equal(h.nodes["terminal-frame"].dataset.resizing, "false");
  assert.equal(h.document.body.style.userSelect, "text");
  assert.equal(h.window.count("pointermove"), 0);
  assert.equal(h.nodes["sidebar-resizer"].hasPointerCapture(7), false);
});

test("Escape rolls back an in-progress drag and cancels its queued frame", () => {
  const h = harness(); h.dragStart(); h.move(390); h.flush(); h.move(410);
  const event = h.document.emit("keydown", { key: "Escape" });
  assert.equal(event.prevented, true); assert.equal(event.stopped, true);
  assert.equal(h.currentWidth(), 200); assert.equal(h.frames.size, 0);
  assert.equal(h.document.body.style.userSelect, "text");
  assert.equal(h.window.count("pointermove"), 0);
});

for (const reason of ["pointercancel", "lostpointercapture", "blur"]) {
  test(`drag cancellation cleans up and restores width on ${reason}`, () => {
    const h = harness(); h.dragStart(); h.move(400); h.flush();
    (reason === "lostpointercapture" ? h.nodes["sidebar-resizer"] : h.window).emit(reason, { pointerId: 7 });
    assert.equal(h.currentWidth(), 200);
    assert.equal(h.nodes["terminal-frame"].dataset.resizing, "false");
    assert.equal(h.document.body.style.userSelect, "text");
    assert.equal(h.window.count("pointerup"), 0);
  });
}

test("mobile starts closed and opening traps focus across all content controls", () => {
  const h = harness({ mobile: true, width: 390 }); h.api.update("home");
  assert.equal(h.api.isOpen(), false);
  h.nodes["menu-reveal"].emit("click");
  assert.equal(h.api.isOpen(), true);
  assert.equal(h.document.activeElement, h.nodes["menu-close"]);
  assert.equal(h.nodes["frame-main"].inert, true);
  assert.equal(h.nodes["sidebar-resizer"].hidden, true);
  const controls = h.controls(); controls.at(-1).focus();
  h.document.emit("keydown", { key: "Tab" }); assert.equal(h.document.activeElement, controls[0]);
  h.document.emit("keydown", { key: "Tab", shiftKey: true }); assert.equal(h.document.activeElement, controls.at(-1));
  h.document.emit("keydown", { key: "Escape" });
  assert.equal(h.api.isOpen(), false); assert.equal(h.nodes["frame-main"].inert, false);
  assert.equal(h.document.activeElement, h.nodes["menu-reveal"]);
});

test("close never leaves focus in hidden content, including a backdrop dismissal", () => {
  const h = harness({ mobile: true, width: 390 }); h.api.update("project");
  h.nodes["menu-reveal"].emit("click"); h.controls().at(-1).focus();
  h.api.close(); assert.equal(h.document.activeElement, h.nodes["menu-reveal"]);
  h.nodes["menu-reveal"].emit("click"); h.nodes["menu-backdrop"].emit("click");
  assert.equal(h.nodes["menu-backdrop"].hidden, true);
  assert.equal(h.nodes["frame-main"].inert, false);
});

test("breakpoint transitions preserve desktop collapse choice and release inert/drag state", () => {
  const h = harness(); h.dragStart(); h.move(380); h.flush();
  h.mobile(true);
  assert.equal(h.api.isOpen(), false); assert.equal(h.currentWidth(), 200);
  assert.equal(h.document.body.style.userSelect, "text");
  h.mobile(false); assert.equal(h.api.isOpen(), true);
  h.api.close(); h.mobile(true); h.nodes["menu-reveal"].emit("click");
  assert.equal(h.nodes["frame-main"].inert, true);
  h.mobile(false);
  assert.equal(h.api.isOpen(), false); assert.equal(h.nodes["frame-main"].inert, false);
});

test("content uses literal text, honest date labels, and preserves nodes/focus when only selection changes", () => {
  const h = harness(); h.api.update("project", "one");
  const first = h.nodes["content-list"].querySelectorAll("[data-content-key]")[0];
  assert.match(first.textContent, /<one>/);
  assert.match(first.textContent, /示例日期 2026.11.01/);
  assert.equal(first.getAttribute("aria-current"), "location");
  first.focus(); h.nodes["content-list"].scrollTop = 120; h.api.update("project", "two");
  assert.equal(h.nodes["content-list"].querySelectorAll("[data-content-key]")[0], first);
  assert.equal(h.document.activeElement, first);
  assert.equal(h.nodes["content-list"].scrollTop, 120);
  assert.equal(first.getAttribute("aria-current"), null);
  assert.equal(h.nodes["content-list"].querySelectorAll("[data-content-key]")[1].getAttribute("aria-current"), "location");
  h.api.update("life", "three");
  assert.equal(h.nodes["content-list"].scrollTop, 0);
  assert.match(h.nodes["content-list"].textContent, /更新 2026.10.31/);
  assert.equal(h.nodes["content-index-title"].textContent, "生活");
});

test("content rows contain only a date and title, with no empty metadata for undated rows", () => {
  const h = harness(); h.api.update("home");
  const buttons = h.nodes["content-list"].querySelectorAll("[data-content-key]");
  assert.deepEqual(buttons[0].children.map(node => node.className), ["content-item-meta", "content-item-title"]);
  assert.equal(buttons[0].children[0].children.length, 1);
  assert.equal(buttons[0].children[0].children[0].tagName, "time");
  assert.deepEqual(buttons[1].children.map(node => node.className), ["content-item-title"]);
  assert.equal(buttons[1].textContent, "第二条");
  assert.doesNotMatch(h.nodes["content-list"].textContent, /简介|日常记录|文字示例|图片|视频/);
  assert.equal(h.nodes["content-list"].descendants().some(node => node.className === "content-item-excerpt"), false);
});

test("home/help list all entries and empty sections retain a valid list structure", () => {
  const h = harness(); h.api.update("help");
  assert.equal(h.nodes["content-index-title"].textContent, "全部内容");
  assert.equal(h.nodes["content-index-count"].textContent, "3 项");
  h.api.update("project");
  assert.equal(h.nodes["content-index-title"].textContent, "项目");
  h.api.update("resume");
  assert.equal(h.nodes["content-index-title"].textContent, "经历");
  assert.equal(h.nodes["content-list"].children[0].tagName, "li");
  assert.equal(h.nodes["content-list"].children[0].children[0].className, "content-index-empty");
  assert.equal(h.nodes["content-index-count"].textContent, "0 项");
});
