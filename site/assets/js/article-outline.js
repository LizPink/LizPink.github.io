// Per-article navigation shares the reader's scroll root and never changes its route.
(() => {
  "use strict";

  const sessions = new Set();
  const mounted = new WeakMap();
  const WIDE_WIDTH = 1000;
  // Null preserves the responsive default until the visitor makes a choice.
  // Clearing rendered articles deliberately keeps this session preference.
  let visibilityPreference = null;
  let preferenceRevision = 0;
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
    aside.id = `outline-${entries[0].id}`;
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
    let localPreference = visibilityPreference;
    let appliedRevision = preferenceRevision;
    let expectedDetailsOpen = null;
    let lastAvailable = null;
    const changedTabindex = new Map();
    const notifyLayout = () => { if (typeof onLayout === "function") onLayout(); };
    function isAvailable() {
      return !disposed && layout.isConnected !== false && body.getClientRects().length > 0;
    }
    function isOpen() { return !aside.hidden && details.open; }
    function applyVisibility(open) {
      const hidden = wide && !open;
      const changed = aside.hidden !== hidden || details.open !== open;
      const focus = document.activeElement;
      if ((hidden && aside.contains(focus)) || (!open && nav.contains(focus))) scrollRoot.focus({ preventScroll: true });
      expectedDetailsOpen = open;
      details.open = open;
      aside.hidden = hidden;
      if (changed) { notifyLayout(); queueUpdate(); }
      return changed;
    }
    function syncVisibility(force = false) {
      const nextContainer = layout.closest(".frame-main") || scrollRoot;
      if (nextContainer !== container) { container = nextContainer; observer?.observe(container); }
      const available = isAvailable();
      if (available && appliedRevision !== preferenceRevision) {
        localPreference = visibilityPreference;
        appliedRevision = preferenceRevision;
        force = true;
      }
      const nextWide = container.clientWidth >= WIDE_WIDTH;
      const modeChanged = nextWide !== wide;
      if (modeChanged) {
        wide = nextWide;
        aside.dataset.wide = String(wide);
        force = true;
      }
      if (force) {
        const changed = applyVisibility(localPreference === null ? wide : localPreference);
        if (modeChanged && !changed) notifyLayout();
      }
      if (available !== lastAvailable) { lastAvailable = available; notifyLayout(); }
    }
    function setPreference(open, revision) {
      localPreference = open;
      appliedRevision = revision;
      syncVisibility(true);
    }
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
      syncVisibility();
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
      // Auto-collapse this article without replacing the visitor's explicit
      // cross-article preference with a navigation side effect.
      if (!wide) applyVisibility(false);
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
    function disclosureToggle() {
      if (disposed) return;
      if (details.open !== expectedDetailsOpen) {
        // Native summary activation is a local choice; other simultaneously
        // opened articles can retain their own disclosure state.
        localPreference = details.open;
        visibilityPreference = details.open;
        if (!applyVisibility(details.open)) notifyLayout();
      }
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
      details.removeEventListener("toggle", disclosureToggle);
      observer?.disconnect();
      changedTabindex.forEach((value, node) => {
        if (value === null) node.removeAttribute("tabindex"); else node.setAttribute("tabindex", value);
      });
      changedTabindex.clear();
      aside.remove();
      sessions.delete(session);
      if (mounted.get(layout) === dispose) mounted.delete(layout);
      notifyLayout();
    }
    const session = { dispose, isAvailable, isOpen, setPreference };
    sessions.add(session);
    mounted.set(layout, dispose);
    scrollRoot.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);
    body.addEventListener("load", queueUpdate, true);
    body.addEventListener("loadedmetadata", queueUpdate, true);
    body.addEventListener("error", queueUpdate, true);
    nav.addEventListener("click", select);
    details.addEventListener("toggle", disclosureToggle);
    if (observer) [...new Set([container, scrollRoot, body])].forEach(node => observer.observe(node));
    setActive(entries[0].id);
    update();
    document.fonts?.ready?.then(queueUpdate, noop);
    return dispose;
  }

  function availableSessions() { return [...sessions].filter(session => session.isAvailable()); }
  function toggle() {
    const available = availableSessions();
    if (!available.length) return false;
    visibilityPreference = !available.every(session => session.isOpen());
    preferenceRevision += 1;
    available.forEach(session => session.setPreference(visibilityPreference, preferenceRevision));
    return true;
  }
  function isAvailable() { return availableSessions().length > 0; }
  function isOpen() {
    const available = availableSessions();
    return available.length > 0 && available.every(session => session.isOpen());
  }
  function clear() { [...sessions].forEach(session => session.dispose()); }
  window.LIZPINK_OUTLINE = Object.freeze({ mount, clear, toggle, isAvailable, isOpen });
})();
