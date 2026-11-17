import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  GLOSSARY_VERSION, RECIPE_VERSION, TRANSLATION_VERSION,
  readManifest, writeManifest
} from "./translations.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CACHE_BRANCH = "i18n-cache";
export const CACHE_PATH = "content/translations/en.json";
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const validSha = value => typeof value === "string" && /^[a-f\d]{40}$/i.test(value);

function configuration({ root = projectRoot, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const repository = env.GITHUB_REPOSITORY;
  if (typeof repository !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repository) ||
      [".", ".."].includes(repository.split("/")[1])) {
    throw new Error("GITHUB_REPOSITORY must identify an owner/repository.");
  }
  if (!validSha(env.GITHUB_SHA)) throw new Error("GITHUB_SHA must be a full 40-character commit SHA.");
  if (typeof env.GITHUB_TOKEN !== "string" || !env.GITHUB_TOKEN.trim() || /[\r\n]/.test(env.GITHUB_TOKEN)) {
    throw new Error("GITHUB_TOKEN is required for the translation cache.");
  }
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  return {
    root: path.resolve(root), repository, sha: env.GITHUB_SHA,
    token: env.GITHUB_TOKEN, fetchImpl,
    base: `https://api.github.com/repos/${repository}`
  };
}

async function request(config, route, { method = "GET", body, allowMissing = false } = {}) {
  let response;
  try {
    response = await config.fetchImpl(`${config.base}/${route}`, {
      method, redirect: "error", signal: AbortSignal.timeout(30000),
      headers: {
        Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json"
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  } catch {
    // Fetch errors and GitHub response bodies may echo request headers. Never
    // propagate them into Actions logs.
    throw new Error("GitHub translation cache request could not connect.");
  }
  if (allowMissing && response?.status === 404) return null;
  if (!response?.ok) {
    const status = Number.isInteger(response?.status) ? response.status : "unknown";
    throw new Error(`GitHub translation cache returned HTTP ${status}. Check repository permissions and retry.`);
  }
  try { return await response.json(); }
  catch { throw new Error("GitHub translation cache returned an invalid response."); }
}

async function remoteFile(config) {
  const item = await request(config, `contents/${CACHE_PATH}?ref=${CACHE_BRANCH}`, { allowMissing: true });
  if (item === null) return null;
  if (!record(item) || !validSha(item.sha) || item.encoding !== "base64" || typeof item.content !== "string" ||
      item.content.length > 2_000_000) throw new Error("GitHub translation cache returned invalid file data.");
  const encoded = item.content.replace(/\s/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error("GitHub translation cache returned invalid file data.");
  }
  const decoded = Buffer.from(encoded, "base64");
  if (decoded.toString("base64") !== encoded) throw new Error("GitHub translation cache returned invalid file data.");
  let parsed;
  try { parsed = JSON.parse(decoded.toString("utf8")); }
  catch { throw new Error("GitHub translation cache contains invalid JSON."); }
  // Recipe/glossary changes deliberately invalidate a cache. The source-owned
  // manifest is authoritative for the current version and reviewed wording.
  const outdated = record(parsed) && parsed.version === TRANSLATION_VERSION && record(parsed.segments) &&
      typeof parsed.glossaryVersion === "string" && typeof parsed.recipeVersion === "string" &&
      (parsed.glossaryVersion !== GLOSSARY_VERSION || parsed.recipeVersion !== RECIPE_VERSION);
  const directory = path.join(config.root, ".build");
  await fs.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.translation-cache-${randomUUID()}.json`);
  try {
    await fs.writeFile(temporary, decoded, { flag: "wx" });
    let manifest;
    try { manifest = await readManifest(temporary, { allowOutdated: true }); }
    catch { throw new Error("GitHub translation cache contains an invalid or unsupported manifest."); }
    return { sha: item.sha, manifest: outdated ? null : manifest };
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

export async function restoreTranslationCache(options = {}) {
  const config = configuration(options);
  const file = path.join(config.root, CACHE_PATH);
  const local = await readManifest(file, { allowOutdated: true });
  const remote = await remoteFile(config);
  if (!remote?.manifest) return { restored: false, segments: Object.keys(local.segments).length };
  const manifest = {
    ...local,
    segments: { ...remote.manifest.segments, ...local.segments }
  };
  await writeManifest(file, manifest);
  return { restored: true, segments: Object.keys(manifest.segments).length };
}

export async function saveTranslationCache(options = {}) {
  const config = configuration(options);
  const manifest = await readManifest(path.join(config.root, CACHE_PATH));
  const branch = await request(config, `git/ref/heads/${CACHE_BRANCH}`, { allowMissing: true });
  if (branch === null) {
    await request(config, "git/refs", {
      method: "POST", body: { ref: `refs/heads/${CACHE_BRANCH}`, sha: config.sha }
    });
  }
  const remote = await remoteFile(config);
  if (remote?.manifest && JSON.stringify(canonical(remote.manifest)) === JSON.stringify(canonical(manifest))) {
    return { saved: false, unchanged: true, segments: Object.keys(manifest.segments).length };
  }
  await request(config, `contents/${CACHE_PATH}`, {
    method: "PUT",
    body: {
      message: "Update English translation cache", branch: CACHE_BRANCH,
      content: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`).toString("base64"),
      ...(remote ? { sha: remote.sha } : {})
    }
  });
  return { saved: true, unchanged: false, segments: Object.keys(manifest.segments).length };
}

export async function main(args = process.argv.slice(2), options = {}) {
  if (args.length !== 1 || !["restore", "save"].includes(args[0])) {
    throw new Error("Usage: node scripts/translation-cache.mjs restore|save");
  }
  return args[0] === "restore" ? restoreTranslationCache(options) : saveTranslationCache(options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(result => {
    console.log(`English translation cache: ${result.restored ? "restored" : result.saved ? "saved" : result.unchanged ? "unchanged" : "not found"} (${result.segments} segments).`);
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
