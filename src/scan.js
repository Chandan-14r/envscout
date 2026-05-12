import fs from "node:fs/promises";
import path from "node:path";

import { parseEnvExample } from "./envExample.js";
import { DEFAULT_PATTERNS, shouldScanFile } from "./patterns.js";
import { readTextFile, uniqSorted, walkFiles } from "./util.js";

function extractMatches(text, pattern) {
  const matches = [];
  const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
  let m;
  while ((m = regex.exec(text)) !== null) {
    const key = m[1];
    if (!key) continue;
    matches.push({ key, index: m.index, pattern: pattern.name });
  }
  return matches;
}

export function getLineNumber(text, index) {
  if (index <= 0) return 1;
  let line = 1;
  for (let i = 0; i < text.length && i < index; i += 1) {
    if (text[i] === "\n") line += 1;
  }
  return line;
}

export async function scanRepo(targetDir, options) {
  const rootDir = path.resolve(targetDir);
  const ignore = [
    ".git/",
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
    ".venv/",
    "__pycache__/"
  ].concat(options?.ignore || []);

  const files = await walkFiles(rootDir, { ignore });
  const findings = [];
  const skipped = [];
  let filesScanned = 0;

  for (const file of files) {
    if (!shouldScanFile(file.relPathPosix)) continue;
    const { text, skipped: reason } = await readTextFile(file.absolutePath, options?.maxBytes);
    if (reason) {
      skipped.push({ path: file.relPathPosix, reason });
      continue;
    }
    if (text === null) continue;
    filesScanned += 1;

    for (const pattern of DEFAULT_PATTERNS) {
      const matches = extractMatches(text, pattern);
      for (const match of matches) {
        findings.push({
          key: match.key,
          path: file.relPathPosix,
          line: getLineNumber(text, match.index),
          pattern: match.pattern
        });
      }
    }
  }

  const keys = uniqSorted(findings.map((f) => f.key));

  let envExampleKeys = [];
  let envExampleFound = false;
  if (options?.envExamplePath) {
    try {
      const envText = await fs.readFile(options.envExamplePath, "utf8");
      const parsed = parseEnvExample(envText);
      envExampleKeys = uniqSorted(Array.from(parsed.keys));
      envExampleFound = true;
    } catch {
      envExampleKeys = [];
      envExampleFound = false;
    }
  }

  const missingInEnvExample = envExampleFound ? keys.filter((k) => !envExampleKeys.includes(k)) : keys;
  const unusedInRepo = envExampleFound ? envExampleKeys.filter((k) => !keys.includes(k)) : [];

  return {
    rootDir,
    envExamplePath: options?.envExamplePath || null,
    envExampleFound,
    stats: {
      filesDiscovered: files.length,
      filesScanned,
      findings: findings.length,
      keys: keys.length,
      envExampleKeys: envExampleKeys.length
    },
    keys,
    envExampleKeys,
    missingInEnvExample,
    unusedInRepo,
    findings,
    skipped
  };
}
