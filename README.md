# MergeExcels v3.3 — Excel & PDF Toolkit

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
│   ├── styles.css
│   ├── _headers             # CSP และ Security Headers
│   └── vendor/              # Libraries ที่โหลดจากโดเมนเดียวกัน
├── scripts/
│   ├── copy-vendor.mjs
│   └── check-release.mjs
├── tests/
├── .node-version            # Node.js 20
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

- Node.js ต้องเป็นเวอร์ชัน 20 ขึ้นไป
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
6. เปิดเว็บและตรวจ Version Badge ต้องเป็น `v3.3.0`

## Security Notes

- PDF.js โหลด Worker จาก `public/vendor` และปิด JavaScript eval ด้วย `isEvalSupported: false`
- OCR โหลด Tesseract.js แบบ Lazy-load จาก jsDelivr เฉพาะเมื่อใช้เมนู 07
- ไฟล์ผู้ใช้ยังประมวลผลใน Browser แต่เมนู OCR ต้องเชื่อมอินเทอร์เน็ตเพื่อโหลด OCR Engine/Language Data
- รายละเอียด dependency risk และแผนอัปเกรดอยู่ใน `SECURITY.md`
