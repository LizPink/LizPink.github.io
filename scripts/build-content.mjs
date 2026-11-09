import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import { parseDocument } from "yaml";
import { assetVersion, withAssetVersion } from "./asset-version.mjs";
import { applyGitUpdateDates } from "./content-dates.mjs";
import { parseArticleTokens } from "./html-content.mjs";
import { normalizeContentPath, preserveWindowsDestinations } from "./content-paths.mjs";
import { renameWithRetry, removeWithRetry } from "./build-files.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routeNames = { life: "生活", resume: "经历", project: "项目" };
const fields = new Set(["title", "sections", "publishedAt", "updatedAt", "summary", "order"]);
const imageExtensions = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp"]);
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const error = (file, message) => new Error(`${file}: ${message}`);
const compact = value => value.replace(/\s+/g, " ").trim();

function yamlObject(source, file) {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length || document.warnings.length) {
    throw error(file, [...document.errors, ...document.warnings].map(item => item.message).join("; "));
  }
  const value = document.toJS({ maxAliasCount: 0 });
  if (!record(value)) throw error(file, "YAML必须是对象。");
  return value;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function withoutLegacyFlags(value) {
  if (Array.isArray(value)) return value.map(withoutLegacyFlags);
  if (!record(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== "example" && key !== "dateExample")
    .map(([key, item]) => [key, withoutLegacyFlags(item)]));
}

function configureSite(site, file) {
  for (const field of ["name", "greeting"]) {
    if (typeof site[field] !== "string" || !site[field].trim()) throw error(file, `${field}必须是非空文字。`);
  }
  if (typeof site.role !== "string") throw error(file, "role必须是文字。");
  if (!Array.isArray(site.interests) || !site.interests.every(item => typeof item === "string")) {
    throw error(file, "interests必须是文字数组。");
  }
  if (!Array.isArray(site.paths)) throw error(file, "paths必须配置生活、经历、项目三个栏目。");
  const seen = new Set();
  const paths = site.paths.map(item => {
    if (!record(item) || typeof item.id !== "string" || !Object.hasOwn(routeNames, item.id) || seen.has(item.id)) {
      throw error(file, "paths含有无效或重复的栏目id。");
    }
    seen.add(item.id);
    if (Object.hasOwn(item, "introduction")) throw error(file, `paths.${item.id}.introduction已合并到description，请只填写description。`);
    for (const field of ["title", "description"]) {
      if (Object.hasOwn(item, field) && typeof item[field] !== "string") throw error(file, `paths.${item.id}.${field}必须是文字。`);
    }
    const number = { life: "01", resume: "02", project: "03" }[item.id];
    return { title: routeNames[item.id], number, command: item.id, description: "", ...item, items: [] };
  });
  if (seen.size !== 3) throw error(file, "paths必须包含life、resume、project。");
  if (record(site.resume) && Object.hasOwn(site.resume, "introduction")) {
    throw error(file, "resume.introduction已移除，请在about.paragraphs填写首页介绍。");
  }
  const content = withoutLegacyFlags({
    ...site, paths,
    about: { paragraphs: [], ...site.about },
    resume: { sections: [], pdfUrl: "", ...site.resume },
    samples: {}
  });
  // The removed site-wide description is ignored, not published elsewhere.
  delete content.description;
  if (!Array.isArray(content.about.paragraphs) || !content.about.paragraphs.every(item => typeof item === "string")) {
    throw error(file, "about.paragraphs必须是文字数组。");
  }
  if (!Array.isArray(content.resume.sections)) throw error(file, "resume.sections必须是数组。");
  content.resume.sections.forEach((section, index) => {
    if (!record(section) || typeof section.heading !== "string" || !Array.isArray(section.items)) {
      throw error(file, `resume.sections[${index}]必须包含heading文字和items数组。`);
    }
    section.items.forEach((item, itemIndex) => {
      if (!record(item) || typeof item.title !== "string" || typeof item.detail !== "string") {
        throw error(file, `resume.sections[${index}].items[${itemIndex}]必须包含title和detail文字。`);
      }
    });
  });
  content.samples = Object.create(null);
  return content;
}

