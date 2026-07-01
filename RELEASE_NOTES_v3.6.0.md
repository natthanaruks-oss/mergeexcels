# MergeExcels v3.6.0 — Oracle AR Statement Cleaner

## New Menu 10

เพิ่ม `Oracle AR Statement Cleaner` สำหรับไฟล์ Statement of Account ที่ Oracle BI Publisher Export เป็น HTML แต่ใช้นามสกุล `.xls`

### Output

- `Customer Index` — รายชื่อลูกค้าพร้อมลิงก์ไปยัง Sheet รายลูกค้า
- `Customer Summary` — หนึ่งแถวต่อ Entity + Customer + Currency + Statement Period
- `All Transactions` — รายการเคลื่อนไหวรวมทุกลูกค้า
- `Exceptions` — รายการที่ข้อมูลสำคัญไม่ครบหรือยอดไม่สัมพันธ์
- Customer Sheets — หนึ่ง Sheet ต่อลูกค้า รวม THB / USD ใน Sheet เดียวและแยกเป็น Section

### Data controls

- รวมลูกค้าด้วย `Legal Entity + Customer Code`
- เก็บ THB และ USD แยกกัน ไม่รวมยอดข้ามสกุลเงิน
- ตัด Bill Payment Form, Barcode และตารางประกอบที่ซ้ำออก
- คำนวณ Effective Debit / Credit จากการเปลี่ยนแปลง Running Balance
- ตรวจ `Opening + Effective Debit - Effective Credit = Ending Balance`
- อ่านไฟล์ครั้งเดียวและเก็บ ArrayBuffer ไว้ใน Browser session เพื่อลดปัญหา Permission ระหว่าง Analyze และ Export
- ประมวลผลใน Web Worker และ Local 100%

## Validation

ทดสอบกับไฟล์ `TIPCO_AR_Statement_of_Account__010726.xls`:

- Source HTML tables: 1,815
- Customers: 148
- Statements: 217
- Transaction rows: 4,394
- THB statements: 148
- USD statements: 69
- Output sheets: 152
- Balance exceptions after Effective Movement logic: 0
