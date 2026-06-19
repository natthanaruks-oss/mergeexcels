# MergeExcels v3 — Excel & PDF Toolkit

เครื่องมือรวม / ต่อ / แยกไฟล์ Excel และ PDF ที่ประมวลผลในเบราว์เซอร์ทั้งหมด
(ไฟล์ไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์) ทำงานบน Cloudflare Workers Static Assets

## โครงสร้างโปรเจกต์
```
public/            ← static assets ที่ deploy จริง
  index.html
  app.js · excel-ops.js · pdf-ops.js · styles.css
  _headers         ← security headers (CSP)
  vendor/          ← ไลบรารี (committed ไว้แล้ว ไม่ต้อง build)
wrangler.jsonc     ← config (name = mergeexcels)
package.json · package-lock.json
.node-version      ← ปักหมุด Node 20 (จำเป็นสำหรับ wrangler 4.x)
```

## Deploy บน Cloudflare (Workers Builds + GitHub)
1. push โค้ดนี้ขึ้น GitHub repo (เห็น `wrangler.jsonc` + โฟลเดอร์ `public` ที่ root)
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Workers** → **Import a repository**
3. เลือก repo แล้วตั้งค่า:

| ช่อง | ค่า |
|---|---|
| Project name | `mergeexcels` (ต้องตรงกับ wrangler.jsonc) |
| Build command | *(เว้นว่าง)* |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

4. **Create and deploy** → ได้ URL `https://mergeexcels.<subdomain>.workers.dev`

> vendor libraries ถูก commit ไว้แล้ว จึงไม่ต้องตั้ง build command
> ทุกครั้งที่ push เข้า branch `main` Cloudflare จะ deploy อัตโนมัติ

## รันในเครื่อง
```bash
npm install
npm run dev      # http://localhost:8787
npm test         # รันชุดทดสอบ logic
```

## อัปเดตไลบรารี vendor (เมื่อต้องการ)
```bash
npm install
npm run vendor   # คัดลอกจาก node_modules → public/vendor
```
