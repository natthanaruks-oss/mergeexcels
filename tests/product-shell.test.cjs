const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('public/index.html', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');

assert(html.includes('<h1>Office Toolkit</h1>'), 'Product title must be Office Toolkit');
assert(html.includes('v4.1.0'), 'Version badge must be v4.1.0');
for (const category of ['all', 'excel', 'pdf', 'conversion', 'business']) {
  assert(html.includes(`data-category="${category}"`), `Missing category ${category}`);
}
const modes = [
  'mergeExcel', 'combineExcel', 'splitExcel', 'mergePdf', 'splitPdf',
  'pdf2excel', 'ocr2excel', 'optimizeExcel', 'budgetBuilder',
  'oracleArCleaner', 'compressPdf', 'pdfPageTools'
];
for (const mode of modes) {
  assert(html.includes(`data-mode="${mode}"`), `Existing mode missing after product-shell migration: ${mode}`);
}
assert(app.includes('function updateCategory(category)'), 'Category filter controller missing');
assert(app.includes('category-hidden'), 'Category filter visibility behavior missing');
console.log('Office Toolkit product-shell tests passed.');

assert(html.includes('PDF Page Tools'), 'Phase 1A card missing');
assert(html.includes('id="pdfPageToolsOptions"'), 'PDF Page Tools options missing');
assert(app.includes('processPdfPageTools'), 'PDF Page Tools processor missing');
