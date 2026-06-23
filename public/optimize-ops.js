(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OptimizeOps = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  /*
   * Core logic ของเมนู 08 ถูกแยกเป็น Pure Functions เพื่อให้ทดสอบได้โดยไม่ต้องเปิด Browser
   * หลักการสำคัญคือสร้าง Workbook ใหม่จาก Cell ที่มีข้อมูลจริง แทนการแก้ไฟล์ต้นฉบับโดยตรง
   */
  const META_KEYS = new Set(["!ref", "!margins", "!cols", "!rows", "!merges", "!protect", "!autofilter", "!outline"]);
  const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

  function basename(filename) {
    return String(filename || "workbook").replace(/\.[^.]+$/, "");
  }

  function sanitizeFilename(value, fallback = "optimized") {
    const cleaned = String(value || "")
      .replace(INVALID_FILE_CHARS, "_")
      .replace(/[. ]+$/g, "")
      .trim();
    return cleaned || fallback;
  }

  function isMeaningfulCell(cell) {
    if (!cell || typeof cell !== "object") return false;
    return cell.f !== undefined || (cell.v !== undefined && cell.v !== null && cell.v !== "");
  }

  function isDenseSheet(worksheet) {
    return Array.isArray(worksheet);
  }

  function forEachCell(XLSX, worksheet, callback) {
    if (!worksheet) return;
    if (isDenseSheet(worksheet)) {
      for (let rowIndex = 0; rowIndex < worksheet.length; rowIndex += 1) {
        const row = worksheet[rowIndex];
        if (!Array.isArray(row)) continue;
        for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
          const cell = row[colIndex];
          if (cell) callback(cell, rowIndex, colIndex);
        }
      }
      return;
    }

    for (const address of Object.keys(worksheet)) {
      if (address[0] === "!" || META_KEYS.has(address)) continue;
      const cell = worksheet[address];
      if (!cell) continue;
      const decoded = XLSX.utils.decode_cell(address);
      callback(cell, decoded.r, decoded.c);
    }
  }

  function getCell(XLSX, worksheet, rowIndex, colIndex) {
    if (isDenseSheet(worksheet)) return worksheet[rowIndex] && worksheet[rowIndex][colIndex];
    return worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })];
  }

  function setCell(XLSX, worksheet, rowIndex, colIndex, cell) {
    if (isDenseSheet(worksheet)) {
      if (!worksheet[rowIndex]) worksheet[rowIndex] = [];
      worksheet[rowIndex][colIndex] = cell;
    } else {
      worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })] = cell;
    }
  }

  function decodeDeclaredRange(XLSX, worksheet) {
    if (!worksheet || !worksheet["!ref"]) return null;
    try {
      return XLSX.utils.decode_range(worksheet["!ref"]);
    } catch (_error) {
      return null;
    }
  }

  function hasMeaningfulStyle(style) {
    if (!style || typeof style !== "object") return false;
    const keys = Object.keys(style);
    if (!keys.length) return false;
    return keys.some((key) => key !== "patternType" || (style.patternType && style.patternType !== "none"));
  }

  function inspectSheet(XLSX, worksheet) {
    let minRow = Infinity;
    let minCol = Infinity;
    let maxRow = -1;
    let maxCol = -1;
    let nonEmptyCells = 0;
    let formulaCells = 0;
    let commentCells = 0;
    let hyperlinkCells = 0;
    let styleCells = 0;
    const nonEmptyRowSet = new Set();

    forEachCell(XLSX, worksheet, (cell, rowIndex, colIndex) => {
      if (cell.c && cell.c.length) commentCells += 1;
      if (cell.l) hyperlinkCells += 1;
      if (hasMeaningfulStyle(cell.s)) styleCells += 1;
      if (!isMeaningfulCell(cell)) return;

      nonEmptyCells += 1;
      if (cell.f !== undefined) formulaCells += 1;
      minRow = Math.min(minRow, rowIndex);
      minCol = Math.min(minCol, colIndex);
      maxRow = Math.max(maxRow, rowIndex);
      maxCol = Math.max(maxCol, colIndex);
      nonEmptyRowSet.add(rowIndex);
    });

    const declared = decodeDeclaredRange(XLSX, worksheet);
    const declaredRows = declared ? declared.e.r - declared.s.r + 1 : 0;
    const declaredCols = declared ? declared.e.c - declared.s.c + 1 : 0;
    const actualRows = maxRow >= 0 ? maxRow + 1 : 0;
    const actualCols = maxCol >= 0 ? maxCol + 1 : 0;
    const merges = Array.isArray(worksheet && worksheet["!merges"]) ? worksheet["!merges"].length : 0;

    return {
      minRow: Number.isFinite(minRow) ? minRow : 0,
      minCol: Number.isFinite(minCol) ? minCol : 0,
      maxRow,
      maxCol,
      actualRows,
      actualCols,
      nonEmptyRows: nonEmptyRowSet.size,
      nonEmptyCells,
      formulaCells,
      commentCells,
      hyperlinkCells,
      styleCells,
      merges,
      declaredRows,
      declaredCols,
      declaredCells: declaredRows * declaredCols,
      actualRange: maxRow >= 0 ? XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } }) : "",
      declaredRange: worksheet && worksheet["!ref"] ? worksheet["!ref"] : "",
      bloatedRange: declaredRows > actualRows + 100 || declaredCols > actualCols + 20,
    };
  }

  function hiddenState(workbook, sheetName) {
    const sheets = workbook && workbook.Workbook && Array.isArray(workbook.Workbook.Sheets)
      ? workbook.Workbook.Sheets
      : [];
    const entry = sheets.find((item) => item && item.name === sheetName);
    return entry && Number.isFinite(entry.Hidden) ? entry.Hidden : 0;
  }

  // สรุปสภาพไฟล์ก่อนทำงาน เพื่อใช้เตือน Memory Risk และเป็น Baseline ของ Integrity Report
  function analyzeWorkbook(XLSX, workbook, fileSize = 0) {
    if (!XLSX) throw new Error("XLSX library is required.");
    if (!workbook || !Array.isArray(workbook.SheetNames)) throw new Error("Invalid workbook.");

    const sheets = workbook.SheetNames.map((sheetName) => {
      const metrics = inspectSheet(XLSX, workbook.Sheets[sheetName]);
      return {
        name: sheetName,
        hidden: hiddenState(workbook, sheetName),
        ...metrics,
      };
    });

    const total = sheets.reduce(
      (summary, sheet) => {
        summary.rows += sheet.actualRows;
        summary.nonEmptyRows += sheet.nonEmptyRows;
        summary.columns = Math.max(summary.columns, sheet.actualCols);
        summary.cells += sheet.nonEmptyCells;
        summary.formulas += sheet.formulaCells;
        summary.comments += sheet.commentCells;
        summary.hyperlinks += sheet.hyperlinkCells;
        summary.styles += sheet.styleCells;
        summary.merges += sheet.merges;
        summary.hiddenSheets += sheet.hidden ? 1 : 0;
        summary.declaredCells += sheet.declaredCells;
        if (sheet.bloatedRange) summary.bloatedSheets += 1;
        return summary;
      },
      {
        sheets: sheets.length,
        rows: 0,
        nonEmptyRows: 0,
        columns: 0,
        cells: 0,
        formulas: 0,
        comments: 0,
        hyperlinks: 0,
        styles: 0,
        merges: 0,
        hiddenSheets: 0,
        declaredCells: 0,
        bloatedSheets: 0,
        fileSize,
      }
    );

    total.memoryRisk = total.cells >= 3000000 || fileSize >= 80 * 1024 * 1024
      ? "high"
      : total.cells >= 1500000 || fileSize >= 40 * 1024 * 1024
        ? "medium"
        : "normal";

    return { total, sheets };
  }

  function cloneCell(cell, options) {
    const valuesOnly = options.mode === "values";
    const cloned = {};

    if (cell.v !== undefined) cloned.v = cell.v;
    else if (valuesOnly && cell.w !== undefined) {
      cloned.v = String(cell.w);
      cloned.t = "s";
    }
    if (cloned.t === undefined && cell.t !== undefined) cloned.t = cell.t;
    if (!valuesOnly && cell.f !== undefined) cloned.f = cell.f;
    if (cell.z !== undefined && cell.z !== "General") cloned.z = cell.z;

    if (!options.removeComments && cell.c) cloned.c = cell.c.map((item) => ({ ...item }));
    if (!options.removeLinks && cell.l) cloned.l = { ...cell.l };

    if (cloned.v === undefined && cloned.f === undefined) return null;
    return cloned;
  }

  function copySheetMetadata(XLSX, source, target, bounds, options) {
    if (bounds.maxRow < 0 || bounds.maxCol < 0) {
      target["!ref"] = "A1";
      return;
    }
    target["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: bounds.maxRow, c: bounds.maxCol } });

    if (!options.removeMerges && Array.isArray(source["!merges"])) {
      target["!merges"] = source["!merges"]
        .filter((merge) => merge.s.r <= bounds.maxRow && merge.s.c <= bounds.maxCol)
        .map((merge) => ({
          s: { r: merge.s.r, c: merge.s.c },
          e: { r: Math.min(merge.e.r, bounds.maxRow), c: Math.min(merge.e.c, bounds.maxCol) },
        }));
    }
    if (source["!autofilter"] && source["!autofilter"].ref) {
      try {
        const filterRange = XLSX.utils.decode_range(source["!autofilter"].ref);
        if (filterRange.s.r <= bounds.maxRow && filterRange.s.c <= bounds.maxCol) {
          filterRange.e.r = Math.min(filterRange.e.r, bounds.maxRow);
          filterRange.e.c = Math.min(filterRange.e.c, bounds.maxCol);
          target["!autofilter"] = { ref: XLSX.utils.encode_range(filterRange) };
        }
      } catch (_error) {
        // ข้าม AutoFilter ที่อ้างอิงช่วงไม่ถูกต้อง
      }
    }
  }

  function buildOptimizedSheet(XLSX, source, options, metrics) {
    const target = [];
    let copiedCells = 0;
    let formulaCells = 0;

    forEachCell(XLSX, source, (cell, rowIndex, colIndex) => {
      if (!isMeaningfulCell(cell)) return;
      const cloned = cloneCell(cell, options);
      if (!cloned) return;
      setCell(XLSX, target, rowIndex, colIndex, cloned);
      copiedCells += 1;
      if (cloned.f !== undefined) formulaCells += 1;
    });

    copySheetMetadata(XLSX, source, target, metrics, options);
    return { worksheet: target, copiedCells, formulaCells };
  }

  function applyWorkbookVisibility(workbook, sheetStates) {
    if (!sheetStates.length) return;
    workbook.Workbook = workbook.Workbook || {};
    workbook.Workbook.Sheets = sheetStates.map((entry) => ({ name: entry.name, Hidden: entry.hidden || 0 }));
  }

  // สร้าง Workbook ใหม่ทั้งเล่ม: Values Only ตัด Formula ส่วน Safe Mode เก็บ Formula/Number Format
  function optimizeWorkbook(XLSX, workbook, options = {}, onProgress = null) {
    const normalized = {
      mode: options.mode === "values" ? "values" : "safe",
      removeComments: options.removeComments !== false,
      removeLinks: options.removeLinks !== false,
      removeMerges: options.removeMerges === true,
      removeHiddenSheets: options.removeHiddenSheets === true,
    };
    const before = analyzeWorkbook(XLSX, workbook, options.fileSize || 0);
    const output = XLSX.utils.book_new();
    const visibility = [];
    const stats = {
      sourceCells: 0,
      copiedSourceCells: 0,
      formulasBefore: 0,
      formulasAfter: 0,
      commentsRemoved: 0,
      hyperlinksRemoved: 0,
      mergesRemoved: 0,
      hiddenSheetsRemoved: 0,
    };

    workbook.SheetNames.forEach((sheetName, index) => {
      const metrics = before.sheets[index];
      if (normalized.removeHiddenSheets && metrics.hidden) {
        stats.hiddenSheetsRemoved += 1;
        if (onProgress) onProgress(index + 1, workbook.SheetNames.length, sheetName, "skip");
        return;
      }
      stats.sourceCells += metrics.nonEmptyCells;
      stats.formulasBefore += metrics.formulaCells;

      const built = buildOptimizedSheet(XLSX, workbook.Sheets[sheetName], normalized, metrics);
      XLSX.utils.book_append_sheet(output, built.worksheet, sheetName);
      visibility.push({ name: sheetName, hidden: metrics.hidden });
      stats.copiedSourceCells += built.copiedCells;
      stats.formulasAfter += built.formulaCells;
      if (normalized.removeComments) stats.commentsRemoved += metrics.commentCells;
      if (normalized.removeLinks) stats.hyperlinksRemoved += metrics.hyperlinkCells;
      if (normalized.removeMerges) stats.mergesRemoved += metrics.merges;
      if (onProgress) onProgress(index + 1, workbook.SheetNames.length, sheetName, "copy");
    });

    if (!output.SheetNames.length) throw new Error("ไม่มี Sheet เหลืออยู่หลังใช้ตัวเลือกที่กำหนด");
    applyWorkbookVisibility(output, visibility);
    return { workbook: output, before, stats };
  }

  function firstMeaningfulRow(XLSX, worksheet, maxRow) {
    for (let rowIndex = 0; rowIndex <= maxRow; rowIndex += 1) {
      let found = false;
      if (isDenseSheet(worksheet)) {
        const row = worksheet[rowIndex];
        if (Array.isArray(row)) found = row.some(isMeaningfulCell);
      } else {
        forEachCell(XLSX, worksheet, (cell, r) => {
          if (r === rowIndex && isMeaningfulCell(cell)) found = true;
        });
      }
      if (found) return rowIndex;
    }
    return 0;
  }

  function copyRow(XLSX, source, sourceRowIndex, target, targetRowIndex, maxCol, options) {
    let copied = 0;
    let formulas = 0;
    for (let colIndex = 0; colIndex <= maxCol; colIndex += 1) {
      const cell = getCell(XLSX, source, sourceRowIndex, colIndex);
      if (!isMeaningfulCell(cell)) continue;
      const cloned = cloneCell(cell, options);
      if (!cloned) continue;
      setCell(XLSX, target, targetRowIndex, colIndex, cloned);
      copied += 1;
      if (cloned.f !== undefined) formulas += 1;
    }
    return { copied, formulas };
  }

  // แบ่งข้อมูลตามจำนวนแถว โดยนับ Header เพียงครั้งเดียวใน Integrity Control แม้จะทำซ้ำทุก Part
  function splitWorkbookByRows(XLSX, workbook, options = {}, onProgress = null) {
    const chunkSize = Math.max(1, Number(options.chunkSize) || 50000);
    const preserveHeader = options.preserveHeader !== false;
    const normalized = {
      mode: options.mode === "values" ? "values" : "safe",
      removeComments: options.removeComments !== false,
      removeLinks: options.removeLinks !== false,
      removeMerges: true,
      removeHiddenSheets: options.removeHiddenSheets === true,
    };
    const before = analyzeWorkbook(XLSX, workbook, options.fileSize || 0);
    const outputs = [];
    const stats = {
      sourceCells: 0,
      copiedSourceCells: 0,
      formulasBefore: 0,
      formulasAfter: 0,
      outputParts: 0,
      repeatedHeaderRows: 0,
      hiddenSheetsRemoved: 0,
      commentsRemoved: 0,
      hyperlinksRemoved: 0,
      mergesRemoved: 0,
    };

    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const metrics = before.sheets[sheetIndex];
      if (normalized.removeHiddenSheets && metrics.hidden) {
        stats.hiddenSheetsRemoved += 1;
        return;
      }
      stats.sourceCells += metrics.nonEmptyCells;
      stats.formulasBefore += metrics.formulaCells;
      if (normalized.removeComments) stats.commentsRemoved += metrics.commentCells;
      if (normalized.removeLinks) stats.hyperlinksRemoved += metrics.hyperlinkCells;
      stats.mergesRemoved += metrics.merges;
      if (metrics.maxRow < 0) return;

      const source = workbook.Sheets[sheetName];
      const headerRow = preserveHeader ? metrics.minRow : -1;
      const dataStart = preserveHeader ? headerRow + 1 : 0;
      const totalDataRows = Math.max(0, metrics.maxRow - dataStart + 1);
      const parts = Math.max(1, Math.ceil(totalDataRows / chunkSize));

      for (let part = 0; part < parts; part += 1) {
        const sourceStart = dataStart + part * chunkSize;
        const sourceEnd = Math.min(metrics.maxRow, sourceStart + chunkSize - 1);
        const target = [];
        let targetRow = 0;

        if (preserveHeader && headerRow >= 0) {
          const headerStats = copyRow(XLSX, source, headerRow, target, targetRow, metrics.maxCol, normalized);
          if (part === 0) {
            stats.copiedSourceCells += headerStats.copied;
            stats.formulasAfter += headerStats.formulas;
          } else {
            stats.repeatedHeaderRows += 1;
          }
          targetRow += 1;
        }

        for (let sourceRow = sourceStart; sourceRow <= sourceEnd; sourceRow += 1) {
          const rowStats = copyRow(XLSX, source, sourceRow, target, targetRow, metrics.maxCol, normalized);
          stats.copiedSourceCells += rowStats.copied;
          stats.formulasAfter += rowStats.formulas;
          targetRow += 1;
        }

        const lastTargetRow = Math.max(0, targetRow - 1);
        target["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastTargetRow, c: Math.max(0, metrics.maxCol) } });
        const outputWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(outputWorkbook, target, sheetName.slice(0, 31));
        outputs.push({
          workbook: outputWorkbook,
          sheetName,
          part: part + 1,
          rowCount: Math.max(0, sourceEnd - sourceStart + 1),
        });
        stats.outputParts += 1;
        if (onProgress) onProgress(outputs.length, null, `${sheetName} Part ${part + 1}`, "split");
      }
    });

    if (!outputs.length) throw new Error("ไม่พบข้อมูลสำหรับแบ่งไฟล์");
    return { outputs, before, stats };
  }

  function makeReport(before, after, stats, outputSize = 0, outputParts = 1) {
    const inputSize = before.total.fileSize || 0;
    const reductionPercent = inputSize > 0 && outputSize >= 0
      ? ((inputSize - outputSize) / inputSize) * 100
      : null;
    return {
      before: before.total,
      after: after ? after.total : null,
      stats,
      outputSize,
      outputParts,
      reductionPercent,
      integrity: {
        cellsMatch: stats.sourceCells === stats.copiedSourceCells,
        sourceCells: stats.sourceCells,
        copiedSourceCells: stats.copiedSourceCells,
        formulasExpected: stats.formulasBefore,
        formulasOutput: stats.formulasAfter,
      },
    };
  }

  return {
    basename,
    sanitizeFilename,
    isMeaningfulCell,
    inspectSheet,
    analyzeWorkbook,
    optimizeWorkbook,
    splitWorkbookByRows,
    makeReport,
  };
});
