const assert = require("node:assert/strict");
const XLSX = require("xlsx");
const Ops = require("../public/budget-builder-ops.js");

assert.equal(Ops.parseAmount("45,000,000 บาท"), 45000000);
assert.equal(Ops.detectProvince("ทล. 1020 ตอน โป่งเกลือ - บ้านปล้อง จ.เชียงราย"), "เชียงราย");
assert.equal(Ops.detectProvince("ปรับปรุงทาง จ.กาแพงเพชร"), "กำแพงเพชร");
assert.equal(Ops.classifyCategory("งานบำรุงตามกำหนดเวลา"), "Maintenance");
assert.equal(Ops.classifyCategory("งานก่อสร้างเพิ่มประสิทธิภาพทางหลวง"), "Construction");

const matrix = [
  ["— หน้า 1 —"],
  ["กิจกรรมก่อสร้างทางหลวงแผ่นดิน"],
  ["(1) ทล. 42 ตอน นาจวก - ดอนยาง จ.ปัตตานี 1 แห่ง", "45,000,000 บาท"],
  ["กิจกรรมบำรุงรักษาทางหลวง"],
  ["(2) ทล. 225 ตอน น้ำอ้อม - หนองบัวระเหว"],
  ["จ.ชัยภูมิ 1 แห่ง", 30000000],
  ["รวม", 75000000],
];
const rows = Ops.extractProjectsFromMatrix(matrix, {
  agency: "DOH", constructionPercent: 0.6, maintenancePercent: 0.4,
  defaultConstruction: "Constructions HMA (2 layers)-A", defaultMaintenance: "HMA Overlay-A",
  projectRowsOnly: true, roadBudgetOnly: true,
});
assert.equal(rows.length, 2);
assert.equal(rows[0].province, "ปัตตานี");
assert.equal(rows[0].region, "S");
assert.equal(rows[0].annualBudget, 27000000);
assert.equal(rows[1].province, "ชัยภูมิ");
assert.equal(rows[1].category, "Maintenance");
assert.equal(rows[1].workType, "HMA Overlay-A");

const built = Ops.buildWorkbook(XLSX, [["ถนนสาย ชม.5080 แยก ทช.ชม.3005 - ศูนย์พัฒนาโครงการหลวงตีนตก อ.แม่ออน จ.เชียงใหม่", 34000000]], {
  agency: "DOR", constructionPercent: 0.7, maintenancePercent: 0.4,
  defaultConstruction: "Constructions HMA (1 Layer)-A", defaultMaintenance: "HMA Overlay-A",
  projectRowsOnly: true, roadBudgetOnly: false,
});
assert.deepEqual(built.workbook.SheetNames, ["DOR", "Summary", "Validation", "Factor Master", "Region Mapping", "Raw Source"]);
assert.equal(built.report.total, 1);
assert.equal(built.records[0].province, "เชียงใหม่");
assert.equal(built.workbook.Sheets.DOR.J2.f, "I2*H2");
assert.match(built.workbook.Sheets.DOR.L2.f, /VLOOKUP/);
assert.equal(built.workbook.Sheets["Factor Master"].A2.v, "Constructions HMA (2 layers)-A");
console.log("BudgetBuilderOps tests passed.");

const filtered = Ops.extractProjectsFromMatrix([
  ["-เพื่อกำหนดการพัฒนาโครงข่ายทางหลวง จ.พระนครศรีอยุธยา", "134,871,325,200 บาท"],
  ["(1) ค่าชดเชยอสังหาริมทรัพย์ในการเวนคืนที่ดินทางหลวงพิเศษ 1 รายการ", "924,801,300 บาท"],
  ["(2) ก่อสร้าง ทล. 2 ตอน สีคิ้ว - ปากช่อง จ.นครราชสีมา 1 แห่ง", "120,000,000 บาท"],
], {
  agency: "DOH", constructionPercent: 0.6, maintenancePercent: 0.4,
  defaultConstruction: "Constructions HMA (2 layers)-A", defaultMaintenance: "HMA Overlay-A",
  projectRowsOnly: true, roadBudgetOnly: true,
});
assert.equal(filtered.length, 1);
assert.match(filtered[0].description, /ทล\. 2/);
console.log("BudgetBuilder filtering regression passed.");
