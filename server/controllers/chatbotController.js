const KnowledgeBase = require('../models/KnowledgeBase');
const ChatMessage = require('../models/ChatMessage');
const UnansweredQuery = require('../models/UnansweredQuery');
const Submission = require('../models/Submission');
const { generateAnswer, runAgentTurn, getToolCapableProvider } = require('../utils/llmClient');

const REQUIRED_HOURS = () => Number(process.env.REQUIRED_NSS_HOURS || 120);
const HISTORY_TURNS = 10; // messages (not pairs) re-sent as context — keeps token usage predictable

// Phrases that signal the model itself wasn't confident, even when it did
// produce an answer — these get logged as "low_confidence" gaps alongside
// the harder "no FAQ matched at all" case, so the admin sees both flavors
// of "the bot didn't really know this."
const UNCERTAINTY_MARKERS = ["i'm not certain", 'not sure', "don't have", 'check with your nss coordinator', 'contact your nss coordinator'];

function looksUncertain(answer) {
  const lower = answer.toLowerCase();
  return UNCERTAINTY_MARKERS.some((m) => lower.includes(m));
}

function personalizedAnswer(question, user) {
  const q = question.toLowerCase();
  if (!user || user.role !== 'student') return null;

  if (/(how many|remaining|left|need).*(hour)/.test(q) || /(hour).*(left|remaining|need)/.test(q)) {
    const remaining = Math.max(0, REQUIRED_HOURS() - user.totalHours);
    return remaining === 0
      ? `You've already completed your required ${REQUIRED_HOURS()} hours (currently at ${user.totalHours}). You're certificate-eligible!`
      : `You have ${user.totalHours} of ${REQUIRED_HOURS()} required hours logged — ${remaining} hours to go.`;
  }
  if (/(my points|how many points)/.test(q)) {
    return `You currently have ${user.totalPoints} points.`;
  }
  if (/(certificate).*(eligible|ready|status)/.test(q)) {
    return user.totalHours >= REQUIRED_HOURS()
      ? 'You are certificate-eligible. Ask your NSS coordinator to issue it, or check the Certificate page.'
      : `Not yet — you need ${REQUIRED_HOURS() - user.totalHours} more hours before a certificate can be issued.`;
  }
  return null;
}

async function retrieveFaqs(question, limit = 3) {
  let results = await KnowledgeBase.find(
    { $text: { $search: question } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);

  if (results.length === 0) {
    const words = question.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const all = await KnowledgeBase.find({});
    results = all
      .map((doc) => {
        const hay = `${doc.question} ${doc.answer} ${doc.keywords.join(' ')}`.toLowerCase();
        const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
        return { doc, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.doc);
  }
  return results;
}

// Fire-and-forget logging — never let a logging failure break the actual
// chat response the student is waiting on.
function logUnanswered(question, userId, source) {
  UnansweredQuery.create({ question, askedBy: userId, source }).catch((err) =>
    console.error('Failed to log unanswered query:', err.message)
  );
}

exports.ask = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question is required.' });
    }

    // Save the user's turn immediately so history is complete even if
    // generation fails partway through.
    await ChatMessage.create({ user: req.user._id, role: 'user', content: question });

    const respond = async (answer, source, toolsUsed = []) => {
      const saved = await ChatMessage.create({ user: req.user._id, role: 'assistant', content: answer, toolsUsed });

      if (source === 'none') {
        logUnanswered(question, req.user._id, 'none');
      } else if (looksUncertain(answer)) {
        logUnanswered(question, req.user._id, 'low_confidence');
      }

      return res.json({ success: true, answer, source, toolsUsed, messageId: saved._id });
    };

    // Fast path for the handful of questions that need the student's own
    // live numbers and nothing else — skips FAQ/LLM round trips entirely.
    const direct = personalizedAnswer(question, req.user);
    if (direct && !getToolCapableProvider()) {
      return respond(direct, 'personalized');
    }

    const faqs = await retrieveFaqs(question);
    const faqContext = faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');

    // Pull recent turns (oldest first) as conversation memory, excluding the
    // message we just saved above.
    const recent = await ChatMessage.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(HISTORY_TURNS + 1)
      .then((docs) => docs.reverse().slice(0, -1));
    const history = recent.map((m) => ({ role: m.role, content: m.content }));

    if (getToolCapableProvider()) {
      const agentResult = await runAgentTurn({ user: req.user, question, history, faqContext });
      if (agentResult?.answer) {
        return respond(agentResult.answer, 'agent', agentResult.toolsUsed);
      }
    }

    if (faqs.length === 0 && !direct) {
      return respond(
        "I don't have an answer for that yet — please check with your NSS coordinator, or try rephrasing.",
        'none'
      );
    }
    if (direct) return respond(direct, 'personalized');

    let studentContext;
    if (req.user.role === 'student') {
      const approved = await Submission.countDocuments({ student: req.user._id, status: 'approved' });
      studentContext = `Name: ${req.user.name}, Hours: ${req.user.totalHours}/${REQUIRED_HOURS()}, Points: ${req.user.totalPoints}, Approved tasks: ${approved}`;
    }

    const llmAnswer = await generateAnswer({ question, context: faqContext, studentContext });
    return respond(llmAnswer || faqs[0]?.answer || "I'm not certain — please check with your NSS coordinator.", llmAnswer ? 'llm' : 'faq');
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const messages = await ChatMessage.find({ user: req.user._id }).sort({ createdAt: 1 }).limit(50);
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
};

exports.clearHistory = async (req, res, next) => {
  try {
    await ChatMessage.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'Conversation cleared.' });
  } catch (err) {
    next(err);
  }
};

