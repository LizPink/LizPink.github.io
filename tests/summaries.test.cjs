"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { parse } = require("yaml");

const read = name => fs.readFileSync(path.join(__dirname, "../site/assets/js", name), "utf8");
const sources = ["content-index.js", "commands.js", "summaries.js"].map(read);
const descendants = node => node.children.flatMap(child => [child, ...descendants(child)]);
const find = (node, className) => descendants(node).find(child => child.className.split(/\s+/).includes(className));
const all = (node, tag) => descendants(node).filter(child => child.tagName === tag);

class Node {
  constructor(tagName, className = "") {
    Object.assign(this, { tagName, className, children: [], parentElement: null, attributes: {}, dataset: {}, text: "" });
  }
  append(...children) { children.forEach(child => { child.parentElement = this; this.children.push(child); }); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(""); }
  set innerHTML(_) { throw new Error("Content must be assigned as text"); }
}
function load(content) {
  const window = { LIZPINK_CONTENT: content };
  const document = { baseURI: "https://example.test/portfolio/", createElement: tag => new Node(tag) };
  const context = vm.createContext({ window, document, URL });
  sources.forEach(source => vm.runInContext(source, context));
  return { create: window.LIZPINK_SUMMARIES.create, index: window.LIZPINK_CONTENT_INDEX };
}
function contentWith(route, samples = {}, extras = {}) {
  return {
    paths: [{ id: route, title: `自定${route}`, description: `介绍${route}`, items: Object.keys(samples) }],
    samples, resume: { sections: [], pdfUrl: "" }, ...extras
  };
}

test("real site configuration supplies each persistent title/description and the home profile", () => {
  const config = parse(fs.readFileSync(path.join(__dirname, "../content/site.yml"), "utf8"));
  const { create } = load(config);
  for (const section of config.paths) {
    const { node, detailLabel } = create(section.id);
    const title = find(node, "summary-title"), intro = find(node, "summary-description"), overview = find(node, "summary-overview");
    assert.equal(title.tagName, "h2"); assert.equal(title.textContent, section.title);
    assert.equal(intro.textContent, section.description);
    assert.equal(title.parentElement, node); assert.equal(intro.parentElement, node);
    assert.notEqual(intro.parentElement, overview);
    assert.equal(detailLabel, null);
    assert.equal(find(node, "summary-section-title").textContent, "最近内容");
    assert.equal(find(node, "summary-empty").textContent, "这个分区还没有内容。");
  }
  const { node } = create("home");
  assert.equal(node.className, "home-profile");
  assert.equal(find(node, "home-role")?.textContent, `职业：${config.role}`);
  assert.equal(find(node, "home-interests")?.textContent, `关注：${config.interests.join(" · ")}`);
  assert.deepEqual(find(node, "home-about").children.map(child => child.textContent), config.about.paragraphs);
});

test("ten newest entries use the index's update-first order instead of path/source order", () => {
  const samples = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`entry-${index}`, {
    title: `文章${index}`, text: `简介${index}`, publishedAt: `2026-01-${String(index + 1).padStart(2, "0")}`,
    ...(index === 0 ? { updatedAt: "2027-01-01" } : {}), mediaCounts: { images: 9, videos: 6 }
  }]));
  const { create } = load(contentWith("project", samples));
  const { node, detailLabel } = create("project");
  const overview = find(node, "summary-overview"), buttons = all(overview, "button"), dates = all(overview, "time");
  assert.equal(buttons.length, 10);
  assert.deepEqual(buttons.map(button => button.dataset.contentKey), ["entry-0", "entry-11", "entry-10", "entry-9", "entry-8", "entry-7", "entry-6", "entry-5", "entry-4", "entry-3"]);
  assert.equal(dates[0].dateTime, "2027-01-01"); assert.equal(dates[0].textContent, "2027.01.01");
  assert.equal(buttons.every(button => button.dataset.contentRoute === "project" && button.type === "button"), true);
  assert.equal(detailLabel, "展开");
  assert.equal(find(node, "summary-meta"), undefined);
  assert.doesNotMatch(node.textContent, /张图片|段视频|条文字|简介/);
});

