(() => {
  'use strict';

  const isBlank = (v) => v == null || (typeof v === 'string' && v.trim() === '');
  const normalizeText = (v) => typeof v === 'string' ? v.replace(/\u00a0/g, ' ').trim().replace(/[ \t]+/g, ' ') : v;
  const rowKey = (row) => JSON.stringify(row.map((v) => v instanceof Date ? v.toISOString() : v));
  const standardizeNumber = (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (!/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return v;
    const n = Number(t.replace(/,/g, ''));
    return Number.isFinite(n) ? n : v;
  };
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

  function cleanAoA(rows, options = {}) {
    let out = (Array.isArray(rows) ? rows : []).map((r) => (Array.isArray(r) ? r.slice() : []));
    const stats = { trimmedCells: 0, removedBlankRows: 0, removedBlankCols: 0, removedDuplicateRows: 0, filledCells: 0, standardizedNumbers: 0, standardizedDates: 0 };

    if (options.trimSpaces) {
      out = out.map((row) => row.map((v) => {
        const nv = normalizeText(v);
        if (nv !== v) stats.trimmedCells += 1;
        return nv;
      }));
    }
    if (options.standardizeNumbers || options.standardizeDates) {
      out = out.map((row) => row.map((v) => {
        let nv = v;
        if (options.standardizeNumbers) { const x = standardizeNumber(nv); if (x !== nv) stats.standardizedNumbers += 1; nv = x; }
        if (options.standardizeDates) { const x = standardizeDate(nv); if (x !== nv) stats.standardizedDates += 1; nv = x; }
        return nv;
      }));
    }
    if (options.fillDown) {
      const maxCols = out.reduce((m, r) => Math.max(m, r.length), 0);
      for (let c = 0; c < maxCols; c += 1) {
        let last = null;
        for (let r = 0; r < out.length; r += 1) {
          const current = out[r][c];
          if (!isBlank(current)) last = current;
          else if (last != null && !out[r].every(isBlank)) { out[r][c] = last; stats.filledCells += 1; }
        }
      }
    }
    if (options.removeBlankRows) {
      const before = out.length;
      out = out.filter((row) => !row.every(isBlank));
      stats.removedBlankRows = before - out.length;
    }
    if (options.removeBlankCols && out.length) {
      const maxCols = out.reduce((m, r) => Math.max(m, r.length), 0);
      const keep = [];
      for (let c = 0; c < maxCols; c += 1) if (!out.every((row) => isBlank(row[c]))) keep.push(c);
      stats.removedBlankCols = maxCols - keep.length;
      out = out.map((row) => keep.map((c) => row[c]));
    }
    if (options.removeDuplicates && out.length > 1) {
      const head = out[0];
      const seen = new Set();
      const rest = [];
      out.slice(1).forEach((row) => {
        const key = rowKey(row);
        if (seen.has(key)) stats.removedDuplicateRows += 1;
        else { seen.add(key); rest.push(row); }
      });
      out = [head, ...rest];
    }
    return { rows: out, stats };
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
        if (cell && cell.f) { formulas += 1; if (/\[[^\]]+\]/.test(cell.f)) externalFormulas += 1; }
      });
      return { name, ...base, hiddenRows, hiddenCols, merges, formulas, externalFormulas, hasFilter: !!ws['!autofilter'] };
    });
    return { sheets, totals: sheets.reduce((a, s) => {
      ['rows','blankRows','blankCols','duplicateRows','trimCandidates','hiddenRows','hiddenCols','merges','formulas','externalFormulas'].forEach((k) => a[k] += s[k] || 0);
      if (s.hasFilter) a.filters += 1;
      return a;
    }, { rows:0,blankRows:0,blankCols:0,duplicateRows:0,trimCandidates:0,hiddenRows:0,hiddenCols:0,merges:0,formulas:0,externalFormulas:0,filters:0 }) };
  }

  window.ExcelCleanerOps = { analyzeAoA, cleanAoA, analyzeWorkbook, normalizeText };
})();
