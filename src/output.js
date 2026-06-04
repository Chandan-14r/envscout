function padRight(text, width) {
  const raw = String(text);
  if (raw.length >= width) return raw;
  return raw + " ".repeat(width - raw.length);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function renderListItems(items, emptyText) {
  if (items.length === 0) {
    return `<li class="empty">${escapeHtml(emptyText)}</li>`;
  }
  return items.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join("");
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

export function renderHtml(report) {
  const coverage = report.stats.keys === 0 ? 100 : (report.envExampleKeys.length / report.stats.keys) * 100;
  const findingsRows = report.findings
    .slice(0, 50)
    .map(
      (finding) => `
        <tr>
          <td><code>${escapeHtml(finding.key)}</code></td>
          <td><code>${escapeHtml(`${finding.path}:${finding.line}`)}</code></td>
          <td><code>${escapeHtml(finding.pattern)}</code></td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>EnvScout Report</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4efe6;
        --panel: rgba(255, 252, 247, 0.92);
        --panel-strong: #fffdf8;
        --ink: #172033;
        --muted: #5d677d;
        --accent: #0f766e;
        --accent-soft: rgba(15, 118, 110, 0.12);
        --warn: #b45309;
        --warn-soft: rgba(180, 83, 9, 0.12);
        --danger: #b91c1c;
        --danger-soft: rgba(185, 28, 28, 0.12);
        --line: rgba(23, 32, 51, 0.1);
        --shadow: 0 18px 50px rgba(23, 32, 51, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Segoe UI", Inter, Arial, sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 28%),
          radial-gradient(circle at top right, rgba(180, 83, 9, 0.16), transparent 24%),
          linear-gradient(180deg, #fbf7ef 0%, var(--bg) 100%);
      }

      .shell {
        width: min(1120px, calc(100vw - 32px));
        margin: 32px auto 48px;
      }

      .hero,
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(14px);
      }

      .hero {
        padding: 28px;
        margin-bottom: 20px;
      }

      .eyebrow {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 14px 0 10px;
        font-size: clamp(32px, 5vw, 52px);
        line-height: 0.96;
      }

      .lede {
        margin: 0;
        color: var(--muted);
        font-size: 16px;
        max-width: 70ch;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }

      .meta span,
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.78);
        font-size: 14px;
      }

      .grid {
        display: grid;
        gap: 20px;
      }

      .stats {
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        margin-bottom: 20px;
      }

      .card {
        padding: 22px;
      }

      .card h2,
      .panel h2 {
        margin: 0 0 14px;
        font-size: 18px;
      }

      .stat-value {
        font-size: 40px;
        line-height: 1;
        font-weight: 800;
        margin-bottom: 8px;
      }

      .stat-label,
      .hint {
        color: var(--muted);
        font-size: 14px;
      }

      .dual {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        margin-bottom: 20px;
      }

      .panel {
        padding: 22px;
      }

      ul {
        margin: 0;
        padding-left: 20px;
      }

      li {
        margin: 8px 0;
      }

      .empty {
        color: var(--muted);
      }

      .tone-ok {
        background: var(--accent-soft);
      }

      .tone-warn {
        background: var(--warn-soft);
      }

      .tone-danger {
        background: var(--danger-soft);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
      }

      th,
      td {
        text-align: left;
        padding: 12px 10px;
        border-top: 1px solid var(--line);
        vertical-align: top;
        font-size: 14px;
      }

      th {
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      code {
        font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
        font-size: 0.95em;
      }

      .footer {
        margin-top: 18px;
        color: var(--muted);
        font-size: 13px;
      }

      @media (max-width: 720px) {
        .shell {
          width: min(100vw - 20px, 1120px);
          margin: 20px auto 28px;
        }

        .hero,
        .panel,
        .card {
          border-radius: 20px;
        }

        .hero,
        .panel,
        .card {
          padding: 18px;
        }

        th,
        td {
          padding: 10px 8px;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <span class="eyebrow">EnvScout report</span>
        <h1>Audit your env coverage before config drift ships.</h1>
        <p class="lede">
          EnvScout found <strong>${report.stats.keys}</strong> distinct key(s) across
          <strong>${report.stats.filesScanned}</strong> scanned file(s), then compared them against
          <strong>${escapeHtml(report.envExamplePath || "no .env.example path")}</strong>.
        </p>
        <div class="meta">
          <span>Root <code>${escapeHtml(report.rootDir)}</code></span>
          <span class="pill ${report.missingInEnvExample.length === 0 ? "tone-ok" : "tone-danger"}">
            Missing ${report.missingInEnvExample.length}
          </span>
          <span class="pill ${report.unusedInRepo.length === 0 ? "tone-ok" : "tone-warn"}">
            Unused ${report.unusedInRepo.length}
          </span>
          <span class="pill tone-ok">Coverage ${formatPercent(coverage)}</span>
        </div>
      </section>

      <section class="grid stats">
        <article class="panel card">
          <div class="stat-value">${report.stats.filesDiscovered}</div>
          <div class="stat-label">files discovered</div>
        </article>
        <article class="panel card">
          <div class="stat-value">${report.stats.findings}</div>
          <div class="stat-label">env matches found</div>
        </article>
        <article class="panel card">
          <div class="stat-value">${report.envExampleKeys.length}</div>
          <div class="stat-label">keys documented in .env.example</div>
        </article>
        <article class="panel card">
          <div class="stat-value">${report.skipped.length}</div>
          <div class="stat-label">file(s) skipped</div>
        </article>
      </section>

      <section class="grid dual">
        <article class="panel">
          <h2>Missing from .env.example</h2>
          <ul>${renderListItems(report.missingInEnvExample, "Everything referenced in code is documented.")}</ul>
        </article>
        <article class="panel">
          <h2>Unused keys</h2>
          <ul>${renderListItems(report.unusedInRepo, "No stale keys were found in .env.example.")}</ul>
        </article>
      </section>

      <section class="panel">
        <h2>Findings</h2>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Location</th>
              <th>Pattern</th>
            </tr>
          </thead>
          <tbody>
            ${findingsRows || '<tr><td colspan="3" class="empty">No env references were found.</td></tr>'}
          </tbody>
        </table>
        <p class="footer">
          Generated by EnvScout. HTML reports are standalone, shareable, and ready to attach to issues, PRs, or docs.
        </p>
      </section>
    </main>
  </body>
</html>`;
}
