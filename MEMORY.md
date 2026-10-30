# Office Toolkit Material Decisions

## 2026-08-13 — Product consolidation
What happened: The utility had grown from Excel/PDF merge tools into 11 tools including BI-specific cleaners/builders.
Why: Users need a single entry point for common office file work, but a long flat menu no longer scales.
Decision: Keep one web product/URL, group tools by intent, and keep processing engines modular. Heavy workloads stay in a separate Desktop Companion.
Next time: Add features in small numbered phases and do not bundle unrelated engine refactors with a feature release.

## 2026-08-13 — Local-first boundary
What happened: Several workflows contain confidential business files.
Why: Core utility value depends on files not being uploaded to a server.
Decision: Core web modules remain local-first. Any future cloud storage, login, API or collaboration feature is scope drift and requires explicit architecture approval.
Next time: Every new module must state whether processing is fully local and list any external dependency before implementation.

## 2026-08-13 — Desktop phase removed from Office Toolkit roadmap
What happened: The user confirmed the Desktop Companion work is already complete and no longer of interest in this project.
Why: Keeping it in the roadmap would create false remaining scope and distract from the web Office Toolkit.
Decision: Remove Desktop Companion from this roadmap. The final production-hardening phase is now Phase 8.
Next time: Do not reopen large-file/Desktop work unless the user explicitly asks.

## 2026-08-13 — Phase 1A PDF Page Tools
What happened: Office Toolkit needed a general visual PDF page editor as the first Core Office Tools module.
Why: Page reorder/rotate/delete/extract/split are common office workflows and reuse the existing local PDF engines.
Decision: Implement page-plan editing without mutating source files. Output can be edited PDF, selected-page PDF, odd/even ZIP, or every-N-pages ZIP. Rotation is stored as output-plan metadata; blank pages inherit a readable source-page size with A4 fallback.
Next time: Keep source files immutable, surface output-impact clearly, and validate page-plan operations with pdf-lib tests before release.


## v4.2.0 Phase 1B
Implemented PDF Watermark & Stamp as a separate PDF module. Uses pdf-lib standard Helvetica for predictable browser-only packaging; Latin/English stamp text is supported in v1, while unsupported Thai glyphs are rejected with a clear error rather than producing corrupted text.

## 2026-08-13 — Phase 1C Image to PDF
- Implemented v4.3.0 Image to PDF for JPG/PNG/WebP.
- Multiple images remain reorderable before export.
- Supports A4 Fit / Original Size, Auto/Portrait/Landscape, margins and quality.
- Conversion is local-only; output is image-based PDF without OCR/searchable text.


## 2026-08-13 — Phase 1D PDF Scan Cleanup
- Implemented v4.4.0 as a separate PDF module.
- Scan cleanup is deliberately raster-based and local-only: controlled DPI/JPEG quality, grayscale and contrast.
- Blank-page deletion and consecutive-duplicate deletion are opt-in and require an Analyze step first; defaults do not delete pages.
- Automatic crop and heavy deskew/OCR were deferred rather than shipping unreliable document alteration.
- Existing searchable text/vector data and digital signatures may be lost after cleanup; this impact is shown in the UI.

## 2026-08-13 — Phase 1E Batch Rename
- Added Menu 16 Batch Rename in v4.5.0.
- Business intent: make repetitive office filename cleanup safe and reversible without modifying source files.
- Output is a ZIP of renamed copies plus `rename_log.csv`; browser cannot rename arbitrary source files in place safely.
- Collision detection is case-insensitive and blocks export until resolved.
- Phase 1A–1E is now functionally complete; next roadmap target is Phase 2A Excel Cleaner after Codespaces regression/deploy verification.

## 2026-08-13 — Phase 2A Excel Cleaner v4.6.0
- Added Excel Cleaner as Tool 17 under Excel category.
- Analyze-first UX; low-risk cleanup defaults only.
- Structural cleanup rebuilds sheet cell matrices while retaining cell objects/formulas where possible; advanced Excel objects may not survive and the UI warns users.
- Formula-to-values, external-link removal, hidden rows/columns and formatting cleanup remain explicit opt-in controls.

## 2026-10-30 — GitHub takeover: Phase 2A integrated into the repository
- Baseline audit: GitHub `main` was v4.5.0 (Phase 0–1E). v4.6.0 and v4.7.0 existed only as generated ZIPs; no v4.8.0 artifact was found on the audit machine. Production version is unverified.
- v4.6.0 (Excel Cleaner) was integrated on branch `integrate/v4.6.0-excel-cleaner` after review rather than bulk-copied.
- Review finding 1: the shipped UI path re-implemented the cleaning logic in `app.js` while the test covered a different, unused function. Decision: one engine, `ExcelCleanerOps.cleanWorksheet`, called by the UI; `product-shell` test blocks the duplicate from returning.
- Review finding 2: removing rows/columns while leaving formulas would shift references and Excel would silently recalculate wrong values. Decision: stop with a clear message unless Formula → Values is enabled; trailing-only removals do not trigger the guard.
- Also fixed: duplicate removal now drops merges/column widths/row heights (they would misalign); converted dates get an explicit `yyyy-mm-dd` format.
- Next time: when integrating a generated release, check that tests exercise the code the UI actually calls, not just a sibling function.
- Still open: OCR relies on jsDelivr/tessdata hosts in the CSP (scope-drift review needed before Phase 3 OCR work); v4.7.0 Compare and v4.8.0 Reconcile not yet integrated.

## 2026-10-30 — PDF to PNG added as v4.6.1
- Owner requested a PDF → PNG module. Built on top of the unmerged v4.6.0 branch as v4.6.1 so it does not collide with the Compare (v4.7.0) / Reconcile (v4.8.0) numbering.
- Decisions: page range + DPI choices; one page = bare PNG, many = ZIP; white background by default with an opt-in transparent background; per-page (~36M px) and whole-export (~600M px) limits that downscale/refuse instead of crashing the browser.
- Test-environment note: the in-app browser pane never fires requestAnimationFrame (page unfocused), which stalls PDF.js render; verification used a test-only rAF shim. Not a product defect, but real UAT must be done in a normal focused browser.
- Next time: a module is not verified by planner unit tests alone; render through the real page.

## 2026-10-30 — Tool catalog grouped by category (v4.6.2)
- Owner pointed out categories were not tidy: cards were in build order with categories interleaved and one tool (Batch Rename) sat under Conversion.
- Decision: group the "all" view by category with headings, add a File Utilities category for general file tools (also the future home of File Naming Standard), keep menu numbers as stable IDs because UI text and README cite them, derive the tool counter from the cards.
- Next time: when adding a module, place it in the right group and let the product-shell grouping test catch ordering mistakes.

## 2026-10-30 — PDF tools belong in the PDF category (v4.6.3)
- Owner corrected the v4.6.2 grouping: PDF→Excel, OCR→Excel, PDF→PNG and Image→PDF were under "Conversion". Rule now: anything that reads or writes a PDF is in the PDF category; empty categories are not allowed (test-enforced).
- Conversion tab removed. If a future tool does not involve a PDF (e.g. Oracle HTML-XLS cleaner is Business; a generic format converter) place it by its main input/output, and only create a new category when it has real tools.
- Next time: ask or state the category rule before regrouping, instead of inferring it from build order.
