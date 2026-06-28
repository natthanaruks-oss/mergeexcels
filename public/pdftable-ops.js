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

  // PDF บางไฟล์แยกสระ "ำ" เป็น 2 glyph: "า" อยู่ในคำ แต่ "ํ" (นิคหิต)
  // หลุดออกมาเป็น text item แยกและมีพิกัดสูงกว่าบรรทัดเล็กน้อย ทำให้ชื่อสายทาง
  // กลายเป็น "บารุง / กาหนด / อานวย" และมีวงกลมประหลาดไปโผล่คอลัมน์อื่น
  // ฟังก์ชันนี้ซ่อมเฉพาะนิคหิตที่หา "า" ใกล้เคียงทางเรขาคณิตได้อย่างมั่นใจเท่านั้น
  // เพื่อหลีกเลี่ยงการเดาแก้คำอื่นโดยไม่มีหลักฐานจากตำแหน่งใน PDF
  function repairDetachedSaraAm(items, options = {}) {
    const source = items.map((it) => ({ ...it }));
    if (!source.length) return source;

    // ใช้ความสูงของ text item ปกติเป็นฐาน ไม่ใช้ glyph combining ที่มักมีความสูงเล็กมาก
    // มิฉะนั้น tolerance จะต่ำเกินไปและไม่สามารถจับนิคหิตที่ลอยเหนือบรรทัดได้
    const baseHeights = source
      .filter((it) => !/^\u0E4D+$/.test(String(it.str || "").replace(/\s+/g, "")))
      .map((it) => Number(it.h) || 0)
      .filter((h) => h > 0);
    const allHeights = source.map((it) => Number(it.h) || 0).filter((h) => h > 0);
    const mh = median(baseHeights.length ? baseHeights : allHeights) || 10;
    const maxDy = options.saraAmVerticalTolerance != null
      ? Number(options.saraAmVerticalTolerance)
      : Math.max(8, mh * 2.2);
    const extraDx = options.saraAmHorizontalTolerance != null
      ? Number(options.saraAmHorizontalTolerance)
      : Math.max(8, mh * 1.4);
    const consumed = new Set();

    for (let mi = 0; mi < source.length; mi += 1) {
      const mark = source[mi];
      const markText = String(mark.str || "").replace(/\s+/g, "");
      if (!/^\u0E4D+$/.test(markText)) continue; // ซ่อมเฉพาะนิคหิตเดี่ยว ๆ

      for (let repeat = 0; repeat < markText.length; repeat += 1) {
        let best = null;
        for (let ci = 0; ci < source.length; ci += 1) {
          if (ci === mi || consumed.has(ci)) continue;
          const candidate = source[ci];
          const text = String(candidate.str || "");
          if (!text.includes("า")) continue;

          const dy = Math.abs((Number(candidate.y) || 0) - (Number(mark.y) || 0));
          if (dy > maxDy) continue;

          const chars = Array.from(text);
          const width = Number(candidate.w) > 0
            ? Number(candidate.w)
            : Math.max(mh * 0.6 * Math.max(1, chars.length), mh);
          const charW = width / Math.max(1, chars.length);
          const left = Number(candidate.x) || 0;
          const markX = Number(mark.x) || 0;
          if (markX < left - charW - extraDx || markX > left + width + charW + extraDx) continue;

          for (let i = 0; i < chars.length; i += 1) {
            if (chars[i] !== "า") continue;
            const charCenter = left + charW * (i + 0.5);
            const dx = Math.abs(markX - charCenter);
            const score = dx + dy * 1.35;
            if (!best || score < best.score) best = { ci, i, score };
          }
        }

        const scoreLimit = Math.max(extraDx + mh * 1.6, mh * 3.2);
        if (!best || best.score > scoreLimit) break;
        const chars = Array.from(String(source[best.ci].str || ""));
        chars[best.i] = "ำ";
        source[best.ci].str = chars.join("");
        consumed.add(mi);
      }
    }

    return source.filter((_, i) => !consumed.has(i));
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
    const raw = (Array.isArray(items) ? items : [])
      .map((it) => ({
        str: String(it.str == null ? "" : it.str),
        x: Number(it.x) || 0,
        y: Number(it.y) || 0,
        w: Number(it.w) || 0,
        h: Number(it.h) || 0,
      }))
      .filter((it) => it.str.replace(/\s+/g, "") !== ""); // drop pure-whitespace items

    // ซ่อมนิคหิตของสระ "ำ" ที่ PDF แยกเป็น glyph ลอย ก่อนจัดกลุ่มแถว/คอลัมน์
    const clean = options.repairDetachedSaraAm === false
      ? raw
      : repairDetachedSaraAm(raw, options);

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

      // PDF บางไฟล์ใช้ฟอนต์แบบ custom CMap และส่งสระ/วรรณยุกต์ไทยออกมาเป็น
      // text item แยกที่มีเฉพาะ combining marks เช่น "ุ", "็้", "ิุ์" โดยไม่มี
      // พยัญชนะฐาน ข้อมูลเหล่านี้ไม่ใช่เซลล์จริงและทำให้เกิดคอลัมน์วงกลมแปลก ๆ
      // ใน Excel จึงล้างเฉพาะเซลล์ที่ประกอบด้วย combining marks ล้วนเท่านั้น
      // (ไม่แตะข้อความไทยปกติที่มีพยัญชนะฐาน)
      const detachedMarksOnly = /^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]+$/u;
      const cleaned = matrix.map((row) => row.map((value) => {
        const text = value == null ? "" : String(value).trim();
        return detachedMarksOnly.test(text.replace(/\s+/g, "")) ? "" : value;
      }));

      const colCount = cleaned.reduce((mx, r) => Math.max(mx, r.length), 0);
      // keep only columns that have at least one non-empty cell (drops leading/interior/trailing empties)
      const keep = [];
      for (let c = 0; c < colCount; c += 1) {
        const used = cleaned.some((r) => r[c] != null && String(r[c]).trim() !== "");
        if (used) keep.push(c);
      }
      if (!keep.length) keep.push(0);
      return cleaned.map((row) => keep.map((c) => (row[c] == null ? "" : row[c])));
    }
  }

  // จัดรูปแบบผลลัพธ์เอกสารงบงานถนนให้คงที่ ลดปัญหา glyph ไทยลอย
  // ไปสร้างคอลัมน์ด้านขวาจำนวนมาก โดยเก็บโครงสร้างหลักเป็น
  // [รายละเอียดโครงการ, จำนวนเงิน] สำหรับแถวที่มีงบประมาณ
  // และ [ข้อความ] สำหรับหัวข้อ/บรรทัดทั่วไป
  function normalizeRoadBudgetMatrix(matrix, options = {}) {
    if (!Array.isArray(matrix)) return [];
    const detachedMarksOnly = /^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]+$/u;
    const amountRe = options.amountRegex || /-?\d[\d,]*(?:\.\d+)?\s*(?:บาท|บ\.)\s*$/i;
    const commaAmountRe = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*$/;
    const cleanCell = (value) => {
      const text = value == null ? "" : String(value).replace(/\s+/g, " ").trim();
      if (!text) return "";
      return detachedMarksOnly.test(text.replace(/\s+/g, "")) ? "" : text;
    };

    return matrix.map((rawRow) => {
      const cells = (Array.isArray(rawRow) ? rawRow : [rawRow]).map(cleanCell).filter(Boolean);
      if (!cells.length) return [""];

      let amountIndex = -1;
      for (let i = cells.length - 1; i >= 0; i -= 1) {
        if (amountRe.test(cells[i]) || commaAmountRe.test(cells[i])) { amountIndex = i; break; }
      }

      if (amountIndex >= 0) {
        const amount = cells[amountIndex];
        const description = cells.filter((_, i) => i !== amountIndex).join(" ").replace(/\s+/g, " ").trim();
        return [description, amount];
      }

      // บรรทัดที่ไม่มีจำนวนเงินให้รวมเป็นคอลัมน์เดียว เพื่อให้ทุกหน้ามีรูปแบบเดียวกัน
      return [cells.join(" ").replace(/\s+/g, " ").trim()];
    });
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

  return { buildMatrixFromItems, normalizeRoadBudgetMatrix, mergeWrappedRows, repairDetachedSaraAm, clusterAnchors, columnFromBoundaries, median };
});
