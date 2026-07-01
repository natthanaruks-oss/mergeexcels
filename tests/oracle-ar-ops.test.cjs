const assert = require("node:assert/strict");
const XLSX = require("xlsx");
const OracleArOps = require("../public/oracle-ar-ops.js");

function makeStatementWorkbook() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Ravana 1020 Co., Ltd.", "", "ใบแจ้งยอดบัญชี/ Statement of Account", "Page:1/1"],
    ["118/1 Rama 6 Road", "", "เลขประจำตัวผู้เสียภาษี : 0105538137235", ""],
  ]), "Sheet1");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["รหัสลูกค้า: 100001", "รายงานยอดหนี้ค้างชำระ ณ วันที่  01-Jan-2026 ถึง 30-Jun-2026"],
    ["บจก.ทดสอบ/ลูกค้า", "Payment Term: 31 Invoice 1-30 Due End of next month"],
    ["กรุงเทพมหานคร", "Currency:THB"],
    ["Fax :", ""],
  ]), "Sheet2");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Date", "Due Date", "Document No.", "Description", "Reference", "Amount", "UOM", "Payment Method", "Purchase/Dr Noted", "Payment/Cr Noted", "Balance"],
    ["วันที่", "วันครบกำหนด", "เลขที่เอกสาร", "รายการ", "เอกสารอ้างอิง", "จำนวน", "หน่วย", "ชำระโดย", "ยอดซื้อ/เพิ่มหนี้", "ชำระโดย/ลดหนี้", "คงเหลือ"],
    ["01-JAN-26", "", "", "ยอดคงเหลือยกมา", "", "", "", "", "", "", "0.00"],
    ["01-FEB-26", "28-FEB-26", "INV001", "สินค้า A", "REF1", "10", "Ton", "", "1,000.00", "", "1,000.00"],
    ["02-FEB-26", "28-FEB-26", "ADV001", "ADVANCE RECEIPT", "REF2", "", "", "", "-1,000.00", "", "1,000.00"],
    ["03-FEB-26", "", "RCPT001", "Receipt-TT", "BANK", "", "", "TT", "", "1,000.00", "0.00"],
    ["", "", "", "ยอดคงเหลือไปเดือนหน้า", "", "", "", "", "", "", "0.00"],
  ]), "Sheet3");
  return wb;
}

const wb = makeStatementWorkbook();
const parsed = OracleArOps.parseWorkbook(XLSX, wb, "sample.xls");
assert.equal(parsed.analysis.customers, 1);
assert.equal(parsed.analysis.statements, 1);
assert.equal(parsed.analysis.transactionRows, 3);
assert.equal(parsed.analysis.exceptions, 0);
assert.equal(parsed.statements[0].paymentTerm, "31 Invoice 1-30 Due End of next month");
assert.equal(parsed.statements[0].debitTotal, 1000);
assert.equal(parsed.statements[0].creditTotal, 1000);
assert.equal(parsed.statements[0].closingBalance, 0);
assert.equal(parsed.statements[0].rows[2].effectiveDebit, 0);
assert.equal(parsed.statements[0].rows[3].effectiveCredit, 1000);

const output = OracleArOps.buildOutputWorkbook(XLSX, parsed, {
  createCustomerSheets: true,
  includeAllTransactions: true,
  includeOpeningClosing: true,
  includeExceptions: true,
});
assert.deepEqual(output.workbook.SheetNames.slice(0, 4), ["Customer Index", "Customer Summary", "All Transactions", "Exceptions"]);
assert.equal(output.workbook.SheetNames.length, 5);
assert.ok(output.workbook.SheetNames[4].startsWith("100001_"));
assert.ok(output.workbook.SheetNames[4].length <= 31);
assert.equal(output.report.customers, 1);
assert.equal(output.report.outputSheets, 5);

console.log("Oracle AR Ops tests passed.");
