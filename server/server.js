const http = require('http');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const scheduleDeadlineReminders = require('./jobs/deadlineReminders');
const KnowledgeBase = require('./models/KnowledgeBase');
const { defaultFaqs } = require('./utils/defaultFaqs');
const { COOKIE_NAME } = require('./utils/authCookie');

// Guarantees the chatbot always has the current default FAQ set, even if:
// (a) `npm run seed` was never run, or
// (b) it was run before this FAQ was added to defaultFaqs.js, or
// (c) the DB was seeded with an earlier, smaller version of the list.
// Upserts by question text rather than wiping the collection, so any
// custom FAQs an admin has added through the UI are left untouched.
async function ensureKnowledgeBaseSeeded() {
  try {
    const results = await Promise.all(
      defaultFaqs().map((faq) =>
        KnowledgeBase.updateOne({ question: faq.question }, { $setOnInsert: faq }, { upsert: true })
      )
    );
    const added = results.filter((r) => r.upsertedCount > 0).length;
    if (added > 0) {
      console.log(`[startup] Knowledge base topped up with ${added} new default FAQ(s).`);
    }
  } catch (err) {
    console.error('[startup] Failed to check/seed knowledge base:', err.message);
  }
}

const server = http.createServer(app);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});

// Auth reads whichever the client actually sent:
//   1. socket.handshake.auth.token — a short-lived token from
//      GET /api/auth/socket-token, used for the direct cross-origin
//      connection in production (see SocketContext.jsx). This is the
//      primary path now.
//   2. Falls back to the httpOnly cookie if no token was sent — still
//      works for local dev, where the socket connects same-origin
//      through Vite's dev proxy (vite.config.js has ws:true) and the
//      cookie is first-party there, so there's no reason to force the
//      token round-trip locally too.
io.use((socket, next) => {
  try {
    let token = socket.handshake.auth?.token;

    if (!token) {
      const rawCookie = socket.handshake.headers.cookie;
      if (rawCookie) {
        const parsed = cookie.parse(rawCookie);
        token = parsed[COOKIE_NAME];
      }
    }

    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next();
  }
});

io.on('connection', (socket) => {
  if (socket.userId) socket.join(`user:${socket.userId}`);
});

app.set('io', io);

connectDB().then(ensureKnowledgeBaseSeeded);

scheduleDeadlineReminders(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`NSS VAC ERP server running on port ${PORT}`));

module.exports = { app, server, io };