# MergeExcels v3.3.3 — Large Excel Upload & Memory Safety Patch

## Fixed
- Keep the selected Excel file visible when analysis fails; the UI no longer resets to 0 files.
- Added Dense → Sparse workbook parsing fallback for `Invalid array length` and memory-allocation errors.
- Added clear Thai error messages for Browser memory limits.
- Added preflight policy: files above 512 MB are blocked before `File.arrayBuffer()` to prevent browser crashes.
- Updated Optimize Excel guidance: 80–250 MB is high-memory; over 512 MB requires Oracle-side split/CSV or a local desktop engine.

## Scope
- Menus 01–07 and the Thai `ตอน ` spacing patch are unchanged.
- Menu 08 remains fully client-side.
