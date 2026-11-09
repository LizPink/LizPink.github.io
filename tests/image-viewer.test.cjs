"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const sourceFile = path.join(__dirname, "../site/assets/js/image-viewer.js");

class Signals {
  listeners = new Map();
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, values = {}) {
    const event = { type, target: this, button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
      defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...values };
    this.deliver(event);
    return event;
  }
  deliver(event) {
    [...(this.listeners.get(event.type) || [])].forEach(callback => callback(event));
    this[`on${event.type}`]?.(event);
  }
}

// This harness models event delegation and observable DOM state only. It does
// not emulate native dialog focus trapping, inertness, painting or Escape.
function harness({ support = true, showThrows = false, comparisonSupport = true, comparisonThrows = false, resizeSupport = true } = {}) {
  let document;
  const location = new URL("https://example.test/portfolio/#project/picture");
  class Element extends Signals {
    constructor(tagName, id = "") {
      super(); Object.assign(this, { tagName: tagName.toUpperCase(), id, children: [], parentElement: null,
        attributes: {}, dataset: {}, className: "", hidden: false, open: false, text: "", scrollTop: 0, scrollLeft: 0,
        style: { setProperty(name, value) { this[name] = String(value); }, removeProperty(name) { delete this[name]; } },
        naturalWidth: 0, naturalHeight: 0, complete: false, focuses: [], bounds: { width: 1200, height: 700 } });
    }
    append(...nodes) { nodes.forEach(node => { node.parentElement = this; this.children.push(node); }); }
    replaceChildren(...nodes) { this.children.forEach(node => { node.parentElement = null; }); this.children = []; this.append(...nodes); }
    remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; }
    contains(node) { return this === node || this.children.some(child => child.contains(node)); }
    get isConnected() { return document.body.contains(this); }
    descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
    matches(selector) {
      return selector.split(",").some(item => {
        const value = item.trim();
        if (value === "*") return true;
        if (value.startsWith("#")) return this.id === value.slice(1);
        const attributes = [...value.matchAll(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/g)];
        if (attributes.some(([, name, expected]) => !this.hasAttribute(name) ||
          (expected !== undefined && this.getAttribute(name) !== expected))) return false;
        const match = value.replace(/\[[^\]]+\]/g, "").match(/^([\w-]+)?(?:\.([\w-]+))?$/);
        return Boolean(match && (!match[1] || this.tagName === match[1].toUpperCase()) &&
          (!match[2] || this.className.split(/\s+/).includes(match[2])));
      });
    }
    closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
    querySelector(selector) { return this.descendants().find(node => node.matches(selector)) || null; }
    querySelectorAll(selector) { return this.descendants().filter(node => node.matches(selector)); }
    cloneNode(deep = false) {
      const clone = new Element(this.tagName, this.id);
      Object.assign(clone, { attributes: { ...this.attributes }, dataset: { ...this.dataset }, className: this.className, text: this.text });
      if (deep) clone.append(...this.children.map(child => child.cloneNode(true)));
      return clone;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return name === "id" ? this.id || null : this.attributes[name] ?? null; }
    removeAttribute(name) { if (name === "id") this.id = ""; delete this.attributes[name]; }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    getAttributeNames() { return [...Object.keys(this.attributes), ...(this.id ? ["id"] : [])]; }
    get textContent() { return this.text + this.children.map(node => node.textContent).join(""); }
    set textContent(value) { this.replaceChildren(); this.text = String(value); }
    get href() { return new URL(this.getAttribute("href") || "", location).href; }
    set href(value) { this.setAttribute("href", value); }
    get src() { return this.hasAttribute("src") ? new URL(this.getAttribute("src"), location).href : ""; }
    set src(value) { this.setAttribute("src", value); }
    get currentSrc() { return this.src; }
    get alt() { return this.getAttribute("alt") || ""; }
    set alt(value) { this.setAttribute("alt", value); }
    focus(options) { document.activeElement = this; this.focuses.push(options); }
    getClientRects() { return this.isConnected && !this.hidden ? [{}] : []; }
    getBoundingClientRect() { return this.bounds; }
  }
  const body = new Element("body");
  document = Object.assign(new Signals(), { body, activeElement: body, baseURI: location.href,
    createElement: tag => {
      const node = new Element(tag);
      if (node.tagName === "IMG") pendingImages.push(node);
      return node;
    },
    querySelector: selector => body.querySelector(selector),
    getElementById: id => body.querySelector(`#${id}`) });
  const scrollRoot = new Element("main", "main"), root = new Element("div", "terminal-records");
  scrollRoot.setAttribute("tabindex", "-1"); scrollRoot.append(root); body.append(scrollRoot);
  const dialog = new Element("dialog", "image-viewer");
  const stage = new Element("div", "image-viewer-stage"), image = new Element("img", "image-viewer-image");
  const comparison = new Element("div", "image-viewer-comparison");
  const caption = new Element("p", "image-viewer-caption"), status = new Element("p", "image-viewer-status");
  const toolbar = new Element("div", "image-viewer-toolbar"), closeButton = new Element("button", "image-viewer-close");
  const title = new Element("span"); title.className = "image-viewer-label";
  toolbar.append(title, closeButton); stage.append(image, comparison, status); dialog.append(toolbar, stage, caption); body.append(dialog);
  let shows = 0, openings = 0;
  if (support) dialog.showModal = () => {
    if (showThrows) throw new Error("Browser refused modal");
    shows += 1; dialog.open = true;
  };
  dialog.close = () => { dialog.open = false; dialog.emit("close"); };
  const pendingImages = [];
  const window = Object.assign(new Signals(), { location });
  const comparisonInitializations = [], observers = [];
  if (comparisonSupport) window.LIZPINK_IMAGE_COMPARISON = { init(target) {
    comparisonInitializations.push(target);
    if (comparisonThrows) throw new Error("Comparison initialization failed");
    return [target];
  } };
  if (resizeSupport) window.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  vm.runInNewContext(fs.readFileSync(sourceFile, "utf8"), { window, document, location, URL });
  const api = window.LIZPINK_IMAGE_VIEWER;
  const options = { root, scrollRoot, onOpen() { assert.equal(dialog.open, true); openings += 1; } };
  return {
    api, options, root, scrollRoot, dialog, stage, image, comparison, caption, status, toolbar, title, closeButton,
    body, document, window, Element, pendingImages, comparisonInitializations, observers,
    init() { api.init(options); },
    settle(loader = pendingImages.at(-1), type = "load") {
      loader.complete = true; loader.naturalWidth = type === "load" ? 960 : 0; loader.naturalHeight = type === "load" ? 540 : 0;
      loader.emit(type);
    },
    get shows() { return shows; }, get openings() { return openings; },
    comparisonFigure({ before = "./assets/before.png?v=one", after = "./assets/after.png?v=two", external = false } = {}) {
      const figure = new Element("figure"), region = new Element("div"), slider = new Element("img-comparison-slider");
      const first = new Element("img"), second = new Element("img"), expand = new Element("button"), label = new Element("span");
      figure.className = "sample-media sample-comparison";
      region.className = "image-comparison comparison-ready"; region.setAttribute("data-image-comparison", "");
      region.setAttribute("style", "width:320px;--comparison-ratio:1.5");
      region.setAttribute("data-comparison-state", "ready");
      slider.setAttribute("aria-describedby", "article-comparison-caption");
      first.src = before; first.alt = "直接光照"; first.className = "comparison-image"; first.setAttribute("slot", "first");
      second.src = after; second.alt = "加入间接光照"; second.className = "comparison-image"; second.setAttribute("slot", "second");
      first.id = "article-first-image"; second.setAttribute("loading", "lazy");
      expand.setAttribute("data-comparison-expand", ""); expand.textContent = "放大对比";
      label.className = "comparison-label"; label.textContent = "直接光照";
      slider.append(first, second); region.append(slider, label); figure.append(region, expand);
      (external ? body : root).append(figure);
      return { figure, region, slider, first, second, expand, label };
    },
    resizeStage(width, height) {
      stage.bounds = { width, height };
      observers.filter(observer => !observer.disconnected).forEach(observer => observer.callback());
      window.emit("resize");
    },
    figure({ href = "./assets/picture.svg?v=one", src = href, alt = "图片说明", captionText = "图片说明", tag = "img", external = false } = {}) {
      const figure = new Element("figure"), link = new Element("a"), media = new Element(tag), label = new Element("figcaption");
      figure.className = "sample-media"; link.className = "media-zoom";
      link.href = href; media.src = src; media.alt = alt; label.textContent = captionText;
      link.append(media); figure.append(link, label); (external ? body : root).append(figure);
      return { figure, link, media, label };
    },
    click(target, values = {}) {
      const event = { type: "click", target, button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
        defaultPrevented: false, stopped: false,
        preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...values };
      for (let node = target; node; node = node.parentElement) { node.deliver(event); if (event.stopped) break; }
      return event;
    }
  };
}

