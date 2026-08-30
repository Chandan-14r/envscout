import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("CLI returns non-zero when missing keys exist", () => {
  const run = spawnSync(
    process.execPath,
    ["src/cli.js", "demo", "--env-example", "demo/.env.example", "--format", "table"],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stdout, /Missing from \.env\.example/);
  assert.match(run.stdout, /API_KEY/);
});

test("CLI baseline allows known missing keys but fails on new ones", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "envscout-cli-"));
  try {
    await fs.writeFile(path.join(tempRoot, "app.js"), "process.env.OLD_KEY;\n", "utf8");
    await fs.writeFile(path.join(tempRoot, ".env.example"), "", "utf8");
    const baselinePath = path.join(tempRoot, "baseline.json");

    const capture = spawnSync(process.execPath, ["src/cli.js", tempRoot, "--write-baseline", baselinePath], { encoding: "utf8" });
    assert.equal(capture.status, 0);

    const knownOnly = spawnSync(process.execPath, ["src/cli.js", tempRoot, "--baseline", baselinePath], { encoding: "utf8" });
    assert.equal(knownOnly.status, 0);

    await fs.writeFile(path.join(tempRoot, "app.js"), "process.env.OLD_KEY; process.env.NEW_KEY;\n", "utf8");
    const newGap = spawnSync(process.execPath, ["src/cli.js", tempRoot, "--baseline", baselinePath], { encoding: "utf8" });
    assert.equal(newGap.status, 1);
    assert.match(newGap.stdout, /NEW_KEY/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
