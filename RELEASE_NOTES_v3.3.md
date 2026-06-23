# MergeExcels v3.3 — Large Excel Optimization Release

## New: Menu 08 — Optimize Excel

- Added file analysis for rows, columns, non-empty cells, formulas, comments, hyperlinks, styles, hidden sheets and bloated Used Range.
- Added `Values Only` mode for Oracle Raw Data.
- Added `Safe Optimize` mode that preserves formulas and number formats.
- Added XLSX and UTF-8 CSV output.
- Added row splitting at 25,000 / 50,000 / 100,000 rows with repeated headers and ZIP output.
- Added Before/After Integrity Report and size-reduction summary.
- Added progress reporting and cancellation.
- All large-workbook operations run in a same-origin Web Worker.

## Verification

- Existing Excel, PDF, Thai text and PDF-table regression tests pass.
- New OptimizeOps tests cover bloated ranges, Values Only, Safe Formula preservation, hidden sheets, comments, hyperlinks and split headers.
- Worker smoke test passed with a 5,001-row workbook.
- Large-data validation passed with a 90,001-row / 720,008-cell Oracle-style workbook, including normal Optimize and 50,000-row split output.
- Cloudflare release checks and Wrangler dry-run must pass before packaging.

## Important behavior

- Optimize creates a new Workbook; the uploaded file is never modified.
- Values Only uses cached formula values. If a formula has no cached value, the displayed text is used as a fallback and Integrity Report should be reviewed.
- Charts, images, macros, drawings and advanced Excel features are not guaranteed to survive optimization.
- Split output removes merged cells because merged ranges cannot safely span separate output files.