test("initialization is inert until init and repeated init never opens twice", () => {
  const h = harness(), picture = h.figure();
  assert.equal(Object.isFrozen(h.api), true); assert.equal(h.api.isOpen(), false);
  assert.equal(h.click(picture.media).defaultPrevented, false);
  h.init(); h.init();
  assert.equal(h.root.listeners.get("click")?.size, 1);
  assert.equal(h.click(picture.media).defaultPrevented, true);
  assert.equal(h.api.isOpen(), true); assert.equal(h.shows, 1); assert.equal(h.openings, 1);
});

test("ordinary image activation preserves its URL, meaningful caption and existing scroll", () => {
  const h = harness(); h.init();
  const picture = h.figure({ href: "./assets/图片.svg?v=one#view", alt: "替代文字", captionText: "图片标题" });
  const hint = new h.Element("span"); hint.className = "media-hint"; hint.textContent = "点击图片查看大图"; picture.label.append(hint);
  h.scrollRoot.scrollTop = 240; h.scrollRoot.scrollLeft = 16;
  const event = h.click(picture.link);
  assert.equal(event.defaultPrevented, true); assert.equal(h.dialog.open, true);
  h.settle();
  assert.equal(h.image.src, picture.link.href);
  assert.equal(h.image.alt, "替代文字"); assert.match(h.caption.textContent, /图片标题/);
  assert.doesNotMatch(h.caption.textContent, /点击图片查看大图/);
  assert.equal(h.scrollRoot.scrollTop, 240); assert.equal(h.scrollRoot.scrollLeft, 16);
  assert.equal(h.window.location.hash, "#project/picture");
});

