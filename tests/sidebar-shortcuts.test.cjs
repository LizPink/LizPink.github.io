"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../site/assets/js/sidebar-shortcuts.js"), "utf8");

function element(tagName = "div", { id = "", parent = null, attributes = {}, editable = false, value = "" } = {}) {
  return { tagName: tagName.toUpperCase(), id, parentElement: parent, isContentEditable: editable, value,
    getAttribute: name => Object.hasOwn(attributes, name) ? attributes[name] : null };
}

function harness() {
  const listeners = { document: [], window: [] };
  const body = element("body");
  const document = {
    activeElement: body,
    addEventListener(type, listener, capture = false) { listeners.document.push({ type, listener, capture }); }
  };
  const window = { addEventListener(type, listener) { listeners.window.push({ type, listener }); } };
  vm.runInNewContext(source, { document, window });
  return {
    api: window.LIZPINK_SIDEBAR_SHORTCUTS, document, listeners, body,
    key(options = {}, type = "keydown") {
      const event = {
        code: "KeyA", key: "a", ctrlKey: true, altKey: true, metaKey: false, shiftKey: false,
        repeat: false, isComposing: false, keyCode: 65, defaultPrevented: false,
        target: document.activeElement, prevented: 0, stopped: 0,
        preventDefault() { this.defaultPrevented = true; this.prevented += 1; },
        stopPropagation() { this.stopped += 1; }, ...options
      };
      listeners.document.filter(item => item.type === type).forEach(item => item.listener(event));
      return event;
    },
    blur() { listeners.window.filter(item => item.type === "blur").forEach(item => item.listener()); }
  };
}

function assertUntouched(event) {
  assert.equal(event.prevented, 0);
  assert.equal(event.stopped, 0);
}

test("loading is inert, init installs one capture handler, and repeated init does not duplicate callbacks", () => {
  const h = harness();
  assert.equal(Object.isFrozen(h.api), true);
  assert.equal(h.listeners.document.length, 0);
  assert.equal(h.listeners.window.length, 0);
  let first = 0, second = 0;
  h.api.init({ toggleLeft: () => { first += 1; return true; } });
  h.api.init({ toggleLeft: () => { second += 1; return true; } });
  assert.equal(h.listeners.document.filter(item => item.type === "keydown").length, 1);
  assert.equal(h.listeners.document.find(item => item.type === "keydown").capture, true);
  assert.equal(h.listeners.document.filter(item => item.type === "keyup").length, 1);
  assert.equal(h.listeners.window.filter(item => item.type === "blur").length, 1);
  const event = h.key();
  assert.equal(first, 1); assert.equal(second, 0);
  assert.equal(event.prevented, 1); assert.equal(event.stopped, 1);
});

test("physical KeyA/KeyB take precedence over translated or uppercase key values", () => {
  const h = harness();
  const calls = [];
  h.api.init({ toggleLeft: () => { calls.push("left"); return true; }, toggleRight: () => { calls.push("right"); return true; } });
  h.key({ code: "KeyA", key: "中" });
  h.key({ code: "KeyB", key: "a" });
  h.key({ code: "KeyA", key: "B" });
  assert.deepEqual(calls, ["left", "right", "left"]);
  assertUntouched(h.key({ code: "KeyC", key: "a" }));
  assertUntouched(h.key({ code: "ArrowLeft", key: "b" }));
  assert.deepEqual(calls, ["left", "right", "left"]);
});

test("key fallback accepts a/A/b/B only when a physical code is unavailable", () => {
  const h = harness(); let left = 0, right = 0;
  h.api.init({ toggleLeft: () => { left += 1; return true; }, toggleRight: () => { right += 1; return true; } });
  for (const key of ["a", "A"]) h.key({ code: "", key });
  for (const key of ["b", "B"]) h.key({ code: "Unidentified", key });
  assert.equal(left, 2); assert.equal(right, 2);
  assertUntouched(h.key({ code: "", key: "/" }));
  assertUntouched(h.key({ code: "", key: "Enter" }));
});

test("unrelated modifiers, repeats, composition and previously handled events are not intercepted", () => {
  const h = harness(); let calls = 0;
  h.api.init({ toggleLeft: () => { calls += 1; return true; } });
  for (const options of [
    { ctrlKey: false }, { altKey: false }, { metaKey: true }, { shiftKey: true }, { repeat: true },
    { isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }, { code: "Enter", key: "Enter" },
    { code: "Slash", key: "/" }, { code: "Tab", key: "Tab" }
  ]) assertUntouched(h.key(options));
  assert.equal(calls, 0);
});

