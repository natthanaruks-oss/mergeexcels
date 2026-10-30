const fs=require('fs'),vm=require('vm'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'../public/excel-cleaner-ops.js'),'utf8');
const ctx={window:{}}; vm.createContext(ctx); vm.runInContext(code,ctx); const E=ctx.window.ExcelCleanerOps;
const rows=[['Name','Value',''],[' A  B ',1,''],[' A  B ',1,''],['',null,''],['C',2,'']];
const a=E.analyzeAoA(rows); if(a.blankRows!==1||a.blankCols!==1||a.duplicateRows!==1||a.trimCandidates!==2) throw new Error(JSON.stringify(a));
const c=E.cleanAoA(rows,{trimSpaces:true,removeBlankRows:true,removeBlankCols:true,removeDuplicates:true});
if(c.rows.length!==3||c.rows[1][0]!=='A B'||c.stats.removedDuplicateRows!==1) throw new Error(JSON.stringify(c));
console.log('Excel Cleaner Ops tests passed.');
