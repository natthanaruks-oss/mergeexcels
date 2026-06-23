const assert = require("assert");
const TC = require("../public/text-correct.js");

// 1) strip replacement char + thai-digit spacing
assert.equal(TC.correctThai("(ตอนที่\uFFFD1)"), "(ตอนที่ 1)");
assert.equal(TC.correctThai("บ้านช\uFFFDำแขวง"), "บ้านชำแขวง");
console.log("✅ 1 strip artifacts");

// 2) sara am recompose (ํา -> ำ)
assert.equal(TC.correctThai("น\u0E49\u0E4D\u0E32"), "น\u0E49\u0E33");
assert.equal(TC.correctThai("บา\u0E4Dรุง"), "บำรุง");
console.log("✅ 2 sara-am recompose (both glyph orders)");

// 3) tone-mark / upper-vowel swap
assert.equal(TC.correctThai("ก\u0E48\u0E34"), "ก\u0E34\u0E48");
console.log("✅ 3 tone/vowel reorder");

// 4) thai-latin spacing
assert.equal(TC.correctThai("แก้ไขworkflow"), "แก้ไข workflow");
console.log("✅ 4 thai-latin spacing");

// 5) pure thai unchanged
assert.equal(TC.correctThai("สังเขป"), "สังเขป");
console.log("✅ 5 pure thai unchanged");

// 6) gov pattern: บก.ทล. spacing normalized
assert.equal(TC.correctThai("บก . ทล ."), "บก.ทล.");
console.log("✅ 6 gov pattern");

// 7) disabled risky rule stays off by default (2-25 NOT changed)
assert.ok(TC.correctThai("Apr 30, 2-25").includes("2-25"), "risky rule off by default");
console.log("✅ 7 risky rule off");

// 8) road pack: glued จ.<province> gets a space (validated by gazetteer)
const RC = require("../public/thai-roads-config.js");
assert.equal(RC.applyRoad("ตอนเชียงม่วนจ.พะเยา"), "ตอน เชียงม่วน จ.พะเยา");
assert.equal(RC.applyRoad("บางเสด็จจ.พระนครศรีอยุธยา"), "บางเสด็จ จ.พระนครศรีอยุธยา");
assert.equal(RC.applyRoad("ตอนบ้านถำอ.เชียงคำ"), "ตอน บ้านถำ อ.เชียงคำ");
assert.equal(RC.applyRoad("ผิวทางต.บางพระ"), "ผิวทาง ต.บางพระ");
assert.equal(RC.applyRoad("งานสะพานอ.เชียงคำ"), "งานสะพาน อ.เชียงคำ");
assert.equal(RC.applyRoad("ปรับปรุงผิวทางต.บางพระ"), "ปรับปรุงผิวทาง ต.บางพระ");
assert.equal(RC.applyRoad("ตอนพุนพินจ.สุราษฎร์ธานี"), "ตอน พุนพิน จ.สุราษฎร์ธานี");
assert.equal(RC.PROVINCES.length, 77, "province gazetteer must contain 77 entries");
assert.ok(RC.PROVINCES.includes("สุราษฎร์ธานี"), "canonical Surat Thani spelling missing");
console.log("✅ 8 road: จ./อ./ต. gazetteer spacing");

// 9) road segment marker: add one space after standalone “ตอน”
assert.equal(
  RC.applyRoad("ตอนเงินฝอยทอง - ทุ่งผักเบี้ย จ.นครสวรรค์ 1 แห่ง"),
  "ตอน เงินฝอยทอง - ทุ่งผักเบี้ย จ.นครสวรรค์ 1 แห่ง"
);
assert.equal(RC.applyRoad("ทล. 42 ตอนนาจวก-ดอนยาง"), "ทล. 42 ตอน นาจวก-ดอนยาง");
assert.equal(TC.correctThai("ตอนเงินฝอยทอง - ทุ่งผักเบี้ย", { roadPack: true }), "ตอน เงินฝอยทอง - ทุ่งผักเบี้ย");
assert.equal(RC.applyRoad("ตอน 2 อ.วังยาง"), "ตอน 2 อ.วังยาง");
// Safety: do not split normal Thai words/phrases that merely contain “ตอน”
assert.equal(RC.applyRoad("ขั้นตอนก่อสร้าง"), "ขั้นตอนก่อสร้าง");
assert.equal(RC.applyRoad("ตอนที่ 2"), "ตอนที่ 2");
assert.equal(RC.applyRoad("ตอนนี้พร้อมใช้งาน"), "ตอนนี้พร้อมใช้งาน");
console.log("✅ 9 road: spacing after standalone ตอน");

console.log("ALL TEXT-CORRECT TESTS PASSED");

// 10) missing sara-am patterns from real road-budget PDF output
assert.equal(
  TC.correctThai("งานบารุงตามกาหนดเวลาและอุปกรณ์อานวยความสะดวกกาลังเครื่องยนต์", { roadPack: true }),
  "งานบำรุงตามกำหนดเวลาและอุปกรณ์อำนวยความสะดวกกำลังเครื่องยนต์"
);
assert.equal(
  TC.correctThai("จ.กาแพงเพชร", { roadPack: true }),
  "จ.กำแพงเพชร"
);
assert.equal(
  TC.correctThai("ระบายน ้าและต ่ากว่า", { roadPack: true }),
  "ระบายน้ำและต่ำกว่า"
);
console.log("✅ 10 road missing Thai marks repaired");
