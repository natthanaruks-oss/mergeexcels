const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const XLSX = require("xlsx");
const JSZip = require("jszip");
const OptimizeOps = require("../public/optimize-ops.js");

global.XLSX = XLSX;
global.JSZip = JSZip;
global.OptimizeOps = OptimizeOps;
global.importScripts = () => {};
global.self = global;

const messages = [];
self.postMessage = (message) => messages.push(message);
vm.runInThisContext(fs.readFileSync(require.resolve("../public/optimize-worker.js"), "utf8"), {
  filename: "optimize-worker.js",
});

function makeBuffer() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["ID", "Name", "Amount", "Formula"],
    [1, "Alpha", 100, 200],
    [2, "Beta", 250, 500],
    [3, "Gamma", 125, 250],
  ]);
  sheet.D2.f = "C2*2";
  sheet.D2.v = 200;
  XLSX.utils.book_append_sheet(workbook, sheet, "Oracle Export");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true });
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function send(data) {
  messages.length = 0;
  await self.onmessage({ data });
  const error = messages.find((message) => message.type === "error");
  if (error) throw new Error(error.message);
  return messages;
}

(async () => {
  const source = makeBuffer();

  let result = await send({
    action: "analyze",
    buffer: toArrayBuffer(source),
    fileName: "oracle.xlsx",
    fileSize: source.length,
  });
  const analysis = result.find((message) => message.type === "analysis");
  assert.equal(analysis.analysis.total.rows, 4);
  assert.equal(analysis.analysis.total.cells, 16);

  result = await send({
    action: "optimize",
    buffer: toArrayBuffer(source),
    fileName: "oracle.xlsx",
    fileSize: source.length,
    options: {
      mode: "values",
      outputFormat: "xlsx",
      removeComments: true,
      removeLinks: true,
      removeMerges: false,
      removeHiddenSheets: false,
      splitEnabled: false,
      chunkSize: 2,
      preserveHeader: true,
    },
  });
  const xlsxResult = result.find((message) => message.type === "result");
  assert.equal(xlsxResult.report.integrity.cellsMatch, true);
  const readback = XLSX.read(xlsxResult.buffer, { type: "array", dense: true });
  assert.equal(readback.Sheets[readback.SheetNames[0]].length, 4);
  assert.equal(readback.Sheets[readback.SheetNames[0]][1][3].f, undefined);

  result = await send({
    action: "optimize",
    buffer: toArrayBuffer(source),
    fileName: "oracle.xlsx",
    fileSize: source.length,
    options: {
      mode: "values",
      outputFormat: "csv",
      removeComments: true,
      removeLinks: true,
      removeMerges: false,
      removeHiddenSheets: false,
      splitEnabled: false,
      chunkSize: 2,
      preserveHeader: true,
    },
  });
  const csvResult = result.find((message) => message.type === "result");
  const csvBytes = Buffer.from(csvResult.buffer);
  assert.deepEqual([...csvBytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.match(csvBytes.toString("utf8"), /ID.*Name.*Amount/);
  assert.equal(csvResult.report.integrity.cellsMatch, true);
  assert.equal(csvResult.report.integrity.formulasOutput, 0);

  result = await send({
    action: "optimize",
    buffer: toArrayBuffer(source),
    fileName: "oracle.xlsx",
    fileSize: source.length,
    options: {
      mode: "values",
      outputFormat: "xlsx",
      removeComments: true,
      removeLinks: true,
      removeMerges: false,
      removeHiddenSheets: false,
      splitEnabled: true,
      chunkSize: 2,
      preserveHeader: true,
    },
  });
  const splitResult = result.find((message) => message.type === "result");
  const zip = await JSZip.loadAsync(splitResult.buffer);
  assert.equal(Object.keys(zip.files).length, 2);
  assert.equal(splitResult.report.outputParts, 2);
  assert.equal(splitResult.report.integrity.cellsMatch, true);

  console.log("Optimize Worker tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
