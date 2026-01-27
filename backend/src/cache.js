import fs from "fs";
import crypto from "crypto";

const CACHE_FILE = "./cache.json";

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({}), "utf-8");
  }
  return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

function hashPrompt(prompt) {
  return crypto.createHash("sha256").update(prompt).digest("hex");
}

export function getCachedResponse(prompt) {
  const cache = loadCache();
  const key = hashPrompt(prompt);
  return cache[key] || null;
}

export function setCachedResponse(prompt, response) {
  const cache = loadCache();
  const key = hashPrompt(prompt);
  cache[key] = response;
  saveCache(cache);
}
