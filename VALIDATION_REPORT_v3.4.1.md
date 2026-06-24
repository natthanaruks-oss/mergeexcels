# Validation Report — MergeExcels v3.4.1

## Scope
Validation of Menu 09 — DOH/DOR Budget Builder after changing the default Maintenance annual budget percentage from 40% to 80%.

## Real-data sample
- Source workbook: `pdf_to_excel (21).xlsx`
- Source sheet: `PDF Data`
- Agency: DOH
- Construction annual percentage: 60%
- Maintenance annual percentage: 80%
- Project rows only: enabled
- Road/material budget only: enabled

## Results
- Projects: 1,607
- Construction: 341
- Maintenance: 1,266
- Ready: 1,598
- Needs review: 9
- Total budget: THB 46,365,259,000
- Annual budget: THB 32,749,852,260
- Construction annual budget: THB 13,027,064,820
- Maintenance annual budget: THB 19,722,787,440

## Integrity checks
- Output sheets: DOH, Summary, Validation, Factor Master, Region Mapping, Raw Source
- DOH detail rows: 1,607
- Formula error scan: no `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, or `#N/A`
- Regression: Maintenance THB 10,000,000 × 80% = THB 8,000,000
- Full unit test suite: passed
- Cloudflare Wrangler dry-run: passed

## Known limitations retained for the next phase
- Work Type classification still uses broad defaults for most records.
- Some source descriptions still contain detached Thai marks from PDF extraction.
- Nine records require validation, mostly non-material or insufficient-location rows.
