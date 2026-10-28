(() => {
  "use strict";
  const content = window.LIZPINK_CONTENT;
  let view = document.createElement("div");
  const records = document.querySelector("#terminal-records");
  const input = document.querySelector("#command-input");
  const feedback = document.querySelector("#command-feedback");
  const main = document.querySelector("#main");
  const commandArea = document.querySelector(".command-area");
  const commandInput = window.LIZPINK_INPUT;
  let followingOutput = true;
  let followFrame;
  let mediaSequence = 0;
  const history = [];
  let historyPosition = 0;
  let activeRoute = "home";
  const compactViewport = matchMedia("(max-width: 760px)");
  const hoverPointer = matchMedia("(hover: hover) and (pointer: fine)");
  let menuMode = "closed";
  let sidebarPinned = false;
  let menuKeyboardMode = false;
  let menuCloseTimer;
  let menuReturnTarget;
  const commandCatalog = window.LIZPINK_COMMANDS;
  const routes = commandCatalog.routes;
  const titles = { home:"起始页", resume:"经历与能力", research:"研究与探索", life:"生活与记录", help:"命令帮助" };
  const $ = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const safeUrl = (value) => {
    try { const url = new URL(value, location.href); return ["https:","http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
  };
  function externalLink(text, url, className = "external-link") {
    const link = $("a", className, text);
    const target = safeUrl(url);
    if (target) link.href = target;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }
  function home() {
    // The homepage introduces the owner above the inline prompt.
  }
  function help() {
    view.append(commandCatalog.renderHelp());
  }
  function resume() {
    const path = beginPath("resume", null);
    const paragraphs = content.about?.paragraphs?.length ? content.about.paragraphs : [content.resume.introduction].filter(Boolean);
    if (paragraphs.length) {
      const introduction = $("div", "profile-introduction prose");
      paragraphs.forEach(text => introduction.append($("p", "", text)));
      view.append(introduction);
    }
    if (content.resume.sections.length) {
      content.resume.sections.forEach(section => {
        const block = $("section", "resume-section");
        block.append($("h3", "", section.heading));
        section.items.forEach(item => {
          const row = $("div", "resume-item");
          row.append($("h4", "", item.title), $("p", "", item.detail));
          block.append(row);
        });
        view.append(block);
      });
    }
    if (content.resume.pdfUrl && safeUrl(content.resume.pdfUrl)) view.append(externalLink("打开 PDF 简历 ↗", content.resume.pdfUrl));
    renderPathSamples(path);
  }
  function beginPath(id, description) {
    const path = content.paths.find(item => item.id === id);
    const introduction = description === undefined ? path.introduction : description;
    if (introduction) view.append($("p", "view-description", introduction));
    return path;
  }
  function mediaUrl(value) {
    if (!value) return null;
    try { const url = new URL(value, location.href); return ["http:", "https:", "file:"].includes(url.protocol) ? url.href : null; } catch { return null; }
  }
  function renderPathSamples(path) {
    if (!path.items.some(key => content.samples[key])) {
      view.append($("p", "route-empty", "这个角落还在整理，之后会陆续放入内容。"));
      return;
    }
    path.items.forEach(key => {
      const sample = content.samples[key];
      if (!sample) return;
      const article = $("article", "sample-entry");
      article.dataset.example = String(Boolean(sample.example));
      const label = $("div", "sample-heading");
      label.append($("h3", "", sample.title));
      if (sample.example) label.append($("span", "example-badge", `${{text:"文字",image:"图片",video:"视频"}[sample.type] || "内容"}示例`));
      article.append(label, $("p", "sample-text", sample.text));
      const src = mediaUrl(sample.src);
      if (["image", "video"].includes(sample.type)) {
        const mediaDescriptionId = `media-description-${key}-${++mediaSequence}`;
        const figure = $("figure", "sample-media");
        const unavailable = () => { figure.replaceChildren($("p", "media-unavailable", "这段媒体暂时无法显示。")); };
        if (!src) unavailable();
        else if (sample.type === "image") {
          const image = $("img"); image.src = src; image.alt = sample.alt || sample.title; image.width = 960; image.height = 540; image.loading = "lazy"; image.decoding = "async";
          const zoom = $("a", "media-zoom");
          zoom.href = src; zoom.target = "_blank"; zoom.rel = "noopener noreferrer";
          zoom.setAttribute("aria-label", `查看大图：${sample.title}（新标签页）`);
          zoom.append(image);
          image.addEventListener("error", unavailable, {once:true}); figure.append(zoom);
        } else {
          const video = $("video"); video.src = src; video.controls = true; video.preload = "none"; video.playsInline = true; video.width = 640; video.height = 360;
          const poster = mediaUrl(sample.poster); if (poster) video.poster = poster;
          video.setAttribute("aria-label", sample.title);
          video.setAttribute("aria-describedby", mediaDescriptionId);
          const captions = mediaUrl(sample.captions);
          if (captions) { const track = $("track"); track.kind = "captions"; track.src = captions; track.srclang = "zh"; track.label = "中文说明"; track.default = true; video.append(track); }
          video.append(document.createTextNode("你的浏览器暂不支持此视频。"));
          video.addEventListener("error", unavailable, {once:true}); figure.append(video);
        }
        const caption = $("figcaption", "", sample.caption || (sample.example ? "示例媒体 · 待替换" : sample.title));
        caption.id = mediaDescriptionId;
        if (sample.type === "image" && src) caption.append($("span", "media-hint", "点击图片查看大图 ↗"));
        figure.append(caption); article.append(figure);
      }
      view.append(article);
    });
  }
  function research() { const path = beginPath("research"); renderPathSamples(path); }
  function life() { const path = beginPath("life"); renderPathSamples(path); }
  function setMenu(open, focus = false) {
    clearTimeout(menuCloseTimer);
    menuMode = open ? (compactViewport.matches ? "mobile-open" : sidebarPinned ? "pinned" : "peek") : "closed";
    document.querySelector("#route-menu").hidden = !open;
    document.querySelector("#terminal-frame").dataset.menuOpen = String(open);
    document.querySelector("#terminal-frame").dataset.menuPeek = String(menuMode === "peek");
    document.querySelector("#terminal-frame").dataset.menuPinned = String(sidebarPinned);
    const pin = document.querySelector("#menu-pin");
    const label = sidebarPinned ? "取消固定目录" : "固定目录";
    pin.setAttribute("aria-pressed", String(sidebarPinned));
    pin.setAttribute("aria-label", label);
    pin.title = label;
    const reveal = document.querySelector("#menu-reveal");
    reveal.hidden = open && menuMode !== "peek";
    reveal.setAttribute("aria-expanded", String(open));
    document.querySelector("#menu-hint").setAttribute("aria-expanded", String(open));
    reveal.title = "展开目录";
    document.querySelector("#menu-backdrop").hidden = !open || !compactViewport.matches;
    document.querySelector(".frame-main").inert = open && compactViewport.matches;
    if (focus) {
      const returnTarget = menuReturnTarget && !menuReturnTarget.closest("[hidden]") ? menuReturnTarget : reveal;
      (open ? (compactViewport.matches ? document.querySelector("#menu-close") : pin) : returnTarget).focus({preventScroll:true});
    }
  }
  function scheduleMenuClose() {
    clearTimeout(menuCloseTimer);
    if (menuMode !== "peek") return;
    menuCloseTimer = setTimeout(() => {
      const menu = document.querySelector("#route-menu");
      const reveal = document.querySelector("#menu-reveal");
      const holdsKeyboardFocus = menuKeyboardMode && menu.contains(document.activeElement);
      if (menuMode === "peek" && !holdsKeyboardFocus && !menu.matches(":hover") && !reveal.matches(":hover")) setMenu(false, menu.contains(document.activeElement));
    }, 180);
  }
  function withView(target, build) {
    const previous = view;
    view = target;
    try { build(); } finally { view = previous; }
  }
  function buildFullOutput(route, target) {
    withView(target, () => ({home, resume, research, life, help})[route]());
  }
  function scrollWithinTerminal(target) {
    const delta = target.getBoundingClientRect().top - main.getBoundingClientRect().top - 24;
    main.scrollTop += delta;
    updateFollowState();
  }
  function addOutputSummary(route) {
    const result = window.LIZPINK_SUMMARIES.create(route);
    view.append(result.node);
    if (!result.detailLabel) return null;
    const details = $("details", "output-details");
    const summary = $("summary");
    const label = $("span", "detail-label", result.detailLabel);
    summary.append(label);
    const body = $("div", "details-body");
    details.append(summary, body);
    let built = false;
    const populate = () => { if (!built) { buildFullOutput(route, body); built = true; } };
    summary.addEventListener("click", () => {
      pauseFollowing();
      if (!details.open) populate();
    });
    details.addEventListener("toggle", () => {
      commandInput.refresh();
      if (details.open) { pauseFollowing(); populate(); label.textContent = "收起详情"; scrollWithinTerminal(result.node); }
      else { label.textContent = result.detailLabel; body.querySelectorAll("video").forEach(video => video.pause()); }
      updateFollowState();
    });
    details.populate = populate;
    view.append(details);
    return details;
  }
  function updateFollowState() {
    main.dataset.following = String(followingOutput);
  }
  function queueFollow() {
    cancelAnimationFrame(followFrame);
    if (!followingOutput) { updateFollowState(); return; }
    followFrame = requestAnimationFrame(() => {
      if (followingOutput) {
        main.scrollTop = main.scrollHeight;
        commandInput.refresh();
      }
      updateFollowState();
    });
  }
  function pauseFollowing() {
    followingOutput = false;
    cancelAnimationFrame(followFrame);
    updateFollowState();
  }
  function resumeFollowing(force = false) {
    if (commandInput.protectReading() && force !== true) { pauseFollowing(); return; }
    followingOutput = true;
    queueFollow();
  }
  function render(route, {append = false, label = route} = {}) {
    feedback.textContent = "";
    resetCompletion();
    const base = commandCatalog.normalize(route);
    activeRoute = routes.includes(base) ? base : "home";
    // Route visibility also applies to keyboard commands that append output.
    document.querySelector("#intro").hidden = activeRoute !== "home";
    document.querySelector("#terminal-hint").hidden = activeRoute !== "home";
    records.querySelectorAll("video").forEach(video => video.pause());
    if (!append || activeRoute === "home") {
      followingOutput = true;
      records.replaceChildren();
    }
    view.removeAttribute("id");
    view = $("div", "terminal-result");
    view.id = "view";
    let entry;
    if (activeRoute !== "home") {
      entry = $("section", "terminal-entry");
      const echo = $("p", "command-echo");
      const symbol = $("span", "prompt-symbol", ">"); symbol.setAttribute("aria-hidden", "true");
      echo.append(symbol, $("code", "", label)); entry.append(echo, view); records.append(entry);
      while (records.children.length > 5) records.firstElementChild.remove();
    }
    if (activeRoute !== "home") addOutputSummary(activeRoute);
    commandInput.refresh();
    queueFollow();
    document.querySelector("#frame-location").textContent = `~/${activeRoute}`;
    document.querySelectorAll("#route-menu [data-route]").forEach(button => {
      if (button.dataset.route === activeRoute) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.title = `${titles[activeRoute]} · LizPink`;
    document.querySelector("#terminal-status").textContent = "就绪";
    syncCursor();
    document.querySelector("#route-announcement").textContent = `已打开：${titles[activeRoute]}`;
  }
  function navigate(route, moveFocus = false, options = {}) {
    input.value = "";
    feedback.textContent = "";
    if (readHash() === route) render(route, options);
    else { historyApi(route); render(route, options); }
    if (compactViewport.matches || menuMode === "peek") setMenu(false);
    if (moveFocus) {
      pauseFollowing();
      main.scrollTop = 0;
      main.focus({ preventScroll:true });
      updateFollowState();
    }
  }
  function historyApi(route) { window.history.pushState({}, "", `#${encodeURI(route)}`); }
  function focusCommand() {
    if (compactViewport.matches || menuMode === "peek") setMenu(false);
    input.focus({preventScroll:true});
    resumeFollowing();
  }
  function returnToReading() {
    resetCompletion();
    feedback.textContent = "";
    pauseFollowing();
    commandInput.leaveCommandMode();
    main.focus({preventScroll:true});
    syncCursor();
  }
  let completion = null;
  const suggestions = document.querySelector("#command-suggestions");
  function syncCursor() {
    document.querySelector("#cursor-text").textContent = input.value.slice(0, input.selectionStart ?? input.value.length);
    document.querySelector("#cursor-layer").style.left = `${-input.scrollLeft}px`;
    document.querySelector("#terminal-status").textContent = input.value ? "输入中" : "就绪";
  }
  function resetCompletion() {
    completion = null;
    suggestions.hidden = true;
    suggestions.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  function completeCommand() {
    if (!completion || input.value !== completion.matches[completion.index]) {
      const prefix = input.value.trim().toLowerCase();
      const matches = commandCatalog.completions.filter(command => command.startsWith(prefix));
      if (!matches.length) { resetCompletion(); feedback.textContent = "没有匹配的命令。输入 help 查看命令。"; return; }
      completion = {prefix, matches, index: 0};
    } else completion.index = (completion.index + 1) % completion.matches.length;
    const value = completion.matches[completion.index];
    input.value = value;
    input.setSelectionRange(completion.prefix.length, value.length);
    suggestions.replaceChildren();
    completion.matches.forEach((match, index) => {
      const option = $("span", "completion-option");
      option.append($("code", "", match));
      option.id = `completion-${index}`;
      option.setAttribute("role", "option"); option.setAttribute("aria-selected", String(index === completion.index));
      suggestions.append(option);
    });
    suggestions.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-activedescendant", `completion-${completion.index}`);
    feedback.textContent = completion.matches.length > 1 ? "Tab 切换候选，回车执行；Shift+Tab 离开输入。" : "已补全，回车执行。";
    syncCursor();
    resumeFollowing();
  }
  function setTheme(theme) {
    return window.LIZPINK_THEME.apply(theme, { remember:true });
  }
  function execute(raw) {
    const command = commandCatalog.normalize(raw);
    resetCompletion();
    if (!command) { feedback.textContent = "输入 help 查看命令。"; return; }
    history.push(raw.trim()); historyPosition = history.length;
    if (command === "open" || command === "close") {
      const details = records.lastElementChild?.querySelector(".output-details");
      input.value = ""; syncCursor();
      if (!details) { feedback.textContent = "最近的输出没有可展开的详情。"; resumeFollowing(); return; }
      if (command === "open") {
        pauseFollowing(); details.populate(); details.open = true;
        commandInput.refresh();
        if (!commandInput.commandMode()) details.querySelector("summary").focus({preventScroll:true});
        scrollWithinTerminal(details.querySelector("summary"));
      } else {
        details.open = false; commandInput.refresh(); focusCommand();
      }
      return;
    }
    resumeFollowing();
    if (command === "theme" || command.startsWith("theme ")) {
      input.value = ""; syncCursor();
      feedback.textContent = "配色请使用右上角开关。";
      return;
    }
    if (command === "clear") { history.length = 0; historyPosition = 0; input.value = ""; navigate("home"); focusCommand(); syncCursor(); return; }
    const route = command;
    if (routes.includes(route)) { resumeFollowing(true); input.value = ""; navigate(route, false, {append:true, label:raw.trim()}); input.focus({preventScroll:true}); syncCursor(); }
    else {
      const suggestions = commandCatalog.suggest(command);
      feedback.textContent = `未识别“${raw.trim()}”。${suggestions.length ? `试试 ${suggestions.join(" 或 ")}。` : "输入 help 查看命令。"}`;
    }
  }
  document.addEventListener("click", event => {
    if (event.target.closest("#command-mode-toggle")) {
      if (commandInput.commandMode()) returnToReading();
      else focusCommand();
      return;
    }
    const themeToggle = event.target.closest("#theme-toggle");
    if (themeToggle) {
      const next = window.LIZPINK_THEME.current() === "amber" ? "green" : "amber";
      setTheme(next);
      return;
    }
    const button = event.target.closest("[data-route]");
    if (button) { event.preventDefault(); navigate(button.dataset.route, true); return; }
    const command = event.target.closest("[data-command]");
    if (command) {
      const route = commandCatalog.normalize(command.dataset.command);
      if (routes.includes(route)) navigate(route, true);
      else execute(command.dataset.command);
    }
  });
  let commandComposing = false;
  input.addEventListener("compositionstart", () => { commandComposing = true; });
  input.addEventListener("compositionend", () => { commandComposing = false; });
  document.querySelector("#command-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!commandComposing) execute(input.value);
  });
  document.addEventListener("pointerdown", () => { menuKeyboardMode = false; }, true);
  document.addEventListener("keydown", event => {
    if (["Tab", "Enter", " "].includes(event.key)) menuKeyboardMode = true;
  }, true);
  document.querySelector("#menu-pin").addEventListener("click", () => {
    sidebarPinned = !sidebarPinned;
    setMenu(true);
    if (!sidebarPinned) scheduleMenuClose();
  });
  document.querySelector("#menu-close").addEventListener("click", () => setMenu(false, true));
  document.querySelector("#menu-reveal").addEventListener("click", event => {
    menuReturnTarget = event.currentTarget;
    setMenu(true);
    if (event.detail === 0 || compactViewport.matches) {
      menuKeyboardMode = event.detail === 0;
      (document.querySelector("#route-menu [aria-current='page']") || document.querySelector("#route-menu [data-route]")).focus({preventScroll:true});
    }
  });
  document.querySelector("#menu-hint").addEventListener("click", event => {
    menuReturnTarget = event.currentTarget;
    menuKeyboardMode = true;
    setMenu(true);
    (document.querySelector("#route-menu [aria-current='page']") || document.querySelector("#route-menu [data-route]")).focus({preventScroll:true});
  });
  document.querySelector("#menu-reveal").addEventListener("pointerenter", () => {
    clearTimeout(menuCloseTimer);
    if (!compactViewport.matches && hoverPointer.matches && menuMode === "closed") { menuReturnTarget = document.querySelector("#menu-reveal"); setMenu(true); }
  });
  document.querySelector("#menu-reveal").addEventListener("pointerleave", scheduleMenuClose);
  document.querySelector("#route-menu").addEventListener("pointerenter", () => clearTimeout(menuCloseTimer));
  document.querySelector("#route-menu").addEventListener("pointerleave", scheduleMenuClose);
  document.querySelector("#route-menu").addEventListener("focusin", () => clearTimeout(menuCloseTimer));
  document.querySelector("#route-menu").addEventListener("focusout", scheduleMenuClose);
  hoverPointer.addEventListener("change", () => {
    if (!hoverPointer.matches && menuMode === "peek") setMenu(false, document.querySelector("#route-menu").contains(document.activeElement));
  });
  document.querySelector("#menu-backdrop").addEventListener("click", () => setMenu(false, true));
  compactViewport.addEventListener("change", () => {
    const menuHadFocus = document.querySelector("#route-menu").contains(document.activeElement);
    setMenu(sidebarPinned && !compactViewport.matches, menuHadFocus);
  });
  document.querySelector(".skip-link").addEventListener("click", event => {
    event.preventDefault();
    main.focus({preventScroll:true});
  });
  input.addEventListener("keydown", event => {
    if (event.isComposing || commandComposing || event.keyCode === 229) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault(); resetCompletion(); historyPosition = Math.max(0, Math.min(history.length, historyPosition + (event.key === "ArrowUp" ? -1 : 1))); input.value = history[historyPosition] || ""; syncCursor(); resumeFollowing();
    } else if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault(); completeCommand();
    } else if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation();
      if (!suggestions.hidden) { resetCompletion(); feedback.textContent = ""; }
      else returnToReading();
    }
  });
  input.addEventListener("input", () => { resetCompletion(); syncCursor(); });
  ["keyup", "click", "select", "scroll", "focus"].forEach(event => input.addEventListener(event, syncCursor));
  input.addEventListener("beforeinput", resumeFollowing);
  input.addEventListener("blur", resetCompletion);
  main.addEventListener("wheel", event => { if (event.deltaY < 0) pauseFollowing(); }, {passive:true});
  main.addEventListener("touchmove", pauseFollowing, {passive:true});
  main.addEventListener("pointerdown", event => { if (event.clientX >= main.getBoundingClientRect().right - 20) pauseFollowing(); });
  main.addEventListener("scroll", () => {
    if (!followingOutput && main.scrollHeight - main.scrollTop - main.clientHeight <= 32) followingOutput = true;
    updateFollowState();
  }, {passive:true});
  main.addEventListener("focusin", event => { if (event.target.closest("#terminal-records")) pauseFollowing(); });
  main.addEventListener("keydown", event => {
    const editing = ["INPUT", "TEXTAREA"].includes(event.target.tagName);
    if (["PageUp", "PageDown"].includes(event.key) || (!editing && ["Home", "End", "ArrowUp", "ArrowDown", " "].includes(event.key))) pauseFollowing();
  });
  if (typeof ResizeObserver !== "undefined") {
    const outputObserver = new ResizeObserver(() => { if (followingOutput) queueFollow(); else updateFollowState(); });
    [records, commandArea, main].forEach(element => outputObserver.observe(element));
  } else window.addEventListener("resize", () => { if (followingOutput) queueFollow(); else updateFollowState(); });
  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.isComposing || commandComposing || event.keyCode === 229) return;
    if (event.key === "Tab" && compactViewport.matches && !document.querySelector("#route-menu").hidden) {
      const controls = [...document.querySelectorAll("#menu-close, #route-menu [data-route]")];
      const position = controls.indexOf(document.activeElement);
      event.preventDefault();
      const next = position < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (position + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      controls[next].focus();
    }
    if (event.key === "Escape" && !["closed", "pinned"].includes(menuMode)) {
      setMenu(false, true);
      return;
    }
    if (event.key === "Escape" && commandInput.commandMode()) {
      event.preventDefault(); returnToReading(); return;
    }
    const target = document.activeElement;
    const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
    const protectedContext = (
      menuMode === "mobile-open" || target.closest("#route-menu, video, audio, [role='dialog']") ||
      !window.getSelection()?.isCollapsed
    );
    if (event.key === "/" && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && !editing && !protectedContext) { event.preventDefault(); focusCommand(); }
  });
  function restoreLocation() {
    const menuHadFocus = document.querySelector("#route-menu").contains(document.activeElement);
    const transientMenu = menuMode === "peek" || menuMode === "mobile-open";
    if (transientMenu) setMenu(false);
    render(readHash());
    if (transientMenu && menuHadFocus) main.focus({preventScroll:true});
  }
  window.addEventListener("hashchange", restoreLocation);
  window.addEventListener("popstate", restoreLocation);
  function readHash() { try { return decodeURIComponent(location.hash.slice(1)) || "home"; } catch { return "home"; } }
  window.LIZPINK_THEME.apply(window.LIZPINK_THEME.current());
  document.documentElement.dataset.pageHidden = String(document.hidden);
  document.addEventListener("visibilitychange", () => { document.documentElement.dataset.pageHidden = String(document.hidden); });
  setMenu(false);
  render(readHash());
  const initialDetails = records.lastElementChild?.querySelector(".output-details");
  if (initialDetails) {
    pauseFollowing(); initialDetails.populate(); initialDetails.open = true;
    commandInput.refresh(); main.scrollTop = 0;
  }
  syncCursor();
})();
