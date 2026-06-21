const assert = require("node:assert/strict");
const PDFLib = require("pdf-lib");
const PdfOps = require("../public/pdf-ops.js");

async function createPdf(pageCount, widthOffset = 0) {
  const doc = await PDFLib.PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    doc.addPage([500 + widthOffset + index, 700]);
  }
  return doc.save();
}

(async () => {
  const bytesA = await createPdf(2, 0);
  const bytesB = await createPdf(3, 10);
  const docA = await PDFLib.PDFDocument.load(bytesA);
  const docB = await PDFLib.PDFDocument.load(bytesB);

  const mergedBytes = await PdfOps.mergePdfDocuments(PDFLib, [
    { name: "A.pdf", pdfDoc: docA },
    { name: "B.pdf", pdfDoc: docB },
  ]);
  const merged = await PDFLib.PDFDocument.load(mergedBytes);
  assert.equal(merged.getPageCount(), 5);

  const split = await PdfOps.splitPdfDocument(PDFLib, { name: "Report.pdf", pdfDoc: docB });
  assert.equal(split.length, 3);
  assert.equal(split[0].fileName, "Report_page_01.pdf");
  for (const item of split) {
    const single = await PDFLib.PDFDocument.load(item.bytes);
    assert.equal(single.getPageCount(), 1);
  }

  assert.equal(PdfOps.sanitizeFilename('A<B>:C/"D"'), "A_B__C__D_");
  console.log("All PDF operation tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