test("modified, nonprimary, already-handled, external and nonimage clicks keep their original action", () => {
  const h = harness(); h.init(); const picture = h.figure();
  for (const values of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true },
    { button: 1 }, { button: 2 }, { defaultPrevented: true }]) {
    const event = h.click(picture.media, values);
    if (!values.defaultPrevented) assert.equal(event.defaultPrevented, false);
    assert.equal(h.api.isOpen(), false); assert.equal(h.shows, 0);
  }
  for (const options of [{ href: "https://other.test/picture.svg" }, { href: "data:image/svg+xml,test" },
    { tag: "video" }, { external: true }]) {
    const item = h.figure(options);
    assert.equal(h.click(item.media).defaultPrevented, false);
    assert.equal(h.api.isOpen(), false);
  }
  picture.link.setAttribute("download", "picture.svg");
  assert.equal(h.click(picture.media).defaultPrevented, false);
  picture.link.removeAttribute("download");
  picture.link.className = "download";
  assert.equal(h.click(picture.media).defaultPrevented, false);
});

for (const options of [{ support: false }, { showThrows: true }]) {
  test(`unsupported or refused modal leaves the image link usable: ${JSON.stringify(options)}`, () => {
    const h = harness(options); h.init(); const picture = h.figure();
    assert.equal(h.click(picture.media).defaultPrevented, false);
    assert.equal(h.api.isOpen(), false); assert.equal(h.openings, 0);
  });
}

