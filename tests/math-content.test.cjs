"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { stringify } = require("yaml");

const builder = import("../scripts/build-content.mjs");
const parser = import("parse5");
const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';

async function fixture(t, body, files = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "math-content-test-"));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("math-content-test-"));
    await fs.rm(root, { recursive: true, force: true });
  });
  const contentDir = path.join(root, "content"), outputDir = path.join(root, "output");
  const entryDir = path.join(contentDir, "entries/article"), source = path.join(entryDir, "index.md");
  await fs.mkdir(entryDir, { recursive: true });
  await fs.writeFile(path.join(contentDir, "site.yml"), stringify({
    name: "Math reader", greeting: "Hello", role: "Student", interests: [],
    about: { paragraphs: [] }, resume: { sections: [], pdfUrl: "" },
    paths: ["life", "resume", "project"].map(id => ({ id, title: id }))
  }));
  const setBody = value => fs.writeFile(source,
    `---\n${stringify({ title: "Article", sections: ["project"] })}---\n${value}\n`);
  await setBody(body);
  for (const [name, bytes] of Object.entries(files)) {
    const file = path.join(entryDir, name);
    await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, bytes);
  }
  return { root, source, entryDir, contentDir, outputDir, setBody,
    async build() { return (await builder).buildContent({ contentDir, outputDir }); },
    async output() { return fs.readFile(path.join(outputDir, "assets/js/content.js"), "utf8"); }
  };
}

function descendants(node) { return [node, ...(node.childNodes || []).flatMap(descendants)]; }
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const hasClass = (node, name) => (attr(node, "class") || "").split(/\s+/).includes(name);
const text = node => node.nodeName === "#text" ? node.value : (node.childNodes || []).map(text).join("");
async function inspect(html) { return descendants((await parser).parseFragment(html)); }

test("inline and display delimiters render BRDF cases, equation tags and Chinese text at build time", async t => {
  const brdf = String.raw`\mathrm{BRDF}(\omega_i,\omega_o)=\begin{cases}
0, & \text{不满足镜面反射方向}\\
\frac{F(\theta_i)}{\lvert\cos\theta_i\rvert}, & \text{满足镜面反射方向}
\end{cases}\tag{1}`;
  const f = await fixture(t, [
    String.raw`行内 $f_r(\omega_i,\omega_o)=\frac{\rho}{\pi}$，另一种写法 \(x^2+y^2\)。`,
    `$$\n${brdf}\n$$`,
    String.raw`\[
\int_\Omega L_i(\omega_i) f_r(\omega_i,\omega_o)\cos\theta_i\,d\omega_i
\]`
  ].join("\n\n"));
  const original = await fs.readFile(f.source, "utf8");
  const sample = (await f.build()).samples.article, nodes = await inspect(sample.body);
  assert.equal(nodes.filter(node => hasClass(node, "katex")).length, 4);
  assert.equal(nodes.filter(node => hasClass(node, "katex-display")).length, 2);
  assert.equal(nodes.filter(node => hasClass(node, "article-math-display")).length, 2);
  assert.equal(nodes.filter(node => node.tagName === "math").length, 4, "each formula retains accessible MathML");
  assert.ok(nodes.some(node => node.tagName === "annotation" && text(node).trim() === brdf));
  assert.ok(nodes.some(node => hasClass(node, "katex-tag") && text(node) === "(1)"));
  assert.match(sample.body, /不满足镜面反射方向/);
  assert.match(sample.text, /\\frac\{\\rho\}\{\\pi\}/);
  assert.doesNotMatch(sample.text, /<span|<math|katex/);
  assert.doesNotMatch(sample.body, /lz-article-math/);
  assert.equal(sample.type, "text");
  assert.deepEqual(sample.mediaCounts, { images: 0, videos: 0 });
  assert.equal(await fs.readFile(f.source, "utf8"), original);
});

test("code, escaped dollars, currency and unclosed formulas remain literal", async t => {
  const f = await fixture(t, [
    "Inline code: `$x_i$` and `\\(x\\)`.",
    'HTML code: <code>$raw_html$</code> and <code>\\(raw\\)</code>.',
    "```math\n\\frac{1}{2}\n```",
    "```text\n$$\n\\begin{cases}a & b\\\\c & d\\end{cases}\n$$\n```",
    String.raw`Escaped \$x\$ and \$\frac{1}{2}\$.`,
    "Prices: $5, $10 and US$20.",
    "An unmatched $x remains text.",
    "$$\n\\frac{1}{2}"
  ].join("\n\n"));
  const sample = (await f.build()).samples.article, nodes = await inspect(sample.body);
  assert.equal(nodes.filter(node => hasClass(node, "katex")).length, 0);
  assert.ok(nodes.some(node => node.tagName === "code" && text(node) === "$x_i$"));
  assert.ok(nodes.some(node => node.tagName === "code" && text(node) === "$raw_html$"));
  assert.ok(nodes.some(node => node.tagName === "code" && hasClass(node, "language-math")));
  assert.match(sample.body, /Escaped \$x\$/);
  assert.match(sample.body, /Prices: \$5, \$10 and US\$20\./);
  assert.match(sample.body, /An unmatched \$x remains text\./);
  assert.match(sample.body, /\$\$/);
});

