const Idea = require('../models/Idea');
const { notify } = require('../utils/ledger');

exports.submitIdea = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and description are required.' });
    }
    const idea = await Idea.create({ student: req.user._id, title, content });
    res.status(201).json({ success: true, idea });
  } catch (err) {
    next(err);
  }
};

// Everyone (students and admins) sees the full board now — upvoting only
// makes sense if students can see and rank ideas beyond their own. Sorted
// non-increasing by upvoteCount so the most-supported ideas float to the
// top; createdAt desc as the tiebreaker for equal vote counts.
exports.listIdeas = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const ideas = await Idea.find(query)
      .sort({ upvoteCount: -1, createdAt: -1 })
      .populate('student', 'name rollNo branch year');
    res.json({ success: true, ideas });
  } catch (err) {
    next(err);
  }
};

// Toggle: upvote if the user hasn't already, remove their upvote if they
// have. $addToSet/$pull keep this atomic — no read-then-write race if two
// requests land close together.
exports.toggleUpvote = async (req, res, next) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ success: false, message: 'Idea not found.' });

    const alreadyUpvoted = idea.upvotes.some((u) => String(u) === String(req.user._id));
    const update = alreadyUpvoted
      ? { $pull: { upvotes: req.user._id }, $inc: { upvoteCount: -1 } }
      : { $addToSet: { upvotes: req.user._id }, $inc: { upvoteCount: 1 } };

    const updated = await Idea.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, idea: updated, upvoted: !alreadyUpvoted });
  } catch (err) {
    next(err);
  }
};

exports.updateIdeaStatus = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { status, adminNote } = req.body;
    if (!['new', 'reviewed', 'implemented'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const idea = await Idea.findByIdAndUpdate(req.params.id, { status, adminNote }, { new: true });
    if (!idea) return res.status(404).json({ success: false, message: 'Idea not found.' });

    await notify({
      userId: idea.student,
      title: 'Your idea was reviewed',
      message: `"${idea.title}" was marked as ${status}${adminNote ? `: ${adminNote}` : '.'}`,
      type: 'general',
      link: '/ideas',
      io,
    });

    res.json({ success: true, idea });
  } catch (err) {
    next(err);
  }
};

exports.deleteIdea = async (req, res, next) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ success: false, message: 'Idea not found.' });
    if (req.user.role !== 'admin' && String(idea.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own ideas.' });
    }
    await idea.deleteOne();
    res.json({ success: true, message: 'Idea deleted.' });
  } catch (err) {
    next(err);
  }
};