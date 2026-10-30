(() => {
  'use strict';

  const isBlank = (v) => v == null || (typeof v === 'string' && v.trim() === '');
  const normalizeText = (v) => typeof v === 'string' ? v.replace(/ /g, ' ').trim().replace(/[ \t]+/g, ' ') : v;
  const rowKey = (row) => JSON.stringify(row.map((v) => v instanceof Date ? v.toISOString() : v));
  const standardizeNumber = (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (!/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return v;
    const n = Number(t.replace(/,/g, ''));
    return Number.isFinite(n) ? n : v;
  };
  // dd/mm/yyyy or dd-mm-yyyy only. Ambiguous mm/dd input is NOT detected; Buddhist-era years are skipped (y > 2200).
  const standardizeDate = (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    const m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (!m) return v;
    const d=Number(m[1]), mo=Number(m[2]), y=Number(m[3]);
    if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > 31) return v;
    const dt = new Date(Date.UTC(y, mo-1, d));
    if (dt.getUTCFullYear()!==y || dt.getUTCMonth()!==mo-1 || dt.getUTCDate()!==d) return v;
    return dt;
  };

  // Worksheet-cell helpers (SheetJS cell objects: {t, v, f, w, z, s})
  const cellBlank = (cell) => !cell || (cell.v == null && !cell.f) || (typeof cell.v === 'string' && cell.v.trim() === '' && !cell.f);
  const cellKey = (cell) => {
    if (!cell) return null;
    return cell.f ? `F:${cell.f}|V:${String(cell.v ?? '')}` : `V:${String(cell.v ?? '')}`;
  };
  const cloneCell = (cell) => (cell ? { ...cell } : null);
  const isExternalFormula = (f) => /\[[^\]]+\]/.test(f);

  function analyzeAoA(rows) {
    const data = Array.isArray(rows) ? rows : [];
    const maxCols = data.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0);
    let blankRows = 0, blankCols = 0, duplicateRows = 0, trimCandidates = 0;
    const seen = new Set();
    data.forEach((row, i) => {
      const arr = Array.isArray(row) ? row : [];
      if (arr.every(isBlank)) blankRows += 1;
      if (i > 0 && !arr.every(isBlank)) {
        const key = rowKey(arr.map(normalizeText));
        if (seen.has(key)) duplicateRows += 1; else seen.add(key);
      }
      arr.forEach((v) => { if (typeof v === 'string' && normalizeText(v) !== v) trimCandidates += 1; });
    });
    for (let c = 0; c < maxCols; c += 1) {
      if (data.every((row) => isBlank((row || [])[c]))) blankCols += 1;
    }
    return { rows: data.length, cols: maxCols, blankRows, blankCols, duplicateRows, trimCandidates };
  }

  /**
   * Clean one worksheet. Returns { sheet, stats }. Never mutates `ws`.
   * Throws when rows/columns are removed in front of surviving formulas, because
   * Excel would recalculate those formulas against shifted cell positions.
   */
  function cleanWorksheet(ws, options, XLSX) {
    const opt = options || {};
    const stats = { trimmedCells: 0, removedBlankRows: 0, removedBlankCols: 0, removedDuplicateRows: 0, removedHiddenRows: 0, removedHiddenCols: 0, filledCells: 0, standardizedNumbers: 0, standardizedDates: 0, formulasToValues: 0, shiftedByRemoval: false };
    if (!ws || !ws['!ref']) return { sheet: XLSX.utils.aoa_to_sheet([]), stats };

    const range = XLSX.utils.decode_range(ws['!ref']);
    let matrix = [];
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      const row = [];
      for (let c = range.s.c; c <= range.e.c; c += 1) row.push(cloneCell(ws[XLSX.utils.encode_cell({ r, c })]));
      matrix.push(row);
    }
    let shifted = false;
    const widthOf = (m) => m.reduce((w, r) => Math.max(w, r.length), 0);
    // A removed row/col only shifts references if something survives after it.
    const markShift = (removedIdx, keptIdx) => { if (removedIdx.some((i) => keptIdx.some((k) => k > i))) shifted = true; };

    if (opt.removeHidden) {
      const hiddenRows = ws['!rows'] || [], hiddenCols = ws['!cols'] || [];
      const keepR = [], dropR = [];
      matrix.forEach((_, i) => { const h = hiddenRows[range.s.r + i]; (h && h.hidden ? dropR : keepR).push(i); });
      markShift(dropR, keepR);
      stats.removedHiddenRows = dropR.length;
      matrix = keepR.map((i) => matrix[i]);
      const keepC = [], dropC = [];
      for (let c = 0; c < widthOf(matrix); c += 1) { const h = hiddenCols[range.s.c + c]; (h && h.hidden ? dropC : keepC).push(c); }
      markShift(dropC, keepC);
      stats.removedHiddenCols = dropC.length;
      matrix = matrix.map((row) => keepC.map((c) => row[c] || null));
    }

    matrix.forEach((row) => row.forEach((cell) => {
      if (!cell) return;
      if (opt.trimSpaces && typeof cell.v === 'string') {
        const nv = normalizeText(cell.v);
        if (nv !== cell.v) { cell.v = nv; delete cell.w; stats.trimmedCells += 1; }
      }
      if (opt.standardizeNumbers && typeof cell.v === 'string') {
        const n = standardizeNumber(cell.v);
        if (n !== cell.v) { cell.v = n; cell.t = 'n'; delete cell.w; stats.standardizedNumbers += 1; }
      }
      if (opt.standardizeDates && typeof cell.v === 'string') {
        const d = standardizeDate(cell.v);
        if (d !== cell.v) { cell.v = d; cell.t = 'd'; cell.z = 'yyyy-mm-dd'; delete cell.w; stats.standardizedDates += 1; }
      }
      if (cell.f && (opt.formulaValues || (opt.removeExternalLinks && isExternalFormula(cell.f)))) {
        delete cell.f; stats.formulasToValues += 1;
      }
    }));

    if (opt.fillDown) {
      for (let c = 0; c < widthOf(matrix); c += 1) {
        let last = null;
        for (let r = 0; r < matrix.length; r += 1) {
          const row = matrix[r];
          if (!cellBlank(row[c])) last = cloneCell(row[c]);
          else if (last && row.some((x) => !cellBlank(x))) { row[c] = cloneCell(last); stats.filledCells += 1; }
        }
      }
    }
    if (opt.removeBlankRows) {
      const keepR = [], dropR = [];
      matrix.forEach((row, i) => (row.some((cell) => !cellBlank(cell)) ? keepR : dropR).push(i));
      markShift(dropR, keepR);
      stats.removedBlankRows = dropR.length;
      matrix = keepR.map((i) => matrix[i]);
    }
    if (opt.removeBlankCols && matrix.length) {
      const keepC = [], dropC = [];
      for (let c = 0; c < widthOf(matrix); c += 1) (matrix.some((row) => !cellBlank(row[c])) ? keepC : dropC).push(c);
      markShift(dropC, keepC);
      stats.removedBlankCols = dropC.length;
      matrix = matrix.map((row) => keepC.map((c) => row[c] || null));
    }
    if (opt.removeDuplicates && matrix.length > 1) {
      // Row 1 is treated as the header and always kept.
      const seen = new Set(), keepR = [0], dropR = [];
      matrix.slice(1).forEach((row, i) => {
        const k = JSON.stringify(row.map(cellKey));
        if (seen.has(k)) dropR.push(i + 1); else { seen.add(k); keepR.push(i + 1); }
      });
      markShift(dropR, keepR);
      stats.removedDuplicateRows = dropR.length;
      matrix = keepR.map((i) => matrix[i]);
    }

    stats.shiftedByRemoval = shifted;
    if (shifted) {
      const remaining = matrix.reduce((n, row) => n + row.filter((cell) => cell && cell.f).length, 0);
      if (remaining > 0) {
        throw new Error('พบสูตรที่ยังเหลืออยู่ ' + remaining + ' เซลล์ ขณะที่การลบแถว/คอลัมน์จะทำให้ตำแหน่งอ้างอิงในสูตรเลื่อน และ Excel จะคำนวณค่าผิดเมื่อเปิดไฟล์ — กรุณาเปิด "Formula → Values" หรือปิดตัวเลือกลบแถว/คอลัมน์/ซ้ำ/ซ่อน แล้วลองใหม่');
      }
    }

    const out = {};
    let maxR = -1, maxC = -1;
    matrix.forEach((row, r) => row.forEach((cell, c) => {
      if (cell) { out[XLSX.utils.encode_cell({ r, c })] = cell; maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
    }));
    out['!ref'] = maxR >= 0 ? XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } }) : 'A1';

    const structureIntact = !opt.removeBlankRows && !opt.removeBlankCols && !opt.removeHidden && !opt.removeDuplicates;
    if (!opt.unmerge && structureIntact && ws['!merges']) out['!merges'] = ws['!merges'].map((m) => ({ ...m, s: { ...m.s }, e: { ...m.e } }));
    if (!opt.removeFilters && structureIntact && ws['!autofilter']) out['!autofilter'] = { ...ws['!autofilter'] };
    if (!opt.formattingCleanup) {
      if (ws['!cols'] && structureIntact) out['!cols'] = ws['!cols'].map((x) => (x ? { ...x } : x));
      if (ws['!rows'] && structureIntact) out['!rows'] = ws['!rows'].map((x) => (x ? { ...x } : x));
    } else {
      Object.keys(out).forEach((addr) => { if (addr[0] !== '!' && out[addr] && out[addr].s) delete out[addr].s; });
    }
    return { sheet: out, stats };
  }

  function analyzeWorkbook(workbook, XLSX) {
    const sheets = workbook.SheetNames.map((name) => {
      const ws = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
      const base = analyzeAoA(rows);
      const hiddenRows = (ws['!rows'] || []).filter((r) => r && r.hidden).length;
      const hiddenCols = (ws['!cols'] || []).filter((c) => c && c.hidden).length;
      const merges = (ws['!merges'] || []).length;
      let formulas = 0, externalFormulas = 0;
      Object.keys(ws).forEach((addr) => {
        if (addr[0] === '!') return;
        const cell = ws[addr];
        if (cell && cell.f) { formulas += 1; if (isExternalFormula(cell.f)) externalFormulas += 1; }
      });
      return { name, ...base, hiddenRows, hiddenCols, merges, formulas, externalFormulas, hasFilter: !!ws['!autofilter'] };
    });
    return { sheets, totals: sheets.reduce((a, s) => {
      ['rows','blankRows','blankCols','duplicateRows','trimCandidates','hiddenRows','hiddenCols','merges','formulas','externalFormulas'].forEach((k) => a[k] += s[k] || 0);
      if (s.hasFilter) a.filters += 1;
      return a;
    }, { rows:0,blankRows:0,blankCols:0,duplicateRows:0,trimCandidates:0,hiddenRows:0,hiddenCols:0,merges:0,formulas:0,externalFormulas:0,filters:0 }) };
  }

  window.ExcelCleanerOps = { analyzeAoA, analyzeWorkbook, cleanWorksheet, normalizeText, standardizeNumber, standardizeDate };
})();
