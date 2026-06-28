(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./budget-master.js"), require("./text-correct.js"), require("./budget-history-rules.js"));
  } else {
    root.BudgetBuilderOps = factory(root.BudgetMaster, root.TextCorrect, root.BudgetHistoryRules);
  }
})(typeof self !== "undefined" ? self : this, function (BudgetMaster, TextCorrect, BudgetHistoryRules) {
  "use strict";
  if (!BudgetMaster) throw new Error("BudgetMaster is required.");
  if (!BudgetHistoryRules) throw new Error("BudgetHistoryRules is required.");

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

  function chooseSuggestedWorkType(agency, family, variant, text, defaults = {}) {
    if (!family) return "";
    const workTypes = Array.from(factorMap(agency).keys());
    let candidates = BudgetHistoryRules.workTypesForFamily(workTypes, family);
    if (!candidates.length) return "";
    const value = cleanText(text, { roadPack: true }).toLowerCase();
    const preferredVariant = String(variant || "").toUpperCase();
    const byVariant = preferredVariant ? candidates.filter((name) => BudgetHistoryRules.variantOfWorkType(name) === preferredVariant) : [];
    if (byVariant.length) candidates = byVariant;

    const layerMatch = value.match(/(?:^|\s)([123])\s*(?:ชั้น|layer)/i);
    if (layerMatch) {
      const layerCandidates = candidates.filter((name) => new RegExp(`\\(${layerMatch[1]}\\s*layers?\\)`, "i").test(name));
      if (layerCandidates.length) candidates = layerCandidates;
    } else if (family === "Recycling HMA") {
      const oneLayer = candidates.filter((name) => !/\(2\s*layers?\)/i.test(name));
      if (oneLayer.length) candidates = oneLayer;
    }

    const fallback = family === "Construction HMA" ? defaults.construction
      : (family === "HMA Overlay" || family === "Recycling HMA" ? defaults.maintenance : "");
    if (fallback && candidates.includes(fallback)) return fallback;
    return candidates[0] || "";
  }

  function historicalSuggestion(agency, activity, description, category, defaults = {}) {
    const suggestion = BudgetHistoryRules.suggest(agency, activity, description);
    let suggestedWorkType = chooseSuggestedWorkType(agency, suggestion.family, suggestion.variant, `${activity || ""} ${description || ""}`, defaults);
    if (!suggestedWorkType) {
      const legacy = suggestWorkType(description, agency, category, defaults);
      suggestedWorkType = legacy || "";
    }
    return { ...suggestion, suggestedWorkType };
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
    let currentActivity = "";
    const rows = Array.isArray(matrix) ? matrix : [];

    rows.forEach((rawRow, rowIndex) => {
      const row = Array.isArray(rawRow) ? rawRow : [rawRow];
      const joined = row.map((value) => cleanText(value, options)).filter(Boolean).join(" ").trim();
      if (!joined) return;
      if (isPageMarker(joined)) { pending = []; return; }

      const amountInfo = findAmount(row, minimumAmount);
      if (!amountInfo) {
        const historicalHeading = BudgetHistoryRules.matchActivityRule(agency, joined);
        if (historicalHeading) {
          currentActivity = historicalHeading.activity;
          const headingCategory = classifyCategory(joined);
          if (headingCategory !== "Other") currentCategory = headingCategory;
          pending = [];
          return;
        }
        const headingCategory = classifyCategory(joined);
        if (headingCategory !== "Other") currentCategory = headingCategory;
        if (NOISE_LINE.test(joined) || SUMMARY_LINE.test(joined) || BUDGET_HEADING.test(joined) || NARRATIVE_OR_AGGREGATE.test(joined)) {
          if (/กิจกรรม|งานบำรุง|โครงการยกระดับ|ก่อสร้าง|บูรณะ|ปรับปรุง/i.test(joined) && joined.length <= 180) currentActivity = joined;
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
      const history = historicalSuggestion(agency, currentActivity, description, category, defaults);
      const workType = history.suggestedWorkType || "";
      const factor = factorMap(agency).get(workType) || null;
      const percent = Number.isFinite(percentages[category]) ? percentages[category] : 0;
      const annualBudget = amountInfo.amount * percent;
      const area = factor && factor.cost > 0 ? annualBudget / factor.cost : 0;
      const products = {};
      for (const key of PRODUCT_KEYS) products[key] = area * Number((factor && factor[key]) || 0);

      const issues = [];
      if (!province) issues.push("ไม่พบจังหวัด");
      if (!workType || !factor) issues.push("ไม่พบคำแนะนำประเภทงาน");
      else if (history.band === "Medium") issues.push("ตรวจสอบคำแนะนำ Medium confidence");
      else if (history.band === "Low") issues.push("Manual Review: Low confidence");
      if (category === "Other") issues.push("ตรวจหมวดงบ");
      if (!amountInfo.amount) issues.push("ไม่พบงบประมาณ");

      records.push({
        agency, sequence: records.length + 1, description, province,
        region: regionInfo ? regionInfo.region : "", salesCode: regionInfo ? regionInfo.salesCode : "",
        category, activity: currentActivity, progress: "", percent, budget: amountInfo.amount, annualBudget,
        workType, workTypeConfirmed: false, selectionSource: "System recommendation", cost: factor ? factor.cost : 0, area, products,
        suggestedFamily: history.family, suggestedVariant: history.variant, suggestedWorkType: history.suggestedWorkType,
        historicalConfidence: history.confidence, historicalSupport: history.support, historicalBand: history.band,
        historicalRule: history.rule, historicalBasis: history.basis, historicalAction: history.action,
        status: issues.length ? issues.join("; ") : "Ready",
        confidence: history.band,
        sourceRow: rowIndex + 1,
      });
    });
    return records;
  }

  function calculateRecord(record, options = {}) {
    const agency = String(options.agency || record.agency || "DOH").toUpperCase() === "DOR" ? "DOR" : "DOH";
    const copy = { ...record, agency, products: { ...(record.products || {}) } };
    if (options.workType != null) copy.workType = String(options.workType || "").trim();
    if (options.confirmed != null) copy.workTypeConfirmed = Boolean(options.confirmed);
    if (options.selectionSource != null) copy.selectionSource = String(options.selectionSource || "");
    if (options.percent != null && Number.isFinite(Number(options.percent))) copy.percent = Number(options.percent);
    const factor = factorMap(agency).get(String(copy.workType || "").trim()) || null;
    copy.annualBudget = Number(copy.budget || 0) * Number(copy.percent || 0);
    copy.cost = factor ? Number(factor.cost || 0) : 0;
    copy.area = copy.cost > 0 ? copy.annualBudget / copy.cost : 0;
    copy.products = {};
    for (const key of PRODUCT_KEYS) copy.products[key] = copy.area * Number((factor && factor[key]) || 0);

    const issues = [];
    if (!copy.province) issues.push("ไม่พบจังหวัด");
    if (!copy.workType || !factor) issues.push("ไม่พบคำแนะนำประเภทงาน");
    else if (!copy.workTypeConfirmed && copy.historicalBand === "Medium") issues.push("ตรวจสอบคำแนะนำ Medium confidence");
    else if (!copy.workTypeConfirmed && copy.historicalBand === "Low") issues.push("Manual Review: Low confidence");
    if (!copy.budget) issues.push("ไม่พบงบประมาณ");
    copy.selectedFamily = copy.workType ? BudgetHistoryRules.familyOfWorkType(copy.workType) : "";
    copy.manualOverride = Boolean(copy.workTypeConfirmed && copy.suggestedWorkType && copy.workType !== copy.suggestedWorkType);
    copy.status = issues.length ? issues.join("; ") : "Ready";
    copy.confidence = copy.workTypeConfirmed ? "Confirmed" : (copy.historicalBand || (issues.length ? "Review" : "High"));
    return copy;
  }

  function recalculateRecords(records, options = {}) {
    return (Array.isArray(records) ? records : []).map((record) => calculateRecord(record, options));
  }

  function addSheetFormatting(sheet, widths, autofilterRef, freezeRow) {
    sheet["!cols"] = widths.map((wch) => ({ wch }));
    if (autofilterRef) sheet["!autofilter"] = { ref: autofilterRef };
    if (freezeRow) sheet["!views"] = [{ state: "frozen", ySplit: freezeRow, topLeftCell: `A${freezeRow + 1}`, activePane: "bottomLeft" }];
  }

  const STYLE = {
    title: { font: { bold: true, sz: 14 }, alignment: { horizontal: "left", vertical: "center" } },
    section: { fill: { patternType: "solid", fgColor: { rgb: "FFF200" } }, font: { bold: true, color: { rgb: "000000" } }, alignment: { horizontal: "left", vertical: "center" } },
    activity: { fill: { patternType: "solid", fgColor: { rgb: "FFF2CC" } }, font: { bold: true, color: { rgb: "000000" } }, alignment: { horizontal: "left", vertical: "center", wrapText: true } },
    headerDark: { fill: { patternType: "solid", fgColor: { rgb: "111111" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true } },
    headerYellow: { fill: { patternType: "solid", fgColor: { rgb: "FFF200" } }, font: { bold: true, color: { rgb: "000000" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true } },
    review: { fill: { patternType: "solid", fgColor: { rgb: "FCE8E6" } }, font: { color: { rgb: "B91C1C" } } },
  };

  function applyRowStyle(XLSX, sheet, rowNumber, startCol, endCol, style) {
    for (let col = startCol; col <= endCol; col += 1) {
      const address = `${XLSX.utils.encode_col(col)}${rowNumber}`;
      if (!sheet[address]) sheet[address] = { t: "s", v: "" };
      sheet[address].s = style;
    }
  }

  function buildSummary(records, agency) {
    const categories = ["Construction", "Maintenance"];
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
      ["Ready", records.filter((r) => r.status === "Ready").length], ["Needs Review", records.filter((r) => r.status !== "Ready").length],
      ["Historical High", records.filter((r) => r.historicalBand === "High").length],
      ["Historical Medium", records.filter((r) => r.historicalBand === "Medium").length],
      ["Historical Low / No rule", records.filter((r) => r.historicalBand === "Low").length],
      ["Manual Override", records.filter((r) => r.manualOverride).length], [],
      ["By Category", "Projects", "Budget", "Annual Budget"], ...byCategory, [],
      ["By Region", "Projects", "Budget", "Annual Budget"], ...byRegion, [],
      ["Product", "Estimated Volume (Tons)"], ...productTotals,
    ];
  }

  function agencyHeaders(agency) {
    if (agency === "DOR") {
      return ["Region", "ลำดับที่", "รายละเอียดงบประมาณ", "จังหวัด", "%", "งบประมาณ", "ปีงบประมาณใช้", "ประเภทงาน", "พื้นที่ (ตร.ม.)", "AC60-70", "AC40-50", "PMA", "CSS-1/EAP", "CRS-2", "CSS-1h", "CSS-1h (EMA)", "Validation Status", "Source Row"];
    }
    return ["Region", "ลำดับที่", "รายละเอียดงบประมาณ", "จังหวัด", "%Progress", "%", "งบประมาณ", "ปีงบประมาณใช้", "ประเภทงาน", "พื้นที่ (ตร.ม.)", "AC60-70", "AC40-50", "PMA", "EAP", "MC-70", "CRS-2", "CSS-1h", "CSS-1h (EMA)", "Validation Status", "Source Row"];
  }

  function recordRow(record, agency) {
    if (agency === "DOR") {
      return [record.region, record.sequence, record.description, record.province, record.percent, record.budget, record.annualBudget, record.workType, record.area,
        record.products["AC60-70"], record.products["AC40-50"], record.products.PMA, record.products.EAP_CSS1,
        record.products["CRS-2"], record.products["CSS-1h"], record.products["CSS-1h (EMA)"], record.status, record.sourceRow];
    }
    return [record.region, record.sequence, record.description, record.province, record.progress, record.percent, record.budget, record.annualBudget, record.workType, record.area,
      record.products["AC60-70"], record.products["AC40-50"], record.products.PMA, record.products.EAP_CSS1, record.products["MC-70"],
      record.products["CRS-2"], record.products["CSS-1h"], record.products["CSS-1h (EMA)"], record.status, record.sourceRow];
  }

  function buildOriginLayoutSheet(XLSX, records, agency) {
    const headers = agencyHeaders(agency);
    const rows = [];
    const markers = [];
    const dataRanges = [];
    const totalBudget = records.reduce((sum, r) => sum + Number(r.budget || 0), 0);
    const annualBudget = records.reduce((sum, r) => sum + Number(r.annualBudget || 0), 0);
    rows.push([]);
    rows.push(["", "รายละเอียดงบประมาณ", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    rows.push(["", "Remark : Work Type selected in Menu 09 · Values Only (No linked formulas)"]);
    rows.push(["", "สรุป", "โครงการ", "งบประมาณ", "ปีงบประมาณใช้"]);
    rows.push(["", "Construction", records.filter((r) => r.category === "Construction").length,
      records.filter((r) => r.category === "Construction").reduce((s, r) => s + r.budget, 0),
      records.filter((r) => r.category === "Construction").reduce((s, r) => s + r.annualBudget, 0)]);
    rows.push(["", "Maintenance", records.filter((r) => r.category === "Maintenance").length,
      records.filter((r) => r.category === "Maintenance").reduce((s, r) => s + r.budget, 0),
      records.filter((r) => r.category === "Maintenance").reduce((s, r) => s + r.annualBudget, 0)]);
    rows.push(["", "รวม", records.length, totalBudget, annualBudget]);
    rows.push([]);

    for (const category of ["Construction", "Maintenance"]) {
      const categoryRows = records.filter((r) => r.category === category);
      const sectionRow = rows.length + 1;
      rows.push(["", category]);
      markers.push({ type: "section", row: sectionRow });
      const headerRow = rows.length + 1;
      rows.push(headers);
      markers.push({ type: "header", row: headerRow });
      const startDataRow = rows.length + 1;
      let previousActivity = null;
      categoryRows.forEach((record) => {
        const activity = cleanText(record.activity || "", { roadPack: true });
        if (activity && activity !== previousActivity) {
          const activityRow = rows.length + 1;
          const activityValues = new Array(headers.length).fill("");
          activityValues[2] = activity;
          rows.push(activityValues);
          markers.push({ type: "activity", row: activityRow });
          previousActivity = activity;
        }
        rows.push(recordRow(record, agency));
      });
      const endDataRow = rows.length;
      if (endDataRow >= startDataRow) dataRanges.push({ start: startDataRow, end: endDataRow });
      rows.push([]);
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const lastCol = headers.length - 1;
    const ref = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: lastCol } });
    sheet["!ref"] = ref;
    sheet["!merges"] = [{ s: { r: 1, c: 1 }, e: { r: 1, c: Math.min(4, lastCol) } }];
    const widths = agency === "DOR"
      ? [8, 9, 72, 20, 10, 17, 17, 38, 16, 13, 13, 13, 14, 12, 12, 14, 28, 12]
      : [8, 9, 72, 20, 12, 10, 17, 17, 38, 16, 13, 13, 13, 14, 12, 12, 12, 14, 28, 12];
    addSheetFormatting(sheet, widths, null, 9);
    applyRowStyle(XLSX, sheet, 2, 1, Math.min(4, lastCol), STYLE.title);
    applyRowStyle(XLSX, sheet, 4, 1, 4, STYLE.headerDark);
    markers.forEach((marker) => {
      const markerStyle = marker.type === "section" ? STYLE.section : marker.type === "activity" ? STYLE.activity : STYLE.headerDark;
      applyRowStyle(XLSX, sheet, marker.row, 0, lastCol, markerStyle);
    });
    sheet["!rows"] = sheet["!rows"] || [];
    markers.filter((marker) => marker.type === "activity").forEach((marker) => {
      sheet["!rows"][marker.row - 1] = { hpt: 22 };
    });

    // หัวกลุ่มผลิตภัณฑ์ใช้สีเหลืองคล้ายไฟล์ต้นกำเนิด
    markers.filter((m) => m.type === "header").forEach((marker) => {
      const productStart = agency === "DOR" ? 8 : 9;
      const productEnd = agency === "DOR" ? 15 : 17;
      applyRowStyle(XLSX, sheet, marker.row, productStart, productEnd, STYLE.headerYellow);
    });

    // รูปแบบตัวเลขในส่วนสรุป
    for (let r = 5; r <= 7; r += 1) {
      for (const c of [2, 3, 4]) {
        const cell = sheet[`${XLSX.utils.encode_col(c)}${r}`];
        if (cell && typeof cell.v === "number") cell.z = c === 2 ? "#,##0" : "#,##0.00";
      }
    }

    // รูปแบบตัวเลขใน Detail และไฮไลต์แถวที่ต้องตรวจ
    const percentCols = agency === "DOR" ? [4] : [4, 5];
    const statusIndex = agency === "DOR" ? 16 : 18;
    dataRanges.forEach((range) => {
      for (let r = range.start; r <= range.end; r += 1) {
        const row = rows[r - 1] || [];
        for (let c = 0; c < row.length; c += 1) {
          const cell = sheet[`${XLSX.utils.encode_col(c)}${r}`];
          if (!cell || typeof cell.v !== "number") continue;
          cell.z = percentCols.includes(c) ? "0%" : "#,##0.00";
        }
        if (row[statusIndex] && row[statusIndex] !== "Ready") applyRowStyle(XLSX, sheet, r, 0, lastCol, STYLE.review);
      }
    });
    return sheet;
  }

  function buildWorkbookFromRecords(XLSX, inputRecords, options = {}) {
    if (!XLSX || !XLSX.utils) throw new Error("XLSX library is required.");
    const agency = String(options.agency || "DOH").toUpperCase() === "DOR" ? "DOR" : "DOH";
    const records = recalculateRecords(inputRecords, { agency });
    if (!records.length) throw new Error("ไม่พบรายการโครงการ กรุณาวิเคราะห์รายการก่อน");

    const workbook = XLSX.utils.book_new();
    const projectsSheet = buildOriginLayoutSheet(XLSX, records, agency);
    XLSX.utils.book_append_sheet(workbook, projectsSheet, agency);

    const summarySheet = XLSX.utils.aoa_to_sheet(buildSummary(records, agency));
    addSheetFormatting(summarySheet, [30, 18, 18, 18], null, 1);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const validationRows = [["ลำดับ", "Activity / Section", "รายละเอียดงบประมาณ", "จังหวัด", "งบประมาณ", "Suggested Family", "Historical Confidence", "Support", "Selected Work Type", "Validation Status", "Source Row"]];
    records.filter((r) => r.status !== "Ready").forEach((r) => validationRows.push([r.sequence, r.activity, r.description, r.province, r.budget, r.suggestedFamily, r.historicalConfidence, r.historicalSupport, r.workType, r.status, r.sourceRow]));
    if (validationRows.length === 1) validationRows.push(["", "", "ไม่พบรายการที่ต้องตรวจสอบ", "", "", "", "", "", "", "Ready", ""]);
    const validationSheet = XLSX.utils.aoa_to_sheet(validationRows);
    addSheetFormatting(validationSheet, [9, 45, 75, 20, 17, 22, 18, 12, 40, 32, 12], `A1:K${validationRows.length}`, 1);
    XLSX.utils.book_append_sheet(workbook, validationSheet, "Validation");

    const factorRows = BudgetMaster.factors[agency] || [];
    const factorData = [["Work Type", "Cost/ตร.ม.", "AC60-70", "AC40-50", "PMA", "EAP/CSS-1", "MC-70", "CRS-2", "CSS-1h", "CSS-1h (EMA)"],
      ...factorRows.map((f) => [f.workType, f.cost, f["AC60-70"], f["AC40-50"], f.PMA, f.EAP_CSS1, f["MC-70"], f["CRS-2"], f["CSS-1h"], f["CSS-1h (EMA)"]])];
    const factorSheet = XLSX.utils.aoa_to_sheet(factorData);
    addSheetFormatting(factorSheet, [42, 14, 12, 12, 12, 14, 12, 12, 12, 14], `A1:J${factorData.length}`, 1);
    XLSX.utils.book_append_sheet(workbook, factorSheet, "Factor Master");

    const historyRuleRows = [["Agency", "Activity / Section", "Support", "Dominant Family", "Family Confidence", "2nd Family", "2nd Count", "Top Variant", "Variant Confidence", "Recommended Action"],
      ...BudgetHistoryRules.activityRules.filter((r) => r.agency === agency).map((r) => [r.agency, r.activity, r.support, r.family, r.familyConfidence, r.secondFamily, r.secondCount, r.topVariant, r.variantConfidence, r.action])];
    const historyRuleSheet = XLSX.utils.aoa_to_sheet(historyRuleRows);
    addSheetFormatting(historyRuleSheet, [10, 55, 12, 22, 18, 22, 12, 12, 18, 28], `A1:J${historyRuleRows.length}`, 1);
    XLSX.utils.book_append_sheet(workbook, historyRuleSheet, "Historical Rules");

    const canonicalRows = [["Raw Work Type", "Canonical Family", "Variant", "Records", "Years", "Agencies", "Factor Patterns", "Top Factor Share", "Recommendation"],
      ...BudgetHistoryRules.workTypeHistory.map((r) => [r.rawWorkType, r.family, r.variant, r.records, r.years, r.agencies, r.factorPatterns, r.topFactorShare, r.recommendation])];
    const canonicalSheet = XLSX.utils.aoa_to_sheet(canonicalRows);
    addSheetFormatting(canonicalSheet, [42, 22, 10, 12, 24, 14, 16, 18, 38], `A1:I${canonicalRows.length}`, 1);
    XLSX.utils.book_append_sheet(workbook, canonicalSheet, "WorkType Master");

    const auditRows = [["ลำดับ", "Source Row", "Activity / Section", "Historical Rule", "Suggested Family", "Confidence", "Support", "Suggested Variant", "Suggested Work Type", "Selected Work Type", "Selected Family", "Confirmed", "Override", "Selection Source"],
      ...records.map((r) => [r.sequence, r.sourceRow, r.activity, r.historicalRule, r.suggestedFamily, r.historicalConfidence, r.historicalSupport, r.suggestedVariant, r.suggestedWorkType, r.workType, r.selectedFamily, r.workTypeConfirmed ? "Yes" : "No", r.manualOverride ? "Yes" : "No", r.selectionSource])];
    const auditSheet = XLSX.utils.aoa_to_sheet(auditRows);
    addSheetFormatting(auditSheet, [9, 12, 45, 45, 22, 15, 12, 14, 40, 40, 22, 12, 12, 20], `A1:N${auditRows.length}`, 1);
    XLSX.utils.book_append_sheet(workbook, auditSheet, "Audit Log");

    const regionRows = [["Province", "Province English", "Sales Code", "Region"], ...BudgetMaster.regions.map((r) => [r.province, r.english, r.salesCode, r.region])];
    const regionSheet = XLSX.utils.aoa_to_sheet(regionRows);
    addSheetFormatting(regionSheet, [22, 24, 14, 10], `A1:D${regionRows.length}`, 1);
    XLSX.utils.book_append_sheet(workbook, regionSheet, "Region Mapping");

    const matrix = Array.isArray(options.rawMatrix) ? options.rawMatrix : [];
    const rawRows = [["Source Row", "Raw Data"], ...matrix.map((row, index) => [index + 1, (Array.isArray(row) ? row : [row]).map((v) => cleanText(v, options)).filter(Boolean).join(" | ")])];
    const rawSheet = XLSX.utils.aoa_to_sheet(rawRows);
    addSheetFormatting(rawSheet, [12, 110], `A1:B${rawRows.length}`, 1);
    XLSX.utils.book_append_sheet(workbook, rawSheet, "Raw Source");

    return { workbook, records, report: {
      total: records.length, ready: records.filter((r) => r.status === "Ready").length,
      needsReview: records.filter((r) => r.status !== "Ready").length,
      mappedProvince: records.filter((r) => r.province).length,
      totalBudget: records.reduce((s, r) => s + r.budget, 0), annualBudget: records.reduce((s, r) => s + r.annualBudget, 0),
      historicalHigh: records.filter((r) => r.historicalBand === "High").length,
      historicalMedium: records.filter((r) => r.historicalBand === "Medium").length,
      manualOverrides: records.filter((r) => r.manualOverride).length,
    } };
  }

  function buildWorkbook(XLSX, matrix, options = {}) {
    const records = extractProjectsFromMatrix(matrix, options);
    return buildWorkbookFromRecords(XLSX, records, { ...options, rawMatrix: matrix });
  }

  return { PRODUCT_KEYS, cleanText, parseAmount, detectProvince, classifyCategory, suggestWorkType, historicalSuggestion, extractProjectsFromMatrix, calculateRecord, recalculateRecords, buildWorkbookFromRecords, buildWorkbook };
});
