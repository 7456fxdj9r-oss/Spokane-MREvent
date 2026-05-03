/**
 * Metabolic Momentum — Raffle backend (Google Apps Script)
 *
 * Single-form version: doPost takes the entire raffle entry in one body
 * and writes one row.
 *
 * Setup / redeploy after editing:
 *   1. Replace Code.gs in Apps Script with this file. Save.
 *   2. (Only when HEADERS change) From the function dropdown choose
 *      `resetHeaders` and click Run. ⚠️ Wipes all entries.
 *   3. Deploy → Manage deployments → ✏️ pencil → Version: New version
 *      → Deploy. The Web app URL stays the same.
 *
 * Endpoints:
 *   POST <url>  body { ...entry... }       → append a new entry
 *   POST <url>  body { action:'clear' }    → delete all entries
 *   GET  <url>?action=list                 → { ok, entries:[{id, name}, ...] }
 */

const SHEET_ID   = '1ArpZ_eXSXy0IEMlYPI1m0r_LP-J-TIiYV93X38HOqCQ';
const SHEET_NAME = 'Entries';

// Raffle closes at end of day Mon May 4, 2026 (Pacific Time, UTC−7).
// Change this string to extend or shorten the window.
const RAFFLE_CUTOFF = new Date('2026-05-04T23:59:00-07:00');

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

    // Reject new entries after the raffle closes
    if (new Date() >= RAFFLE_CUTOFF) {
      return jsonResponse_({ ok: false, error: 'The raffle has closed.' });
    }

    if (!data.name || !data.email) {
      return jsonResponse_({ ok: false, error: 'name and email are required' });
    }

    const sheet = getSheet_();
    const row = HEADERS.map(h => {
      switch (h) {
        case 'Timestamp':                  return new Date();
        case 'Name':                       return data.name || '';
        case 'Email':                      return data.email || '';
        case 'Phone':                      return data.phone || '';
        case 'Invited By':                 return data.invitedBy || '';
        case 'Newsletter Opt-In':          return data.newsletter ? 'Yes' : 'No';
        case 'Knows: Diabetes':            return data.hasDiabetes || '';
        case 'Knows: High Blood Pressure': return data.hasHighBP || '';
        case 'Knows: High Cholesterol':    return data.hasHighCholesterol || '';
        case 'Rate: Energy':               return data.rateEnergy || '';
        case 'Rate: Sleep':                return data.rateSleep || '';
        case 'Rate: Weight':               return data.rateWeight || '';
        case 'Rate: Cravings/Blood Sugar': return data.rateCravings || '';
        case 'Rate: Mood/Stress':          return data.rateMood || '';
        case 'Rate: Digestion':            return data.rateDigestion || '';
        case 'Rate: Community/Connection': return data.rateCommunity || '';
        case 'Tried Program Before':       return data.triedBefore || '';
        case 'Anything Else':              return data.frustration || '';
        default:                           return '';
      }
    });
    sheet.appendRow(row);
    return jsonResponse_({ ok: true });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
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
