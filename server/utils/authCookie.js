const COOKIE_NAME = 'nss_token';

const COOKIE_OPTIONS = {
  httpOnly: true, // JS cannot read this — the entire point. XSS can't exfiltrate it via document.cookie or localStorage.
  secure: process.env.NODE_ENV === 'production', // HTTPS-only in prod; allow http for local dev
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' needed if frontend/backend are on different domains in prod (requires secure:true); 'lax' is fine and simpler for same-site local dev
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