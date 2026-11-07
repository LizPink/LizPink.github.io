// A content index and an independently resizable reading sidebar.
(() => {
  "use strict";

  const DEFAULT_WIDTH = 200;
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 420;
  const CONTENT_MIN_WIDTH = 320;
  const titles = { home: "全部内容", help: "全部内容", life: "生活", resume: "经历", project: "项目" };
  const media = window.matchMedia("(max-width: 760px)");
  let initialized = false;
  let opened = false;
  let desktopOpen = true;
  let preferredWidth = DEFAULT_WIDTH;
  let renderedWidth = null;
  let widthFrame = null;
  let drag = null;
  let listSignature = null;
  let onLayout = () => {};
  let frame, layout, menu, reveal, collapse, backdrop, resizer, reading, list;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function limits() {
    const available = layout.clientWidth || window.innerWidth;
    return { min: MIN_WIDTH, max: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, available - CONTENT_MIN_WIDTH)) };
  }
  function bounded(width) {
    const { min, max } = limits();
    return Math.round(Math.min(max, Math.max(min, width)));
  }
  function applyWidth(width) {
    const value = bounded(width);
    const { min, max } = limits();
    resizer.setAttribute("aria-valuemin", String(min));
    resizer.setAttribute("aria-valuemax", String(max));
    resizer.setAttribute("aria-valuenow", String(value));
    resizer.setAttribute("aria-valuetext", `目录宽度 ${value} 像素`);
    if (value !== renderedWidth) {
      renderedWidth = value;
      frame.style.setProperty("--sidebar-width", `${value}px`);
      onLayout();
    }
  }
  function flushWidth() {
    if (widthFrame !== null) window.cancelAnimationFrame(widthFrame);
    widthFrame = null;
    if (drag) applyWidth(drag.nextWidth);
  }
  function queueWidth() {
    if (widthFrame !== null) return;
    widthFrame = window.requestAnimationFrame(() => {
      widthFrame = null;
      if (drag) applyWidth(drag.nextWidth);
    });
  }
  function endDrag(cancelled = false) {
    if (!drag) return;
    const session = drag;
    if (!cancelled) flushWidth();
    else if (widthFrame !== null) window.cancelAnimationFrame(widthFrame);
    widthFrame = null;
    drag = null;
    preferredWidth = cancelled ? session.originalPreference : renderedWidth;
    frame.dataset.resizing = "false";
    document.body.style.userSelect = session.userSelect;
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", finishDrag);
    window.removeEventListener("pointercancel", cancelDrag);
    try {
      if (resizer.hasPointerCapture(session.pointerId)) resizer.releasePointerCapture(session.pointerId);
    } catch { /* Window listeners still provide cancellation when capture is unavailable. */ }
    if (cancelled) applyWidth(preferredWidth);
  }
  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.nextWidth = drag.startWidth + event.clientX - drag.startX;
    queueWidth();
  }
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.nextWidth = drag.startWidth + event.clientX - drag.startX;
    endDrag();
  }
  function cancelDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    endDrag(true);
  }
  function startDrag(event) {
    if (media.matches || !opened || event.button !== 0 || event.isPrimary === false) return;
    endDrag(true);
    event.preventDefault();
    resizer.focus({ preventScroll: true });
    drag = {
      pointerId: event.pointerId, startX: event.clientX, startWidth: renderedWidth,
      nextWidth: renderedWidth, originalPreference: preferredWidth, userSelect: document.body.style.userSelect
    };
    frame.dataset.resizing = "true";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", cancelDrag);
    try { resizer.setPointerCapture(event.pointerId); } catch { /* The window listeners remain active. */ }
  }
  function setOpen(value, { focusInside = false, restoreFocus = false } = {}) {
    if (!value) endDrag(true);
    const wasInside = menu.contains(document.activeElement) || document.activeElement === resizer;
    opened = Boolean(value);
    // Release the reading region before moving focus out of the drawer.
    reading.inert = opened && media.matches;
    menu.hidden = !opened;
    backdrop.hidden = !opened || !media.matches;
    resizer.hidden = !opened || media.matches;
    frame.dataset.menuOpen = String(opened);
    frame.dataset.menuPeek = "false";
    frame.dataset.menuPinned = String(opened && !media.matches);
    reveal.hidden = false;
    reveal.setAttribute("aria-expanded", String(opened));
    reveal.setAttribute("aria-label", opened ? "收起目录" : "展开目录");
    reveal.title = opened ? "收起目录" : "展开目录";
    collapse.setAttribute("aria-label", media.matches ? "关闭目录" : "收起目录");
    collapse.title = media.matches ? "关闭目录" : "收起目录";
    if (opened && focusInside) collapse.focus({ preventScroll: true });
    else if (!opened && (restoreFocus || wasInside)) reveal.focus({ preventScroll: true });
    onLayout();
  }
  function close({ restoreFocus = false } = {}) {
    if (!initialized) return;
    if (!media.matches) desktopOpen = false;
    setOpen(false, { restoreFocus });
  }
  function visibleControls() {
    return [...menu.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")]
      .filter(node => !node.closest("[hidden], [inert]") && node.getClientRects().length > 0);
  }
  function onKeydown(event) {
    if (event.key === "Escape" && drag) {
      event.preventDefault(); event.stopPropagation(); endDrag(true); return;
    }
    if (media.matches && opened) {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); close({ restoreFocus: true }); return;
      }
      if (event.key === "Tab") {
        const controls = visibleControls();
        if (!controls.length) return;
        const position = controls.indexOf(document.activeElement);
        const next = position < 0 ? (event.shiftKey ? controls.length - 1 : 0)
          : (position + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
        event.preventDefault(); event.stopPropagation(); controls[next].focus();
      }
    } else if (opened && event.key === "Escape" && (menu.contains(document.activeElement) || document.activeElement === resizer)) {
      event.preventDefault(); event.stopPropagation(); close({ restoreFocus: true });
    }
  }
  function resizeKey(event) {
    if (media.matches || !opened || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    endDrag(true);
    const { min, max } = limits();
    preferredWidth = event.key === "Home" ? min : event.key === "End" ? max
      : bounded(renderedWidth + (event.key === "ArrowLeft" ? -16 : 16));
    applyWidth(preferredWidth);
  }
  function onGeometry() {
    endDrag(true);
    applyWidth(preferredWidth);
  }
  function init(options = {}) {
    if (typeof options.onLayout === "function") onLayout = options.onLayout;
    if (initialized) return;
    frame = document.querySelector("#terminal-frame");
    layout = document.querySelector(".frame-layout");
    menu = document.querySelector("#route-menu");
    reveal = document.querySelector("#menu-reveal");
    collapse = document.querySelector("#menu-close");
    backdrop = document.querySelector("#menu-backdrop");
    resizer = document.querySelector("#sidebar-resizer");
    reading = document.querySelector(".frame-main");
    list = document.querySelector("#content-list");
    if (![frame, layout, menu, reveal, collapse, backdrop, resizer, reading, list].every(Boolean)) return;
    initialized = true;
    frame.dataset.resizing = "false";
    reveal.addEventListener("click", () => {
      if (!media.matches) desktopOpen = !opened;
      setOpen(!opened, { focusInside: media.matches });
    });
    collapse.addEventListener("click", () => close({ restoreFocus: true }));
    backdrop.addEventListener("click", () => close({ restoreFocus: true }));
    resizer.addEventListener("pointerdown", startDrag);
    resizer.addEventListener("lostpointercapture", cancelDrag);
    resizer.addEventListener("keydown", resizeKey);
    resizer.addEventListener("dblclick", () => {
      endDrag(true); preferredWidth = DEFAULT_WIDTH; applyWidth(preferredWidth);
    });
    document.addEventListener("keydown", onKeydown, true);
    window.addEventListener("blur", () => endDrag(true));
    media.addEventListener("change", () => {
      endDrag(true);
      setOpen(!media.matches && desktopOpen);
      applyWidth(preferredWidth);
    });
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(onGeometry).observe(layout);
    else window.addEventListener("resize", onGeometry);
    applyWidth(preferredWidth);
    setOpen(!media.matches && desktopOpen);
  }
  function update(route, key = null) {
    if (!initialized) init();
    if (!initialized) return;
    route = Object.hasOwn(titles, route) ? route : "home";
    const items = window.LIZPINK_CONTENT_INDEX.items(route);
    const signature = JSON.stringify([route, items]);
    document.querySelector("#content-index-title").textContent = titles[route];
    document.querySelector("#content-index-count").textContent = `${items.length} 项`;
    menu.querySelectorAll("[data-route]").forEach(button => {
      if (button.dataset.route === route) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (signature !== listSignature) {
      const rows = items.map(item => {
        const row = element("li");
        const button = element("button", "content-item");
        button.type = "button";
        button.dataset.contentRoute = item.route;
        button.dataset.contentKey = item.key;
        const meta = element("span", "content-item-meta");
        meta.append(element("span", "content-item-section", item.routeTitle));
        if (item.date) {
          const time = element("time", "", item.date.text);
          time.dateTime = item.date.value;
          meta.append(time);
        }
        button.setAttribute("aria-label", [item.routeTitle,
          item.date && `${item.date.label} ${item.date.text}`,
          item.title].filter(Boolean).join(" "));
        button.append(meta);
        button.append(element("span", "content-item-title", item.title));
        row.append(button); return row;
      });
      if (!rows.length) {
        const row = element("li");
        row.append(element("p", "content-index-empty", "这个栏目还没有内容。")); rows.push(row);
      }
      list.replaceChildren(...rows);
      listSignature = signature;
      list.scrollTop = 0;
    }
    list.querySelectorAll("[data-content-key]").forEach(button => {
      if (button.dataset.contentRoute === route && button.dataset.contentKey === key) button.setAttribute("aria-current", "location");
      else button.removeAttribute("aria-current");
    });
  }

  window.LIZPINK_SIDEBAR = Object.freeze({ init, update, close, isOpen: () => opened, isMobile: () => media.matches });
})();
