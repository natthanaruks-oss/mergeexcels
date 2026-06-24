# Release Notes v3.4.0

## New: Menu 09 — DOH/DOR Budget Builder

- รับ Clean Raw Data จากเมนู 06 หรือไฟล์ Excel รายละเอียดงบประมาณ
- รองรับ DOH และ DOR
- Mapping จังหวัด 77 จังหวัด → Region และ Sales Code
- ใช้ Factor Master จาก Factor.xlsx ภายในระบบ
- คำนวณงบประมาณปีใช้ พื้นที่ และปริมาณผลิตภัณฑ์
- สร้าง 6 Sheets: DOH/DOR, Summary, Validation, Factor Master, Region Mapping, Raw Source
- มี Project Detail Filter และ Road Construction/Maintenance Filter
- Formula ใน Output เชื่อม Factor Master และ Region Mapping เพื่อให้แก้ Work Type/% ต่อใน Excel ได้

## Governance

- รายการที่ไม่พบจังหวัดหรือ Work Type จะแสดงใน Validation Sheet
- ระบบไม่ถือว่า Auto Classification ถูกต้อง 100% ผู้ใช้ต้องตรวจรายการ Needs Review ก่อนใช้งานบริหาร

## Filtering and control improvements

- กรองข้อความ Narrative / Objective / Aggregate budget ที่ไม่ใช่รายการโครงการรายสายทาง
- กรองค่าเวนคืน ค่าชดเชย ค่าสำรวจออกแบบ ค่าควบคุมงาน และค่าที่ปรึกษา เมื่อเปิด Road Budget Only
- Reset ข้อความต่อเนื่องเมื่อขึ้นหน้าใหม่ ป้องกันข้อความคนละหน้าถูกรวมเป็นโครงการเดียว
- เพิ่ม Regression Test สำหรับ Narrative และ Non-material budget
- ทดสอบกับ Clean Raw Data จริง: พบ 1,607 รายการ, Mapping จังหวัด 1,598 รายการ และส่ง 9 รายการเข้า Validation
