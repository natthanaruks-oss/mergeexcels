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
  agency: "DOH", constructionPercent: 0.6, maintenancePercent: 0.8,
  defaultConstruction: "Constructions HMA (2 layers)-A", defaultMaintenance: "HMA Overlay-A",
  projectRowsOnly: true, roadBudgetOnly: true,
});
assert.equal(rows.length, 2);
assert.equal(rows[0].province, "ปัตตานี");
assert.equal(rows[0].region, "S");
assert.equal(rows[0].annualBudget, 27000000);
assert.equal(rows[1].province, "ชัยภูมิ");
assert.equal(rows[1].category, "Maintenance");
assert.equal(rows[1].suggestedFamily, "Recycling HMA");
assert.equal(rows[1].workType, "Recycling HMA-A");
assert.equal(rows[1].historicalBand, "Medium");
assert.equal(rows[1].workTypeConfirmed, false);
assert.match(rows[1].status, /ยังไม่ยืนยันประเภทงาน/);

const built = Ops.buildWorkbook(XLSX, [["ถนนสาย ชม.5080 แยก ทช.ชม.3005 - ศูนย์พัฒนาโครงการหลวงตีนตก อ.แม่ออน จ.เชียงใหม่", 34000000]], {
  agency: "DOR", constructionPercent: 0.7, maintenancePercent: 0.8,
  defaultConstruction: "Constructions HMA (1 Layer)-A", defaultMaintenance: "HMA Overlay-A",
  projectRowsOnly: true, roadBudgetOnly: false,
});
assert.deepEqual(built.workbook.SheetNames, ["DOR", "Summary", "Validation", "Factor Master", "Historical Rules", "WorkType Master", "Audit Log", "Region Mapping", "Raw Source"]);
assert.equal(built.report.total, 1);
assert.equal(built.records[0].province, "เชียงใหม่");
assert.equal(built.workbook.Sheets["Factor Master"].A2.v, "Constructions HMA (2 layers)-A");
const dorSheet = built.workbook.Sheets.DOR;
assert.ok(Object.values(dorSheet).filter((cell) => cell && typeof cell === "object").every((cell) => !cell.f), "main output must be Values Only");
assert.equal(dorSheet.B9.v, "Construction");
assert.equal(dorSheet.H11.v, "Constructions HMA (1 Layer)-A");
console.log("BudgetBuilderOps tests passed.");

const filtered = Ops.extractProjectsFromMatrix([
  ["-เพื่อกำหนดการพัฒนาโครงข่ายทางหลวง จ.พระนครศรีอยุธยา", "134,871,325,200 บาท"],
  ["(1) ค่าชดเชยอสังหาริมทรัพย์ในการเวนคืนที่ดินทางหลวงพิเศษ 1 รายการ", "924,801,300 บาท"],
  ["(2) ก่อสร้าง ทล. 2 ตอน สีคิ้ว - ปากช่อง จ.นครราชสีมา 1 แห่ง", "120,000,000 บาท"],
], {
  agency: "DOH", constructionPercent: 0.6, maintenancePercent: 0.8,
  defaultConstruction: "Constructions HMA (2 layers)-A", defaultMaintenance: "HMA Overlay-A",
  projectRowsOnly: true, roadBudgetOnly: true,
});
assert.equal(filtered.length, 1);
assert.match(filtered[0].description, /ทล\. 2/);
console.log("BudgetBuilder filtering regression passed.");

const defaultMaintenance = Ops.extractProjectsFromMatrix([
  ["กิจกรรมบำรุงรักษาทางหลวง"],
  ["(1) งานบำรุง ทล. 1 ตอน ตัวอย่าง จ.นครสวรรค์ 1 แห่ง", "10,000,000 บาท"],
], { agency: "DOH", projectRowsOnly: true, roadBudgetOnly: true });
assert.equal(defaultMaintenance.length, 1);
assert.equal(defaultMaintenance[0].percent, 0.8);
assert.equal(defaultMaintenance[0].annualBudget, 8000000);
assert.equal(defaultMaintenance[0].suggestedFamily, "Recycling HMA");
assert.equal(defaultMaintenance[0].historicalSupport, 3067);
console.log("BudgetBuilder maintenance 80% default regression passed.");



const manual = Ops.calculateRecord(rows[0], { agency: "DOH", workType: "Recycling HMA-A", confirmed: true, selectionSource: "Manual selection" });
assert.equal(manual.workType, "Recycling HMA-A");
assert.equal(manual.status, "Ready");
assert.ok(manual.area > 0);
const valuesOnly = Ops.buildWorkbookFromRecords(XLSX, [manual], { agency: "DOH", rawMatrix: matrix });
for (const sheetName of valuesOnly.workbook.SheetNames) {
  const sheet = valuesOnly.workbook.Sheets[sheetName];
  for (const [address, cell] of Object.entries(sheet)) {
    if (address[0] === "!") continue;
    assert.ok(!cell.f, `${sheetName}!${address} must not contain formulas`);
  }
}
console.log("BudgetBuilder manual Work Type + Values Only regression passed.");

const highRule = Ops.historicalSuggestion("DOH", "งานบำรุงพิเศษและบูรณะ", "ทล. 1 ตอน ตัวอย่าง", "Maintenance", { maintenance: "HMA Overlay-A" });
assert.equal(highRule.family, "Recycling HMA");
assert.equal(highRule.band, "High");
assert.equal(highRule.support, 1301);
assert.ok(highRule.suggestedWorkType.startsWith("Recycling HMA"));
const audit = valuesOnly.workbook.Sheets["Audit Log"];
assert.equal(audit.L2.v, "Yes");
assert.equal(audit.N2.v, "Manual selection");
console.log("BudgetBuilder historical rule + audit regression passed.");
