# Office Toolkit v4.1.0 — Phase 1A PDF Page Tools

## Added
- New PDF Page Tools card under PDF category.
- Visual page-plan editor using existing PDF thumbnails.
- Reorder by drag/drop or move buttons.
- Rotate left/right in 90° increments.
- Delete and duplicate pages.
- Select pages and export selected pages only.
- Split current page plan into odd/even PDF files in a ZIP.
- Split current page plan every N pages into a ZIP.
- Insert blank page using the first readable source page size; A4 fallback when unavailable.

## Safety / behaviour
- Source PDFs are never modified.
- Page edits are applied only when generating a new output file.
- Existing warning remains: editing a digitally signed PDF can invalidate the original signature.
- Encrypted/password-protected PDF support is unchanged.

## Verification completed in build environment
- JavaScript syntax checks for `public/app.js` and `public/pdf-ops.js`.
- PDF engine tests cover page count, page-plan order, 90°/270° rotation, blank-page dimensions, odd/even split and every-N split.
- Full existing regression suite executed.
- Release-structure/CSP/cache-busting checks executed.

## Still required before calling Production Ready
- Deployed browser UAT on representative real PDFs in current corporate Edge/Chrome.
- Cloudflare deployment evidence using the approved API-token-only workflow.
