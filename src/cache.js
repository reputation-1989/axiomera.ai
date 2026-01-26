import fs from "fs/promises";
import crypto from "crypto";

const CACHE_FILE = "./cache.json";

async function loadCache() {
  try {
    await fs.access(CACHE_FILE);
  } catch {
    await fs.writeFile(CACHE_FILE, JSON.stringify({}), "utf-8");
  }
  const data = await fs.readFile(CACHE_FILE, "utf-8");
  return JSON.parse(data);
}

async function saveCache(cache) {
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

function hashPrompt(prompt) {
  return crypto.createHash("sha256").update(prompt).digest("hex");
}

export async function getCachedResponse(prompt) {
  const cache = await loadCache();
  const key = hashPrompt(prompt);
  return cache[key] || null;
}

export async function setCachedResponse(prompt, response) {
  const cache = await loadCache();
  const key = hashPrompt(prompt);
  cache[key] = response;
  await saveCache(cache);
}
