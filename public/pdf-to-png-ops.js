(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PdfToPngOps = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DPI_CHOICES = [72, 96, 150, 200, 300];
  const DEFAULT_DPI = 150;
  const MIN_DPI = 36;
  const MAX_DPI = 600;
  // One canvas above ~36M pixels is unreliable in browsers; larger pages are scaled down and reported.
  const MAX_PIXELS_PER_PAGE = 36000000;
  // Guard for the whole export (all pages are held in memory before the ZIP is built).
  const MAX_TOTAL_PIXELS = 600000000;

  function normalizeDpi(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return DEFAULT_DPI;
    return Math.min(MAX_DPI, Math.max(MIN_DPI, n));
  }

  function sanitizeBase(name) {
    const stem = String(name || "").replace(/\.pdf$/i, "");
    const cleaned = stem.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
    return cleaned || "document";
  }

  function pageFileName(base, pageIndex, totalPages) {
    const width = Math.max(3, String(Math.max(1, Number(totalPages) || 1)).length);
    return `${sanitizeBase(base)}_p${String(pageIndex + 1).padStart(width, "0")}.png`;
  }

  /** One page -> a bare .png; several pages -> a ZIP. */
  function outputKind(selectedCount) {
    return selectedCount === 1 ? "png" : "zip";
  }

  /**
   * pageSizes: [{ index, width, height }] in PDF points at scale 1 (rotation already applied).
   * Returns { pages: [{ index, scale, widthPx, heightPx, downscaled }], totalPixels, downscaledCount }.
   * Throws when the selection exceeds maxPages or the total-pixel safety limit.
   */
  function planPages(pageSizes, options = {}) {
    const dpi = normalizeDpi(options.dpi);
    const maxPages = Math.max(1, Math.floor(Number(options.maxPages) || 100));
    const maxPer = Number(options.maxPixelsPerPage) || MAX_PIXELS_PER_PAGE;
    const maxTotal = Number(options.maxTotalPixels) || MAX_TOTAL_PIXELS;
    const sizes = Array.isArray(pageSizes) ? pageSizes : [];
    if (!sizes.length) throw new Error("ไม่พบหน้าที่เลือก กรุณาตรวจช่วงหน้า");
    if (sizes.length > maxPages) {
      throw new Error(`เลือก ${sizes.length} หน้า เกินค่า Page limit safety (${maxPages} หน้า) กรุณาลดช่วงหน้า หรือเพิ่ม limit`);
    }
    const target = dpi / 72;
    let totalPixels = 0;
    let downscaledCount = 0;
    const pages = sizes.map((size) => {
      const w = Number(size.width), h = Number(size.height);
      if (!(w > 0) || !(h > 0)) throw new Error(`ขนาดหน้า ${Number(size.index) + 1} ไม่ถูกต้อง`);
      let scale = target;
      const pixels = w * target * (h * target);
      let downscaled = false;
      if (pixels > maxPer) { scale = target * Math.sqrt(maxPer / pixels); downscaled = true; downscaledCount += 1; }
      const widthPx = Math.max(1, Math.ceil(w * scale)), heightPx = Math.max(1, Math.ceil(h * scale));
      totalPixels += widthPx * heightPx;
      return { index: size.index, scale, widthPx, heightPx, downscaled };
    });
    if (totalPixels > maxTotal) {
      throw new Error(`ภาพรวมทั้งหมดใหญ่เกินไปสำหรับ Browser (${Math.round(totalPixels / 1e6)} ล้านพิกเซล) กรุณาลด DPI หรือเลือกช่วงหน้าน้อยลง`);
    }
    return { pages, totalPixels, downscaledCount, dpi };
  }

  return { DPI_CHOICES, DEFAULT_DPI, MAX_PIXELS_PER_PAGE, MAX_TOTAL_PIXELS, normalizeDpi, sanitizeBase, pageFileName, outputKind, planPages };
});
