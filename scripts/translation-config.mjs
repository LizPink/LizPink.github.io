import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const settings = Object.freeze({
  baseURL: "DEEPSEEK_BASE_URL",
  model: "DEEPSEEK_MODEL",
  reasoningEffort: "DEEPSEEK_REASONING_EFFORT",
  temperature: "DEEPSEEK_TEMPERATURE",
  maxTokens: "DEEPSEEK_MAX_TOKENS",
  timeoutMs: "DEEPSEEK_TIMEOUT_MS"
});
const numericSettings = new Set(["temperature", "maxTokens", "timeoutMs"]);
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);

function configurationObject(value, label) {
  if (!record(value)) throw new Error(`${label} must be a JSON object containing translation settings.`);
  if (Object.keys(value).some(key => !Object.hasOwn(settings, key))) {
    // Do not echo unknown property names or values: a user might have pasted a
    // credential into the wrong place. Only non-secret options belong here.
    throw new Error(`${label} contains unsupported settings. Allowed settings: ${Object.keys(settings).join(", ")}. Store API keys in environment variables or GitHub Secrets.`);
  }
}

function environmentValue(env, name) {
  if (!Object.hasOwn(env, name) || env[name] === undefined || env[name] === "") return undefined;
  if (typeof env[name] !== "string") throw new Error(`${name} must be a non-empty string.`);
  return env[name];
}

function environmentNumber(value, setting) {
  // Number() alone also accepts whitespace, hexadecimal and an empty string.
  // Accept only a complete decimal number before applying the numeric bounds.
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
    throw new Error(`${settings[setting]} must contain a decimal number without whitespace.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${settings[setting]} must contain a finite number.`);
  return number;
}

export function resolveTranslationConfig({ file = {}, env = {}, overrides = {} } = {}) {
  configurationObject(file, "translation.config.json");
  configurationObject(overrides, "Translation overrides");
  if (!record(env)) throw new Error("Translation environment must be an object.");
  const values = {};
  for (const [setting, environmentName] of Object.entries(settings)) {
    if (Object.hasOwn(overrides, setting) && overrides[setting] !== undefined) {
      values[setting] = overrides[setting];
      continue;
    }
    const environment = environmentValue(env, environmentName);
    if (environment !== undefined) {
      values[setting] = numericSettings.has(setting) ? environmentNumber(environment, setting) : environment;
    } else if (Object.hasOwn(file, setting)) values[setting] = file[setting];
  }

  const reasoningEffort = values.reasoningEffort === undefined ? "none" : values.reasoningEffort;
  if (!["none", "low", "high", "max"].includes(reasoningEffort)) {
    throw new Error("reasoningEffort must be one of none, low, high or max.");
  }
  const result = {
    baseURL: "https://api.deepseek.com", model: "deepseek-flash", reasoningEffort, temperature: 0.2,
    maxTokens: reasoningEffort === "none" ? 16384 : 65536,
    timeoutMs: reasoningEffort === "none" ? 60000 : 180000,
    ...values
  };
  let url;
  if (typeof result.baseURL !== "string" || result.baseURL.trim() !== result.baseURL || /[\r\n]/.test(result.baseURL)) {
    throw new Error("baseURL must be an HTTPS URL without credentials, query parameters or a fragment.");
  }
  try { url = new URL(result.baseURL); } catch { /* Report a fixed message without exposing configuration data. */ }
  if (!url || url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash || /[?#]/.test(result.baseURL)) {
    throw new Error("baseURL must be an HTTPS URL without credentials, query parameters or a fragment.");
  }
  if (typeof result.model !== "string" || !result.model.trim() || /[\r\n]/.test(result.model)) {
    throw new Error("model must be a non-empty model name without line breaks.");
  }
  result.model = result.model.trim();
  if (typeof result.temperature !== "number" || !Number.isFinite(result.temperature) || result.temperature < 0 || result.temperature > 2) {
    throw new Error("temperature must be a finite number between 0 and 2.");
  }
  if (!Number.isInteger(result.maxTokens) || result.maxTokens < 1 || result.maxTokens > 393216) {
    throw new Error("maxTokens must be an integer between 1 and 393216.");
  }
  if (!Number.isInteger(result.timeoutMs) || result.timeoutMs < 1000 || result.timeoutMs > 600000) {
    throw new Error("timeoutMs must be an integer between 1000 and 600000.");
  }
  return result;
}

export async function loadTranslationConfig({ root = projectRoot, env = process.env, overrides = {} } = {}) {
  let contents;
  try { contents = await fs.readFile(path.join(path.resolve(root), "translation.config.json"), "utf8"); }
  catch (error) {
    if (error.code !== "ENOENT") throw new Error("Could not read translation.config.json. Check its path and file permissions.");
  }
  let file = {};
  if (contents !== undefined) {
    try { file = JSON.parse(contents.replace(/^\uFEFF/, "")); }
    catch { throw new Error("translation.config.json is not valid JSON. Check commas, quotation marks and brackets."); }
  }
  return resolveTranslationConfig({ file, env, overrides });
}
