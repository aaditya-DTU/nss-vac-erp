const Task = require('../models/Task');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Announcement = require('../models/Announcement');

const REQUIRED_HOURS = () => Number(process.env.REQUIRED_NSS_HOURS || 120);

// Every tool executor takes (user, args) and returns a plain JS object —
// it gets JSON.stringify'd straight into the tool-result message the model
// sees next. Kept read-only on purpose: the agent can look things up, but
// state-changing actions (submitting proof, registering for events) still
// go through the normal UI so there's always a deliberate human click
// behind anything that awards hours or locks a submission.

async function getMyStats(user) {
  const [pending, approved] = await Promise.all([
    Submission.countDocuments({ student: user._id, status: 'pending' }),
    Submission.countDocuments({ student: user._id, status: 'approved' }),
  ]);
  const required = REQUIRED_HOURS();
  return {
    totalHours: user.totalHours,
    totalPoints: user.totalPoints,
    requiredHours: required,
    hoursRemaining: Math.max(0, required - user.totalHours),
    progressPercent: Math.min(100, Math.round((user.totalHours / required) * 100)),
    certificateEligible: user.totalHours >= required,
    pendingSubmissions: pending,
    approvedSubmissions: approved,
  };
}

async function getMyTasks(user, args = {}) {
  const query = { status: 'published' };
  if (args.only_pending_deadline) query.deadline = { $gte: new Date() };

  const tasks = await Task.find(query).sort({ deadline: 1 }).limit(15);
  const subs = await Submission.find({ student: user._id, task: { $in: tasks.map((t) => t._id) } });
  const subMap = Object.fromEntries(subs.map((s) => [String(s.task), s.status]));

  return {
    tasks: tasks.map((t) => ({
      title: t.title,
      category: t.category,
      points: t.points,
      hoursWorth: t.hoursWorth,
      deadline: t.deadline,
      myStatus: subMap[String(t._id)] || 'not_started',
    })),
  };
}

async function getLeaderboardRank(user) {
  const above = await User.countDocuments({ role: 'student', isActive: true, totalPoints: { $gt: user.totalPoints } });
  const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
  return { rank: above + 1, totalStudents, totalPoints: user.totalPoints };
}

async function getUpcomingEvents() {
  const events = await Event.find({ status: { $in: ['upcoming', 'ongoing'] } }).sort({ startTime: 1 }).limit(10);
  return {
    events: events.map((e) => ({
      title: e.title,
      location: e.location,
      startTime: e.startTime,
      hoursWorth: e.hoursWorth,
      pointsWorth: e.pointsWorth,
    })),
  };
}

async function getCertificateStatus(user) {
  const cert = await Certificate.findOne({ student: user._id });
  const required = REQUIRED_HOURS();
  if (cert) return { issued: true, certificateId: cert.certificateId, issuedAt: cert.issuedAt };
  return { issued: false, hoursRemaining: Math.max(0, required - user.totalHours) };
}

// Admin-facing tool — deliberately read-only summary data, not student PII lists.
async function getAdminOverview() {
  const [totalStudents, pendingReviews, activeTasks, upcomingEvents] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    Submission.countDocuments({ status: 'pending' }),
    Task.countDocuments({ status: 'published' }),
    Event.countDocuments({ status: { $in: ['upcoming', 'ongoing'] } }),
  ]);
  return { totalStudents, pendingReviews, activeTasks, upcomingEvents };
}

// Shared by both roles — lets "what's new" / "anything I missed" questions
// get answered from the real announcement feed instead of the bot having
// no idea announcements even exist.
async function getRecentAnnouncements() {
  const now = new Date();
  const announcements = await Announcement.find({
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
  })
    .sort({ pinned: -1, createdAt: -1 })
    .limit(5);

  return {
    announcements: announcements.map((a) => ({
      title: a.title,
      category: a.category,
      content: a.content,
      pinned: a.pinned,
      postedAt: a.createdAt,
    })),
  };
}

const studentToolSchemas = [
  {
    type: 'function',
    function: {
      name: 'get_my_stats',
      description: "Get the student's own NSS hours, points, progress percentage, and certificate eligibility.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_tasks',
      description: 'List currently published NSS tasks and whether the student has submitted/completed each one.',
      parameters: {
        type: 'object',
        properties: {
          only_pending_deadline: { type: 'boolean', description: 'If true, only include tasks whose deadline has not passed yet.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_leaderboard_rank',
      description: "Get the student's current leaderboard rank and total points.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_events',
      description: 'List upcoming or ongoing NSS events/camps.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_certificate_status',
      description: "Check whether the student's NSS completion certificate has been issued.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_announcements',
      description: 'Get the most recent NSS announcements/updates posted by the coordinator (pinned ones first).',
      parameters: { type: 'object', properties: {} },
    },
  },
];

const adminToolSchemas = [
  {
    type: 'function',
    function: {
      name: 'get_admin_overview',
      description: 'Get overview counts: total active students, pending submission reviews, active tasks, upcoming events.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_events',
      description: 'List upcoming or ongoing NSS events/camps.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_announcements',
      description: 'Get the most recent NSS announcements posted (pinned ones first).',
      parameters: { type: 'object', properties: {} },
    },
  },
];

const executors = {
  get_my_stats: getMyStats,
  get_my_tasks: getMyTasks,
  get_leaderboard_rank: getLeaderboardRank,
  get_upcoming_events: getUpcomingEvents,
  get_certificate_status: getCertificateStatus,
  get_admin_overview: getAdminOverview,
  get_recent_announcements: getRecentAnnouncements,
};

function getToolSchemasForRole(role) {
  return role === 'admin' ? adminToolSchemas : studentToolSchemas;
}

async function runTool(name, user, args) {
  const fn = executors[name];
  if (!fn) return { error: `Unknown tool: ${name}` };
  try {
    return await fn(user, args);
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { getToolSchemasForRole, runTool };