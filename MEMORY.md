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
