(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./budget-master.js"), require("./text-correct.js"));
  } else {
    root.BudgetBuilderOps = factory(root.BudgetMaster, root.TextCorrect);
  }
})(typeof self !== "undefined" ? self : this, function (BudgetMaster, TextCorrect) {
  "use strict";
  if (!BudgetMaster) throw new Error("BudgetMaster is required.");

  const PRODUCT_KEYS = ["AC60-70", "AC40-50", "PMA", "EAP_CSS1", "MC-70", "CRS-2", "CSS-1h", "CSS-1h (EMA)"];
  const PROVINCE_ALIASES = {
    "กาแพงเพชร": "กำแพงเพชร", "อานาจเจริญ": "อำนาจเจริญ", "ลาพูน": "ลำพูน", "ลาปาง": "ลำปาง",
    "หนองบัวลาภู": "หนองบัวลำภู", "นครศรีธรรมราช์": "นครศรีธรรมราช", "สุราษธานี": "สุราษฎร์ธานี", "อยุธยา": "พระนครศรีอยุธยา",
  };
  const NOISE_LINE = /^(?:—.*หน้า\s*\d+.*—|หน้า\s*\d+|ลำดับ(?:ที่)?|รายละเอียดงบประมาณ|งบประมาณรายจ่าย|หน่วย\s*:\s*บาท|หมายเหตุ|remark\b|รวมทั้งสิ้น)$/i;
  const SUMMARY_LINE = /^(?:รวม|รวมงบประมาณ|งบก่อสร้าง|งบซ่อมบำรุง|งบค่าใช้จ่ายอื่น|ก่อสร้าง|ปรับปรุง|อื่น\s*ๆ)\s*$/i;
  const BUDGET_HEADING = /^(?:\d+(?:\.\d+){0,5}\s+)?(?:งบลงทุน|งบบุคลากร|งบดำเนินงาน|ค่าครุภัณฑ์|ค่าที่ดินและสิ่งก่อสร้าง|แผนงานบุคลากร|รายละเอียดงบประมาณ|งบประมาณรายจ่าย|ผลผลิต|โครงการ|กิจกรรม)\b/i;
  // ข้อความสรุป/คำอธิบายระดับแผนงาน ไม่ใช่รายการโครงการรายสายทาง
  const NARRATIVE_OR_AGGREGATE = /(?:^\s*[-–—]?\s*เพื่อ|วัตถุประสงค์|เป้าหมาย(?:การให้บริการ)?|ตัวชี้วัด|ผลสัมฤทธิ์|ผลผลิตที่\s*\d+|โครงการที่\s*\d+\s*:|กิจกรรม(?:หลัก)?\s*(?:ที่\s*\d+)?\s*:|ทั่วประเทศ|รวม\s*[\d,]+\s*รายการ|รวม\s*[\d,.]+\s*(?:กม\.|กิโลเมตร|หน่วย)|งบดำเนินงาน|งบลงทุน|งบเงินอุดหนุน|งบรายจ่ายอื่น|เงินนอกงบประมาณ|ทุนหมุนเวียน)/i;
  // รายการเหล่านี้เป็นงบประกอบโครงการ แต่ไม่สร้าง Demand วัสดุถนนโดยตรง
  const NON_MATERIAL_PROJECT = /(?:จัดกรรมสิทธิ์|เวนคืน|ชดเชย(?:สังหาริมทรัพย์|อสังหาริมทรัพย์)|ค่าออกแบบ|ค่าควบคุมงาน|จ้างที่ปรึกษา|ศึกษาความเหมาะสม|สำรวจและออกแบบ)/i;
  const ROAD_REFERENCE = /(?:ทล\.|ทช\.|ถนนสาย|สายทาง|ทางหลวง(?:แผ่นดิน|ชนบท)?(?:หมายเลข)?|\b[ก-ฮ]{1,3}\.\d{2,5}\b|ตอน\s+|กม\.\s*(?:ที่)?)/i;
  const PROJECT_UNIT = /\d+(?:\.\d+)?\s*(?:แห่ง|กม\.|กิโลเมตร|สาย|สะพาน|จุด|ตอน|โครงการ)\b/i;

  function cleanText(value, options = {}) {
    const raw = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    if (!raw) return "";
    return TextCorrect && typeof TextCorrect.correctThai === "function"
      ? TextCorrect.correctThai(raw, { roadPack: options.roadPack !== false })
      : raw.normalize("NFC");
  }

  function parseAmount(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value == null) return null;
    const text = String(value).replace(/\u00A0/g, " ").trim();
    if (!text) return null;
    const currency = text.match(/(?:^|\s|\|)(-?\d[\d,]*(?:\.\d+)?)\s*(?:บาท|บ\.)?\s*$/i);
    if (!currency) return null;
    const amount = Number(currency[1].replace(/,/g, ""));
    return Number.isFinite(amount) ? amount : null;
  }

  function stripTrailingAmount(text) {
    return String(text || "").replace(/(?:\s|\|)*-?\d[\d,]*(?:\.\d+)?\s*(?:บาท|บ\.)?\s*$/i, "").trim();
  }

  function isPageMarker(text) {
    return /^—.*หน้า\s*\d+.*—$/.test(text) || /^หน้า\s*\d+$/i.test(text);
  }

  function findAmount(row, minimumAmount) {
    for (let index = row.length - 1; index >= 0; index -= 1) {
      const amount = parseAmount(row[index]);
      if (amount != null && Math.abs(amount) >= minimumAmount) return { amount, index };
    }
    return null;
  }

  function detectProvince(text) {
    const normalized = cleanText(text, { roadPack: true });
    for (const [alias, canonical] of Object.entries(PROVINCE_ALIASES).sort((a, b) => b[0].length - a[0].length)) {
      if (normalized.includes(alias)) return canonical;
    }
    const found = BudgetMaster.regions.slice().sort((a, b) => b.province.length - a.province.length)
      .find((item) => normalized.includes(item.province));
    return found ? found.province : "";
  }

  function getRegion(province) {
    return BudgetMaster.regions.find((item) => item.province === province) || null;
  }

  function classifyCategory(text) {
    const value = cleanText(text, { roadPack: true }).toLowerCase();
    if (/บำรุง|ซ่อม|บูรณะ|ปรับปรุง|เสริมผิว|ฉาบผิว|overlay|recycl|ลาดยางเดิม|แก้ไข|ฟื้นฟู/.test(value)) return "Maintenance";
    if (/ก่อสร้าง|พัฒนา|ยกระดับ|เพิ่มประสิทธิภาพ|ทางเลี่ยง|สะพาน|ทางยกระดับ|ตัดใหม่|โครงข่าย/.test(value)) return "Construction";
    return "Other";
  }

  function factorMap(agency) {
    return new Map((BudgetMaster.factors[agency] || []).map((item) => [item.workType.trim(), item]));
  }

  function firstExistingWorkType(agency, candidates, fallback) {
    const map = factorMap(agency);
    for (const value of candidates) if (value && map.has(value)) return value;
    return map.has(fallback) ? fallback : "";
  }

  function suggestWorkType(text, agency, category, defaults = {}) {
    const value = cleanText(text, { roadPack: true }).toLowerCase();
    if (/คอนกรีต|jpcp|jrcp|คสล\.|ผิวทางคอนกรีต/.test(value)) {
      return agency === "DOH" ? firstExistingWorkType(agency, ["JPCP Construction -A", "JPCP Construction -B"], defaults.construction) : "";
    }
    if (/para\s*slurry|พารา.*สเลอรี|para.*seal/.test(value)) return firstExistingWorkType(agency, ["Para Slurry Seal"], defaults.maintenance);
    if (/slurry|สเลอรี|ฉาบผิวแบบสเลอรี/.test(value)) return firstExistingWorkType(agency, ["Slurry Seal"], defaults.maintenance);
    if (/cape\s*seal|เคพซีล/.test(value)) return firstExistingWorkType(agency, ["Cape Seal"], defaults.maintenance);
    if (/fibro\s*seal|ไฟโบร/.test(value)) return firstExistingWorkType(agency, ["Fibro Seal"], defaults.maintenance);
    if (/recycl|รีไซเคิล|หมุนเวียนวัสดุ/.test(value)) return firstExistingWorkType(agency, ["Recycling HMA-A", "Recycling HMA (2 Layers)-A"], defaults.maintenance);
    if (/overlay|เสริมผิว|ฉาบผิว|ซ่อมผิว|ปรับปรุงผิว/.test(value)) return firstExistingWorkType(agency, ["HMA Overlay-A"], defaults.maintenance);
    if (category === "Construction") return firstExistingWorkType(agency, [defaults.construction], defaults.construction);
    if (category === "Maintenance") return firstExistingWorkType(agency, [defaults.maintenance], defaults.maintenance);
    return "";
  }

  function rowTextParts(row, amountIndex, options) {
    const parts = [];
    for (let index = 0; index < row.length; index += 1) {
      if (index === amountIndex) continue;
      const text = cleanText(row[index], options);
      if (text) parts.push(stripTrailingAmount(text));
    }
    return parts.filter(Boolean);
  }

  function isUsefulContinuation(text) {
    if (!text || isPageMarker(text) || NOISE_LINE.test(text) || SUMMARY_LINE.test(text) || BUDGET_HEADING.test(text)) return false;
    if (/^(?:T|N|NE|C|E|S|M)$/i.test(text)) return false;
    return text.length >= 4;
  }

  function isProjectLike(text, province, metadata = {}) {
    const value = cleanText(text, { roadPack: true });
    if (!value || BUDGET_HEADING.test(value) || NARRATIVE_OR_AGGREGATE.test(value)) return false;

    const hasRoadReference = ROAD_REFERENCE.test(value);
    const hasProjectUnit = PROJECT_UNIT.test(value);
    const hasSpecificLocation = /(?:จ\.|จังหวัด|อ\.|อำเภอ|ต\.|ตำบล)/i.test(value);
    const hasItemNumber = Boolean(metadata.hasItemNumber);

    // รายการรายโครงการควรมีหลักฐานมากกว่าการพบชื่อจังหวัดเพียงอย่างเดียว
    if (hasRoadReference && (province || hasSpecificLocation || hasProjectUnit || hasItemNumber)) return true;
    if (province && hasItemNumber && hasProjectUnit) return true;
    if (province && hasProjectUnit && /(?:ก่อสร้าง|บำรุง|ซ่อม|บูรณะ|ปรับปรุง|เพิ่มประสิทธิภาพ|ยกระดับ|สะพาน)/i.test(value)) return true;
    return false;
  }

  function extractProjectsFromMatrix(matrix, options = {}) {
    const agency = String(options.agency || "DOH").toUpperCase() === "DOR" ? "DOR" : "DOH";
    const minimumAmount = Number(options.minimumAmount || 100000);
    const percentages = {
      Construction: Number(options.constructionPercent ?? 0.6),
      Maintenance: Number(options.maintenancePercent ?? 0.8),
      Other: Number(options.otherPercent ?? 0),
    };
    const defaults = {
      construction: options.defaultConstruction || (agency === "DOH" ? "Constructions HMA (2 layers)-A" : "Constructions HMA (1 Layer)-A"),
      maintenance: options.defaultMaintenance || "HMA Overlay-A",
    };

    const records = [];
    let pending = [];
    let currentCategory = "Other";
    const rows = Array.isArray(matrix) ? matrix : [];

    rows.forEach((rawRow, rowIndex) => {
      const row = Array.isArray(rawRow) ? rawRow : [rawRow];
      const joined = row.map((value) => cleanText(value, options)).filter(Boolean).join(" ").trim();
      if (!joined) return;
      if (isPageMarker(joined)) { pending = []; return; }

      const amountInfo = findAmount(row, minimumAmount);
      if (!amountInfo) {
        const headingCategory = classifyCategory(joined);
        if (headingCategory !== "Other") currentCategory = headingCategory;
        if (NOISE_LINE.test(joined) || SUMMARY_LINE.test(joined) || BUDGET_HEADING.test(joined) || NARRATIVE_OR_AGGREGATE.test(joined)) {
          pending = [];
          return;
        }
        if (isUsefulContinuation(joined)) pending.push(joined);
        if (pending.length > 8) pending = pending.slice(-8);
        return;
      }

      const parts = rowTextParts(row, amountInfo.index, options);
      const rawDescription = cleanText([...pending, ...parts].join(" "), options);
      const hasItemNumber = /^\s*\(\d{1,5}\)/.test(rawDescription);
      let description = rawDescription
        .replace(/^\s*\(?\d{1,5}\)?[.)]?\s+/, "")
        .replace(/\s+/g, " ").trim();
      pending = [];
      if (!description) description = stripTrailingAmount(joined);
      if (!description || NOISE_LINE.test(description) || SUMMARY_LINE.test(description) || /^(?:รวม|รวมทั้งสิ้น|รวมงบประมาณ)\b/i.test(description)) return;

      const province = detectProvince(description);
      if (options.projectRowsOnly !== false && !isProjectLike(description, province, { hasItemNumber })) return;
      const directCategory = classifyCategory(description);
      const category = directCategory === "Other" ? currentCategory : directCategory;
      if (options.roadBudgetOnly !== false && (category === "Other" || NON_MATERIAL_PROJECT.test(description))) return;
      const regionInfo = getRegion(province);
      const workType = suggestWorkType(description, agency, category, defaults);
      const factor = factorMap(agency).get(workType) || null;
      const percent = Number.isFinite(percentages[category]) ? percentages[category] : 0;
      const annualBudget = amountInfo.amount * percent;
      const area = factor && factor.cost > 0 ? annualBudget / factor.cost : 0;
      const products = {};
      for (const key of PRODUCT_KEYS) products[key] = area * Number((factor && factor[key]) || 0);

      const issues = [];
      if (!province) issues.push("ไม่พบจังหวัด");
      if (!workType || !factor) issues.push("ตรวจประเภทงาน");
      if (category === "Other") issues.push("ตรวจหมวดงบ");
      if (!amountInfo.amount) issues.push("ไม่พบงบประมาณ");

      records.push({
        agency, sequence: records.length + 1, description, province,
        region: regionInfo ? regionInfo.region : "", salesCode: regionInfo ? regionInfo.salesCode : "",
        category, progress: "", percent, budget: amountInfo.amount, annualBudget,
        workType, cost: factor ? factor.cost : 0, area, products,
        status: issues.length ? issues.join("; ") : "Ready",
        confidence: issues.length === 0 ? "High" : (province && amountInfo.amount ? "Medium" : "Low"),
        sourceRow: rowIndex + 1,
      });
    });
    return records;
  }

  function setNumericFormula(sheet, address, formula, value, format) {
    sheet[address] = { t: "n", f: formula, v: Number(value) || 0 };
    if (format) sheet[address].z = format;
  }
  function setTextFormula(sheet, address, formula, value) { sheet[address] = { t: "s", f: formula, v: value || "" }; }
  function addSheetFormatting(sheet, widths, autofilterRef) {
    sheet["!cols"] = widths.map((wch) => ({ wch }));
    if (autofilterRef) sheet["!autofilter"] = { ref: autofilterRef };
    sheet["!views"] = [{ state: "frozen", ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" }];
  }

  function buildSummary(records, agency) {
    const categories = ["Construction", "Maintenance", "Other"];
    const regions = ["N", "NE", "C", "E", "S", "M", "Unmapped"];
    const byCategory = categories.map((category) => {
      const rows = records.filter((r) => r.category === category);
      return [category, rows.length, rows.reduce((s, r) => s + r.budget, 0), rows.reduce((s, r) => s + r.annualBudget, 0)];
    });
    const byRegion = regions.map((region) => {
      const rows = records.filter((r) => (r.region || "Unmapped") === region);
      return [region, rows.length, rows.reduce((s, r) => s + r.budget, 0), rows.reduce((s, r) => s + r.annualBudget, 0)];
    });
    const productTotals = PRODUCT_KEYS.map((key) => [key === "EAP_CSS1" ? "EAP/CSS-1" : key, records.reduce((s, r) => s + Number(r.products[key] || 0), 0)]);
    return [
      [`${agency} Budget Builder Summary`, ""], ["Projects", records.length],
      ["Total Budget", records.reduce((s, r) => s + r.budget, 0)], ["Annual Budget", records.reduce((s, r) => s + r.annualBudget, 0)],
      ["Ready", records.filter((r) => r.status === "Ready").length], ["Needs Review", records.filter((r) => r.status !== "Ready").length], [],
      ["By Category", "Projects", "Budget", "Annual Budget"], ...byCategory, [],
      ["By Region", "Projects", "Budget", "Annual Budget"], ...byRegion, [],
      ["Product", "Estimated Volume (Tons)"], ...productTotals,
    ];
  }

  function buildWorkbook(XLSX, matrix, options = {}) {
    if (!XLSX || !XLSX.utils) throw new Error("XLSX library is required.");
    const agency = String(options.agency || "DOH").toUpperCase() === "DOR" ? "DOR" : "DOH";
    const records = extractProjectsFromMatrix(matrix, options);
    if (!records.length) throw new Error("ไม่พบรายการโครงการที่มีจำนวนเงิน กรุณาตรวจ Sheet หรือรูปแบบข้อมูลต้นทาง");

    const workbook = XLSX.utils.book_new();
    const factorRows = BudgetMaster.factors[agency] || [];
    const factorEnd = factorRows.length + 1;
    const regionEnd = BudgetMaster.regions.length + 1;
    const projectHeaders = ["Region", "Sales Code", "ลำดับ", "รายละเอียดงบประมาณ", "จังหวัด", "หมวดงบ", "%Progress", "%", "งบประมาณ", "งบประมาณปีใช้", "ประเภทงาน", "Cost/ตร.ม.", "พื้นที่ (ตร.ม.)", "AC60-70", "AC40-50", "PMA", "EAP/CSS-1", "MC-70", "CRS-2", "CSS-1h", "CSS-1h (EMA)", "Validation Status", "Confidence", "Source Row"];
    const projectRows = [projectHeaders];
    for (const r of records) {
      projectRows.push([r.region, r.salesCode, r.sequence, r.description, r.province, r.category, r.progress, r.percent, r.budget, r.annualBudget, r.workType, r.cost, r.area, r.products["AC60-70"], r.products["AC40-50"], r.products.PMA, r.products.EAP_CSS1, r.products["MC-70"], r.products["CRS-2"], r.products["CSS-1h"], r.products["CSS-1h (EMA)"], r.status, r.confidence, r.sourceRow]);
    }
    const projectsSheet = XLSX.utils.aoa_to_sheet(projectRows);
    for (let rowIndex = 2; rowIndex <= records.length + 1; rowIndex += 1) {
      const r = records[rowIndex - 2];
      setTextFormula(projectsSheet, `A${rowIndex}`, `IFERROR(VLOOKUP(E${rowIndex},'Region Mapping'!$A$2:$D$${regionEnd},4,FALSE),\"\")`, r.region);
      setTextFormula(projectsSheet, `B${rowIndex}`, `IFERROR(VLOOKUP(E${rowIndex},'Region Mapping'!$A$2:$D$${regionEnd},3,FALSE),\"\")`, r.salesCode);
      setNumericFormula(projectsSheet, `J${rowIndex}`, `I${rowIndex}*H${rowIndex}`, r.annualBudget, "#,##0.00");
      setNumericFormula(projectsSheet, `L${rowIndex}`, `IFERROR(VLOOKUP(K${rowIndex},'Factor Master'!$A$2:$J$${factorEnd},2,FALSE),0)`, r.cost, "#,##0.00");
      setNumericFormula(projectsSheet, `M${rowIndex}`, `IFERROR(J${rowIndex}/L${rowIndex},0)`, r.area, "#,##0.00");
      for (let offset = 0; offset < PRODUCT_KEYS.length; offset += 1) {
        const address = `${XLSX.utils.encode_col(13 + offset)}${rowIndex}`;
        setNumericFormula(projectsSheet, address, `IFERROR(M${rowIndex}*VLOOKUP(K${rowIndex},'Factor Master'!$A$2:$J$${factorEnd},${3 + offset},FALSE),0)`, r.products[PRODUCT_KEYS[offset]], "#,##0.00");
      }
      if (projectsSheet[`H${rowIndex}`]) projectsSheet[`H${rowIndex}`].z = "0%";
      if (projectsSheet[`I${rowIndex}`]) projectsSheet[`I${rowIndex}`].z = "#,##0.00";
    }
    addSheetFormatting(projectsSheet, [8, 13, 8, 68, 20, 16, 12, 10, 16, 17, 38, 14, 16, 13, 13, 13, 14, 12, 12, 12, 14, 28, 12, 12], `A1:X${records.length + 1}`);
    XLSX.utils.book_append_sheet(workbook, projectsSheet, agency);

    const summarySheet = XLSX.utils.aoa_to_sheet(buildSummary(records, agency));
    addSheetFormatting(summarySheet, [28, 16, 18, 18], null);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const validationRows = [["ลำดับ", "รายละเอียดงบประมาณ", "จังหวัด", "งบประมาณ", "ประเภทงาน", "Validation Status", "Confidence", "Source Row"]];
    records.filter((r) => r.status !== "Ready").forEach((r) => validationRows.push([r.sequence, r.description, r.province, r.budget, r.workType, r.status, r.confidence, r.sourceRow]));
    if (validationRows.length === 1) validationRows.push(["", "ไม่พบรายการที่ต้องตรวจสอบ", "", "", "", "Ready", "High", ""]);
    const validationSheet = XLSX.utils.aoa_to_sheet(validationRows);
    addSheetFormatting(validationSheet, [8, 70, 20, 16, 38, 32, 12, 12], `A1:H${validationRows.length}`);
    XLSX.utils.book_append_sheet(workbook, validationSheet, "Validation");

    const factorData = [["Work Type", "Cost/ตร.ม.", "AC60-70", "AC40-50", "PMA", "EAP/CSS-1", "MC-70", "CRS-2", "CSS-1h", "CSS-1h (EMA)"], ...factorRows.map((f) => [f.workType, f.cost, f["AC60-70"], f["AC40-50"], f.PMA, f.EAP_CSS1, f["MC-70"], f["CRS-2"], f["CSS-1h"], f["CSS-1h (EMA)"]])];
    const factorSheet = XLSX.utils.aoa_to_sheet(factorData);
    addSheetFormatting(factorSheet, [42, 14, 12, 12, 12, 14, 12, 12, 12, 14], `A1:J${factorData.length}`);
    XLSX.utils.book_append_sheet(workbook, factorSheet, "Factor Master");

    const regionRows = [["Province", "Province English", "Sales Code", "Region"], ...BudgetMaster.regions.map((r) => [r.province, r.english, r.salesCode, r.region])];
    const regionSheet = XLSX.utils.aoa_to_sheet(regionRows);
    addSheetFormatting(regionSheet, [22, 24, 14, 10], `A1:D${regionRows.length}`);
    XLSX.utils.book_append_sheet(workbook, regionSheet, "Region Mapping");

    const rawRows = [["Source Row", "Raw Data"], ...(Array.isArray(matrix) ? matrix : []).map((row, index) => [index + 1, (Array.isArray(row) ? row : [row]).map((v) => cleanText(v, options)).filter(Boolean).join(" | ")])];
    const rawSheet = XLSX.utils.aoa_to_sheet(rawRows);
    addSheetFormatting(rawSheet, [12, 100], `A1:B${rawRows.length}`);
    XLSX.utils.book_append_sheet(workbook, rawSheet, "Raw Source");

    return { workbook, records, report: {
      total: records.length, ready: records.filter((r) => r.status === "Ready").length,
      needsReview: records.filter((r) => r.status !== "Ready").length,
      mappedProvince: records.filter((r) => r.province).length,
      totalBudget: records.reduce((s, r) => s + r.budget, 0), annualBudget: records.reduce((s, r) => s + r.annualBudget, 0),
    } };
  }

  return { PRODUCT_KEYS, cleanText, parseAmount, detectProvince, classifyCategory, suggestWorkType, extractProjectsFromMatrix, buildWorkbook };
});
