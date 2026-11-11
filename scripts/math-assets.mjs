import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the installed renderer so its stylesheet and fonts always share the
// exact same version. Only generated output receives these dependency assets.
export async function copyMathAssets(outputDir) {
  const source = path.dirname(fileURLToPath(import.meta.resolve("katex")));
  const target = path.join(outputDir, "assets/vendor/katex");
  try {
    const [css, license] = await Promise.all([
      fs.readFile(path.join(source, "katex.min.css"), "utf8"),
      fs.readFile(path.join(source, "../LICENSE"), "utf8")
    ]);
    const fonts = [...new Set([...css.matchAll(/url\(\s*(["']?)([^"'()\s]+)\1\s*\)/g)].map(match => match[2]))];
    if (!fonts.length || fonts.some(font => !/^fonts\/[\w-]+\.(?:woff2?|ttf)$/.test(font))) {
      throw new Error("KaTeX 样式包含未识别的字体资源路径。");
    }
    await fs.mkdir(path.join(target, "fonts"), { recursive: true });
    const copied = await Promise.allSettled(fonts.map(font => fs.copyFile(path.join(source, font), path.join(target, font))));
    const failed = copied.find(result => result.status === "rejected");
    if (failed) throw failed.reason;
    await Promise.all([
      fs.writeFile(path.join(target, "katex.min.css"), css),
      fs.writeFile(path.join(target, "LICENSE"), license)
    ]);
  } catch (error) {
    throw new Error(`KaTeX 公式资源复制失败：${error.message}`, { cause: error });
  }
}
