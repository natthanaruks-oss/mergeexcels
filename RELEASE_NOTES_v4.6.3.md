# Office Toolkit v4.6.3 — PDF tools all under PDF

## Changed
- PDF to Excel, PDF สแกน → Excel (OCR), PDF to PNG and Image to PDF moved from "Conversion" into the **PDF** category. Rule: anything that reads or writes a PDF is a PDF tool.
- The "Conversion" tab and group were removed (it had no tools left). Categories are now: Excel, PDF, File Utilities, Business / BI.
- Within the PDF group, editing tools come first, then the conversions.
- Page description/tagline no longer mention "Conversion".

## Not changed
- Menu numbers stay as stable IDs. No tool behaviour changed.
- "Phase 3 — Conversion & Data Extraction" remains the roadmap name for hardening extraction work; it is a development phase, not a UI category.

## Verification
- `product-shell` test now requires all ten PDF-related tools to be in the PDF category and fails on any category tab that has no tools.
- Checked in a real browser: tabs = ทั้งหมด / Excel / PDF / File Utilities / Business; PDF tab shows 10 tools; counter 18.
