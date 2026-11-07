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
function harness({ support = true, showThrows = false } = {}) {
  let document;
  const location = new URL("https://example.test/portfolio/#project/picture");
  class Element extends Signals {
    constructor(tagName, id = "") {
      super(); Object.assign(this, { tagName: tagName.toUpperCase(), id, children: [], parentElement: null,
        attributes: {}, dataset: {}, className: "", hidden: false, open: false, text: "", scrollTop: 0, scrollLeft: 0,
        style: {}, naturalWidth: 0, naturalHeight: 0, complete: false, focuses: [] });
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
        if (value.startsWith("#")) return this.id === value.slice(1);
        const match = value.match(/^([\w-]+)?(?:\.([\w-]+))?$/);
        return Boolean(match && (!match[1] || this.tagName === match[1].toUpperCase()) &&
          (!match[2] || this.className.split(/\s+/).includes(match[2])));
      });
    }
    closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
    querySelector(selector) { return this.descendants().find(node => node.matches(selector)) || null; }
    querySelectorAll(selector) { return this.descendants().filter(node => node.matches(selector)); }
    cloneNode(deep = false) {
      const clone = new Element(this.tagName, this.id);
      Object.assign(clone, { attributes: { ...this.attributes }, className: this.className, text: this.text });
      if (deep) clone.append(...this.children.map(child => child.cloneNode(true)));
      return clone;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return name === "id" ? this.id || null : this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
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
  const caption = new Element("p", "image-viewer-caption"), status = new Element("p", "image-viewer-status");
  const toolbar = new Element("div", "image-viewer-toolbar"), closeButton = new Element("button", "image-viewer-close");
  toolbar.append(closeButton); stage.append(image, status); dialog.append(toolbar, stage, caption); body.append(dialog);
  let shows = 0, openings = 0;
  if (support) dialog.showModal = () => {
    if (showThrows) throw new Error("Browser refused modal");
    shows += 1; dialog.open = true;
  };
  dialog.close = () => { dialog.open = false; dialog.emit("close"); };
  const pendingImages = [];
  const window = Object.assign(new Signals(), { location });
  vm.runInNewContext(fs.readFileSync(sourceFile, "utf8"), { window, document, location, URL });
  const api = window.LIZPINK_IMAGE_VIEWER;
  const options = { root, scrollRoot, onOpen() { assert.equal(dialog.open, true); openings += 1; } };
  return {
    api, options, root, scrollRoot, dialog, stage, image, caption, status, toolbar, closeButton, body, document, window, Element, pendingImages,
    init() { api.init(options); },
    settle(loader = pendingImages.at(-1), type = "load") {
      loader.complete = true; loader.naturalWidth = type === "load" ? 960 : 0; loader.naturalHeight = type === "load" ? 540 : 0;
      loader.emit(type);
    },
    get shows() { return shows; }, get openings() { return openings; },
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
