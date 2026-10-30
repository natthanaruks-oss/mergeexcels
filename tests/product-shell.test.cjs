const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('public/index.html', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');

assert(html.includes('<h1>Office Toolkit</h1>'), 'Product title must be Office Toolkit');
assert(html.includes('v4.6.2'), 'Version badge must be v4.6.2');
for (const category of ['all', 'excel', 'pdf', 'conversion', 'files', 'business']) {
  assert(html.includes(`data-category="${category}"`), `Missing category ${category}`);
}
const modes = [
  'mergeExcel', 'combineExcel', 'splitExcel', 'mergePdf', 'splitPdf',
  'pdf2excel', 'ocr2excel', 'optimizeExcel', 'budgetBuilder',
  'oracleArCleaner', 'compressPdf', 'pdfPageTools', 'pdfWatermark', 'imageToPdf', 'pdfScanCleanup', 'batchRename', 'excelCleaner', 'pdfToPng'
];
for (const mode of modes) {
  assert(html.includes(`data-mode="${mode}"`), `Existing mode missing after product-shell migration: ${mode}`);
}
assert(app.includes('function updateCategory(category)'), 'Category filter controller missing');
assert(app.includes('category-hidden'), 'Category filter visibility behavior missing');
assert(html.includes('id="pdfToPngOptions"'), 'PDF to PNG options missing');
assert(html.includes('pdf-to-png-ops.js'), 'PDF to PNG engine script missing');
assert(app.includes('processPdfToPng') && app.includes('PdfToPngOps.planPages'), 'PDF to PNG must run through the tested PdfToPngOps planner');

// Tool grid must be grouped: each category is one contiguous run, introduced by its own heading.
const gridStart = html.indexOf('class="mode-grid"');
const gridHtml = html.slice(gridStart, html.indexOf('</section>', gridStart));
const seq = [...gridHtml.matchAll(/<(h3 class="category-heading"|button class="mode-card)[^>]*data-category="([^"]+)"/g)]
  .map((m) => ({ kind: m[1].startsWith('h3') ? 'heading' : 'card', category: m[2] }));
assert(seq.filter((x) => x.kind === 'card').length === modes.length, 'Every tool must have exactly one card');
const seenCategories = new Set();
let current = null;
for (const item of seq) {
  if (item.category !== current) {
    assert(item.kind === 'heading', 'Category ' + item.category + ' must start with its heading');
    assert(!seenCategories.has(item.category), 'Category ' + item.category + ' is split into more than one group');
    seenCategories.add(item.category);
    current = item.category;
  } else {
    assert(item.kind === 'card', 'Duplicate heading for ' + item.category);
  }
}
assert(app.includes('categoryHeadings'), 'Group headings must follow the category filter');
assert(html.includes('<div class="catalog-count"><strong>' + modes.length + '</strong>'), 'Static catalog count must equal the number of tools (' + modes.length + ')');
assert(app.includes('.catalog-count strong'), 'Catalog counter must be derived from the cards');
console.log('Office Toolkit product-shell tests passed.');

assert(html.includes('PDF Page Tools'), 'Phase 1A card missing');
assert(html.includes('id="pdfPageToolsOptions"'), 'PDF Page Tools options missing');
assert(app.includes('processPdfPageTools'), 'PDF Page Tools processor missing');
assert(html.includes('PDF Watermark & Stamp'), 'Phase 1B card missing');
assert(html.includes('id="pdfWatermarkOptions"'), 'PDF Watermark options missing');
assert(app.includes('processPdfWatermark'), 'PDF Watermark processor missing');

assert(html.includes('Image to PDF'), 'Phase 1C card missing');
assert(html.includes('id="imageToPdfOptions"'), 'Image to PDF options missing');
assert(app.includes('processImageToPdf'), 'Image to PDF processor missing');

assert(html.includes('PDF Scan Cleanup'), 'Phase 1D card missing');
assert(html.includes('id="pdfScanCleanupOptions"'), 'PDF Scan Cleanup options missing');
assert(app.includes('processPdfScanCleanup'), 'PDF Scan Cleanup processor missing');
assert(app.includes('analyzePdfScan'), 'PDF Scan Cleanup analysis missing');

assert(html.includes('Batch Rename'), 'Phase 1E card missing');
assert(html.includes('id="batchRenameOptions"'), 'Batch Rename options missing');
assert(app.includes('processBatchRename'), 'Batch Rename processor missing');

assert(html.includes('Excel Cleaner'), 'Phase 2A card missing');
assert(html.includes('id="excelCleanerOptions"'), 'Excel Cleaner options missing');
assert(app.includes('processExcelCleaner'), 'Excel Cleaner processor missing');
assert(app.includes('ExcelCleanerOps.cleanWorksheet'), 'Excel Cleaner must run through the tested ExcelCleanerOps engine');
assert(!app.includes('cleanWorksheetPreservingCells'), 'Untested duplicate cleaner implementation must not return to app.js');
