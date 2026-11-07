import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildContent } from "./build-content.mjs";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function generatedPath(root, name) {
  const result = path.resolve(root, name);
  const relative = path.relative(root, result);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("生成目录必须位于项目内部。");
  return result;
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
  let movedPrevious = false;
  try {
    await fs.cp(path.join(root, "site"), staging, { recursive: true, errorOnExist: true, force: false });
    const content = await buildContent({ contentDir: path.join(root, "content"), outputDir: staging });
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
      .replaceAll("{{SITE_DESCRIPTION}}", escape(content.description))
      .replaceAll("{{SITE_GREETING}}", escape(content.greeting).replace(name, `<span>${name}</span>`));
    if (/\{\{SITE_[A-Z_]+\}\}/.test(html)) throw new Error("页面包含未填写的站点字段。");
    await fs.writeFile(htmlFile, html);
    try { await fs.rename(output, backup); movedPrevious = true; }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    try { await fs.rename(staging, output); }
    catch (error) {
      if (movedPrevious) { await fs.rename(backup, output); movedPrevious = false; }
      throw error;
    }
    if (movedPrevious) await fs.rm(backup, { recursive: true, force: true });
    return content;
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
    await lock.close();
    await fs.unlink(lockPath);
  }
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
