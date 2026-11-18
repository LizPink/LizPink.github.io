// Reveal complete semantic rows without changing content, layout, focus or scroll.
(() => {
  "use strict";

  const played = new WeakSet();
  const reducedMotion = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  let active = null;

  function collect(container, projectViewport) {
    const units = [];
    const add = (...nodes) => {
      const row = nodes.filter(node => {
        if (!node) return false;
        if (!projectViewport) return true;
        const rect = node.getBoundingClientRect();
        return rect.bottom > projectViewport.top && rect.top < projectViewport.bottom && rect.bottom > rect.top;
      });
      if (row.length) units.push(row);
    };
    if (projectViewport) {
      const article = container.querySelector(":scope > .content-reader > .sample-entry, :scope > .sample-entry");
      if (article) {
        add(article.querySelector(":scope > .sample-heading"));
        add(article.querySelector(":scope > .reader-date"));
        const body = article.querySelector(":scope > .article-layout > .article-body");
        for (let index = 0; body && index < Math.min(3, body.children.length); index++) {
          const block = body.children[index];
          if (!/^(p|h[2-6])$/i.test(block.tagName)) break;
          add(block);
        }
        return { units, help: false };
      }
    }
    const help = container.querySelector(":scope > .help-reference");
    if (help) {
      add(help.querySelector(":scope > .summary-title"));
      help.querySelectorAll(":scope > .help-group").forEach(group => {
        const title = group.querySelector(":scope > .help-group-title");
        const rows = [...group.querySelectorAll(":scope > .help-commands > div")];
        if (!rows.length) add(title);
        rows.forEach((row, index) => add(index === 0 ? title : null, row));
      });
      add(help.querySelector(":scope > .help-keys"));
      return { units, help: true };
    }

    const summary = container.querySelector(":scope > .output-summary");
    if (summary) {
      add(summary.querySelector(":scope > .summary-title"), summary.querySelector(":scope > .summary-description"));
      summary.querySelectorAll(":scope > .summary-facts > div").forEach(node => add(node));
      const overview = summary.querySelector(":scope > .summary-overview");
      const title = overview?.querySelector(":scope > .summary-section-title");
      const rows = [...(overview?.querySelectorAll(":scope > .summary-preview > li") || [])];
      if (rows.length) rows.forEach((row, index) => add(index === 0 ? title : null, row));
      else add(title, overview?.querySelector(":scope > .summary-empty"));
    }
    add(container.querySelector(":scope > .output-details > summary"));
    return { units, help: false };
  }

  function finishSession(session) {
    // A previous animation's settled promise must never finish a newer output.
    if (active !== session) return;
    active = null;
    session.container.dataset.streaming = "false";
    session.cleanup();
    session.cleanup = null;
    session.container = null;
    const animations = session.animations;
    session.animations = [];
    animations.forEach(animation => {
      try { animation.cancel(); } catch { /* Default styles already show the row. */ }
    });
  }

  function finish() {
    if (active) finishSession(active);
  }

  function listen(session) {
    const container = session.container;
    const stop = () => finishSession(session);
    const onVisibility = () => { if (document.hidden) stop(); };
    const onPreference = () => { if (reducedMotion.matches) stop(); };
    const onSelection = () => {
      const selection = window.getSelection?.();
      if (!selection || selection.isCollapsed) return;
      if (container.contains(selection.anchorNode) || container.contains(selection.focusNode) ||
          selection.containsNode?.(container, true)) stop();
    };
    // Capture runs before a row's controls handle the user's interaction.
    container.addEventListener("pointerdown", stop, true);
    container.addEventListener("focusin", stop, true);
    document.addEventListener("selectionchange", onSelection);
    document.addEventListener("visibilitychange", onVisibility);
    if (typeof reducedMotion?.addEventListener === "function") {
      reducedMotion.addEventListener("change", onPreference);
    } else reducedMotion?.addListener?.(onPreference);
    session.cleanup = () => {
      container.removeEventListener("pointerdown", stop, true);
      container.removeEventListener("focusin", stop, true);
      document.removeEventListener("selectionchange", onSelection);
      document.removeEventListener("visibilitychange", onVisibility);
      if (typeof reducedMotion?.removeEventListener === "function") {
        reducedMotion.removeEventListener("change", onPreference);
      } else reducedMotion?.removeListener?.(onPreference);
    };
  }

  function play(container, {projectViewport = null} = {}) {
    finish();
    if (!container?.dataset || typeof container.querySelector !== "function" || played.has(container)) return;
    played.add(container);
    container.dataset.streamed = "true";
    container.dataset.streaming = "false";
    if (document.hidden || reducedMotion?.matches) return;
    const { units, help } = collect(container, projectViewport);
    if (!units.length || units.some(row => row.some(node => typeof node.animate !== "function"))) return;

    const detailed = help || Boolean(projectViewport);
    const duration = detailed ? 120 : 100;
    const budget = detailed ? 550 : 280;
    const interval = units.length > 1
      ? Math.min(detailed ? 44 : 36, (budget - duration) / (units.length - 1)) : 0;
    const session = { container, animations: [], pending: 0, cleanup: null };
    active = session;
    container.dataset.streaming = "true";
    listen(session);
    try {
      units.forEach((row, index) => row.forEach(node => {
        const animation = node.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration, delay: index * interval, easing: "ease-out", fill: "backwards"
        });
        session.animations.push(animation);
        session.pending += 1;
        Promise.resolve(animation.finished).then(() => {
          if (active !== session) return;
          session.pending -= 1;
          if (session.pending === 0) finishSession(session);
        }, () => finishSession(session));
      }));
    } catch {
      // If WAAPI is restricted or fails, keep the complete static result usable.
      finishSession(session);
    }
  }

  window.LIZPINK_OUTPUT_MOTION = Object.freeze({ play, finish, isPlaying: () => active !== null });
})();
