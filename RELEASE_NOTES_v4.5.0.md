# Office Toolkit v4.5.0 — Phase 1E Batch Rename

## Added
- Menu 16 — Batch Rename
- Select and reorder multiple files of any type
- Prefix / suffix
- Literal Find / Replace
- Optional YYYYMMDD date token
- Optional running number with configurable start and digits
- Separator selection: underscore, hyphen, space, none
- Filename cleanup for Windows-invalid characters and reserved device names
- Preserve extension option
- Live rename preview
- Case-insensitive filename collision detection
- ZIP output containing renamed copies, `rename_log.csv`, and README

## Safety
- Original files are never renamed or modified.
- Output is always a new ZIP generated locally in the browser.
- Export is blocked when duplicate target filenames are detected.

## Phase status
Phase 1 — Core PDF & File Tools is complete at build level after 1A–1E. Full regression and Cloudflare deployment verification remain required in Codespaces before production sign-off.
