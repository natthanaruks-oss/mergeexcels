# Office Toolkit v4.0.0 — Product Foundation

## Scope
Foundation release only. Existing file-processing business logic is preserved; this release reorganizes the product shell for the all-in-one Office Toolkit roadmap.

## Changes
- Visible product name changed from MergeExcels to Office Toolkit.
- Existing 11 tools grouped into Excel, PDF, Conversion and Business categories.
- Added responsive category navigation while keeping the existing workspace/process flow.
- Added `spec.md`, `ROADMAP.md` and `MEMORY.md` for controlled phased delivery.
- Version/cache-busting updated to 4.0.0.

## No intentional business-rule changes
- DOH/DOR historical recommendation rules unchanged.
- Oracle AR parsing/reconciliation logic unchanged.
- Excel optimization logic unchanged.
- PDF compression profiles unchanged.

## UAT requirement
Deploy to the normal Cloudflare environment and verify all categories and at least one smoke file per existing module before treating v4.0.0 as the new production baseline.
