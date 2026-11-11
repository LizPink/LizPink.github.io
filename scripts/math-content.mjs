import katex from "katex";
import { tex } from "@mdit/plugin-tex";

const parsers = new WeakSet();

export function enableArticleMath(markdown) {
  if (parsers.has(markdown)) return;
  parsers.add(markdown);
  markdown.use(tex, {
    delimiters: "all", mathFence: false,
    render(content, displayMode, environment) {
      const index = environment.articleMath.push({ content, displayMode }) - 1;
      const tag = environment.articleMathTag;
      return `<${tag} data-index="${index}"></${tag}>`;
    }
  });
  // Raw HTML <code> can contain Markdown inline tokens. Keep their mathematics
  // literal, just as backticks and fenced code already do.
  markdown.core.ruler.after("inline", "article_math_code", state => {
    for (const block of state.tokens) {
      let codeDepth = 0;
      for (const child of block.children || []) {
        const code = child.type === "html_inline" && /^<\s*(\/?)\s*code\b/i.exec(child.content);
        if (code) codeDepth = Math.max(0, codeDepth + (code[1] ? -1 : 1));
        else if (codeDepth && child.type === "math_inline") {
          child.type = "text";
          child.content = child.markup === "\\(" ? `\\(${child.content}\\)` : `$${child.content}$`;
        }
      }
    }
  });
  const render = (tokens, index) => {
    const token = tokens[index];
    const displayMode = token.meta.displayMode;
    const html = katex.renderToString(token.content, {
      displayMode, output: "htmlAndMathml", throwOnError: true, trust: false,
      strict: "warn", maxSize: 20, maxExpand: 1000, macros: {}
    });
    return displayMode
      ? `<span class="article-math-display" tabindex="0" role="group" aria-label="独立公式">${html}</span>\n`
      : html;
  };
  markdown.renderer.rules.article_math_inline = render;
  markdown.renderer.rules.article_math_block = render;
}

export function articleMathEnvironment(source) {
  let articleMathTag = "lz-article-math";
  while (source.toLowerCase().includes(articleMathTag)) articleMathTag += "-formula";
  return { articleMathTag, articleMath: [] };
}
