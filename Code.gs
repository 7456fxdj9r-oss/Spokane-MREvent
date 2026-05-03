/**
 * Metabolic Momentum — Raffle backend (Google Apps Script)
 *
 * Setup / redeploy after editing:
 *   1. Replace Code.gs in Apps Script with this file. Save.
 *   2. Once (only when HEADERS change): from the function dropdown choose
 *      `resetHeaders` and click Run. ⚠️ Wipes all entries.
 *   3. Deploy → Manage deployments → ✏️ pencil → Version: New version
 *      → Deploy. The Web app URL stays the same.
 *
 * Endpoints:
 *   POST <url>  body { ...entry... }            → create entry, returns { ok, id }
 *   POST <url>  body { action:'update', id, ... } → fill in step-2 fields
 *   POST <url>  body { action:'clear' }          → delete all entries
 *   GET  <url>?action=list                       → { ok, entries:[{id, name}, ...] }
 */

const SHEET_ID   = '1ArpZ_eXSXy0IEMlYPI1m0r_LP-J-TIiYV93X38HOqCQ';
const SHEET_NAME = 'Entries';

const HEADERS = [
  'Timestamp',
  'Name',
  'Email',
  'Phone',
  'Invited By',
  'Newsletter Opt-In',
  'Knows: Diabetes',
  'Knows: High Blood Pressure',
  'Knows: High Cholesterol',
  'Rate: Energy',
  'Rate: Sleep',
  'Rate: Weight',
  'Rate: Cravings/Blood Sugar',
  'Rate: Mood/Stress',
  'Rate: Digestion',
  'Rate: Community/Connection',
  'Tried Program Before',
  'Anything Else'
];

// Map step-2 field names → header column names. Order doesn't matter; lookup is by header name.
const UPDATE_FIELDS = {
  hasDiabetes:        'Knows: Diabetes',
  hasHighBP:          'Knows: High Blood Pressure',
  hasHighCholesterol: 'Knows: High Cholesterol',
  rateEnergy:         'Rate: Energy',
  rateSleep:          'Rate: Sleep',
  rateWeight:         'Rate: Weight',
  rateCravings:       'Rate: Cravings/Blood Sugar',
  rateMood:           'Rate: Mood/Stress',
  rateDigestion:      'Rate: Digestion',
  rateCommunity:      'Rate: Community/Connection',
  triedBefore:        'Tried Program Before',
  frustration:        'Anything Else'
};

function doPost(e) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(5000);
  try {
    const data = JSON.parse(e.postData.contents || '{}');

    if (data.action === 'clear') {
      const sheet = getSheet_();
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
      return jsonResponse_({ ok: true, cleared: true });
    }

    if (data.action === 'update') {
      return updateEntry_(data);
    }

    return createEntry_(data);
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function createEntry_(data) {
  if (!data.name || !data.email) {
    return jsonResponse_({ ok: false, error: 'name and email are required' });
  }
  const sheet = getSheet_();
  // Build a row in HEADERS order, leaving step-2 columns blank.
  const row = HEADERS.map(h => {
    switch (h) {
      case 'Timestamp':         return new Date();
      case 'Name':              return data.name || '';
      case 'Email':             return data.email || '';
      case 'Phone':             return data.phone || '';
      case 'Invited By':        return data.invitedBy || '';
      case 'Newsletter Opt-In': return data.newsletter ? 'Yes' : 'No';
      default:                  return '';
    }
  });
  sheet.appendRow(row);
  const id = sheet.getLastRow();
  return jsonResponse_({ ok: true, id: id });
}

function updateEntry_(data) {
  const id = parseInt(data.id, 10);
  if (!id || id < 2) {
    return jsonResponse_({ ok: false, error: 'invalid id' });
  }
  const sheet = getSheet_();
  if (id > sheet.getLastRow()) {
    return jsonResponse_({ ok: false, error: 'id out of range' });
  }
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (const [field, header] of Object.entries(UPDATE_FIELDS)) {
    if (!(field in data)) continue;
    const colIdx = headerRow.indexOf(header);
    if (colIdx < 0) continue;
    let val = data[field];
    // Booleans → Yes/blank. Numbers/strings → as-is.
    if (typeof val === 'boolean') val = val ? 'Yes' : '';
    sheet.getRange(id, colIdx + 1).setValue(val);
  }
  return jsonResponse_({ ok: true, updated: id });
}

function doGet(e) {
  const action = ((e && e.parameter && e.parameter.action) || '').toLowerCase();

  if (action === 'list') {
    try {
      const sheet = getSheet_();
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonResponse_({ ok: true, entries: [] });
      const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // column B = Name
      const entries = values
        .map((row, i) => ({ id: i + 2, name: String(row[0] || '').trim() }))
        .filter(e => e.name);
      return jsonResponse_({ ok: true, entries: entries });
    } catch (err) {
      return jsonResponse_({ ok: false, error: String(err) });
    }
  }

  return jsonResponse_({ ok: true, message: 'Metabolic Momentum raffle endpoint.' });
}

/**
 * Wipe the Entries tab and rewrite headers.
 * Run this manually from the Apps Script editor when HEADERS changes.
 * ⚠️ Destroys all existing entries.
 */
function resetHeaders() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  } else {
    sheet.clear();
  }
  sheet.appendRow(HEADERS);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#fef3e2');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#fef3e2');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
