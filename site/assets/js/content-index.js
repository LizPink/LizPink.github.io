// Pure content metadata and hash helpers. Rendering and truncation belong to the UI.
(() => {
  "use strict";

  const contentRoutes = new Set(["life", "resume", "project"]);
  const routes = new Set(["home", "life", "resume", "project", "help"]);
  const routeTitles = { life: "生活", resume: "经历", project: "项目" };

  function formatDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1) return null;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= days[month - 1] ? { value, text: value.replaceAll("-", ".") } : null;
  }

  function dateFor(sample) {
    const updated = formatDate(sample.updatedAt);
    if (updated) return { ...updated, label: "更新" };
    const published = formatDate(sample.publishedAt);
    return published ? { ...published, label: "日期" } : null;
  }

  function items(route) {
    const content = window.LIZPINK_CONTENT || {};
    const paths = Array.isArray(content.paths) ? content.paths : [];
    const samples = content.samples && typeof content.samples === "object" ? content.samples : {};
    const local = contentRoutes.has(route);
    const seen = new Set();
    const result = [];
    paths.forEach(path => {
      if (!contentRoutes.has(path?.id) || (local && path.id !== route) || !Array.isArray(path.items)) return;
      path.items.forEach(key => {
        if (typeof key !== "string" || !key || seen.has(key) || !Object.hasOwn(samples, key)) return;
        const sample = samples[key];
        if (!sample || typeof sample !== "object" || Array.isArray(sample)) return;
        seen.add(key);
        result.push({
          key, route: path.id,
          routeTitle: typeof path.title === "string" && path.title.trim() ? path.title : routeTitles[path.id],
          title: typeof sample.title === "string" ? sample.title : "",
          excerpt: typeof sample.text === "string" ? sample.text.replace(/\s+/g, " ").trim() : "",
          type: typeof sample.type === "string" ? sample.type : "text",
          date: dateFor(sample)
        });
      });
    });
    // Sort the new index, never the source paths/items. Stable ties retain the
    // source order, including undated entries and the first reference of a key.
    return result.sort((left, right) => {
      const leftDate = left.date?.value;
      const rightDate = right.date?.value;
      if (leftDate === rightDate) return 0;
      if (!leftDate) return 1;
      if (!rightDate) return -1;
      return leftDate < rightDate ? 1 : -1;
    });
  }

  function get(route, key) {
    // Home/help show the combined index but do not own any article routes.
    if (!contentRoutes.has(route) || typeof key !== "string") return null;
    return items(route).find(item => item.key === key) || null;
  }

  function parseHash(value) {
    if (typeof value !== "string") return { route: "home", key: null };
    try {
      // Validate raw Unicode too: decodeURIComponent alone accepts lone surrogates.
      encodeURI(value);
      // Split first so an encoded slash remains part of a content key.
      const parts = (value.startsWith("#") ? value.slice(1) : value).split("/").map(decodeURIComponent);
      const route = parts[0] || "home";
      if (!routes.has(route)) return { route: "home", key: null };
      const key = parts.length === 2 && get(route, parts[1]) ? parts[1] : null;
      return { route, key };
    } catch {
      return { route: "home", key: null };
    }
  }

  function hash(route, key) {
    const target = routes.has(route) ? route : "home";
    if (!get(target, key)) return `#${target}`;
    try { return `#${target}/${encodeURIComponent(key)}`; }
    catch { return `#${target}`; }
  }

  window.LIZPINK_CONTENT_INDEX = Object.freeze({ items, get, parseHash, hash, formatDate });
})();
