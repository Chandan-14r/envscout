import fs from "node:fs/promises";

export function parseEnvExample(text) {
  const lines = text.split(/\r?\n/);
  const keys = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (!trimmed.includes("=")) continue;
    const key = trimmed.split("=", 1)[0].trim();
    if (!key) continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    keys.add(key);
  }

  return { keys };
}

export function buildEnvExampleAppend(missingKeys, options) {
  const now = new Date();
  const header = options?.header ?? `# Added by EnvScout on ${now.toISOString()}`;
  const placeholder = options?.placeholder ?? "TODO";

  const lines = [header];
  for (const key of missingKeys) {
    lines.push(`${key}=${placeholder}`);
  }
  lines.push("");
  return lines.join("\n");
}

export async function autofixEnvExample(filePath, missingKeys) {
  if (missingKeys.length === 0) return { changed: false };
  let existing = "";
  try {
    existing = await fs.readFile(filePath, "utf8");
  } catch {
    existing = "";
  }

  const newline = existing.includes("\r\n") ? "\r\n" : "\n";
  const append = buildEnvExampleAppend(missingKeys, {}).replaceAll("\n", newline);
  const next =
    existing.length === 0 ? append : existing.endsWith(newline) ? existing + append : existing + newline + append;
  await fs.writeFile(filePath, next, "utf8");
  return { changed: true, created: existing.length === 0 };
}
