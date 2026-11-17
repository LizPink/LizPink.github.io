import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildContent } from "./build-content.mjs";
import { attachUIMessages } from "./ui-messages.mjs";
import { loadTranslationConfig } from "./translation-config.mjs";
import { collectTranslationSegments, readManifest, translationStatus, translateSegments, writeManifest } from "./translations.mjs";

export async function translate({ root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), check = false, options = {} } = {}) {
  root = path.resolve(root);
  const configuration = await loadTranslationConfig({ root, overrides: Object.fromEntries(
    ["baseURL", "model", "reasoningEffort", "temperature", "maxTokens", "timeoutMs"]
      .filter(key => options[key] !== undefined).map(key => [key, options[key]])
  ) });
  const work = path.join(root, ".build");
  await fs.mkdir(work, { recursive: true });
  const temporary = await fs.mkdtemp(path.join(work, "translate-"));
  try {
    const source = await buildContent({ contentDir: path.join(root, "content"), outputDir: path.join(temporary, "site") });
    const content = await attachUIMessages(source, root);
    const manifestFile = path.join(root, "content/translations/en.json");
    const manifest = await readManifest(manifestFile, { allowOutdated: !check });
    if (check) {
      const status = translationStatus(content, manifest);
      if (!status.complete) throw new Error(`English translations are missing or outdated (${status.missing.length}/${status.total} segments). Run npm run translate with DEEPSEEK_API_KEY configured.`);
      return { translated: 0, reused: status.total };
    }
    const result = await translateSegments(collectTranslationSegments(content), manifest, {
      apiKey: process.env.DEEPSEEK_API_KEY || "", ...options, ...configuration
    });
    // Commit only after every batch has passed validation. A failed request
    // leaves the previous manifest and published website entirely untouched.
    await writeManifest(manifestFile, result.manifest);
    return { translated: result.translated, reused: result.reused, configuration };
  } finally {
    const relative = path.relative(work, temporary);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(temporary).startsWith("translate-")) throw new Error("Translation temporary directory validation failed.");
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arguments_ = process.argv.slice(2);
  if (arguments_.some(value => value !== "--check")) {
    process.stderr.write("Usage: node scripts/translate.mjs [--check]\n"); process.exitCode = 1;
  } else translate({ check: arguments_.includes("--check") })
    .then(result => {
      if (result.configuration) process.stdout.write(`Translation settings: model=${result.configuration.model}, reasoning=${result.configuration.reasoningEffort}.\n`);
      process.stdout.write(`English translations: ${result.translated} updated, ${result.reused} reused.\n`);
    })
    .catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
