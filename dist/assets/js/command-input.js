(() => {
  "use strict";
  // Old experience links now resolve to the same final interface.
  const url = new URL(location.href);
  if (url.searchParams.has("input")) {
    url.searchParams.delete("input");
    window.history.replaceState(window.history.state, "", url);
  }

  const main = document.querySelector("#main");
  const frame = document.querySelector(".frame-main");
  const composer = document.querySelector(".command-area");
  const input = document.querySelector("#command-input");
  const suggestions = document.querySelector("#command-suggestions");
  const records = document.querySelector("#terminal-records");
  const slot = document.createElement("div");
  slot.className = "command-origin";
  slot.setAttribute("aria-hidden", "true");
  composer.replaceWith(slot);
  // Move once before app initialization. Scrolling never moves or clones the input.
  frame.append(composer);
  composer.classList.add("command-composer");
  let commandActive = false;
  composer.dataset.commandMode = "false";
  input.placeholder = "输入命令";
  const modeToggle = document.createElement("button");
  modeToggle.type = "button";
  modeToggle.id = "command-mode-toggle";
  modeToggle.className = "command-mode-toggle";
  modeToggle.setAttribute("aria-controls", "command-input");
  modeToggle.setAttribute("aria-pressed", "false");
  modeToggle.setAttribute("aria-label", "按斜杠键或点击开始输入命令");
  modeToggle.textContent = "/ 输入命令";
  composer.querySelector(".command-row").append(modeToggle);
  const modeAnnouncement = document.createElement("span");
  modeAnnouncement.className = "sr-only";
  modeAnnouncement.setAttribute("role", "status");
  composer.append(modeAnnouncement);

  let scheduled;
  let docked = false;
  function setCommandMode(active) {
    if (commandActive === active) return;
    commandActive = active;
    composer.dataset.commandMode = String(active);
    modeToggle.setAttribute("aria-pressed", String(active));
    modeToggle.setAttribute("aria-label", active ? "返回阅读并保留草稿" : "按斜杠键或点击开始输入命令");
    modeToggle.textContent = active ? "Esc 返回阅读" : "/ 输入命令";
    modeAnnouncement.textContent = active ? "命令模式，按 Escape 返回阅读并保留草稿。" : "阅读模式，草稿已保留，按斜杠键继续输入。";
    refresh();
  }
  const reading = () => Boolean(records.querySelector(".output-details[open]"));
  const setStyle = (element, key, value) => {
    if (element.style[key] !== value) element.style[key] = value;
  };
  function refresh() {
    cancelAnimationFrame(scheduled);
    const frameRect = frame.getBoundingClientRect();
    const mainStyle = getComputedStyle(main);
    const left = parseFloat(mainStyle.paddingLeft);
    const right = parseFloat(mainStyle.paddingRight) + main.offsetWidth - main.clientWidth;

    // Inline and docked prompts share one element, draft, selection and IME state.
    composer.style.setProperty("--command-left", `${left}px`);
    composer.style.setProperty("--command-right", `${right}px`);
    // Preserve an equal-height slot so docking leaves the scroll range stable.
    setStyle(slot, "marginTop", "14px");
    setStyle(slot, "height", `${composer.offsetHeight}px`);
    const origin = slot.getBoundingClientRect();
    const viewport = main.getBoundingClientRect();
    const visible = origin.top >= viewport.top && origin.bottom <= viewport.bottom - 4;
    docked = commandActive || !visible;
    composer.dataset.docked = String(docked);
    frame.dataset.inputDocked = String(docked);
    const height = composer.offsetHeight;
    const top = docked ? frameRect.height - height : slot.getBoundingClientRect().top - frameRect.top;
    setStyle(composer, "top", `${Math.max(0, top)}px`);
    const above = Math.max(0, top - 8);
    const below = Math.max(0, frameRect.height - top - height - 8);
    const opensAbove = docked || above >= Math.min(suggestions.scrollHeight, 220) || above >= below;
    composer.dataset.popup = opensAbove ? "above" : "below";
    setStyle(suggestions, "maxHeight", `${Math.min(220, opensAbove ? above : below)}px`);
  }
  function schedule() {
    cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(refresh);
  }
  window.LIZPINK_INPUT = {
    commandMode: () => commandActive,
    leaveCommandMode: () => setCommandMode(false),
    protectReading: () => reading() || docked || commandActive, refresh
  };
  main.addEventListener("scroll", refresh, {passive:true});
  new ResizeObserver(schedule).observe(frame);
  new ResizeObserver(schedule).observe(composer);
  new ResizeObserver(schedule).observe(records);
  new MutationObserver(schedule).observe(suggestions, {childList:true, attributes:true, attributeFilter:["hidden"]});
  new MutationObserver(schedule).observe(records, {childList:true, subtree:true, attributes:true, attributeFilter:["open"]});
  window.addEventListener("resize", schedule);
  function fitViewport() {
    const viewport = window.visualViewport;
    if (viewport && Math.abs(viewport.scale - 1) < 0.05) {
      document.documentElement.style.setProperty("--visual-viewport-height", `${viewport.height}px`);
    } else document.documentElement.style.removeProperty("--visual-viewport-height");
    schedule();
  }
  window.visualViewport?.addEventListener("resize", fitViewport);
  window.visualViewport?.addEventListener("scroll", schedule);
  input.addEventListener("focus", () => { setCommandMode(true); schedule(); });
  composer.addEventListener("focusout", event => {
    if (!composer.contains(event.relatedTarget)) setCommandMode(false);
  });
  fitViewport();
  refresh();
})();
