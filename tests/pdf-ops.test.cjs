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

  const plannedBytes = await PdfOps.buildPdfFromPagePlan(PDFLib, [
    { srcDoc: docA, pageIndex: 0, rotation: 90 },
    { srcDoc: docA, pageIndex: 1, rotation: -90 },
    { blank: true, width: 420, height: 595 },
  ]);
  const planned = await PDFLib.PDFDocument.load(plannedBytes);
  assert.equal(planned.getPageCount(), 3);
  assert.equal(planned.getPage(0).getRotation().angle, 90);
  assert.equal(planned.getPage(1).getRotation().angle, 270);
  assert.equal(Math.round(planned.getPage(2).getWidth()), 420);
  assert.equal(Math.round(planned.getPage(2).getHeight()), 595);

  const oddEven = PdfOps.splitPagePlanOddEven([1, 2, 3, 4, 5]);
  assert.deepEqual(oddEven.odd, [1, 3, 5]);
  assert.deepEqual(oddEven.even, [2, 4]);
  assert.deepEqual(PdfOps.splitPagePlanByCount([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.equal(PdfOps.normalizeRotation(-90), 270);
  assert.equal(PdfOps.normalizeRotation(450), 90);

  const optimizedBytes = await PdfOps.optimizePdfStructure(PDFLib, bytesA);
  const optimized = await PDFLib.PDFDocument.load(optimizedBytes);
  assert.equal(optimized.getPageCount(), 2);

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
