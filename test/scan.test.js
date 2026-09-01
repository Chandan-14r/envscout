import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
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

test("scanRepo finds env usage in Go, Rust, and JVM sources", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "envscout-language-"));
  try {
    await fs.writeFile(path.join(tempRoot, "main.go"), 'token := os.Getenv("GO_TOKEN")\n_, ok := os.LookupEnv("GO_REGION")\n', "utf8");
    await fs.writeFile(path.join(tempRoot, "config.rs"), 'let endpoint = std::env::var("RUST_ENDPOINT");\nlet secret = env::var_os("RUST_SECRET");\n', "utf8");
    await fs.writeFile(path.join(tempRoot, "App.java"), 'String key = System.getenv("JAVA_API_KEY");\n', "utf8");
    await fs.writeFile(path.join(tempRoot, ".env.example"), "GO_TOKEN=\nRUST_ENDPOINT=\n", "utf8");
    const report = await scanRepo(tempRoot, { envExamplePath: path.join(tempRoot, ".env.example") });

    assert.deepEqual(report.keys, ["GO_REGION", "GO_TOKEN", "JAVA_API_KEY", "RUST_ENDPOINT", "RUST_SECRET"]);
    assert.deepEqual(report.missingInEnvExample, ["GO_REGION", "JAVA_API_KEY", "RUST_SECRET"]);
    assert.deepEqual(report.findings.map(({ key, pattern }) => [key, pattern]), [
      ["JAVA_API_KEY", "java_system_getenv"],
      ["RUST_ENDPOINT", "rust_env_var"],
      ["RUST_SECRET", "rust_env_var_os"],
      ["GO_TOKEN", "go_os_getenv"],
      ["GO_REGION", "go_os_lookup_env"]
    ]);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("scanRepo finds declared Dockerfile build and runtime configuration", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "envscout-docker-"));
  try {
    await fs.writeFile(
      path.join(tempRoot, "Dockerfile"),
      [
        "FROM node:20-alpine",
        "ARG BUILD_SHA",
        "ENV APP_PORT=3000",
        "ENV LOG_LEVEL info",
        "RUN echo $APP_PORT"
      ].join("\n"),
      "utf8"
    );
    await fs.writeFile(path.join(tempRoot, ".env.example"), "APP_PORT=\n", "utf8");

    const report = await scanRepo(tempRoot, { envExamplePath: path.join(tempRoot, ".env.example") });

    assert.deepEqual(report.keys, ["APP_PORT", "BUILD_SHA", "LOG_LEVEL"]);
    assert.deepEqual(report.missingInEnvExample, ["BUILD_SHA", "LOG_LEVEL"]);
    assert.deepEqual(report.findings.map(({ key, pattern }) => [key, pattern]), [
      ["BUILD_SHA", "dockerfile_env_or_arg"],
      ["APP_PORT", "dockerfile_env_or_arg"],
      ["LOG_LEVEL", "dockerfile_env_or_arg"]
    ]);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
