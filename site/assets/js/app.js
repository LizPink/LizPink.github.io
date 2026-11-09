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
  const outputMotion = window.LIZPINK_OUTPUT_MOTION;
  const contentIndex = window.LIZPINK_CONTENT_INDEX;
  const sidebar = window.LIZPINK_SIDEBAR;
  const articleOutline = window.LIZPINK_OUTLINE;
  const imageViewer = window.LIZPINK_IMAGE_VIEWER;
  const outlineButton = document.querySelector("#outline-toggle");
  let followingOutput = true;
  let followFrame;
  const history = [];
  let historyPosition = 0;
  let activeRoute = "home";
  let activeItem = null;
  const commandCatalog = window.LIZPINK_COMMANDS;
  const routes = commandCatalog.routes;
  const titles = { home:"首页", resume:"经历", project:"项目", life:"生活", help:"帮助" };
  const $ = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function home() {
    document.querySelector("#home-profile").replaceChildren(window.LIZPINK_SUMMARIES.create("home").node);
  }
  function syncOutlineButton() {
    const drawerOpen = sidebar.isMobile() && sidebar.isOpen();
    const available = !drawerOpen && Boolean(articleOutline?.isAvailable());
    const open = available && articleOutline.isOpen();
    if (!available && document.activeElement === outlineButton) {
      (drawerOpen ? document.querySelector("#menu-close") : main).focus({preventScroll:true});
    }
    outlineButton.hidden = !available;
    outlineButton.setAttribute("aria-expanded", String(open));
    outlineButton.setAttribute("aria-label", `${open ? "隐藏" : "显示"}本页目录`);
    outlineButton.title = `${open ? "隐藏" : "显示"}本页目录（Ctrl+Alt+B）`;
    const ids = [...document.querySelectorAll(".article-outline")]
      .filter(node => node.id && node.parentElement.getClientRects().length).map(node => node.id);
    if (ids.length) outlineButton.setAttribute("aria-controls", ids.join(" "));
    else outlineButton.removeAttribute("aria-controls");
  }
  function toggleLeftDirectory() {
    if (commandComposing || imageViewer?.isOpen()) return false;
    beginReading();
    return sidebar.toggle();
  }
  function togglePageOutline() {
    if (commandComposing || imageViewer?.isOpen() || (sidebar.isMobile() && sidebar.isOpen()) || !articleOutline?.isAvailable()) return false;
    beginReading();
    const handled = articleOutline.toggle();
    syncOutlineButton();
    return handled;
  }
  function help() {
    view.append(commandCatalog.renderHelp());
  }
  function resume() {
    const path = pathFor("resume");
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
    if (path.items.some(key => content.samples[key])) renderPathSamples(path);
  }
  function pathFor(id) {
    return content.paths.find(item => item.id === id);
  }
  function renderPathSamples(path, {reader = false} = {}) {
    if (!path.items.some(key => content.samples[key])) {
      view.append($("p", "route-empty", "这个角落还在整理，之后会陆续放入内容。"));
      return;
    }
    path.items.forEach(key => {
      const sample = content.samples[key];
      if (!sample) return;
      const article = $("article", "sample-entry");
      const label = $("div", "sample-heading");
      label.append($(reader ? "h2" : "h3", reader ? "summary-title" : "", sample.title));
      article.append(label);
      const metadata = $("p", "reader-date");
      const createdDate = contentIndex.formatDate(sample.publishedAt);
      const updatedDate = contentIndex.formatDate(sample.updatedAt) || createdDate;
      [["创建于", createdDate], ["更新于", updatedDate]].forEach(([label, date], index) => {
        if (index) metadata.append(document.createTextNode(" "));
        const field = $("span", "reader-date-field");
        field.append(document.createTextNode(`${label} `));
        if (date) {
          const time = $("time", "", date.text);
          time.dateTime = date.value;
          field.append(time);
        } else {
          const missing = $("span", "reader-date-empty", "—");
          missing.setAttribute("aria-label", "未填写");
          field.append(missing);
        }
        metadata.append(field);
      });
      article.append(metadata);
      const layout = $("div", "article-layout");
      const body = $("div", "article-body");
      // Only the build-generated Markdown HTML reaches this trusted sink.
      body.innerHTML = sample.body;
      body.querySelectorAll("h2, h3, h4, h5, h6").forEach(heading => {
        const level = Math.min(6, Number(heading.tagName.slice(1)) + (reader ? 1 : 2));
        const replacement = $("h" + level);
        for (const attribute of heading.attributes) replacement.setAttribute(attribute.name, attribute.value);
        replacement.append(...heading.childNodes); heading.replaceWith(replacement);
      });
      body.querySelectorAll(".sample-media").forEach(figure => {
        if (figure.classList.contains("sample-comparison")) return;
        const media = figure.querySelector("img, video");
        if (!media) return;
        const isVideo = media.tagName === "VIDEO";
        const naturalSize = () => {
          const width = isVideo ? media.videoWidth : media.naturalWidth;
          if (width) figure.style.setProperty("--asset-width", width + "px");
        };
        media.addEventListener(isVideo ? "loadedmetadata" : "load", naturalSize, {once:true});
        media.addEventListener("error", () => figure.replaceChildren($("p", "media-unavailable", "这段媒体暂时无法显示。")), {once:true});
        if (isVideo) figure.style.setProperty("--asset-width", "640px");
        naturalSize();
      });
      body.addEventListener("click", event => {
        const link = event.target.closest("a[data-article-anchor]");
        if (!link || !body.contains(link)) return;
        event.preventDefault();
        const target = [...body.querySelectorAll("[id]")].find(node => node.id === link.dataset.articleAnchor);
        if (!target) return;
        beginReading(); scrollWithinTerminal(target);
        target.tabIndex = -1; target.focus({preventScroll:true}); commandInput.refresh();
      });
      layout.append(body); article.append(layout); view.append(article);
      window.LIZPINK_IMAGE_COMPARISON?.init(body);
      articleOutline?.mount({ layout, body, headings:sample.headings || [], scrollRoot:main,
        onNavigate:beginReading, onLayout:() => { commandInput.refresh(); syncOutlineButton(); } });
    });
  }
  function project() { renderPathSamples(pathFor("project")); }
  function life() { renderPathSamples(pathFor("life")); }
  function closeMobileDirectory() {
    if (sidebar.isMobile() && sidebar.isOpen()) sidebar.close();
  }
  function renderSelectedItem(route, key) {
    const reader = $("section", "content-reader");
    view.append(reader);
    withView(reader, () => renderPathSamples({id:route, items:[key]}, {reader:true}));
  }
  function withView(target, build) {
    const previous = view;
    view = target;
    try { build(); } finally { view = previous; }
  }
  function buildFullOutput(route, target) {
    withView(target, () => ({home, resume, project, life, help})[route]());
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
      if (!details.isConnected) return;
      commandInput.refresh();
      if (details.open) { pauseFollowing(); populate(); label.textContent = "收起"; scrollWithinTerminal(result.node); }
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
  function beginReading() {
    outputMotion?.finish();
    pauseFollowing();
  }
  function outputFitsViewport(entry) {
    // Full-height content is laid out once. Skip motion if following it would
    // put the first rows above the viewport, especially with a phone keyboard.
    const style = getComputedStyle(main);
    const available = main.clientHeight - commandArea.offsetHeight
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return entry.getBoundingClientRect().height <= available;
  }
  function render(route, {label = route, animate = false, itemKey = null} = {}) {
    const wasViewingImage = imageViewer?.isOpen();
    if (wasViewingImage) imageViewer.close({restoreFocus:false, restoreScroll:false});
    outputMotion?.finish();
    articleOutline?.clear();
    feedback.textContent = "";
    resetCompletion();
    const base = commandCatalog.normalize(route);
    activeRoute = routes.includes(base) ? base : "home";
    activeItem = contentIndex.get(activeRoute, itemKey);
    document.querySelector("#intro").hidden = activeRoute !== "home";
    records.querySelectorAll("video").forEach(video => video.pause());
    // Each route is a fresh page. Command recall remains in the history array.
    pauseFollowing();
    records.replaceChildren();
    view.removeAttribute("id");
    view = $("div", "terminal-result");
    view.id = "view";
    let entry;
    if (activeRoute !== "home") {
      entry = $("section", "terminal-entry");
      const echo = $("p", "command-echo");
      const symbol = $("span", "prompt-symbol", ">"); symbol.setAttribute("aria-hidden", "true");
      echo.append(symbol, $("code", "", label)); entry.append(echo, view); records.append(entry);
    }
    if (activeItem) renderSelectedItem(activeRoute, activeItem.key);
    else if (activeRoute !== "home") addOutputSummary(activeRoute);
    main.scrollTop = 0;
    if (wasViewingImage) main.focus({preventScroll:true});
    commandInput.refresh();
    if (animate && !activeItem && entry && outputFitsViewport(entry)) outputMotion?.play(view);
    updateFollowState();
    document.querySelector("#frame-location").textContent = `~/${activeRoute}${activeItem ? `/${activeItem.key}` : ""}`;
    sidebar.update(activeRoute, activeItem?.key || null);
    syncOutlineButton();
    document.title = `${activeItem?.title || titles[activeRoute]} · ${content.name}`;
    document.querySelector("#terminal-status").textContent = "就绪";
    syncCursor();
    document.querySelector("#route-announcement").textContent = `已打开：${activeItem?.title || titles[activeRoute]}`;
  }
  function navigate(route, moveFocus = false, options = {}) {
    input.value = "";
    feedback.textContent = "";
    const renderOptions = {animate:true, ...options};
    const fragment = contentIndex.hash(route, options.itemKey);
    if (location.hash !== fragment) window.history.pushState({}, "", fragment);
    closeMobileDirectory();
    render(route, renderOptions);
    if (moveFocus) {
      pauseFollowing();
      main.scrollTop = 0;
      main.focus({ preventScroll:true });
      updateFollowState();
    }
  }
  function focusCommand() {
    closeMobileDirectory();
    input.focus({preventScroll:true});
    resumeFollowing();
  }
  function returnToReading() {
    resetCompletion();
    feedback.textContent = "";
    beginReading();
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
    feedback.textContent = "";
    syncCursor();
    resumeFollowing();
  }
  function setTheme(theme) {
    return window.LIZPINK_THEME.apply(theme, { remember:true });
  }
  function execute(raw) {
    outputMotion?.finish();
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
    const route = command;
    if (routes.includes(route)) { input.value = ""; navigate(route, false, {label:route}); input.focus({preventScroll:true}); syncCursor(); }
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
    const themeOption = event.target.closest("[data-theme-option]");
    if (themeOption) {
      setTheme(themeOption.dataset.themeOption);
      return;
    }
    const contentButton = event.target.closest("[data-content-key][data-content-route]");
    if (contentButton) {
      const item = contentIndex.get(contentButton.dataset.contentRoute, contentButton.dataset.contentKey);
      if (item) { event.preventDefault(); navigate(item.route, true, {itemKey:item.key, animate:false}); }
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
  document.addEventListener("pointerdown", event => {
    // Mouse activation should not steal editing focus; keyboard and touch stay native.
    if (event.pointerType === "mouse" && event.button === 0 && event.target.closest("button")) {
      event.preventDefault();
    }
  }, true);
  document.querySelector(".skip-link").addEventListener("click", event => {
    event.preventDefault();
    beginReading();
    closeMobileDirectory();
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
  main.addEventListener("wheel", event => { if (event.deltaY < 0) beginReading(); }, {passive:true});
  main.addEventListener("touchmove", beginReading, {passive:true});
  main.addEventListener("pointerdown", event => { if (event.clientX >= main.getBoundingClientRect().right - 20) beginReading(); });
  main.addEventListener("scroll", () => {
    if (!followingOutput && main.scrollTop > 0 && main.scrollHeight - main.scrollTop - main.clientHeight <= 32) followingOutput = true;
    updateFollowState();
  }, {passive:true});
  main.addEventListener("focusin", event => { if (event.target.closest("#terminal-records")) beginReading(); });
  main.addEventListener("keydown", event => {
    const editing = ["INPUT", "TEXTAREA"].includes(event.target.tagName);
    if (["PageUp", "PageDown"].includes(event.key) || (!editing && ["Home", "End", "ArrowUp", "ArrowDown", " "].includes(event.key))) beginReading();
  });
  if (typeof ResizeObserver !== "undefined") {
    const outputObserver = new ResizeObserver(() => { if (followingOutput) queueFollow(); else updateFollowState(); });
    [records, commandArea, main].forEach(element => outputObserver.observe(element));
  } else window.addEventListener("resize", () => { if (followingOutput) queueFollow(); else updateFollowState(); });
  document.addEventListener("keydown", event => {
    if (imageViewer?.isOpen() || event.defaultPrevented || event.isComposing || commandComposing || event.keyCode === 229) return;
    if (event.key === "Escape" && commandInput.commandMode()) {
      event.preventDefault(); returnToReading(); return;
    }
    const target = document.activeElement;
    const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
    const protectedContext = (
      (sidebar.isMobile() && sidebar.isOpen()) || target.closest("#route-menu, video, audio, .image-comparison, [role='dialog']") ||
      !window.getSelection()?.isCollapsed
    );
    if (event.key === "/" && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && !editing && !protectedContext) { event.preventDefault(); focusCommand(); }
  });
  function restoreLocation() {
    const menuHadFocus = document.querySelector("#route-menu").contains(document.activeElement);
    closeMobileDirectory();
    const state = contentIndex.parseHash(location.hash);
    if (state.route === activeRoute && state.key === (activeItem?.key || null)) return;
    render(state.route, {itemKey:state.key});
    if (menuHadFocus) main.focus({preventScroll:true});
    if (state.key) { pauseFollowing(); main.scrollTop = 0; }
  }
  window.addEventListener("hashchange", restoreLocation);
  window.addEventListener("popstate", restoreLocation);
  window.LIZPINK_THEME.apply(window.LIZPINK_THEME.current());
  document.documentElement.dataset.pageHidden = String(document.hidden);
  document.addEventListener("visibilitychange", () => { document.documentElement.dataset.pageHidden = String(document.hidden); });
  sidebar.init({onLayout:() => { beginReading(); commandInput.refresh(); syncOutlineButton(); }});
  outlineButton.addEventListener("click", togglePageOutline);
  window.LIZPINK_SIDEBAR_SHORTCUTS.init({toggleLeft:toggleLeftDirectory, toggleRight:togglePageOutline});
  imageViewer?.init({root:records, scrollRoot:main, onOpen:beginReading});
  home();
  const initialLocation = contentIndex.parseHash(location.hash);
  render(initialLocation.route, {itemKey:initialLocation.key});
  if (activeItem) { pauseFollowing(); main.scrollTop = 0; }
  if (activeRoute === "home") commandInput.focusInitial();
  syncCursor();
})();
