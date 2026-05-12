import test from "node:test";
import assert from "node:assert/strict";

import { buildEnvExampleAppend, parseEnvExample } from "../src/envExample.js";

test("parseEnvExample extracts keys", () => {
  const text = [
    "# comment",
    "API_KEY=TODO",
    "AWS_REGION=us-east-1",
    "",
    "INVALID LINE",
    "NESTED=one=two"
  ].join("\n");

  const { keys } = parseEnvExample(text);
  assert.equal(keys.has("API_KEY"), true);
  assert.equal(keys.has("AWS_REGION"), true);
  assert.equal(keys.has("INVALID"), false);
});

test("buildEnvExampleAppend appends deterministic lines", () => {
  const out = buildEnvExampleAppend(["A_KEY", "B_KEY"], {
    header: "# Added by EnvScout",
    placeholder: "TODO"
  });

  assert.match(out, /A_KEY=TODO/);
  assert.match(out, /B_KEY=TODO/);
});

