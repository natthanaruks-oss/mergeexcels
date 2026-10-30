# Office Toolkit v4.6.1 — PDF to PNG

Owner-requested module added after the v4.6.0 Excel Cleaner integration (not a numbered roadmap phase).

## Added
- Menu 18 — PDF to PNG (Conversion category)
- Page range (blank = all pages, or e.g. `1,3,5-8`)
- DPI: 72 / 96 / 150 (default) / 200 / 300
- Output: 1 selected page → a single `.png`; several pages → a ZIP of `<name>_p001.png`, `_p002.png`, …
- Optional transparent background (default is a white background)
- Page limit safety (default 100, max 500)

## Safety
- 100% browser-local; the source PDF is never modified or uploaded.
- A page that would exceed ~36 million pixels is scaled down automatically and the status message says how many pages were affected.
- The whole export is capped at ~600 million pixels; the user is told to lower DPI or the page range instead of letting the browser run out of memory.
- Output is raster: no searchable text, vectors or signatures.

## Verification
- New `tests/pdf-to-png-ops.test.cjs` (planner, DPI clamp, filenames, limits).
- Exercised in a real browser against a generated 3-page PDF (A4 portrait, A4 landscape, page with /Rotate 90): valid PNG signatures, correct pixel sizes, correct colours at known positions, rotated page output landscape, Thai filename preserved, bare PNG for one page, ZIP for several, transparent corner alpha = 0, invalid ranges rejected.
- Not yet tested: very large real-world PDFs, encrypted PDFs, deployed Cloudflare URL.
