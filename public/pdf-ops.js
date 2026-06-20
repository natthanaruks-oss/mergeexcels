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

  return {
    basename,
    sanitizeFilename,
    mergePdfDocuments,
    splitPdfDocument,
  };
});
