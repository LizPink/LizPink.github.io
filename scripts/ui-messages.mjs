import fs from "node:fs/promises";
import path from "node:path";

// The browser dictionary is the single editable source for UI copy. Literal
// t("…") calls are included too, so new Chinese copy enters the translation job.
export async function readUIMessages(root) {
  const directory = path.join(root, "site/assets/js");
  let source;
  try { source = await fs.readFile(path.join(directory, "i18n.js"), "utf8"); }
  catch (error) { if (error.code === "ENOENT") return { sources: {}, defaults: {} }; throw error; }
  const match = /const messages = Object\.freeze\((\{[\s\S]*?\})\);/.exec(source);
  if (!match) throw new Error("The UI translation dictionary could not be read.");
  const defaults = JSON.parse(match[1]);
  if (!defaults || Array.isArray(defaults) || Object.values(defaults).some(value => typeof value !== "string")) {
    throw new Error("UI translations must map source text to English text.");
  }
  const sources = Object.fromEntries(Object.keys(defaults).map(value => [value, value]));
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const script = await fs.readFile(path.join(directory, entry.name), "utf8");
    for (const item of script.matchAll(/\bt\(\s*("(?:[^"\\]|\\.)*")/g)) {
      const value = JSON.parse(item[1]);
      if (/\p{Script=Han}/u.test(value)) sources[value] = value;
    }
  }
  return { sources, defaults };
}

export async function attachUIMessages(content, root) {
  return { ...content, uiMessages: (await readUIMessages(root)).sources };
}
