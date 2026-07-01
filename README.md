# MergeExcels v3.6.0 — Excel, PDF, Budget Intelligence & Oracle AR Toolkit

Web Application สำหรับจัดการไฟล์ Excel และ PDF แบบ **Client-side 100%**
ไฟล์ของผู้ใช้ถูกประมวลผลในเบราว์เซอร์และไม่ถูกอัปโหลดขึ้น Application Server
ระบบ Deploy เป็น Cloudflare Workers Static Assets

## ฟีเจอร์ปัจจุบัน

1. Merge Excel — รวมทุก Sheet จากหลายไฟล์
2. Combine Excel — ต่อข้อมูลจากหลาย Sheet เป็นตารางเดียว
3. Split Excel — แยกแต่ละ Sheet เป็นไฟล์และดาวน์โหลดเป็น ZIP
4. Merge PDF — จัดลำดับ/ลบหน้าแบบ Page-level พร้อม Thumbnail
5. Split PDF — แยก PDF รายหน้า
6. PDF to Excel — รวมทุกหน้าลง Sheet เดียว พร้อม Thai text correction
7. OCR PDF to Excel — อ่าน PDF สแกน ไทย/อังกฤษ และรวมลง Sheet เดียว
8. Optimize Excel — ลดขนาด Oracle Export, Values Only, Safe Optimize, Split by Row และ CSV
9. DOH/DOR Budget Builder — แปลง Clean Raw Data เป็นไฟล์วิเคราะห์งบประมาณพร้อม Region, Factor และ Product Volume
10. Oracle AR Statement Cleaner — แปลง Oracle BI Publisher HTML .xls เป็นข้อมูลรายลูกค้า พร้อม Customer Index, Summary, All Transactions และ 1 Sheet ต่อลูกค้า

เมนู 06–07 มี **Road Document Mode** สำหรับแก้คำสะกด ย่อคำ และแยก `จ.` / `อ.` / `ต.` โดยตรวจสอบกับ Thai Gazetteer


## เมนู 08 — Optimize Excel

ออกแบบสำหรับไฟล์ Oracle Export ขนาดใหญ่โดยเฉพาะ:

- **Analyze File**: ตรวจจำนวน Sheet, Rows, Data Cells, Formula, Comment, Hyperlink และ Used Range ที่บวม
- **Values Only**: เก็บค่าปัจจุบันและชนิดข้อมูล ตัด Formula/Style/Metadata ส่วนเกิน
- **Safe Optimize**: เก็บ Formula และ Number Format แต่สร้าง Workbook ใหม่เพื่อลดส่วนเกิน
- **Split by Row**: แบ่ง 25,000 / 50,000 / 100,000 แถว พร้อมทำซ้ำ Header และดาวน์โหลดเป็น ZIP
- **CSV UTF-8**: เหมาะกับ Power BI, Database และ Raw Data ที่ไม่ต้องใช้ Formatting
- **Integrity Report**: เปรียบเทียบ Source Data Cells กับ Copied Data Cells ก่อนแจ้งสำเร็จ
- **Web Worker**: การอ่านและเขียน Workbook ทำใน Thread แยก จึงไม่ล็อกหน้าจอหลัก

> สำหรับ Oracle Raw Data ค่าเริ่มต้นที่แนะนำคือ `Values Only + XLSX` และเปิด `Split 50,000 Rows` เมื่อไฟล์ยังเปิดช้า

ข้อจำกัด: Chart, Image, Macro, Drawing และ Excel Feature ขั้นสูงอาจไม่ถูกเก็บในไฟล์ที่ Optimize แล้ว จึงควรใช้กับ Raw Data หรือไฟล์จากระบบที่เน้นข้อมูลเป็นหลัก

ขนาดไฟล์ที่แนะนำ: ไม่เกิน 250 MB สำหรับ Browser ทั่วไป ไฟล์ 80 MB ขึ้นไปจะใช้ Large-file Sparse mode และอาจใช้เวลาหลายนาที ส่วนไฟล์มากกว่า 512 MB จะถูกหยุดก่อนโหลดเข้า RAM เพื่อป้องกัน Browser ค้าง; ควรแบ่ง Export จาก Oracle หรือใช้ CSV/Local Desktop Engine

## เมนู 09 — DOH/DOR Budget Builder

