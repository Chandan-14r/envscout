import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { applyBaseline, loadBaseline, writeBaseline } from "../src/baseline.js";
import { renderSarif } from "../src/output.js";

test("baseline keeps existing gaps visible but only makes new gaps blocking", () => {
  const report = applyBaseline(
    { missingInEnvExample: ["NEW_KEY", "OLD_KEY"], unusedInRepo: [], findings: [] },
    ["OLD_KEY"]
  );

  assert.deepEqual(report.newMissingInEnvExample, ["NEW_KEY"]);
  assert.deepEqual(report.baselineMissingInEnvExample, ["OLD_KEY"]);
});

test("baseline files round-trip and SARIF only reports new missing keys", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "envscout-baseline-"));
  const baselinePath = path.join(tempDir, "baseline.json");
  try {
    await writeBaseline(baselinePath, ["OLD_KEY", "OLD_KEY"]);
    assert.deepEqual(await loadBaseline(baselinePath), ["OLD_KEY"]);

    const sarif = JSON.parse(renderSarif({
      missingInEnvExample: ["NEW_KEY", "OLD_KEY"],
      newMissingInEnvExample: ["NEW_KEY"],
      unusedInRepo: [],
      findings: [{ key: "NEW_KEY", path: "app.js", line: 1 }]
    }));
    assert.equal(sarif.runs[0].results.length, 1);
    assert.match(sarif.runs[0].results[0].message.text, /NEW_KEY/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
