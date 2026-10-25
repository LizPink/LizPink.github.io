// Compact terminal summaries. Full text and media are rendered only on expansion.
(() => {
  "use strict";

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };

  function addFacts(node, rows) {
    if (!rows.length) return;
    const list = element("dl", "summary-facts");
    rows.forEach(([label, value]) => {
      const row = element("div");
      row.append(element("dt", "", label), element("dd", "", value));
      list.append(row);
    });
    node.append(list);
  }

  function addSamplePreview(node, path, content, showCounts = true) {
    const items = (path?.items || []).map(key => content.samples?.[key]).filter(Boolean);
    if (!items.length) {
      node.append(element("p", "summary-meta", "图文尚未添加，之后补充。"));
      return;
    }
    const list = element("ul", "summary-preview");
    list.setAttribute("aria-label", "内容预览");
    items.slice(0, 3).forEach(item => {
      const row = element("li", "summary-preview-item");
      row.append(element("span", "", item.title || "未命名内容"));
      if (item.example) row.append(element("span", "summary-preview-label", "示例"));
      list.append(row);
    });
    node.append(list);
    if (!showCounts) return;
    const counts = [
      ["text", "条文字"], ["image", "张图片"], ["video", "段视频"]
    ].map(([type, label]) => {
      const count = items.filter(item => item.type === type).length;
      return count ? `${count} ${label}` : "";
    }).filter(Boolean);
    const label = counts.join(" · ") || `${items.length} 项内容`;
    node.append(element("p", "summary-meta", label));
  }

  function create(route) {
    const content = window.LIZPINK_CONTENT || {};
    const node = element("section", "output-summary");
    const overview = element("div", "summary-overview");
    let detailLabel = null;
    const title = text => node.append(element("h2", "summary-title", text));
    const description = text => { if (text) overview.append(element("p", "summary-description", text)); };

    if (route === "home") return { node, detailLabel };

    if (route === "resume") {
      const path = content.paths?.find(item => item.id === "resume");
      const sections = content.resume?.sections || [];
      const entries = sections.reduce((count, section) => count + (section.items?.length || 0), 0);
      title(path?.title || "经历与能力");
      description(content.role || "身份待补充");
      addFacts(overview, [
        ["兴趣", (content.interests || []).join(" · ") || "待补充"],
        ["简历", `${entries ? `${entries} 项经历` : "经历待补充"} · ${content.resume?.pdfUrl ? "已添加 PDF 入口" : "PDF 待添加"}`]
      ]);
      addSamplePreview(overview, path, content, false);
      detailLabel = "展开经历与图文";
    } else if (route === "research" || route === "life") {
      const path = content.paths?.find(item => item.id === route);
      title(path?.title || (route === "research" ? "研究与探索" : "生活与记录"));
      addSamplePreview(overview, path, content);
      detailLabel = route === "research" ? "展开研究图文" : "展开生活图文";
    } else if (route === "help") {
      return { node: window.LIZPINK_COMMANDS.renderHelp(), detailLabel: null };
    } else {
      title("未找到这个栏目");
      description("输入 help 查看命令。");
    }

    node.append(overview);
    return { node, detailLabel };
  }

  window.LIZPINK_SUMMARIES = Object.freeze({ create });
})();
