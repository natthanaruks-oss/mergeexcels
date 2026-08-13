const assert = require("node:assert/strict");
let PDFLib;
try { PDFLib = require("pdf-lib"); } catch { PDFLib = require("../public/vendor/pdf-lib.min.js"); }
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

  assert.deepEqual(PdfOps.parsePageRange("1,3-4", 5), [0, 2, 3]);
  assert.deepEqual(PdfOps.parsePageRange("4-2", 5), [1, 2, 3]);
  assert.throws(() => PdfOps.parsePageRange("0", 5), /within/);
  const wmPos = PdfOps.resolveWatermarkPosition(500, 700, 100, 20, "bottomRight");
  assert(wmPos.x > 300 && wmPos.y < 50);

  const watermarkBytes = await PdfOps.applyPdfWatermark(PDFLib, bytesA, {
    text: "DRAFT",
    position: "center",
    fontSize: 42,
    opacity: 0.2,
    rotation: -45,
    pageIndices: [0],
    addPageNumber: true,
    addFilename: true,
    filename: "Source.pdf",
  });
  const watermarkDoc = await PDFLib.PDFDocument.load(watermarkBytes);
  assert.equal(watermarkDoc.getPageCount(), 2);
  assert(watermarkBytes.length > bytesA.length, "Stamped PDF should contain additional drawing content");

  await assert.rejects(
    () => PdfOps.applyPdfWatermark(PDFLib, bytesA, { text: "ทดสอบ", pageIndices: [0] }),
    /Latin\/English/
  );

  const portraitLayout = PdfOps.calculateImagePageLayout(1200, 1800, { pageSize: "a4", orientation: "auto", marginMm: 10 });
  assert(portraitLayout.pageHeight > portraitLayout.pageWidth);
  assert(portraitLayout.drawWidth <= portraitLayout.pageWidth);
  assert(portraitLayout.drawHeight <= portraitLayout.pageHeight);

  const landscapeLayout = PdfOps.calculateImagePageLayout(1800, 1200, { pageSize: "a4", orientation: "auto", marginMm: 10 });
  assert(landscapeLayout.pageWidth > landscapeLayout.pageHeight);

  const originalLayout = PdfOps.calculateImagePageLayout(960, 480, { pageSize: "original" });
  assert.equal(Math.round(originalLayout.pageWidth), 720);
  assert.equal(Math.round(originalLayout.pageHeight), 360);

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
  
// Phase 1D — scan cleanup detection helpers
{
  const blank = PdfOps.classifyScanPageMetrics(0.002, 1);
  assert.equal(blank.blank, true);
  assert.equal(blank.duplicatePrev, false);

  const duplicate = PdfOps.classifyScanPageMetrics(0.08, 0.005);
  assert.equal(duplicate.blank, false);
  assert.equal(duplicate.duplicatePrev, true);

  const different = PdfOps.fingerprintDifference([0, 0, 0, 0], [15, 15, 15, 15]);
  assert.equal(different, 1);

  const same = PdfOps.fingerprintDifference([4, 5, 6], [4, 5, 6]);
  assert.equal(same, 0);
}
console.log("All PDF operation tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
