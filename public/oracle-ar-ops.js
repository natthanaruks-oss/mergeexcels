(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OracleArOps = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  const TX_HEADERS = [
    "Date", "Due Date", "Document No.", "Description", "Reference", "Quantity",
    "UOM", "Payment Method", "Statement Debit", "Statement Credit", "Balance",
    "Effective Debit", "Effective Credit", "Row Type",
  ];

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function parseAmount(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const text = normalizeText(value);
    if (!text || text === "-") return null;
    const negative = /^\(.*\)$/.test(text) || /^-/.test(text);
    const cleaned = text.replace(/[(),\s]/g, "").replace(/^-/, "");
    const number = Number(cleaned);
    return Number.isFinite(number) ? (negative ? -number : number) : null;
  }

  function roundMoney(value) {
    const number = Number(value) || 0;
    return Math.round((number + Number.EPSILON) * 100) / 100;
  }

  function padRow(row, length) {
    const out = Array.from({ length }, (_, index) => row && row[index] != null ? row[index] : "");
    return out;
  }

  function matrixText(matrix) {
    return (matrix || []).flat().map(normalizeText).filter(Boolean).join(" ");
  }

  function isStatementHeader(matrix) {
    return /Statement\s+of\s+Account/i.test(matrixText(matrix));
  }

  function isCustomerHeader(matrix) {
    return /รหัสลูกค้า\s*[:：]/.test(matrixText((matrix || []).slice(0, 2)));
  }

  function isTransactionTable(matrix) {
    const first = (matrix && matrix[0] ? matrix[0] : []).map(normalizeText);
    return first.includes("Date") && first.includes("Document No.") && first.includes("Balance");
  }

  function parseEntityHeader(matrix) {
    const rows = matrix || [];
    const first = (rows[0] || []).map(normalizeText);
    const second = (rows[1] || []).map(normalizeText);
    const company = first.find((text) => text && !/Statement\s+of\s+Account|Page\s*:/i.test(text)) || "Unknown Entity";
    const taxMatch = matrixText([second]).match(/(?:เลขประจำตัวผู้เสียภาษี|Tax\.?\s*ID)\s*[:：]\s*([0-9-]+)/i);
    const pageMatch = matrixText([first]).match(/Page\s*:\s*(\d+)\s*\/\s*(\d+)/i);
    return {
      company,
      taxId: taxMatch ? taxMatch[1] : "",
      page: pageMatch ? Number(pageMatch[1]) : 1,
      totalPages: pageMatch ? Number(pageMatch[2]) : 1,
    };
  }

  function parseCustomerHeader(matrix, entity) {
    const rows = matrix || [];
    const text = matrixText(rows);
    const codeMatch = text.match(/รหัสลูกค้า\s*[:：]\s*([A-Za-z0-9._-]+)/);
    const periodMatch = text.match(/วันที่\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})\s*ถึง\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i);
    const termMatch = text.match(/Payment\s*Term\s*[:：]\s*(.*?)(?=Currency\s*[:：]|Fax\s*[:：]|$)/i);
    const currencyMatch = text.match(/Currency\s*[:：]\s*([A-Za-z]{3})/i);
    const name = normalizeText(rows[1] && rows[1][0]);
    const address = normalizeText(rows[2] && rows[2][0]);
    const faxCell = normalizeText(rows[3] && rows[3][0]);
    const fax = faxCell.replace(/^Fax\s*[:：]?\s*/i, "");
    return {
      ...entity,
      customerCode: codeMatch ? codeMatch[1] : "",
      customerName: name,
      address,
      fax,
      paymentTerm: normalizeText(rows[1] && rows[1][1]).replace(/^Payment\s*Term\s*[:：]\s*/i, "") || (termMatch ? normalizeText(termMatch[1]) : ""),
      currency: currencyMatch ? currencyMatch[1].toUpperCase() : "",
      periodFrom: periodMatch ? periodMatch[1].toUpperCase() : "",
      periodTo: periodMatch ? periodMatch[2].toUpperCase() : "",
    };
  }

  function classifyRow(description) {
    const text = normalizeText(description);
    if (/ยอดคงเหลือยกมา/.test(text)) return "Opening Balance";
    if (/ยอดคงเหลือไปเดือนหน้า/.test(text)) return "Closing Balance";
    return "Transaction";
  }

  function parseTransactionTable(matrix, metadata, statementSequence) {
    const statementId = [
      metadata.company || "Entity",
      metadata.customerCode || "Unknown",
      metadata.currency || "N/A",
      metadata.periodFrom || "",
      metadata.periodTo || "",
      String(statementSequence),
    ].join("|");
    const rows = [];
    let openingBalance = null;
    let closingBalance = null;
    let debitTotal = 0;
    let creditTotal = 0;
    let previousBalance = null;
    let transactionCount = 0;
    const issues = [];

    for (let rowIndex = 2; rowIndex < (matrix || []).length; rowIndex += 1) {
      const raw = padRow(matrix[rowIndex], 11);
      const values = raw.map((value, index) => [5, 8, 9, 10].includes(index) ? value : normalizeText(value));
      if (!values.some((value) => value !== "" && value != null)) continue;
      const rowType = classifyRow(values[3]);
      const quantity = parseAmount(values[5]);
      const debit = parseAmount(values[8]);
      const credit = parseAmount(values[9]);
      const balance = parseAmount(values[10]);
      let effectiveDebit = 0;
      let effectiveCredit = 0;
      if (rowType === "Opening Balance") {
        openingBalance = balance;
        previousBalance = balance;
      } else if (rowType === "Closing Balance") {
        closingBalance = balance;
      } else {
        transactionCount += 1;
        // Oracle BI Publisher อาจแสดง Debit/Credit ติดลบเป็นบรรทัดอ้างอิง
        // ซึ่งบางกรณีไม่กระทบยอดคงเหลือ จึงใช้การเปลี่ยนแปลงของ Running Balance
        // เป็น Movement ที่เชื่อถือได้สำหรับ Reconciliation และเก็บยอดดิบไว้แยกต่างหาก
        if (balance != null && previousBalance != null) {
          const movement = balance - previousBalance;
          if (movement > 0) effectiveDebit = movement;
          else if (movement < 0) effectiveCredit = -movement;
        } else {
          if ((debit || 0) > 0) effectiveDebit = debit;
          if ((credit || 0) > 0) effectiveCredit = credit;
        }
        debitTotal += effectiveDebit;
        creditTotal += effectiveCredit;
        if (balance != null) previousBalance = balance;
      }
      if (rowType === "Transaction" && !values[0] && !values[2] && !values[3]) {
        issues.push({ type: "Blank transaction identity", row: rowIndex + 1, message: "Transaction row has no date, document number, or description" });
      }
      rows.push({
        statementId,
        rowNumber: rowIndex + 1,
        date: values[0],
        dueDate: values[1],
        documentNo: values[2],
        description: values[3],
        reference: values[4],
        quantity,
        uom: values[6],
        paymentMethod: values[7],
        debit,
        credit,
        balance,
        effectiveDebit,
        effectiveCredit,
        rowType,
      });
    }

    if (openingBalance == null) openingBalance = 0;
    if (closingBalance == null) {
      const lastBalance = [...rows].reverse().find((row) => row.balance != null);
      closingBalance = lastBalance ? lastBalance.balance : 0;
      issues.push({ type: "Missing closing row", row: null, message: "Closing balance row was not found; last available balance was used" });
    }
    openingBalance = roundMoney(openingBalance);
    debitTotal = roundMoney(debitTotal);
    creditTotal = roundMoney(creditTotal);
    closingBalance = roundMoney(closingBalance);
    const variance = roundMoney(openingBalance + debitTotal - creditTotal - closingBalance);
    if (Math.abs(variance) > 0.02) {
      issues.push({ type: "Balance variance", row: null, message: `Opening + Debit - Credit - Closing = ${variance.toFixed(2)}` });
    }

    return {
      ...metadata,
      statementId,
      statementSequence,
      rows,
      openingBalance,
      debitTotal,
      creditTotal,
      closingBalance,
      transactionCount,
      variance,
      issues,
    };
  }

  function parseWorkbook(XLSX, workbook, sourceFileName = "") {
    const statements = [];
    const exceptions = [];
    let entity = { company: "Unknown Entity", taxId: "", page: 1, totalPages: 1 };
    let customer = null;
    let statementSequence = 0;

    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      });
      if (isStatementHeader(matrix)) {
        entity = parseEntityHeader(matrix);
        return;
      }
      if (isCustomerHeader(matrix)) {
        customer = parseCustomerHeader(matrix, entity);
        if (!customer.customerCode) {
          exceptions.push({ sourceSheet: sheetName, type: "Missing customer code", customerCode: "", customerName: customer.customerName, currency: customer.currency, message: "Customer header did not contain a customer code" });
        }
        return;
      }
      if (isTransactionTable(matrix)) {
        statementSequence += 1;
        if (!customer) {
          exceptions.push({ sourceSheet: sheetName, type: "Orphan transaction table", customerCode: "", customerName: "", currency: "", message: "Transaction table was found before a customer header" });
          return;
        }
        const statement = parseTransactionTable(matrix, customer, statementSequence);
        statement.sourceSheet = sheetName;
        statement.sourceFile = sourceFileName;
        statements.push(statement);
        statement.issues.forEach((issue) => exceptions.push({
          sourceSheet: sheetName,
          type: issue.type,
          customerCode: statement.customerCode,
          customerName: statement.customerName,
          currency: statement.currency,
          message: issue.message,
        }));
        customer = null;
      }
    });

    const customerMap = new Map();
    statements.forEach((statement) => {
      const key = `${statement.company}||${statement.customerCode || statement.customerName}`;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          key,
          company: statement.company,
          taxId: statement.taxId,
          customerCode: statement.customerCode,
          customerName: statement.customerName,
          address: statement.address,
          fax: statement.fax,
          paymentTerm: statement.paymentTerm,
          statements: [],
        });
      }
      const customerRecord = customerMap.get(key);
      customerRecord.statements.push(statement);
      if (!customerRecord.address && statement.address) customerRecord.address = statement.address;
      if (!customerRecord.paymentTerm && statement.paymentTerm) customerRecord.paymentTerm = statement.paymentTerm;
    });
    const customers = [...customerMap.values()].sort((a, b) => String(a.customerCode).localeCompare(String(b.customerCode)));
    const currencies = {};
    statements.forEach((statement) => { currencies[statement.currency || "Unknown"] = (currencies[statement.currency || "Unknown"] || 0) + 1; });
    const transactionRows = statements.reduce((sum, statement) => sum + statement.transactionCount, 0);
    const allRows = statements.reduce((sum, statement) => sum + statement.rows.length, 0);
    const companies = [...new Set(statements.map((statement) => statement.company).filter(Boolean))];

    return {
      sourceFileName,
      sourceTables: workbook.SheetNames.length,
      statements,
      customers,
      exceptions,
      analysis: {
        companies,
        customers: customers.length,
        statements: statements.length,
        transactionRows,
        allRows,
        currencies,
        exceptions: exceptions.length,
      },
    };
  }

  function sanitizeSheetName(value, fallback = "Customer") {
    const clean = normalizeText(value).replace(/[:\\/?*\[\]]/g, " ").replace(/\s+/g, " ").trim();
    return (clean || fallback).slice(0, 31);
  }

  function uniqueSheetName(base, used) {
    let name = sanitizeSheetName(base);
    let counter = 2;
    while (used.has(name.toLowerCase())) {
      const suffix = `_${counter}`;
      name = `${sanitizeSheetName(base).slice(0, 31 - suffix.length)}${suffix}`;
      counter += 1;
    }
    used.add(name.toLowerCase());
    return name;
  }

  function shortCustomerName(name) {
    return normalizeText(name)
      .replace(/^(บริษัท|บจก\.|บมจ\.|หจก\.|ห้างหุ้นส่วนจำกัด)\s*/i, "")
      .replace(/\s+/g, " ")
      .slice(0, 18);
  }

  function createCustomerSheetName(customer, used) {
    const code = customer.customerCode || "NO_CODE";
    return uniqueSheetName(`${code}_${shortCustomerName(customer.customerName)}`, used);
  }

  function applyHeaderStyle(sheet, range, XLSX) {
    const decoded = XLSX.utils.decode_range(range);
    for (let r = decoded.s.r; r <= decoded.e.r; r += 1) {
      for (let c = decoded.s.c; c <= decoded.e.c; c += 1) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!sheet[ref]) sheet[ref] = { t: "s", v: "" };
        sheet[ref].s = {
          fill: { fgColor: { rgb: "1F4E78" } },
          font: { bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "D9E2F3" } },
            bottom: { style: "thin", color: { rgb: "D9E2F3" } },
            left: { style: "thin", color: { rgb: "D9E2F3" } },
            right: { style: "thin", color: { rgb: "D9E2F3" } },
          },
        };
      }
    }
  }

  function setNumberFormats(sheet, columns, startRow, endRow, XLSX) {
    columns.forEach((column) => {
      for (let row = startRow; row <= endRow; row += 1) {
        const ref = XLSX.utils.encode_cell({ r: row - 1, c: column });
        if (sheet[ref] && typeof sheet[ref].v === "number") sheet[ref].z = "#,##0.00;[Red]-#,##0.00";
      }
    });
  }

  function statementSummaryRows(statements) {
    return statements.map((statement) => [
      statement.company,
      statement.customerCode,
      statement.customerName,
      statement.currency,
      statement.paymentTerm,
      statement.periodFrom,
      statement.periodTo,
      statement.openingBalance,
      statement.debitTotal,
      statement.creditTotal,
      statement.closingBalance,
      statement.transactionCount,
      statement.variance,
      statement.statementId,
    ]);
  }

  function allTransactionRows(statements, includeOpeningClosing) {
    const rows = [];
    statements.forEach((statement) => {
      statement.rows.forEach((row) => {
        if (!includeOpeningClosing && row.rowType !== "Transaction") return;
        rows.push([
          statement.company,
          statement.customerCode,
          statement.customerName,
          statement.address,
          statement.paymentTerm,
          statement.currency,
          statement.periodFrom,
          statement.periodTo,
          row.date,
          row.dueDate,
          row.documentNo,
          row.description,
          row.reference,
          row.quantity,
          row.uom,
          row.paymentMethod,
          row.debit,
          row.credit,
          row.balance,
          row.effectiveDebit,
          row.effectiveCredit,
          row.rowType,
          statement.statementId,
          statement.sourceFile,
        ]);
      });
    });
    return rows;
  }

  function buildCustomerSheet(XLSX, customer, sheetName, includeOpeningClosing) {
    const rows = [
      [`Customer Statement Detail — ${customer.customerName || customer.customerCode}`],
      ["Entity", customer.company, "Customer Code", customer.customerCode],
      ["Customer Name", customer.customerName, "Payment Term", customer.paymentTerm],
      ["Address", customer.address, "Tax ID", customer.taxId],
      ["Back to Index", "Customer Index"],
      [],
    ];
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }];
    const statementRanges = [];
    const statements = [...customer.statements].sort((a, b) => (a.currency || "").localeCompare(b.currency || "") || (a.periodFrom || "").localeCompare(b.periodFrom || ""));
    statements.forEach((statement) => {
      const headingRow = rows.length;
      rows.push([`${statement.currency || "N/A"} · ${statement.periodFrom || "-"} ถึง ${statement.periodTo || "-"}`]);
      merges.push({ s: { r: headingRow, c: 0 }, e: { r: headingRow, c: 13 } });
      rows.push(["Opening Balance", statement.openingBalance, "Debit", statement.debitTotal, "Credit", statement.creditTotal, "Ending Balance", statement.closingBalance, "Transactions", statement.transactionCount, "Variance", statement.variance]);
      const headerRow = rows.length;
      rows.push(TX_HEADERS);
      const dataStart = rows.length;
      statement.rows.forEach((row) => {
        if (!includeOpeningClosing && row.rowType !== "Transaction") return;
        rows.push([row.date, row.dueDate, row.documentNo, row.description, row.reference, row.quantity, row.uom, row.paymentMethod, row.debit, row.credit, row.balance, row.effectiveDebit, row.effectiveCredit, row.rowType]);
      });
      statementRanges.push({ headingRow, headerRow, dataStart, dataEnd: rows.length - 1 });
      rows.push([]);
    });
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!merges"] = merges;
    sheet["!cols"] = [
      { wch: 13 }, { wch: 13 }, { wch: 18 }, { wch: 42 }, { wch: 18 }, { wch: 13 },
      { wch: 13 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    ];
    sheet.A1.s = { fill: { fgColor: { rgb: "17365D" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 }, alignment: { vertical: "center" } };
    if (sheet.A5) {
      sheet.A5.l = { Target: "#'Customer Index'!A1" };
      sheet.B5 = { t: "s", v: "เปิด Customer Index", l: { Target: "#'Customer Index'!A1" } };
    }
    statementRanges.forEach((range) => {
      const headingRef = XLSX.utils.encode_cell({ r: range.headingRow, c: 0 });
      sheet[headingRef].s = { fill: { fgColor: { rgb: "D9EAF7" } }, font: { bold: true, color: { rgb: "17365D" } } };
      applyHeaderStyle(sheet, XLSX.utils.encode_range({ s: { r: range.headerRow, c: 0 }, e: { r: range.headerRow, c: 13 } }), XLSX);
      if (range.dataEnd >= range.dataStart) setNumberFormats(sheet, [5, 8, 9, 10, 11, 12], range.dataStart + 1, range.dataEnd + 1, XLSX);
    });
    sheet["!autofilter"] = statementRanges.length === 1 && statementRanges[0].dataEnd >= statementRanges[0].headerRow
      ? { ref: XLSX.utils.encode_range({ s: { r: statementRanges[0].headerRow, c: 0 }, e: { r: statementRanges[0].dataEnd, c: 13 } }) }
      : undefined;
    return sheet;
  }

  function buildOutputWorkbook(XLSX, parsed, options = {}) {
    const settings = {
      createCustomerSheets: options.createCustomerSheets !== false,
      includeAllTransactions: options.includeAllTransactions !== false,
      includeOpeningClosing: options.includeOpeningClosing !== false,
      includeExceptions: options.includeExceptions !== false,
    };
    const workbook = XLSX.utils.book_new();
    const usedNames = new Set(["customer index", "customer summary", "all transactions", "exceptions"]);
    const sheetNamesByKey = new Map();
    parsed.customers.forEach((customer) => sheetNamesByKey.set(customer.key, createCustomerSheetName(customer, usedNames)));

    const indexHeaders = ["Entity", "Customer Code", "Customer Name", "Currencies", "Payment Term", "Statements", "Transactions", "Ending THB", "Ending USD", "Customer Sheet"];
    const indexRows = parsed.customers.map((customer) => {
      const currencies = [...new Set(customer.statements.map((statement) => statement.currency).filter(Boolean))].sort();
      const endingByCurrency = {};
      customer.statements.forEach((statement) => { endingByCurrency[statement.currency] = (endingByCurrency[statement.currency] || 0) + (statement.closingBalance || 0); });
      return [
        customer.company,
        customer.customerCode,
        customer.customerName,
        currencies.join(", "),
        customer.paymentTerm,
        customer.statements.length,
        customer.statements.reduce((sum, statement) => sum + statement.transactionCount, 0),
        endingByCurrency.THB || 0,
        endingByCurrency.USD || 0,
        "เปิด",
      ];
    });
    const indexSheet = XLSX.utils.aoa_to_sheet([indexHeaders, ...indexRows]);
    applyHeaderStyle(indexSheet, "A1:J1", XLSX);
    indexSheet["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 34 }, { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
    indexSheet["!autofilter"] = { ref: `A1:J${indexRows.length + 1}` };
    setNumberFormats(indexSheet, [7, 8], 2, indexRows.length + 1, XLSX);
    parsed.customers.forEach((customer, index) => {
      const ref = `J${index + 2}`;
      indexSheet[ref].l = { Target: `#'${sheetNamesByKey.get(customer.key).replace(/'/g, "''")}'!A1` };
    });
    XLSX.utils.book_append_sheet(workbook, indexSheet, "Customer Index");

    const summaryHeaders = ["Entity", "Customer Code", "Customer Name", "Currency", "Payment Term", "Period From", "Period To", "Opening Balance", "Debit", "Credit", "Ending Balance", "Transactions", "Balance Variance", "Statement ID"];
    const summaryRows = statementSummaryRows(parsed.statements);
    const summarySheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
    applyHeaderStyle(summarySheet, "A1:N1", XLSX);
    summarySheet["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 13 }, { wch: 16 }, { wch: 55 }];
    summarySheet["!autofilter"] = { ref: `A1:N${summaryRows.length + 1}` };
    setNumberFormats(summarySheet, [7, 8, 9, 10, 12], 2, summaryRows.length + 1, XLSX);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Customer Summary");

    if (settings.includeAllTransactions) {
      const txHeaders = ["Entity", "Customer Code", "Customer Name", "Address", "Payment Term", "Currency", "Period From", "Period To", ...TX_HEADERS, "Statement ID", "Source File"];
      const txRows = allTransactionRows(parsed.statements, settings.includeOpeningClosing);
      const txSheet = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
      applyHeaderStyle(txSheet, `A1:X1`, XLSX);
      txSheet["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 34 }, { wch: 48 }, { wch: 35 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 13 }, { wch: 13 }, { wch: 18 }, { wch: 42 }, { wch: 18 }, { wch: 13 }, { wch: 13 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 55 }, { wch: 30 }];
      txSheet["!autofilter"] = { ref: `A1:X${txRows.length + 1}` };
      setNumberFormats(txSheet, [13, 16, 17, 18, 19, 20], 2, txRows.length + 1, XLSX);
      XLSX.utils.book_append_sheet(workbook, txSheet, "All Transactions");
    }

    if (settings.includeExceptions) {
      const exHeaders = ["Source Sheet", "Issue Type", "Customer Code", "Customer Name", "Currency", "Message"];
      const exRows = parsed.exceptions.map((item) => [item.sourceSheet, item.type, item.customerCode, item.customerName, item.currency, item.message]);
      const exSheet = XLSX.utils.aoa_to_sheet([exHeaders, ...exRows]);
      applyHeaderStyle(exSheet, "A1:F1", XLSX);
      exSheet["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 70 }];
      exSheet["!autofilter"] = { ref: `A1:F${Math.max(2, exRows.length + 1)}` };
      XLSX.utils.book_append_sheet(workbook, exSheet, "Exceptions");
    }

    if (settings.createCustomerSheets) {
      parsed.customers.forEach((customer) => {
        const sheetName = sheetNamesByKey.get(customer.key);
        XLSX.utils.book_append_sheet(workbook, buildCustomerSheet(XLSX, customer, sheetName, settings.includeOpeningClosing), sheetName);
      });
    }

    return {
      workbook,
      report: {
        customers: parsed.analysis.customers,
        statements: parsed.analysis.statements,
        transactionRows: parsed.analysis.transactionRows,
        allRows: parsed.analysis.allRows,
        currencies: parsed.analysis.currencies,
        exceptions: parsed.analysis.exceptions,
        outputSheets: workbook.SheetNames.length,
      },
    };
  }

  return {
    normalizeText,
    parseAmount,
    isStatementHeader,
    isCustomerHeader,
    isTransactionTable,
    parseWorkbook,
    buildOutputWorkbook,
    sanitizeSheetName,
    createCustomerSheetName,
  };
});
