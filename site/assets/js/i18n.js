// Language selection is independent of theme and preserves the current article URL.
(() => {
  "use strict";
  const messages = Object.freeze({
    "首页": "Home", "生活": "Life", "经历": "Experience", "项目": "Projects", "帮助": "Help",
    "展开": "Expand", "收起": "Collapse", "浏览路线": "Browse", "操作": "Actions",
    "内容目录": "Contents", "本页目录": "On this page", "全部内容": "All entries", "最近内容": "Recent entries",
    "最近更新": "Latest updates",
    "简历": "Résumé", "打开 PDF 简历 ↗": "Open PDF résumé ↗", "打开 PDF 简历": "Open PDF résumé", "PDF 待添加": "PDF coming soon",
    "职业：{role}": "Role: {role}", "关注：{interests}": "Interests: {interests}",
    "这个分区还没有内容。": "There are no entries in this section yet.", "这个栏目还没有内容。": "There are no entries in this section yet.",
    "这个角落还在整理，之后会陆续放入内容。": "This section is taking shape. More entries will be added soon.",
    "未找到这个栏目": "Section not found", "未命名内容": "Untitled entry", "未填写": "Not specified",
    "创建于": "Published", "更新于": "Updated", "更新": "Updated", "日期": "Date",
    "就绪": "Ready", "输入中": "Typing", "已打开：{title}": "Opened: {title}",
    "输入 help 查看命令。": "Type help to see available commands.",
    "没有匹配的命令。输入 help 查看命令。": "No matching command. Type help to see available commands.",
    "最近的输出没有可展开的详情。": "There are no expandable details in the current view.",
    "未识别“{command}”。{suggestion}": "Unknown command “{command}”. {suggestion}", "试试 {commands}。": "Try {commands}.", " 或 ": " or ",
    "这段媒体暂时无法显示。": "This media is currently unavailable.",
    "侧栏快捷键": "Sidebar shortcuts", "显示/隐藏左侧目录": "Show or hide the contents sidebar", "显示/隐藏右侧目录": "Show or hide the page outline",
    "执行": "Run", "补全": "Complete", "历史": "History", "开始输入": "Start typing", "返回阅读": "Return to reading", "离开": "Move focus",
    "或 {number}": "or {number}", "{command}：{description}": "{command}: {description}",
    "按下斜杠键开始输入，输入 help 查询命令": "Press slash to start typing, or type help to see commands",
    "按下 / 输入命令": "Press / to type a command", "输入 help 查询命令": "Type help to see commands",
    "输入 help 查询命令。按 Enter 执行，按 Escape 返回阅读。": "Type help to see commands. Press Enter to run, or Escape to return to reading.",
    "按斜杠键或点击开始输入命令": "Press slash or click to type a command", "返回阅读并保留草稿": "Return to reading and keep your draft", "Esc 返回阅读": "Esc to read",
    "命令模式，按 Escape 返回阅读并保留草稿。": "Command mode. Press Escape to return to reading and keep your draft.",
    "阅读模式，草稿已保留，按斜杠键继续输入。": "Reading mode. Your draft is saved. Press slash to continue typing.",
    "图片预览": "Image preview", "图片对比": "Image comparison", "Esc 关闭": "Esc to close", "关闭图片预览": "Close image preview", "关闭图片预览（Esc）": "Close image preview (Esc)",
    "图片暂时无法显示，请关闭后重试。": "This image is unavailable. Close the preview and try again.",
    "对比图片暂时无法显示，请关闭后重试。": "The comparison images are unavailable. Close the preview and try again.",
    "正在加载图片…": "Loading image…", "之前": "Before", "之后": "After", "正在加载对比图片…": "Loading comparison images…",
    "左图显示 {left}%，右图显示 {right}%": "Left image {left}%, right image {right}%",
    "第一张图片暂时无法加载，请刷新页面重试。": "The first image could not be loaded. Refresh the page to try again.",
    "第二张图片暂时无法加载，请刷新页面重试。": "The second image could not be loaded. Refresh the page to try again.",
    "打开第一张原图": "Open the first original image", "打开第二张原图": "Open the second original image",
    "跳到正文": "Skip to content", "外观模式": "Appearance", "浅色模式": "Light mode", "深色模式": "Dark mode", "栏目": "Sections",
    "终端输出": "Terminal output", "会话记录": "Session output", "命令行终端": "Command terminal", "输入命令": "Type a command", "可补全命令": "Command suggestions",
    "请启用 JavaScript 后浏览目录或使用命令。": "Enable JavaScript to browse the contents or use commands.", "{name} 首页": "{name} home",
    "展开内容目录": "Expand contents", "收起内容目录": "Collapse contents", "关闭内容目录": "Close contents", "关闭目录": "Close contents", "展开目录": "Expand contents", "收起目录": "Collapse contents",
    "展开内容目录（Ctrl+Alt+A）": "Expand contents (Ctrl+Alt+A)", "收起内容目录（Ctrl+Alt+A）": "Collapse contents (Ctrl+Alt+A)",
    "显示本页目录": "Show page outline", "隐藏本页目录": "Hide page outline", "展开本页目录": "Expand page outline", "收起本页目录": "Collapse page outline",
    "显示本页目录（Ctrl+Alt+B）": "Show page outline (Ctrl+Alt+B)", "隐藏本页目录（Ctrl+Alt+B）": "Hide page outline (Ctrl+Alt+B)",
    "展开本页目录（Ctrl+Alt+B）": "Expand page outline (Ctrl+Alt+B)", "收起本页目录（Ctrl+Alt+B）": "Collapse page outline (Ctrl+Alt+B)",
    "目录宽度 {width} 像素": "Contents width: {width} pixels",
    "调整内容目录宽度，左右方向键调节，Home 最窄，End 最宽": "Resize contents. Use arrow keys to adjust, Home for the minimum, or End for the maximum.",
    "拖动调整目录宽度；双击恢复默认宽度": "Drag to resize contents; double-click to restore the default width",
    "{count} 项": "{count} entries", "1 项": "1 entry", "个人终端": "Personal terminal"
  });
  const storedText = new WeakMap();
  const storedAttributes = new WeakMap();
  const preferenceKey = "lizpink-language";
  const normalize = value => {
    if (typeof value !== "string") return null;
    const language = value.toLowerCase();
    if (language === "en" || language.startsWith("en-")) return "en";
    if (language === "zh" || language.startsWith("zh-")) return "zh-CN";
    return null;
  };
  const locales = window.LIZPINK_LOCALES || { "zh-CN": window.LIZPINK_CONTENT };
  let saved = null;
  try { saved = normalize(window.localStorage.getItem(preferenceKey)); } catch { /* Preference storage is optional. */ }
  const requested = normalize(new URLSearchParams(window.location.search).get("lang"));
  const browser = normalize(window.navigator?.language);
  let language = requested || saved || browser || "zh-CN";
  if (!locales[language]) language = "zh-CN";

  function t(source, parameters = {}) {
    if (language === "en" && source === "{count} 项" && Number(parameters.count) === 1) return "1 entry";
    const generated = window.LIZPINK_CONTENT?.uiMessages;
    const text = language === "en"
      ? generated && Object.hasOwn(generated, source) ? generated[source] : Object.hasOwn(messages, source) ? messages[source] : source
      : source;
    return String(text).replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(parameters, key) ? String(parameters[key]) : match);
  }
  function translateText(node, source) {
    if (!node) return;
    if (!storedText.has(node)) storedText.set(node, source ?? node.textContent);
    node.textContent = t(storedText.get(node));
  }
  function translateAttribute(node, name, source) {
    if (!node) return;
    let attributes = storedAttributes.get(node);
    if (!attributes) { attributes = new Map(); storedAttributes.set(node, attributes); }
    if (!attributes.has(name)) attributes.set(name, source ?? node.getAttribute(name));
    const value = attributes.get(name);
    if (value) node.setAttribute(name, t(value));
  }
  function localizeUI(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(node => translateText(node, node.dataset.i18n || undefined));
    ["aria-label", "title"].forEach(attribute => {
      root.querySelectorAll(`[data-i18n-${attribute}]`).forEach(node => translateAttribute(node, attribute, node.getAttribute(`data-i18n-${attribute}`) || undefined));
    });
    // Only static chrome is visited. Article text comes from the translated content bundle.
    [".skip-link", "#command-form label .sr-only", ".image-viewer-label", ".image-viewer-escape", ".noscript"].forEach(selector => {
      root.querySelectorAll(selector).forEach(node => translateText(node));
    });
    ["#route-menu", ".sidebar-routes", ".sidebar-routes [data-route]", "#main", "#terminal-records", ".command-area", "#command-suggestions", "#image-viewer", "#image-viewer-close", ".theme-control", "[data-theme-option]", "#sidebar-resizer", "#menu-backdrop"].forEach(selector => {
      root.querySelectorAll(selector).forEach(node => ["aria-label", "title"].forEach(attribute => translateAttribute(node, attribute)));
    });
    root.querySelectorAll(".sidebar-routes [data-route]").forEach(node => {
      [...node.childNodes].filter(child => child.nodeType === 3).forEach(child => {
        if (!storedText.has(child)) storedText.set(child, child.textContent);
        const original = storedText.get(child);
        child.textContent = original.replace(/\S(?:[\s\S]*\S)?/, text => t(text));
      });
    });
    const wordmark = document.querySelector(".wordmark");
    if (wordmark) wordmark.setAttribute("aria-label", t("{name} 首页", { name: window.LIZPINK_CONTENT?.name || "LizPink" }));
    const button = document.querySelector("#language-toggle");
    if (button) {
      button.textContent = language === "en" ? "EN" : "中文";
      button.lang = language;
      const description = language === "en" ? "Current language: English; switch to Chinese" : "当前语言：中文；点击切换到英文";
      button.setAttribute("aria-label", description);
      button.title = description;
      button.disabled = !locales.en;
    }
  }
  function apply() {
    window.LIZPINK_CONTENT = locales[language] || locales["zh-CN"];
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    localizeUI();
  }
  function setLanguage(value, { remember = true, updateURL = true } = {}) {
    const next = normalize(value);
    if (!next || !locales[next]) return false;
    const previousLanguage = language;
    language = next;
    if (remember) {
      try { window.localStorage.setItem(preferenceKey, language); } catch { /* The page also works without storage. */ }
    }
    if (updateURL) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", language === "en" ? "en" : "zh");
      try { window.history.replaceState(window.history.state, "", url); } catch { /* Optional for file previews. */ }
    }
    apply();
    if (previousLanguage !== language) window.dispatchEvent(new CustomEvent("lizpink:languagechange", { detail: { language, previousLanguage } }));
    return true;
  }
  window.LIZPINK_I18N = Object.freeze({ t, current: () => language, setLanguage, localizeUI, normalize, messages, keys: () => Object.keys(messages) });
  apply();
  document.addEventListener("click", event => {
    if (event.target.closest("#language-toggle")) setLanguage(language === "en" ? "zh-CN" : "en");
  });
  window.addEventListener("popstate", () => {
    const next = normalize(new URLSearchParams(window.location.search).get("lang"));
    if (next && next !== language) setLanguage(next, { remember: false, updateURL: false });
  });
})();