test("an explicitly empty site keeps section introductions, resume status and the configured home profile", () => {
  const config = parse(fs.readFileSync(path.join(__dirname, "../content/site.yml"), "utf8"));
  const content = { ...config, paths: config.paths.map(section => ({ ...section, items: [] })), samples: {}, resume: { sections: [], pdfUrl: "" } };
  const { create, index } = load(content);
  assert.deepEqual(Object.keys(content.samples), []);
  for (const route of ["life", "resume", "project"]) {
    const { node, detailLabel } = create(route);
    assert.equal(index.items(route).length, 0);
    assert.equal(all(find(node, "summary-overview"), "button").length, 0);
    assert.equal(all(node, "time").length, 0);
    assert.equal(find(node, "summary-empty").textContent, "这个分区还没有内容。");
    assert.equal(find(node, "summary-description").textContent, content.paths.find(section => section.id === route).description);
    assert.equal(detailLabel, null);
  }
  const resume = create("resume").node;
  assert.equal(all(find(resume, "summary-facts"), "dt")[0].textContent, "简历");
  assert.equal(all(find(resume, "summary-facts"), "dd")[0].textContent, "PDF 待添加");
  const home = create("home").node;
  assert.equal(find(home, "home-role").textContent, `职业：${content.role}`);
  assert.equal(find(home, "home-interests").textContent, `关注：${Array.from(content.interests).join(" · ")}`);
  assert.deepEqual(find(home, "home-about").children.map(paragraph => paragraph.textContent), Array.from(content.about.paragraphs));
});

test("actual generated summaries adopt current articles without requiring a permanently empty site", () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../dist/assets/js/content.js"), "utf8"), { window });
  const content = window.LIZPINK_CONTENT, { create, index } = load(content);
  for (const route of ["life", "resume", "project"]) {
    const { node } = create(route), expected = Array.from(index.items(route)).slice(0, 10);
    const overview = find(node, "summary-overview");
    assert.deepEqual(all(overview, "button").map(button => button.dataset.contentKey), expected.map(item => item.key));
    assert.deepEqual(all(overview, "time").map(time => [time.dateTime, time.textContent]), expected.filter(item => item.date).map(item => [item.date.value, item.date.text]));
    assert.equal(find(node, "summary-description").textContent, content.paths.find(section => section.id === route).description);
    if (!expected.length) assert.equal(find(node, "summary-empty").textContent, "这个分区还没有内容。");
  }
  assert.equal(all(find(create("resume").node, "summary-facts"), "dt")[0].textContent, "简历");
  const home = create("home").node;
  assert.equal(find(home, "home-role").textContent, `职业：${content.role}`);
});

test("undated entries contain only a title and invalid dates do not create empty date slots", () => {
  const { create } = load(contentWith("life", {
    undated: { title: "无日期" }, invalid: { title: "错误日期", updatedAt: "2026-02-30" },
    dated: { title: "有日期", publishedAt: "2026-10-05" }
  }));
  const { node } = create("life");
  const rows = all(node, "li");
  assert.deepEqual(rows.map(row => row.children.map(child => child.tagName)), [["time", "button"], ["button"], ["button"]]);
  assert.equal(rows[0].children[0].dateTime, "2026-10-05");
  assert.equal(rows[1].textContent, "无日期"); assert.equal(rows[2].textContent, "错误日期");
});

test("profile fields appear only on home and never add duplicate headings or metadata copy", () => {
  const profile = { name: "NAME-MARKER", greeting: "GREETING-MARKER", description: "META-MARKER", role: "ROLE-MARKER",
    interests: ["Graphics-MARKER", "Games-MARKER"], about: { paragraphs: ["ABOUT-MARKER"] } };
  const { create } = load(contentWith("resume", {}, profile));
  const { node, detailLabel } = create("home");
  assert.equal(detailLabel, null); assert.equal(all(node, "h1").length + all(node, "h2").length, 0);
  assert.equal(find(node, "home-role").textContent, "职业：ROLE-MARKER");
  assert.equal(node.textContent, "职业：ROLE-MARKER关注：Graphics-MARKER · Games-MARKERABOUT-MARKER");
  assert.doesNotMatch(node.textContent, /NAME-MARKER|GREETING-MARKER|META-MARKER/);
  const resume = create("resume").node;
  assert.doesNotMatch(resume.textContent, /ROLE-MARKER|Graphics-MARKER|Games-MARKER|ABOUT-MARKER|经历待补充/);
  assert.equal(find(resume, "summary-facts").children.length, 1);
});

