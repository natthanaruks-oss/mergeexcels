const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const source = process.argv[2] || '/mnt/data/Factor.xlsx';
const output = path.resolve(__dirname, '../public/budget-master.js');
const wb = XLSX.readFile(source, { cellDates: true });

function matrix(name) {
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true, blankrows: true });
}

const regionRows = matrix('Region(Mapping)');
const regions = regionRows
  .filter((row) => row && row[0] && row[1] && row[2] && row[3] && row[0] !== 'Province')
  .map((row) => ({
    province: String(row[0]).trim(),
    english: String(row[1]).trim(),
    salesCode: String(row[2]).trim(),
    region: String(row[3]).trim(),
  }));

function buildFactors(sheetName, agency) {
  const rows = matrix(sheetName);
  const productHeaders = (rows[1] || []).slice(2, 9).map((v) => String(v || '').trim());
  const byName = new Map();

  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i] || [];
    if (!row[0]) continue;
    const name = String(row[0]).trim();
    const values = row.slice(2, 9);
    const numbers = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (numbers.length && Math.max(...numbers.map(Math.abs)) <= 1) {
      const products = {};
      productHeaders.forEach((header, index) => { products[header] = Number(values[index] || 0); });
      byName.set(name, { ...(byName.get(name) || {}), products });
    }
  }

  const appIndex = rows.findIndex((row) => row && ['Application Type', 'Application Types'].includes(String(row[0] || '').trim()));
  for (let i = appIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    if (!row[0] || typeof row[2] !== 'number') continue;
    const name = String(row[0]).trim();
    byName.set(name, { ...(byName.get(name) || {}), cost: Number(row[2]) });
  }

  return [...byName.entries()]
    .filter(([, data]) => Number.isFinite(data.cost))
    .map(([workType, data]) => {
      const products = data.products || {};
      return {
        workType,
        cost: data.cost,
        'AC60-70': Number(products['AC60-70'] || 0),
        'AC40-50': Number(products['AC40-50'] || 0),
        PMA: Number(products.PMA || 0),
        EAP_CSS1: Number(products[agency === 'DOH' ? 'EAP' : 'CSS-1'] || 0),
        'MC-70': 0,
        'CRS-2': Number(products['CRS-2'] || 0),
        'CSS-1h': Number(products['CSS-1h'] || 0),
        'CSS-1h (EMA)': Number(products['CSS-1h (EMA)'] || 0),
      };
    });
}

const data = {
  products: ['AC60-70', 'AC40-50', 'PMA', 'EAP/CSS-1', 'MC-70', 'CRS-2', 'CSS-1h', 'CSS-1h (EMA)'],
  regions,
  factors: {
    DOH: buildFactors('Factor-DOH', 'DOH'),
    DOR: buildFactors('Factor-DOR', 'DOR'),
  },
};

const content = `(function (root, factory) {\n  if (typeof module === "object" && module.exports) {\n    module.exports = factory();\n  } else {\n    root.BudgetMaster = factory();\n  }\n})(typeof self !== "undefined" ? self : this, function () {\n  "use strict";\n  // Master Data สร้างจาก Factor.xlsx ที่ผู้ใช้ให้มา\n  // ใช้เฉพาะ DOH/DOR และทำงานแบบ Client-side 100%\n  return ${JSON.stringify(data)};\n});\n`;
fs.writeFileSync(output, content, 'utf8');
console.log(`Generated ${output}: ${regions.length} provinces, DOH ${data.factors.DOH.length}, DOR ${data.factors.DOR.length}`);
