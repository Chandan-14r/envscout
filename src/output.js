function padRight(text, width) {
  const raw = String(text);
  if (raw.length >= width) return raw;
  return raw + " ".repeat(width - raw.length);
}

function formatTableRow(columns, widths) {
  return columns.map((c, i) => padRight(c, widths[i])).join("  ");
}

export function renderTable(report, options) {
  const maxList = options?.maxList ?? 25;

  const lines = [];
  lines.push(`EnvScout report: ${report.rootDir}`);
  lines.push(`Files: discovered ${report.stats.filesDiscovered}, scanned ${report.stats.filesScanned}`);
  lines.push(`Found ${report.stats.keys} env key(s) from ${report.stats.findings} match(es).`);
  if (report.envExamplePath) {
    if (report.envExampleFound) {
      lines.push(
        `.env.example: ${report.envExamplePath} (${report.envExampleKeys.length} key(s); missing: ${report.missingInEnvExample.length}, unused: ${report.unusedInRepo.length})`
      );
    } else {
      lines.push(`.env.example: ${report.envExamplePath} (missing on disk; list below is a suggested starter)`);
    }
  } else {
    lines.push(`.env.example: not provided`);
  }
  lines.push("");

  const show = (title, items) => {
    lines.push(title);
    if (items.length === 0) {
      lines.push("  (none)");
      lines.push("");
      return;
    }
    for (const item of items.slice(0, maxList)) {
      lines.push(`  - ${item}`);
    }
    if (items.length > maxList) lines.push(`  ... +${items.length - maxList} more`);
    lines.push("");
  };

  show("Missing from .env.example", report.missingInEnvExample);
  show("Unused (in .env.example but not referenced)", report.unusedInRepo);

  if (report.findings.length > 0) {
    lines.push("Top findings");
    const rows = report.findings.slice(0, Math.min(10, report.findings.length)).map((f) => [
      f.key,
      `${f.path}:${f.line}`,
      f.pattern
    ]);
    const widths = [0, 0, 0];
    for (const row of rows) {
      widths[0] = Math.max(widths[0], row[0].length);
      widths[1] = Math.max(widths[1], row[1].length);
      widths[2] = Math.max(widths[2], row[2].length);
    }
    lines.push(formatTableRow(["KEY", "LOCATION", "PATTERN"], widths));
    lines.push(formatTableRow(["---", "--------", "-------"], widths));
    for (const row of rows) lines.push(formatTableRow(row, widths));
    lines.push("");
  }

  return lines.join("\n");
}

export function renderMarkdown(report) {
  const lines = [];
  lines.push(`# EnvScout Report`);
  lines.push("");
  lines.push(`- Root: \`${report.rootDir}\``);
  lines.push(`- Files: discovered ${report.stats.filesDiscovered}, scanned ${report.stats.filesScanned}`);
  lines.push(`- Keys found: **${report.stats.keys}**`);
  lines.push(`- Matches: **${report.stats.findings}**`);
  if (report.envExamplePath) {
    lines.push(`- .env.example: \`${report.envExamplePath}\` (${report.envExampleFound ? "found" : "not found"})`);
    lines.push(`- .env.example keys: **${report.envExampleKeys.length}**`);
  } else {
    lines.push(`- .env.example: _not provided_`);
  }
  lines.push("");

  const section = (title, items) => {
    lines.push(`## ${title}`);
    lines.push("");
    if (items.length === 0) {
      lines.push("_None._");
      lines.push("");
      return;
    }
    for (const item of items) {
      lines.push(`- \`${item}\``);
    }
    lines.push("");
  };

  section("Missing from `.env.example`", report.missingInEnvExample);
  section("Unused keys (present in `.env.example`)", report.unusedInRepo);

  if (report.findings.length > 0) {
    lines.push("## Sample findings");
    lines.push("");
    lines.push("| Key | Location | Pattern |");
    lines.push("| --- | --- | --- |");
    for (const f of report.findings.slice(0, 25)) {
      lines.push(`| \`${f.key}\` | \`${f.path}:${f.line}\` | \`${f.pattern}\` |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
