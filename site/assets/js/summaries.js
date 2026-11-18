// Section introductions stay visible; recent entries give the first reading choices.
(() => {
  "use strict";
  const t = (source, parameters = {}) => window.LIZPINK_I18N?.t(source, parameters) ?? String(source).replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(parameters, key) ? String(parameters[key]) : match);

  const sectionTitles = { life: "生活", resume: "经历", project: "项目" };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = t(String(text));
    return node;
  };

  const hasText = value => typeof value === "string" && Boolean(value.trim());

  function entryLink(item, className, tag = "a") {
    const link = element(tag, className);
    if (tag === "a") link.href = window.LIZPINK_CONTENT_INDEX.hash(item.route, item.key);
    else link.type = "button";
    link.dataset.contentKey = item.key;
    link.dataset.contentRoute = item.route;
    return link;
  }

  function featuredEntry(item, sample) {
    const section = element("section", "home-featured");
    const title = sample.previewTitle || item.title || t("未命名内容");
    const link = entryLink(item, "home-featured-link");
    const copy = element("div", "home-featured-copy");
    const heading = element("h2", "home-featured-title", title);
    heading.id = "home-featured-title";
    link.setAttribute("aria-labelledby", heading.id);
    const arrow = element("span", "home-featured-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    heading.append(arrow);
    copy.append(heading);
    if (item.excerpt) copy.append(element("p", "home-featured-summary", item.excerpt));
    link.append(copy);
    if (sample.cover) {
      const cover = element("img", "home-featured-cover");
      cover.alt = sample.coverAlt || title;
      cover.loading = "lazy";
      cover.decoding = "async";
      cover.src = sample.cover;
      link.append(cover);
    }
    section.append(link);
    return section;
  }

  function profile(content) {
    const node = element("section", "home-profile");
    if (hasText(content.role)) node.append(element("p", "home-role", t("职业：{role}", {role:content.role})));
    const interests = Array.isArray(content.interests) ? content.interests.filter(hasText) : [];
    if (interests.length) node.append(element("p", "home-interests", t("关注：{interests}", {interests:interests.join(" · ")})));
    const paragraphs = Array.isArray(content.about?.paragraphs) ? content.about.paragraphs.filter(hasText) : [];
    if (paragraphs.length) {
      const about = element("div", "home-about");
      paragraphs.forEach(text => about.append(element("p", "", text)));
      node.append(about);
    }
    const items = window.LIZPINK_CONTENT_INDEX.items("home");
    const featured = items.find(item => item.key === content.featuredEntry);
    if (featured) node.append(featuredEntry(featured, content.samples[featured.key]));
    const recent = items.filter(item => item !== featured).slice(0, 3);
    if (recent.length) {
      const section = element("section", "home-recent");
      section.append(element("h2", "home-section-label", "最近更新"), previewList(recent, t("最近更新"), "a"));
      node.append(section);
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
      link.setAttribute("aria-label", t("打开 PDF 简历"));
      valueNode.append(link);
    } else valueNode.textContent = t("PDF 待添加");
    row.append(element("dt", "", "简历"), valueNode);
    facts.append(row);
    node.append(facts);
  }
  function hasResumeEntries(content) {
    const sections = Array.isArray(content.resume?.sections) ? content.resume.sections : [];
    return sections.some(section => Array.isArray(section?.items) && section.items.some(item => hasText(item?.title) || hasText(item?.detail)));
  }
  function previewList(items, label, linkTag = "button") {
    const list = element("ul", "summary-preview");
    list.setAttribute("aria-label", label);
    items.forEach(item => {
      const row = element("li", "summary-preview-item");
      if (item.date) {
        const date = element("time", "summary-preview-date", item.date.text);
        date.dateTime = item.date.value;
        row.append(date);
      }
      const link = entryLink(item, "summary-preview-link", linkTag);
      link.textContent = item.title || t("未命名内容");
      row.append(link); list.append(row);
    });
    return list;
  }
  function addRecent(overview, items) {
    overview.append(element("h3", "summary-section-title", "最近内容"));
    if (items.length) overview.append(previewList(items.slice(0, 10), t("最近内容")));
    else overview.append(element("p", "summary-empty", "这个分区还没有内容。"));
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
    return { node, detailLabel: items.length || (route === "resume" && hasResumeEntries(content)) ? t("展开") : null };
  }

  window.LIZPINK_SUMMARIES = Object.freeze({ create });
})();
