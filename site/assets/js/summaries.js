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
    const items = (path?.items || []).filter(key => content.samples?.[key])
      .map(key => ({...content.samples[key], key}));
    if (!items.length) {
      node.append(element("p", "summary-meta", "图文尚未添加，之后补充。"));
      return;
    }
    const list = element("ul", "summary-preview");
    list.setAttribute("aria-label", "内容预览");
    items.slice(0, 3).forEach(item => {
      const row = element("li", "summary-preview-item");
      const link = element("button", "summary-preview-link", item.title || "未命名内容");
      link.type = "button";
      link.dataset.contentKey = item.key;
      link.dataset.contentRoute = path.id;
      row.append(link);
      list.append(row);
    });
    node.append(list);
    if (!showCounts) return;
    const imageCount = items.reduce((sum, item) => sum + (item.mediaCounts?.images || 0), 0);
    const videoCount = items.reduce((sum, item) => sum + (item.mediaCounts?.videos || 0), 0);
    const textCount = items.filter(item => !item.mediaCounts?.images && !item.mediaCounts?.videos).length;
    const counts = [[textCount, "条文字"], [imageCount, "张图片"], [videoCount, "段视频"]]
      .filter(([count]) => count).map(([count, label]) => `${count} ${label}`);
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
      title(path?.title || "经历");
      description(content.role || "身份待补充");
      addFacts(overview, [
        ["兴趣", (content.interests || []).join(" · ") || "待补充"],
        ["简历", `${entries ? `${entries} 项经历` : "经历待补充"} · ${content.resume?.pdfUrl ? "已添加 PDF 入口" : "PDF 待添加"}`]
      ]);
      addSamplePreview(overview, path, content, false);
      detailLabel = "展开";
    } else if (route === "project" || route === "life") {
      const path = content.paths?.find(item => item.id === route);
      title(path?.title || (route === "project" ? "项目" : "生活"));
      addSamplePreview(overview, path, content);
      detailLabel = "展开";
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
