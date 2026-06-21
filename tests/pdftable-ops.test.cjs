const assert = require("node:assert/strict");
const T = require("../public/pdftable-ops.js");

function rowItems(y, cols) { return cols.map(([str,x,w]) => ({str,x,y,w:w||str.length*6,h:10})); }

// 1) basic 3-col table
let m = T.buildMatrixFromItems([
  ...rowItems(100, [["Item",10],["Qty",100],["Price",200]]),
  ...rowItems(80,  [["Cement",10],["5",100],["250",200]]),
]);
assert.deepEqual(m, [["Item","Qty","Price"],["Cement","5","250"]]);
console.log("✅ 1 basic table");

// 2) multi-word cell merges (close words)
m = T.buildMatrixFromItems([
  {str:"First",x:10,y:50,w:20,h:10},{str:"Name",x:33,y:50,w:20,h:10},{str:"Value",x:120,y:50,w:25,h:10},
]);
assert.deepEqual(m, [["First Name","Value"]]);
console.log("✅ 2 multi-word cell join");

// 3) spurious column rejection: a stray note at unique x should NOT add a column
m = T.buildMatrixFromItems([
  ...rowItems(100, [["Item",10],["Qty",100],["Price",200]]),
  ...rowItems(85,  [["Cement",10],["5",100],["250",200]]),
  ...rowItems(70,  [["Sand",10],["10",100],["300",200]]),
  ...rowItems(55,  [["(*) note",150]]),               // stray, unique x=150, appears once
]);
assert.equal(m[0].length, 3, "should stay 3 columns, got "+m[0].length);
console.log("✅ 3 spurious column rejected (stays 3 cols)");

// 4) paragraph line collapses to one cell (not exploded)
m = T.buildMatrixFromItems([
  {str:"The",x:10,y:50,w:18,h:10},{str:"quick",x:31,y:50,w:28,h:10},{str:"brown",x:62,y:50,w:30,h:10},{str:"fox",x:95,y:50,w:18,h:10},
]);
assert.equal(m.length, 1);
assert.equal(m[0][0], "The quick brown fox");
console.log("✅ 4 paragraph collapses to single cell");

// 5) grid-line boundaries mode (most accurate)
m = T.buildMatrixFromItems([
  ...rowItems(100, [["A",12],["B",112],["C",212]]),
  ...rowItems(80,  [["1",12],["2",112],["3",212]]),
], { columnBoundaries: [5, 100, 200, 300] }); // 3 columns from 4 separators
assert.deepEqual(m, [["A","B","C"],["1","2","3"]]);
console.log("✅ 5 grid-line boundaries mode");

console.log("ALL PDF-TABLE TESTS PASSED");
