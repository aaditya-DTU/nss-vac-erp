// Sends mail through Brevo's transactional HTTP API (port 443) instead of
// raw SMTP (ports 25/465/587). Render's free web services block outbound
// SMTP ports entirely — the HTTP API isn't affected, since it's just a
// normal HTTPS POST request like any other API call this server makes.
//
// Needs BREVO_API_KEY in the environment. This is DIFFERENT from
// SMTP_PASS/SMTP_USER — those are SMTP credentials (the "xsmtpsib-..."
// key), the API needs a separate API key from Brevo's dashboard under
// Settings > SMTP & API > API Keys > "Generate a new API key" (it looks
// like "xkeysib-..."). SMTP_HOST/PORT/USER/PASS are no longer used by this
// file and can be removed once BREVO_API_KEY is set, though leaving them
// in .env is harmless.

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Sender identity for every outgoing mail. Reuses SMTP_FROM if it's
// already set in the `"Display Name" <email@example.com>` format (same
// format nodemailer expected), so no .env changes are required beyond
// adding BREVO_API_KEY. Falls back to BREVO_SENDER_NAME/BREVO_SENDER_EMAIL
// if you'd rather set those explicitly instead.
function getSender() {
  const raw = process.env.SMTP_FROM;
  if (raw) {
    const match = raw.match(/^"?([^"]*)"?\s*<(.+)>$/);
    if (match) return { name: match[1].trim() || 'NSS VAC ERP', email: match[2].trim() };
    // Plain "email@example.com" with no display name.
    if (raw.includes('@')) return { name: 'NSS VAC ERP', email: raw.trim() };
  }
  return {
    name: process.env.BREVO_SENDER_NAME || 'NSS VAC ERP',
    email: process.env.BREVO_SENDER_EMAIL || '',
  };
}

// Low-level send via Brevo's REST API. Falls back to logging to the
// console when BREVO_API_KEY isn't configured — same "fully
// testable/demoable without setting up email" behavior the SMTP version
// had, kept deliberately so local dev/demo still works with zero setup.
async function sendViaBrevo({ to, toName, subject, html, consoleFallbackLabel, consoleFallbackValue }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.log(`\n[mailer] BREVO_API_KEY not configured — ${consoleFallbackLabel} for ${to}: ${consoleFallbackValue}\n`);
    return { delivered: false, mode: 'console' };
  }

  const sender = getSender();
  if (!sender.email) {
    console.error('[mailer] No sender email configured (SMTP_FROM or BREVO_SENDER_EMAIL) — cannot send.');
    return { delivered: false, mode: 'console' };
  }

  let res;
  try {
    res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to, name: toName || undefined }],
        subject,
        htmlContent: html,
      }),
    });
  } catch (err) {
    // Network-level failure (DNS, connection refused, etc.) — fetch
    // itself threw before we even got an HTTP response.
    console.error(`[mailer] sendViaBrevo to ${to} failed (network):`, err.message);
    throw err;
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.message || detail;
    } catch {
      // response wasn't JSON — stick with the status code
    }
    const err = new Error(`Brevo API error: ${detail}`);
    console.error(`[mailer] sendViaBrevo to ${to} failed:`, detail);
    throw err;
  }

  return { delivered: true, mode: 'api' };
}

// Falls back to logging the OTP to the server console when Brevo isn't
// configured — this is deliberate, the same pattern used for the chatbot's
// LLM providers: the feature should be fully testable/demoable before
// anyone has to go set up a mail account, not blocked on it.
async function sendOtpEmail(email, otp) {
  return sendViaBrevo({
    to: email,
    subject: 'Your NSS VAC ERP verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: auto;">
        <p style="color:#1565C0; font-size:12px; letter-spacing:1px; text-transform:uppercase;">NSS VAC · DTU</p>
        <h2 style="color:#0D47A1;">Verify your email</h2>
        <p>Your one-time verification code is:</p>
        <p style="font-size:32px; font-weight:700; letter-spacing:6px; color:#0D47A1;">${otp}</p>
        <p style="color:#666; font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
    consoleFallbackLabel: 'OTP',
    consoleFallbackValue: otp,
  });
}

async function sendPasswordResetOtpEmail(email, otp) {
  return sendViaBrevo({
    to: email,
    subject: 'Reset your NSS VAC ERP password',
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: auto;">
        <p style="color:#1565C0; font-size:12px; letter-spacing:1px; text-transform:uppercase;">NSS VAC · DTU</p>
        <h2 style="color:#0D47A1;">Reset your password</h2>
        <p>Someone requested a password reset for this account. Use the code below to continue:</p>
        <p style="font-size:32px; font-weight:700; letter-spacing:6px; color:#0D47A1;">${otp}</p>
        <p style="color:#666; font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
      </div>
    `,
    consoleFallbackLabel: 'password reset OTP',
    consoleFallbackValue: otp,
  });
}

module.exports = { sendOtpEmail, sendPasswordResetOtpEmail};