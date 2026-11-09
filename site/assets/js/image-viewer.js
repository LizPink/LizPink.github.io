// Native dialog enhancement; the original image link remains a usable fallback.
(() => {
  "use strict";

  let root = null;
  let scrollRoot = null;
  let onOpen = () => {};
  let dialog, closeButton, image, caption, status, stage, comparison, title;
  let initialized = false;
  let current = null;
  let sequence = 0;

  function resetImage() {
    image.removeAttribute("src");
    image.alt = "";
    image.hidden = true;
    caption.textContent = "";
    caption.hidden = true;
    status.textContent = "";
    status.hidden = true;
    if (comparison) {
      comparison.replaceChildren();
      comparison.hidden = true;
      comparison.style.removeProperty("width");
      comparison.style.removeProperty("height");
      comparison.style.removeProperty("--comparison-ratio");
    }
    if (title) title.textContent = "图片预览";
    dialog.dataset.mode = "";
    dialog.dataset.state = "closed";
  }
  function finish(session, { restoreFocus = true, restoreScroll = true } = {}) {
    if (current !== session) return;
    current = null;
    if (session.loader) {
      session.loader.removeEventListener("load", session.loaded);
      session.loader.removeEventListener("error", session.failed);
      session.loader.removeAttribute("src");
      session.loader = null;
    }
    for (const release of session.cleanup || []) release();
    resetImage();
    if (restoreFocus) {
      const target = session.trigger.isConnected && session.root.contains(session.trigger)
        ? session.trigger : session.scrollRoot;
      if (target?.isConnected !== false && typeof target?.focus === "function") target.focus({ preventScroll: true });
    }
    if (restoreScroll) {
      session.scrollRoot.scrollTop = session.scrollTop;
      session.scrollRoot.scrollLeft = session.scrollLeft;
    }
  }
  function close(options = {}) {
    const session = current;
    if (!session) return false;
    // Closing is synchronous even though the native close event is queued.
    // Clear this session first so an old event cannot affect a new request.
    current = null;
    try { if (dialog.open) dialog.close(); }
    finally { current = session; finish(session, options); }
    return true;
  }
  function isOpen() { return Boolean(current && dialog?.open); }

  function description(link, sourceImage) {
    const original = link.closest("figure")?.querySelector("figcaption");
    if (!original) return sourceImage.alt || "";
    const copy = original.cloneNode(true);
    copy.querySelectorAll(".media-hint").forEach(node => node.remove());
    return copy.textContent.replace(/\s+/g, " ").trim() || sourceImage.alt || "";
  }
  function load(session) {
    // One probe per open request makes late load/error events unambiguous.
    const loader = document.createElement("img");
    session.loader = loader;
    let settled = false;
    const valid = () => current === session && sequence === session.id && dialog.open;
    session.failed = () => {
      if (!valid() || settled) return;
      settled = true;
      dialog.dataset.state = "error";
      status.textContent = "图片暂时无法显示，请关闭后重试。";
      status.hidden = false;
      image.hidden = true;
    };
    session.loaded = () => {
      if (!valid() || settled) return;
      if (loader.naturalWidth === 0) { session.failed(); return; }
      settled = true;
      image.src = session.src;
      image.hidden = false;
      status.textContent = "";
      status.hidden = true;
      dialog.dataset.state = "ready";
    };
    loader.addEventListener("load", session.loaded);
    loader.addEventListener("error", session.failed);
    loader.src = session.src;
    if (loader.complete && loader.naturalWidth > 0) session.loaded();
  }
  function loadComparison(session) {
    const valid = () => current === session && sequence === session.id && dialog.open;
    const loaded = new Set();
    let settled = false;
    let componentInitialized = false;
    const failed = () => {
      if (!valid() || settled) return;
      settled = true;
      dialog.dataset.state = "error";
      comparison.hidden = true;
      status.textContent = "对比图片暂时无法显示，请关闭后重试。";
      status.hidden = false;
    };
    const fit = () => {
      if (!valid() || comparison.hidden) return;
      const bounds = stage.getBoundingClientRect();
      const ratio = session.images[0].naturalWidth / session.images[0].naturalHeight;
      const width = Math.min(bounds.width, bounds.height * ratio, session.images[0].naturalWidth);
      if (!(width > 0)) return;
      comparison.style.width = `${width}px`;
      comparison.style.height = `${width / ratio}px`;
      comparison.style.setProperty("--comparison-ratio", String(ratio));
    };
    const ready = () => {
      if (!valid() || settled || !componentInitialized || loaded.size !== session.images.length) return;
      settled = true;
      comparison.hidden = false;
      status.hidden = true;
      status.textContent = "";
      dialog.dataset.state = "ready";
      fit();
      if (typeof window.ResizeObserver === "function") {
        const observer = new window.ResizeObserver(fit);
        observer.observe(stage);
        session.cleanup.push(() => observer.disconnect());
      } else {
        window.addEventListener("resize", fit);
        session.cleanup.push(() => window.removeEventListener("resize", fit));
      }
    };
    for (const media of session.images) {
      const onLoad = () => {
        if (!valid() || settled) return;
        if (!(media.naturalWidth > 0 && media.naturalHeight > 0)) { failed(); return; }
        loaded.add(media);
        ready();
      };
      media.addEventListener("load", onLoad);
      media.addEventListener("error", failed);
      session.cleanup.push(() => {
        media.removeEventListener("load", onLoad);
        media.removeEventListener("error", failed);
        media.removeAttribute("src");
      });
      if (media.complete && media.naturalWidth > 0) onLoad();
    }
    comparison.addEventListener("comparisonerror", failed);
    session.cleanup.push(() => comparison.removeEventListener("comparisonerror", failed));
    comparison.replaceChildren(session.region);
    try {
      const frames = window.LIZPINK_IMAGE_COMPARISON.init(comparison);
      if (!frames?.length) { failed(); return; }
      componentInitialized = true;
      ready();
    }
    catch { failed(); }
  }
  function open(session, event) {
    try { dialog.showModal(); } catch { return; }
    if (!dialog.open) return;
    current = session;
    event.preventDefault();
    resetImage();
    dialog.dataset.mode = session.kind;
    dialog.dataset.state = "loading";
    image.alt = session.alt || "";
    caption.textContent = session.caption;
    caption.hidden = !caption.textContent;
    if (title && session.kind === "comparison") title.textContent = "图片对比";
    status.textContent = "正在加载图片…";
    status.hidden = false;
    try { onOpen(); }
    finally {
      if (current === session && dialog.open) {
        closeButton.focus({ preventScroll: true });
        if (session.kind === "comparison") loadComparison(session);
        else load(session);
      }
    }
  }
  function snapshot(trigger, details) {
    return { id: ++sequence, trigger, root, scrollRoot,
      scrollTop: scrollRoot.scrollTop, scrollLeft: scrollRoot.scrollLeft,
      loader: null, loaded: null, failed: null, cleanup: [], ...details };
  }
  function activateComparison(event, button) {
    if (!root.contains(button) || !comparison || typeof window.LIZPINK_IMAGE_COMPARISON?.init !== "function") return;
    const region = button.closest("figure.sample-comparison")?.querySelector("[data-image-comparison]");
    const slider = region?.querySelector("img-comparison-slider");
    const before = slider?.querySelector('img[slot="first"]');
    const after = slider?.querySelector('img[slot="second"]');
    if (!before || !after || region.querySelectorAll("img").length !== 2) return;
    const urls = [];
    try {
      for (const media of [before, after]) {
        if (!media.getAttribute("src")) return;
        const source = new URL(media.getAttribute("src"), document.baseURI);
        if (!["http:", "https:"].includes(source.protocol) || source.origin !== window.location.origin) return;
        urls.push(source.href);
      }
    } catch { return; }
    if (isOpen()) { event.preventDefault(); return; }
    // Clone the build-generated comparison rather than moving the article's
    // live controls. Remove identity, loading and layout state before init.
    const copy = region.cloneNode(true);
    for (const node of [copy, ...copy.querySelectorAll("*")]) {
      node.removeAttribute("id");
      node.removeAttribute("aria-labelledby");
      node.removeAttribute("aria-describedby");
      for (const name of node.getAttributeNames()) if (/^on/i.test(name)) node.removeAttribute(name);
    }
    copy.querySelectorAll("script, iframe, object, embed, link, style").forEach(node => node.remove());
    copy.removeAttribute("style");
    copy.removeAttribute("data-comparison-state");
    copy.className = copy.className.split(/\s+/).filter(name => name !== "comparison-ready").join(" ");
    copy.querySelector("img-comparison-slider").setAttribute("aria-describedby", "image-viewer-caption");
    const images = [copy.querySelector('img[slot="first"]'), copy.querySelector('img[slot="second"]')];
    images.forEach((media, index) => {
      media.removeAttribute("srcset");
      media.removeAttribute("sizes");
      media.removeAttribute("loading");
      media.src = urls[index];
    });
    open(snapshot(button, { kind: "comparison", region: copy, images,
      caption: `${before.alt || "之前"} / ${after.alt || "之后"}` }), event);
  }
  function activate(event) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const button = event.target?.closest?.("button[data-comparison-expand]");
    if (button) { activateComparison(event, button); return; }
    const link = event.target?.closest?.("a.media-zoom");
    if (!link || !root.contains(link) || link.hasAttribute("download")) return;
    const sourceImage = link.querySelector("img");
    if (!sourceImage || !link.getAttribute("href")) return;
    let source;
    try {
      source = new URL(link.href, document.baseURI);
      if (!["http:", "https:"].includes(source.protocol) || source.origin !== window.location.origin) return;
    } catch { return; }
    if (isOpen()) { event.preventDefault(); return; }
    open(snapshot(link, { kind: "image", src: source.href, alt: sourceImage.alt,
      caption: description(link, sourceImage) }), event);
  }
  function init(options = {}) {
    const nextRoot = options.root || root;
    const nextScrollRoot = options.scrollRoot || scrollRoot;
    const nextDialog = document.querySelector("#image-viewer");
    if (!nextRoot || !nextScrollRoot || !nextDialog || typeof nextDialog.showModal !== "function" || typeof nextDialog.close !== "function") return false;
    if (!initialized) {
      dialog = nextDialog;
      closeButton = document.querySelector("#image-viewer-close");
      image = document.querySelector("#image-viewer-image");
      caption = document.querySelector("#image-viewer-caption");
      status = document.querySelector("#image-viewer-status");
      stage = document.querySelector("#image-viewer-stage");
      comparison = document.querySelector("#image-viewer-comparison");
      title = dialog.querySelector(".image-viewer-label");
      if (![closeButton, image, caption, status, stage].every(Boolean)) return false;
      closeButton.addEventListener("click", () => close());
      dialog.addEventListener("cancel", event => {
        if (!current) return;
        event.preventDefault(); close();
      });
      dialog.addEventListener("close", () => { if (current && !dialog.open) close(); });
      dialog.addEventListener("click", event => { if (event.target === dialog || event.target === stage) close(); });
      window.addEventListener("hashchange", () => close({ restoreScroll: false }));
      resetImage();
      initialized = true;
    }
    if (root !== nextRoot) {
      root?.removeEventListener("click", activate);
      root = nextRoot;
      root.addEventListener("click", activate);
    }
    scrollRoot = nextScrollRoot;
    if (typeof options.onOpen === "function") onOpen = options.onOpen;
    return true;
  }

  window.LIZPINK_IMAGE_VIEWER = Object.freeze({ init, close, isOpen });
})();
