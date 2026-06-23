(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PdfTableOps = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TextCorrect = (typeof require === "function")
    ? require("./text-correct.js")
    : (typeof self !== "undefined" ? self : this).TextCorrect;

  function median(values) {
    if (!values.length) return 0;
    const s = values.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function clusterAnchors(xs, tol) {
    const s = xs.slice().sort((a, b) => a - b);
    const a = [];
    for (const x of s) if (!a.length || x - a[a.length - 1] > tol) a.push(x);
    return a;
  }
  function nearestIndex(anchors, v) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < anchors.length; i += 1) {
      const d = Math.abs(anchors[i] - v);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function columnFromBoundaries(x, bounds) {
    let i = 0;
    while (i < bounds.length && x >= bounds[i] - 0.5) i += 1;
    return Math.max(0, i - 1);
  }

  // Insert a space at Thai <-> Latin/digit boundaries (e.g. "แก้ไขworkflow" -> "แก้ไข workflow").
  // Thai combining marks/vowels stay glued because both sides are in the Thai block.
  function addScriptSpaces(s) {
    return String(s)
      .replace(/([\u0E00-\u0E7F])([A-Za-z0-9])/g, "$1 $2")
      .replace(/([A-Za-z0-9])([\u0E00-\u0E7F])/g, "$1 $2");
  }

  /**
   * Reconstruct rows/columns from positioned PDF text items.
   * Handles Thai combining glyphs (no-space join) and separates prose from tables.
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
      .filter((it) => it.str.replace(/\s+/g, "") !== ""); // drop pure-whitespace items

    if (!clean.length) {
      return [[options.emptyNote || "(ไม่พบข้อความในหน้านี้ — อาจเป็น PDF สแกน/รูปภาพ)"]];
    }

    const mh = median(clean.map((it) => it.h).filter((h) => h > 0)) || 10;
    const rowTol = options.rowTolerance != null ? options.rowTolerance : Math.max(2, mh * 0.6);
    const spaceGap = options.spaceGap != null ? options.spaceGap : Math.max(1.2, mh * 0.28);
    const cellGap = options.cellGap != null ? options.cellGap : Math.max(8, mh * 1.4);
    const colTol = options.columnTolerance != null ? options.columnTolerance : Math.max(8, mh);
    const proseRatio = options.proseRatio != null ? options.proseRatio : 0.35;
    const maxColumns = options.maxColumns != null ? options.maxColumns : 16;
    const scriptSpacing = options.thaiLatinSpacing !== false; // default ON
    const cleanArtifacts = options.cleanArtifacts !== false; // default ON
    const roadPack = options.roadPack === true; // domain pack: opt-in
    const normText = (s) => {
      if (TextCorrect && TextCorrect.correctThai) {
        return TextCorrect.correctThai(s, {
          artifacts: cleanArtifacts,
          reorder: cleanArtifacts,
          patterns: cleanArtifacts,
          roadPack: roadPack,
          scriptSpacing: scriptSpacing,
        });
      }
      return String(s).replace(/\s+/g, " ").trim();
    };

    // 1) rows by y (top -> bottom)
    const rows = [];
    clean.slice().sort((a, b) => b.y - a.y).forEach((it) => {
      const r = rows.find((rr) => Math.abs(rr.y - it.y) <= rowTol);
      if (r) r.items.push(it);
      else rows.push({ y: it.y, items: [it] });
    });

    // 2) within each row: 3-way join (glue / space / new cell)
    const rowCells = rows.map((row) => {
      const sorted = row.items.slice().sort((a, b) => a.x - b.x);
      const cells = [];
      let cur = null, prevRight = -Infinity;
      for (const it of sorted) {
        const gap = it.x - prevRight;
        if (!cur || gap > cellGap) {
          cur = { x: it.x, text: it.str };
          cells.push(cur);
        } else if (gap > spaceGap) {
          cur.text += ` ${it.str}`;            // real word space
        } else {
          cur.text += it.str;                  // glued glyph / Thai combining mark (no space)
        }
        prevRight = Math.max(prevRight, it.x + (it.w || 0));
      }
      return cells.map((c) => ({ x: c.x, text: normText(c.text) }));
    });

    const bounds = Array.isArray(options.columnBoundaries)
      ? options.columnBoundaries.slice().sort((a, b) => a - b)
      : null;

    // 3a) GRID-LINE mode (most accurate, when boundaries detected)
    if (bounds && bounds.length >= 2) {
      const colCount = bounds.length - 1;
      return finalize(rowCells.map((cells) => {
        const out = new Array(colCount).fill("");
        cells.forEach((c) => {
          const col = Math.min(colCount - 1, columnFromBoundaries(c.x, bounds));
          out[col] = out[col] ? `${out[col]} ${c.text}` : c.text;
        });
        return out;
      }));
    }

    // 3b) PROSE detection — if most rows are single-cell, output one readable column
    const multiCellRows = rowCells.filter((c) => c.length >= 2).length;
    const ratio = multiCellRows / Math.max(1, rowCells.length);
    if (ratio < proseRatio) {
      return finalize(rowCells.map((cells) => [cells.map((c) => c.text).join(" ").trim()]));
    }

    // 3c) TABLE mode — strong anchors only (reject spurious columns), capped
    const xsAll = rowCells.flat().map((c) => c.x);
    const candidates = clusterAnchors(xsAll, colTol);
    const support = candidates.map((a) => xsAll.filter((x) => Math.abs(x - a) <= colTol).length);
    const rowCount = rowCells.length;
    const minSupport = Math.max(2, Math.round(rowCount * 0.12));
    let idx = candidates.map((_, i) => i).filter((i) => support[i] >= minSupport);
    if (!idx.length) idx = candidates.map((_, i) => i);
    if (idx.length > maxColumns) {
      idx = idx.sort((a, b) => support[b] - support[a]).slice(0, maxColumns).sort((a, b) => candidates[a] - candidates[b]);
    }
    const anchors = idx.map((i) => candidates[i]);

    return finalize(rowCells.map((cells) => {
      const out = new Array(anchors.length).fill("");
      cells.forEach((c) => {
        const col = nearestIndex(anchors, c.x);
        out[col] = out[col] ? `${out[col]} ${c.text}` : c.text;
      });
      return out;
    }));

    function finalize(matrix) {
      if (!matrix.length) return [[""]];
      const colCount = matrix.reduce((mx, r) => Math.max(mx, r.length), 0);
      // keep only columns that have at least one non-empty cell (drops leading/interior/trailing empties)
      const keep = [];
      for (let c = 0; c < colCount; c += 1) {
        const used = matrix.some((r) => r[c] != null && String(r[c]).trim() !== "");
        if (used) keep.push(c);
      }
      if (!keep.length) keep.push(0);
      return matrix.map((row) => keep.map((c) => (row[c] == null ? "" : row[c])));
    }
  }

  /**
   * Merge wrapped description lines into one logical row.
   * Auto-detects "amount tables": if the last column is mostly amounts (e.g. "2,353,000 บาท"),
   * rows whose amount cell is EMPTY are treated as continuation lines and merged up into the
   * next row that carries an amount. Non-amount tables are returned unchanged.
   */
  function mergeWrappedRows(matrix, options = {}) {
    if (!Array.isArray(matrix) || matrix.length < 2) return matrix;
    const cols = matrix.reduce((mx, r) => Math.max(mx, r.length), 0);
    if (cols < 2) return matrix;
    const amountCol = cols - 1;
    const amountRe = options.amountRegex || /\d{1,3}(,\d{3})+|\bบาท\b|\d+\.\d{2}\b/;
    const cell = (r, c) => (r[c] == null ? "" : String(r[c])).trim();

    // auto-detect amount column
    let filledLast = 0, amountRows = 0, emptyLast = 0;
    for (const r of matrix) {
      const v = cell(r, amountCol);
      if (v) { filledLast += 1; if (amountRe.test(v)) amountRows += 1; }
      else emptyLast += 1;
    }
    const isAmountTable = filledLast >= 2 && amountRows / Math.max(1, filledLast) >= 0.6 && emptyLast >= 1;
    if (!isAmountTable && !options.force) return matrix;

    const norm = (r) => r.map((x) => (x == null ? "" : String(x)).trim());
    const blank = (r) => r.every((x) => cell([x], 0) === "");
    const out = [];
    let buf = null;
    const flush = () => { if (buf) { out.push(norm(buf)); buf = null; } };

    for (const row0 of matrix) {
      const row = row0.slice();
      while (row.length < cols) row.push("");
      if (blank(row)) { flush(); out.push(norm(row)); continue; }
      const amt = cell(row, amountCol);
      if (amt) {
        if (buf) {
          for (let c = 0; c < cols; c += 1) {
            if (c === amountCol) { buf[c] = amt; continue; }
            const a = cell(buf, c), b = cell(row, c);
            buf[c] = a && b ? `${a} ${b}` : a || b;
          }
          out.push(norm(buf));
          buf = null;
        } else {
          out.push(norm(row));
        }
      } else {
        if (!buf) buf = row.slice();
        else {
          for (let c = 0; c < cols; c += 1) {
            const a = cell(buf, c), b = cell(row, c);
            buf[c] = a && b ? `${a} ${b}` : a || b;
          }
        }
      }
    }
    flush();
    return out.length ? out : matrix;
  }

  return { buildMatrixFromItems, mergeWrappedRows, clusterAnchors, columnFromBoundaries, median };
});