test("closing restores scroll and trigger focus without scrolling or changing route", () => {
  const h = harness(); h.init(); const picture = h.figure();
  h.scrollRoot.scrollTop = 170; h.scrollRoot.scrollLeft = 12; picture.link.focus();
  h.click(picture.media); h.scrollRoot.scrollTop = 900; h.scrollRoot.scrollLeft = 0;
  h.click(h.closeButton);
  assert.equal(h.api.isOpen(), false); assert.equal(h.dialog.open, false);
  assert.equal(h.scrollRoot.scrollTop, 170); assert.equal(h.scrollRoot.scrollLeft, 12);
  assert.equal(h.document.activeElement, picture.link);
  assert.equal(picture.link.focuses.at(-1).preventScroll, true);
  assert.equal(h.window.location.hash, "#project/picture");
  h.api.close(); assert.equal(h.openings, 1);
});

test("navigation can close without restoring the previous focus or reading position", () => {
  const h = harness(); h.init(); const picture = h.figure();
  h.scrollRoot.scrollTop = 170; h.scrollRoot.scrollLeft = 12; h.click(picture.media);
  h.closeButton.focus(); h.scrollRoot.scrollTop = 320; h.scrollRoot.scrollLeft = 20;
  h.api.close({ restoreFocus: false, restoreScroll: false });
  assert.equal(h.api.isOpen(), false); assert.equal(h.dialog.open, false);
  assert.equal(h.scrollRoot.scrollTop, 320); assert.equal(h.scrollRoot.scrollLeft, 20);
  assert.equal(picture.link.focuses.length, 0); assert.equal(h.scrollRoot.focuses.length, 0);
});

test("image, caption and toolbar do not dismiss; blank stage, dialog and cancel do", () => {
  const h = harness(); h.init(); const picture = h.figure();
  for (const target of [h.image, h.caption, h.toolbar]) {
    h.click(picture.media); h.click(target); assert.equal(h.api.isOpen(), true); h.api.close();
  }
  for (const target of [h.stage, h.dialog]) {
    h.click(picture.media); h.click(target); assert.equal(h.api.isOpen(), false);
  }
  h.click(picture.media); h.dialog.emit("cancel"); assert.equal(h.api.isOpen(), false);
});

test("a removed trigger falls back to the connected reading root and hash navigation closes the viewer", () => {
  const h = harness(); h.init(); const picture = h.figure();
  h.scrollRoot.scrollTop = 230; h.click(picture.media); picture.figure.remove();
  h.scrollRoot.scrollTop = 0;
  h.window.emit("hashchange");
  assert.equal(h.api.isOpen(), false); assert.equal(h.document.activeElement, h.scrollRoot);
  assert.equal(h.scrollRoot.focuses.at(-1).preventScroll, true); assert.equal(h.scrollRoot.scrollTop, 0);
});

test("replacement of the record root cannot restore focus into detached content", () => {
  const h = harness(); h.init(); const picture = h.figure();
  h.click(picture.media); h.root.remove(); h.api.close();
  assert.equal(h.api.isOpen(), false); assert.equal(h.document.activeElement, h.scrollRoot);
  assert.equal(picture.link.focuses.length, 0); assert.equal(h.scrollRoot.focuses.at(-1).preventScroll, true);
});

