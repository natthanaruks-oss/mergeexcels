import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const vendorDir = resolve(root, "public", "vendor");

await mkdir(vendorDir, { recursive: true });

const assets = [
  ["xlsx/dist/xlsx.full.min.js", "xlsx.full.min.js"],
  ["jszip/dist/jszip.min.js", "jszip.min.js"],
  ["pdf-lib/dist/pdf-lib.min.js", "pdf-lib.min.js"],
];

for (const [source, destination] of assets) {
  await copyFile(resolve(root, "node_modules", source), resolve(vendorDir, destination));
}

console.log("Excel, ZIP, and PDF browser libraries copied to public/vendor.");