test("empty profile fields are omitted and all supplied labels remain literal safe text", () => {
  const empty = load({ role: " ", interests: ["", null, 12], about: { paragraphs: ["", null] } }).create("home").node;
  assert.equal(empty.children.length, 0); assert.equal(empty.textContent, "");
  for (const role of [undefined, null, "", " \n\t ", 0, {}, []]) {
    const node = load({ role }).create("home").node;
    assert.equal(find(node, "home-role"), undefined);
    assert.doesNotMatch(node.textContent, /职业：|待补充|Student/);
  }
  const text = '<img src=x onerror="alert(1)">';
  const content = contentWith("project", { x: { title: text } }, { role: text, interests: [text], about: { paragraphs: [text] } });
  content.paths[0].title = text; content.paths[0].description = text;
  const { create } = load(content);
  for (const route of ["home", "project"]) {
    const node = create(route).node;
    assert.match(node.textContent, /<img src=x/);
    assert.equal(all(node, "img").length, 0);
    assert.equal(descendants(node).some(child => Object.keys(child.attributes).some(attribute => attribute.startsWith("on"))), false);
    if (route === "home") assert.equal(find(node, "home-role").textContent, `职业：${text}`);
  }
});

test("expand is offered only for articles or real resume section items, never PDF alone", () => {
  for (const route of ["life", "project", "resume"]) {
    assert.equal(load(contentWith(route)).create(route).detailLabel, null);
    assert.equal(load(contentWith(route, { entry: { title: "真实条目" } })).create(route).detailLabel, "展开");
  }
  for (const sections of [[], [{ heading: "Education", items: [] }], [{ heading: "Education", items: [{ title: " ", detail: "" }] }]]) {
    assert.equal(load(contentWith("resume", {}, { resume: { sections, pdfUrl: "./files/resume.pdf" } })).create("resume").detailLabel, null);
  }
  const content = contentWith("resume", {}, { resume: { sections: [{ heading: "教育", items: [{ title: "学校", detail: "学习经历" }] }], pdfUrl: "" } });
  assert.equal(load(content).create("resume").detailLabel, "展开");
});

test("resume PDF is a permanent safe link outside the collapsible recent overview", () => {
  for (const [value, href] of [["./files/resume.pdf", "https://example.test/portfolio/files/resume.pdf"],
    ["/files/resume.pdf", "https://example.test/files/resume.pdf"], ["https://cdn.test/resume.pdf", "https://cdn.test/resume.pdf"], ["http://cdn.test/resume.pdf", "http://cdn.test/resume.pdf"]]) {
    const { node, detailLabel } = load(contentWith("resume", {}, { resume: { sections: [], pdfUrl: value } })).create("resume");
    const facts = find(node, "summary-facts"), link = find(node, "resume-pdf-link");
    assert.equal(facts.parentElement, node);
    assert.deepEqual(node.children.map(child => child.className), ["summary-title", "summary-description", "summary-facts", "summary-overview"]);
    assert.equal(all(facts, "dt")[0].textContent, "简历");
    assert.equal(link.href, href); assert.equal(link.target, "_blank"); assert.equal(link.rel, "noopener noreferrer");
    assert.equal(link.getAttribute("aria-label"), "打开 PDF 简历"); assert.equal(detailLabel, null);
  }
});

test("missing or unsafe PDF URLs remain a plain status without a fake interactive control", () => {
  for (const value of [undefined, "", " ", "javascript:alert(1)", "data:application/pdf,x", "file:///C:/resume.pdf", "https://[invalid", {}]) {
    const { node } = load(contentWith("resume", {}, { resume: { sections: [], pdfUrl: value } })).create("resume");
    const facts = find(node, "summary-facts");
    assert.equal(all(facts, "a").length, 0); assert.equal(all(facts, "button").length, 0);
    assert.equal(all(facts, "dd")[0].textContent, "PDF 待添加");
    assert.equal(facts.parentElement, node);
  }
});
