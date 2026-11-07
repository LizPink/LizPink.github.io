// Section introductions stay visible; recent entries give the first reading choices.
(() => {
  "use strict";

  const sectionTitles = { life: "生活", resume: "经历", project: "项目" };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };

  const hasText = value => typeof value === "string" && Boolean(value.trim());

  function profile(content) {
    const node = element("section", "home-profile");
    if (hasText(content.role)) node.append(element("p", "home-role", `职业：${content.role}`));
    const interests = Array.isArray(content.interests) ? content.interests.filter(hasText) : [];
    if (interests.length) node.append(element("p", "home-interests", `关注：${interests.join(" · ")}`));
    const paragraphs = Array.isArray(content.about?.paragraphs) ? content.about.paragraphs.filter(hasText) : [];
    if (paragraphs.length) {
      const about = element("div", "home-about");
      paragraphs.forEach(text => about.append(element("p", "", text)));
      node.append(about);
    }
    return { node, detailLabel: null };
  }
  function addResumeLink(node, value) {
    let href = null;
    if (hasText(value)) {
      try {
        const url = new URL(value, document.baseURI || window.location?.href);
        if (["http:", "https:"].includes(url.protocol)) href = url.href;
      } catch { /* Invalid legacy URLs behave like an unconfigured PDF. */ }
    }
    const facts = element("dl", "summary-facts");
    const row = element("div");
    const valueNode = element("dd");
    if (href) {
      const link = element("a", "resume-pdf-link", "打开 PDF 简历 ↗");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", "打开 PDF 简历");
      valueNode.append(link);
    } else valueNode.textContent = "PDF 待添加";
    row.append(element("dt", "", "简历"), valueNode);
    facts.append(row);
    node.append(facts);
  }
  function hasResumeEntries(content) {
    const sections = Array.isArray(content.resume?.sections) ? content.resume.sections : [];
    return sections.some(section => Array.isArray(section?.items) && section.items.some(item => hasText(item?.title) || hasText(item?.detail)));
  }
  function addRecent(overview, items) {
    overview.append(element("h3", "summary-section-title", "最近内容"));
    if (!items.length) {
      overview.append(element("p", "summary-empty", "这个分区还没有内容。"));
      return;
    }
    const list = element("ul", "summary-preview");
    list.setAttribute("aria-label", "最近内容");
    items.slice(0, 10).forEach(item => {
      const row = element("li", "summary-preview-item");
      if (item.date) {
        const date = element("time", "summary-preview-date", item.date.text);
        date.dateTime = item.date.value;
        row.append(date);
      }
      const link = element("button", "summary-preview-link", item.title || "未命名内容");
      link.type = "button";
      link.dataset.contentKey = item.key;
      link.dataset.contentRoute = item.route;
      row.append(link); list.append(row);
    });
    overview.append(list);
  }

  function create(route) {
    const content = window.LIZPINK_CONTENT || {};
    if (route === "home") return profile(content);
    if (route === "help") return { node: window.LIZPINK_COMMANDS.renderHelp(), detailLabel: null };
    const node = element("section", "output-summary");
    if (!Object.hasOwn(sectionTitles, route)) {
      node.append(element("h2", "summary-title", "未找到这个栏目"), element("p", "summary-description", "输入 help 查看命令。"));
      return { node, detailLabel: null };
    }
    const path = Array.isArray(content.paths) ? content.paths.find(item => item.id === route) : null;
    node.append(element("h2", "summary-title", path?.title || sectionTitles[route]));
    if (hasText(path?.description)) node.append(element("p", "summary-description", path.description));
    if (route === "resume") addResumeLink(node, content.resume?.pdfUrl);
    const items = window.LIZPINK_CONTENT_INDEX.items(route);
    const overview = element("div", "summary-overview");
    addRecent(overview, items);
    node.append(overview);
    return { node, detailLabel: items.length || (route === "resume" && hasResumeEntries(content)) ? "展开" : null };
  }

  window.LIZPINK_SUMMARIES = Object.freeze({ create });
})();
