"use strict";

/*
 * Web Worker สำหรับเมนู 08
 * แยกงานอ่าน/วิเคราะห์/เขียนไฟล์ขนาดใหญ่ออกจาก Main Thread
 * เพื่อให้ปุ่ม ยกเลิก, Progress และหน้าจอยังคงตอบสนองระหว่างประมวลผล
 */
importScripts(
  "./vendor/xlsx.full.min.js?v=3.3.1",
  "./vendor/jszip.min.js?v=3.3.1",
  "./optimize-ops.js?v=3.3.1"
);

function postProgress(message, progress) {
  self.postMessage({ type: "progress", message, progress });
}

// อ่านแบบ Dense Array เพื่อลดค่าใช้จ่ายของ Cell Address Object ในไฟล์หลายหมื่นแถว
function readWorkbook(buffer) {
  return XLSX.read(buffer, {
    type: "array",
    dense: true,
    cellFormula: true,
    cellDates: true,
    cellNF: true,
    cellStyles: false,
    cellText: false,
    bookVBA: false,
  });
}

function writeWorkbook(workbook) {
  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    compression: true,
    cellStyles: false,
  });
}

function csvBytes(worksheet) {
  const csv = `\uFEFF${XLSX.utils.sheet_to_csv(worksheet, { FS: ",", RS: "\r\n", blankrows: true })}`;
  return new TextEncoder().encode(csv);
}

async function zipFiles(files) {
  const zip = new JSZip();
  files.forEach((file) => zip.file(file.name, file.bytes));
  return zip.generateAsync(
    { type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (metadata) => postProgress(`กำลังสร้าง ZIP ${metadata.percent.toFixed(0)}%`, 82 + metadata.percent * 0.16)
  );
}

function safePartName(baseName, sheetName, part, extension) {
  const cleanSheet = OptimizeOps.sanitizeFilename(sheetName, "Sheet");
  return `${baseName}_${cleanSheet}_Part_${String(part).padStart(2, "0")}.${extension}`;
}

// เลือก Pipeline ตาม Output: XLSX/CSV และแบบไฟล์เดียว/แบ่งหลาย Part
async function processOptimize(payload) {
  const { buffer, fileName, fileSize, options } = payload;
  postProgress("กำลังอ่านโครงสร้าง Workbook...", 8);
  const workbook = readWorkbook(buffer);
  const baseName = OptimizeOps.sanitizeFilename(OptimizeOps.basename(fileName), "optimized");

  if (options.splitEnabled) {
    postProgress("กำลังแบ่งข้อมูลตามจำนวนแถว...", 18);
    const split = OptimizeOps.splitWorkbookByRows(
      XLSX,
      workbook,
      { ...options, fileSize },
      (done, _total, label) => postProgress(`กำลังสร้าง ${label}`, Math.min(72, 20 + done * 3))
    );

    const files = [];
    for (let index = 0; index < split.outputs.length; index += 1) {
      const item = split.outputs[index];
      postProgress(`กำลังเขียนไฟล์ ${index + 1}/${split.outputs.length}`, 55 + ((index + 1) / split.outputs.length) * 24);
      if (options.outputFormat === "csv") {
        const worksheet = item.workbook.Sheets[item.workbook.SheetNames[0]];
        files.push({ name: safePartName(baseName, item.sheetName, item.part, "csv"), bytes: csvBytes(worksheet) });
      } else {
        files.push({ name: safePartName(baseName, item.sheetName, item.part, "xlsx"), bytes: writeWorkbook(item.workbook) });
      }
    }

    const zipBuffer = await zipFiles(files);
    const report = OptimizeOps.makeReport(split.before, null, split.stats, zipBuffer.byteLength, files.length);
    return {
      fileName: `${baseName}_split.zip`,
      mime: "application/zip",
      buffer: zipBuffer,
      report,
    };
  }

  postProgress("กำลังสร้าง Workbook ใหม่จากข้อมูลจริง...", 18);
  const optimized = OptimizeOps.optimizeWorkbook(
    XLSX,
    workbook,
    { ...options, fileSize },
    (done, total, sheetName) => postProgress(`กำลัง Optimize: ${sheetName}`, 20 + (done / total) * 46)
  );

  if (options.outputFormat === "csv") {
    const files = optimized.workbook.SheetNames.map((sheetName) => ({
      name: `${baseName}_${OptimizeOps.sanitizeFilename(sheetName, "Sheet")}.csv`,
      bytes: csvBytes(optimized.workbook.Sheets[sheetName]),
    }));

    let outputBuffer;
    let outputName;
    let mime;
    if (files.length === 1) {
      outputBuffer = files[0].bytes.buffer.slice(files[0].bytes.byteOffset, files[0].bytes.byteOffset + files[0].bytes.byteLength);
      outputName = `${baseName}_optimized.csv`;
      mime = "text/csv;charset=utf-8";
    } else {
      outputBuffer = await zipFiles(files);
      outputName = `${baseName}_csv.zip`;
      mime = "application/zip";
    }
    const after = OptimizeOps.analyzeWorkbook(XLSX, optimized.workbook, outputBuffer.byteLength);
    const csvStats = { ...optimized.stats, formulasAfter: 0 };
    const report = OptimizeOps.makeReport(optimized.before, after, csvStats, outputBuffer.byteLength, files.length);
    return { fileName: outputName, mime, buffer: outputBuffer, report };
  }

  postProgress("กำลังบีบอัดและเขียนไฟล์ XLSX...", 74);
  const outputBuffer = writeWorkbook(optimized.workbook);
  const after = OptimizeOps.analyzeWorkbook(XLSX, optimized.workbook, outputBuffer.byteLength);
  const report = OptimizeOps.makeReport(optimized.before, after, optimized.stats, outputBuffer.byteLength, 1);
  return {
    fileName: `${baseName}_optimized.xlsx`,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: outputBuffer,
    report,
  };
}

self.onmessage = async (event) => {
  const payload = event.data || {};
  try {
    if (payload.action === "analyze") {
      postProgress("กำลังวิเคราะห์ไฟล์ใน Web Worker...", 10);
      const workbook = readWorkbook(payload.buffer);
      postProgress("กำลังตรวจจำนวนแถว เซลล์ สูตร และช่วงข้อมูล...", 55);
      const analysis = OptimizeOps.analyzeWorkbook(XLSX, workbook, payload.fileSize || 0);
      self.postMessage({ type: "analysis", analysis });
      return;
    }

    if (payload.action === "optimize") {
      const result = await processOptimize(payload);
      self.postMessage({ type: "result", ...result }, [result.buffer]);
      return;
    }

    throw new Error("คำสั่ง Web Worker ไม่ถูกต้อง");
  } catch (error) {
    self.postMessage({ type: "error", message: error && error.message ? error.message : "ไม่สามารถประมวลผลไฟล์ได้" });
  }
};
