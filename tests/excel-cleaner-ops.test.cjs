const assert = require('node:assert/strict');
const fs = require('fs'), vm = require('vm'), path = require('path');
const XLSX = require('xlsx');

const code = fs.readFileSync(path.join(__dirname, '../public/excel-cleaner-ops.js'), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(code, ctx);
const E = ctx.window.ExcelCleanerOps;

const sheet = (aoa) => XLSX.utils.aoa_to_sheet(aoa);
const clean = (ws, opt) => E.cleanWorksheet(ws, opt, XLSX);
const aoa = (ws) => XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
// Dates created inside the vm sandbox are a different realm, so instanceof Date is unreliable.
const isDate = (d) => Object.prototype.toString.call(d) === '[object Date]';
const val = (ws, addr) => (ws[addr] ? ws[addr].v : undefined);

// 1. analysis
{
  const rows = [['Name', 'Value', ''], [' A  B ', 1, ''], [' A  B ', 1, ''], ['', null, ''], ['C', 2, '']];
  const a = E.analyzeAoA(rows);
  assert.deepEqual([a.blankRows, a.blankCols, a.duplicateRows, a.trimCandidates], [1, 1, 1, 2]);
}

// 2. trim (incl. NBSP) + stats; source untouched
{
  const ws = sheet([['x'], ['  A  B  ']]);
  const before = JSON.stringify(ws);
  const { sheet: out, stats } = clean(ws, { trimSpaces: true });
  assert.equal(val(out, 'A2'), 'A B');
  assert.equal(stats.trimmedCells, 1);
  assert.equal(JSON.stringify(ws), before, 'source worksheet must not be mutated');
}

// 3. conservative defaults: blank rows + blank cols removed, other data kept
{
  const ws = sheet([['H1', '', 'H3'], ['a', '', 'b'], ['', '', ''], ['c', '', 'd']]);
  const { sheet: out, stats } = clean(ws, { trimSpaces: true, removeBlankRows: true, removeBlankCols: true });
  assert.deepEqual(aoa(out), [['H1', 'H3'], ['a', 'b'], ['c', 'd']]);
  assert.equal(stats.removedBlankRows, 1);
  assert.equal(stats.removedBlankCols, 1);
}

// 4. duplicates: header kept, first occurrence kept
{
  const ws = sheet([['k', 'v'], ['a', 1], ['a', 1], ['b', 2], ['a', 1]]);
  const { sheet: out, stats } = clean(ws, { removeDuplicates: true });
  assert.deepEqual(aoa(out), [['k', 'v'], ['a', 1], ['b', 2]]);
  assert.equal(stats.removedDuplicateRows, 2);
  // row 1 is the header: a later row equal to it is still a data row, not removed against it
  const ws2 = sheet([['k'], ['k']]);
  assert.deepEqual(aoa(clean(ws2, { removeDuplicates: true }).sheet), [['k'], ['k']]);
}

// 5. number + date standardization
{
  const ws = sheet([['n', 'd'], ['1,234.50', '05/03/2024'], ['12,34', '31/02/2024'], ['x', '05/03/2567'], ['999', '1-2-2024']]);
  const { sheet: out, stats } = clean(ws, { standardizeNumbers: true, standardizeDates: true });
  assert.equal(val(out, 'A2'), 1234.5);
  assert.equal(out.A2.t, 'n');
  assert.equal(val(out, 'A3'), '12,34', 'malformed thousands separators are left alone');
  assert.equal(val(out, 'A5'), '999');
  assert.ok(isDate(val(out, 'B2')) && val(out, 'B2').toISOString().startsWith('2024-03-05'));
  assert.equal(out.B2.z, 'yyyy-mm-dd');
  assert.equal(val(out, 'B3'), '31/02/2024', 'impossible date left alone');
  assert.equal(val(out, 'B4'), '05/03/2567', 'Buddhist-era year left alone');
  assert.ok(isDate(val(out, 'B5')), 'single-digit day/month accepted');
  assert.equal(stats.standardizedNumbers, 1);
  assert.equal(stats.standardizedDates, 2);
  // survives a real xlsx write/read round-trip as a date
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, out, 'S');
  const back = XLSX.read(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }), { type: 'buffer', cellDates: true });
  assert.ok(back.Sheets.S.B2.v instanceof Date);
  assert.equal(back.Sheets.S.A2.v, 1234.5);
}

// 6. fill down: only inside non-blank rows
{
  const ws = sheet([['grp', 'item'], ['G1', 'a'], [null, 'b'], [null, null], ['G2', 'c'], [null, 'd']]);
  const { sheet: out, stats } = clean(ws, { fillDown: true });
  assert.deepEqual(aoa(out).map((r) => r[0]), ['grp', 'G1', 'G1', null, 'G2', 'G2']);
  assert.equal(stats.filledCells, 2);
}

