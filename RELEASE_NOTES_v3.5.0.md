# MergeExcels v3.5.0 — Historical Smart Suggestion for Menu 09

## Scope
- เพิ่ม Historical Rule Engine จาก Total Asphalt Demand ปี 2020–2026 จำนวน 18,621 รายการ
- ใช้ Agency + Activity / Section เพื่อแนะนำ Work Type Family
- แสดง Historical Confidence, Support, Suggested Variant และ Rule Basis
- ผู้ใช้ต้องยืนยัน Work Type ก่อน Export ทุกครั้ง
- เพิ่ม Filter ตาม Suggested Family และ Confidence
- เพิ่มปุ่มยืนยันคำแนะนำ High Confidence โดยผู้ใช้เป็นผู้กด
- เพิ่ม Historical Rules, WorkType Master และ Audit Log ในไฟล์ผลลัพธ์
- บันทึก Manual Override เมื่อ Work Type ที่เลือกต่างจาก Suggested Family

## Governance
- ระบบไม่ตัดสิน Variant A/B/C/D/E เป็น Final โดยอัตโนมัติ
- Historical Region และ Current Mapping ยังคงแยกจากกัน
- ผลลัพธ์ยังเป็น Values Only และไม่มี External Formula Link
