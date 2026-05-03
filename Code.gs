/**
 * Metabolic Momentum — Raffle backend (Google Apps Script)
 *
 * Setup:
 *   1. Open the Google Sheet:
 *      https://docs.google.com/spreadsheets/d/1ArpZ_eXSXy0IEMlYPI1m0r_LP-J-TIiYV93X38HOqCQ/edit
 *   2. Extensions → Apps Script.
 *   3. Replace the default Code.gs contents with this file. Save.
 *   4. (Once, after pasting an updated version) From the function dropdown
 *      at the top, choose `resetHeaders` and click Run. This wipes the
 *      "Entries" tab and writes fresh column headers.
 *      ⚠️  Only do this if you want to start with an empty sheet.
 *   5. Deploy → Manage deployments → pencil ✏️ next to the active deployment
 *      → Version: New version → Deploy. The Web app URL stays the same.
 *
 * Endpoints:
 *   POST  <url>                 → append a raffle entry (body = JSON)
 *   GET   <url>?action=list     → returns { ok: true, entries: [{id, name}, ...] }
 */

const SHEET_ID   = '1ArpZ_eXSXy0IEMlYPI1m0r_LP-J-TIiYV93X38HOqCQ';
const SHEET_NAME = 'Entries';

const HEADERS = [
  'Timestamp',
  'Name',
  'Email',
  'Phone',
  'Invited By',
  'Rate: Energy',
  'Rate: Sleep',
  'Rate: Weight',
  'Rate: Cravings/Blood Sugar',
  'Rate: Mood/Stress',
  'Rate: Digestion',
  'Rate: Community/Connection',
  'Tried Program Before',
  'Anything Else',
  'Newsletter Opt-In'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');

    // Admin: clear all entries (called from wheel.html "Clear all entries" button).
    // The wheel URL is host-only by obscurity; the button itself double-confirms.
    if (data.action === 'clear') {
      const sheet = getSheet_();
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
      return jsonResponse_({ ok: true, cleared: true });
    }

    const sheet = getSheet_();

    if (!data.name || !data.email) {
      return jsonResponse_({ ok: false, error: 'name and email are required' });
    }

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.invitedBy || '',
      data.rateEnergy || '',
      data.rateSleep || '',
      data.rateWeight || '',
      data.rateCravings || '',
      data.rateMood || '',
      data.rateDigestion || '',
      data.rateCommunity || '',
      data.triedBefore || '',
      data.frustration || '',
      data.newsletter ? 'Yes' : 'No'
    ]);

    return jsonResponse_({ ok: true });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
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

  return jsonResponse_({ ok: true, message: 'Metabolic Momentum raffle endpoint. POST to submit, GET ?action=list to read.' });
}

/**
 * Wipe the Entries tab and rewrite headers.
 * Run this manually from the Apps Script editor when you change the
 * HEADERS array above. ⚠️ Destroys all existing entries.
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
