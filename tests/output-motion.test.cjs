"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const scripts = ["content.js", "commands.js", "summaries.js", "output-motion.js"]
  .map(name => fs.readFileSync(path.join(__dirname, "../dist/assets/js", name), "utf8"));
const flush = () => new Promise(resolve => setImmediate(resolve));

class Signals {
  listeners = new Map();
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type) { [...(this.listeners.get(type) || [])].forEach(listener => listener()); }
  listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}

function harness(options = {}) {
  const calls = [];
  let attempts = 0;
  let selection = { isCollapsed: true };
  const descendants = node => node.children.flatMap(child => [child, ...descendants(child)]);
  // Only tag/class/direct-child selectors are needed by the real renderers/module.
  function matches(node, selector, scope) {
    const parts = selector.trim().split(/\s*>\s*/);
    for (let index = parts.length - 1; index >= 0; index -= 1, node = node.parentElement) {
      if (!node) return false;
      const part = parts[index];
      if (part === ":scope" ? node !== scope : part.startsWith(".")
        ? !node.className.split(/\s+/).includes(part.slice(1)) : node.tagName !== part) return false;
    }
    return true;
  }
  class Node extends Signals {
    constructor(tagName, className = "") {
      super();
      Object.assign(this, { tagName, className, children: [], parentElement: null, dataset: {}, style: {}, attributes: {}, text: "" });
      if (options.unsupported) this.animate = undefined;
    }
    append(...children) {
      children.forEach(child => { child.parentElement = this; this.children.push(child); });
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    set textContent(value) { this.text = String(value); this.children = []; }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(""); }
    querySelectorAll(selector) {
      const selectors = selector.split(",");
      return descendants(this).filter(node => selectors.some(part => matches(node, part, this)));
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    contains(node) { return node === this || descendants(this).includes(node); }
    focus() { throw new Error("Motion must not move focus"); }
    scrollIntoView() { throw new Error("Motion must not scroll"); }
    animate(keyframes, timing) {
      attempts += 1;
      if (attempts === options.throwOnAnimate) throw new Error("Animation unavailable");
      let resolve, reject;
      const animation = {
        finished: new Promise((done, fail) => { resolve = done; reject = fail; }),
        cancellations: 0,
        complete: () => resolve(),
        fail: () => reject(new Error("Animation interrupted")),
        cancel() { this.cancellations += 1; reject(new Error("Animation cancelled")); }
      };
      calls.push({ node: this, keyframes, timing, animation });
      return animation;
    }
  }
  const document = Object.assign(new Signals(), {
    hidden: Boolean(options.hidden), createElement: tagName => new Node(tagName)
  });
  const preference = Object.assign(new Signals(), { matches: Boolean(options.reduce) });
  const window = { matchMedia: () => preference, getSelection: () => selection };
  const context = vm.createContext({ window, document });
  scripts.forEach(source => vm.runInContext(source, context));
  function output(route) {
    const container = new Node("div", "terminal-result");
    const result = window.LIZPINK_SUMMARIES.create(route);
    container.append(result.node);
    if (result.detailLabel) {
      const details = new Node("details", "output-details");
      const summary = new Node("summary");
      summary.textContent = result.detailLabel;
      const body = new Node("div", "details-body");
      body.append(new Node("p"), new Node("img"), new Node("video"));
      details.append(summary, body);
      container.append(details);
    }
    return container;
  }
  return {
    api: window.LIZPINK_OUTPUT_MOTION, calls, document, preference, output, descendants,
    select(value) { selection = value; document.emit("selectionchange"); }
  };
}

function assertClean(env, container) {
  assert.equal(env.api.isPlaying(), false);
  assert.equal(container.dataset.streaming, "false");
  assert.equal(container.dataset.streamed, "true");
  assert.equal(container.listenerCount(), 0);
  assert.equal(env.document.listenerCount(), 0);
  assert.equal(env.preference.listenerCount(), 0);
}

test("real summaries retain every node/content and reveal only summary units within 280ms", () => {
  for (const route of ["life", "project", "resume"]) {
    const env = harness();
    const output = env.output(route);
    const originalNodes = env.descendants(output);
    const originalText = output.textContent;
    env.api.play(output);
    assert.equal(env.api.isPlaying(), true);
    assert.deepEqual(env.descendants(output), originalNodes);
    assert.equal(output.textContent, originalText);
    assert.equal(new Set(env.calls.map(call => call.node)).size, env.calls.length);
    assert.equal(env.calls.some(call => call.node.className === "details-body"), false);
    assert.equal(env.calls.some(call => ["p", "img", "video"].includes(call.node.tagName) &&
      call.node.parentElement?.className === "details-body"), false);
    assert.ok(env.calls.some(call => call.node.tagName === "summary"));
    const total = Math.max(...env.calls.map(call => call.timing.delay + call.timing.duration));
    assert.ok(total >= 200 && total <= 280, `${route}: ${total}ms`);
    env.calls.forEach(call => {
      assert.deepEqual(Object.keys(call.node.style), []);
      assert.equal(call.timing.fill, "backwards");
      assert.equal(call.keyframes.length, 2);
      call.keyframes.forEach(frame => assert.equal(Object.keys(frame).join(), "opacity"));
    });
    env.api.finish();
    assertClean(env, output);
  }
});

test("real help keeps each command/number/description together and batches headings with first rows", () => {
  const env = harness();
  const output = env.output("help");
  env.api.play(output);
  const rows = output.querySelectorAll(".help-commands > div");
  assert.equal(rows.length, 8);
  rows.forEach(row => {
    assert.equal(env.calls.filter(call => call.node === row).length, 1);
    assert.equal(env.calls.some(call => row.contains(call.node) && call.node !== row), false);
  });
  output.querySelectorAll(".help-group").forEach(group => {
    const title = env.calls.find(call => call.node === group.querySelector(".help-group-title"));
    const first = env.calls.find(call => call.node === group.querySelector(".help-commands > div"));
    assert.equal(title.timing.delay, first.timing.delay);
  });
  const keys = env.calls.find(call => call.node === output.querySelector(".help-keys"));
  assert.equal(keys.timing.delay, Math.max(...env.calls.map(call => call.timing.delay)));
  assert.ok(keys.timing.delay + keys.timing.duration >= 400);
  assert.ok(keys.timing.delay + keys.timing.duration <= 550);
  env.api.finish();
});

test("large help remains inside the same time budget", () => {
  const env = harness();
  const output = env.output("help");
  const list = output.querySelector(".help-commands");
  const Node = list.constructor;
  for (let index = 0; index < 100; index += 1) list.append(new Node("div"));
  env.api.play(output);
  assert.ok(Math.max(...env.calls.map(call => call.timing.delay + call.timing.duration)) <= 550);
  env.api.finish();
});

test("finish is idempotent and one container never replays", async () => {
  const env = harness();
  const output = env.output("project");
  assert.equal(Object.isFrozen(env.api), true);
  env.api.play(output);
  const count = env.calls.length;
  env.api.finish();
  env.api.finish();
  env.api.play(output);
  await flush();
  assert.equal(env.calls.length, count);
  assert.ok(env.calls.every(call => call.animation.cancellations === 1));
  assertClean(env, output);
});

test("old cancelled promises cannot finish the next command's animation", async () => {
  const env = harness();
  const previous = env.output("help");
  env.api.play(previous);
  const oldCalls = [...env.calls];
  const next = env.output("life");
  env.api.play(next);
  const newCalls = env.calls.slice(oldCalls.length);
  await flush();
  assert.equal(previous.dataset.streaming, "false");
  assert.equal(next.dataset.streaming, "true");
  assert.equal(env.api.isPlaying(), true);
  assert.ok(oldCalls.every(call => call.animation.cancellations === 1));
  assert.ok(newCalls.every(call => call.animation.cancellations === 0));
  env.api.finish();
  await flush();
  assertClean(env, next);
});

test("natural completion releases effects and all listeners", async () => {
  const env = harness();
  const output = env.output("resume");
  env.api.play(output);
  env.calls.forEach(call => call.animation.complete());
  await flush();
  assert.ok(env.calls.every(call => call.animation.cancellations === 1));
  assertClean(env, output);
});

for (const options of [{ reduce: true }, { hidden: true }, { unsupported: true }]) {
  test(`static fallback: ${Object.keys(options)[0]}`, () => {
    const env = harness(options);
    const output = env.output("help");
    const originalText = output.textContent;
    env.api.play(output);
    assert.equal(env.calls.length, 0);
    assert.equal(output.textContent, originalText);
    assertClean(env, output);
  });
}

for (const reason of ["reduce", "hidden", "pointerdown", "focusin"]) {
  test(`active motion finishes immediately on ${reason}`, async () => {
    const env = harness();
    const output = env.output("help");
    env.api.play(output);
    if (reason === "reduce") {
      env.preference.matches = true;
      env.preference.emit("change");
    } else if (reason === "hidden") {
      env.document.hidden = true;
      env.document.emit("visibilitychange");
    } else output.emit(reason);
    assertClean(env, output);
    await flush();
    assert.ok(env.calls.every(call => call.animation.cancellations === 1));
  });
}

test("selection only finishes motion when it intersects the current output", () => {
  const env = harness();
  const output = env.output("help");
  env.api.play(output);
  env.select({ isCollapsed: true, anchorNode: output });
  assert.equal(env.api.isPlaying(), true);
  env.select({ isCollapsed: false, anchorNode: null, focusNode: null, containsNode: () => false });
  assert.equal(env.api.isPlaying(), true);
  env.select({ isCollapsed: false, anchorNode: output.querySelector(".help-command") });
  assertClean(env, output);
});

test("a partial WAAPI failure cancels created effects and leaves the static output intact", async () => {
  const env = harness({ throwOnAnimate: 2 });
  const output = env.output("project");
  const originalText = output.textContent;
  env.api.play(output);
  await flush();
  assert.equal(env.calls.length, 1);
  assert.equal(env.calls[0].animation.cancellations, 1);
  assert.equal(output.textContent, originalText);
  assertClean(env, output);
});

test("an unexpectedly rejected finished promise completes the current output without leaking effects", async () => {
  const env = harness();
  const output = env.output("project");
  env.api.play(output);
  env.calls[0].animation.fail();
  await flush();
  assertClean(env, output);
  assert.ok(env.calls.every(call => call.animation.cancellations === 1));
});
