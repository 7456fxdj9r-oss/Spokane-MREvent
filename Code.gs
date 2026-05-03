/**
 * Metabolic Momentum — Raffle backend (Google Apps Script)
 *
 * Setup:
 *   1. Open the Google Sheet:
 *      https://docs.google.com/spreadsheets/d/1ArpZ_eXSXy0IEMlYPI1m0r_LP-J-TIiYV93X38HOqCQ/edit
 *   2. Extensions → Apps Script.
 *   3. Replace the default Code.gs contents with this file.
 *   4. Save.
 *   5. Deploy → New deployment → type "Web app".
 *      - Description: Metabolic Momentum raffle
 *      - Execute as: Me
 *      - Who has access: Anyone
 *      Click Deploy. Copy the resulting Web app URL.
 *   6. Send that URL to your developer (or paste it into raffle.html and
 *      wheel.html replacing the __SCRIPT_URL__ placeholder).
 *
 * Endpoints (after deployment):
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
  'What Brought You',
  'Energy (1-5)',
  'Sleep (1-5)',
  'Tried Program Before',
  'Biggest Frustration',
  'Newsletter Opt-In'
];

function doPost(e) {
  try {
    const sheet = getSheet_();
    const data = JSON.parse(e.postData.contents || '{}');

    if (!data.name || !data.email) {
      return jsonResponse_({ ok: false, error: 'name and email are required' });
    }

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.invitedBy || '',
      data.whatBrought || '',
      data.energy || '',
      data.sleep || '',
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
