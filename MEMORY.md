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
