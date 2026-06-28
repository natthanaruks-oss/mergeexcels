# MergeExcels v3.5.3 — Activity Headings in DOH/DOR Main Sheet

## Fixed

- Exported `Activity / Section` headings directly into the main `DOH` or `DOR` worksheet.
- Preserved the original project order and inserted a highlighted activity row before each activity group.
- Kept `Historical Rules`, `Validation`, and `Audit Log` as governance sheets; activity headings are no longer available only outside the main detail sheet.
- Activity headings are written in the project-description column and formatted with a yellow group header.

## Validation

- Added regression coverage confirming the main output contains the activity heading.
- Full test suite and release safety checks pass.
