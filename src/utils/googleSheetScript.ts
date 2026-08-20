export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * PAC ENGINEERING DATABASE BACKEND - GOOGLE APPS SCRIPT
 * 
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheet ของท่าน
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) -> "Apps Script"
 * 3. วางโค้ดทั้งหมดนี้ลงไปในไฟล์ Code.gs แล้วกด บันทึก (Ctrl+S)
 * 4. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 5. เลือกประเภท: "เว็บแอป" (Web app)
 * 6. เข้าถึงได้ทุกคน (Anyone) แล้วกด "ทำให้ใช้งานได้" (Deploy)
 * 7. คัดลอก URL เว็บแอปที่ได้ มากรอกในระบบ PAC Engineering
 */

function doGet(e) {
  var action = e.parameter.action || 'pull';
  if (action === 'test') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'เชื่อมต่อกับ Google Sheet สำเร็จแล้ว!',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dbData = loadDataFromSheet(ss);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: dbData,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action || 'sync';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'sync' || action === 'push') {
      var db = contents.data;
      if (db) {
        saveDataToSheet(ss, db);
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          message: 'บันทึกข้อมูลลง Google Sheet สำเร็จ',
          timestamp: new Date().toISOString()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'รูปแบบข้อมูลไม่ถูกต้อง'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveDataToSheet(ss, db) {
  // 1. Quotations Sheet
  var qSheet = getOrCreateSheet(ss, 'Quotations');
  qSheet.clearContents();
  qSheet.appendRow(['UID', 'QuoteNo', 'Rev', 'Date', 'Status', 'Customer', 'Project', 'GrandTotal', 'JSONData']);
  if (db.quotations && db.quotations.length) {
    db.quotations.forEach(function(q) {
      qSheet.appendRow([
        q.uid,
        q.meta ? q.meta.quoteNo : '',
        q.meta ? q.meta.rev : '',
        q.meta ? q.meta.date : '',
        q.meta ? q.meta.status : '',
        q.customer ? q.customer.attn : '',
        q.project ? q.project.line1 : '',
        q.calc ? q.calc.grand : q.grand,
        JSON.stringify(q)
      ]);
    });
  }
  
  // 2. Inventory Sheet
  var invSheet = getOrCreateSheet(ss, 'Inventory');
  invSheet.clearContents();
  invSheet.appendRow(['Model', 'Description', 'Unit', 'MatPrice', 'LabPrice', 'Stock']);
  if (db.inventory && db.inventory.length) {
    db.inventory.forEach(function(i) {
      invSheet.appendRow([i.model, i.desc, i.unit, i.matPrice, i.labPrice, i.stock]);
    });
  }

  // 3. Installations Sheet
  var insSheet = getOrCreateSheet(ss, 'Installations');
  insSheet.clearContents();
  insSheet.appendRow(['ID', 'QtRef', 'Mechanic', 'StartDate', 'EndDate', 'Progress', 'Details']);
  if (db.installations && db.installations.length) {
    db.installations.forEach(function(ins) {
      insSheet.appendRow([ins.id, ins.qtRef, ins.mechanic, ins.startDate, ins.endDate, ins.progress, ins.details]);
    });
  }

  // 4. Services Sheet
  var srvSheet = getOrCreateSheet(ss, 'Services');
  srvSheet.clearContents();
  srvSheet.appendRow(['ID', 'QtRef', 'Customer', 'Issue', 'StartDate', 'EndDate', 'Progress']);
  if (db.services && db.services.length) {
    db.services.forEach(function(srv) {
      srvSheet.appendRow([srv.id, srv.qtRef, srv.customer, srv.issue, srv.startDate, srv.endDate, srv.progress]);
    });
  }

  // 5. Users Sheet
  var userSheet = getOrCreateSheet(ss, 'Users');
  userSheet.clearContents();
  userSheet.appendRow(['ID', 'Username', 'Name', 'Role', 'Status', 'LastLogin']);
  if (db.users && db.users.length) {
    db.users.forEach(function(u) {
      userSheet.appendRow([u.id, u.username, u.name, u.role, u.active ? 'Active' : 'Suspended', u.lastLogin || '']);
    });
  }

  // 6. AuditLogs Sheet
  var auditSheet = getOrCreateSheet(ss, 'AuditLogs');
  auditSheet.clearContents();
  auditSheet.appendRow(['ID', 'Timestamp', 'Username', 'Role', 'Action', 'Category', 'Target', 'Details']);
  if (db.auditLogs && db.auditLogs.length) {
    // Only save the latest 1000 logs to prevent sheet from getting too heavy
    var logsToSave = db.auditLogs.slice(-1000);
    logsToSave.forEach(function(log) {
      auditSheet.appendRow([log.id, log.timestamp, log.username, log.role, log.action, log.category, log.target, log.details]);
    });
  }

  // 7. System State Backup Sheet
  var stateSheet = getOrCreateSheet(ss, 'SystemState');
  stateSheet.clearContents();
  stateSheet.appendRow(['Key', 'Value']);
  stateSheet.appendRow(['FULL_DATABASE_JSON', JSON.stringify(db)]);
}

function loadDataFromSheet(ss) {
  var stateSheet = ss.getSheetByName('SystemState');
  if (stateSheet) {
    var data = stateSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === 'FULL_DATABASE_JSON' && data[i][1]) {
        try {
          return JSON.parse(data[i][1]);
        } catch(e){}
      }
    }
  }
  return null;
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}
`;
