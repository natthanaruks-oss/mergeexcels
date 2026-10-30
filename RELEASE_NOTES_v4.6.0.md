# Office Toolkit v4.6.0 — Phase 2A Excel Cleaner

## Added
- Tool 17: Excel Cleaner under Excel category.
- Analyze-first workbook metrics for blank rows/columns, duplicates, formulas, external formulas, merges, hidden rows/columns and filters.
- Low-risk defaults: trim spaces, remove fully blank rows and fully blank columns.
- Optional duplicate removal, unmerge, fill-down, formula-to-values, number/date normalization, hidden-data removal, external-link formula removal, filter removal and values-focused formatting cleanup.
- Output is always a new XLSX; source file is never modified.

## Safety / known limitations
- Structural row/column cleanup can affect advanced workbook objects such as charts, Excel Tables, conditional formatting, macros and complex layout.
- Date conversion is intentionally conservative and only recognizes explicit DD/MM/YYYY or DD-MM-YYYY forms.
- Number conversion only recognizes comma-grouped numeric strings such as 1,234.50.
- Production browser UAT remains required before production sign-off.
