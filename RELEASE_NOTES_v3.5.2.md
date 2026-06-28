# MergeExcels v3.5.2 — Automatic Work Type Recommendation

## Menu 09

- ระบบสร้าง Recommended Work Type รายโครงการอัตโนมัติ
- ไม่บังคับให้ผู้ใช้เลือกหรือยืนยันทุกโครงการก่อน Export
- High Confidence ถูกใช้เป็นค่าเริ่มต้นและมีสถานะ Ready
- Medium / Low Confidence ถูกส่งไป Validation เพื่อให้ตรวจเฉพาะข้อยกเว้น
- Work Type dropdown เปลี่ยนเป็น Optional Override
- ปุ่มแบบกลุ่มเป็นทางเลือกสำหรับ Override เท่านั้น
- ปุ่มคืนค่าเป็นคำแนะนำระบบใช้ยกเลิก Manual Override ของรายการที่กรอง
- Audit Log แยก System recommendation และ Manual selection

## Validation

- เพิ่ม regression test สำหรับ High-confidence automatic recommendation
- คง Activity / Section headings และ responsive layout จาก v3.5.1
