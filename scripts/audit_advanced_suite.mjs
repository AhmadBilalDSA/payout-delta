import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

let assertions = 0;
let failures = 0;

function assert(condition, message) {
  assertions++;
  if (condition) {
    console.log(`  PASS  ${message}`);
  } else {
    console.error(`  FAIL  ${message}`);
    failures++;
  }
}

console.log("\nPayoutDelta advanced suite audit (./out)\n");

const matrixHtmlPath = path.join(ROOT, "out", "matrix", "index.html");
const fxHtmlPath = path.join(ROOT, "out", "fx", "index.html");

console.log("Surface 1 — /matrix/ sensitivity matrix");
if (fs.existsSync(matrixHtmlPath)) {
  const matrixHtml = fs.readFileSync(matrixHtmlPath, "utf-8");
  assert(true, "matrix exported");
  
  // Checking for tabular-nums and font-mono in numerical table cells
  const tabularCount = (matrixHtml.match(/tabular-nums/g) || []).length;
  const monoCount = (matrixHtml.match(/font-mono/g) || []).length;
  assert(tabularCount >= 10 && monoCount >= 10, "matrix mono+tabular cells present");
} else {
  assert(false, "matrix exported");
}

console.log("\nSurface 2 — /fx/ canonical fx converter");
if (fs.existsSync(fxHtmlPath)) {
  const fxHtml = fs.readFileSync(fxHtmlPath, "utf-8");
  assert(true, "fx exported");
  
  // Checking for tabular-nums and font-mono in numerical table cells
  const tabularCount = (fxHtml.match(/tabular-nums/g) || []).length;
  const monoCount = (fxHtml.match(/font-mono/g) || []).length;
  assert(tabularCount >= 3 && monoCount >= 3, "fx mono+tabular cells present");
} else {
  assert(false, "fx exported");
}

console.log("\nSurface 3 — Zero Runtime Dependencies");
const pkgPath = path.join(ROOT, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const deps = Object.keys(pkg.dependencies || {});
// Must remain exactly zero external packages beyond Next/React/Tailwind/Framer/Clsx
const allowedDeps = ["next", "react", "react-dom", "tailwindcss", "clsx", "tailwind-merge", "@radix-ui/react-accordion", "@radix-ui/react-slider", "@radix-ui/react-toggle-group"];
const externalDeps = deps.filter(d => !allowedDeps.includes(d));
assert(externalDeps.length === 0, `zero external runtime npm packages (found ${externalDeps.join(", ")})`);

console.log("\nSurface 4 — Cryptographic Client-Side Audit Seal");
const auditSealPath = path.join(ROOT, "components", "hex", "AuditSeal.tsx");
if (fs.existsSync(auditSealPath)) {
  const auditSealCode = fs.readFileSync(auditSealPath, "utf-8");
  assert(auditSealCode.includes("crypto.subtle.digest"), "AuditSeal uses native crypto.subtle.digest");
  assert(!auditSealCode.includes("require('crypto')") && !auditSealCode.includes("import crypto"), "AuditSeal has no crypto polyfill");
} else {
  assert(false, "AuditSeal exists");
}

console.log(`\n  assertions                 ${assertions}`);
console.log(`  failures                   ${failures}`);

if (failures > 0) {
  console.error("\n  ADVANCED SUITE ENGINE CHECKS FAILED\n");
  process.exit(1);
} else {
  console.log("\n  ALL ADVANCED SUITE ENGINE CHECKS PASSED\n");
  process.exit(0);
}
