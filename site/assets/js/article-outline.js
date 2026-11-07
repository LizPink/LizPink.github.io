// Per-article navigation shares the reader's scroll root and never changes its route.
(() => {
  "use strict";

  const sessions = new Set();
  const mounted = new WeakMap();
  const WIDE_WIDTH = 1000;
  const noop = () => {};
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function mount({ layout, body, headings, scrollRoot, onNavigate = noop, onLayout = noop } = {}) {
    if (!layout || !body || !scrollRoot || typeof layout.insertBefore !== "function") return noop;
    mounted.get(layout)?.();
    const nodes = new Map([...body.querySelectorAll("[id]")].map(node => [node.id, node]));
    const seen = new Set();
    const entries = [];
    (Array.isArray(headings) ? headings : []).forEach(heading => {
      if (!heading || ![2, 3].includes(heading.level) || typeof heading.id !== "string" || !heading.id || seen.has(heading.id)) return;
      const target = nodes.get(heading.id);
      if (!target || !/^h[2-6]$/i.test(target.tagName) || typeof heading.text !== "string" || !heading.text.trim()) return;
      let href;
      try { href = `#${encodeURIComponent(heading.id)}`; } catch { return; }
      seen.add(heading.id);
      entries.push({ id: heading.id, text: heading.text, level: heading.level, target, href });
    });
    if (entries.length < 2) return noop;

    let container = layout.closest(".frame-main") || scrollRoot;
    const aside = element("aside", "article-outline");
    const title = element("p", "article-outline-title", "本页目录");
    title.setAttribute("aria-hidden", "true");
    const details = element("details", "article-outline-details");
    const summary = element("summary", "", "本页目录");
    const nav = element("nav", "article-outline-nav");
    nav.setAttribute("aria-label", "本页目录");
    const list = element("ol", "article-outline-list");
    entries.forEach(entry => {
      const row = element("li");
      row.dataset.level = String(entry.level);
      const link = element("a", "article-outline-link", entry.text);
      link.href = entry.href;
      link.dataset.outlineTarget = entry.id;
      row.append(link); list.append(row); entry.link = link;
    });
    nav.append(list); details.append(summary, nav); aside.append(title, details);
    layout.insertBefore(aside, body);

    let disposed = false;
    let frame = null;
    let wide = null;
    let currentId = null;
    let maxHeight = null;
    let wasConnected = layout.isConnected !== false;
    const changedTabindex = new Map();
    const notifyLayout = () => { if (typeof onLayout === "function") onLayout(); };
    function setActive(id) {
      if (id === currentId) return;
      currentId = id;
      entries.forEach(entry => {
        if (entry.id === id) entry.link.setAttribute("aria-current", "location");
        else entry.link.removeAttribute("aria-current");
      });
    }
    function update() {
      frame = null;
      if (disposed) return;
      if (layout.isConnected === false) { if (wasConnected) dispose(); return; }
      wasConnected = true;
      const nextContainer = layout.closest(".frame-main") || scrollRoot;
      if (nextContainer !== container) { container = nextContainer; observer?.observe(container); }
      const nextWide = container.clientWidth >= WIDE_WIDTH;
      if (nextWide !== wide) {
        wide = nextWide;
        details.open = wide;
        aside.dataset.wide = String(wide);
        notifyLayout();
      }
      const composer = container.querySelector(".command-area");
      const nextMaxHeight = Math.max(48, scrollRoot.clientHeight - Math.max(64, composer?.offsetHeight || 0) - 72);
      if (nextMaxHeight !== maxHeight) {
        maxHeight = nextMaxHeight;
        aside.style.setProperty("--outline-max-height", `${maxHeight}px`);
      }
      if (!body.getClientRects().length) return;
      const threshold = scrollRoot.getBoundingClientRect().top + 24;
      let active = entries[0];
      entries.forEach(entry => { if (entry.target.getBoundingClientRect().top <= threshold + 1) active = entry; });
      const maxScroll = scrollRoot.scrollHeight - scrollRoot.clientHeight;
      if (maxScroll > 1 && scrollRoot.scrollTop >= maxScroll - 2) active = entries.at(-1);
      setActive(active.id);
    }
    function queueUpdate() {
      if (disposed || frame !== null) return;
      frame = window.requestAnimationFrame(update);
    }
    function select(event) {
      const link = event.target.closest("[data-outline-target]");
      if (!link || !nav.contains(link)) return;
      const entry = entries.find(item => item.id === link.dataset.outlineTarget);
      if (!entry) return;
      event.preventDefault();
      if (typeof onNavigate === "function") onNavigate(entry.id);
      if (!wide) details.open = false;
      // Read final positions after collapsing the inline directory. Keep all
      // scrolling inside the terminal rather than moving its ancestor surfaces.
      const offset = entry.target.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top;
      scrollRoot.scrollTop = Math.max(0, Math.min(scrollRoot.scrollHeight - scrollRoot.clientHeight, scrollRoot.scrollTop + offset - 24));
      if (!entry.target.hasAttribute("tabindex")) {
        changedTabindex.set(entry.target, null);
        entry.target.setAttribute("tabindex", "-1");
      }
      entry.target.focus({ preventScroll: true });
      setActive(entry.id);
      notifyLayout();
      queueUpdate();
    }
    function toggle() {
      if (disposed) return;
      // A keyboard/accessibility toggle must not hide a wide-screen directory.
      if (wide && !details.open) details.open = true;
      notifyLayout();
      queueUpdate();
    }
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(queueUpdate) : null;
    function dispose() {
      if (disposed) return;
      disposed = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      scrollRoot.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      body.removeEventListener("load", queueUpdate, true);
      body.removeEventListener("loadedmetadata", queueUpdate, true);
      body.removeEventListener("error", queueUpdate, true);
      nav.removeEventListener("click", select);
      details.removeEventListener("toggle", toggle);
      observer?.disconnect();
      changedTabindex.forEach((value, node) => {
        if (value === null) node.removeAttribute("tabindex"); else node.setAttribute("tabindex", value);
      });
      changedTabindex.clear();
      aside.remove();
      sessions.delete(dispose);
      if (mounted.get(layout) === dispose) mounted.delete(layout);
      notifyLayout();
    }
    sessions.add(dispose);
    mounted.set(layout, dispose);
    scrollRoot.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);
    body.addEventListener("load", queueUpdate, true);
    body.addEventListener("loadedmetadata", queueUpdate, true);
    body.addEventListener("error", queueUpdate, true);
    nav.addEventListener("click", select);
    details.addEventListener("toggle", toggle);
    if (observer) [...new Set([container, scrollRoot, body])].forEach(node => observer.observe(node));
    setActive(entries[0].id);
    update();
    document.fonts?.ready?.then(queueUpdate, noop);
    return dispose;
  }

  function clear() { [...sessions].forEach(dispose => dispose()); }
  window.LIZPINK_OUTLINE = Object.freeze({ mount, clear });
})();