async function validateResume(content, contentDir, siteFile, versionOf) {
  const value = content.resume.pdfUrl;
  if (typeof value !== "string") throw error(siteFile, "resume.pdfUrl必须是文字。");
  if (!value) return;
  if (/^https:/i.test(value)) {
    const url = new URL(value);
    if (!url.hostname) throw error(siteFile, "PDF的HTTPS链接无效。");
    return;
  }
  checkProtocol(value, siteFile);
  const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
  const root = path.join(contentDir, "files");
  const target = path.resolve(contentDir, pathname);
  if (/[\\\u0000-\u001f\u007f]/.test(pathname) || path.isAbsolute(pathname) || path.win32.isAbsolute(pathname) ||
      !inside(root, target) || path.extname(target).toLowerCase() !== ".pdf") throw error(siteFile, "本地PDF必须位于content/files目录内。");
  const actual = await fs.realpath(target);
  if (!inside(root, actual) || !(await fs.stat(actual)).isFile()) throw error(siteFile, "PDF文件不存在或越过files目录。");
  content.resume.pdfUrl = withAssetVersion(value, await versionOf(actual));
}

async function readEntry(directory, key) {
  if (!/^[\p{L}\p{N}_-]+$/u.test(key)) throw error(directory, "条目目录名只能使用文字、数字、下划线和连字符。");
  const file = path.join(directory, "index.md");
  if (!inside(directory, await fs.realpath(file))) throw error(file, "正文文件不能越过条目目录。");
  const source = (await fs.readFile(file, "utf8")).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = source.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) throw error(file, "正文必须以YAML元信息开头（---）。");
  const metadata = yamlObject(match[1], file);
  for (const field of Object.keys(metadata)) if (!fields.has(field)) throw error(file, `不支持元信息字段：${field}`);
  if (typeof metadata.title !== "string" || !metadata.title.trim()) throw error(file, "title不能为空。");
  if (!Array.isArray(metadata.sections) || !metadata.sections.length ||
      !metadata.sections.every(section => typeof section === "string" && Object.hasOwn(routeNames, section))) throw error(file, "sections必须引用有效栏目。");
  for (const field of ["publishedAt", "updatedAt"]) {
    if (Object.hasOwn(metadata, field) && !validDate(metadata[field])) throw error(file, `${field}必须是有效的YYYY-MM-DD日期。`);
  }
  if (Object.hasOwn(metadata, "summary") && typeof metadata.summary !== "string") throw error(file, "summary必须是文字。");
  if (Object.hasOwn(metadata, "order") && (typeof metadata.order !== "number" || !Number.isFinite(metadata.order))) {
    throw error(file, "order必须是有限数字。");
  }
  return { key, directory, file, metadata, markdown: source.slice(match[0].length) };
}

function entryOrder(left, right) {
  const a = left.metadata.updatedAt || left.metadata.publishedAt || "";
  const b = right.metadata.updatedAt || right.metadata.publishedAt || "";
  return compareText(b, a) || (left.metadata.order ?? Infinity) - (right.metadata.order ?? Infinity) || compareText(left.key, right.key);
}

function plain(tokens = []) {
  return tokens.map(token => token.type === "softbreak" || token.type === "hardbreak" ? " "
    : token.children ? plain(token.children) : token.nesting ? "" : token.content || "").join("");
}

function slug(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
}

function checkProtocol(value, file) {
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { throw error(file, `链接编码无效：${value}`); }
  const normalized = decoded.replace(/[\u0000-\u0020\u007f]/g, "");
  const scheme = normalized.match(/^([a-z][a-z\d+.-]*):/i)?.[1].toLowerCase();
  if ((scheme && !["http", "https", "mailto"].includes(scheme)) || normalized.startsWith("//")) {
    throw error(file, `不允许的链接协议：${value}`);
  }
}

async function optionalFile(file) {
  try { await fs.lstat(file); return true; }
  catch (failure) { if (failure.code === "ENOENT") return false; throw failure; }
}

