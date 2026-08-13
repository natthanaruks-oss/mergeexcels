# Office Toolkit Roadmap

Baseline scope approved 2026-08-13. The Desktop Companion phase is intentionally removed because that work is already complete and is not part of this project track.

## Phase 0 — Product Foundation (v4.0.0) — COMPLETE AS FOUNDATION
Goal: turn the growing MergeExcels utility into one coherent Office Toolkit without changing existing business logic.

- [x] Rename visible product shell to Office Toolkit.
- [x] Group existing tools into Excel / PDF / Conversion / Business categories.
- [x] Preserve all 11 existing tools and engines.
- [x] Add product specification, roadmap, release control and project memory.
- [ ] Production/UAT confirmation remains part of final hardening, not a reason to block feature development.

## Phase 1 — Core PDF & File Tools
Goal: daily-use utilities for general staff.

### Phase 1A — PDF Page Tools (v4.1.0) — IMPLEMENTED / AWAITING DEPLOYED UAT
- [x] Rotate pages left/right in 90-degree increments.
- [x] Delete pages from the output plan without touching the source file.
- [x] Extract selected pages.
- [x] Reorder pages by drag-and-drop or move buttons.
- [x] Split odd/even pages.
- [x] Split every N pages.
- [x] Duplicate a page.
- [x] Insert a blank page using the first readable source-page size, otherwise A4 fallback.
- [x] Preview, page count and selection status.
- [x] Automated PDF engine regression tests.
- [ ] Deployed browser UAT on representative real PDFs.

### Phase 1B — PDF Watermark & Stamp
- Text watermark/stamp
- Draft / Confidential / Internal Use presets
- Page number and filename stamping
- Position, opacity and page-range controls

### Phase 1C — Image to PDF
- JPG/PNG/WebP input
- Multiple images to one PDF
- A4 fit / original size
- Portrait/landscape and reorder

### Phase 1D — PDF Scan Cleanup
- Grayscale / contrast-oriented cleanup
- Blank-page detection/removal
- Margin/crop assistance where reliable
- Duplicate-page detection where reliable
- Heavy OCR/deskew is not added unless browser performance is proven

### Phase 1E — Batch Rename
- Filename pattern preview
- Running number/date/customer code placeholders
- Sanitize illegal filename characters
- Download renamed files as ZIP

## Phase 2 — Excel Productivity
Goal: reduce manual cleanup, comparison and reconciliation work.

### Phase 2A — Excel Cleaner
- Trim whitespace
- Remove blank rows/columns
- Remove duplicates
- Unmerge/fill-down headers
- Normalize date/number values
- Values-only / remove comments / links / hidden rows-columns controls

### Phase 2B — Excel Compare
- Compare two workbooks/sheets
- Key-column matching
- Added / removed / changed rows
- Difference workbook export

### Phase 2C — Excel Reconcile
- Exact key/amount matching first
- Unmatched A / unmatched B
- Duplicate-key detection
- Controlled tolerance options
- One-to-many/fuzzy matching only after exact reconciliation is stable and auditable

## Phase 3 — Conversion & Data Extraction
Goal: harden extraction/conversion tools separately from editing tools.

### Phase 3A — PDF to Excel Hardening
- Preserve road-budget/activity structure more reliably
- Validation and exception output
- Stable column controls

### Phase 3B — OCR Text Extractor
- Thai/English basic OCR extraction
- Page-level result and confidence where available
- Export to structured Excel/TXT

### Phase 3C — Oracle HTML XLS Cleaner Hardening
- Oracle BI Publisher detection
- Structured customer/transaction extraction
- Validation and reusable mapping controls

## Phase 4 — Business / BI Modules
Goal: governed Commercial/BI workflows inside the same product shell.

### Phase 4A — DOH/DOR Budget Builder Hardening
- Canonical work type master
- Factor version/effective year
- Historical/current territory separation
- Confidence and override audit

### Phase 4B — AR / Aging Analyzer
- Extend Oracle AR Cleaner outputs
- Customer overdue / movement / payment-behaviour views
- Currency separation and reconciliation controls

### Phase 4C — Provision Pack Builder
- Provision source + Aging + Assignment + Legal master
- Top 25 Non-Legal / Legal / Others
- Reconciliation to source provision

### Phase 4D — Sales / GP Cleaner
- Normalize monthly Sales/GP raw data
- Customer/project/product/region mapping
- MTD/YTD analysis-ready export

## Phase 5 — Security & Compliance
Goal: safer document handling before files leave the company.

### Phase 5A — Metadata Inspector / Remover
- Inspect supported metadata
- Remove supported metadata
- Surface hidden sheets/rows/columns and external links

### Phase 5B — PDF True Redaction
- Permanent content removal only where the PDF engine can guarantee it
- Never ship a black overlay presented as true redaction

### Phase 5C — PDF Protect
- Password/encryption only if the selected local PDF engine reliably supports it
- No password bypass functionality

## Phase 6 — Document Workflow
Goal: package and hand off office documents efficiently.

### Phase 6A — Document Pack Builder
- Merge selected PDF-ready attachments
- Cover/index/page numbering
- Controlled section order

### Phase 6B — Validation Center
- File/page/sheet counts before and after
- Module-specific integrity checks
- Download manifest for batch outputs

## Phase 7 — Shared Settings & Presets
Goal: reduce repetitive setup without introducing user accounts or cloud dependency.

- Default compression/quality settings
- Naming presets
- Company/business presets where safe
- Local recent preferences
- Safe-reset and default controls

## Phase 8 — UAT / Hardening / Production Standard
Goal: make the toolkit supportable as an internal product.

- Browser matrix: Edge/Chrome current corporate versions
- Performance thresholds and file-size guidance per module
- Regression fixtures
- Release/checklist automation
- User guide and known limitations
- Recovery/rollback release process
- Final security review of local-only claims and CSP
- Cloudflare deployment verification using API-token-only workflow

## Scope drift rule
A new feature requiring cloud storage, login, shared database, workflow approvals, server-side OCR, or a new external integration is not automatically part of Office Toolkit. It requires a separate architecture decision before implementation.
