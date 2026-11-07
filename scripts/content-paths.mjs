import path from "node:path";

const controls = /[\u0000-\u001f\u007f]/;
const driveAbsolute = /^[a-z]:[\\/]/i;
const scheme = /^([a-z][a-z\d+.-]*):/i;

// Markdown normally consumes a backslash before ASCII punctuation (for example,
// "\\_" or "\\["). For an actual Windows path that slash is a directory
// separator, so protect it only inside a recognized link/image destination.
// Keep the parser hook isolated by cloning the instance's helper table.
export function preserveWindowsDestinations(markdown) {
  const parse = markdown.helpers.parseLinkDestination;
  markdown.helpers = {
    ...markdown.helpers,
    parseLinkDestination(source, start, max) {
      const result = parse(source, start, max);
      if (!result.ok) return result;
      let raw = source.slice(start, result.pos);
      if (raw.startsWith("<") && raw.endsWith(">")) raw = raw.slice(1, -1);
      if (!raw.includes("\\")) return result;
      const firstSeparator = raw.search(/[\\/]/);
      const localWindows = firstSeparator >= 0 && raw[firstSeparator] === "\\" && !scheme.test(raw);
      const nativeWindows = driveAbsolute.test(raw);
      const fileWindows = /^file:[\\/]*(?:localhost[\\/]+)?[a-z]:[\\/]/i.test(raw);
      if (localWindows || nativeWindows || fileWindows) {
        const suffixAt = raw.search(/[?#]/);
        const resource = suffixAt < 0 ? raw : raw.slice(0, suffixAt);
        const suffix = suffixAt < 0 ? "" : raw.slice(suffixAt);
        result.str = markdown.utils.unescapeAll(resource.replace(/\\/g, "%5C") + suffix);
      }
      return result;
    }
  };
  return markdown;
}

function insideRelative(paths, base, absolute) {
  const relative = paths.relative(base, absolute);
  return relative === ".." || relative.startsWith(`..${paths.sep}`) || paths.isAbsolute(relative)
    ? null : relative;
}

function portableArticleSuffix(pathname, base, insensitive) {
  const equal = (left, right) => insensitive ? left.toLowerCase() === right.toLowerCase() : left === right;
  const current = base.replace(/\\/g, "/").split("/").filter(Boolean);
  if (current.length < 3 || !equal(current.at(-3), "content") || !equal(current.at(-2), "entries")) return null;
  const key = current.at(-1);
  const source = pathname.split("/").filter(Boolean);
  const anchors = [];
  for (let index = 0; index < source.length - 2; index += 1) {
    if (equal(source[index], "content") && equal(source[index + 1], "entries") && equal(source[index + 2], key)) {
      anchors.push(index);
    }
  }
  // Ambiguous repeated article anchors should not silently select another file.
  return anchors.length === 1 ? source.slice(anchors[0] + 3) : null;
}

// Normalize only resource URLs after Markdown/HTML has identified them. The
// author source and literal code examples must retain their original bytes.
export function normalizeContentPath(value, entry) {
  const fail = message => { throw new Error(`${entry.file}: ${message}`); };
  if (typeof value !== "string") fail("资源路径必须是文字。");
  if (value.startsWith("#") || /^(?:https?|mailto):/i.test(value)) return value;

  const suffixAt = value.search(/[?#]/);
  const resource = suffixAt < 0 ? value : value.slice(0, suffixAt);
  const suffix = suffixAt < 0 ? "" : value.slice(suffixAt);
  let decoded;
  try { decoded = decodeURIComponent(resource); }
  catch { fail(`资源路径编码无效：${value}`); }
  if (!decoded) fail(`资源路径无效：${value}`);

  const windows = driveAbsolute.test(entry.directory) || entry.directory.startsWith("\\\\");
  const paths = windows ? path.win32 : path.posix;
  const base = paths.resolve(entry.directory);
  let pathname = decoded;

  if (/^file:/i.test(resource)) {
    let url;
    try { url = new URL(resource); }
    catch { fail(`本地文件链接无效：${value}`); }
    if (url.protocol !== "file:" || (url.hostname && url.hostname.toLowerCase() !== "localhost")) {
      fail(`资源不能使用网络共享路径：${value}`);
    }
    try { pathname = decodeURIComponent(url.pathname); }
    catch { fail(`资源路径编码无效：${value}`); }
    if (windows && /^\/[a-z]:[\\/]/i.test(pathname)) pathname = pathname.slice(1);
  } else if (!driveAbsolute.test(decoded)) {
    // Do not turn encoded or whitespace-obfuscated protocols into relative
    // filenames. The caller's existing protocol validation rejects them.
    const probe = decoded.replace(/[\u0000-\u0020\u007f]/g, "");
    if (scheme.test(probe)) return value;
  }

  if (controls.test(pathname)) fail(`资源路径不能包含控制字符：${value}`);
  pathname = pathname.replace(/\\/g, "/");
  if (pathname.startsWith("//")) fail(`资源不能使用网络共享或协议相对路径：${value}`);

  const foreignDrive = !windows && driveAbsolute.test(pathname);
  let relative = foreignDrive ? null : insideRelative(paths, base, paths.resolve(base, pathname));
  if (relative === null) {
    const absoluteSource = driveAbsolute.test(pathname) || pathname.startsWith("/");
    if (!absoluteSource) fail(`资源越过条目目录：${value}`);
    // A machine-specific prefix cannot be used on another host (for example,
    // Windows authoring followed by Linux CI). Rebase only an unambiguous
    // content/entries/<this-article>/ suffix onto the actual current article.
    // No file is read from the old prefix; asset() still checks realpath and
    // prevents a symlink inside the current article from escaping its boundary.
    const insensitive = windows || /^\/?[a-z]:\//i.test(pathname);
    const suffixParts = portableArticleSuffix(pathname, base, insensitive);
    if (suffixParts === null) fail(`资源必须位于当前文章目录内：${value}`);
    relative = insideRelative(paths, base, paths.resolve(base, ...suffixParts));
    if (relative === null) fail(`资源越过条目目录：${value}`);
  }
  const encoded = relative.split(paths.sep).map(encodeURIComponent).join("/");
  return `./${encoded}${suffix}`;
}