test("load and failure states provide feedback while preserving the caption and close action", () => {
  const h = harness(); h.init(); const first = h.figure();
  h.click(first.media);
  assert.equal(h.dialog.dataset.state, "loading"); assert.equal(h.image.hidden, true);
  assert.match(h.status.textContent, /加载/);
  h.settle();
  assert.equal(h.dialog.dataset.state, "ready"); assert.equal(h.image.hidden, false);
  assert.equal(h.image.src, first.link.href);
  h.api.close();
  const second = h.figure({ href: "./assets/missing.svg", captionText: "未加载图片的说明" });
  h.click(second.media); h.settle(undefined, "error");
  assert.equal(h.dialog.dataset.state, "error"); assert.equal(h.image.hidden, true);
  assert.match(h.status.textContent, /加载|无法/); assert.match(h.caption.textContent, /未加载图片的说明/);
  h.click(h.closeButton); assert.equal(h.api.isOpen(), false);
});

test("late load/error callbacks and queued native close events cannot corrupt the next image", () => {
  const h = harness(); h.init(); const first = h.figure();
  h.click(first.media);
  const oldLoader = h.pendingImages.at(-1);
  const oldLoad = [...(oldLoader.listeners.get("load") || [])];
  const oldError = [...(oldLoader.listeners.get("error") || [])];
  assert.equal(oldLoad.length > 0 && oldError.length > 0, true);
  h.api.close();
  assert.equal(oldLoader.listeners.get("load")?.size || 0, 0);
  assert.equal(oldLoader.listeners.get("error")?.size || 0, 0);
  const second = h.figure({ href: "./assets/second.svg?v=two", alt: "第二张替代文字", captionText: "第二张说明" });
  h.click(second.media); const currentLoader = h.pendingImages.at(-1);
  assert.notEqual(currentLoader, oldLoader);
  const state = () => ({ open: h.api.isOpen(), phase: h.dialog.dataset.state,
    src: h.image.src, hidden: h.image.hidden, caption: h.caption.textContent, status: h.status.textContent });
  const loading = state();
  oldLoad.forEach(callback => callback({ type: "load", target: oldLoader }));
  oldError.forEach(callback => callback({ type: "error", target: oldLoader }));
  h.dialog.emit("close");
  assert.deepEqual(state(), loading);
  h.settle(currentLoader);
  assert.equal(h.image.src, second.link.href); assert.equal(h.image.alt, "第二张替代文字");
  const ready = state();
  oldError.forEach(callback => callback({ type: "error", target: oldLoader }));
  assert.deepEqual(state(), ready);
  const currentLoad = [...(currentLoader.listeners.get("load") || [])];
  const currentError = [...(currentLoader.listeners.get("error") || [])];
  h.api.close(); const closed = state();
  [...currentLoad, ...currentError].forEach(callback => callback({ target: currentLoader }));
  assert.deepEqual(state(), closed);
});

function settleComparison(h, firstSize = [1200, 800], secondSize = [1650, 1042]) {
  const images = [h.comparison.querySelector('img[slot="first"]'), h.comparison.querySelector('img[slot="second"]')];
  images.forEach((media, index) => {
    const [naturalWidth, naturalHeight] = index ? secondSize : firstSize;
    Object.assign(media, { complete: true, naturalWidth, naturalHeight });
    media.emit("load");
  });
  return images;
}

