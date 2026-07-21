const COOKIE_NAME = 'nss_token';

// Hardcoded for prod (Vercel client <-> Render server = cross-site, so this
// must always be secure:true + sameSite:'none' or the cookie never survives
// the round trip). For LOCAL dev over http://localhost, flip these two lines
// to `secure: false, sameSite: 'lax'` manually — don't leave it on env-var
// detection, a missing/misconfigured NODE_ENV on Render silently breaks login.
const COOKIE_OPTIONS = {
  httpOnly: true, // JS cannot read this — the entire point. XSS can't exfiltrate it via document.cookie or localStorage.
  secure: true,
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — keep in sync with JWT_EXPIRES_IN
  path: '/',
};

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: undefined });
}

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie };