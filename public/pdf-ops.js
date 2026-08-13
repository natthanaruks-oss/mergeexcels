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
    normalizeRotation,
    optimizePdfStructure,
    splitPdfDocument,
  };
});