async function renderEntry(entry, content, entries, assets, versionOf) {
  const markdown = new MarkdownIt({ html: true, linkify: false, typographer: false });
  preserveWindowsDestinations(markdown);
  const originalNormalization = markdown.normalizeLink;
  markdown.normalizeLink = value => originalNormalization(normalizeContentPath(value, entry));
  const originalValidation = markdown.validateLink;
  markdown.validateLink = value => { checkProtocol(value, entry.file); return originalValidation(value); };
  const escape = markdown.utils.escapeHtml;
  let tokens;
  try { tokens = parseArticleTokens(markdown, entry.markdown); }
  catch (failure) { throw error(entry.file, failure.message); }
  const headings = [];
  const targets = new Map();
  const usedIds = new Set();
  const canonical = content.paths.find(item => entry.metadata.sections.includes(item.id)).id;
  const articleHash = `#${canonical}/${encodeURIComponent(entry.key)}`;
  let firstParagraph = "";
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "heading_open") {
      if (token.tag === "h1") throw error(entry.file, "正文不允许h1，请在元信息填写title，正文从##开始。");
      const text = compact(plain(tokens[index + 1]?.children));
      const name = slug(text);
      const base = `${entry.key}-${name}`;
      let id = base, suffix = 2;
      while (usedIds.has(id)) id = `${base}-${suffix++}`;
      usedIds.add(id); token.attrSet("id", id);
      if (!targets.has(name)) targets.set(name, id);
      targets.set(id, id);
      const authoredId = token.meta?.authoredId;
      if (authoredId && !targets.has(authoredId)) targets.set(authoredId, id);
      headings.push({ id, text, level: Number(token.tag.slice(1)) });
    }
    if (!firstParagraph && token.type === "paragraph_open" && tokens[index + 1]?.type === "inline") {
      firstParagraph = compact(plain(tokens[index + 1].children));
    }
  }

  async function asset(value) {
    value = normalizeContentPath(value, entry);
    checkProtocol(value, entry.file);
    if (/^[a-z][a-z\d+.-]*:/i.test(value)) throw error(entry.file, "媒体及附件必须存放在条目目录内。");
    const match = value.match(/^([^?#]*)([?#][\s\S]*)?$/);
    const relative = decodeURIComponent(match[1]);
    if (!relative || /[\\\u0000-\u001f\u007f]/.test(relative) || path.isAbsolute(relative) || path.win32.isAbsolute(relative)) {
      throw error(entry.file, `资源路径无效：${value}`);
    }
    const target = path.resolve(entry.directory, relative);
    if (!inside(entry.directory, target)) throw error(entry.file, `资源越过条目目录：${value}`);
    const actual = await fs.realpath(target);
    if (!inside(entry.directory, actual) || !(await fs.stat(actual)).isFile()) throw error(entry.file, `资源不是目录内的文件：${value}`);
    const name = path.relative(entry.directory, target).split(path.sep).join("/");
    const destination = `${entry.key}/${name}`;
    assets.set(destination, actual);
    const url = `./assets/content/${destination.split("/").map(encodeURIComponent).join("/")}${match[2] || ""}`;
    return { url: withAssetVersion(url, await versionOf(actual)), target, name };
  }

  const mediaCounts = { images: 0, videos: 0 };
  let mediaIndex = 0;
  async function comparisonFigure(images) {
    const rendered = [], labels = [];
    const captionId = `${entry.key}-media-${++mediaIndex}`;
    for (const [index, image] of images.entries()) {
      const resource = await asset(image.attrGet("src"));
      if (!imageExtensions.has(path.extname(resource.target).toLowerCase())) {
        throw error(entry.file, "图片对比块只支持图片文件，不能使用视频或附件。");
      }
      const label = escape(image.meta?.caption || compact(plain(image.children)) || entry.metadata.title);
      labels.push(label);
      rendered.push(`<img class="comparison-image" slot="${index ? "second" : "first"}" src="${escape(resource.url)}" alt="${label}" loading="lazy" decoding="async">`);
    }
    mediaCounts.images += 2;
    const sizing = [];
    if (images[0].meta?.displayWidth) sizing.push(`--asset-display-width:${images[0].meta.displayWidth}`);
    if (images[0].meta?.scale) sizing.push(`--asset-scale:${images[0].meta.scale}`);
    const style = sizing.length ? ` style="${escape(sizing.join(";"))}"` : "";
    return `<figure class="sample-media sample-comparison"${style}><div class="image-comparison" data-image-comparison><img-comparison-slider value="50" tabindex="0" aria-label="拖动分割线对比两张图片" aria-describedby="${escape(captionId)}">${rendered.join("")}</img-comparison-slider><div class="comparison-labels" aria-hidden="true"><span data-comparison-label="first">${labels[0]}</span><span data-comparison-label="second">${labels[1]}</span></div></div><figcaption id="${escape(captionId)}">${labels.join(" / ")}</figcaption><button type="button" class="comparison-expand" data-comparison-expand>放大对比</button></figure>\n`;
  }
  async function figure(image) {
    const value = image.attrGet("src");
    const resource = await asset(value);
    const extension = path.extname(resource.target).toLowerCase();
    const description = image.meta?.caption || compact(plain(image.children)) || entry.metadata.title;
    const label = escape(description);
    const captionId = `${entry.key}-media-${++mediaIndex}`;
    const sizing = [];
    if (image.meta?.displayWidth) sizing.push(`--asset-display-width:${image.meta.displayWidth}`);
    if (image.meta?.scale) sizing.push(`--asset-scale:${image.meta.scale}`);
    const figureStyle = sizing.length ? ` style="${escape(sizing.join(";"))}"` : "";
    if (extension === ".mp4") {
      mediaCounts.videos += 1;
      const base = resource.target.slice(0, -path.extname(resource.target).length);
      let poster = "", track = "";
      if (image.meta?.poster) {
        const item = await asset(image.meta.poster);
        if (!imageExtensions.has(path.extname(item.target).toLowerCase())) throw error(entry.file, "视频封面必须是图片文件。");
        poster = ` poster="${escape(item.url)}"`;
      }
      for (const type of poster ? [] : ["svg", "png", "jpg", "webp"]) {
        const file = `${base}.poster.${type}`;
        if (await optionalFile(file)) {
          const item = await asset(`./${path.relative(entry.directory, file).split(path.sep).map(encodeURIComponent).join("/")}`);
          poster = ` poster="${escape(item.url)}"`; break;
        }
      }
      const captions = `${base}.zh.vtt`;
      if (await optionalFile(captions)) {
        const item = await asset(`./${path.relative(entry.directory, captions).split(path.sep).map(encodeURIComponent).join("/")}`);
        track = `<track kind="captions" src="${escape(item.url)}" srclang="zh" label="中文说明" default>`;
      }
      const videoSizing = ["--asset-width:640px", ...sizing].join(";");
      return `<figure class="sample-media" style="${escape(videoSizing)}"><video src="${escape(resource.url)}"${poster} controls preload="none" playsinline width="640" height="360" aria-label="${label}" aria-describedby="${escape(captionId)}">${track}你的浏览器暂不支持此视频。</video><figcaption id="${escape(captionId)}">${label}</figcaption></figure>\n`;
    }
    if (!imageExtensions.has(extension)) throw error(entry.file, `图片仅支持图像文件或MP4视频：${value}`);
    mediaCounts.images += 1;
    return `<figure class="sample-media"${figureStyle}><a class="media-zoom" href="${escape(resource.url)}" target="_blank" rel="noopener noreferrer" aria-label="查看大图：${label}"><img src="${escape(resource.url)}" alt="${label}" loading="lazy" decoding="async" width="960" height="540"></a><figcaption id="${escape(captionId)}">${label}</figcaption></figure>\n`;
  }

  for (const block of tokens) {
    if (block.type !== "inline") continue;
    for (const token of block.children || []) {
      if (token.type !== "link_open") continue;
      const href = markdown.normalizeLink(token.attrGet("href"));
      token.attrSet("href", href);
      checkProtocol(href, entry.file);
      if (href.startsWith("#")) {
        const target = decodeURIComponent(href.slice(1));
        const id = targets.get(target) || targets.get(slug(target));
        if (id) {
          token.attrSet("data-article-anchor", id); token.attrSet("href", articleHash);
        } else {
          const [route, key, extra] = target.split("/");
          if (!["home", "help", ...Object.keys(routeNames)].includes(route) || extra !== undefined ||
              (key && !entries.get(key)?.metadata.sections.includes(route))) throw error(entry.file, `找不到小标题或内容链接：${href}`);
          token.attrSet("href", `#${route}${key ? `/${encodeURIComponent(key)}` : ""}`);
        }
      } else if (!/^[a-z][a-z\d+.-]*:/i.test(href)) {
        token.attrSet("href", (await asset(href)).url);
      }
    }
  }

  const rendered = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const open = tokens[index], inline = tokens[index + 1], close = tokens[index + 2];
    if (open.type === "image_comparison") {
      const comparison = new open.constructor("html_block", "", 0);
      comparison.block = true;
      comparison.content = await comparisonFigure(open.meta.images);
      rendered.push(comparison);
      continue;
    }
    if (open.type !== "paragraph_open" || inline?.type !== "inline" || close?.type !== "paragraph_close" ||
        !inline.children.some(token => token.type === "image")) {
      if (open.type === "inline" && open.children?.some(token => token.type === "image")) {
        throw error(entry.file, "媒体请放在正文段落，不能放在标题或表格内。");
      }
      rendered.push(open); continue;
    }
    let chunk = [], nesting = 0;
    const flush = () => {
      if (compact(plain(chunk))) {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(inline)), inline, { children: chunk });
        rendered.push(open, copy, close);
      }
      chunk = [];
    };
    for (const token of inline.children) {
      if (token.type === "image") {
        if (nesting) throw error(entry.file, "媒体不能包在链接或强调标记内，请作为独立内容插入。");
        flush();
        const media = new inline.constructor("html_block", "", 0);
        media.block = true; media.content = await figure(token);
        rendered.push(media);
      } else { nesting += token.nesting; chunk.push(token); }
    }
    flush(); index += 2;
  }
  return {
    title: entry.metadata.title,
    text: compact(entry.metadata.summary ?? firstParagraph),
    type: mediaCounts.videos ? "video" : mediaCounts.images ? "image" : "text",
    body: markdown.renderer.render(rendered, markdown.options, {}), headings, mediaCounts,
    ...Object.fromEntries(["publishedAt", "updatedAt"].filter(field => Object.hasOwn(entry.metadata, field)).map(field => [field, entry.metadata[field]]))
  };
}