รับไฟล์ Excel ที่ได้จากเมนู 06 หรือ Clean Raw Data รูปแบบใกล้เคียง แล้วสร้าง Workbook สำหรับวิเคราะห์งบประมาณ DOH/DOR โดยใช้ Master จาก `Factor.xlsx` ที่ฝังไว้ในระบบ

- เลือกหน่วยงาน `DOH` หรือ `DOR` ต่อการประมวลผลหนึ่งครั้ง
- ตรวจจับจังหวัดและ Mapping เป็น Region / Sales Code จาก 77 จังหวัด
- แยกหมวด Construction / Maintenance และสร้าง Recommended Work Type รายโครงการอัตโนมัติ
- กำหนด % งบประมาณปีใช้สำหรับ Construction และ Maintenance
- คำนวณพื้นที่และปริมาณ AC60-70, AC40-50, PMA, EAP/CSS-1, MC-70, CRS-2, CSS-1h และ EMA
- กรอง Narrative, Budget Summary, Land Compensation, Expropriation, Design และ Supervision ที่ไม่สร้าง Material Demand โดยตรง
- Historical Smart Suggestion จากข้อมูลปี 2020–2026 จำนวน 18,621 รายการ โดยใช้ Agency + Activity / Section
- แสดง Suggested Family, Historical Confidence, Support และ Top Variant เพื่อประกอบการตัดสินใจ
- High Confidence ใช้ Recommended Work Type เป็นค่าเริ่มต้นและ Export ได้ทันที; Medium / Low Confidence ถูกส่งไป Validation
- Filter ตาม Suggested Family / Confidence และแก้เฉพาะข้อยกเว้นด้วย Optional Override หรือ Bulk Override
- สร้าง 9 Sheets: `DOH/DOR`, `Summary`, `Validation`, `Factor Master`, `Historical Rules`, `WorkType Master`, `Audit Log`, `Region Mapping`, `Raw Source`
- Audit Log เก็บ Suggested Family, Selected Work Type, Selection Source และ Manual Override
- คำนวณ Factor ใน Browser แล้วเขียนผลลัพธ์เป็น Values Only ไม่มีสูตร VLOOKUP หรือ External Link
- จัด Main Sheet แยก Construction / Maintenance และเรียงคอลัมน์ตาม Complete File ต้นกำเนิด

> ระบบเลือก Recommended Work Type จาก Historical Family, Variant และ Factor Master เพื่อใช้เป็นค่าตั้งต้น โดยแยก Medium / Low Confidence ไว้ใน Validation และเก็บ Manual Override ใน Audit Log

## เมนู 10 — Oracle AR Statement Cleaner

สำหรับไฟล์ Statement of Account ที่ Oracle BI Publisher Export เป็น HTML แต่ใช้นามสกุล `.xls`

- Auto-detect โครงสร้าง Statement, Customer Header และ Transaction Table
- ตัด Bill Payment Form, Barcode และตารางประกอบที่ซ้ำออกอัตโนมัติ
- สร้าง `Customer Index`, `Customer Summary`, `All Transactions` และ `Exceptions`
- สร้าง 1 Sheet ต่อลูกค้า โดยรวม THB/USD ไว้ใน Sheet เดียวและแยกเป็น Section
- เก็บ Opening Balance, Debit, Credit, Ending Balance และ Effective Movement จาก Running Balance
- ทำงานใน Web Worker เพื่อไม่ล็อกหน้าเว็บ และอ่านไฟล์เพียงครั้งเดียวเพื่อลดปัญหา Browser permission
- ประมวลผล Local 100% ไม่มีการอัปโหลดข้อมูลขึ้น Server

> คีย์หลักสำหรับการรวมข้อมูลคือ `Legal Entity + Customer Code`; สกุลเงินแยกในระดับ Statement และห้ามรวม THB/USD โดยไม่มี FX Rate ที่กำหนด

## โครงสร้างสำคัญ

