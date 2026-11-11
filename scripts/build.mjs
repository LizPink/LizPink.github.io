import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildContent } from "./build-content.mjs";
import { assetVersion, withAssetVersion } from "./asset-version.mjs";
import { renameWithRetry, removeWithRetry, unlinkWithRetry } from "./build-files.mjs";
import { copyMathAssets } from "./math-assets.mjs";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function generatedPath(root, name) {
  const result = path.resolve(root, name);
  const relative = path.relative(root, result);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("生成目录必须位于项目内部。");
  return result;
}

async function replaceAsync(text, pattern, replacement) {
  const matches = [...text.matchAll(pattern)];
  const values = await Promise.all(matches.map(match => replacement(...match)));
  let index = 0;
  return text.replace(pattern, () => values[index++]);
}

// Version the published references, leaving the author-maintained site untouched.
// CSS is rewritten first so its own version includes the versions of its fonts.
async function versionSiteAssets(directory, html) {
  const versions = new Map();
  const root = await fs.realpath(directory);
  async function version(url, from) {
    if (!url || url.startsWith("#") || url.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(url)) return url;
    const pathname = decodeURIComponent(url.split(/[?#]/, 1)[0]);
    const file = path.resolve(pathname.startsWith("/") ? directory : path.dirname(from), pathname.startsWith("/") ? `.${pathname}` : pathname);
    const relative = path.relative(directory, file);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`静态资源必须位于发布目录内：${url}`);
    const actual = await fs.realpath(file);
    const actualRelative = path.relative(root, actual);
    if (!actualRelative || actualRelative.startsWith("..") || path.isAbsolute(actualRelative)) throw new Error(`静态资源必须位于发布目录内：${url}`);
    if (!versions.has(actual)) versions.set(actual, assetVersion(actual));
    return withAssetVersion(url, await versions.get(actual));
  }
  async function rewriteStyles(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await rewriteStyles(file);
      else if (entry.isFile() && path.extname(file).toLowerCase() === ".css") {
        const css = await fs.readFile(file, "utf8");
        const rewritten = await replaceAsync(css, /url\(\s*(["']?)([^"'()]*?)\1\s*\)/gi,
          async (full, quote, url) => `url(${quote}${await version(url.trim(), file)}${quote})`);
        await fs.writeFile(file, rewritten);
      }
    }
  }
  await rewriteStyles(directory);
  return replaceAsync(html, /<(script|link)\b[^>]*>/gi, async (tag, kind) => {
    const attribute = kind.toLowerCase() === "script" ? "src" : "href";
    return replaceAsync(tag, new RegExp(`(\\b${attribute}\\s*=\\s*)(["'])(.*?)\\2`, "gi"),
      async (full, prefix, quote, url) => {
        const versioned = await version(url.replace(/&amp;/g, "&"), path.join(directory, "index.html"));
        return `${prefix}${quote}${versioned.replace(/&/g, "&amp;")}${quote}`;
      });
  });
}

export async function build(root = projectRoot) {
  root = path.resolve(root);
  const work = generatedPath(root, ".build");
  await fs.mkdir(work, { recursive: true });
  const lockPath = generatedPath(root, ".build/build.lock");
  let lock;
  try { lock = await fs.open(lockPath, "wx"); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error("另一个构建正在运行，请稍后再试。");
    throw error;
  }
  const unique = `${process.pid}-${Date.now()}`;
  const staging = generatedPath(root, `.build/site-${unique}`);
  const backup = generatedPath(root, `.build/previous-${unique}`);
  const output = generatedPath(root, "dist");
  let movedPrevious = false, content, failure;
  try {
    await fs.cp(path.join(root, "site"), staging, { recursive: true, errorOnExist: true, force: false });
    await copyMathAssets(staging);
    content = await buildContent({ contentDir: path.join(root, "content"), outputDir: staging });
    const publicFiles = path.join(root, "content/files");
    async function checkFiles(directory) {
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw new Error("content/files 中请使用实际文件，不使用符号链接。");
        if (entry.isDirectory()) await checkFiles(path.join(directory, entry.name));
      }
    }
    try {
      const stat = await fs.lstat(publicFiles);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("content/files 必须是项目内的实际目录。");
      await checkFiles(publicFiles);
      await fs.cp(publicFiles, path.join(staging, "files"), { recursive: true });
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    const htmlFile = path.join(staging, "index.html");
    let html = await fs.readFile(htmlFile, "utf8");
    const escape = value => String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
    const name = escape(content.name);
    html = html.replaceAll("{{SITE_NAME}}", name)
      .replaceAll("{{SITE_GREETING}}", escape(content.greeting).replace(name, `<span>${name}</span>`));
    if (/\{\{SITE_[A-Z_]+\}\}/.test(html)) throw new Error("页面包含未填写的站点字段。");
    await fs.writeFile(htmlFile, await versionSiteAssets(staging, html));
    try { await renameWithRetry(output, backup); movedPrevious = true; }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    try { await renameWithRetry(staging, output); }
    catch (error) {
      if (movedPrevious) {
        try { await renameWithRetry(backup, output); movedPrevious = false; }
        catch (restoreError) {
          throw new AggregateError([error, restoreError], `发布失败且未能恢复原网站，原网站保留在 ${backup}。${error.message}`, { cause: error });
        }
      }
      throw error;
    }
    if (movedPrevious) await removeWithRetry(backup);
  } catch (error) {
    failure = error;
  } finally {
    // A cleanup failure must not skip closing the handle or releasing the lock.
    const cleanupErrors = [];
    for (const cleanup of [() => removeWithRetry(staging), () => lock.close(), () => unlinkWithRetry(lockPath)]) {
      try { await cleanup(); } catch (error) { cleanupErrors.push(error); }
    }
    if (cleanupErrors.length) {
      failure = new AggregateError([...(failure ? [failure] : []), ...cleanupErrors],
        failure ? `${failure.message}；构建临时文件清理失败。` : "网站已生成，但构建临时文件清理失败。",
        failure ? { cause: failure } : {});
    }
  }
  if (failure) throw failure;
  return content;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const content = await build();
    console.log(`已生成 ${Object.keys(content.samples).length} 篇内容 → dist/`);
  } catch (error) {
    console.error(`构建失败：${error.message}`);
    process.exitCode = 1;
  }
}