// Thumbs up/down on any assistant reply — a poor rating is a strong signal
// worth reviewing even if the FAQ retrieval technically "found something."
exports.giveFeedback = async (req, res, next) => {
  try {
    const { rating } = req.body; // 'up' | 'down'
    if (!['up', 'down'].includes(rating)) {
      return res.status(400).json({ success: false, message: 'rating must be "up" or "down".' });
    }
    const message = await ChatMessage.findOneAndUpdate(
      { _id: req.params.messageId, user: req.user._id, role: 'assistant' },
      { feedback: rating },
      { new: true }
    );
    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

    // A thumbs-down is treated the same as an unanswered question — it's
    // exactly the kind of gap the admin FAQ panel should surface.
    if (rating === 'down') {
      const priorUserMsg = await ChatMessage.findOne({
        user: req.user._id,
        role: 'user',
        createdAt: { $lt: message.createdAt },
      }).sort({ createdAt: -1 });
      if (priorUserMsg) logUnanswered(priorUserMsg.content, req.user._id, 'low_confidence');
    }

    res.json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

// A proactive, personalized opening line — computed from the same tools the
// agent itself uses, so it's never out of sync with reality. This is the
// "alive" touch: the bot greets you with something relevant before you even
// ask anything.
exports.greeting = async (req, res, next) => {
  try {
    const { runTool } = require('../utils/chatTools');
    const firstName = req.user.name.split(' ')[0];

    if (req.user.role === 'admin') {
      const overview = await runTool('get_admin_overview', req.user, {});
      const text =
        overview.pendingReviews > 0
          ? `Welcome back, ${firstName}. You have ${overview.pendingReviews} submission${overview.pendingReviews === 1 ? '' : 's'} waiting for review across ${overview.activeTasks} active task${overview.activeTasks === 1 ? '' : 's'}.`
          : `Welcome back, ${firstName}. Review queue is clear — ${overview.totalStudents} active students, ${overview.upcomingEvents} upcoming event(s).`;
      return res.json({ success: true, greeting: text });
    }

    const stats = await runTool('get_my_stats', req.user, {});
    let text = `Hey ${firstName}! You're at ${stats.totalHours}/${stats.requiredHours} hours (${stats.progressPercent}%).`;
    if (stats.certificateEligible) {
      text += " You're certificate-eligible — check the Certificate page!";
    } else if (stats.pendingSubmissions > 0) {
      text += ` ${stats.pendingSubmissions} submission${stats.pendingSubmissions === 1 ? ' is' : 's are'} awaiting review.`;
    } else {
      text += ' Ask me about upcoming tasks or events anytime.';
    }
    res.json({ success: true, greeting: text });
  } catch (err) {
    next(err);
  }
};

exports.listFaqs = async (req, res, next) => {
  try {
    const faqs = await KnowledgeBase.find().sort({ category: 1 });
    res.json({ success: true, faqs });
  } catch (err) {
    next(err);
  }
};

exports.createFaq = async (req, res, next) => {
  try {
    const faq = await KnowledgeBase.create(req.body);
    res.status(201).json({ success: true, faq });
  } catch (err) {
    next(err);
  }
};

exports.deleteFaq = async (req, res, next) => {
  try {
    await KnowledgeBase.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Admin view into the self-improvement loop: what has the bot been unable
// to answer well, ranked by how often it comes up.
exports.listUnanswered = async (req, res, next) => {
  try {
    const grouped = await UnansweredQuery.aggregate([
      { $match: { resolved: false } },
      {
        $group: {
          _id: { $toLower: '$question' },
          question: { $first: '$question' },
          count: { $sum: 1 },
          lastAsked: { $max: '$createdAt' },
          ids: { $push: '$_id' },
        },
      },
      { $sort: { count: -1, lastAsked: -1 } },
      { $limit: 50 },
    ]);
    res.json({ success: true, unanswered: grouped });
  } catch (err) {
    next(err);
  }
};

exports.resolveUnanswered = async (req, res, next) => {
  try {
    // Accepts either a single id (:id) or is called after adding a matching
    // FAQ — resolves every logged instance of that same question text.
    const target = await UnansweredQuery.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'Not found.' });
    await UnansweredQuery.updateMany({ question: target.question }, { resolved: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};