// 7. formula -> values keeps cached value; external-link removal touches only external formulas
{
  const ws = sheet([[1, 2, 3]]);
  ws.C1 = { t: 'n', v: 3, f: 'A1+B1' };
  ws.D1 = { t: 'n', v: 9, f: "'[Other.xlsx]Sheet1'!A1" };
  ws['!ref'] = 'A1:D1';
  const fv = clean(ws, { formulaValues: true });
  assert.equal(fv.sheet.C1.f, undefined);
  assert.equal(fv.sheet.C1.v, 3);
  assert.equal(fv.sheet.D1.v, 9);
  assert.equal(fv.stats.formulasToValues, 2);
  const ext = clean(ws, { removeExternalLinks: true });
  assert.equal(ext.sheet.C1.f, 'A1+B1', 'internal formula kept');
  assert.equal(ext.sheet.D1.f, undefined, 'external formula converted to value');
  assert.equal(ws.C1.f, 'A1+B1', 'source untouched');
}

// 8. formula guard: removing rows/cols in front of surviving formulas must stop
{
  const mk = () => {
    const ws = sheet([[1], [null], [2], [null]]);
    ws.B3 = { t: 'n', v: 2, f: 'A3*1' };
    ws['!ref'] = 'A1:B4';
    return ws;
  };
  assert.throws(() => clean(mk(), { removeBlankRows: true }), /สูตร/);
  assert.throws(() => clean(mk(), { removeDuplicates: true, removeBlankRows: true }), /สูตร/);
  // allowed when formulas are converted to values first
  assert.doesNotThrow(() => clean(mk(), { removeBlankRows: true, formulaValues: true }));
  // allowed when the only blank row is trailing (nothing shifts)
  const trailing = sheet([[1], [2], [null]]);
  trailing.B2 = { t: 'n', v: 2, f: 'A2*1' };
  trailing['!ref'] = 'A1:B3';
  const r = clean(trailing, { removeBlankRows: true });
  assert.equal(r.stats.removedBlankRows, 1);
  assert.equal(r.sheet.B2.f, 'A2*1');
  // blank column in the middle in front of a formula column -> blocked
  const colMid = sheet([[1, null, 3]]);
  colMid.D1 = { t: 'n', v: 4, f: 'A1+C1' };
  colMid['!ref'] = 'A1:D1';
  assert.throws(() => clean(colMid, { removeBlankCols: true }), /สูตร/);
}

// 9. merges / filter / col widths: kept when structure intact, dropped on unmerge / removal
{
  const mk = () => {
    const ws = sheet([['a', 'b'], ['c', 'd']]);
    ws['!merges'] = [XLSX.utils.decode_range('A1:B1')];
    ws['!autofilter'] = { ref: 'A1:B2' };
    ws['!cols'] = [{ wch: 20 }, { wch: 10 }];
    return ws;
  };
  const keep = clean(mk(), {});
  assert.equal(keep.sheet['!merges'].length, 1);
  assert.ok(keep.sheet['!autofilter']);
  assert.equal(keep.sheet['!cols'][0].wch, 20);
  const un = clean(mk(), { unmerge: true, removeFilters: true });
  assert.equal(un.sheet['!merges'], undefined);
  assert.equal(un.sheet['!autofilter'], undefined);
  const removed = clean(mk(), { removeBlankRows: true });
  assert.equal(removed.sheet['!merges'], undefined, 'merges dropped when rows may move');
  assert.equal(removed.sheet['!cols'], undefined);
}

// 10. hidden rows / columns
{
  const ws = sheet([['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']]);
  ws['!rows'] = [{}, { hidden: true }, {}];
  ws['!cols'] = [{}, { hidden: true }, {}];
  const { sheet: out, stats } = clean(ws, { removeHidden: true });
  assert.deepEqual(aoa(out), [['a', 'c'], ['g', 'i']]);
  assert.equal(stats.removedHiddenRows, 1);
  assert.equal(stats.removedHiddenCols, 1);
}

// 11. formatting cleanup strips cell styles only
{
  const ws = sheet([['a']]);
  ws.A1.s = { font: { bold: true } };
  assert.ok(clean(ws, {}).sheet.A1.s);
  const out = clean(ws, { formattingCleanup: true }).sheet;
  assert.equal(out.A1.s, undefined);
  assert.equal(out.A1.v, 'a');
}

// 12. empty / missing sheet
{
  assert.equal(clean(null, {}).sheet['!ref'], undefined);
  assert.deepEqual(aoa(clean(sheet([]), { removeBlankRows: true }).sheet), []);
}

// 13. analyzeWorkbook reports formulas / external / merges / filters
{
  const ws = sheet([[1, 2], [3, 4]]);
  ws.C1 = { t: 'n', v: 3, f: 'A1+B1' };
  ws.C2 = { t: 'n', v: 9, f: '[Book2.xlsx]S!A1' };
  ws['!ref'] = 'A1:C2';
  ws['!merges'] = [XLSX.utils.decode_range('A1:B1')];
  ws['!autofilter'] = { ref: 'A1:C2' };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'S');
  const t = E.analyzeWorkbook(wb, XLSX).totals;
  assert.equal(t.formulas, 2);
  assert.equal(t.externalFormulas, 1);
  assert.equal(t.merges, 1);
  assert.equal(t.filters, 1);
}

console.log('Excel Cleaner Ops tests passed.');
