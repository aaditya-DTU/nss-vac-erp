# NSS VAC ERP

A full-stack ERP platform for managing **NSS (National Service Scheme) VAC** volunteer activities — built for DTU. It handles student onboarding, task and event management, geofenced QR attendance, proof submissions, certificates, an AI chatbot, and admin reporting, all in one place.

**Live repo:** [aaditya-DTU/nss-vac-erp](https://github.com/aaditya-DTU/nss-vac-erp)

---

## Tech Stack

**Backend**
- Node.js / Express 4
- MongoDB with Mongoose 8
- JWT auth via httpOnly cookies
- Socket.io (real-time notifications)
- Cloudinary (file/image storage)
- Nodemailer (email — OTP, credentials, reminders)
- node-cron (scheduled deadline reminders)
- Groq / OpenAI / Gemini (pluggable AI provider for the chatbot)
- PDFKit + QRCode (certificate generation)
- ExcelJS + csv-parse (bulk import/export)
- Jest + Supertest + MongoDB Memory Server (testing)

**Frontend**
- React 18 + Vite
- React Router 6
- Tailwind CSS
- Axios, Socket.io-client
- Recharts (analytics/dashboards)
- html5-qrcode / qrcode.react (QR attendance)
- react-hot-toast

---

## Features

- 🔐 **Auth** — email OTP verification, JWT (httpOnly cookie) sessions, forgot/reset password flow
- 👥 **Role-based access control** — `admin` and `student` roles enforced at the route level
- ✅ **Task management** — create tasks, submit proof (file upload via Cloudinary), admin review
- 📅 **Events** — event creation, registration, and **rotating geofenced QR attendance** to prevent proxy check-ins
- 🏅 **Responsibilities** — claimable duties with completion tracking
- 📜 **Certificates** — cryptographically issued, publicly verifiable via a unique certificate ID
- 🔔 **Real-time notifications** — Socket.io-backed, with an unread-count context and scheduled deadline reminders
- 📣 **Announcements** — admin broadcast with per-user read tracking
- 💡 **Ideas board** — student idea submission with upvoting and admin status management
- 🤖 **AI chatbot** — FAQ-grounded assistant with feedback capture and an "unanswered questions" admin queue
- 📊 **Dashboards & leaderboard** — role-specific admin/student views
- 🧾 **Reports** — exportable NSS summary reports (admin only)

---

## Project Structure

```
nss-vac-erp/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── hooks/          # Custom hooks (e.g. useEvents, useAnnouncements)
│   │   └── ...
│   └── vite.config.js
└── server/                 # Express + MongoDB backend
    ├── app.js              # Express app (routes, middleware) — no side effects, testable
    ├── server.js           # HTTP + Socket.io bootstrap, DB connect, cron jobs
    ├── config/              # Mongo + Cloudinary config
    ├── controllers/
    ├── middleware/          # auth (JWT), rbac (role authorize), upload, errorHandler
    ├── models/
    ├── routes/
    ├── jobs/                # node-cron deadline reminders
    ├── utils/
    └── tests/               # Jest + Supertest + mongodb-memory-server
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB instance (local or Atlas)
- A Cloudinary account (file storage)
- SMTP credentials (email/OTP delivery)
- An API key for at least one AI provider (Groq, OpenAI, or Gemini) if you want the chatbot to work

### 1. Clone the repo
```bash
git clone https://github.com/aaditya-DTU/nss-vac-erp.git
cd nss-vac-erp
```

### 2. Backend setup
```bash
cd server
npm install
```
```bash
npm run seed   # optional: seeds default chatbot FAQs
npm run dev    # starts with nodemon on PORT
```

### 3. Frontend setup
```bash
cd ../client
npm install
npm run dev
```

The client expects the API at the URL configured in its axios instance (defaults to `http://localhost:5000`), and the server expects the frontend origin in `CLIENT_URL` (defaults to `http://localhost:5173`) since cookies are sent with `credentials: true`.

### 4. Run backend tests
```bash
cd server
npm test
```
Uses `mongodb-memory-server`, so no real database connection is needed for tests.

---

## API Reference

Base URL: `/api`

All endpoints except `/api/health`, `/api/auth/*`, and `GET /api/certificates/verify/:certificateId` require authentication via an httpOnly JWT cookie (`protect` middleware). Endpoints marked **[admin]** or **[student]** are additionally role-gated via `authorize(...)`.

### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Basic API liveness check |

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new account (domain-restricted via `ALLOWED_EMAIL_DOMAIN`) |
| POST | `/verify-otp` | Public | Verify the registration OTP |
| POST | `/resend-otp` | Public | Resend registration OTP |
| POST | `/login` | Public | Log in, sets an httpOnly session cookie |
| POST | `/logout` | Protected | Clear the session cookie |
| GET | `/me` | Protected | Get the current user's profile |
| PATCH | `/me` | Protected | Update the current user's profile |
| POST | `/change-password` | Protected | Change password (requires current password) |
| POST | `/forgot-password` | Public | Request a password-reset OTP |
| POST | `/verify-reset-otp` | Public | Verify a password-reset OTP |
| POST | `/reset-password` | Public | Set a new password after OTP verification |

### Users — `/api/users` [admin only]
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List all users |
| POST | `/` | Create a user |
| GET | `/:id` | Get a user by ID |
| GET | `/:id/activity` | Get a student's activity log |
| PATCH | `/:id` | Update a user |
| DELETE | `/:id` | Delete a user |

### Tasks — `/api/tasks`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Protected | List tasks |
| POST | `/` | Admin | Create a task |
| GET | `/:id` | Protected | Get task details |
| PATCH | `/:id` | Admin | Update a task |
| DELETE | `/:id` | Admin | Delete a task |
| GET | `/:id/submissions` | Admin | List submissions for a task |

### Submissions — `/api/submissions`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/gallery` | Protected | Public gallery of approved submissions |
| POST | `/tasks/:taskId` | Student | Submit proof for a task (`multipart/form-data`, field `proof`) |
| PATCH | `/:id/review` | Admin | Approve/reject a submission |
| GET | `/me/completed` | Student | Get the current student's completed tasks |

### Events — `/api/events`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Protected | List events |
| GET | `/:id` | Protected | Get event details |
| POST | `/` | Admin | Create an event |
| PATCH | `/:id` | Admin | Update an event |
| POST | `/:id/register` | Student | Register for an event |
| POST | `/:id/attendance/open` | Admin | Open the geofenced QR attendance window |
| POST | `/:id/attendance/close` | Admin | Close the attendance window |
| POST | `/:id/attendance/checkin` | Student | Check in via rotating QR + geolocation |
| POST | `/:id/attendance/manual` | Admin | Manually mark attendance |
| GET | `/:id/attendance` | Admin | View the attendance list |

### Dashboard — `/api/dashboard`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/admin` | Admin | Admin dashboard summary |
| GET | `/student` | Student | Student dashboard summary |
| GET | `/leaderboard` | Protected | NSS hours leaderboard |

### Certificates — `/api/certificates`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/verify/:certificateId` | Public | Publicly verify a certificate's authenticity |
| POST | `/issue/:studentId` | Admin | Issue a certificate to a student |
| GET | `/me` | Student | Get the current student's certificate |

### Notifications — `/api/notifications`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List the current user's notifications |
| PATCH | `/:id/read` | Mark one notification as read |
| PATCH | `/read-all` | Mark all notifications as read |

### Chatbot — `/api/chatbot`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/ask` | Protected | Ask the AI assistant a question |
| GET | `/history` | Protected | Get chat history |
| DELETE | `/history` | Protected | Clear chat history |
| GET | `/greeting` | Protected | Get a contextual greeting message |
| POST | `/messages/:messageId/feedback` | Protected | Rate a chatbot response |
| GET | `/faqs` | Admin | List FAQs powering the chatbot |
| POST | `/faqs` | Admin | Add an FAQ |
| DELETE | `/faqs/:id` | Admin | Remove an FAQ |
| GET | `/unanswered` | Admin | List questions the bot couldn't answer |
| POST | `/unanswered/:id/resolve` | Admin | Resolve/convert an unanswered question |

### Reports — `/api/reports`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/nss-summary` | Admin | Export the overall NSS summary report |

### Announcements — `/api/announcements`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Protected | List announcements |
| GET | `/unread-count` | Protected | Get the current user's unread announcement count |
| POST | `/` | Admin | Create an announcement |
| PATCH | `/:id` | Admin | Update an announcement |
| DELETE | `/:id` | Admin | Delete an announcement |
| POST | `/:id/read` | Protected | Mark an announcement as read |

### Responsibilities — `/api/responsibilities`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Protected | List responsibilities |
| POST | `/` | Admin | Create a responsibility |
| POST | `/:id/claim` | Student | Claim a responsibility |
| POST | `/:id/complete` | Protected | Mark a responsibility complete |
| PATCH | `/:id` | Admin | Update a responsibility |
| DELETE | `/:id` | Admin | Delete a responsibility |

### Ideas — `/api/ideas`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Protected | List submitted ideas |
| POST | `/` | Student | Submit an idea |
| POST | `/:id/upvote` | Protected | Toggle an upvote on an idea |
| PATCH | `/:id/status` | Admin | Update an idea's status |
| DELETE | `/:id` | Protected | Delete an idea |

---

## Real-time Events (Socket.io)

The server authenticates socket connections using the same httpOnly JWT cookie as REST requests (no token is exposed to client JS). On connection, each user is joined to a private room (`user:<id>`) used for pushing real-time notifications and deadline reminders.

---

## Security Notes

- Passwords hashed with bcrypt; sessions via httpOnly, credentialed JWT cookies (no tokens stored in localStorage).
- `helmet`, `cors` (locked to `CLIENT_URL`), and `express-rate-limit` (500 req / 15 min per IP on `/api`) are applied globally.
- Role-based route protection via `middleware/rbac.js`.
- QR attendance uses a rotating token + geofencing to prevent proxy check-ins.
- Certificates are issued with a unique, publicly verifiable ID.
