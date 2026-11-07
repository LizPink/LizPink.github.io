// 首次访问默认深色模式；只记住访客主动选择的外观模式。
(() => {
  "use strict";
  const DEFAULT_THEME = "dark";
  const names = Object.freeze({ dark: "深色模式", light: "浅色模式" });
  const colors = { dark: "#080a08", light: "#f7f6f2" };
  const valid = theme => Object.hasOwn(names, theme);
  // Both retired palettes used a dark canvas. Keep old links and preferences dark.
  const normalize = theme => theme === "amber" || theme === "green" ? "dark" : theme;
  let savedTheme;
  try { savedTheme = localStorage.getItem("lizpink-theme"); } catch { /* Optional preference storage. */ }
  savedTheme = normalize(savedTheme);
  const requestedTheme = normalize(new URLSearchParams(location.search).get("theme"));
  const initialTheme = valid(requestedTheme) ? requestedTheme : valid(savedTheme) ? savedTheme : DEFAULT_THEME;

  function syncControls(theme) {
    document.querySelectorAll("[data-theme-option]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.themeOption === theme));
    });
  }

  function apply(theme, { remember = false } = {}) {
    if (!valid(theme)) return false;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors[theme]);
    syncControls(theme);
    if (remember) {
      try { localStorage.setItem("lizpink-theme", theme); } catch { /* The page still works without storage. */ }
      // Keep an explicitly themed link consistent with a later manual choice.
      const url = new URL(location.href);
      if (url.searchParams.has("theme")) {
        url.searchParams.set("theme", theme);
        try { history.replaceState(history.state, "", url); } catch { /* file: previews may restrict history. */ }
      }
    }
    return true;
  }
  window.LIZPINK_THEME = Object.freeze({ names, apply, current: () => document.documentElement.dataset.theme });
  // Apply before styles load; controls are synchronized once their markup exists.
  apply(initialTheme);
  document.addEventListener("DOMContentLoaded", () => syncControls(window.LIZPINK_THEME.current()), { once: true });
})();
