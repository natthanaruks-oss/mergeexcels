(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BatchRenameOps = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

  function splitName(filename) {
    const name = String(filename || "");
    const idx = name.lastIndexOf(".");
    if (idx <= 0) return { stem: name, ext: "" };
    return { stem: name.slice(0, idx), ext: name.slice(idx) };
  }

  function cleanStem(value) {
    let text = String(value == null ? "" : value)
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/g, "");
    if (!text) text = "file";
    if (WINDOWS_RESERVED.test(text)) text = `_${text}`;
    return text;
  }

  function cleanExtension(ext) {
    const raw = String(ext || "").replace(/[\\/:*?"<>|\s]/g, "");
    if (!raw) return "";
    return raw.startsWith(".") ? raw : `.${raw}`;
  }

  function replaceLiteral(text, findText, replacement) {
    if (!findText) return text;
    return String(text).split(String(findText)).join(String(replacement || ""));
  }

  function formatRunning(index, start, digits) {
    const value = Number(start || 1) + index;
    const width = Math.min(10, Math.max(1, Number(digits || 3)));
    return String(value).padStart(width, "0");
  }

  function normalizeDate(dateValue) {
    const match = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[1]}${match[2]}${match[3]}` : "";
  }

  function renameOne(filename, index, options = {}) {
    const parts = splitName(filename);
    let stem = parts.stem;
    if (options.find) stem = replaceLiteral(stem, options.find, options.replace || "");
    if (options.clean !== false) stem = cleanStem(stem);

    const piecesBefore = [];
    const piecesAfter = [];
    if (options.prefix) piecesBefore.push(cleanStem(options.prefix));
    if (options.useDate) {
      const dateToken = normalizeDate(options.date);
      if (dateToken) piecesBefore.push(dateToken);
    }
    if (options.useRunning) piecesBefore.push(formatRunning(index, options.runningStart, options.runningDigits));
    if (options.suffix) piecesAfter.push(cleanStem(options.suffix));

    const separator = options.separator == null ? "_" : String(options.separator);
    const all = [...piecesBefore, stem, ...piecesAfter].filter(Boolean);
    let renamedStem = all.join(separator);
    if (options.clean !== false) renamedStem = cleanStem(renamedStem);
    if (renamedStem.length > 180) renamedStem = renamedStem.slice(0, 180).replace(/[. ]+$/g, "");

    const ext = options.keepExtension === false ? "" : cleanExtension(parts.ext);
    return `${renamedStem}${ext}`;
  }

  function buildPlan(files, options = {}) {
    const rows = (files || []).map((file, index) => {
      const original = typeof file === "string" ? file : file.name;
      const renamed = renameOne(original, index, options);
      return { index, original, renamed, collision: false, changed: original !== renamed };
    });

    const counts = new Map();
    for (const row of rows) {
      const key = row.renamed.toLocaleLowerCase("en-US");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const row of rows) {
      const key = row.renamed.toLocaleLowerCase("en-US");
      row.collision = counts.get(key) > 1;
    }
    return rows;
  }

  return { splitName, cleanStem, replaceLiteral, formatRunning, normalizeDate, renameOne, buildPlan };
});
