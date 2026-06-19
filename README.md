const assert = require("node:assert/strict");
const XLSX = require("xlsx");
const ExcelOps = require("../public/excel-ops.js");

function workbook(sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), name);
  }
  return wb;
}

const inputA = {
  name: "North.xlsx",
  workbook: workbook({ Sales: [["ID", "Amount"], [1, 100]], Summary: [["ID", "Amount"], [99, 100]] }),
};
const inputB = {
  name: "South.xlsx",
  workbook: workbook({ Sales: [["ID", "Amount"], [2, 200]], Extra: [["ID", "Note"], [3, "OK"]] }),
};

const merged = ExcelOps.mergeWorkbooks(XLSX, [inputA, inputB]);
assert.equal(merged.SheetNames.length, 4);
assert.equal(new Set(merged.SheetNames.map((x) => x.toLowerCase())).size, 4);

const combined = ExcelOps.combineWorkbooks(XLSX, [inputA, inputB], {
  useHeader: true,
  addSourceColumns: true,
});
const combinedRows = XLSX.utils.sheet_to_json(combined.Sheets["Combined Data"], { header: 1 });
assert.deepEqual(combinedRows[0], ["Source File", "Source Sheet", "ID", "Amount", "Note"]);
assert.equal(combinedRows.length, 5);

const split = ExcelOps.splitWorkbook(XLSX, inputA);
assert.equal(split.length, 2);
assert.equal(split[0].workbook.SheetNames.length, 1);
assert.ok(split[0].fileName.endsWith(".xlsx"));

assert.equal(ExcelOps.sanitizeSheetName("A/B*C?D:E"), "A_B_C_D_E");
console.log("All Excel operation tests passed.");
