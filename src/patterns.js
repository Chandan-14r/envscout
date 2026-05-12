const IDENT = "[A-Z][A-Z0-9_]*";

function makeNamedPattern(name, regex, hints) {
  return { name, regex, hints };
}

export const DEFAULT_PATTERNS = [
  makeNamedPattern(
    "js_process_env_dot",
    new RegExp(`\\bprocess\\.env\\.(${IDENT})\\b`, "g"),
    ["js", "ts", "jsx", "tsx", "mjs", "cjs"]
  ),
  makeNamedPattern(
    "js_process_env_bracket",
    new RegExp(`\\bprocess\\.env\\s*\\[\\s*['"](${IDENT})['"]\\s*\\]`, "g"),
    ["js", "ts", "jsx", "tsx", "mjs", "cjs"]
  ),
  makeNamedPattern(
    "vite_import_meta_env_dot",
    new RegExp(`\\bimport\\.meta\\.env\\.(${IDENT})\\b`, "g"),
    ["js", "ts", "jsx", "tsx", "mjs"]
  ),
  makeNamedPattern(
    "python_os_environ_bracket",
    new RegExp(`\\bos\\.environ\\s*\\[\\s*['"](${IDENT})['"]\\s*\\]`, "g"),
    ["py"]
  ),
  makeNamedPattern(
    "python_os_environ_get",
    new RegExp(`\\bos\\.environ\\.get\\s*\\(\\s*['"](${IDENT})['"]`, "g"),
    ["py"]
  ),
  makeNamedPattern(
    "python_os_getenv",
    new RegExp(`\\bos\\.getenv\\s*\\(\\s*['"](${IDENT})['"]`, "g"),
    ["py"]
  ),
  makeNamedPattern(
    "yaml_dollar_brace",
    new RegExp(`\\$\\{\\s*(${IDENT})\\s*\\}`, "g"),
    ["yml", "yaml"]
  ),
  makeNamedPattern(
    "shell_dollar_brace",
    new RegExp(`\\$\\{\\s*(${IDENT})\\s*\\}`, "g"),
    ["sh", "bash", "zsh"]
  )
];

export const DEFAULT_EXTENSIONS = new Set([
  "js",
  "ts",
  "jsx",
  "tsx",
  "mjs",
  "cjs",
  "py",
  "yml",
  "yaml",
  "sh",
  "bash",
  "zsh",
  "env",
  "env.example",
  "toml",
  "json"
]);

export function shouldScanFile(relPathPosix) {
  const lower = relPathPosix.toLowerCase();
  const base = lower.split("/").at(-1) ?? lower;
  if (base === ".env" || base === ".env.example") return true;
  if (base === "docker-compose.yml" || base === "docker-compose.yaml") return true;
  if (base === "dockerfile") return true;
  if (lower.startsWith(".github/workflows/")) return true;

  const ext = base.includes(".") ? base.split(".").at(-1) : "";
  return DEFAULT_EXTENSIONS.has(ext);
}

