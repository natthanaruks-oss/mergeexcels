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
      description: "รวมตามลำดับในรายการ — ลากไฟล์ หรือกดปุ่ม ▲▼ เพื่อจัดลำดับ และกด × เพื่อลบไฟล์ที่ไม่ต้องการ",
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
    pages: [],
    fileUid: 0,
    renderToken: 0,
    pdfjsDocs: new Map(),
    thumbCache: new Map(),
  };

  const PDFJS = typeof window !== "undefined" ? window.pdfjsLib : null;
  if (PDFJS && PDFJS.GlobalWorkerOptions) {
    PDFJS.GlobalWorkerOptions.workerSrc = "./vendor/pdf.worker.min.js";
  }

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
    pageGrid: document.getElementById("pageGrid"),
    pageGridList: document.getElementById("pageGridList"),
    pageGridCount: document.getElementById("pageGridCount"),
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
    clearPdfState();
    els.fileInput.value = "";
    renderFiles();
    setStatus("พร้อมใช้งาน", "idle", 0);
  }

  function clearPdfState() {
    state.pages = [];
    state.thumbCache.clear();
    state.pdfjsDocs.forEach((entry) => {
      Promise.resolve(entry).then((doc) => doc && doc.destroy && doc.destroy()).catch(() => {});
    });
    state.pdfjsDocs.clear();
    state.renderToken += 1;
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
        uid: ++state.fileUid,
        name: file.name,
        file,
        bytes: new Uint8Array(buffer),
        thumbBytes: new Uint8Array(buffer.slice(0)),
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
      clearPdfState();
      if (state.mode === "mergePdf") buildPdfPages();
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

    const reorderable = config.multiple && state.parsed.length > 1 && config.kind !== "pdf";
    const lastIndex = state.parsed.length - 1;
    state.parsed.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = reorderable ? "file-item reorderable" : "file-item";
      row.dataset.index = index;
      row.draggable = reorderable;
      const unitText = config.kind === "pdf" ? `${item.unitCount} หน้า` : `${item.unitCount} Sheet`;
      const orderBadge = reorderable ? `<span class="file-order">${index + 1}</span>` : "";
      const moveControls = reorderable
        ? `<div class="file-move">
             <button class="move-up" type="button" data-index="${index}" ${index === 0 ? "disabled" : ""} aria-label="เลื่อน ${escapeHtml(item.name)} ขึ้น">▲</button>
             <button class="move-down" type="button" data-index="${index}" ${index === lastIndex ? "disabled" : ""} aria-label="เลื่อน ${escapeHtml(item.name)} ลง">▼</button>
           </div>`
        : "";
      row.innerHTML = `
        ${orderBadge}
        <div class="file-item-name">
          <strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
          <small>${formatBytes(item.file.size)}</small>
        </div>
        <span class="file-meta">${unitText}</span>
        ${moveControls}
        <button class="remove-file" type="button" aria-label="ลบ ${escapeHtml(item.name)}" data-index="${index}">×</button>
      `;
      els.fileList.appendChild(row);
    });
    renderPageGrid();

    let ready;
    if (state.mode === "mergePdf") {
      ready = state.pages.length >= 1;
    } else {
      ready = state.parsed.length >= (config.minimumFiles || 1);
    }
    els.processButton.disabled = state.busy || !ready;
  }

  function buildPdfPages() {
    state.pages = [];
    state.parsed.forEach((ref) => {
      const count = ref.unitCount || (ref.pdfDoc ? ref.pdfDoc.getPageCount() : 0);
      for (let p = 0; p < count; p += 1) {
        state.pages.push({ id: `${ref.uid}_${p}`, ref, pageIndex: p });
      }
    });
  }

  function getPdfjsDoc(ref) {
    if (!PDFJS) return Promise.reject(new Error("pdfjs unavailable"));
    if (!state.pdfjsDocs.has(ref.uid)) {
      const task = PDFJS.getDocument({
        data: ref.thumbBytes.slice(0),
        isEvalSupported: false,
      });
      state.pdfjsDocs.set(ref.uid, task.promise);
    }
    return state.pdfjsDocs.get(ref.uid);
  }

  function renderPageGrid() {
    const isMergePdf = state.mode === "mergePdf" && state.pages.length > 0;
    els.pageGrid.classList.toggle("hidden", !isMergePdf);
    if (!isMergePdf) {
      els.pageGridList.innerHTML = "";
      return;
    }

    els.pageGridCount.textContent = `${state.pages.length} หน้า`;
    els.pageGridList.innerHTML = "";
    const lastIndex = state.pages.length - 1;

    state.pages.forEach((page, index) => {
      const card = document.createElement("div");
      card.className = "page-card";
      card.draggable = !state.busy;
      card.dataset.id = page.id;
      const cacheKey = `${page.ref.uid}:${page.pageIndex}`;
      const cached = state.thumbCache.get(cacheKey);
      const thumb = cached
        ? `<img class="page-thumb" src="${cached}" alt="" />`
        : `<canvas class="page-thumb" data-cache="${cacheKey}" data-ref="${page.ref.uid}" data-page="${page.pageIndex}"></canvas>`;
      card.innerHTML = `
        ${thumb}
        <div class="page-bar">
          <span class="page-pos">${index + 1}</span>
          <span class="page-label" title="${escapeHtml(page.ref.name)} · หน้า ${page.pageIndex + 1}">${escapeHtml(page.ref.name)} · น.${page.pageIndex + 1}</span>
        </div>
        <div class="page-actions">
          <button class="page-prev" type="button" data-id="${page.id}" ${index === 0 ? "disabled" : ""} aria-label="เลื่อนซ้าย">‹</button>
          <button class="page-next" type="button" data-id="${page.id}" ${index === lastIndex ? "disabled" : ""} aria-label="เลื่อนขวา">›</button>
          <button class="page-remove" type="button" data-id="${page.id}" aria-label="ลบหน้านี้">×</button>
        </div>
      `;
      els.pageGridList.appendChild(card);
    });

    renderThumbnails();
  }

  async function renderThumbnails() {
    if (!PDFJS) return;
    const token = ++state.renderToken;
    const canvases = [...els.pageGridList.querySelectorAll("canvas.page-thumb")];
    for (const canvas of canvases) {
      if (token !== state.renderToken) return;
      const ref = state.parsed.find((item) => String(item.uid) === canvas.dataset.ref);
      if (!ref) continue;
      const pageIndex = Number(canvas.dataset.page);
      try {
        const doc = await getPdfjsDoc(ref);
        if (token !== state.renderToken) return;
        const pdfPage = await doc.getPage(pageIndex + 1);
        const base = pdfPage.getViewport({ scale: 1 });
        const scale = 132 / base.width;
        const viewport = pdfPage.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        if (token !== state.renderToken) return;
        try {
          state.thumbCache.set(canvas.dataset.cache, canvas.toDataURL("image/png"));
        } catch (e) {
          /* keep canvas if toDataURL blocked */
        }
      } catch (error) {
        canvas.classList.add("thumb-failed");
      }
    }
  }

  function movePage(id, direction) {
    if (state.busy) return;
    const from = state.pages.findIndex((p) => p.id === id);
    if (from < 0) return;
    const to = from + direction;
    if (to < 0 || to >= state.pages.length) return;
    state.pages.splice(to, 0, state.pages.splice(from, 1)[0]);
    renderPageGrid();
  }

  function movePageTo(id, targetId) {
    if (state.busy || id === targetId) return;
    const from = state.pages.findIndex((p) => p.id === id);
    const to = state.pages.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    state.pages.splice(to, 0, state.pages.splice(from, 1)[0]);
    renderPageGrid();
  }

  function removePage(id) {
    if (state.busy) return;
    state.pages = state.pages.filter((p) => p.id !== id);
    renderFiles();
    setStatus(state.pages.length ? `เหลือ ${state.pages.length} หน้า` : "ไม่เหลือหน้าให้รวม กรุณาเลือกไฟล์ใหม่", "idle", 0);
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
    const removed = state.parsed[index];
    state.files.splice(index, 1);
    state.parsed.splice(index, 1);
    if (state.mode === "mergePdf" && removed) {
      state.pages = state.pages.filter((p) => p.ref !== removed);
      state.renderToken += 1;
    }
    renderFiles();
    setStatus(state.parsed.length ? "พร้อมประมวลผล" : "พร้อมใช้งาน", "idle", 0);
  }

  function moveFile(from, to) {
    if (state.busy) return;
    if (from === to || from == null || to == null) return;
    if (from < 0 || to < 0 || from >= state.parsed.length || to >= state.parsed.length) return;
    state.parsed.splice(to, 0, state.parsed.splice(from, 1)[0]);
    state.files.splice(to, 0, state.files.splice(from, 1)[0]);
    renderFiles();
    setStatus("จัดลำดับใหม่เรียบร้อย พร้อมประมวลผล", "idle", 0);
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
    const pageList = state.pages.map((p) => ({ srcDoc: p.ref.pdfDoc, pageIndex: p.pageIndex }));
    const bytes = await PdfOps.mergePdfPages(PDFLib, pageList, (done, total) => {
      const percent = total ? 60 + (done / total) * 35 : 60;
      setStatus(`กำลังรวมหน้า ${done}/${total}`, "working", percent);
    });
    const outputName = ensureExtension(els.outputName.value, "pdf");
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), outputName);
    return `รวม ${state.pages.length} หน้าไว้ใน ${outputName}`;
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
    const ready =
      state.mode === "mergePdf"
        ? state.pages.length >= 1
        : state.parsed.length >= (config.minimumFiles || 1);
    if (state.busy || !ready) return;
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
  els.pageGridList.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".page-remove");
    if (removeBtn) { removePage(removeBtn.dataset.id); return; }
    const prevBtn = event.target.closest(".page-prev");
    if (prevBtn) { movePage(prevBtn.dataset.id, -1); return; }
    const nextBtn = event.target.closest(".page-next");
    if (nextBtn) { movePage(nextBtn.dataset.id, 1); return; }
  });

  let dragPageId = null;
  els.pageGridList.addEventListener("dragstart", (event) => {
    const card = event.target.closest(".page-card");
    if (!card) return;
    dragPageId = card.dataset.id;
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  });
  els.pageGridList.addEventListener("dragover", (event) => {
    if (dragPageId === null) return;
    event.preventDefault();
    els.pageGridList.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
    const card = event.target.closest(".page-card");
    if (card && card.dataset.id !== dragPageId) card.classList.add("drop-target");
  });
  els.pageGridList.addEventListener("drop", (event) => {
    if (dragPageId === null) return;
    event.preventDefault();
    const card = event.target.closest(".page-card");
    if (card) movePageTo(dragPageId, card.dataset.id);
  });
  els.pageGridList.addEventListener("dragend", () => {
    dragPageId = null;
    els.pageGridList
      .querySelectorAll(".dragging, .drop-target")
      .forEach((el) => el.classList.remove("dragging", "drop-target"));
  });

  els.fileList.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".remove-file");
    if (removeBtn) { removeFile(Number(removeBtn.dataset.index)); return; }
    const upBtn = event.target.closest(".move-up");
    if (upBtn) { const i = Number(upBtn.dataset.index); moveFile(i, i - 1); return; }
    const downBtn = event.target.closest(".move-down");
    if (downBtn) { const i = Number(downBtn.dataset.index); moveFile(i, i + 1); return; }
  });

  let dragIndex = null;
  els.fileList.addEventListener("dragstart", (event) => {
    const item = event.target.closest(".file-item.reorderable");
    if (!item) return;
    dragIndex = Number(item.dataset.index);
    item.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  });
  els.fileList.addEventListener("dragover", (event) => {
    if (dragIndex === null) return;
    event.preventDefault();
    els.fileList.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
    const item = event.target.closest(".file-item.reorderable");
    if (item) item.classList.add("drop-target");
  });
  els.fileList.addEventListener("drop", (event) => {
    if (dragIndex === null) return;
    event.preventDefault();
    const item = event.target.closest(".file-item.reorderable");
    if (item) moveFile(dragIndex, Number(item.dataset.index));
  });
  els.fileList.addEventListener("dragend", () => {
    dragIndex = null;
    els.fileList
      .querySelectorAll(".dragging, .drop-target")
      .forEach((el) => el.classList.remove("dragging", "drop-target"));
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
    if (/XLSX|JSZip|ExcelOps|PDFLib|PdfOps|pdfjs/.test(String(event.message))) {
      setStatus("โหลดไลบรารีไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ", "error", 0);
    }
  });

  updateMode("mergeExcel");
})();
