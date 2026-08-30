import fs from "node:fs/promises";

const BASELINE_VERSION = 1;

function normalizedKeys(values) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    throw new Error("Baseline missingInEnvExample must be an array of strings.");
  }
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export async function loadBaseline(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read baseline at ${filePath}: ${error.message}`);
  }

  if (!parsed || typeof parsed !== "object" || parsed.version !== BASELINE_VERSION) {
    throw new Error(`Baseline at ${filePath} must use version ${BASELINE_VERSION}.`);
  }

  return normalizedKeys(parsed.missingInEnvExample);
}

export async function writeBaseline(filePath, missingInEnvExample) {
  const payload = {
    version: BASELINE_VERSION,
    missingInEnvExample: normalizedKeys(missingInEnvExample)
  };
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function applyBaseline(report, baselineKeys) {
  if (!baselineKeys) return report;
  const known = report.missingInEnvExample.filter((key) => baselineKeys.includes(key));
  const introduced = report.missingInEnvExample.filter((key) => !baselineKeys.includes(key));
  return {
    ...report,
    baselinePath: report.baselinePath || null,
    baselineMissingInEnvExample: known,
    newMissingInEnvExample: introduced
  };
}
