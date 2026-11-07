import { parseFragment } from "parse5";

// Render Markdown first, then turn the parsed HTML tree into a controlled token
// stream. Raw HTML and Markdown share headings, links and managed media; code
// fences remain text nodes and are never interpreted as authored HTML.
export function parseArticleTokens(markdown, source) {
  const Token = markdown.parseInline("x", {})[0].constructor;
  const html = markdown.render(source, {});
  const tree = parseFragment(html, { sourceCodeLocationInfo: true });
  const inlineTags = new Set(["span", "strong", "em", "s", "del", "u", "mark", "small", "sub", "sup", "kbd", "samp", "abbr"]);
  const containers = new Set(["div", "section", "article", "header", "footer", "main"]);
  const blocks = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "hr", "pre", "figure", "figcaption", "details", "summary", ...containers]);
  const attrs = node => Object.fromEntries((node.attrs || []).map(attribute => [attribute.name, attribute.value]));
  const text = node => node.nodeName === "#text" ? node.value : (node.childNodes || []).map(text).join("");
  const token = (type, tag = "", nesting = 0) => new Token(type, tag, nesting);
  const literal = content => Object.assign(token("text"), { content });
  const inline = children => Object.assign(token("inline"), { children });
  const wrap = (tag, children, attributes = {}) => {
    const open = token(`${tag}_open`, tag, 1);
    for (const [name, value] of Object.entries(attributes)) open.attrSet(name, value);
    return [open, ...children, token(`${tag}_close`, tag, -1)];
  };
  const original = node => {
    const location = node.sourceCodeLocation;
    return location ? html.slice(location.startOffset, location.endOffset)
      : `<${node.tagName}>${text(node)}</${node.tagName}>`;
  };
  function displayWidth(value) {
    const match = /^(\d+(?:\.\d+)?)(px|%)?$/i.exec((value || "").trim());
    if (!match || Number(match[1]) <= 0 || Number(match[1]) > 100000) return null;
    return `${Number(match[1])}${match[2]?.toLowerCase() || "px"}`;
  }
  function media(node) {
    const attributes = attrs(node);
    const video = node.tagName === "video";
    const sourceNode = video ? node.childNodes?.find(child => child.tagName === "source") : null;
    const src = attributes.src || (sourceNode && attrs(sourceNode).src);
    if (!src) return literal(original(node));
    const image = token("image", "img");
    const label = attributes.alt || attributes["aria-label"] || attributes.title || "";
    image.attrSet("src", src);
    image.attrSet("alt", label);
    if (attributes.title) image.attrSet("title", attributes.title);
    image.children = [literal(label)];
    image.meta = {};
    const style = Object.fromEntries((attributes.style || "").split(";").flatMap(declaration => {
      const colon = declaration.indexOf(":");
      return colon < 0 ? [] : [[declaration.slice(0, colon).trim().toLowerCase(), declaration.slice(colon + 1).trim()]];
    }));
    const width = displayWidth(style.width) || displayWidth(attributes.width);
    if (width) image.meta.displayWidth = width;
    const zoom = /^(\d+(?:\.\d+)?)(%)?$/.exec(style.zoom || "");
    if (zoom) {
      const scale = Number(zoom[1]) / (zoom[2] ? 100 : 1);
      if (scale > 0 && scale <= 10) image.meta.scale = scale;
    }
    if (video && attributes.poster) image.meta.poster = attributes.poster;
    return image;
  }
  function inlines(nodes) {
    return nodes.flatMap((node, index) => {
      if (node.nodeName === "#text") return [literal(nodes[index - 1]?.tagName === "br" ? node.value.replace(/^\n/, "") : node.value)];
      if (node.nodeName === "#comment") return [];
      const tag = node.tagName, attributes = attrs(node);
      if (tag === "img" || tag === "video") return [media(node)];
      if (tag === "br") return [token("hardbreak", "br")];
      if (tag === "code") return [Object.assign(token("code_inline", "code"), { content: text(node) })];
      if (tag === "a") {
        if (!attributes.href) return inlines(node.childNodes || []);
        const linkAttrs = { href: attributes.href };
        if (attributes.title) linkAttrs.title = attributes.title;
        if (attributes.target === "_blank") { linkAttrs.target = "_blank"; linkAttrs.rel = "noopener noreferrer"; }
        return wrap("a", inlines(node.childNodes || []), linkAttrs).map(part => {
          if (part.tag === "a") part.type = part.nesting === 1 ? "link_open" : "link_close";
          return part;
        });
      }
      const normalized = tag === "b" ? "strong" : tag === "i" ? "em" : tag;
      if (inlineTags.has(normalized)) {
        const nested = inlines(node.childNodes || []);
        // Editor-generated spans around media do not carry semantic nesting.
        if (normalized === "span" && nested.some(part => part.type === "image")) return nested;
        const safeAttrs = attributes.title ? { title: attributes.title } : {};
        return wrap(normalized, nested, safeAttrs);
      }
      return [literal(original(node))];
    });
  }
  function paragraph(children) {
    return wrap("p", [inline(children)]).map(part => {
      if (part.tag === "p") part.type = part.nesting === 1 ? "paragraph_open" : "paragraph_close";
      return part;
    });
  }
  function flow(nodes, direct = false) {
    const output = [];
    let pending = [];
    const flush = () => {
      if (pending.some(part => part.type !== "text" || part.content.trim())) {
        output.push(...(direct && !pending.some(part => part.type === "image") ? [inline(pending)] : paragraph(pending)));
      }
      pending = [];
    };
    for (const node of nodes) {
      if (node.nodeName === "#comment") continue;
      if (!blocks.has(node.tagName)) { pending.push(...inlines([node])); continue; }
      flush();
      const tag = node.tagName, attributes = attrs(node), children = node.childNodes || [];
      if (containers.has(tag)) { output.push(...flow(children)); continue; }
      if (tag === "p") { output.push(...paragraph(inlines(children))); continue; }
      if (/^h[1-6]$/.test(tag)) {
        const open = token("heading_open", tag, 1);
        if (attributes.id) open.meta = { authoredId: attributes.id };
        output.push(open, inline(inlines(children)), token("heading_close", tag, -1));
        continue;
      }
      if (tag === "pre") {
        const code = children.find(child => child.tagName === "code") || node;
        const language = /(?:^|\s)language-([\w-]+)/.exec(attrs(code).class || "")?.[1] || "";
        output.push(Object.assign(token("fence", "code"), { content: text(code), info: language, block: true }));
        continue;
      }
      if (tag === "hr") { output.push(Object.assign(token("hr", "hr"), { block: true })); continue; }
      if (tag === "figure") {
        const caption = children.find(child => child.tagName === "figcaption");
        const figureTokens = flow(children.filter(child => child !== caption));
        const images = figureTokens.flatMap(part => part.children || []).filter(part => part.type === "image");
        if (caption && images.length === 1) images[0].meta.caption = text(caption).trim();
        else if (caption) figureTokens.push(...flow(caption.childNodes || []));
        output.push(...figureTokens);
        continue;
      }
      const safeAttrs = {};
      if (tag === "ol" && /^\d+$/.test(attributes.start || "")) safeAttrs.start = attributes.start;
      if (tag === "details" && Object.hasOwn(attributes, "open")) safeAttrs.open = "";
      if (tag === "th" || tag === "td") {
        for (const name of ["colspan", "rowspan"]) if (/^[1-9]\d{0,2}$/.test(attributes[name] || "")) safeAttrs[name] = attributes[name];
        const align = /(?:^|;)\s*text-align\s*:\s*(left|right|center)\s*(?:;|$)/i.exec(attributes.style || "");
        if (align) safeAttrs.style = `text-align:${align[1].toLowerCase()}`;
      }
      const nested = ["th", "td", "summary"].includes(tag) ? [inline(inlines(children))]
        : flow(children, tag === "li");
      output.push(...wrap(tag, nested, safeAttrs));
    }
    flush();
    return output;
  }
  return flow(tree.childNodes);
}
