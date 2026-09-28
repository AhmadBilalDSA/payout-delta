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

console.log("\nPayoutDelta UI polish audit (./out)\n");

console.log("Surface 1 — Third-party Animation Libraries");
const pkgPath = path.join(ROOT, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
const forbidden = ["framer-motion", "gsap", "react-spring", "animejs"];
const found = deps.filter(d => forbidden.includes(d));
assert(found.length === 0, `zero third-party animation libraries (found ${found.join(", ")})`);

console.log("\nSurface 2 — Monetary Cells Typography");
const matrixHtmlPath = path.join(ROOT, "out", "matrix", "index.html");
if (fs.existsSync(matrixHtmlPath)) {
  const matrixHtml = fs.readFileSync(matrixHtmlPath, "utf-8");
  const tabularCount = (matrixHtml.match(/tabular-nums/g) || []).length;
  const monoCount = (matrixHtml.match(/font-mono/g) || []).length;
  assert(tabularCount >= 10 && monoCount >= 10, "matrix mono+tabular cells intact");
} else {
  assert(false, "matrix exported");
}

console.log("\nSurface 3 — BankRoutingDiagram SVG Invariants");
const banksDir = path.join(ROOT, "out", "banks");
if (fs.existsSync(banksDir)) {
  const bankFolders = fs.readdirSync(banksDir).filter(f => fs.statSync(path.join(banksDir, f)).isDirectory());
  let allMatch = true;
  for (const folder of bankFolders) {
    const htmlPath = path.join(banksDir, folder, "index.html");
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, "utf-8");
      // Must contain exactly viewBox="0 0 776 190" for the routing diagram
      if (!html.includes('viewBox="0 0 776 190"')) {
        allMatch = false;
        console.error(`  FAIL  viewBox="0 0 776 190" missing in /banks/${folder}`);
        break;
      }
    }
  }
  assert(allMatch && bankFolders.length > 0, "BankRoutingDiagram viewBox remains strictly 0 0 776 190 across all generated bank dossier HTML pages");
} else {
  assert(false, "banks exported directory exists");
}

console.log(`\n  assertions                 ${assertions}`);
console.log(`  failures                   ${failures}`);

if (failures > 0) {
  console.error("\n  UI POLISH CHECKS FAILED\n");
  process.exit(1);
} else {
  console.log("\n  ALL UI POLISH CHECKS PASSED\n");
  process.exit(0);
}
