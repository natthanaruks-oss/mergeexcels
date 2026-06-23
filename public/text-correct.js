(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TextCorrect = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var RoadConfig = (typeof require === "function")
    ? (function () { try { return require("./thai-roads-config.js"); } catch (e) { return null; } })()
    : (typeof self !== "undefined" ? self : this).RoadConfig;

  // ============================================================
  //  CONFIG: ตาราง regex แก้คำ — เพิ่ม/แก้ได้ที่นี่ที่เดียว
  //  รูปแบบ: [pattern(RegExp), replacement(string), "หมายเหตุ", enabledByDefault?]
  //  ลำดับมีผล (บนลงล่าง) — ระวัง rule ที่อาจ "แก้ถูกเป็นผิด"
  // ============================================================

  // ชั้น A: ลบอักขระแปลกปลอม (ปลอดภัย เปิดเสมอ)
  var ARTIFACTS = [
    [/\uFFFD/g, "", "ตัวอักษรที่ฟอนต์ถอดรหัสไม่ได้ (�)"],
    [/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "", "zero-width / soft hyphen"],
    [/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "", "control chars"],
  ];

  // ชั้น B: จัดเรียงสระ/วรรณยุกต์ไทยที่สลับตำแหน่ง (ค่อนข้างปลอดภัย)
  var THAI_REORDER = [
    [/\u0E4D\u0E32/g, "\u0E33", "นิคหิต+สระอา → สระอำ (ํา → ำ)"],
    [/\u0E32\u0E4D/g, "\u0E33", "สระอา+นิคหิตที่ PDF เรียงย้อน → สระอำ (าํ → ำ)"],
    [/([\u0E48-\u0E4B])([\u0E34-\u0E37\u0E47\u0E4C\u0E4D])/g, "$2$1", "วรรณยุกต์มาก่อนสระบน → สลับให้ถูก"],
    [/([\u0E48-\u0E4B])\1+/g, "$1", "วรรณยุกต์ซ้ำติดกัน → เหลือตัวเดียว"],
  ];

  // ชั้น C: รูปแบบเฉพาะเอกสารราชการไทย (ปรับ/ปิดได้ตามชุดเอกสาร)
  //   ตั้ง enabled = false ถ้า rule ใดเสี่ยงกับเอกสารของคุณ
  var PATTERNS = [
    [/บก\s*\.\s*ทล\s*\.?/g, "บก.ทล.", "ปรับช่องว่างหน่วยงาน บก.ทล.", true],
    [/กก\s*\.\s*(\d)/g, "กก.$1", "ปรับช่องว่าง กก.<เลข>", true],
    [/(^|[\s(])อ\s*\.\s*(?=[\u0E00-\u0E7F])/g, "$1อ.", "อ.อำเภอ ติดชื่อ", true],
    [/(^|[\s(])ต\s*\.\s*(?=[\u0E00-\u0E7F])/g, "$1ต.", "ต.ตำบล ติดชื่อ", true],
    [/(^|[\s(])จ\s*\.\s*(?=[\u0E00-\u0E7F])/g, "$1จ.", "จ.จังหวัด ติดชื่อ", true],
    [/\u0E46(?=\u0E46)/g, "\u0E46 ", "ไม้ยมก (ๆ) เว้นวรรค", true],
    // ตัวอย่างที่ "เสี่ยง" — ปิดไว้ก่อน เปิดเมื่อมั่นใจกับชุดเอกสาร:
    [/(\d)\s*-\s*(\d{3})(?!\d)/g, "$1$2", "ปีถูกตัด เช่น 2-25→2025 (เสี่ยง! ปิดไว้)", false],
  ];

  // เว้นวรรครอยต่อ ไทย <-> อังกฤษ/ตัวเลข
  function addScriptSpaces(s) {
    return String(s)
      .replace(/([\u0E00-\u0E7F])([A-Za-z0-9])/g, "$1 $2")
      .replace(/([A-Za-z0-9])([\u0E00-\u0E7F])/g, "$1 $2");
  }

  function applyList(text, list) {
    var out = text;
    for (var i = 0; i < list.length; i += 1) {
      var rule = list[i];
      if (rule.length >= 4 && rule[3] === false) continue; // ปิดไว้
      out = out.replace(rule[0], rule[1]);
    }
    return out;
  }

  /**
   * แก้ไขข้อความไทย (Layer 1 — rule-based, ทำงาน 100% ในเครื่อง)
   * options: { artifacts, reorder, patterns, scriptSpacing, nfc } (ทุกตัว default true)
   */
  function correctThai(text, options) {
    if (text == null) return "";
    var o = options || {};
    var s = String(text);
    if (o.nfc !== false && s.normalize) s = s.normalize("NFC");
    if (o.artifacts !== false) s = applyList(s, ARTIFACTS);
    if (o.reorder !== false) s = applyList(s, THAI_REORDER);
    var rc = RoadConfig || (typeof self !== "undefined" ? self.RoadConfig : null);
    if (o.roadPack && rc && rc.applyRoad) s = rc.applyRoad(s); // domain pack: spelling + ทล./ม./จ. + abbrev
    if (o.patterns !== false) s = applyList(s, PATTERNS);
    s = s.replace(/[ \t]+/g, " ").trim();
    if (o.scriptSpacing !== false) s = addScriptSpaces(s);
    return s;
  }

  return { correctThai, addScriptSpaces, ARTIFACTS, THAI_REORDER, PATTERNS };
});
