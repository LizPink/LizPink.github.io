// Native dialog enhancement; the original image link remains a usable fallback.
(() => {
  "use strict";

  let root = null;
  let scrollRoot = null;
  let onOpen = () => {};
  let dialog, closeButton, image, caption, status, stage;
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
  function activate(event) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
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
    const session = {
      id: ++sequence, trigger: link, root, scrollRoot,
      scrollTop: scrollRoot.scrollTop, scrollLeft: scrollRoot.scrollLeft,
      src: source.href, loader: null, loaded: null, failed: null
    };
    try { dialog.showModal(); } catch { return; }
    if (!dialog.open) return;
    current = session;
    event.preventDefault();
    resetImage();
    dialog.dataset.state = "loading";
    image.alt = sourceImage.alt || "";
    caption.textContent = description(link, sourceImage);
    caption.hidden = !caption.textContent;
    status.textContent = "正在加载图片…";
    status.hidden = false;
    try { onOpen(); }
    finally {
      if (current === session && dialog.open) {
        closeButton.focus({ preventScroll: true });
        load(session);
      }
    }
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
