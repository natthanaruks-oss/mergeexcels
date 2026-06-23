const assert = require("assert");
const TC = require("../public/text-correct.js");

// 1) strip replacement char + thai-digit spacing
assert.equal(TC.correctThai("(ตอนที่\uFFFD1)"), "(ตอนที่ 1)");
assert.equal(TC.correctThai("บ้านช\uFFFDำแขวง"), "บ้านชำแขวง");
console.log("✅ 1 strip artifacts");

// 2) sara am recompose (ํา -> ำ)
assert.equal(TC.correctThai("น\u0E49\u0E4D\u0E32"), "น\u0E49\u0E33");
console.log("✅ 2 sara-am recompose");

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
assert.equal(RC.applyRoad("ตอนเชียงม่วนจ.พะเยา"), "ตอนเชียงม่วน จ.พะเยา");
assert.equal(RC.applyRoad("บางเสด็จจ.พระนครศรีอยุธยา"), "บางเสด็จ จ.พระนครศรีอยุธยา");
assert.equal(RC.applyRoad("ตอนบ้านถำอ.เชียงคำ"), "ตอนบ้านถำ อ.เชียงคำ");
assert.equal(RC.applyRoad("ผิวทางต.บางพระ"), "ผิวทาง ต.บางพระ");
assert.equal(RC.applyRoad("งานสะพานอ.เชียงคำ"), "งานสะพาน อ.เชียงคำ");
assert.equal(RC.applyRoad("ปรับปรุงผิวทางต.บางพระ"), "ปรับปรุงผิวทาง ต.บางพระ");
assert.equal(RC.applyRoad("ตอนพุนพินจ.สุราษฎร์ธานี"), "ตอนพุนพิน จ.สุราษฎร์ธานี");
assert.equal(RC.PROVINCES.length, 77, "province gazetteer must contain 77 entries");
assert.ok(RC.PROVINCES.includes("สุราษฎร์ธานี"), "canonical Surat Thani spelling missing");
console.log("✅ 8 road: จ./อ./ต. gazetteer spacing");

console.log("ALL TEXT-CORRECT TESTS PASSED");
