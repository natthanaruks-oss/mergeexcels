# MergeExcels v3.2 — Clean Handover Release

## Verified

- Unit tests for Excel, PDF, Thai text correction and PDF-table logic pass.
- Cloudflare Wrangler dry-run passes with `assets.directory = "./public"`.
- Local HTTP smoke test returns 200 and applies the configured CSP headers.
- `package-lock.json` contains no internal OpenAI/sandbox registry URLs.
- Release package excludes `.git`, `node_modules` and build output.

## Changes in this release

- Added `.node-version` = Node.js 20.
- Added `.gitignore` and `.gitattributes`.
- Added `npm run verify` and automated release safety checks.
- Added visible `v3.2.0` badge and cache-busting asset versions.
- Corrected Thai Gazetteer spelling: `สุราษฎร์ธานี`.
- Hardened Gazetteer-generated regex by escaping location names.
- Added regression tests for glued `จ.` / `อ.` / `ต.` location markers.
- Added `SECURITY.md` documenting the current SheetJS dependency item.

## Open item

- Upgrade the vendored SheetJS build from npm `xlsx@0.18.5` to the verified official SheetJS CE 0.20.3 build, followed by full Excel regression testing.
