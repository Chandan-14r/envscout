import fs from "node:fs/promises";
import path from "node:path";

export function toPosixPath(value) {
  return value.replaceAll("\\", "/");
}

export function isProbablyBinary(buffer) {
  const sample = buffer.subarray(0, 8000);
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 7 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  return suspicious / Math.max(1, sample.length) > 0.3;
}

export async function readTextFile(filePath, maxBytes = 1_000_000) {
  const handle = await fs.open(filePath, "r");
  try {
    const stat = await handle.stat();
    if (stat.size > maxBytes) return { text: null, skipped: "too_large" };
    const buffer = await handle.readFile();
    if (isProbablyBinary(buffer)) return { text: null, skipped: "binary" };
    return { text: buffer.toString("utf8"), skipped: null };
  } finally {
    await handle.close();
  }
}

export function normalizeIgnoreList(ignoreList) {
  const normalized = [];
  for (const item of ignoreList || []) {
    const trimmed = String(item).trim();
    if (!trimmed) continue;
    normalized.push(trimmed.replaceAll("\\", "/"));
  }
  return normalized;
}

export function isIgnored(relPathPosix, ignoreList) {
  for (const entry of ignoreList) {
    if (relPathPosix.includes(entry)) return true;
  }
  return false;
}

export async function walkFiles(rootDir, options) {
  const ignore = normalizeIgnoreList(options?.ignore || []);
  const followSymlinks = Boolean(options?.followSymlinks);
  const includeHidden = Boolean(options?.includeHidden);
  const files = [];

  async function visit(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }

    for (const entry of entries) {
      if (!includeHidden && entry.name.startsWith(".")) {
        if (entry.name === ".github") {
          // allow workflows by default
        } else if (entry.name === ".env" || entry.name === ".env.example") {
          // allow dotenv files by default
        } else {
          continue;
        }
      }

      const absolutePath = path.join(dir, entry.name);
      const relPathPosix = toPosixPath(path.relative(rootDir, absolutePath));
      if (relPathPosix === "") continue;
      if (isIgnored(relPathPosix, ignore)) continue;

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (entry.isSymbolicLink() && !followSymlinks) continue;
      if (entry.isFile() || (entry.isSymbolicLink() && followSymlinks)) {
        files.push({ absolutePath, relPathPosix });
      }
    }
  }

  await visit(rootDir);
  return files;
}

export function uniqSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function tryParseJson(text) {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (error) {
    return { value: null, error };
  }
}

