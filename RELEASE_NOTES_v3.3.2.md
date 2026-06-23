# MergeExcels v3.3.2 — Cloudflare Node.js 22 Compatibility Patch

## Fixed
- Updated `.node-version` from Node.js 20 to Node.js 22.
- Updated `package.json` and `package-lock.json` engine requirement to `>=22`.
- Updated release verification to require Node.js 22 or newer.
- Updated static asset cache-busting and version badge to `v3.3.2`.

## Reason
Wrangler 4.102.0 and its current dependencies require Node.js 22 or newer. Cloudflare builds pinned to Node.js 20 fail before deployment.

## Scope
No application feature or data-processing logic was changed. Menus 01–08 and the PDF-to-Excel spacing patch remain included.
