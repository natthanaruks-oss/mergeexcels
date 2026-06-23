const assert = require("node:assert/strict");
const T = require("../public/pdftable-ops.js");
const rows = (y, cols) => cols.map(([str, x, w]) => ({ str, x, y, w: w == null ? str.length * 6 : w, h: 10 }));

// 1) basic table (every row 3 cells -> table mode)
let m = T.buildMatrixFromItems([
  ...rows(100, [["Item", 10], ["Qty", 100], ["Price", 200]]),
  ...rows(80, [["Cement", 10], ["5", 100], ["250", 200]]),
]);
assert.deepEqual(m, [["Item", "Qty", "Price"], ["Cement", "5", "250"]]);
console.log("✅ 1 basic table");

// 2) THAI combining glyphs must glue without spaces
// base ส(x10 w8) + ั(x10 w0 overlap) + ง(x18 w8) + เ(x26 w8) + ข(x34) + ป(x42)
m = T.buildMatrixFromItems([
  { str: "ส", x: 10, y: 50, w: 8, h: 10 },
  { str: "ั", x: 10, y: 50, w: 0, h: 10 },
  { str: "ง", x: 18, y: 50, w: 8, h: 10 },
  { str: "เ", x: 26, y: 50, w: 8, h: 10 },
  { str: "ข", x: 34, y: 50, w: 8, h: 10 },
  { str: "ป", x: 42, y: 50, w: 8, h: 10 },
]);
assert.equal(m[0][0], "สังเขป", "got: " + m[0][0]);
console.log("✅ 2 Thai glyphs glued -> สังเขป");

// 3) real word space preserved
m = T.buildMatrixFromItems([
  { str: "Hello", x: 10, y: 50, w: 30, h: 10 },
  { str: "World", x: 46, y: 50, w: 30, h: 10 },
]);
assert.equal(m[0][0], "Hello World");
console.log("✅ 3 word space preserved");

// 4) PROSE document -> single column (not exploded)
const prose = [];
for (let i = 0; i < 10; i++) prose.push(...rows(200 - i * 12, [["บรรทัดข้อความยาวๆ" + i, 10 + (i % 3) * 4]]));
m = T.buildMatrixFromItems(prose);
assert.equal(m[0].length, 1, "prose should be 1 column, got " + m[0].length);
console.log("✅ 4 prose -> single column (cols=" + m[0].length + ")");

// 5) column cap respected on messy data
const messy = [];
for (let r = 0; r < 20; r++) {
  const cells = [];
  for (let c = 0; c < 40; c++) cells.push(["v", 10 + c * 30]);
  messy.push(...rows(500 - r * 12, cells));
}
m = T.buildMatrixFromItems(messy);
assert.ok(m[0].length <= 16, "capped at 16, got " + m[0].length);
console.log("✅ 5 column cap (cols=" + m[0].length + ")");

// 6) grid boundaries mode still works
m = T.buildMatrixFromItems([
  ...rows(100, [["A", 12], ["B", 112], ["C", 212]]),
  ...rows(80, [["1", 12], ["2", 112], ["3", 212]]),
], { columnBoundaries: [5, 100, 200, 300] });
assert.deepEqual(m, [["A", "B", "C"], ["1", "2", "3"]]);
console.log("✅ 6 grid-line mode");

// 7) Thai<->Latin/digit boundary gets a space; pure-Thai stays glued
m = T.buildMatrixFromItems(rows(100, [["แก้ไขworkflow", 12]]));
assert.equal(m[0][0], "แก้ไข workflow", "thai-latin space, got " + m[0][0]);
m = T.buildMatrixFromItems(rows(100, [["เวอร์ชัน1.9", 12]]));
assert.equal(m[0][0], "เวอร์ชัน 1.9", "thai-digit space, got " + m[0][0]);
m = T.buildMatrixFromItems(rows(100, [["สังเขป", 12]]));
assert.equal(m[0][0], "สังเขป", "pure thai unchanged, got " + m[0][0]);
console.log("✅ 7 thai-latin spacing");

// 8) wrapped rows merge up into the row carrying the amount
m = T.mergeWrappedRows([
  ["(1) รถยุทธ ขนาด 2,300 ซีซี", ""],
  ["ไม่ต่ำกว่า 120 กิโลวัตต์", ""],
  ["ด้านการจราจร กก.1 (สระบุรี) 1 คัน", "2,353,000 บาท"],
  ["(2) รถยุทธ", ""],
  ["กก.2 (นครปฐม) 1 คัน", "2,353,000 บาท"],
]);
assert.equal(m.length, 2, "merged to 2 rows, got " + m.length);
assert.ok(m[0][0].includes("กก.1") && m[0][0].includes("120"), "row1 merged desc");
assert.equal(m[0][1], "2,353,000 บาท", "row1 amount kept");
console.log("✅ 8 wrapped-row merge (rows=" + m.length + ")");

// 9) non-amount table is left untouched
const keepRows = [["Date", "Author", "Ver", "Change"], ["A", "B", "1.0", "x"], ["", "", "", "y"]];
m = T.mergeWrappedRows(keepRows);
assert.equal(m.length, 3, "non-amount table unchanged, got " + m.length);
console.log("✅ 9 non-amount table untouched");

console.log("ALL PDF-TABLE TESTS PASSED");

// 10) detached nikhahit from PDF must be reattached to nearby า as สระอำ
// Simulates PDF.js returning the whole word as one item and a zero-width \u0E4D glyph above it.
const brokenSaraAm = "งานบารุงตามกาหนดเวลา";
const baseX = 10;
const baseW = brokenSaraAm.length * 8;
const markAt = (charIndex) => ({
  str: "\u0E4D",
  x: baseX + (baseW / brokenSaraAm.length) * (charIndex + 0.15),
  y: 61,
  w: 0,
  h: 4,
});
m = T.buildMatrixFromItems([
  { str: brokenSaraAm, x: baseX, y: 50, w: baseW, h: 10 },
  markAt(brokenSaraAm.indexOf("บา") + 1),
  markAt(brokenSaraAm.indexOf("กา") + 1),
]);
assert.equal(m[0][0], "งานบำรุงตามกำหนดเวลา", "detached sara-am repair, got " + m[0][0]);
assert.ok(!m.flat().join(" ").includes("\u0E4D"), "detached nikhahit must not remain as stray cell");
console.log("✅ 10 detached sara-am glyph repaired");