test("comparison activation clones both same-origin images, labels the dialog and waits for both images", () => {
  const h = harness(); h.init(); const original = h.comparisonFigure();
  original.second.setAttribute("srcset", "https://other.test/larger.png 2x");
  original.second.setAttribute("sizes", "100vw");
  original.slider.setAttribute("onclick", "unexpected()");
  h.resizeStage(800, 400);
  assert.equal(h.click(original.expand).defaultPrevented, true);
  assert.equal(h.api.isOpen(), true); assert.equal(h.dialog.dataset.mode, "comparison");
  assert.equal(h.dialog.dataset.state, "loading"); assert.equal(h.comparison.hidden, true);
  assert.equal(h.image.hidden, true); assert.equal(h.title.textContent, "图片对比");
  assert.equal(h.caption.textContent, "直接光照 / 加入间接光照");
  assert.equal(h.comparisonInitializations.length, 1);
  assert.equal(h.comparisonInitializations[0], h.comparison);
  const copy = h.comparison.querySelector("[data-image-comparison]");
  const first = copy.querySelector('img[slot="first"]'), second = copy.querySelector('img[slot="second"]');
  assert.notEqual(copy, original.region); assert.notEqual(first, original.first);
  assert.equal(original.region.parentElement, original.figure);
  assert.equal(first.src, original.first.src); assert.equal(second.src, original.second.src);
  assert.equal(first.id, ""); assert.equal(second.hasAttribute("loading"), false);
  assert.equal(second.hasAttribute("srcset"), false); assert.equal(second.hasAttribute("sizes"), false);
  assert.equal(copy.querySelector("img-comparison-slider").hasAttribute("onclick"), false);
  assert.equal(copy.querySelector("img-comparison-slider").getAttribute("aria-describedby"), "image-viewer-caption");
  Object.assign(first, { naturalWidth: 1200, naturalHeight: 800 }); first.emit("load");
  assert.equal(h.dialog.dataset.state, "loading"); assert.equal(h.comparison.hidden, true);
  Object.assign(second, { naturalWidth: 1650, naturalHeight: 1042 }); second.emit("load");
  assert.equal(h.dialog.dataset.state, "ready"); assert.equal(h.comparison.hidden, false); assert.equal(h.status.hidden, true);
  assert.equal(h.comparison.style["--comparison-ratio"], "1.5");
  assert.equal(h.comparison.style.width, "600px"); assert.equal(h.comparison.style.height, "400px");
  h.resizeStage(400, 700);
  assert.equal(h.comparison.style.width, "400px");
  assert.equal(parseFloat(h.comparison.style.height), 400 / 1.5);
});

test("comparison controls and labels keep the dialog open; closing cleans the clone and restores the trigger", () => {
  const h = harness(); h.init(); const original = h.comparisonFigure();
  h.scrollRoot.scrollTop = 210; h.scrollRoot.scrollLeft = 9;
  h.click(original.expand); const [first, second] = settleComparison(h);
  for (const target of [h.comparison, first, second, h.comparison.querySelector("img-comparison-slider"),
    h.comparison.querySelector(".comparison-label"), h.caption]) {
    h.click(target); assert.equal(h.api.isOpen(), true);
  }
  assert.equal(h.click(original.expand).defaultPrevented, true); assert.equal(h.shows, 1);
  h.scrollRoot.scrollTop = 700; h.scrollRoot.scrollLeft = 0;
  h.click(h.closeButton);
  assert.equal(h.api.isOpen(), false); assert.equal(h.comparison.hidden, true);
  assert.equal(h.comparison.children.length, 0); assert.equal(first.src, ""); assert.equal(second.src, "");
  assert.equal(h.comparison.style.width, undefined); assert.equal(h.observers[0].disconnected, true);
  assert.equal(h.scrollRoot.scrollTop, 210); assert.equal(h.scrollRoot.scrollLeft, 9);
  assert.equal(h.document.activeElement, original.expand); assert.equal(original.expand.focuses.at(-1).preventScroll, true);
  assert.equal(original.first.src.endsWith("before.png?v=one"), true); assert.equal(original.region.isConnected, true);
});

test("comparison validates both URLs and leaves modified, external or malformed activation untouched", () => {
  const h = harness(); h.init(); const original = h.comparisonFigure();
  for (const values of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true },
    { button: 1 }, { button: 2 }, { defaultPrevented: true }]) {
    h.click(original.expand, values); assert.equal(h.api.isOpen(), false);
  }
  for (const options of [{ before: "https://other.test/before.png" }, { after: "https://other.test/after.png" },
    { before: "data:image/png;base64,abc" }, { after: "javascript:unexpected()" }, { after: "" }, { external: true }]) {
    const item = h.comparisonFigure(options);
    assert.equal(h.click(item.expand).defaultPrevented, false); assert.equal(h.api.isOpen(), false);
  }
  original.second.remove();
  assert.equal(h.click(original.expand).defaultPrevented, false); assert.equal(h.shows, 0);
});