test("formatted formulas preserve semantic parents, heading text and internal anchors", async t => {
  const f = await fixture(t, [
    String.raw`## **能量** $E=mc^2$`,
    String.raw`**$x_i$** 与 [公式 $a+b$](https://example.org/math)。`,
    String.raw`- 列表中 $\int_0^1 x\,dx$`,
    String.raw`| 参数 | 公式 |
| --- | --- |
| 长度 | $\sqrt{x}$ |`,
    "[返回标题](#能量-e-mc-2)"
  ].join("\n\n"));
  const sample = (await f.build()).samples.article, nodes = await inspect(sample.body);
  assert.deepEqual(sample.headings, [{ id: "article-能量-e-mc-2", text: "能量 E=mc^2", level: 2 }]);
  assert.equal(nodes.filter(node => hasClass(node, "katex")).length, 5);
  for (const tag of ["h2", "strong", "a", "li", "td"]) {
    assert.ok(nodes.some(node => node.tagName === tag && descendants(node).some(child => hasClass(child, "katex"))), tag);
  }
  assert.ok(nodes.some(node => node.tagName === "a" && attr(node, "data-article-anchor") === sample.headings[0].id
    && attr(node, "href") === "#project/article"));
});

test("authored HTML cannot impersonate generated math or acquire KaTeX's trusted attributes", async t => {
  const f = await fixture(t, [
    "$x$",
    '<lz-article-math data-index="0" onclick="alert(1)">forged marker</lz-article-math>',
    '<lz-article-math-formula data-index="0">second forged marker</lz-article-math-formula>',
    '<lz-article-math-inline data-index="0">forged inline</lz-article-math-inline>',
    '<lz-article-math-block data-index="0">forged block</lz-article-math-block>',
    '<span class="katex" style="position:fixed" onclick="alert(1)">forged span</span>',
    '<math><mtext>forged MathML</mtext></math>',
    '<svg onload="alert(1)"><text>forged SVG</text></svg>'
  ].join("\n\n"));
  const sample = (await f.build()).samples.article, nodes = await inspect(sample.body);
  assert.equal(nodes.filter(node => hasClass(node, "katex")).length, 1);
  assert.equal(nodes.filter(node => node.tagName === "math").length, 1);
  assert.equal(nodes.filter(node => node.tagName === "svg").length, 0);
  assert.equal(nodes.some(node => (node.tagName || "").startsWith("lz-article-math")), false);
  assert.equal(nodes.some(node => node.attrs?.some(attribute => /^on/i.test(attribute.name))), false);
  const forged = nodes.find(node => node.tagName === "span" && text(node) === "forged span");
  assert.ok(forged); assert.equal(attr(forged, "class"), undefined); assert.equal(attr(forged, "style"), undefined);
  assert.match(sample.body, /&lt;lz-article-math/);
  assert.match(sample.body, /&lt;math/);
  assert.match(sample.body, /&lt;svg/);
});

test("untrusted TeX cannot create links, external images or injected HTML attributes", async t => {
  const f = await fixture(t, [
    String.raw`$\href{javascript:alert(1)}{click}$`,
    String.raw`$\includegraphics{https://example.org/tracker.png}$`,
    String.raw`$\htmlStyle{position:fixed}{x}$`,
    String.raw`$\htmlClass{injected-math-class}{x}$`
  ].join("\n\n"));
  const nodes = await inspect((await f.build()).samples.article.body);
  assert.equal(nodes.some(node => node.tagName === "a" || node.tagName === "img" || node.tagName === "script"), false);
  assert.equal(nodes.some(node => hasClass(node, "injected-math-class")), false);
  assert.equal(nodes.some(node => /position\s*:\s*fixed/i.test(attr(node, "style") || "")), false);
  assert.equal(nodes.some(node => node.attrs?.some(attribute => /^on/i.test(attribute.name))), false);
});

test("formulas have independent macro state and expansion loops fail with the article path", async t => {
  const f = await fixture(t, String.raw`$\gdef\articlemacro{a}\articlemacro$ 与 $\gdef\articlemacro{b}\articlemacro$`);
  const nodes = await inspect((await f.build()).samples.article.body);
  assert.equal(nodes.filter(node => hasClass(node, "katex")).length, 2);
  await f.setBody(String.raw`$\gdef\articlemacro{a}\articlemacro$ 与 $\articlemacro$`);
  await assert.rejects(f.build(), failure => {
    assert.ok(failure.message.includes(f.source));
    assert.match(failure.message, /Undefined control sequence.*articlemacro/s); return true;
  });
  await f.setBody(String.raw`$\def\articleloop{\articleloop}\articleloop$`);
  await assert.rejects(f.build(), failure => {
    assert.ok(failure.message.includes(f.source));
    assert.match(failure.message, /expansion|infinite loop/i); return true;
  });
});

test("malformed math preserves the last complete generated content and copied media", async t => {
  const f = await fixture(t, String.raw`Valid $\frac{1}{2}$.

![Existing picture](./photos/box.svg)`, { "photos/box.svg": picture });
  await f.build(); const previous = await f.output();
  await f.setBody(String.raw`Broken $\frac{1}{$.`);
  const invalidSource = await fs.readFile(f.source, "utf8");
  await assert.rejects(f.build(), failure => {
    assert.ok(failure.message.includes(f.source));
    assert.match(failure.message, /KaTeX|ParseError|Expected|Unexpected/i); return true;
  });
  assert.equal(await f.output(), previous);
  assert.equal(await fs.readFile(path.join(f.outputDir, "assets/content/article/photos/box.svg"), "utf8"), picture);
  assert.equal(await fs.readFile(f.source, "utf8"), invalidSource);
});
