(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ExcelOps = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const INVALID_SHEET_CHARS = /[\\/?*\[\]:]/g;
  const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

  function basename(filename) {
    return String(filename || "workbook").replace(/\.[^.]+$/, "");
  }

  function sanitizeFilename(value, fallback = "workbook") {
    const cleaned = String(value || "")
      .replace(INVALID_FILE_CHARS, "_")
      .replace(/[. ]+$/g, "")
      .trim();
    return cleaned || fallback;
  }

  function sanitizeSheetName(value, fallback = "Sheet") {
    const cleaned = String(value || "")
      .replace(INVALID_SHEET_CHARS, "_")
      .replace(/^'+|'+$/g, "")
      .trim();
    return (cleaned || fallback).slice(0, 31);
  }

  function uniqueSheetName(preferred, usedNames, suffixHint = "") {
    const used = new Set(Array.from(usedNames, (name) => String(name).toLowerCase()));
    const cleanPreferred = sanitizeSheetName(preferred);
    if (!used.has(cleanPreferred.toLowerCase())) return cleanPreferred;

    const hint = sanitizeSheetName(suffixHint, "").trim();
    if (hint) {
      const separator = " - ";
      const maxBase = 31 - separator.length - hint.length;
      const candidate = `${cleanPreferred.slice(0, Math.max(1, maxBase))}${separator}${hint}`.slice(0, 31);
      if (!used.has(candidate.toLowerCase())) return candidate;
    }

    for (let index = 2; index < 10000; index += 1) {
      const suffix = ` (${index})`;
      const candidate = `${cleanPreferred.slice(0, 31 - suffix.length)}${suffix}`;
      if (!used.has(candidate.toLowerCase())) return candidate;
    }
    throw new Error("Unable to create a unique worksheet name.");
  }

  function isEmptyValue(value) {
    return value === null || value === undefined || value === "";
  }

  function isEmptyRow(row) {
    return !Array.isArray(row) || row.every(isEmptyValue);
  }

  function trimMatrix(matrix) {
    const rows = Array.isArray(matrix) ? matrix.map((row) => (Array.isArray(row) ? row.slice() : [])) : [];
    while (rows.length && isEmptyRow(rows[rows.length - 1])) rows.pop();
    let width = 0;
    for (const row of rows) {
      let last = row.length - 1;
      while (last >= 0 && isEmptyValue(row[last])) last -= 1;
      width = Math.max(width, last + 1);
    }
    return rows.map((row) => row.slice(0, width));
  }

  function normalizeHeaders(rawHeaders, width) {
    const counts = new Map();
    const headers = [];
    for (let col = 0; col < width; col += 1) {
      const raw = rawHeaders[col];
      const base = String(isEmptyValue(raw) ? `Column ${col + 1}` : raw).trim() || `Column ${col + 1}`;
      const count = (counts.get(base.toLowerCase()) || 0) + 1;
      counts.set(base.toLowerCase(), count);
      headers.push(count === 1 ? base : `${base} (${count})`);
    }
    return headers;
  }

  function mergeWorkbooks(XLSX, inputs) {
    if (!XLSX) throw new Error("XLSX library is required.");
    if (!Array.isArray(inputs) || inputs.length < 1) throw new Error("Select at least one Excel file.");

    const output = XLSX.utils.book_new();
    const usedNames = new Set();

    for (const input of inputs) {
      const workbook = input.workbook;
      if (!workbook || !Array.isArray(workbook.SheetNames)) continue;
      const fileHint = sanitizeSheetName(basename(input.name), "File");

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const finalName = uniqueSheetName(sheetName, usedNames, fileHint);
        XLSX.utils.book_append_sheet(output, worksheet, finalName);
        usedNames.add(finalName);
      }
    }

    if (!output.SheetNames.length) throw new Error("No worksheets were found in the selected files.");
    return output;
  }

  function collectSheetMatrices(XLSX, inputs) {
    const collected = [];
    for (const input of inputs) {
      const workbook = input.workbook;
      if (!workbook || !Array.isArray(workbook.SheetNames)) continue;
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const matrix = trimMatrix(
          XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            raw: true,
            blankrows: false,
          })
        );
        if (!matrix.length) continue;
        collected.push({ fileName: input.name, sheetName, matrix });
      }
    }
    return collected;
  }

  function combineWorkbooks(XLSX, inputs, options = {}) {
    if (!XLSX) throw new Error("XLSX library is required.");
    if (!Array.isArray(inputs) || inputs.length < 1) throw new Error("Select at least one Excel file.");

    const useHeader = options.useHeader !== false;
    const addSourceColumns = options.addSourceColumns !== false;
    const outputSheetName = sanitizeSheetName(options.outputSheetName || "Combined Data");
    const sources = collectSheetMatrices(XLSX, inputs);
    if (!sources.length) throw new Error("No data was found in the selected worksheets.");

    const outputRows = [];

    if (useHeader) {
      const unionHeaders = [];
      const unionLookup = new Map();
      const prepared = [];

      for (const source of sources) {
        const width = source.matrix.reduce((max, row) => Math.max(max, row.length), 0);
        const headers = normalizeHeaders(source.matrix[0] || [], width);
        for (const header of headers) {
          const key = header.toLowerCase();
          if (!unionLookup.has(key)) {
            unionLookup.set(key, unionHeaders.length);
            unionHeaders.push(header);
          }
        }
        prepared.push({ ...source, headers, rows: source.matrix.slice(1) });
      }

      const outputHeaders = addSourceColumns
        ? ["Source File", "Source Sheet", ...unionHeaders]
        : unionHeaders.slice();
      outputRows.push(outputHeaders);

      for (const source of prepared) {
        for (const row of source.rows) {
          if (isEmptyRow(row)) continue;
          const mapped = Array(unionHeaders.length).fill("");
          source.headers.forEach((header, index) => {
            const target = unionLookup.get(header.toLowerCase());
            if (target !== undefined) mapped[target] = row[index] ?? "";
          });
          outputRows.push(
            addSourceColumns ? [source.fileName, source.sheetName, ...mapped] : mapped
          );
        }
      }
    } else {
      const maxWidth = sources.reduce(
        (max, source) => Math.max(max, ...source.matrix.map((row) => row.length)),
        0
      );
      const genericHeaders = Array.from({ length: maxWidth }, (_, index) => `Column ${index + 1}`);
      outputRows.push(
        addSourceColumns
          ? ["Source File", "Source Sheet", ...genericHeaders]
          : genericHeaders
      );

      for (const source of sources) {
        for (const row of source.matrix) {
          if (isEmptyRow(row)) continue;
          const padded = Array.from({ length: maxWidth }, (_, index) => row[index] ?? "");
          outputRows.push(
            addSourceColumns ? [source.fileName, source.sheetName, ...padded] : padded
          );
        }
      }
    }

    const output = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(outputRows);
    worksheet["!autofilter"] = { ref: worksheet["!ref"] || "A1" };

    const widths = outputRows[0].map((_, colIndex) => {
      let maxLength = 10;
      const sampleLimit = Math.min(outputRows.length, 500);
      for (let rowIndex = 0; rowIndex < sampleLimit; rowIndex += 1) {
        const value = outputRows[rowIndex][colIndex];
        const length = value === null || value === undefined ? 0 : String(value).length;
        maxLength = Math.max(maxLength, length);
      }
      return { wch: Math.min(maxLength + 2, 40) };
    });
    worksheet["!cols"] = widths;

    XLSX.utils.book_append_sheet(output, worksheet, outputSheetName);
    return output;
  }

  function splitWorkbook(XLSX, input) {
    if (!XLSX) throw new Error("XLSX library is required.");
    if (!input || !input.workbook) throw new Error("Select one Excel file.");

    const workbook = input.workbook;
    const base = sanitizeFilename(basename(input.name));
    if (!Array.isArray(workbook.SheetNames) || !workbook.SheetNames.length) {
      throw new Error("No worksheets were found in the selected file.");
    }

    const usedFileNames = new Set();
    return workbook.SheetNames.map((sheetName, index) => {
      const output = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(output, workbook.Sheets[sheetName], sanitizeSheetName(sheetName));

      const rawName = sanitizeFilename(`${base}_${sheetName}`, `${base}_Sheet_${index + 1}`);
      let fileName = `${rawName}.xlsx`;
      let counter = 2;
      while (usedFileNames.has(fileName.toLowerCase())) {
        fileName = `${rawName}_${counter}.xlsx`;
        counter += 1;
      }
      usedFileNames.add(fileName.toLowerCase());
      return { fileName, workbook: output, sheetName };
    });
  }

  return {
    basename,
    sanitizeFilename,
    sanitizeSheetName,
    uniqueSheetName,
    mergeWorkbooks,
    combineWorkbooks,
    splitWorkbook,
  };
});
