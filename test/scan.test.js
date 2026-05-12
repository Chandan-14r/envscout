import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { scanRepo } from "../src/scan.js";

test("scanRepo finds env key usage across file types", async () => {
  const demoDir = path.resolve("demo");
  const envExamplePath = path.join(demoDir, ".env.example");
  const report = await scanRepo(demoDir, { envExamplePath, ignore: [] });

  assert.ok(report.keys.includes("API_BASE_URL"));
  assert.ok(report.keys.includes("API_KEY"));
  assert.ok(report.keys.includes("SENTRY_DSN"));
  assert.ok(report.keys.includes("UPLOAD_BUCKET"));
  assert.ok(report.keys.includes("AWS_REGION"));
  assert.ok(report.keys.includes("SERVICE_TOKEN"));
  assert.ok(report.keys.includes("DEPLOY_ENV"));

  assert.deepEqual(report.envExampleKeys.sort(), ["API_BASE_URL", "AWS_REGION"]);

  for (const key of ["API_KEY", "DEPLOY_ENV", "SENTRY_DSN", "SERVICE_TOKEN", "UPLOAD_BUCKET"]) {
    assert.ok(report.missingInEnvExample.includes(key));
  }
});