async function publish(content, assets, outputDir) {
  await fs.mkdir(path.dirname(outputDir), { recursive: true });
  const staging = await fs.mkdtemp(path.join(path.dirname(outputDir), ".content-build-"));
  const stagedMedia = path.join(staging, "content");
  const media = path.join(outputDir, "assets/content");
  const previous = path.join(staging, "previous-content");
  let backedUp = false, installed = false, preserveRecovery = false;
  let pendingFailure;
  try {
    await fs.mkdir(stagedMedia, { recursive: true });
    for (const [name, source] of assets) {
      const target = path.resolve(stagedMedia, name);
      if (!inside(stagedMedia, target)) throw new Error("构建资源目标越界。");
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }
    const serialized = JSON.stringify(content).replace(/</g, "\\u003c");
    const script = `// Generated by scripts/build-content.mjs. Edit content sources instead.\nwindow.LIZPINK_CONTENT = JSON.parse(${JSON.stringify(serialized)});\n`;
    const stagedScript = path.join(staging, "content.js");
    await fs.writeFile(stagedScript, script, "utf8");
    await fs.mkdir(path.join(outputDir, "assets/js"), { recursive: true });
    if (await optionalFile(media)) { await renameWithRetry(media, previous); backedUp = true; }
    await renameWithRetry(stagedMedia, media); installed = true;
    // This atomic replacement is last, after all parsing and resource copies succeed.
    await renameWithRetry(stagedScript, path.join(outputDir, "assets/js/content.js"));
  } catch (failure) {
    pendingFailure = failure;
    const restoreErrors = [];
    if (installed) {
      try { await renameWithRetry(media, stagedMedia); installed = false; }
      catch (restoreFailure) { restoreErrors.push(restoreFailure); }
    }
    // Do not replace an installed tree if moving it back failed. Keep the old
    // backup intact instead of risking it in a rename to an occupied target.
    if (backedUp && !installed) {
      try { await renameWithRetry(previous, media); backedUp = false; }
      catch (restoreFailure) { restoreErrors.push(restoreFailure); }
    }
    if (restoreErrors.length) {
      preserveRecovery = true;
      const combined = new AggregateError([failure, ...restoreErrors],
        `内容生成失败：${failure.message}；素材恢复也失败，恢复文件保留在：${staging}`, { cause: failure });
      combined.recoveryDirectory = staging;
      if (failure.code) combined.code = failure.code;
      throw combined;
    }
    throw failure;
  } finally {
    // A failed rollback leaves the only previous-media backup in this tree.
    // Preserve it for recovery; otherwise clean only our own staging directory.
    if (!preserveRecovery) {
      try {
        if (!inside(path.dirname(outputDir), staging) || !path.basename(staging).startsWith(".content-build-")) throw new Error("暂存目录校验失败。");
        await removeWithRetry(staging);
      } catch (cleanupFailure) {
        if (!pendingFailure) throw cleanupFailure;
        const combined = new AggregateError([pendingFailure, cleanupFailure],
          `内容生成失败：${pendingFailure.message}；清理暂存目录也失败：${staging}`, { cause: pendingFailure });
        if (pendingFailure.code) combined.code = pendingFailure.code;
        throw combined;
      }
    }
  }
}

