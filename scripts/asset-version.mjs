import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const textExtensions = new Set([".js", ".mjs", ".cjs", ".css", ".html", ".htm", ".svg", ".vtt", ".json", ".txt"]);

// Git may check text out with CRLF on Windows and LF in CI. Both must produce
// the same cache key; binary assets are always hashed byte for byte.
export async function assetVersion(file) {
  const bytes = await readFile(file);
  const content = textExtensions.has(path.extname(file).toLowerCase())
    ? bytes.toString("utf8").replace(/\r\n/g, "\n") : bytes;
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// Keep the author-written path, query encoding and fragment intact. URL and
// URLSearchParams would normalize relative paths and unrelated query values.
export function withAssetVersion(url, version) {
  if (typeof url !== "string" || typeof version !== "string" || !version) {
    throw new TypeError("Asset URL and version must be strings with a nonempty version.");
  }
  const fragmentAt = url.indexOf("#");
  const fragment = fragmentAt < 0 ? "" : url.slice(fragmentAt);
  const resource = fragmentAt < 0 ? url : url.slice(0, fragmentAt);
  const queryAt = resource.indexOf("?");
  const pathname = queryAt < 0 ? resource : resource.slice(0, queryAt);
  const queryText = queryAt < 0 ? "" : resource.slice(queryAt + 1);
  const parameters = queryText ? queryText.split("&") : [];
  const parameter = `v=${encodeURIComponent(version)}`;
  let replaced = false;
  const query = parameters.flatMap(part => {
    const key = part.split("=", 1)[0];
    let decoded;
    try { decoded = decodeURIComponent(key.replace(/\+/g, " ")); } catch { return [part]; }
    if (decoded !== "v") return [part];
    if (replaced) return [];
    replaced = true;
    return [parameter];
  });
  if (!replaced) query.push(parameter);
  return `${pathname}?${query.join("&")}${fragment}`;
}
