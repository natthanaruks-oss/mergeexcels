(() => {
  "use strict";

  const EXCEL_ACCEPT = ".xlsx,.xls,.xlsm,.xlsb";
  const PDF_ACCEPT = ".pdf";

  const MODES = {
    mergeExcel: {
      kind: "excel",
      eyebrow: "MERGE EXCEL FILES",
      title: "รวม Sheet จากหลายไฟล์",
      description: "ชื่อ Sheet เดิมจะถูกเก็บไว้ และระบบจะเปลี่ยนชื่อให้อัตโนมัติเมื่อชื่อซ้ำกัน",
      button: "เริ่ม Merge Files",
      output: "merged_files.xlsx",
      extension: "xlsx",
      multiple: true,
      dropTitle: "ลากไฟล์ Excel มาวาง หรือคลิกเพื่อเลือกไฟล์",
      dropHint: "เลือกได้หลายไฟล์ · รองรับ .xlsx, .xls, .xlsm และ .xlsb",
      unitLabel: "Sheet",
    },
    combineExcel: {
      kind: "excel",
      eyebrow: "COMBINE EXCEL SHEETS",
      title: "ต่อข้อมูลจากทุก Sheet เป็นตารางเดียว",
      description: "ระบบจะรวม Header ที่ต่างกันและต่อข้อมูลทุกแถวลงใน Sheet เดียว",
      button: "เริ่ม Combine Sheets",
      output: "combined_sheets.xlsx",
      extension: "xlsx",
      multiple: true,
      dropTitle: "เลือกไฟล์ที่มี Sheet ซึ่งต้องการต่อข้อมูล",
      dropHint: "เลือกได้หนึ่งหรือหลายไฟล์ · Sheet ว่างจะถูกข้าม",
      unitLabel: "Sheet",
    },
    splitExcel: {
      kind: "excel",
      eyebrow: "SPLIT EXCEL FILE",
      title: "แยก Workbook ออกเป็นไฟล์ละ 1 Sheet",
      description: "เลือก 1 ไฟล์ ระบบจะสร้างไฟล์ Excel แยกตามจำนวน Sheet และรวมไว้ใน ZIP",
      button: "เริ่ม Split File",
      output: "split_sheets.zip",
      extension: "zip",
      multiple: false,
      dropTitle: "เลือก Excel 1 ไฟล์ที่ต้องการแยก Sheet",
      dropHint: "รองรับ .xlsx, .xls, .xlsm และ .xlsb",
      unitLabel: "Sheet",
    },
    mergePdf: {
      kind: "pdf",
      eyebrow: "MERGE PDF FILES",
      title: "รวม PDF หลายไฟล์เป็นไฟล์เดียว",
      description: "ทุกหน้าจะถูกรวมตามลำดับไฟล์ที่แสดงในรายการ โดยไม่อัปโหลดขึ้นเซิร์ฟเวอร์",
      button: "เริ่ม Merge PDF",
      output: "merged_documents.pdf",
      extension: "pdf",
      multiple: true,
      minimumFiles: 2,
      dropTitle: "ลาก PDF มาวาง หรือคลิกเพื่อเลือกไฟล์",
      dropHint: "เลือกอย่างน้อย 2 ไฟล์ · ระบบรวมตามลำดับที่เลือก",
      unitLabel: "หน้า",
    },
    splitPdf: {
      kind: "pdf",
      eyebrow: "SPLIT PDF FILE",
      title: "แยก PDF เป็นไฟล์ละ 1 หน้า",
      description: "เลือก PDF 1 ไฟล์ ระบบจะแยกทุกหน้าเป็น PDF แยกกันและรวมไว้ใน ZIP",
      button: "เริ่ม Split PDF",
      output: "split_pdf_pages.zip",
      extension: "zip",
      multiple: false,
      dropTitle: "เลือก PDF 1 ไฟล์ที่ต้องการแยกหน้า",
      dropHint: "แต่ละหน้าจะถูกสร้างเป็น PDF แยกหนึ่งไฟล์",
      unitLabel: "หน้า",
    },
  };

  const state = {
    mode: "mergeExcel",
    files: [],
    parsed: [],
    busy: false,
  };

  const els = {
    modeCards: [...document.querySelectorAll(".mode-card")],
    modeEyebrow: document.getElementById("modeEyebrow"),
    modeTitle: document.getElementById("modeTitle"),
    modeDescription: document.getElementById("modeDescription"),
    dropZone: document.getElementById("dropZone"),
    dropTitle: document.getElementById("dropTitle"),
    dropHint: document.getElementById("dropHint"),
    fileInput: document.getElementById("fileInput"),
    fileList: document.getElementById("fileList"),
    fileCount: document.getElementById("fileCount"),
    unitCount: document.getElementById("unitCount"),
    unitLabel: document.getElementById("unitLabel"),
    totalSize: document.getElementById("totalSize"),
    outputName: document.getElementById("outputName"),
    combineOptions: document.getElementById("combineOptions"),
    useHeader: document.getElementById("useHeader"),
    addSourceColumns: document.getElementById("addSourceColumns"),
    processButton: document.getElementById("processButton"),
    resetButton: document.getElementById("resetButton"),
    statusBox: document.getElementById("statusBox"),
    statusText: document.getElementById("statusText"),
    progressBar: document.getElementById("progressBar"),
  };

  function currentConfig() {
    return MODES[state.mode];
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function setStatus(message, type = "idle", progress = null) {
    els.statusText.textContent = message;
    els.statusBox.className = `status-box ${type === "idle" ? "" : type}`.trim();
    if (typeof progress === "number") {
      els.progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
  }

  function ensureExtension(name, extension) {
    const clean = String(name || "").trim();
    if (!clean) return `output.${extension}`;
    return clean.toLowerCase().endsWith(`.${extension}`) ? clean : `${clean}.${extension}`;
  }

  function downloadBlob(blob, fileName) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function updateMode(mode) {
    if (state.busy || !MODES[mode]) return;
    state.mode = mode;
    const config = currentConfig();

    for (const card of els.modeCards) {
      const active = card.dataset.mode === mode;
      card.classList.toggle("active", active);
      card.setAttribute("aria-pressed", String(active));
    }

    els.modeEyebrow.textContent = config.eyebrow;
    els.modeTitle.textContent = config.title;
    els.modeDescription.textContent = config.description;
    els.processButton.textContent = config.button;
    els.outputName.value = config.output;
    els.fileInput.multiple = config.multiple;
    els.fileInput.accept = config.kind === "pdf" ? PDF_ACCEPT : EXCEL_ACCEPT;
    els.dropTitle.textContent = config.dropTitle;
    els.dropHint.textContent = config.dropHint;
    els.unitLabel.textContent = config.unitLabel;
    els.combineOptions.classList.toggle("hidden", mode !== "combineExcel");
    document.body.classList.toggle("pdf-mode", config.kind === "pdf");

    resetFiles();
  }

  function resetFiles() {
    state.files = [];
    state.parsed = [];
    els.fileInput.value = "";
    renderFiles();
    setStatus("พร้อมใช้งาน", "idle", 0);
  }

  function validateSelection(files) {
    const config = currentConfig();
    const supported = config.kind === "pdf" ? /\.pdf$/i : /\.(xlsx|xls|xlsm|xlsb)$/i;
    const valid = files.filter((file) => supported.test(file.name));

    if (!valid.length) {
      throw new Error(config.kind === "pdf" ? "กรุณาเลือกไฟล์ PDF" : "กรุณาเลือกไฟล์ Excel ที่รองรับ");
    }
    if (!config.multiple && valid.length !== 1) {
      throw new Error(config.kind === "pdf" ? "Split PDF รองรับครั้งละ 1 ไฟล์เท่านั้น" : "Split File รองรับครั้งละ 1 ไฟล์เท่านั้น");
    }
    return valid;
  }

  async function parseExcelFiles(files) {
    const parsed = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellStyles: true,
        cellFormula: true,
        cellDates: true,
        bookVBA: true,
      });
      parsed.push({ name: file.name, file, workbook, unitCount: workbook.SheetNames.length });
      setStatus(`อ่านไฟล์ ${index + 1}/${files.length}: ${file.name}`, "working", 10 + ((index + 1) / files.length) * 45);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return parsed;
  }

  async function parsePdfFiles(files) {
    if (!window.PDFLib || !window.PDFLib.PDFDocument) {
      throw new Error("โหลด PDF library ไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ");
    }

    const parsed = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const buffer = await file.arrayBuffer();
      let pdfDoc;
      try {
        pdfDoc = await PDFLib.PDFDocument.load(buffer, { updateMetadata: false });
      } catch (error) {
        const message = /encrypted/i.test(String(error && error.message))
          ? `ไม่สามารถเปิด ${file.name}: PDF มีรหัสผ่านหรือถูกเข้ารหัส`
          : `ไม่สามารถอ่าน PDF: ${file.name}`;
        throw new Error(message);
      }
      parsed.push({
        name: file.name,
        file,
        bytes: new Uint8Array(buffer),
        pdfDoc,
        unitCount: pdfDoc.getPageCount(),
      });
      setStatus(`อ่านไฟล์ ${index + 1}/${files.length}: ${file.name}`, "working", 10 + ((index + 1) / files.length) * 45);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return parsed;
  }

  async function parseFiles(files) {
    setStatus("กำลังอ่านไฟล์...", "working", 5);
    return currentConfig().kind === "pdf" ? parsePdfFiles(files) : parseExcelFiles(files);
  }

  async function addFiles(fileList) {
    if (state.busy) return;
    try {
      const incoming = validateSelection([...fileList]);
      const files = currentConfig().multiple ? incoming : incoming.slice(0, 1);
      const parsed = await parseFiles(files);
      state.files = files;
      state.parsed = parsed;
      renderFiles();
      setStatus("อ่านไฟล์เรียบร้อย พร้อมประมวลผล", "success", 0);
    } catch (error) {
      resetFiles();
      setStatus(error.message || "ไม่สามารถอ่านไฟล์ได้", "error", 0);
    }
  }

  function renderFiles() {
    const config = currentConfig();
    const totalUnits = state.parsed.reduce((sum, item) => sum + (item.unitCount || 0), 0);
    const totalBytes = state.files.reduce((sum, file) => sum + file.size, 0);
    els.fileCount.textContent = String(state.files.length);
    els.unitCount.textContent = String(totalUnits);
    els.unitLabel.textContent = config.unitLabel;
    els.totalSize.textContent = formatBytes(totalBytes);
    els.fileList.innerHTML = "";

    state.parsed.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "file-item";
      const unitText = config.kind === "pdf" ? `${item.unitCount} หน้า` : `${item.unitCount} Sheet`;
      row.innerHTML = `
        <div class="file-item-name">
          <strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
          <small>${formatBytes(item.file.size)}</small>
        </div>
        <span class="file-meta">${unitText}</span>
        <button class="remove-file" type="button" aria-label="ลบ ${escapeHtml(item.name)}" data-index="${index}">×</button>
      `;
      els.fileList.appendChild(row);
    });

    const enoughFiles = state.parsed.length >= (config.minimumFiles || 1);
    els.processButton.disabled = state.busy || !enoughFiles;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function removeFile(index) {
    if (state.busy) return;
    state.files.splice(index, 1);
    state.parsed.splice(index, 1);
    renderFiles();
    setStatus(state.parsed.length ? "พร้อมประมวลผล" : "พร้อมใช้งาน", "idle", 0);
  }

  async function processMergeExcel() {
    setStatus("กำลังรวม Sheet จากทุกไฟล์...", "working", 65);
    const workbook = ExcelOps.mergeWorkbooks(XLSX, state.parsed);
    const outputName = ensureExtension(els.outputName.value, "xlsx");
    XLSX.writeFile(workbook, outputName, { bookType: "xlsx", compression: true, cellStyles: true });
    return `${workbook.SheetNames.length} Sheet ถูกรวมไว้ใน ${outputName}`;
  }

  async function processCombineExcel() {
    setStatus("กำลังต่อข้อมูลจากทุก Sheet...", "working", 65);
    const workbook = ExcelOps.combineWorkbooks(XLSX, state.parsed, {
      useHeader: els.useHeader.checked,
      addSourceColumns: els.addSourceColumns.checked,
      outputSheetName: "Combined Data",
    });
    const outputName = ensureExtension(els.outputName.value, "xlsx");
    XLSX.writeFile(workbook, outputName, { bookType: "xlsx", compression: true });
    return `สร้างตารางรวมใน ${outputName} เรียบร้อย`;
  }

  async function processSplitExcel() {
    setStatus("กำลังแยก Sheet และสร้างไฟล์...", "working", 60);
    const outputs = ExcelOps.splitWorkbook(XLSX, state.parsed[0]);
    const zip = new JSZip();

    outputs.forEach((item) => {
      const array = XLSX.write(item.workbook, { type: "array", bookType: "xlsx", compression: true, cellStyles: true });
      zip.file(item.fileName, array);
    });

    const outputName = ensureExtension(els.outputName.value, "zip");
    const blob = await zip.generateAsync(
      { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
      (metadata) => setStatus(`กำลังสร้าง ZIP ${metadata.percent.toFixed(0)}%`, "working", 65 + metadata.percent * 0.32)
    );
    downloadBlob(blob, outputName);
    return `${outputs.length} Sheet ถูกแยกเป็น ${outputs.length} ไฟล์ใน ${outputName}`;
  }

  async function processMergePdf() {
    setStatus("กำลังรวมหน้า PDF...", "working", 60);
    const bytes = await PdfOps.mergePdfDocuments(PDFLib, state.parsed, (done, total, fileName) => {
      const percent = total ? 60 + (done / total) * 35 : 60;
      setStatus(`กำลังรวมหน้า ${done}/${total}: ${fileName}`, "working", percent);
    });
    const outputName = ensureExtension(els.outputName.value, "pdf");
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), outputName);
    return `รวม ${state.parsed.reduce((sum, item) => sum + item.unitCount, 0)} หน้าไว้ใน ${outputName}`;
  }

  async function processSplitPdf() {
    setStatus("กำลังแยกหน้า PDF...", "working", 55);
    const outputs = await PdfOps.splitPdfDocument(PDFLib, state.parsed[0], (done, total) => {
      setStatus(`กำลังสร้าง PDF หน้า ${done}/${total}`, "working", 55 + (done / total) * 25);
    });
    const zip = new JSZip();
    outputs.forEach((item) => zip.file(item.fileName, item.bytes));

    const outputName = ensureExtension(els.outputName.value, "zip");
    const blob = await zip.generateAsync(
      { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
      (metadata) => setStatus(`กำลังสร้าง ZIP ${metadata.percent.toFixed(0)}%`, "working", 80 + metadata.percent * 0.18)
    );
    downloadBlob(blob, outputName);
    return `${outputs.length} หน้า ถูกแยกเป็น ${outputs.length} PDF ใน ${outputName}`;
  }

  async function processFiles() {
    const config = currentConfig();
    if (state.busy || state.parsed.length < (config.minimumFiles || 1)) return;
    state.busy = true;
    renderFiles();
    els.processButton.textContent = "กำลังประมวลผล...";

    try {
      let message;
      if (state.mode === "mergeExcel") message = await processMergeExcel();
      else if (state.mode === "combineExcel") message = await processCombineExcel();
      else if (state.mode === "splitExcel") message = await processSplitExcel();
      else if (state.mode === "mergePdf") message = await processMergePdf();
      else message = await processSplitPdf();
      setStatus(message, "success", 100);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "เกิดข้อผิดพลาดระหว่างประมวลผล", "error", 0);
    } finally {
      state.busy = false;
      els.processButton.textContent = config.button;
      renderFiles();
    }
  }

  els.modeCards.forEach((card) => card.addEventListener("click", () => updateMode(card.dataset.mode)));
  els.fileInput.addEventListener("change", (event) => addFiles(event.target.files));
  els.resetButton.addEventListener("click", resetFiles);
  els.processButton.addEventListener("click", processFiles);
  els.fileList.addEventListener("click", (event) => {
    const button = event.target.closest(".remove-file");
    if (button) removeFile(Number(button.dataset.index));
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("dragging");
    });
  });
  els.dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));

  window.addEventListener("error", (event) => {
    if (/XLSX|JSZip|ExcelOps|PDFLib|PdfOps/.test(String(event.message))) {
      setStatus("โหลดไลบรารีไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ", "error", 0);
    }
  });

  updateMode("mergeExcel");
})();