test("comparison failures preserve the caption and close control without exposing a partial comparison", () => {
  for (const failedSlot of ["first", "second"]) {
    const h = harness(); h.init(); const original = h.comparisonFigure(); h.click(original.expand);
    const failed = h.comparison.querySelector(`img[slot="${failedSlot}"]`);
    failed.emit("error");
    assert.equal(h.dialog.dataset.state, "error"); assert.equal(h.comparison.hidden, true);
    assert.match(h.status.textContent, /对比图片.*无法/); assert.match(h.caption.textContent, /直接光照.*间接光照/);
    settleComparison(h);
    assert.equal(h.dialog.dataset.state, "error");
    h.dialog.emit("cancel"); assert.equal(h.api.isOpen(), false);
  }
  const h = harness({ comparisonThrows: true }); h.init(); const original = h.comparisonFigure();
  h.click(original.expand); assert.equal(h.dialog.dataset.state, "error");
  h.click(h.closeButton); assert.equal(h.api.isOpen(), false);
});

test("late comparison callbacks and navigation cannot corrupt a newly opened image or comparison", () => {
  const h = harness(); h.init(); const original = h.comparisonFigure(); h.click(original.expand);
  const oldImages = [...h.comparison.querySelectorAll("img")];
  const oldCallbacks = oldImages.flatMap(media => [...(media.listeners.get("load") || []), ...(media.listeners.get("error") || [])]);
  h.api.close();
  oldImages.forEach(media => {
    assert.equal(media.listeners.get("load")?.size, 0); assert.equal(media.listeners.get("error")?.size, 0);
  });
  const picture = h.figure({ captionText: "单图预览" }); h.click(picture.media); h.settle();
  const state = () => ({ phase: h.dialog.dataset.state, mode: h.dialog.dataset.mode, caption: h.caption.textContent,
    image: h.image.src, comparisonHidden: h.comparison.hidden });
  const ordinary = state(); oldCallbacks.forEach(callback => callback()); h.dialog.emit("close");
  assert.deepEqual(state(), ordinary);
  h.api.close(); h.click(original.expand); settleComparison(h);
  const reopened = state(); oldCallbacks.forEach(callback => callback()); assert.deepEqual(state(), reopened);
  h.scrollRoot.scrollTop = 500; original.figure.remove(); h.window.emit("hashchange");
  assert.equal(h.api.isOpen(), false); assert.equal(h.comparison.children.length, 0);
  assert.equal(h.scrollRoot.scrollTop, 500); assert.equal(h.document.activeElement, h.scrollRoot);
});

test("comparison resize fallback is removed on close and unavailable enhancement leaves ordinary images working", () => {
  const h = harness({ resizeSupport: false }); h.init(); const original = h.comparisonFigure();
  h.click(original.expand); settleComparison(h);
  assert.equal(h.window.listeners.get("resize")?.size, 1);
  h.resizeStage(300, 200); assert.equal(h.comparison.style.width, "300px");
  h.api.close(); assert.equal(h.window.listeners.get("resize")?.size, 0);
  for (const options of [{ comparisonSupport: false }, { support: false }, { showThrows: true }]) {
    const unavailable = harness(options); unavailable.init(); const item = unavailable.comparisonFigure();
    assert.equal(unavailable.click(item.expand).defaultPrevented, false); assert.equal(unavailable.api.isOpen(), false);
    if (options.comparisonSupport === false) {
      const picture = unavailable.figure(); unavailable.click(picture.media); unavailable.settle();
      assert.equal(unavailable.image.hidden, false);
    }
  }
});
