# Office Toolkit — Product Specification

## Product purpose
Office Toolkit is a local-first web application for common office file workflows. The user selects local files, processing happens in the browser, and outputs are downloaded back to the device. The application must not require server-side file upload for core tools.

## Product boundaries
- One web application and one primary URL for normal office file tasks.
- Functions are grouped by user intent: Excel, PDF, Conversion, Business, Security.
- Processing engines remain modular so one tool can evolve without tightly coupling unrelated workflows.
- Very-large-file/Desktop Companion work is outside this roadmap because that track is already complete. Do not reintroduce it without an explicit new request.

## Existing production-capable modules carried forward into v4 foundation
1. Merge Excel Files
2. Combine Excel Sheets
3. Split Excel File
4. Merge PDF
5. Split PDF
6. PDF to Excel
7. OCR PDF to Excel (experimental)
8. Reduce / Optimize Excel
9. DOH/DOR Budget Builder
10. Oracle AR Statement Cleaner
11. Reduce PDF Size
12. PDF Page Tools (Phase 1A, v4.1.0; implemented pending deployed UAT)

## Core non-functional requirements
- Local-first: source files are processed on the user's device for core web modules.
- No secrets embedded in source code or Git.
- Cloudflare deployment uses API-token-only workflow; no wrangler login/OAuth requirement.
- Node.js 22+.
- Preserve strict CSP and PDF.js `isEvalSupported: false`.
- Each release must run regression tests and release structure checks before being labelled ready.
- Destructive transformations must keep the original file untouched and make the impact clear before processing.
- Business modules must retain validation/audit evidence where applicable.

## Architecture direction
- `public/app.js` remains the current orchestration layer during migration.
- New functions should be implemented as separate engines under `public/modules/` or purpose-specific files/workers.
- Shared file validation/download helpers should gradually move to `public/shared/` only when a new module needs them; avoid a large risky refactor.
- Browser modules stay local-first and modular. Completed Desktop/Large-file work is out of scope for this roadmap.

## Definition of Done for each module
1. Business/use case and file inputs are defined.
2. Input validation and explicit limitations are implemented.
3. Core logic has automated tests where practical.
4. Existing module regression tests pass.
5. Representative real/sample files are verified when available.
6. Output is inspected for data integrity or document/page integrity.
7. Release notes and known limitations are recorded.
8. Cloudflare dry-run/deploy verification is performed when the environment supports it; otherwise state that it was not executed.
