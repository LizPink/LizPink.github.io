// 网站的配色设置。首次访问默认琥珀；只记住访客主动选择的配色。
(() => {
  "use strict";
  const DEFAULT_THEME = "amber";
  const names = Object.freeze({ amber: "琥珀", green: "荧绿" });
  const colors = { amber: "#1b1d18", green: "#121714" };
  const valid = theme => Object.hasOwn(names, theme);
  let savedTheme;
  try { savedTheme = localStorage.getItem("lizpink-theme"); } catch { /* Optional preference storage. */ }
  const requestedTheme = new URLSearchParams(location.search).get("theme");
  const initialTheme = valid(requestedTheme) ? requestedTheme : valid(savedTheme) ? savedTheme : DEFAULT_THEME;

  function apply(theme, { remember = false } = {}) {
    if (!valid(theme)) return false;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors[theme]);
    const toggle = document.querySelector("#theme-toggle");
    if (toggle) {
      toggle.setAttribute("aria-checked", String(theme === "green"));
      toggle.title = `切换为${names[theme === "amber" ? "green" : "amber"]}主题`;
    }
    const label = document.querySelector("#theme-label");
    if (label) label.textContent = names[theme];
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
  // Runs before styles load, so a returning visitor does not see a flash of amber.
  apply(initialTheme);
})();