```text
mergeexcels/
├── public/                  # Static assets ที่ Cloudflare Deploy จริง
│   ├── index.html
│   ├── app.js
│   ├── excel-ops.js
│   ├── pdf-ops.js
│   ├── pdftable-ops.js
│   ├── text-correct.js
│   ├── thai-roads-config.js
│   ├── optimize-ops.js      # Core logic สำหรับวิเคราะห์/ลดขนาด/แบ่งไฟล์
│   ├── optimize-worker.js   # Web Worker ป้องกันหน้าเว็บค้าง
│   ├── budget-master.js       # Region และ Factor Master ที่ฝังในระบบ
│   ├── budget-history-rules.js# Historical Rule Engine 2020–2026 (aggregated only)
│   ├── budget-builder-ops.js  # Logic เมนู 09, Validation และ Audit Log
│   ├── oracle-ar-ops.js       # Parser/Workbook builder สำหรับ Oracle AR Statement
│   ├── oracle-ar-worker.js    # Web Worker สำหรับเมนู 10
│   ├── styles.css
│   ├── _headers             # CSP และ Security Headers
│   └── vendor/              # Libraries ที่โหลดจากโดเมนเดียวกัน
├── scripts/
│   ├── copy-vendor.mjs
│   └── check-release.mjs
├── tests/
├── .node-version            # Node.js 22
├── .gitignore
├── package.json
├── package-lock.json
└── wrangler.jsonc           # assets.directory = "./public"
```

> ไม่ควรใส่โฟลเดอร์ `.git`, `node_modules` หรือไฟล์ ZIP ไว้ในชุดที่อัปโหลดผ่าน GitHub Web

## ตรวจสอบก่อน Deploy

```bash
npm ci
npm run verify
npx wrangler deploy --dry-run
```

`npm run verify` ตรวจทั้ง Unit Tests และเงื่อนไขสำคัญ เช่น:

- Node.js ต้องเป็นเวอร์ชัน 22 ขึ้นไป
- `package-lock.json` ต้องไม่มี Internal Registry
- `wrangler.jsonc` ต้องชี้ไปที่ `./public`
- CSP ต้องมี `worker-src 'self' blob:`
- PDF.js ต้องใช้ `isEvalSupported: false`

## Deploy ด้วย GitHub + Cloudflare

Cloudflare Build Settings:

| ช่อง | ค่า |
|---|---|
| Project name | `mergeexcels` |
| Build command | เว้นว่าง |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

### อัปเดตผ่านหน้าเว็บ GitHub

1. แตกไฟล์ ZIP
2. เปิดโฟลเดอร์ `mergeexcels`
3. ลาก **ทุกไฟล์และโฟลเดอร์ที่อยู่ข้างใน** ขึ้น Repo เดิม
4. ต้องเห็น `public/`, `package.json`, `package-lock.json`, `wrangler.jsonc` และ `.node-version` ที่หน้า Root
5. Commit แล้วรอ Cloudflare Deploy อัตโนมัติ
6. เปิดเว็บและตรวจ Version Badge ต้องเป็น `v3.6.0`

## Security Notes

- PDF.js โหลด Worker จาก `public/vendor` และปิด JavaScript eval ด้วย `isEvalSupported: false`
- OCR โหลด Tesseract.js แบบ Lazy-load จาก jsDelivr เฉพาะเมื่อใช้เมนู 07
- ไฟล์ผู้ใช้ยังประมวลผลใน Browser แต่เมนู OCR ต้องเชื่อมอินเทอร์เน็ตเพื่อโหลด OCR Engine/Language Data
- รายละเอียด dependency risk และแผนอัปเกรดอยู่ใน `SECURITY.md`


## v3.5.3 — Automatic Work Type Recommendation

- Menu 09 แนะนำ Work Type รายโครงการให้อัตโนมัติจาก Historical Rules ปี 2020–2026
- High Confidence ใช้เป็นค่าเริ่มต้นและ Export ได้โดยไม่ต้องกดยืนยันทีละรายการ
- Medium / Low Confidence ส่งไป Validation เพื่อให้ตรวจเฉพาะข้อยกเว้น
- Dropdown ในตารางใช้สำหรับ Override เท่านั้น ปล่อยว่างหมายถึงใช้คำแนะนำระบบ
- Bulk Override เป็นตัวเลือกเสริม ไม่ใช่ขั้นตอนบังคับ


## v3.6.0 — Oracle AR Statement Cleaner

- เพิ่มเมนู 10 สำหรับ Oracle BI Publisher HTML `.xls`
- สร้างข้อมูลรายลูกค้าแทนการแตกเป็นหลายร้อย/หลายพัน Sheet ตามจำนวน HTML Table
- รองรับ Customer Index, Customer Summary, All Transactions, Exceptions และ 1 Sheet ต่อลูกค้า
- ใช้ Running Balance เพื่อคำนวณ Effective Debit/Credit และตรวจ Reconciliation
