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
    pdf2excel: {
      kind: "pdf",
      eyebrow: "PDF TO EXCEL",
      title: "แปลง PDF เป็น Excel",
      description: "ดึงข้อความตามตำแหน่งแล้วจัดเป็นแถว/คอลัมน์ — เหมาะกับ PDF ที่เป็นข้อความ ไม่ใช่ไฟล์สแกน",
      button: "เริ่มแปลงเป็น Excel",
      output: "pdf_to_excel.xlsx",
      extension: "xlsx",
      multiple: true,
      dropTitle: "ลาก PDF มาวาง หรือคลิกเพื่อเลือกไฟล์",
      dropHint: "เลือกได้หลายไฟล์ · ทุกหน้าจะต่อกันลงมาใน Sheet เดียว",
      unitLabel: "หน้า",
    },
    ocr2excel: {
      kind: "pdf",
      eyebrow: "OCR · ทดลอง",
      title: "PDF สแกน → Excel (OCR)",
      description: "อ่านตัวอักษรจาก PDF ที่เป็นรูปภาพ/สแกนด้วย OCR (ไทย+อังกฤษ) — โหลด engine ครั้งแรก ~7MB และช้ากว่าปกติมาก เหมาะกับสแกนชัดๆ",
      button: "เริ่ม OCR เป็น Excel",
      output: "ocr_to_excel.xlsx",
      extension: "xlsx",
      multiple: true,
      dropTitle: "ลาก PDF สแกน มาวาง หรือคลิกเพื่อเลือกไฟล์",
      dropHint: "แนะนำเลือกช่วงหน้าทีละไม่กี่หน้า เพราะ OCR ช้า",
      unitLabel: "หน้า",
    },
    optimizeExcel: {
      kind: "excel",
      eyebrow: "OPTIMIZE EXCEL",
      title: "ลดขนาดและแบ่งไฟล์ Excel ขนาดใหญ่",
      description: "เหมาะกับ Oracle Export — วิเคราะห์และสร้างไฟล์ใหม่ใน Web Worker โดยไม่แสดงข้อมูลหลายหมื่นแถวบนหน้าจอ · แนะนำไฟล์ไม่เกิน 250 MB",
      button: "เริ่ม Optimize Excel",
      output: "optimized_file.xlsx",
      extension: "xlsx",
      multiple: false,
      deferParse: true,
      dropTitle: "เลือก Excel 1 ไฟล์ที่ต้องการลดขนาด",
      dropHint: "รองรับ .xlsx, .xls, .xlsm และ .xlsb · 80–250 MB อาจใช้เวลาหลายนาที · มากกว่า 512 MB ต้องแบ่งไฟล์/Export CSV",
      unitLabel: "Sheet",
    },
    budgetBuilder: {
      kind: "excel",
      eyebrow: "DOH / DOR BUDGET BUILDER",
      title: "สร้างไฟล์วิเคราะห์งบ DOH/DOR",
      description: "รับ Clean Raw Data จากเมนู 06 แล้ว Mapping จังหวัด Region ประเภทงาน Factor พื้นที่ และประมาณการปริมาณผลิตภัณฑ์",
      button: "สร้าง DOH/DOR Complete File",
      output: "DOH_DOR_Budget_Builder.xlsx",
      extension: "xlsx",
      multiple: false,
      dropTitle: "เลือก Clean Raw Excel จากเมนู 06 หรือไฟล์รายละเอียดงบประมาณ",
      dropHint: "รองรับ .xlsx, .xls, .xlsm และ .xlsb · Factor DOH/DOR ฝังอยู่ในระบบแล้ว",
      unitLabel: "Sheet",
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
    optimizeAnalysis: null,
    optimizeAnalysisError: "",
    optimizeReport: null,
    optimizeWorker: null,
    optimizeReject: null,
    optimizeJobId: 0,
    budgetRecords: [],
    budgetMatrix: [],
    budgetPreviewPage: 1,
    budgetPreviewPageSize: 25,
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
    optimizeOptions: document.getElementById("optimizeOptions"),
    budgetBuilderOptions: document.getElementById("budgetBuilderOptions"),
    budgetAgency: document.getElementById("budgetAgency"),
    budgetSourceSheet: document.getElementById("budgetSourceSheet"),
    constructionPercent: document.getElementById("constructionPercent"),
    maintenancePercent: document.getElementById("maintenancePercent"),
    defaultConstructionType: document.getElementById("defaultConstructionType"),
    defaultMaintenanceType: document.getElementById("defaultMaintenanceType"),
    projectRowsOnly: document.getElementById("projectRowsOnly"),
    roadBudgetOnly: document.getElementById("roadBudgetOnly"),
    budgetPrepareButton: document.getElementById("budgetPrepareButton"),
    budgetSearch: document.getElementById("budgetSearch"),
    budgetCategoryFilter: document.getElementById("budgetCategoryFilter"),
    budgetFamilyFilter: document.getElementById("budgetFamilyFilter"),
    budgetConfidenceFilter: document.getElementById("budgetConfidenceFilter"),
    budgetConfirmSuggested: document.getElementById("budgetConfirmSuggested"),
    budgetBulkType: document.getElementById("budgetBulkType"),
    budgetApplyBulk: document.getElementById("budgetApplyBulk"),
    budgetPreviewPanel: document.getElementById("budgetPreviewPanel"),
    budgetPreviewSummary: document.getElementById("budgetPreviewSummary"),
    budgetPreviewBody: document.getElementById("budgetPreviewBody"),
    budgetPrevPage: document.getElementById("budgetPrevPage"),
    budgetNextPage: document.getElementById("budgetNextPage"),
    budgetPageInfo: document.getElementById("budgetPageInfo"),
    optimizeMode: document.getElementById("optimizeMode"),
    optimizeFormat: document.getElementById("optimizeFormat"),
    removeComments: document.getElementById("removeComments"),
    removeLinks: document.getElementById("removeLinks"),
    removeMerges: document.getElementById("removeMerges"),
    removeHiddenSheets: document.getElementById("removeHiddenSheets"),
    splitLargeFile: document.getElementById("splitLargeFile"),
    splitRowCount: document.getElementById("splitRowCount"),
    splitSizeGroup: document.getElementById("splitSizeGroup"),
    preserveHeader: document.getElementById("preserveHeader"),
    preserveHeaderGroup: document.getElementById("preserveHeaderGroup"),
    optimizeWarning: document.getElementById("optimizeWarning"),
    analysisPanel: document.getElementById("analysisPanel"),
    analysisRisk: document.getElementById("analysisRisk"),
    analysisMetrics: document.getElementById("analysisMetrics"),
    analysisSheets: document.getElementById("analysisSheets"),
    integrityPanel: document.getElementById("integrityPanel"),
    integrityStatus: document.getElementById("integrityStatus"),
    integrityMetrics: document.getElementById("integrityMetrics"),
    processButton: document.getElementById("processButton"),
    cancelButton: document.getElementById("cancelButton"),
    resetButton: document.getElementById("resetButton"),
    pageGrid: document.getElementById("pageGrid"),
    pageGridList: document.getElementById("pageGridList"),
    pageGridCount: document.getElementById("pageGridCount"),
    pageRangePanel: document.getElementById("pageRangePanel"),
    pageStart: document.getElementById("pageStart"),
    pageEnd: document.getElementById("pageEnd"),
    roadMode: document.getElementById("roadMode"),
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

  function formatNumber(value) {
    return new Intl.NumberFormat("th-TH").format(Number(value) || 0);
  }

  function setStatus(message, type = "idle", progress = null) {
    els.statusText.textContent = message;
    els.statusBox.className = `status-box ${type === "idle" ? "" : type}`.trim();
    if (typeof progress === "number") {
      els.progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
  }

  function updateOptimizeOptionState() {
    if (!els.optimizeOptions) return;
    const splitEnabled = !!els.splitLargeFile.checked;
    els.splitRowCount.disabled = !splitEnabled;
    els.preserveHeader.disabled = !splitEnabled;
    els.splitSizeGroup.classList.toggle("disabled", !splitEnabled);
    els.preserveHeaderGroup.classList.toggle("disabled", !splitEnabled);

    if (state.mode !== "optimizeExcel") return;
    const format = els.optimizeFormat.value;
    const multipleCsv = format === "csv" && state.optimizeAnalysis && state.optimizeAnalysis.total.sheets > 1;
    const extension = splitEnabled || multipleCsv ? "zip" : format;
    const currentBase = String(els.outputName.value || "optimized_file").replace(/\.[^.]+$/, "");
    els.outputName.value = `${currentBase || "optimized_file"}.${extension}`;

    const warnings = [];
    if (els.optimizeMode.value === "values") {
      warnings.push("Values Only จะเปลี่ยน Formula เป็นค่าที่บันทึกอยู่ในไฟล์ และตัด Style/Chart/Image/Macro ออก");
    } else {
      warnings.push("Safe Optimize เก็บ Formula และ Number Format แต่ไม่รับประกัน Style, Chart, Image หรือ Macro ขั้นสูง");
    }
    if (format === "csv") warnings.push("CSV ไม่เก็บ Formula, รูปแบบ, Merge Cell หรือหลาย Sheet ในไฟล์เดียว");
    if (splitEnabled) warnings.push("การแบ่งไฟล์จะยกเลิก Merge Cells และทำซ้ำ Header ในแต่ละ Part");
    if (els.removeHiddenSheets.checked) warnings.push("Hidden Sheets จะถูกลบออกจากผลลัพธ์");
    if (els.removeMerges.checked) warnings.push("Merge Cells จะถูกยกเลิก เหมาะกับ Raw Data เท่านั้น");
    const risk = state.optimizeAnalysis && state.optimizeAnalysis.total.memoryRisk;
    if (risk === "high") warnings.unshift("ไฟล์นี้ใช้หน่วยความจำสูงมาก แนะนำ Values Only + Split 50,000 Rows หรือ CSV");
    else if (risk === "medium") warnings.unshift("ไฟล์มีข้อมูลจำนวนมาก แนะนำ Values Only และหลีกเลี่ยงการเปิด Preview");
    els.optimizeWarning.textContent = warnings.join(" · ");
    els.optimizeWarning.classList.remove("hidden");
    els.optimizeWarning.classList.toggle("danger", els.removeHiddenSheets.checked || els.optimizeMode.value === "values" || risk === "high");
  }

  function metricCard(value, label, className = "") {
    return `<div class="metric-card ${className}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function renderOptimizeAnalysis(analysis) {
    if (!analysis) {
      els.analysisPanel.classList.add("hidden");
      return;
    }
    const total = analysis.total;
    const risk = total.memoryRisk || "normal";
    els.analysisRisk.textContent = risk === "high" ? "HIGH MEMORY" : risk === "medium" ? "MEDIUM" : "NORMAL";
    els.analysisRisk.className = `risk-badge ${risk === "normal" ? "" : risk}`.trim();
    els.analysisMetrics.innerHTML = [
      metricCard(formatBytes(total.fileSize), "ขนาดไฟล์ต้นฉบับ"),
      metricCard(formatNumber(total.sheets), "จำนวน Sheet"),
      metricCard(formatNumber(total.rows), "แถวตามช่วงข้อมูลจริง"),
      metricCard(formatNumber(total.cells), "เซลล์ที่มีข้อมูล"),
      metricCard(formatNumber(total.formulas), "Formula Cells", total.formulas ? "warn" : "good"),
      metricCard(formatNumber(total.comments + total.hyperlinks), "Comments + Links"),
      metricCard(formatNumber(total.hiddenSheets), "Hidden Sheets", total.hiddenSheets ? "warn" : "good"),
      metricCard(formatNumber(total.bloatedSheets), "Sheet ที่ Used Range บวม", total.bloatedSheets ? "bad" : "good"),
    ].join("");

    const rows = analysis.sheets.map((sheet) => `
      <tr>
        <td title="${escapeHtml(sheet.name)}">${escapeHtml(sheet.name)}${sheet.hidden ? " · Hidden" : ""}</td>
        <td>${formatNumber(sheet.actualRows)}</td>
        <td>${formatNumber(sheet.actualCols)}</td>
        <td>${formatNumber(sheet.nonEmptyCells)}</td>
        <td>${formatNumber(sheet.formulaCells)}</td>
        <td class="${sheet.bloatedRange ? "bloat" : ""}">${escapeHtml(sheet.declaredRange || "-")}</td>
        <td>${escapeHtml(sheet.actualRange || "-")}</td>
      </tr>`).join("");
    els.analysisSheets.innerHTML = `
      <table>
        <thead><tr><th>Sheet</th><th>Rows</th><th>Cols</th><th>Data Cells</th><th>Formula</th><th>Declared Range</th><th>Actual Range</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    els.analysisPanel.classList.remove("hidden");

    updateOptimizeOptionState();
    if (risk === "high") els.optimizeWarning.classList.add("danger");
  }

  function renderIntegrityReport(report) {
    if (!report) {
      els.integrityPanel.classList.add("hidden");
      return;
    }
    const integrity = report.integrity || {};
    const passed = integrity.cellsMatch;
    els.integrityStatus.textContent = passed ? "DATA MATCH" : "REVIEW";
    els.integrityStatus.className = `risk-badge ${passed ? "pass" : "fail"}`;
    const reduction = typeof report.reductionPercent === "number"
      ? `${report.reductionPercent >= 0 ? "−" : "+"}${Math.abs(report.reductionPercent).toFixed(1)}%`
      : "-";
    const formulasLabel = els.optimizeMode.value === "values" ? "Formula → Values" : "Formula คงเหลือ";
    els.integrityMetrics.innerHTML = [
      metricCard(formatNumber(report.before && report.before.sheets), "Source Sheets"),
      metricCard(formatNumber(report.before && report.before.rows), "Source Rows"),
      metricCard(formatNumber(integrity.sourceCells), "Source Cells (Output Scope)"),
      metricCard(formatNumber(integrity.copiedSourceCells), "Copied Data Cells", passed ? "good" : "bad"),
      metricCard(formatBytes(report.outputSize), "ขนาดผลลัพธ์"),
      metricCard(reduction, "Size Reduction", report.reductionPercent >= 0 ? "good" : "warn"),
      metricCard(formatNumber(report.outputParts || 1), "จำนวนไฟล์ผลลัพธ์"),
      metricCard(`${formatNumber(integrity.formulasOutput)} / ${formatNumber(integrity.formulasExpected)}`, formulasLabel),
      metricCard(formatNumber(report.stats.commentsRemoved || 0), "Comments Removed"),
      metricCard(formatNumber(report.stats.hiddenSheetsRemoved || 0), "Hidden Sheets Removed"),
    ].join("");
    els.integrityPanel.classList.remove("hidden");
  }

  function runOptimizeWorker(action, file, options = {}) {
    const policy = OptimizeOps.getLargeFilePolicy(file && file.size);
    if (policy.blocked) return Promise.reject(new Error(policy.message));
    terminateOptimizeWorker();
    const jobId = state.optimizeJobId;
    const worker = new Worker(`./optimize-worker.js?v=3.5.0`);
    state.optimizeWorker = worker;

    return new Promise(async (resolve, reject) => {
      state.optimizeReject = reject;
      worker.onmessage = (event) => {
        if (jobId !== state.optimizeJobId) return;
        const message = event.data || {};
        if (message.type === "progress") {
          setStatus(message.message || "กำลังประมวลผล...", "working", message.progress);
          return;
        }
        if (message.type === "error") {
          state.optimizeReject = null;
          state.optimizeWorker = null;
          worker.terminate();
          reject(new Error(message.message || "ไม่สามารถประมวลผลไฟล์ได้"));
          return;
        }
        if (message.type === "analysis" || message.type === "result") {
          state.optimizeReject = null;
          state.optimizeWorker = null;
          worker.terminate();
          resolve(message);
        }
      };
      worker.onerror = (event) => {
        state.optimizeReject = null;
        state.optimizeWorker = null;
        worker.terminate();
        reject(new Error(event.message || "Web Worker ทำงานผิดพลาด"));
      };

      try {
        const buffer = await file.arrayBuffer();
        worker.postMessage({ action, buffer, fileName: file.name, fileSize: file.size, options }, [buffer]);
      } catch (error) {
        state.optimizeReject = null;
        state.optimizeWorker = null;
        worker.terminate();
        reject(error);
      }
    });
  }

  async function analyzeOptimizeFile(file) {
    state.busy = true;
    state.optimizeAnalysis = null;
    state.optimizeAnalysisError = "";
    state.optimizeReport = null;
    els.analysisPanel.classList.add("hidden");
    els.integrityPanel.classList.add("hidden");
    els.cancelButton.classList.remove("hidden");
    renderFiles();
    try {
      const policy = OptimizeOps.getLargeFilePolicy(file.size);
      if (policy.message) setStatus(policy.message, policy.level === "extreme" ? "error" : "working", 3);
      const result = await runOptimizeWorker("analyze", file);
      state.optimizeAnalysis = result.analysis;
      if (state.parsed[0]) state.parsed[0].unitCount = result.analysis.total.sheets;
      renderOptimizeAnalysis(result.analysis);
      setStatus("วิเคราะห์ไฟล์เรียบร้อย เลือกตัวเลือกแล้วเริ่ม Optimize ได้", "success", 100);
    } finally {
      state.busy = false;
      els.cancelButton.classList.add("hidden");
      renderFiles();
    }
  }

  function getOptimizeOptions() {
    return {
      mode: els.optimizeMode.value,
      outputFormat: els.optimizeFormat.value,
      removeComments: els.removeComments.checked,
      removeLinks: els.removeLinks.checked,
      removeMerges: els.removeMerges.checked,
      removeHiddenSheets: els.removeHiddenSheets.checked,
      splitEnabled: els.splitLargeFile.checked,
      chunkSize: Number(els.splitRowCount.value) || 50000,
      preserveHeader: els.preserveHeader.checked,
    };
  }

  function cancelOptimizeJob() {
    if (!state.optimizeWorker) return;
    terminateOptimizeWorker("ยกเลิกการประมวลผลแล้ว");
    state.busy = false;
    els.cancelButton.classList.add("hidden");
    els.processButton.textContent = currentConfig().button;
    renderFiles();
    setStatus("ยกเลิกการประมวลผลแล้ว ไฟล์ต้นฉบับไม่ได้ถูกแก้ไข", "idle", 0);
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

  function populateBudgetWorkTypes() {
    if (!window.BudgetMaster || !els.budgetAgency) return;
    const agency = els.budgetAgency.value === "DOR" ? "DOR" : "DOH";
    const workTypes = (window.BudgetMaster.factors[agency] || []).map((item) => item.workType);
    const constructionPreferred = agency === "DOH" ? "Constructions HMA (2 layers)-A" : "Constructions HMA (1 Layer)-A";
    const maintenancePreferred = "HMA Overlay-A";
    const fill = (select, preferred) => {
      const previous = select.value;
      select.innerHTML = workTypes.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
      select.value = workTypes.includes(previous) ? previous : (workTypes.includes(preferred) ? preferred : (workTypes[0] || ""));
    };
    fill(els.defaultConstructionType, constructionPreferred);
    fill(els.defaultMaintenanceType, maintenancePreferred);
    if (state.mode === "budgetBuilder") {
      const base = state.files[0] ? ExcelOps.basename(state.files[0].name) : "Budget";
      els.outputName.value = `${agency}_${base}_Complete.xlsx`;
    }
  }

  function populateBudgetSourceSheets() {
    if (!els.budgetSourceSheet) return;
    const workbook = state.parsed[0] && state.parsed[0].workbook;
    const names = workbook && Array.isArray(workbook.SheetNames) ? workbook.SheetNames : [];
    els.budgetSourceSheet.innerHTML = names.length ? names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("") : '<option value="">เลือกไฟล์ก่อน</option>';
    if (names.includes("PDF Data")) els.budgetSourceSheet.value = "PDF Data";
  }

  function getBudgetBuilderOptions() {
    const toPercent = (element, fallback) => {
      const value = Number(element && element.value);
      return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) / 100 : fallback;
    };
    return {
      agency: els.budgetAgency.value === "DOR" ? "DOR" : "DOH",
      constructionPercent: toPercent(els.constructionPercent, 0.6),
      maintenancePercent: toPercent(els.maintenancePercent, 0.8),
      otherPercent: 0,
      defaultConstruction: els.defaultConstructionType.value,
      defaultMaintenance: els.defaultMaintenanceType.value,
      projectRowsOnly: els.projectRowsOnly.checked,
      roadBudgetOnly: els.roadBudgetOnly.checked,
      roadPack: true,
      minimumAmount: 100000,
    };
  }

  function clearBudgetPreview(message = "ยังไม่ได้วิเคราะห์รายการ") {
    state.budgetRecords = [];
    state.budgetMatrix = [];
    state.budgetPreviewPage = 1;
    if (els.budgetPreviewPanel) els.budgetPreviewPanel.classList.add("hidden");
    if (els.budgetPreviewBody) els.budgetPreviewBody.innerHTML = "";
    if (els.budgetPreviewSummary) els.budgetPreviewSummary.textContent = message;
    if (state.mode === "budgetBuilder") renderFiles();
  }

  function budgetWorkTypes() {
    const agency = els.budgetAgency.value === "DOR" ? "DOR" : "DOH";
    return (window.BudgetMaster && window.BudgetMaster.factors[agency] || []).map((item) => item.workType);
  }

  function budgetFamilies() {
    const set = new Set(budgetWorkTypes().map((name) => window.BudgetHistoryRules.familyOfWorkType(name)).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  function groupedWorkTypeOptions(selected, suggestedFamily = "", includeBlank = true) {
    const workTypes = budgetWorkTypes();
    const groups = new Map();
    workTypes.forEach((name) => {
      const family = window.BudgetHistoryRules.familyOfWorkType(name) || "Other";
      if (!groups.has(family)) groups.set(family, []);
      groups.get(family).push(name);
    });
    const order = [...groups.keys()].sort((a, b) => {
      if (a === suggestedFamily) return -1;
      if (b === suggestedFamily) return 1;
      return a.localeCompare(b);
    });
    const html = includeBlank ? ['<option value="">— กรุณาเลือกและยืนยันประเภทงาน —</option>'] : [];
    order.forEach((family) => {
      const label = family === suggestedFamily ? `${family} · Suggested` : family;
      html.push(`<optgroup label="${escapeHtml(label)}">`);
      groups.get(family).forEach((name) => html.push(`<option value="${escapeHtml(name)}" ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`));
      html.push('</optgroup>');
    });
    return html.join("");
  }

  function populateBudgetFamilyFilter() {
    if (!els.budgetFamilyFilter) return;
    const previous = els.budgetFamilyFilter.value || "ALL";
    const families = budgetFamilies();
    els.budgetFamilyFilter.innerHTML = `<option value="ALL">ทั้งหมด</option>${families.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
    els.budgetFamilyFilter.value = families.includes(previous) ? previous : "ALL";
  }

  function filteredBudgetRecords() {
    const search = String(els.budgetSearch && els.budgetSearch.value || "").trim().toLowerCase();
    const category = String(els.budgetCategoryFilter && els.budgetCategoryFilter.value || "ALL");
    const family = String(els.budgetFamilyFilter && els.budgetFamilyFilter.value || "ALL");
    const confidence = String(els.budgetConfidenceFilter && els.budgetConfidenceFilter.value || "ALL");
    return state.budgetRecords.map((record, index) => ({ record, index })).filter(({ record }) => {
      if (category !== "ALL" && record.category !== category) return false;
      if (family !== "ALL" && record.suggestedFamily !== family) return false;
      if (confidence !== "ALL" && record.historicalBand !== confidence) return false;
      if (!search) return true;
      return `${record.activity || ""} ${record.description} ${record.province} ${record.workType} ${record.suggestedFamily || ""}`.toLowerCase().includes(search);
    });
  }

  function renderBudgetPreview() {
    if (!els.budgetPreviewPanel) return;
    populateBudgetFamilyFilter();
    const filtered = filteredBudgetRecords();
    const pageSize = state.budgetPreviewPageSize;
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    state.budgetPreviewPage = Math.max(1, Math.min(state.budgetPreviewPage, pages));
    const start = (state.budgetPreviewPage - 1) * pageSize;
    const current = filtered.slice(start, start + pageSize);

    els.budgetPreviewBody.innerHTML = current.map(({ record, index }) => {
      const pct = Number(record.historicalConfidence || 0) * 100;
      const suggestion = record.suggestedFamily
        ? `<strong>${escapeHtml(record.suggestedFamily)}</strong><small>${pct.toFixed(1)}% · n=${formatNumber(record.historicalSupport || 0)} · Variant ${escapeHtml(record.suggestedVariant || "-")}</small>`
        : `<strong>Manual Review</strong><small>ไม่พบ Historical Rule</small>`;
      const confirmed = record.workTypeConfirmed ? '<span class="confirmed-badge">Confirmed</span>' : '<span class="pending-badge">ยังไม่ยืนยัน</span>';
      return `
      <tr class="${record.status === "Ready" ? "" : "needs-review"}">
        <td>${formatNumber(record.sequence)}</td>
        <td>${escapeHtml(record.category)}</td>
        <td class="activity-cell">${escapeHtml(record.activity || "-")}</td>
        <td>${escapeHtml(record.description)}</td>
        <td>${escapeHtml(record.province || "-")}</td>
        <td>${formatNumber(record.budget)}</td>
        <td><div class="historical-suggestion ${String(record.historicalBand || "Low").toLowerCase()}">${suggestion}</div></td>
        <td><select class="budget-worktype-select" data-index="${index}">${groupedWorkTypeOptions(record.workType, record.suggestedFamily)}</select>${confirmed}</td>
        <td>${escapeHtml(record.status)}</td>
      </tr>`;
    }).join("");

    const ready = state.budgetRecords.filter((r) => r.status === "Ready").length;
    const unconfirmed = state.budgetRecords.filter((r) => !r.workTypeConfirmed).length;
    const high = state.budgetRecords.filter((r) => r.historicalBand === "High").length;
    els.budgetPreviewSummary.textContent = `${formatNumber(state.budgetRecords.length)} โครงการ · Historical High ${formatNumber(high)} · ยืนยันแล้ว ${formatNumber(ready)} · รอยืนยัน ${formatNumber(unconfirmed)}`;
    els.budgetPageInfo.textContent = `หน้า ${state.budgetPreviewPage} / ${pages} · แสดง ${formatNumber(filtered.length)} รายการ`;
    els.budgetPrevPage.disabled = state.budgetPreviewPage <= 1;
    els.budgetNextPage.disabled = state.budgetPreviewPage >= pages;
    els.budgetPreviewPanel.classList.remove("hidden");

    const currentBulk = els.budgetBulkType.value;
    els.budgetBulkType.innerHTML = groupedWorkTypeOptions(currentBulk, "", true);
    if (budgetWorkTypes().includes(currentBulk)) els.budgetBulkType.value = currentBulk;
    renderFiles();
  }

  async function prepareBudgetDraft() {
    if (!window.BudgetBuilderOps || !window.BudgetMaster) throw new Error("โหลด Budget Builder module ไม่สำเร็จ");
    const input = state.parsed[0];
    if (!input || !input.workbook) throw new Error("กรุณาเลือกไฟล์ Excel ต้นทาง");
    const sheetName = els.budgetSourceSheet.value || input.workbook.SheetNames[0];
    const worksheet = input.workbook.Sheets[sheetName];
    if (!worksheet) throw new Error("ไม่พบ Source Sheet ที่เลือก");
    setStatus("กำลังวิเคราะห์รายการโครงการ...", "working", 35);
    const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: true, blankrows: false });
    const options = getBudgetBuilderOptions();
    const records = BudgetBuilderOps.extractProjectsFromMatrix(matrix, options).map((record) => BudgetBuilderOps.calculateRecord(record, { agency: options.agency }));
    if (!records.length) throw new Error("ไม่พบรายการโครงการที่มีจำนวนเงิน");
    state.budgetMatrix = matrix;
    state.budgetRecords = records;
    state.budgetPreviewPage = 1;
    populateBudgetFamilyFilter();
    renderBudgetPreview();
    setStatus(`พบ ${formatNumber(records.length)} รายการ กรุณาตรวจและเลือกประเภทงานก่อน Export`, "success", 0);
  }

  function updateBudgetRecordWorkType(index, workType) {
    const record = state.budgetRecords[index];
    if (!record) return;
    state.budgetRecords[index] = BudgetBuilderOps.calculateRecord(record, { agency: els.budgetAgency.value, workType, confirmed: Boolean(workType), selectionSource: "Manual selection" });
    renderBudgetPreview();
  }

  function applyBudgetBulkType() {
    const workType = els.budgetBulkType.value;
    if (!workType) return;
    const filtered = filteredBudgetRecords();
    filtered.forEach(({ index, record }) => {
      state.budgetRecords[index] = BudgetBuilderOps.calculateRecord(record, { agency: els.budgetAgency.value, workType, confirmed: true, selectionSource: "Bulk selection" });
    });
    renderBudgetPreview();
    setStatus(`กำหนดประเภทงานให้ ${formatNumber(filtered.length)} รายการแล้ว`, "success", 0);
  }

  function confirmHighConfidenceSuggestions() {
    const filtered = filteredBudgetRecords().filter(({ record }) => record.historicalBand === "High" && record.suggestedWorkType);
    filtered.forEach(({ index, record }) => {
      state.budgetRecords[index] = BudgetBuilderOps.calculateRecord(record, {
        agency: els.budgetAgency.value,
        workType: record.suggestedWorkType,
        confirmed: true,
        selectionSource: "Confirmed historical suggestion",
      });
    });
    renderBudgetPreview();
    setStatus(`ยืนยัน Historical Suggestion ระดับ High จำนวน ${formatNumber(filtered.length)} รายการแล้ว`, "success", 0);
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
    els.optimizeOptions.classList.toggle("hidden", mode !== "optimizeExcel");
    els.budgetBuilderOptions.classList.toggle("hidden", mode !== "budgetBuilder");
    if (mode === "budgetBuilder") populateBudgetWorkTypes();
    const usesPageRange = mode === "pdf2excel" || mode === "ocr2excel";
    document.body.classList.toggle("pdf-mode", config.kind === "pdf" && !usesPageRange);
    els.pageRangePanel.classList.toggle("hidden", !usesPageRange);
    if (!usesPageRange) { els.pageStart.value = ""; els.pageEnd.value = ""; }
    updateOptimizeOptionState();

    resetFiles();
  }

  function terminateOptimizeWorker(reason = "") {
    if (state.optimizeWorker) {
      state.optimizeWorker.terminate();
      state.optimizeWorker = null;
    }
    const rejectPending = state.optimizeReject;
    state.optimizeReject = null;
    state.optimizeJobId += 1;
    if (reason && rejectPending) rejectPending(new Error(reason));
  }

  function resetFiles() {
    const hadWorker = !!state.optimizeWorker;
    terminateOptimizeWorker(hadWorker ? "ยกเลิกการประมวลผลแล้ว" : "");
    state.busy = false;
    state.files = [];
    state.parsed = [];
    state.optimizeAnalysis = null;
    state.optimizeAnalysisError = "";
    state.optimizeReport = null;
    state.budgetRecords = [];
    state.budgetMatrix = [];
    state.budgetPreviewPage = 1;
    if (els.budgetPreviewPanel) els.budgetPreviewPanel.classList.add("hidden");
    clearPdfState();
    els.fileInput.value = "";
    els.analysisPanel.classList.add("hidden");
    els.integrityPanel.classList.add("hidden");
    els.cancelButton.classList.add("hidden");
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
      if (state.mode === "optimizeExcel") throw new Error("Optimize Excel รองรับครั้งละ 1 ไฟล์เท่านั้น");
      if (state.mode === "budgetBuilder") throw new Error("Budget Builder รองรับครั้งละ 1 ไฟล์เท่านั้น");
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
    if (currentConfig().deferParse) {
      return files.map((file) => ({ name: file.name, file, unitCount: 0 }));
    }
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
      state.optimizeAnalysis = null;
      state.optimizeAnalysisError = "";
      state.optimizeReport = null;
      clearPdfState();
      if (state.mode === "mergePdf") buildPdfPages();
      renderFiles();

      if (state.mode === "optimizeExcel") {
        els.outputName.value = `${ExcelOps.basename(files[0].name)}_optimized.xlsx`;
        updateOptimizeOptionState();
        await analyzeOptimizeFile(files[0]);
      } else if (state.mode === "budgetBuilder") {
        populateBudgetSourceSheets();
        populateBudgetWorkTypes();
        clearBudgetPreview();
        await prepareBudgetDraft();
      } else {
        setStatus("อ่านไฟล์เรียบร้อย พร้อมประมวลผล", "success", 0);
      }
    } catch (error) {
      if (/ยกเลิก/.test(String(error && error.message))) {
        state.busy = false;
        els.cancelButton.classList.add("hidden");
        renderFiles();
        setStatus("ยกเลิกการวิเคราะห์แล้ว", "idle", 0);
      } else if (state.mode === "optimizeExcel" && state.files.length === 1) {
        // คง File object ไว้ในหน้าจอเพื่อให้ผู้ใช้เห็นชื่อ/ขนาดและอ่านข้อความผิดพลาด
        // ไม่ Reset จนไฟล์หายเหมือนเวอร์ชันก่อน
        terminateOptimizeWorker();
        state.busy = false;
        state.optimizeAnalysis = null;
        state.optimizeAnalysisError = error.message || "ไม่สามารถวิเคราะห์ไฟล์ได้";
        els.cancelButton.classList.add("hidden");
        els.optimizeWarning.textContent = state.optimizeAnalysisError;
        els.optimizeWarning.classList.remove("hidden");
        els.optimizeWarning.classList.add("danger");
        renderFiles();
        setStatus(state.optimizeAnalysisError, "error", 0);
      } else {
        resetFiles();
        setStatus(error.message || "ไม่สามารถอ่านไฟล์ได้", "error", 0);
      }
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
      const unitText = state.mode === "optimizeExcel" && !state.optimizeAnalysis
        ? (state.optimizeAnalysisError ? "วิเคราะห์ไม่สำเร็จ" : "รอวิเคราะห์")
        : config.kind === "pdf" ? `${item.unitCount} หน้า` : `${item.unitCount} Sheet`;
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
    } else if (state.mode === "optimizeExcel") {
      ready = state.parsed.length === 1 && !!state.optimizeAnalysis;
    } else if (state.mode === "budgetBuilder") {
      ready = state.parsed.length === 1 && state.budgetRecords.length > 0;
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
    if (state.mode === "optimizeExcel") {
      state.optimizeAnalysis = null;
      state.optimizeAnalysisError = "";
      state.optimizeReport = null;
      els.fileInput.value = "";
      els.analysisPanel.classList.add("hidden");
      els.integrityPanel.classList.add("hidden");
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

  async function processSplitPdf() {    setStatus("กำลังแยกหน้า PDF...", "working", 55);
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

  async function processPdf2Excel() {
    if (!PDFJS) throw new Error("โหลด PDF library ไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ");
    setStatus("กำลังอ่านข้อความจาก PDF...", "working", 20);

    const rawStart = parseInt(els.pageStart.value, 10);
    const rawEnd = parseInt(els.pageEnd.value, 10);
    const multiFile = state.parsed.length > 1;
    let done = 0;
    let planned = 0;

    // นับจำนวนหน้าที่จะแปลงจริง (ตามช่วงที่เลือก)
    const plans = [];
    for (const ref of state.parsed) {
      const doc = await getPdfjsDoc(ref);
      const start = Number.isFinite(rawStart) ? Math.max(1, rawStart) : 1;
      const end = Number.isFinite(rawEnd) ? Math.min(doc.numPages, rawEnd) : doc.numPages;
      plans.push({ ref, doc, start, end, base: ExcelOps.sanitizeSheetName(ExcelOps.basename(ref.name), "PDF") });
      if (end >= start) planned += end - start + 1;
    }
    if (planned <= 0) throw new Error("ช่วงหน้าที่เลือกไม่ถูกต้อง กรุณาตรวจหน้าเริ่ม/หน้าสิ้นสุด");

    const allRows = [];
    for (const plan of plans) {
      for (let p = plan.start; p <= plan.end; p += 1) {
        const page = await plan.doc.getPage(p);
        const content = await page.getTextContent();
        const items = content.items
          .filter((it) => typeof it.str === "string")
          .map((it) => {
            const tr = it.transform || [1, 0, 0, 1, 0, 0];
            return { str: it.str, x: tr[4], y: tr[5], w: it.width || 0, h: it.height || Math.abs(tr[3]) || 10 };
          });
        const roadPack = !!(els.roadMode && els.roadMode.checked);
        let matrix = PdfTableOps.buildMatrixFromItems(items, { roadPack });
        if (roadPack && PdfTableOps.normalizeRoadBudgetMatrix) {
          matrix = PdfTableOps.normalizeRoadBudgetMatrix(matrix);
        }
        matrix = PdfTableOps.mergeWrappedRows(matrix);
        const header = multiFile ? `— ${plan.base} หน้า ${p} —` : `— หน้า ${p} —`;
        allRows.push([header]);
        matrix.forEach((r) => allRows.push(r));
        done += 1;
        setStatus(`กำลังแปลงหน้า ${done}/${planned}`, "working", 20 + (done / planned) * 70);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (!allRows.length) throw new Error("ไม่พบเนื้อหาใน PDF");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    const colCount = allRows.reduce((mx, r) => Math.max(mx, r.length), 0) || 1;
    const roadPackEnabled = !!(els.roadMode && els.roadMode.checked);
    if (roadPackEnabled && colCount <= 2) {
      worksheet["!cols"] = [{ wch: 100 }, { wch: 22 }];
    } else {
      worksheet["!cols"] = Array.from({ length: colCount }, (_, col) => {
        let max = 8;
        for (let r = 0; r < allRows.length; r += 1) {
          const v = allRows[r][col];
          if (v != null) max = Math.max(max, String(v).length);
        }
        return { wch: Math.min(max + 2, 60) };
      });
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, "PDF Data");

    const outputName = ensureExtension(els.outputName.value, "xlsx");
    XLSX.writeFile(workbook, outputName, { bookType: "xlsx", compression: true });
    return `แปลง ${planned} หน้าเป็น 1 Sheet (PDF Data) ใน ${outputName}`;
  }

  let tesseractPromise = null;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!tesseractPromise) {
      tesseractPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
        s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("Tesseract ไม่พร้อมใช้งาน")));
        s.onerror = () => reject(new Error("โหลด OCR engine ไม่สำเร็จ — ตรวจการเชื่อมต่ออินเทอร์เน็ต"));
        document.head.appendChild(s);
      });
    }
    return tesseractPromise;
  }

  async function processOcr2Excel() {
    if (!PDFJS) throw new Error("โหลด PDF library ไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ");
    setStatus("กำลังโหลด OCR engine (ครั้งแรกช้า ~7MB)...", "working", 8);
    const Tesseract = await loadTesseract();

    const rawStart = parseInt(els.pageStart.value, 10);
    const rawEnd = parseInt(els.pageEnd.value, 10);
    const plans = [];
    let planned = 0;
    for (const ref of state.parsed) {
      const doc = await getPdfjsDoc(ref);
      const start = Number.isFinite(rawStart) ? Math.max(1, rawStart) : 1;
      const end = Number.isFinite(rawEnd) ? Math.min(doc.numPages, rawEnd) : doc.numPages;
      plans.push({ ref, doc, start, end, base: ExcelOps.sanitizeSheetName(ExcelOps.basename(ref.name), "OCR") });
      if (end >= start) planned += end - start + 1;
    }
    if (planned <= 0) throw new Error("ช่วงหน้าที่เลือกไม่ถูกต้อง");

    setStatus("กำลังเตรียม OCR (ไทย+อังกฤษ)...", "working", 14);
    let done = 0;
    const worker = await Tesseract.createWorker("tha+eng", 1, {
      logger: (m) => {
        if (m && m.status === "recognizing text" && typeof m.progress === "number") {
          setStatus(`OCR หน้า ${done + 1}/${planned} (${Math.round(m.progress * 100)}%)`, "working", 20 + ((done + m.progress) / planned) * 70);
        }
      },
    });

    const workbook = XLSX.utils.book_new();
    const multiFile = state.parsed.length > 1;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const allRows = [];

    try {
      for (const plan of plans) {
        for (let p = plan.start; p <= plan.end; p += 1) {
          const page = await plan.doc.getPage(p);
          const viewport = page.getViewport({ scale: 2 }); // 2x เพื่อความคมของ OCR
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: ctx, viewport }).promise;

          const { data } = await worker.recognize(canvas, {}, { blocks: true });
          // ใช้ "บรรทัด" ตามลำดับการอ่านของ OCR + แก้ไขภาษาไทย
          const roadPack = !!(els.roadMode && els.roadMode.checked);
          const fix = (t) => (window.TextCorrect ? window.TextCorrect.correctThai(t, { roadPack }) : String(t || "").trim());
          let lines = (data.lines || []).map((l) => fix(l.text || "")).filter((t) => t);
          if (!lines.length) {
            lines = (data.text || "").split(/\r?\n/).map((s) => fix(s)).filter(Boolean);
          }

          const header = multiFile ? `— ${plan.base} หน้า ${p} —` : `— หน้า ${p} —`;
          allRows.push([header]);
          if (lines.length) lines.forEach((t) => allRows.push([t]));
          else allRows.push(["(OCR ไม่พบข้อความในหน้านี้)"]);
          allRows.push([""]);
          done += 1;
        }
      }
    } finally {
      await worker.terminate();
    }

    if (!allRows.length) throw new Error("ไม่พบเนื้อหาจาก OCR");
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    worksheet["!cols"] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "OCR Data");

    if (!workbook.SheetNames.length) throw new Error("ไม่พบเนื้อหาจาก OCR");
    const outputName = ensureExtension(els.outputName.value, "xlsx");
    XLSX.writeFile(workbook, outputName, { bookType: "xlsx", compression: true });
    return `OCR ${planned} หน้าเป็น ${workbook.SheetNames.length} Sheet ใน ${outputName} (โปรดตรวจทานความถูกต้อง)`;
  }

  async function processBudgetBuilder() {
    if (!window.BudgetBuilderOps || !window.BudgetMaster) throw new Error("โหลด Budget Builder module ไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ");
    if (!state.budgetRecords.length) await prepareBudgetDraft();
    const unconfirmed = state.budgetRecords.filter((record) => !record.workType || !record.workTypeConfirmed);
    if (unconfirmed.length) throw new Error(`ยังมี ${unconfirmed.length} รายการที่ยังไม่ได้ยืนยันประเภทงาน กรุณายืนยันก่อน Export`);
    setStatus("กำลังสร้าง Complete File แบบ Values Only...", "working", 55);
    const options = getBudgetBuilderOptions();
    const result = BudgetBuilderOps.buildWorkbookFromRecords(XLSX, state.budgetRecords, { ...options, rawMatrix: state.budgetMatrix });
    const outputName = ensureExtension(els.outputName.value, "xlsx");
    XLSX.writeFile(result.workbook, outputName, { bookType: "xlsx", compression: true, cellStyles: true });
    return `สร้าง ${outputName} เรียบร้อย · ${formatNumber(result.report.total)} รายการ · Values Only · ต้องตรวจ ${formatNumber(result.report.needsReview)}`;
  }

  async function processOptimizeExcel() {
    const file = state.files[0];
    if (!file || !state.optimizeAnalysis) throw new Error("กรุณาเลือกและรอวิเคราะห์ไฟล์ Excel ก่อน");

    const options = getOptimizeOptions();
    state.optimizeReport = null;
    els.integrityPanel.classList.add("hidden");
    const result = await runOptimizeWorker("optimize", file, options);
    const extension = String(result.fileName || "output.xlsx").split(".").pop().toLowerCase();
    const requestedBase = String(els.outputName.value || "optimized_file").replace(/\.[^.]+$/, "").trim() || "optimized_file";
    const outputName = `${requestedBase}.${extension}`;
    downloadBlob(new Blob([result.buffer], { type: result.mime || "application/octet-stream" }), outputName);
    state.optimizeReport = result.report;
    renderIntegrityReport(result.report);

    const reduction = typeof result.report.reductionPercent === "number"
      ? ` ลดขนาด ${result.report.reductionPercent.toFixed(1)}%`
      : "";
    const integrityText = result.report.integrity && result.report.integrity.cellsMatch
      ? "Data Cells ครบ"
      : "กรุณาตรวจ Integrity Report";
    return `สร้าง ${outputName} เรียบร้อย · ${integrityText}${reduction}`;
  }

  async function processFiles() {
    const config = currentConfig();
    const ready = state.mode === "mergePdf"
      ? state.pages.length >= 1
      : state.mode === "optimizeExcel"
        ? state.parsed.length === 1 && !!state.optimizeAnalysis
        : state.parsed.length >= (config.minimumFiles || 1);
    if (state.busy || !ready) return;
    state.busy = true;
    renderFiles();
    els.processButton.textContent = "กำลังประมวลผล...";
    els.cancelButton.classList.toggle("hidden", state.mode !== "optimizeExcel");

    try {
      let message;
      if (state.mode === "mergeExcel") message = await processMergeExcel();
      else if (state.mode === "combineExcel") message = await processCombineExcel();
      else if (state.mode === "splitExcel") message = await processSplitExcel();
      else if (state.mode === "pdf2excel") message = await processPdf2Excel();
      else if (state.mode === "ocr2excel") message = await processOcr2Excel();
      else if (state.mode === "optimizeExcel") message = await processOptimizeExcel();
      else if (state.mode === "budgetBuilder") message = await processBudgetBuilder();
      else if (state.mode === "mergePdf") message = await processMergePdf();
      else message = await processSplitPdf();
      setStatus(message, "success", 100);
    } catch (error) {
      console.error(error);
      if (/ยกเลิก/.test(String(error && error.message))) {
        setStatus("ยกเลิกการประมวลผลแล้ว ไฟล์ต้นฉบับไม่ได้ถูกแก้ไข", "idle", 0);
      } else {
        setStatus(error.message || "เกิดข้อผิดพลาดระหว่างประมวลผล", "error", 0);
      }
    } finally {
      state.busy = false;
      els.cancelButton.classList.add("hidden");
      els.processButton.textContent = config.button;
      renderFiles();
    }
  }

  els.modeCards.forEach((card) => card.addEventListener("click", () => updateMode(card.dataset.mode)));
  els.fileInput.addEventListener("change", (event) => addFiles(event.target.files));
  els.resetButton.addEventListener("click", resetFiles);
  els.processButton.addEventListener("click", processFiles);
  els.cancelButton.addEventListener("click", cancelOptimizeJob);
  els.budgetAgency.addEventListener("change", () => { populateBudgetWorkTypes(); clearBudgetPreview("เปลี่ยนหน่วยงานแล้ว กรุณาวิเคราะห์รายการใหม่"); });
  els.budgetSourceSheet.addEventListener("change", () => clearBudgetPreview("เปลี่ยน Source Sheet แล้ว กรุณาวิเคราะห์รายการใหม่"));
  [els.constructionPercent, els.maintenancePercent, els.defaultConstructionType, els.defaultMaintenanceType, els.projectRowsOnly, els.roadBudgetOnly]
    .forEach((control) => control.addEventListener("change", () => clearBudgetPreview("เปลี่ยน Config แล้ว กรุณาวิเคราะห์รายการใหม่")));
  els.budgetPrepareButton.addEventListener("click", () => prepareBudgetDraft().catch((error) => setStatus(error.message || "วิเคราะห์รายการไม่สำเร็จ", "error", 0)));
  els.budgetSearch.addEventListener("input", () => { state.budgetPreviewPage = 1; renderBudgetPreview(); });
  els.budgetCategoryFilter.addEventListener("change", () => { state.budgetPreviewPage = 1; renderBudgetPreview(); });
  els.budgetFamilyFilter.addEventListener("change", () => { state.budgetPreviewPage = 1; renderBudgetPreview(); });
  els.budgetConfidenceFilter.addEventListener("change", () => { state.budgetPreviewPage = 1; renderBudgetPreview(); });
  els.budgetConfirmSuggested.addEventListener("click", confirmHighConfidenceSuggestions);
  els.budgetApplyBulk.addEventListener("click", applyBudgetBulkType);
  els.budgetPrevPage.addEventListener("click", () => { state.budgetPreviewPage -= 1; renderBudgetPreview(); });
  els.budgetNextPage.addEventListener("click", () => { state.budgetPreviewPage += 1; renderBudgetPreview(); });
  els.budgetPreviewBody.addEventListener("change", (event) => {
    const select = event.target.closest(".budget-worktype-select");
    if (select) updateBudgetRecordWorkType(Number(select.dataset.index), select.value);
  });
  [
    els.optimizeMode,
    els.optimizeFormat,
    els.removeComments,
    els.removeLinks,
    els.removeMerges,
    els.removeHiddenSheets,
    els.splitLargeFile,
    els.splitRowCount,
    els.preserveHeader,
  ].forEach((control) => control.addEventListener("change", updateOptimizeOptionState));
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