test("normal left Ctrl+left Alt remains usable when Firefox reports AltGraph modifier state", () => {
  const h = harness(); let calls = 0;
  h.api.init({ toggleLeft: () => { calls += 1; return true; } });
  const reported = { getModifierState: name => name === "AltGraph" };
  h.key({ code: "ControlLeft", key: "Control", ...reported });
  h.key({ code: "AltLeft", key: "Alt", ...reported });
  const event = h.key(reported);
  assert.equal(calls, 1);
  assert.equal(event.prevented, 1);
});

test("normal Ctrl+right Alt supports both shortcuts even when AltGraph modifier state is reported", () => {
  const h = harness(); const calls = [];
  h.api.init({ toggleLeft: () => { calls.push("left"); return true; }, toggleRight: () => { calls.push("right"); return true; } });
  const reported = { getModifierState: name => name === "AltGraph" };
  h.key({ code: "ControlLeft", key: "Control", ...reported });
  h.key({ code: "AltRight", key: "Alt", ...reported });
  for (const code of ["KeyA", "KeyB"]) {
    const event = h.key({ code, ...reported });
    assert.equal(event.prevented, 1);
    assert.equal(event.stopped, 1);
  }
  assert.deepEqual(calls, ["left", "right"]);
});

test("actual AltGraph typing is protected until release; blur clears stale key state", () => {
  const h = harness(); let calls = 0;
  const toggle = () => { calls += 1; return true; };
  h.api.init({ toggleLeft: toggle, toggleRight: toggle });
  h.key({ code: "AltRight", key: "AltGraph" });
  assertUntouched(h.key({ key: "æ", getModifierState: () => true }));
  assert.equal(calls, 0);
  h.key({ code: "AltRight", key: "Alt" }, "keyup");
  h.key(); assert.equal(calls, 1);
  h.key({ code: "", key: "AltGraph" });
  assertUntouched(h.key());
  h.key({ code: "", key: "AltGraph" }, "keyup");
  h.key(); assert.equal(calls, 2);
  h.key({ code: "AltRight", key: "AltGraph" });
  assertUntouched(h.key({ code: "KeyB", key: "∫" }));
  h.blur(); h.key(); assert.equal(calls, 3);
});

test("other native and custom editors retain their keys, including descendants", () => {
  const h = harness(); let calls = 0;
  h.api.init({ toggleLeft: () => { calls += 1; return true; } });
  const editable = element("div", { attributes: { contenteditable: "true" } });
  const textbox = element("div", { attributes: { role: "textbox" } });
  for (const target of [element("input"), element("textarea"), element("select"), editable,
    element("span", { parent: editable }), textbox, element("button", { parent: textbox }),
    element("div", { editable: true }), element("div", { attributes: { contenteditable: "" } }),
    element("div", { attributes: { contenteditable: "plaintext-only" } })]) {
    h.document.activeElement = target;
    assertUntouched(h.key());
  }
  assert.equal(calls, 0);
});

test("command input, reading content and sidebar controls are supported without touching drafts", () => {
  const h = harness(); let calls = 0;
  h.api.init({ toggleLeft: () => { calls += 1; return true; } });
  const input = element("input", { id: "command-input", value: "unsubmitted draft", attributes: { role: "combobox" } });
  const sidebar = element("nav");
  for (const target of [input, element("p"), element("button", { parent: sidebar }), element("div", { attributes: { contenteditable: "false" } })]) {
    h.document.activeElement = target;
    assert.equal(h.key().prevented, 1);
  }
  assert.equal(calls, 4);
  assert.equal(input.value, "unsubmitted draft");
});

test("retargeted custom editors and the actual focused editor are respected", () => {
  const h = harness(); let calls = 0;
  h.api.init({ toggleLeft: () => { calls += 1; return true; } });
  const editor = element("textarea");
  assertUntouched(h.key({ target: element("div"), composedPath: () => [editor] }));
  h.document.activeElement = editor;
  assertUntouched(h.key({ target: h.body }));
  assert.equal(calls, 0);
});

test("missing or unavailable right sidebar never consumes the browser shortcut", () => {
  const absent = harness(); absent.api.init({ toggleLeft: () => true });
  assertUntouched(absent.key({ code: "KeyB", key: "b" }));
  for (const result of [false, undefined, null, 1]) {
    const h = harness(); let calls = 0;
    h.api.init({ toggleRight: () => { calls += 1; return result; } });
    assertUntouched(h.key({ code: "KeyB", key: "b" }));
    assert.equal(calls, 1);
  }
  const available = harness(); available.api.init({ toggleRight: () => true });
  const event = available.key({ code: "KeyB", key: "b" });
  assert.equal(event.prevented, 1); assert.equal(event.stopped, 1);
});
