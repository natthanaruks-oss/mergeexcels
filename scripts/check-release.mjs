import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  ".node-version",
  ".gitignore",
  "package.json",
  "package-lock.json",
  "wrangler.jsonc",
  "public/index.html",
  "public/app.js",
  "public/_headers",
  "public/vendor/xlsx.full.min.js",
  "public/vendor/jszip.min.js",
  "public/vendor/pdf-lib.min.js",
  "public/vendor/pdf.min.js",
  "public/vendor/pdf.worker.min.js",
  "public/optimize-ops.js",
  "public/optimize-worker.js",
  "tests/optimize-ops.test.cjs",
  "tests/optimize-worker.test.cjs",
  "public/budget-master.js",
  "public/budget-history-rules.js",
  "public/budget-builder-ops.js",
  "tests/budget-builder-ops.test.cjs",
];

for (const relativePath of requiredFiles) {
  await access(resolve(root, relativePath));
}

const [nodeVersion, packageJsonRaw, packageLock, wrangler, headers, app, optimizeWorker, indexHtml, budgetBuilder, budgetMaster, budgetHistory] = await Promise.all([
  readFile(resolve(root, ".node-version"), "utf8"),
  readFile(resolve(root, "package.json"), "utf8"),
  readFile(resolve(root, "package-lock.json"), "utf8"),
  readFile(resolve(root, "wrangler.jsonc"), "utf8"),
  readFile(resolve(root, "public/_headers"), "utf8"),
  readFile(resolve(root, "public/app.js"), "utf8"),
  readFile(resolve(root, "public/optimize-worker.js"), "utf8"),
  readFile(resolve(root, "public/index.html"), "utf8"),
  readFile(resolve(root, "public/budget-builder-ops.js"), "utf8"),
  readFile(resolve(root, "public/budget-master.js"), "utf8"),
  readFile(resolve(root, "public/budget-history-rules.js"), "utf8"),
]);


const packageJson = JSON.parse(packageJsonRaw);
const releaseVersion = packageJson.version;
if (!indexHtml.includes(`v${releaseVersion}`)) {
  throw new Error(`Version badge ใน index.html ไม่ตรงกับ package.json (${releaseVersion})`);
}
if (!indexHtml.includes(`?v=${releaseVersion}`)) {
  throw new Error(`Static asset cache-busting version ไม่ตรงกับ package.json (${releaseVersion})`);
}

const nodeMajor = Number.parseInt(nodeVersion.trim(), 10);
if (!Number.isFinite(nodeMajor) || nodeMajor < 22) {
  throw new Error(".node-version ต้องเป็น Node.js 22 ขึ้นไป");
}
if (/applied-caas-gateway|internal\.api\.openai\.org/i.test(packageLock)) {
  throw new Error("package-lock.json ยังมี internal registry ซึ่ง Cloudflare เข้าถึงไม่ได้");
}
if (!/"directory"\s*:\s*"\.\/public"/.test(wrangler)) {
  throw new Error('wrangler.jsonc ต้องกำหนด assets.directory เป็น "./public"');
}
if (!/worker-src\s+'self'\s+blob:/.test(headers)) {
  throw new Error("CSP ต้องอนุญาต worker-src 'self' blob:");
}
if (!/isEvalSupported\s*:\s*false/.test(app)) {
  throw new Error("PDF.js ต้องกำหนด isEvalSupported: false");
}
if (!app.includes(`optimize-worker.js?v=${releaseVersion}`)) {
  throw new Error(`Optimize Worker cache-busting version ไม่ตรงกับ package.json (${releaseVersion})`);
}
if (!optimizeWorker.includes(`optimize-ops.js?v=${releaseVersion}`)) {
  throw new Error(`Optimize Worker import version ไม่ตรงกับ package.json (${releaseVersion})`);
}

if (!indexHtml.includes('data-mode="budgetBuilder"') || !app.includes('processBudgetBuilder')) {
  throw new Error("เมนู 09 Budget Builder เชื่อมต่อไม่ครบ");
}
if (!budgetBuilder.includes("buildWorkbook") || !budgetMaster.includes("Factor.xlsx")) {
  throw new Error("Budget Builder master/engine ไม่ครบ");
}
if (!indexHtml.includes("budget-history-rules.js") || !budgetHistory.includes("HIST-2020-2026-v1")) {
  throw new Error("Historical Rule Engine ของเมนู 09 เชื่อมต่อไม่ครบ");
}

if (packageJson.dependencies?.xlsx === "0.18.5") {
  console.warn("WARNING: xlsx@0.18.5 has known security advisories; see SECURITY.md.");
}

console.log("Release structure and Cloudflare safety checks passed.");
