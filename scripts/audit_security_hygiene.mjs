import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

let assertions = 0;
let failures = 0;

function assert(condition, message, successDetail = "") {
  assertions++;
  if (!condition) {
    console.error(`  FAIL  ${message}`);
    failures++;
  } else if (successDetail) {
    console.log(`  PASS  ${message.padEnd(40)} ${successDetail}`);
  } else {
    console.log(`  PASS  ${message}`);
  }
}

console.log("\nPayoutDelta security hygiene audit\n");

console.log("Surface 1 — Codebase Secrets Scan");

function walk(dir) {
  let results = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = join(dir, file);
    if (file === "node_modules" || file === ".next" || file === "out" || file === ".git" || file === "coverage" || file === "package-lock.json" || file === "audit_security_hygiene.mjs") continue;
    
    const stat = statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = walk(ROOT);

let foundSecrets = false;

const SECRET_PATTERNS = [
  { name: "Private Key", regex: /-----BEGIN .* PRIVATE KEY-----/i },
  { name: "Token", regex: /(ghp_|github_pat_|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/ },
  { name: "Database URI", regex: /(postgres|mysql|mongodb\+srv):\/\/[^:\/\s]+:[^@\/\s]+@[^\/\s]+/i },
  { name: "AWS Key", regex: /(AKIA|ASIA)[0-9A-Z]{16}/ },
];

for (const file of allFiles) {
  // Only scan text files heuristically (skip known binary types if needed, though we can just read as utf8 and ignore garbled)
  if (file.endsWith('.png') || file.endsWith('.woff2') || file.endsWith('.ico') || file.endsWith('.zip')) continue;
  
  try {
    const content = readFileSync(file, "utf8");
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(content)) {
        console.error(`  FAIL  Found potential ${pattern.name} in ${file.replace(ROOT, '')}`);
        foundSecrets = true;
        failures++;
      }
    }
  } catch(e) {
    // skip unreadable
  }
}

assert(!foundSecrets, "0 secrets found in source tree");
console.log("");

console.log("Surface 2 — Gitignore Strict Boundaries");
const gitignorePath = join(ROOT, ".gitignore");
const gitignoreExists = existsSync(gitignorePath);
assert(gitignoreExists, ".gitignore exists");

if (gitignoreExists) {
  const gitignoreContent = readFileSync(gitignorePath, "utf8");
  assert(gitignoreContent.includes(".env*"), ".gitignore excludes .env*");
  assert(gitignoreContent.includes("*.pem"), ".gitignore excludes *.pem");
  assert(gitignoreContent.includes("*.key"), ".gitignore excludes *.key");
  assert(gitignoreContent.includes("*.p12"), ".gitignore excludes *.p12");
  assert(gitignoreContent.includes("*.pfx"), ".gitignore excludes *.pfx");
  assert(gitignoreContent.includes("id_rsa*"), ".gitignore excludes id_rsa*");
  assert(gitignoreContent.includes("*.log"), ".gitignore excludes *.log");
  assert(gitignoreContent.includes(".turbo"), ".gitignore excludes .turbo");
  assert(gitignoreContent.includes(".vscode/*"), ".gitignore excludes .vscode/*");
  assert(gitignoreContent.includes("!.vscode/settings.json") || gitignoreContent.includes("!.vscode"), ".gitignore allows shared settings.json");
} else {
  failures += 10;
}
console.log("");

console.log(`\n  assertions                 ${assertions}`);
console.log(`  failures                   ${failures}\n`);

if (failures > 0) {
  console.error("  SECURITY HYGIENE AUDIT FAILED\n");
  process.exit(1);
} else {
  console.log("  ALL SECURITY CHECKS PASSED\n");
  process.exit(0);
}
