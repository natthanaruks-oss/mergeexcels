# Office Toolkit v4.6.2 — Tool catalog grouped by category

## Changed
- The "ทั้งหมด" view now shows tools in category groups with a heading each: Excel, PDF, Conversion, File Utilities, Business / BI. Previously tools were listed in the order they were built, so categories were interleaved.
- New category **File Utilities**; Batch Rename moved there from Conversion (it renames files, it does not convert them).
- Excel Cleaner now sits in the Excel group, PDF Scan Cleanup in the PDF group, PDF to PNG in Conversion.
- Group headings hide when a single category tab is selected.
- The "Tools ready" counter showed 17 while 18 tools exist; it is now derived from the cards.

## Not changed
- Menu numbers (01–18) stay as stable IDs because the UI text and README refer to them (e.g. "เมนู 06"). Within a group they are therefore not sequential.
- No tool behaviour changed.

## Verification
- `product-shell` test now fails if a category is split into several groups, a group lacks its heading, a tool lacks a card, or the static counter differs from the tool count.
- Checked in a real browser: all view, PDF tab, File Utilities tab, return to all; desktop and 390px width with no horizontal overflow.