export async function buildContent({ contentDir = path.join(projectRoot, "content"), outputDir = path.join(projectRoot, "dist") } = {}) {
  contentDir = await fs.realpath(path.resolve(contentDir));
  outputDir = path.resolve(outputDir);
  if (inside(contentDir, outputDir) || inside(outputDir, contentDir)) throw new Error("内容源目录与输出目录不能互相包含。");
  const siteFile = path.join(contentDir, "site.yml");
  const content = configureSite(yamlObject(await fs.readFile(siteFile, "utf8"), siteFile), siteFile);
  const versions = new Map();
  const versionOf = file => {
    if (!versions.has(file)) versions.set(file, assetVersion(file));
    return versions.get(file);
  };
  await validateResume(content, contentDir, siteFile, versionOf);
  const root = path.join(contentDir, "entries");
  if (!inside(contentDir, await fs.realpath(root))) throw error(root, "条目根目录不能越过内容目录。");
  const directories = (await fs.readdir(root, { withFileTypes: true })).sort((a, b) => compareText(a.name, b.name));
  const entries = new Map();
  for (const directory of directories) {
    if (directory.name.startsWith(".")) continue;
    if (directory.isSymbolicLink()) throw error(root, "条目目录不能使用符号链接。");
    if (!directory.isDirectory()) continue;
    const entryDir = path.join(root, directory.name);
    const entry = await readEntry(entryDir, directory.name);
    entries.set(entry.key, entry);
  }
  await applyGitUpdateDates(entries, contentDir);
  for (const route of content.paths) route.items = [...entries.values()]
    .filter(entry => entry.metadata.sections.includes(route.id)).sort(entryOrder).map(entry => entry.key);
  const assets = new Map();
  for (const entry of entries.values()) content.samples[entry.key] = await renderEntry(entry, content, entries, assets, versionOf);
  await publish(content, assets, outputDir);
  return content;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildContent().then(content => process.stdout.write(`Built ${Object.keys(content.samples).length} content entries.\n`))
    .catch(failure => { process.stderr.write(`${failure.message}\n`); process.exitCode = 1; });
}
