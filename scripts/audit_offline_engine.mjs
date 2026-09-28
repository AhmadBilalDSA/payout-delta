import { readFileSync, existsSync } from "fs";
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

console.log("\nPayoutDelta offline engine audit (./out)\n");

console.log("Surface 1 — Service Worker Script");
const swPath = join(ROOT, "public", "sw.js");
const swExists = existsSync(swPath);
assert(swExists, "public/sw.js exists");

if (swExists) {
  const swContent = readFileSync(swPath, "utf8");
  assert(swContent.includes("CACHE_NAME = 'payout-delta-v1'"), "sw.js contains versioned CACHE_NAME");
  assert(swContent.includes("addEventListener('fetch'") || swContent.includes("addEventListener(\"fetch\""), "sw.js contains fetch event handler");
} else {
  assert(false, "sw.js contains versioned CACHE_NAME");
  assert(false, "sw.js contains fetch event handler");
}
console.log("");

console.log("Surface 2 — Web App Manifest");
const manifestPath = join(ROOT, "out", "manifest.webmanifest");
const manifestExists = existsSync(manifestPath);
assert(manifestExists, "out/manifest.webmanifest exists");

if (manifestExists) {
  const manifestData = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert(manifestData.start_url === "/payout-delta/", "manifest specifies /payout-delta/ start_url", manifestData.start_url);
  assert(manifestData.scope === "/payout-delta/", "manifest specifies /payout-delta/ scope", manifestData.scope);
} else {
  assert(false, "manifest specifies /payout-delta/ start_url");
  assert(false, "manifest specifies /payout-delta/ scope");
}
console.log("");

console.log("Surface 3 — Client Registration component");
const regPath = join(ROOT, "components", "pwa", "ServiceWorkerRegister.tsx");
const regExists = existsSync(regPath);
assert(regExists, "components/pwa/ServiceWorkerRegister.tsx exists");

if (regExists) {
  const regContent = readFileSync(regPath, "utf8");
  assert(regContent.includes("navigator.serviceWorker"), "component references navigator.serviceWorker");
  assert(regContent.includes("register(\"/payout-delta/sw.js\"") || regContent.includes("register('/payout-delta/sw.js'"), "component registers /payout-delta/sw.js");
} else {
  assert(false, "component references navigator.serviceWorker");
  assert(false, "component registers /payout-delta/sw.js");
}
console.log("");

console.log("Surface 4 — Zero Runtime Dependencies");
const pkgPath = join(ROOT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const depsCount = pkg.dependencies ? Object.keys(pkg.dependencies).length : 0;
assert(depsCount === 0 || !("workbox-window" in pkg.dependencies) && !("workbox-build" in pkg.devDependencies), "zero workbox/runtime dependencies", `dependencies: ${depsCount}`);

console.log(`\n  assertions                 ${assertions}`);
console.log(`  failures                   ${failures}\n`);

if (failures > 0) {
  console.error("  OFFLINE ENGINE AUDIT FAILED\n");
  process.exit(1);
} else {
  console.log("  ALL OFFLINE ENGINE CHECKS PASSED\n");
  process.exit(0);
}
