/**
 * Wanderweg Leonbergers: puppy questionnaire handler
 *
 * Receives questionnaire answers from the website and:
 *   1. emails the full response to you,
 *   2. emails the applicant a thank-you with a copy of their answers,
 *   3. saves a row in the "Responses" tab of this Google Sheet (a backup).
 *
 * Setup steps are in SETUP.md. The only things you normally change are
 * in CONFIG below.
 *
 * The questions come from the website (_data/questionnaire.yml), so adding
 * or changing questions there needs NO change here.
 */

const CONFIG = {
  // Where new questionnaires are sent. Separate several with commas.
  NOTIFY_EMAIL: 'hello@wanderweg.ca',

  // Name shown as the sender of both emails.
  FROM_NAME: 'Wanderweg Leonbergers',

  // When the applicant presses "Reply" on their thank-you email, it goes here.
  REPLY_TO: 'hello@wanderweg.ca',

  // Optional: send from this address instead of your Gmail address.
  // It must already be set up in Gmail under Settings > Accounts > "Send mail as".
  // Leave empty ('') to send from the Google account that owns this script.
  FROM_ALIAS: '',

  // Website address, linked at the bottom of the thank-you email.
  SITE_URL: 'https://wanderweg.ca',

  // Name of the tab in this spreadsheet where responses are saved.
  SHEET_NAME: 'Responses',

  // Submissions faster than this (in seconds) are treated as spam bots.
  MIN_SECONDS: 5,
};

// ─────────────────────────────────────────────────────────────
//  Thank-you email text (shown to the applicant)
// ─────────────────────────────────────────────────────────────
function thankYouText_(firstName) {
  const hi = firstName ? 'Hi ' + firstName + ',' : 'Hello,';
  return [
    hi,
    'Thank you for completing the puppy questionnaire for Wanderweg Leonbergers.',
    'We read every questionnaire and will be in touch by email. In the meantime, feel free to reply to this email with any questions.',
    'For your records, a copy of your answers is below.',
  ];
}

// ═════════════════════════════════════════════════════════════
//  You shouldn't need to change anything below this line.
// ═════════════════════════════════════════════════════════════

/** Handles a submitted questionnaire. */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return reply_(false, 'No answers were received.');
    const data = JSON.parse(e.postData.contents);

    // Quietly ignore likely spam (hidden field filled, or submitted impossibly fast).
    const tooFast = data.started && (Date.now() - Number(data.started)) < CONFIG.MIN_SECONDS * 1000;
    if (data.website || tooFast) return reply_(true);

    const email = clip_(data.email, 254).trim();
    const firstName = clip_(data.first_name, 100).trim();
    const lastName = clip_(data.last_name, 100).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply_(false, 'Please enter a valid email address.');
    }

    const answers = (Array.isArray(data.answers) ? data.answers : []).slice(0, 150).map(function (a) {
      return {
        section: clip_(a && a.section, 120),
        label: clip_(a && a.label, 400),
        value: clip_(a && a.value, 5000),
      };
    });
    if (!answers.length) return reply_(false, 'No answers were received.');

    // Ignore an accidental double submit from the same address within a minute.
    const cache = CacheService.getScriptCache();
    const key = 'sent_' + Utilities.base64EncodeWebSafe(email.toLowerCase());
    if (cache.get(key)) return reply_(true);
    cache.put(key, '1', 60);

    const fullName = (firstName + ' ' + lastName).trim() || email;

    saveToSheet_(answers);                       // backup first, so nothing is lost
    sendNotification_(fullName, email, answers); // to you
    sendThankYou_(firstName, email, answers);    // to the applicant

    return reply_(true);
  } catch (err) {
    console.error(err && err.stack || err);
    return reply_(false, 'Sorry, something went wrong on our side. Please try again, or email ' + CONFIG.REPLY_TO + '.');
  }
}

/** Opening the web app URL in a browser shows this, which confirms it is running. */
function doGet() {
  return ContentService.createTextOutput('The Wanderweg questionnaire service is running.');
}

// ── Emails ───────────────────────────────────────────────────

function sendNotification_(fullName, email, answers) {
  const subject = 'Puppy questionnaire: ' + fullName;
  const intro = 'New puppy questionnaire from ' + fullName + ' (' + email + '). Press Reply to answer them directly.';
  send_(CONFIG.NOTIFY_EMAIL, subject, [intro], answers, email);
}

function sendThankYou_(firstName, email, answers) {
  const subject = 'Thank you for your Wanderweg puppy questionnaire';
  send_(email, subject, thankYouText_(firstName), answers, CONFIG.REPLY_TO, true);
}

