# Office Toolkit v4.4.0 — Phase 1D PDF Scan Cleanup

## Added
- Menu 15: PDF Scan Cleanup.
- High quality (150 DPI / JPEG 86%), Balanced (120 DPI / JPEG 78%) and Small file (96 DPI / JPEG 65%) profiles.
- Grayscale and adjustable contrast.
- Analyze scan pages before optional removal.
- Blank-page candidate detection using low-ink analysis.
- Consecutive duplicate-page candidate detection using a downsampled visual fingerprint.
- Optional removal is off by default and requires prior analysis.
- Page limit safety and local-only processing.

## Safety / limitations
- Cleanup rasterizes the PDF; searchable text/vector content and digital-signature validity can be lost.
- Blank/duplicate detection is heuristic and must be reviewed; only consecutive duplicate pages are considered.
- Automatic crop/margin removal and heavy OCR/deskew are deferred until representative browser UAT supports reliable behavior.
- Source PDF is never modified; output is a new PDF.

## Verification performed in release-build environment
- JavaScript syntax checks for app.js and pdf-ops.js.
- Product-shell regression test.
- PDF operation tests including scan-classification/fingerprint helpers.
- Release structure / CSP / cache-busting safety check.
- Full npm dependency install/regression suite requires Codespaces because npm install was unavailable in the release-build environment.
