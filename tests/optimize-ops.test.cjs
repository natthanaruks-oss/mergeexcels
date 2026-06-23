const assert = require("node:assert/strict");
const XLSX = require("xlsx");
const OptimizeOps = require("../public/optimize-ops.js");

function makeWorkbook() {
  const workbook = XLSX.utils.book_new();
  const data = [
    ["ID", "Name", "Amount", "Calculated"],
    [1, "Alpha", 100, 200],
    [2, "Beta", 250, 500],
    [3, "Gamma", 0, 0],
    [4, "Delta", 125, 250],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet.D2.f = "C2*2";
  sheet.D2.v = 200;
  sheet.B2.c = [{ a: "Tester", t: "comment" }];
  sheet.B3.l = { Target: "https://example.com" };
  sheet.A1.s = { font: { bold: true } };
  sheet["!merges"] = [XLSX.utils.decode_range("A1:B1")];
  sheet["!ref"] = "A1:XFD1048576";
  XLSX.utils.book_append_sheet(workbook, sheet, "Oracle Data");

  const hidden = XLSX.utils.aoa_to_sheet([["Secret"], ["Value"]]);
  XLSX.utils.book_append_sheet(workbook, hidden, "Hidden Raw");
  workbook.Workbook = { Sheets: [{ name: "Oracle Data", Hidden: 0 }, { name: "Hidden Raw", Hidden: 1 }] };
  return workbook;
}

{
  const workbook = makeWorkbook();
  const analysis = OptimizeOps.analyzeWorkbook(XLSX, workbook, 10_000_000);
  assert.equal(analysis.total.sheets, 2);
  assert.equal(analysis.sheets[0].actualRows, 5);
  assert.equal(analysis.sheets[0].actualCols, 4);
  assert.equal(analysis.sheets[0].formulaCells, 1);
  assert.equal(analysis.sheets[0].commentCells, 1);
  assert.equal(analysis.sheets[0].hyperlinkCells, 1);
  assert.equal(analysis.sheets[0].bloatedRange, true);
  assert.equal(analysis.total.hiddenSheets, 1);
}

{
  const workbook = makeWorkbook();
  const result = OptimizeOps.optimizeWorkbook(XLSX, workbook, {
    mode: "values",
    removeComments: true,
    removeLinks: true,
    removeMerges: true,
    removeHiddenSheets: false,
  });
  const sheet = result.workbook.Sheets["Oracle Data"];
  assert.equal(sheet[1][3].v, 200);
  assert.equal(sheet[1][3].f, undefined);
  assert.equal(sheet[1][1].c, undefined);
  assert.equal(sheet[2][1].l, undefined);
  assert.equal(sheet["!merges"], undefined);
  assert.equal(sheet["!ref"], "A1:D5");
  assert.equal(result.stats.sourceCells, result.stats.copiedSourceCells);
  assert.equal(result.stats.formulasAfter, 0);
  assert.deepEqual(result.workbook.SheetNames, ["Oracle Data", "Hidden Raw"]);
}

{
  const workbook = makeWorkbook();
  const result = OptimizeOps.optimizeWorkbook(XLSX, workbook, {
    mode: "safe",
    removeComments: false,
    removeLinks: false,
    removeMerges: false,
    removeHiddenSheets: true,
  });
  const sheet = result.workbook.Sheets["Oracle Data"];
  assert.equal(sheet[1][3].f, "C2*2");
  assert.equal(sheet[1][1].c[0].t, "comment");
  assert.equal(sheet[2][1].l.Target, "https://example.com");
  assert.equal(sheet["!merges"].length, 1);
  assert.deepEqual(result.workbook.SheetNames, ["Oracle Data"]);
  assert.equal(result.stats.hiddenSheetsRemoved, 1);
  assert.equal(result.stats.sourceCells, result.stats.copiedSourceCells);
}

{
  const workbook = makeWorkbook();
  const split = OptimizeOps.splitWorkbookByRows(XLSX, workbook, {
    mode: "values",
    chunkSize: 2,
    preserveHeader: true,
    removeHiddenSheets: true,
  });
  assert.equal(split.outputs.length, 2);
  assert.equal(split.outputs[0].workbook.Sheets["Oracle Data"][0][0].v, "ID");
  assert.equal(split.outputs[1].workbook.Sheets["Oracle Data"][0][0].v, "ID");
  assert.equal(split.outputs[0].rowCount, 2);
  assert.equal(split.outputs[1].rowCount, 2);
  assert.equal(split.stats.sourceCells, split.stats.copiedSourceCells);
  assert.equal(split.stats.repeatedHeaderRows, 1);
}

console.log("OptimizeOps tests passed.");
