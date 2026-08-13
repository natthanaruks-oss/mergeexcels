(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PdfOps = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

  function basename(filename) {
    return String(filename || "document").replace(/\.[^.]+$/, "");
  }

  function sanitizeFilename(value, fallback = "document") {
    const cleaned = String(value || "")
      .replace(INVALID_FILE_CHARS, "_")
      .replace(/[. ]+$/g, "")
      .trim();
    return cleaned || fallback;
  }

  function requirePdfLib(PDFLib) {
    if (!PDFLib || !PDFLib.PDFDocument) {
      throw new Error("PDF-LIB library is required.");
    }
  }

  function validateInputs(inputs, minimum = 1) {
    if (!Array.isArray(inputs) || inputs.length < minimum) {
      throw new Error(minimum > 1 ? "Select at least two PDF files." : "Select a PDF file.");
    }
    for (const input of inputs) {
      if (!input || !input.pdfDoc) throw new Error("A selected PDF could not be read.");
    }
  }

  async function mergePdfDocuments(PDFLib, inputs, onProgress) {
    requirePdfLib(PDFLib);
    validateInputs(inputs, 1);

    const output = await PDFLib.PDFDocument.create();
    const totalPages = inputs.reduce((sum, input) => sum + input.pdfDoc.getPageCount(), 0);
    let completed = 0;

    for (const input of inputs) {
      const indices = input.pdfDoc.getPageIndices();
      const pages = await output.copyPages(input.pdfDoc, indices);
      for (const page of pages) {
        output.addPage(page);
        completed += 1;
        if (typeof onProgress === "function") onProgress(completed, totalPages, input.name);
      }
    }

    if (output.getPageCount() === 0) throw new Error("No PDF pages were found.");
    return output.save({ useObjectStreams: true });
  }

  async function splitPdfDocument(PDFLib, input, onProgress) {
    requirePdfLib(PDFLib);
    validateInputs([input], 1);

    const source = input.pdfDoc;
    const totalPages = source.getPageCount();
    if (!totalPages) throw new Error("No PDF pages were found.");

    const base = sanitizeFilename(basename(input.name), "document");
    const digits = Math.max(2, String(totalPages).length);
    const outputs = [];

    for (let index = 0; index < totalPages; index += 1) {
      const output = await PDFLib.PDFDocument.create();
      const [page] = await output.copyPages(source, [index]);
      output.addPage(page);
      const bytes = await output.save({ useObjectStreams: true });
      outputs.push({
        fileName: `${base}_page_${String(index + 1).padStart(digits, "0")}.pdf`,
        bytes,
        pageNumber: index + 1,
      });
      if (typeof onProgress === "function") onProgress(index + 1, totalPages);
    }

    return outputs;
  }

  async function mergePdfPages(PDFLib, pageList, onProgress) {
    requirePdfLib(PDFLib);
    if (!Array.isArray(pageList) || pageList.length < 1) {
      throw new Error("Select at least one page.");
    }
    const output = await PDFLib.PDFDocument.create();
    const total = pageList.length;
    let done = 0;
    for (const ref of pageList) {
      if (!ref || !ref.srcDoc) throw new Error("A selected page could not be read.");
      const [page] = await output.copyPages(ref.srcDoc, [ref.pageIndex]);
      output.addPage(page);
      done += 1;
      if (typeof onProgress === "function") onProgress(done, total);
    }
    if (output.getPageCount() === 0) throw new Error("No PDF pages were selected.");
    return output.save({ useObjectStreams: true });
  }


  function normalizeRotation(value) {
    const numeric = Number(value) || 0;
    return ((numeric % 360) + 360) % 360;
  }

  async function buildPdfFromPagePlan(PDFLib, pagePlan, onProgress) {
    requirePdfLib(PDFLib);
    if (!Array.isArray(pagePlan) || pagePlan.length < 1) {
      throw new Error("No PDF pages were selected.");
    }

    const output = await PDFLib.PDFDocument.create();
    const total = pagePlan.length;
    for (let index = 0; index < pagePlan.length; index += 1) {
      const item = pagePlan[index];
      if (item && item.blank) {
        const width = Math.max(72, Number(item.width) || 595.28);
        const height = Math.max(72, Number(item.height) || 841.89);
        const page = output.addPage([width, height]);
        if (item.rotation) page.setRotation(PDFLib.degrees(normalizeRotation(item.rotation)));
      } else {
        if (!item || !item.srcDoc || !Number.isInteger(item.pageIndex)) {
          throw new Error("A selected PDF page could not be read.");
        }
        const [page] = await output.copyPages(item.srcDoc, [item.pageIndex]);
        if (item.rotation) {
          const original = page.getRotation && page.getRotation().angle ? page.getRotation().angle : 0;
          page.setRotation(PDFLib.degrees(normalizeRotation(original + item.rotation)));
        }
        output.addPage(page);
      }
      if (typeof onProgress === "function") onProgress(index + 1, total);
    }
    return output.save({ useObjectStreams: true, addDefaultPage: false });
  }

  function splitPagePlanOddEven(pagePlan) {
    if (!Array.isArray(pagePlan)) throw new Error("Page plan is required.");
    return {
      odd: pagePlan.filter((_, index) => index % 2 === 0),
      even: pagePlan.filter((_, index) => index % 2 === 1),
    };
  }

  function splitPagePlanByCount(pagePlan, chunkSize) {
    if (!Array.isArray(pagePlan)) throw new Error("Page plan is required.");
    const size = Number(chunkSize);
    if (!Number.isInteger(size) || size < 1) throw new Error("Pages per file must be at least 1.");
    const chunks = [];
    for (let index = 0; index < pagePlan.length; index += size) {
      chunks.push(pagePlan.slice(index, index + size));
    }
    return chunks;
  }


  function parsePageRange(rangeText, pageCount) {
    const count = Number(pageCount);
    if (!Number.isInteger(count) || count < 1) return [];
    const text = String(rangeText || "").trim();
    if (!text) return [];
    const selected = new Set();
    for (const partRaw of text.split(",")) {
      const part = partRaw.trim();
      if (!part) continue;
      const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (match) {
        let start = Number(match[1]);
        let end = Number(match[2]);
        if (start > end) [start, end] = [end, start];
        if (start < 1 || end > count) throw new Error(`Page range must stay within 1-${count}.`);
        for (let page = start; page <= end; page += 1) selected.add(page - 1);
        continue;
      }
      if (!/^\d+$/.test(part)) throw new Error(`Invalid page range: ${part}`);
      const page = Number(part);
      if (page < 1 || page > count) throw new Error(`Page range must stay within 1-${count}.`);
      selected.add(page - 1);
    }
    return [...selected].sort((a, b) => a - b);
  }

  function resolveWatermarkPosition(pageWidth, pageHeight, textWidth, fontSize, position, margin = 28) {
    const width = Number(pageWidth) || 595.28;
    const height = Number(pageHeight) || 841.89;
    const tw = Math.max(0, Number(textWidth) || 0);
    const fs = Math.max(1, Number(fontSize) || 12);
    const left = margin;
    const centerX = Math.max(margin, (width - tw) / 2);
    const right = Math.max(margin, width - tw - margin);
    const bottom = margin;
    const middleY = Math.max(margin, (height - fs) / 2);
    const top = Math.max(margin, height - fs - margin);
    const map = {
      topLeft: [left, top], topCenter: [centerX, top], topRight: [right, top],
      middleLeft: [left, middleY], center: [centerX, middleY], middleRight: [right, middleY],
      bottomLeft: [left, bottom], bottomCenter: [centerX, bottom], bottomRight: [right, bottom],
    };
    const [x, y] = map[position] || map.center;
    return { x, y };
  }

  async function applyPdfWatermark(PDFLib, inputBytes, options = {}) {
    requirePdfLib(PDFLib);
    if (!inputBytes || !inputBytes.length) throw new Error("Select a PDF file.");
    let doc;
    try {
      doc = await PDFLib.PDFDocument.load(inputBytes, { updateMetadata: false, ignoreEncryption: true });
    } catch (error) {
      throw new Error("ไม่สามารถอ่าน PDF ได้ หรือไฟล์มีรหัสผ่าน/เข้ารหัส");
    }
    const pageCount = doc.getPageCount();
    if (!pageCount) throw new Error("No PDF pages were found.");
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const text = String(options.text || "").trim();
    const addPageNumber = !!options.addPageNumber;
    const addFilename = !!options.addFilename;
    if (!text && !addPageNumber && !addFilename) throw new Error("Choose at least one stamp option.");
    // Validate against the standard WinAnsi font before mutating pages.
    try {
      if (text) font.widthOfTextAtSize(text, 12);
      if (addFilename && options.filename) font.widthOfTextAtSize(String(options.filename), 9);
    } catch (error) {
      throw new Error("ข้อความมีอักขระที่ PDF standard font ไม่รองรับ กรุณาใช้ Latin/English ในรุ่นนี้");
    }
    const fontSize = Math.max(8, Math.min(160, Number(options.fontSize) || 48));
    const opacity = Math.max(0.05, Math.min(1, Number(options.opacity) || 0.2));
    const rotation = Math.max(-180, Math.min(180, Number(options.rotation) || 0));
    const position = options.position || "center";
    let indices;
    if (Array.isArray(options.pageIndices)) {
      indices = [...new Set(options.pageIndices.filter((n) => Number.isInteger(n) && n >= 0 && n < pageCount))];
    } else {
      indices = Array.from({ length: pageCount }, (_, index) => index);
    }
    if (!indices.length) throw new Error("No pages were selected for stamping.");
    const selected = new Set(indices);
    const pages = doc.getPages();
    for (let index = 0; index < pages.length; index += 1) {
      if (!selected.has(index)) continue;
      const page = pages[index];
      const { width, height } = page.getSize();
      if (text) {
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const pos = resolveWatermarkPosition(width, height, textWidth, fontSize, position);
        page.drawText(text, {
          x: pos.x, y: pos.y, size: fontSize, font,
          opacity, rotate: PDFLib.degrees(rotation),
          color: PDFLib.rgb(0.45, 0.45, 0.45),
        });
      }
      if (addPageNumber) {
        const label = `Page ${index + 1} of ${pageCount}`;
        const size = 9;
        const labelWidth = font.widthOfTextAtSize(label, size);
        page.drawText(label, {
          x: Math.max(18, (width - labelWidth) / 2), y: 14,
          size, font, opacity: Math.max(0.5, opacity), color: PDFLib.rgb(0.3, 0.3, 0.3),
        });
      }
      if (addFilename && options.filename) {
        const filename = String(options.filename);
        const size = 8;
        page.drawText(filename, {
          x: 18, y: 14, size, font, opacity: Math.max(0.5, opacity), color: PDFLib.rgb(0.3, 0.3, 0.3),
          maxWidth: Math.max(72, width * 0.42),
        });
      }
      if (typeof options.onProgress === "function") options.onProgress(index + 1, pages.length);
    }
    return doc.save({ useObjectStreams: true, addDefaultPage: false });
  }

  function calculateImagePageLayout(imageWidth, imageHeight, options = {}) {
    const iw = Math.max(1, Number(imageWidth) || 1);
    const ih = Math.max(1, Number(imageHeight) || 1);
    const pageSize = options.pageSize || "a4";
    const orientation = options.orientation || "auto";
    const marginMm = Math.max(0, Number(options.marginMm) || 0);
    const margin = marginMm * 72 / 25.4;

    if (pageSize === "original") {
      const scale = 72 / 96;
      const pageWidth = Math.max(36, iw * scale);
      const pageHeight = Math.max(36, ih * scale);
      return { pageWidth, pageHeight, x: 0, y: 0, drawWidth: pageWidth, drawHeight: pageHeight };
    }

    const A4_PORTRAIT = [595.28, 841.89];
    const landscape = orientation === "landscape" || (orientation === "auto" && iw > ih);
    const pageWidth = landscape ? A4_PORTRAIT[1] : A4_PORTRAIT[0];
    const pageHeight = landscape ? A4_PORTRAIT[0] : A4_PORTRAIT[1];
    const availableWidth = Math.max(1, pageWidth - margin * 2);
    const availableHeight = Math.max(1, pageHeight - margin * 2);
    const scale = Math.min(availableWidth / iw, availableHeight / ih);
    const drawWidth = iw * scale;
    const drawHeight = ih * scale;
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;
    return { pageWidth, pageHeight, x, y, drawWidth, drawHeight };
  }

  function classifyScanPageMetrics(inkRatio, fingerprintDiff = 1, options = {}) {
    const blankInkThreshold = Number.isFinite(options.blankInkThreshold) ? options.blankInkThreshold : 0.008;
    const duplicateDiffThreshold = Number.isFinite(options.duplicateDiffThreshold) ? options.duplicateDiffThreshold : 0.012;
    const blank = Number(inkRatio) < blankInkThreshold;
    const duplicatePrev = !blank && Number(fingerprintDiff) < duplicateDiffThreshold;
    return { blank, duplicatePrev };
  }

  function fingerprintDifference(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 1;
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) sum += Math.abs(Number(a[i]) - Number(b[i]));
    return Math.min(1, sum / (a.length * 15));
  }

  async function optimizePdfStructure(PDFLib, inputBytes) {
    requirePdfLib(PDFLib);
    if (!inputBytes || !inputBytes.length) throw new Error("Select a PDF file.");
    let doc;
    try {
      doc = await PDFLib.PDFDocument.load(inputBytes, { updateMetadata: false, ignoreEncryption: true });
    } catch (error) {
      throw new Error("ไม่สามารถอ่าน PDF ได้ หรือไฟล์มีรหัสผ่าน/เข้ารหัส");
    }
    if (doc.getPageCount() === 0) throw new Error("No PDF pages were found.");
    return doc.save({ useObjectStreams: true, addDefaultPage: false });
  }

  return {
    basename,
    sanitizeFilename,
    mergePdfDocuments,
    mergePdfPages,
    buildPdfFromPagePlan,
    splitPagePlanOddEven,
    splitPagePlanByCount,
    parsePageRange,
    resolveWatermarkPosition,
    applyPdfWatermark,
    calculateImagePageLayout,
    normalizeRotation,
    classifyScanPageMetrics,
    fingerprintDifference,
    optimizePdfStructure,
    splitPdfDocument,
  };
});
