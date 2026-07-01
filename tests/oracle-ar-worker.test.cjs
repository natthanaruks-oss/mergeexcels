const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const XLSX = require("xlsx");
const OracleArOps = require("../public/oracle-ar-ops.js");

global.XLSX = XLSX;
global.OracleArOps = OracleArOps;
global.importScripts = () => {};
global.self = global;

const messages = [];
self.postMessage = (message) => messages.push(message);
vm.runInThisContext(fs.readFileSync(require.resolve("../public/oracle-ar-worker.js"), "utf8"), { filename: "oracle-ar-worker.js" });

function makeBuffer() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Ravana 1020 Co., Ltd.", "", "Statement of Account", "Page:1/1"],
    ["Address", "", "Tax.ID: 0105538137235", ""],
  ]), "Sheet1");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["รหัสลูกค้า: 100001", "รายงานยอดหนี้ค้างชำระ ณ วันที่ 01-Jan-2026 ถึง 30-Jun-2026"],
    ["Customer A", "Payment Term: Cash"],
    ["Bangkok", "Currency:THB"],
  ]), "Sheet2");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Date", "Due Date", "Document No.", "Description", "Reference", "Amount", "UOM", "Payment Method", "Purchase/Dr Noted", "Payment/Cr Noted", "Balance"],
    ["วันที่", "", "", "", "", "", "", "", "", "", ""],
    ["01-JAN-26", "", "", "ยอดคงเหลือยกมา", "", "", "", "", "", "", "0.00"],
    ["01-FEB-26", "", "INV001", "Product", "REF", "1", "Ton", "", "500.00", "", "500.00"],
    ["", "", "", "ยอดคงเหลือไปเดือนหน้า", "", "", "", "", "", "", "500.00"],
  ]), "Sheet3");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function send(payload) {
  messages.length = 0;
  await self.onmessage({ data: payload });
  const error = messages.find((message) => message.type === "error");
  if (error) throw new Error(error.message);
  return messages;
}

(async () => {
  const source = makeBuffer();
  let result = await send({ action: "analyze", buffer: source.slice(0), fileName: "oracle.xls" });
  const analysis = result.find((message) => message.type === "analysis");
  assert.equal(analysis.analysis.customers, 1);
  assert.equal(analysis.analysis.statements, 1);
  assert.equal(analysis.analysis.transactionRows, 1);

  result = await send({
    action: "clean",
    buffer: source.slice(0),
    fileName: "oracle.xls",
    options: { createCustomerSheets: true, includeAllTransactions: true, includeOpeningClosing: true, includeExceptions: true },
  });
  const output = result.find((message) => message.type === "result");
  assert.ok(output);
  assert.equal(output.report.customers, 1);
  const readback = XLSX.read(output.buffer, { type: "array" });
  assert.ok(readback.SheetNames.includes("Customer Index"));
  assert.ok(readback.SheetNames.includes("Customer Summary"));
  assert.ok(readback.SheetNames.includes("All Transactions"));
  assert.equal(readback.SheetNames.length, 5);

  console.log("Oracle AR Worker tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