function send_(to, subject, paragraphs, answers, replyTo, withSignature) {
  const options = {
    name: CONFIG.FROM_NAME,
    replyTo: replyTo,
    htmlBody: emailHtml_(paragraphs, answers, withSignature),
  };
  if (CONFIG.FROM_ALIAS && GmailApp.getAliases().indexOf(CONFIG.FROM_ALIAS) !== -1) {
    options.from = CONFIG.FROM_ALIAS;
  }
  GmailApp.sendEmail(to, subject, emailText_(paragraphs, answers, withSignature), options);
}

function emailHtml_(paragraphs, answers, withSignature) {
  let html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0D0D0D;max-width:640px">';
  paragraphs.forEach(function (p) { html += '<p style="margin:0 0 12px">' + esc_(p) + '</p>'; });

  let section = null;
  html += '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:8px">';
  answers.forEach(function (a) {
    if (a.section !== section) {
      section = a.section;
      html += '<tr><td colspan="2" style="padding:18px 0 6px;font-family:Georgia,serif;font-size:17px;border-bottom:2px solid #E0A800">' + esc_(section) + '</td></tr>';
    }
    html += '<tr>' +
      '<td style="padding:8px 12px 8px 0;border-bottom:1px solid #e5e0d8;vertical-align:top;color:#46566b;width:45%">' + esc_(a.label) + '</td>' +
      '<td style="padding:8px 0;border-bottom:1px solid #e5e0d8;vertical-align:top;white-space:pre-wrap">' + (a.value ? esc_(a.value) : '<span style="color:#999">(no answer)</span>') + '</td>' +
      '</tr>';
  });
  html += '</table>';

  if (withSignature) {
    html += '<p style="margin:24px 0 0">Warm regards,<br>' + esc_(CONFIG.FROM_NAME) + '<br>' +
      '<a href="' + esc_(CONFIG.SITE_URL) + '" style="color:#a84a20">' + esc_(CONFIG.SITE_URL.replace(/^https?:\/\//, '')) + '</a></p>';
  }
  return html + '</div>';
}

function emailText_(paragraphs, answers, withSignature) {
  let text = paragraphs.join('\n\n') + '\n';
  let section = null;
  answers.forEach(function (a) {
    if (a.section !== section) {
      section = a.section;
      text += '\n== ' + section + ' ==\n';
    }
    text += a.label + '\n  ' + (a.value || '(no answer)') + '\n';
  });
  if (withSignature) text += '\nWarm regards,\n' + CONFIG.FROM_NAME + '\n' + CONFIG.SITE_URL + '\n';
  return text;
}

// ── Google Sheet backup ──────────────────────────────────────

function saveToSheet_(answers) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) return; // script isn't attached to a spreadsheet: skip the backup

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = book.getSheetByName(CONFIG.SHEET_NAME) || book.insertSheet(CONFIG.SHEET_NAME);
    let headers = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    if (!headers.length) headers = ['Submitted'];

    // Add a column for any question the sheet hasn't seen before.
    answers.forEach(function (a) {
      if (headers.indexOf(a.label) === -1) headers.push(a.label);
    });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);

    const row = headers.map(function (h) {
      if (h === 'Submitted') return new Date();
      const match = answers.filter(function (a) { return a.label === h; })[0];
      // A leading apostrophe stops Sheets treating answers like "=…" as formulas.
      return match ? (/^[=+\-@]/.test(match.value) ? "'" + match.value : match.value) : '';
    });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

// ── Helpers ──────────────────────────────────────────────────

function reply_(ok, error) {
  const body = ok ? { ok: true } : { ok: false, error: error };
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function clip_(value, max) {
  return String(value == null ? '' : value).slice(0, max);
}

function esc_(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Test ─────────────────────────────────────────────────────

/**
 * Run this once from the editor (select testSubmission, press Run) to check
 * everything works. Both emails go to NOTIFY_EMAIL, and a test row is added
 * to the sheet, which you can delete afterwards.
 */
function testSubmission() {
  const testEmail = CONFIG.NOTIFY_EMAIL.split(',')[0].trim();
  const fake = {
    postData: {
      contents: JSON.stringify({
        email: testEmail,
        first_name: 'Test',
        last_name: 'Applicant',
        website: '',
        started: Date.now() - 60000,
        answers: [
          { section: 'About you', label: 'First name', value: 'Test' },
          { section: 'About you', label: 'Last name', value: 'Applicant' },
          { section: 'About you', label: 'Email', value: testEmail },
          { section: 'Your home', label: 'Do you own or rent your home?', value: 'Own' },
          { section: 'Why a Leonberger', label: 'Why are you interested in obtaining a Leonberger puppy? Select all that apply.', value: 'Companion, Other: Hiking buddy' },
        ],
      }),
    },
  };
  CacheService.getScriptCache().removeAll(['sent_' + Utilities.base64EncodeWebSafe(testEmail.toLowerCase())]);
  const result = doPost(fake).getContent();
  console.log('Result: ' + result);
}
