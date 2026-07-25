require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { notFound, errorHandler } = require('./middleware/errorHandler');

// credentials:true + an explicit origin is mandatory here, not optional —
// browsers silently refuse to send/accept cookies on credentialed requests
// if the server responds with a wildcard '*' origin. CLIENT_URL must be set
// to the real frontend URL for the auth cookie to work at all.
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();

// Render (and most PaaS hosts) put the app behind one reverse proxy hop,
// which sets X-Forwarded-For on every request. Express doesn't trust that
// header by default — without this, express-rate-limit refuses to use it
// (see the ERR_ERL_UNEXPECTED_X_FORWARDED_FOR error), since blindly
// trusting a client-settable header for rate-limiting would let anyone
// spoof their way around limits. `1` means "trust exactly one hop in
// front of us" (Render's proxy) — not "trust everything," which would
// reopen that same spoofing hole.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(cookieParser());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Note: no local /uploads static route — proof files and certificates are
// served directly from Cloudinary's CDN (see utils/cloudinaryUpload.js).

// Rate limiting is disabled in tests — express-rate-limit's default memory
// store persists across requests within a single test run, and a full test
// suite can easily exceed 500 requests to the same app instance without
// that reflecting any real abuse.
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
}

app.get('/api/health', (req, res) => res.json({ success: true, message: 'NSS VAC ERP API is running.' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/responsibilities', require('./routes/responsibilityRoutes'));
app.use('/api/ideas', require('./routes/ideaRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;