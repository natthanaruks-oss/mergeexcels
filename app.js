<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="รวม ต่อ และแยกไฟล์ Excel บนเบราว์เซอร์โดยไม่อัปโหลดไฟล์ขึ้นเซิร์ฟเวอร์" />
    <title>MergeExcels — Excel File Toolkit</title>
    <link rel="stylesheet" href="./styles.css" />
    <script defer src="./vendor/xlsx.full.min.js"></script>
    <script defer src="./vendor/jszip.min.js"></script>
    <script defer src="./excel-ops.js"></script>
    <script defer src="./app.js"></script>
  </head>
  <body>
    <header class="site-header">
      <div class="brand-mark" aria-hidden="true">X</div>
      <div>
        <h1>MergeExcels</h1>
        <p>รวม ต่อ และแยก Sheet ของ Excel โดยประมวลผลในเบราว์เซอร์</p>
      </div>
    </header>

    <main class="app-shell">
      <section class="mode-grid" aria-label="เลือกเครื่องมือ">
        <button class="mode-card active" type="button" data-mode="merge" aria-pressed="true">
          <span class="mode-number">01</span>
          <strong>Merge Files</strong>
          <span>รวมทุก Sheet จากหลายไฟล์ไว้ใน Workbook เดียว</span>
          <small>ผลลัพธ์: 1 ไฟล์ หลาย Sheet</small>
        </button>
        <button class="mode-card" type="button" data-mode="combine" aria-pressed="false">
          <span class="mode-number">02</span>
          <strong>Combine Sheets</strong>
          <span>นำข้อมูลจากทุก Sheet มาต่อกันเป็นตารางเดียว</span>
          <small>ผลลัพธ์: 1 ไฟล์ 1 Sheet</small>
        </button>
        <button class="mode-card" type="button" data-mode="split" aria-pressed="false">
          <span class="mode-number">03</span>
          <strong>Split File</strong>
          <span>แยกแต่ละ Sheet ในไฟล์ออกเป็นไฟล์ละ 1 Sheet</span>
          <small>ผลลัพธ์: ZIP ที่มีหลายไฟล์</small>
        </button>
      </section>

      <section class="workspace">
        <div class="workspace-header">
          <div>
            <p class="eyebrow" id="modeEyebrow">MERGE FILES</p>
            <h2 id="modeTitle">รวม Sheet จากหลายไฟล์</h2>
            <p id="modeDescription">ชื่อ Sheet เดิมจะถูกเก็บไว้ และระบบจะเปลี่ยนชื่อให้อัตโนมัติเมื่อชื่อซ้ำกัน</p>
          </div>
          <button id="resetButton" class="text-button" type="button">ล้างรายการ</button>
        </div>

        <label id="dropZone" class="drop-zone" for="fileInput">
          <input id="fileInput" type="file" accept=".xlsx,.xls,.xlsm,.xlsb" multiple />
          <span class="upload-icon" aria-hidden="true">↑</span>
          <strong id="dropTitle">ลากไฟล์ Excel มาวาง หรือคลิกเพื่อเลือกไฟล์</strong>
          <span id="dropHint">เลือกได้หลายไฟล์ · รองรับ .xlsx, .xls, .xlsm และ .xlsb</span>
        </label>

        <div class="file-summary" aria-live="polite">
          <div>
            <strong id="fileCount">0</strong>
            <span>ไฟล์</span>
          </div>
          <div>
            <strong id="sheetCount">0</strong>
            <span>Sheet</span>
          </div>
          <div>
            <strong id="totalSize">0 KB</strong>
            <span>ขนาดรวม</span>
          </div>
        </div>

        <div id="fileList" class="file-list" aria-label="ไฟล์ที่เลือก"></div>

        <section id="combineOptions" class="options-panel hidden" aria-labelledby="combineOptionsTitle">
          <h3 id="combineOptionsTitle">ตัวเลือกการต่อข้อมูล</h3>
          <label class="check-row">
            <input id="useHeader" type="checkbox" checked />
            <span>
              <strong>ใช้แถวแรกเป็น Header</strong>
              <small>ระบบจะจับคู่คอลัมน์ตามชื่อ Header และรวมคอลัมน์ที่ต่างกันให้</small>
            </span>
          </label>
          <label class="check-row">
            <input id="addSourceColumns" type="checkbox" checked />
            <span>
              <strong>เพิ่ม Source File และ Source Sheet</strong>
              <small>ช่วยตรวจสอบได้ว่าแต่ละแถวมาจากไฟล์และ Sheet ใด</small>
            </span>
          </label>
        </section>

        <div class="output-row">
          <label for="outputName">ชื่อไฟล์ผลลัพธ์</label>
          <input id="outputName" type="text" value="merged_files.xlsx" spellcheck="false" />
        </div>

        <div id="statusBox" class="status-box" role="status" aria-live="polite">
          <span id="statusDot" class="status-dot"></span>
          <span id="statusText">พร้อมใช้งาน</span>
        </div>
        <div class="progress-track" aria-hidden="true">
          <div id="progressBar" class="progress-bar"></div>
        </div>

        <button id="processButton" class="primary-button" type="button" disabled>
          เริ่ม Merge Files
        </button>
      </section>

      <section class="notes">
        <h2>การทำงานของแต่ละเมนู</h2>
        <div class="note-grid">
          <article>
            <strong>Merge Files</strong>
            <p>คง Sheet แยกจากกัน เหมาะสำหรับรวบรวมหลาย Workbook ไว้ในไฟล์เดียว</p>
          </article>
          <article>
            <strong>Combine Sheets</strong>
            <p>รวมข้อมูลเป็นตารางเดียว เหมาะกับ Sheet ที่มีโครงสร้าง Header ใกล้เคียงกัน</p>
          </article>
          <article>
            <strong>Split File</strong>
            <p>แยก Workbook ตาม Sheet และบรรจุทุกไฟล์ไว้ใน ZIP เดียว</p>
          </article>
        </div>
        <p class="privacy-note">ไฟล์ถูกประมวลผลบนเครื่องของคุณ ไม่ได้อัปโหลดไปยังเซิร์ฟเวอร์</p>
        <p class="limitation-note">หมายเหตุ: รองรับข้อมูล สูตร Merge Cells และรูปแบบพื้นฐาน แต่ Chart, รูปภาพ, Macro และฟีเจอร์ขั้นสูงบางอย่างอาจไม่ถูกเก็บไว้ในไฟล์ผลลัพธ์</p>
      </section>
    </main>

    <footer>MergeExcels v2.0</footer>
  </body>
</html>
