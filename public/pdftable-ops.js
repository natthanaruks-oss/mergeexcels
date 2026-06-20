(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PdfTableOps = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function clusterAnchors(xs, tolerance) {
    const sorted = xs.slice().sort((a, b) => a - b);
    const anchors = [];
    for (const x of sorted) {
      if (!anchors.length || x - anchors[anchors.length - 1] > tolerance) anchors.push(x);
    }
    return anchors;
  }

  function nearestIndex(anchors, value) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < anchors.length; i += 1) {
      const dist = Math.abs(anchors[i] - value);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  }

  // Column index from grid-line boundaries (vertical separators, sorted ascending).
  function columnFromBoundaries(x, bounds) {
    let i = 0;
    while (i < bounds.length && x >= bounds[i] - 0.5) i += 1;
    return Math.max(0, i - 1);
  }

  /**
   * Reconstruct a row/column matrix from positioned PDF text items.
   * items: [{ str, x, y, w, h }]  (x = left edge, y = baseline; higher y = upper on page)
   * options:
   *   columnBoundaries : number[]  vertical grid-line x-positions (if detected) -> most accurate
   *   rowTolerance, cellGap, columnTolerance : heuristic tuning
   */
  function buildMatrixFromItems(items, options = {}) {
    const clean = (Array.isArray(items) ? items : [])
      .map((it) => ({
        str: String(it.str == null ? "" : it.str),
        x: Number(it.x) || 0,
        y: Number(it.y) || 0,
        w: Number(it.w) || 0,
        h: Number(it.h) || 0,
      }))
      .filter((it) => it.str.trim() !== "");

    if (!clean.length) {
      return [[options.emptyNote || "(ไม่พบข้อความในหน้านี้ — อาจเป็น PDF สแกน/รูปภาพ)"]];
    }

    const medianHeight = median(clean.map((it) => it.h).filter((h) => h > 0)) || 10;
    const rowTol = options.rowTolerance != null ? options.rowTolerance : Math.max(2, medianHeight * 0.6);
    const cellGap = options.cellGap != null ? options.cellGap : Math.max(6, medianHeight * 1.2);
    const colTol = options.columnTolerance != null ? options.columnTolerance : Math.max(8, medianHeight);

    // 1) Group into rows by y (top to bottom = descending y)
    const rows = [];
    clean.slice().sort((a, b) => b.y - a.y).forEach((item) => {
      const row = rows.find((r) => Math.abs(r.y - item.y) <= rowTol);
      if (row) row.items.push(item);
      else rows.push({ y: item.y, items: [item] });
    });

    // 2) Within each row, merge close words into cells; split on wide gaps
    const rowCells = rows.map((row) => {
      const sorted = row.items.slice().sort((a, b) => a.x - b.x);
      const cells = [];
      let current = null;
      let prevRight = -Infinity;
      for (const it of sorted) {
        if (!current || it.x - prevRight > cellGap) {
          current = { x: it.x, text: it.str };
          cells.push(current);
        } else {
          current.text += ` ${it.str}`;
        }
        prevRight = it.x + (it.w || 0);
      }
      return cells.map((c) => ({ x: c.x, text: c.text.trim() }));
    });

    // 3) Decide column model
    let assign; // (cellX) -> column index
    let columnCount;

    const bounds = Array.isArray(options.columnBoundaries)
      ? options.columnBoundaries.slice().sort((a, b) => a - b)
      : null;

    if (bounds && bounds.length >= 2) {
      // Grid-line mode: separators define columns (most accurate)
      columnCount = bounds.length - 1;
      assign = (x) => Math.min(columnCount - 1, columnFromBoundaries(x, bounds));
    } else {
      // Heuristic mode with spurious-column rejection
      const xsAll = rowCells.flat().map((c) => c.x);
      const candidates = clusterAnchors(xsAll, colTol);
      const support = candidates.map((a) => xsAll.filter((x) => Math.abs(x - a) <= colTol).length);
      const rowCount = rowCells.length;
      const minSupport = rowCount >= 3 ? 2 : 1;
      let anchors = candidates.filter((_, i) => support[i] >= minSupport);
      if (!anchors.length) anchors = candidates;
      columnCount = anchors.length;
      assign = (x) => nearestIndex(anchors, x);
    }

    // 4) Place cells
    const matrix = rowCells.map((cells) => {
      const out = new Array(columnCount).fill("");
      cells.forEach((c) => {
        const col = assign(c.x);
        out[col] = out[col] ? `${out[col]} ${c.text}` : c.text;
      });
      return out.map((s) => s.trim());
    });

    // 5) Trim empty trailing columns
    let width = 0;
    for (const row of matrix) {
      let last = row.length - 1;
      while (last >= 0 && row[last] === "") last -= 1;
      width = Math.max(width, last + 1);
    }
    return matrix.map((row) => row.slice(0, Math.max(1, width)));
  }

  return { buildMatrixFromItems, clusterAnchors, columnFromBoundaries, median };
});
