# NSS VAC ERP — Delhi Technological University

A full-stack ERP for running the NSS (National Service Scheme) Value Added Course at DTU — task and event management, verified community-service tracking, an agentic AI assistant, and auto-generated, publicly verifiable completion certificates. Built to replace scattered spreadsheets and manual attendance registers with one auditable system.

**Live demo:** `https://your-app.vercel.app` · **API:** `https://your-app.onrender.com`
*(update these once deployed — see [Deployment](#deployment))*

---

## Why this isn't just another CRUD app

- **Append-only points ledger.** Every hour/point ever awarded is a permanent `PointsLedger` entry, not a mutable counter — the same pattern real fintech/rewards systems use so totals are always reconstructible and auditable. Covered by a dedicated test suite.
- **Real session security.** Auth uses httpOnly cookies rather than `localStorage`, specifically to close an XSS exfiltration path — a compromised script can't read the session token even if it runs on the page. Registration is restricted to `@dtu.ac.in` emails and gated behind OTP email verification.
- **An actual agent, not a wrapper.** The chatbot (NSS Saathi) calls real backend tools to answer with live data — your hours, upcoming tasks, leaderboard rank — rather than reciting a script. It remembers conversation history, and every question it can't answer well gets logged and ranked by frequency so a coordinator can close the gap with one click.
- **Fraud-aware, not just trusting.** Every image proof is perceptual-hashed and checked against other submissions for visual duplicates; remarks are checked for copy-pasted text. Flags don't auto-reject — they surface for a human to review.
- **Deployment-correct from the start.** Files live on Cloudinary, not local disk (survives redeploys). Cross-domain cookie auth is configured correctly for split frontend/backend hosting. Tested with Jest/Supertest against an in-memory MongoDB, not mocked.

---

## Features

### Core workflow
- **RBAC** — Admin (NSS coordinator) and Student roles, enforced at the middleware layer, not just hidden in the UI
- **Tasks** — Admin publishes activities (plantation, blood donation, cleanliness, awareness camps, teaching, surveys, event duty) targeted to all students, a filtered cohort (year/branch/section), or specific individuals. Students submit photo/document/link proof; admin approves, rejects, or requests resubmission
- **Events & QR attendance** — Single permanent QR/ID per event, doubling as both the "join" link and the check-in credential once the coordinator opens the attendance window. Admin can fully edit event details after creation
- **Points ledger & leaderboard** — Hours and points credited automatically on approval, ranked leaderboard filterable by branch/year
- **Certificates** — Auto-generated PDF once a student crosses the configured hour threshold, each with a unique ID and QR code linking to a public, no-login verification page

### Trust & integrity
- **Duplicate-proof detection** — Perceptual image hashing (aHash) + text-similarity checks flag likely-duplicate submissions for manual review
- **Public certificate verification** — Anyone (a recruiter, the university office) can confirm a certificate is genuine at `/verify/:id`, no account required
- **Domain-restricted, OTP-verified registration** — Only `@dtu.ac.in` addresses can register, confirmed via a 6-digit emailed code before the account activates

### AI assistant — NSS Saathi
- Tool-calling agent (Groq/OpenAI-compatible) that queries live data — hours remaining, upcoming tasks, leaderboard rank, certificate status, recent announcements
- Persistent multi-turn conversation memory per user
- Proactive, data-driven greeting on open (not a canned line)
- Thumbs up/down feedback on every reply
- Self-improving: unanswered/low-confidence questions are logged, grouped by frequency, and one click from the admin turns a gap into a permanent FAQ
- Falls back gracefully through Groq → OpenAI → Gemini → pure FAQ retrieval depending on what's configured — fully functional with zero API keys set

### Community & engagement
- **Announcements** — pinned/categorized, live via Socket.io, with read receipts
- **Gallery** — auto-populated from approved photo proof submissions, no separate upload flow, paginated
- **Responsibilities** — admin can directly assign an ongoing role (PR, field work, photography, logistics, etc.) or leave it open for a student to self-claim
- **Ideas & Suggestions** — students submit feedback, admin reviews and marks reviewed/implemented

### Admin tools
- **Student activity tracker** — full per-student drill-down: event check-in history with timestamps, approved task history, ledger entries
- **Official report export** — per-student and category-wise `.xlsx` summary, ready to file upward
- **Bulk CSV student import**
- **Chatbot gap panel** — the self-improvement loop's admin-facing view

---

## Tech stack

**Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, JWT (httpOnly cookies), Multer, Cloudinary, PDFKit, QRCode, Nodemailer, node-cron, Jimp (perceptual hashing), ExcelJS, Jest + Supertest + mongodb-memory-server

**Frontend:** React 18 (Vite), React Router, Tailwind CSS, Recharts, Socket.io-client, react-hot-toast, qrcode.react

**Theme:** Light blue / white, Fraunces (display) + Inter (body)

---

## Architecture notes

- **`server/app.js` vs `server/server.js`** — `app.js` is the pure Express app definition (middleware, routes, error handlers), with no side effects. `server.js` wraps it with the HTTP server, Socket.io, DB connection, and the cron scheduler. This split is what makes the app importable in tests without accidentally connecting to the real database or binding a port.
- **`utils/ledger.js`** is the *only* place `User.totalHours`/`totalPoints` should ever be mutated — every controller that awards or reverses credit goes through `awardCredit()`/`reverseCredit()`, which is also what keeps the ledger and the cached totals guaranteed to match.
- **`utils/chatTools.js`** defines the chatbot's available tools as read-only data lookups by design — the agent can look things up but can't submit proof, register for events, or change state on a student's behalf. Any state-changing action still requires a deliberate click in the UI.

---

## Project structure

```
nss-vac-erp/
├── server/
│   ├── app.js                 # Express app (no side effects — testable)
│   ├── server.js              # HTTP server + Socket.io + DB + cron
│   ├── models/                # User, Task, Submission, Event, Attendance,
│   │                          # PointsLedger, Certificate, Announcement,
│   │                          # Responsibility, Idea, ChatMessage, etc.
│   ├── middleware/             # auth (cookie/JWT), rbac, upload, errorHandler
│   ├── controllers/
│   ├── routes/
│   ├── utils/                  # ledger.js, chatTools.js, llmClient.js,
│   │                          # cloudinaryUpload.js, mailer.js, otp.js, seed.js
│   ├── jobs/                   # deadlineReminders.js (cron)
│   └── tests/                  # ledger.test.js, rbac.test.js, testDb.js
└── client/
    └── src/
        ├── api/axios.js
        ├── context/             # AuthContext, SocketContext
        ├── components/          # Layout, Sidebar, ChatWidget, ProtectedRoute
        └── pages/
            ├── student/         # StudentDashboard, Tasks, TaskDetail
            ├── admin/           # AdminDashboard, AdminTasks, AdminStudents,
            │                    # AdminVerifyCertificate, AdminUnanswered
            └── Login, Register, Landing, Events, Announcements,
                Gallery, Responsibilities, Ideas, Leaderboard,
                Certificate, VerifyCertificate, EventJoin
```

---

## Local setup

### 1. Backend
```bash
cd server
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, CLOUDINARY_* (required)
npm install
npm run seed                # creates demo admin + students + a task/event + FAQ knowledge base
npm run dev                  # http://localhost:5000
```

Everything else in `.env` (SMTP, chatbot LLM keys) is optional — SMTP falls back to logging OTPs to the console, and the chatbot falls back to pure FAQ retrieval with no key configured.

Demo logins after seeding: `admin@dtu.ac.in / admin123` and `aditya@dtu.ac.in / student123`.

### 2. Frontend
```bash
cd client
npm install
npm run dev                  # http://localhost:5173 (proxies /api and /socket.io to :5000)
```

### 3. Tests
```bash
cd server
npm test                     # Jest + Supertest against an in-memory MongoDB
```
Covers the points-ledger auditability guarantee and the full RBAC boundary (unauthenticated, tampered token, deactivated account, role-escalation attempts).

---

## Deployment

**Backend → Render**, **Frontend → Vercel**.

Key things that make this deployment-correct rather than just "it runs":
- `VITE_API_URL` on the frontend points at the real backend URL — there's no dev-proxy in production
- `NODE_ENV=production` on the backend flips the auth cookie to `secure: true; sameSite: none`, required for it to survive the Vercel↔Render cross-domain trip
- `CLIENT_URL` on the backend must exactly match the Vercel URL — CORS rejects wildcard origins on credentialed requests by design

**Backend (Render):** Root directory `server`, build `npm install`, start `npm start`. Set every variable from `server/.env.example` in Render's environment settings, plus `NODE_ENV=production` and `CLIENT_URL=<your Vercel URL>`.

**Frontend (Vercel):** Root directory `client`, framework Vite, build `npm run build`, output `dist`. Set `VITE_API_URL=<your Render URL>`. `client/vercel.json` handles the SPA rewrite so client-side routes don't 404 on refresh.

---

## API reference

Base URL: `/api`. Every route except the ones marked **Public** requires the httpOnly auth cookie (sent automatically by the browser after login — no manual header needed). **Auth** column shows the role required beyond just being logged in.

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register with a `@dtu.ac.in` email; sends an OTP, does not log in yet |
| POST | `/verify-otp` | Public | Confirm the emailed code; activates the account and logs in |
| POST | `/resend-otp` | Public | Resend a fresh OTP (rate-limited) |
| POST | `/login` | Public | Email/password login |
| POST | `/logout` | Any | Clears the auth cookie |
| GET | `/me` | Any | Current user's profile |
| PATCH | `/me` | Any | Update own profile fields |
| POST | `/change-password` | Any | Change own password |

### Users — `/api/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | List/search students |
| POST | `/` | Admin | Create a user directly (pre-verified) |
| POST | `/bulk-import` | Admin | CSV bulk student import |
| GET | `/:id` | Admin | Get one user |
| GET | `/:id/activity` | Admin | Full activity picture: attendance history, approved tasks, ledger entries |
| PATCH | `/:id` | Admin | Update a user |
| DELETE | `/:id` | Admin | Deactivate a user |

### Tasks — `/api/tasks`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Any | List tasks (students see only what's assigned to them) |
| POST | `/` | Admin | Create/publish a task |
| GET | `/:id` | Any | Task detail |
| PATCH | `/:id` | Admin | Edit a task |
| DELETE | `/:id` | Admin | Archive a task |
| GET | `/:id/submissions` | Admin | Review queue for one task |

### Submissions — `/api/submissions`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/gallery` | Any | Approved photo proofs, paginated, filterable by category |
| POST | `/tasks/:taskId` | Student | Submit proof (file/link + remarks) for a task |
| PATCH | `/:id/review` | Admin | Approve / reject / request resubmission |
| GET | `/me/completed` | Student | Own approved submission history |

### Events — `/api/events`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Any | List events |
| GET | `/:id` | Any | Event detail (backs the "scan to join" landing page) |
| POST | `/` | Admin | Create an event |
| PATCH | `/:id` | Admin | Edit an event |
| POST | `/:id/register` | Student | Register interest |
| POST | `/:id/attendance/open` | Admin | Open the attendance window |
| POST | `/:id/attendance/close` | Admin | Close the attendance window |
| POST | `/:id/attendance/checkin` | Student | Check in using the event's ID/QR |
| POST | `/:id/attendance/manual` | Admin | Manually mark a student present |
| GET | `/:id/attendance` | Admin | Attendance list for one event |

### Dashboard & leaderboard — `/api/dashboard`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin` | Admin | Admin overview stats + charts |
| GET | `/student` | Student | Student progress summary |
| GET | `/leaderboard` | Any | Ranked leaderboard, filterable by branch/year |
| GET | `/passport` | Student | Category/milestone "stamp" progress |

### Certificates — `/api/certificates`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/verify/:certificateId` | **Public** | Verify a certificate is genuine — no login |
| POST | `/issue/:studentId` | Admin | Issue a certificate to an eligible student |
| GET | `/me` | Student | Own certificate |

### Announcements — `/api/announcements`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Any | List active announcements |
| GET | `/unread-count` | Any | Unread count for the sidebar badge |
| POST | `/` | Admin | Publish an announcement (broadcasts live) |
| PATCH | `/:id` | Admin | Edit |
| DELETE | `/:id` | Admin | Delete |
| POST | `/:id/read` | Any | Mark read |

### Chatbot — `/api/chatbot`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ask` | Any | Ask NSS Saathi a question |
| GET | `/history` | Any | Own conversation history |
| DELETE | `/history` | Any | Clear own conversation |
| GET | `/greeting` | Any | Proactive, data-driven opening line |
| POST | `/messages/:messageId/feedback` | Any | Thumbs up/down on a reply |
| GET | `/faqs` | Admin | List FAQ knowledge base |
| POST | `/faqs` | Admin | Add an FAQ |
| DELETE | `/faqs/:id` | Admin | Remove an FAQ |
| GET | `/unanswered` | Admin | Questions the bot couldn't answer, ranked by frequency |
| POST | `/unanswered/:id/resolve` | Admin | Mark a gap resolved |

### Responsibilities — `/api/responsibilities`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Any | List responsibilities |
| POST | `/` | Admin | Create — optionally pre-assigned, else left open to claim |
| POST | `/:id/claim` | Student | Self-claim an open responsibility |
| POST | `/:id/complete` | Owner or Admin | Mark complete |
| PATCH | `/:id` | Admin | Edit details |
| DELETE | `/:id` | Admin | Delete |

### Ideas — `/api/ideas`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Any | List ideas (students see only their own; admin sees all) |
| POST | `/` | Student | Submit an idea |
| PATCH | `/:id/status` | Admin | Mark reviewed/implemented, with an optional note |
| DELETE | `/:id` | Owner or Admin | Delete |

### Reports & notifications
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/reports/nss-summary` | Admin | Download the official `.xlsx` activity report |
| GET | `/api/notifications` | Any | Own notifications |
| PATCH | `/api/notifications/:id/read` | Any | Mark one read |
| PATCH | `/api/notifications/read-all` | Any | Mark all read |

### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness check |

---
