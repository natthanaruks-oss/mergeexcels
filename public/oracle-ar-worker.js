"use strict";

/*
 * Web Worker สำหรับ Oracle AR Statement Cleaner
 * อ่าน Oracle BI Publisher HTML .xls และสร้าง Workbook ใหม่แบบ Customer-centric
 * โดยไม่แสดง 1 HTML Table เป็น 1 Excel Sheet เหมือนการอ่านแบบทั่วไป
 */
importScripts(
  "./vendor/xlsx.full.min.js?v=3.6.0",
  "./oracle-ar-ops.js?v=3.6.0"
);

function postProgress(message, progress) {
  self.postMessage({ type: "progress", message, progress });
}

function readWorkbook(buffer) {
  postProgress("กำลังอ่าน Oracle BI Publisher report...", 12);
  return XLSX.read(buffer, {
    type: "array",
    raw: true,
    cellStyles: false,
    cellDates: false,
    cellFormula: false,
    bookVBA: false,
    bookDeps: false,
    bookProps: false,
    WTF: false,
  });
}

function validateOracleReport(workbook) {
  const firstNames = workbook.SheetNames.slice(0, 12);
  const detected = firstNames.some((name) => {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "", blankrows: false });
    return OracleArOps.isStatementHeader(matrix) || OracleArOps.isCustomerHeader(matrix) || OracleArOps.isTransactionTable(matrix);
  });
  if (!detected) {
    throw new Error("ไม่พบโครงสร้าง Oracle AR Statement ในไฟล์นี้ กรุณาใช้ไฟล์ Statement of Account ที่ Export จาก Oracle BI Publisher");
  }
}

function parsePayload(payload) {
  const workbook = readWorkbook(payload.buffer);
  validateOracleReport(workbook);
  postProgress(`ตรวจพบ ${workbook.SheetNames.length.toLocaleString()} ตาราง กำลังรวมเป็นข้อมูลรายลูกค้า...`, 38);
  const parsed = OracleArOps.parseWorkbook(XLSX, workbook, payload.fileName || "");
  if (!parsed.statements.length) throw new Error("ไม่พบ Statement ที่มีตารางรายการในไฟล์");
  return parsed;
}

self.onmessage = async (event) => {
  const payload = event.data || {};
  try {
    if (payload.action === "analyze") {
      const parsed = parsePayload(payload);
      postProgress("วิเคราะห์ข้อมูลรายลูกค้าเรียบร้อย", 100);
      self.postMessage({
        type: "analysis",
        analysis: {
          ...parsed.analysis,
          sourceTables: parsed.sourceTables,
        },
      });
      return;
    }

    if (payload.action === "clean") {
      const parsed = parsePayload(payload);
      postProgress("กำลังสร้าง Customer Index และ Customer Summary...", 58);
      const result = OracleArOps.buildOutputWorkbook(XLSX, parsed, payload.options || {});
      postProgress(`กำลังสร้าง ${result.report.outputSheets.toLocaleString()} Sheets และบีบอัดไฟล์...`, 82);
      const outputBuffer = XLSX.write(result.workbook, {
        type: "array",
        bookType: "xlsx",
        compression: true,
        cellStyles: true,
      });
      self.postMessage({
        type: "result",
        fileName: `${String(payload.fileName || "Oracle_AR_Statement").replace(/\.[^.]+$/, "")}_Clean_By_Customer.xlsx`,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: outputBuffer,
        report: result.report,
      }, [outputBuffer]);
      return;
    }

    throw new Error("คำสั่ง Oracle AR Worker ไม่ถูกต้อง");
  } catch (error) {
    self.postMessage({ type: "error", message: error && error.message ? error.message : "ไม่สามารถแปลง Oracle AR Statement ได้" });
  }
};
