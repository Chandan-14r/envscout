import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

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

