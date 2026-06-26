#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { autofixEnvExample } from "./envExample.js";
import { scanRepo } from "./scan.js";
import { renderHtml, renderMarkdown, renderSarif, renderTable } from "./output.js";
import { tryParseJson } from "./util.js";

function usage() {
  return `EnvScout — env usage + .env.example coverage

Usage:
  envscout <path> [--format table|markdown|json|html|sarif] [--output <file>]
          [--env-example <file>] [--autofix] [--ignore <subpath> ...]

Examples:
  envscout .
  envscout . --env-example .env.example
  envscout demo --format markdown
  envscout . --format sarif --output envscout.sarif
  envscout demo --autofix

Config (optional):
  Put a .envscoutrc.json in the target root:
  {
    \"envExample\": \".env.example\",
    \"ignore\": [\"node_modules/\", \"dist/\"]
  }
`;
}

function parseArgv(argv) {
  const args = [...argv];
  const result = { _: [], ignore: [] };

  while (args.length > 0) {
    const token = args.shift();
    if (!token) continue;
    if (!token.startsWith("-")) {
      result._.push(token);
      continue;
    }
    if (token === "--help" || token === "-h") result.help = true;
    else if (token === "--format") result.format = args.shift();
    else if (token === "--output") result.output = args.shift();
    else if (token === "--env-example") result.envExample = args.shift();
    else if (token === "--autofix") result.autofix = true;
    else if (token === "--ignore") result.ignore.push(args.shift());
    else if (token === "--config") result.config = args.shift();
    else if (token === "--selfcheck") result.selfcheck = true;
    else result.unknown = (result.unknown || []).concat(token);
  }
  return result;
}

async function loadConfig(targetDir, explicitConfigPath) {
  const configPath = explicitConfigPath
    ? path.resolve(explicitConfigPath)
    : path.join(path.resolve(targetDir), ".envscoutrc.json");
  try {
    const text = await fs.readFile(configPath, "utf8");
    const parsed = tryParseJson(text);
    if (parsed.error) return { config: null, configPath, error: parsed.error };
    return { config: parsed.value, configPath, error: null };
  } catch (error) {
    return { config: null, configPath, error: null };
  }
}

async function main() {
  const argv = parseArgv(process.argv.slice(2));
  if (argv.help || argv._.length === 0) {
    process.stdout.write(usage());
    process.exit(argv.help ? 0 : 2);
  }

  if (argv.unknown?.length) {
    process.stderr.write(`Unknown option(s): ${argv.unknown.join(", ")}\n\n`);
    process.stderr.write(usage());
    process.exit(2);
  }

  if (argv.selfcheck) {
    process.stdout.write("ok\n");
    return;
  }

  const target = argv._[0];
  const { config } = await loadConfig(target, argv.config);
  const ignore = []
    .concat(config?.ignore || [])
    .concat(argv.ignore.filter(Boolean));

  const envExamplePath =
    argv.envExample ||
    (config?.envExample ? path.join(path.resolve(target), config.envExample) : null) ||
    path.join(path.resolve(target), ".env.example");

  const report = await scanRepo(target, { envExamplePath, ignore });

  if (argv.autofix) {
    if (report.missingInEnvExample.length === 0) {
      process.stderr.write("No missing keys to append to .env.example.\n");
    } else {
      try {
        await autofixEnvExample(envExamplePath, report.missingInEnvExample);
        process.stderr.write(`Updated ${envExamplePath}\n`);
      } catch (error) {
        process.stderr.write(`Failed to update ${envExamplePath}: ${error.message}\n`);
        process.exit(1);
      }
    }
  }

  const format = (argv.format || "table").toLowerCase();
  let outputText;
  if (format === "json") outputText = JSON.stringify(report, null, 2);
  else if (format === "html") outputText = renderHtml(report);
  else if (format === "sarif") outputText = renderSarif(report);
  else if (format === "markdown" || format === "md") outputText = renderMarkdown(report);
  else if (format === "table" || format === "text") outputText = renderTable(report);
  else {
    process.stderr.write(`Unknown format: ${argv.format}\n`);
    process.exit(2);
  }

  if (argv.output) {
    await fs.writeFile(argv.output, outputText, "utf8");
  } else {
    process.stdout.write(outputText + "\n");
  }

  process.exit(report.missingInEnvExample.length > 0 ? 1 : 0);
}

main().catch((error) => {
  process.stderr.write(String(error?.stack || error) + "\n");
  process.exit(1);
});
