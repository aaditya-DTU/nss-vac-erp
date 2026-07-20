const Task = require('../models/Task');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { notify } = require('../utils/ledger');

// Resolves a task's assignment scope into a concrete list of student _ids.
// Kept as one function so "who is this task for" is answered identically
// everywhere (creation notifications, dashboard counts, student task list).
async function resolveAudience(task) {
  const { scope, filter, studentIds } = task.assignedTo;
  if (scope === 'specific') return studentIds.map(String);
  if (scope === 'all') {
    const students = await User.find({ role: 'student', isActive: true }).select('_id');
    return students.map((s) => String(s._id));
  }
  const query = { role: 'student', isActive: true };
  if (filter?.year) query.year = filter.year;
  if (filter?.branch) query.branch = filter.branch;
  if (filter?.section) query.section = filter.section;
  const students = await User.find(query).select('_id');
  return students.map((s) => String(s._id));
}

exports.createTask = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const task = await Task.create({ ...req.body, createdBy: req.user._id });

    const audience = await resolveAudience(task);
    task.stats.assignedCount = audience.length;
    await task.save();

    // Fire-and-forget style notification fanout (kept sequential but cheap;
    // swap for a queue if the NSS unit grows past a few hundred students)
    await Promise.all(
      audience.map((studentId) =>
        notify({
          userId: studentId,
          title: 'New NSS task assigned',
          message: `"${task.title}" is due ${new Date(task.deadline).toLocaleDateString()}.`,
          type: 'task_assigned',
          link: `/tasks/${task._id}`,
          io,
        })
      )
    );

    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

exports.listTasks = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    // Students only ever see tasks that are actually in their audience.
    if (req.user.role === 'student') {
      query.status = query.status || 'published';
      query.$or = [
        { 'assignedTo.scope': 'all' },
        { 'assignedTo.scope': 'specific', 'assignedTo.studentIds': req.user._id },
        {
          'assignedTo.scope': 'filter',
          $and: [
            { $or: [{ 'assignedTo.filter.year': { $exists: false } }, { 'assignedTo.filter.year': req.user.year }] },
            { $or: [{ 'assignedTo.filter.branch': { $exists: false } }, { 'assignedTo.filter.branch': req.user.branch }] },
            { $or: [{ 'assignedTo.filter.section': { $exists: false } }, { 'assignedTo.filter.section': req.user.section }] },
          ],
        },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tasks, total] = await Promise.all([
      Task.find(query).sort({ deadline: 1 }).skip(skip).limit(Number(limit)).populate('createdBy', 'name'),
      Task.countDocuments(query),
    ]);

    // For students, attach their own submission status per task so the UI
    // doesn't need a second round trip per card.
    let submissionMap = {};
    if (req.user.role === 'student') {
      const subs = await Submission.find({ student: req.user._id, task: { $in: tasks.map((t) => t._id) } });
      submissionMap = Object.fromEntries(subs.map((s) => [String(s.task), s]));
    }

    const enriched = tasks.map((t) => ({
      ...t.toObject(),
      mySubmission: submissionMap[String(t._id)] || null,
    }));

    res.json({ success: true, tasks: enriched, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('createdBy', 'name email');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    let mySubmission = null;
    if (req.user.role === 'student') {
      mySubmission = await Submission.findOne({ task: task._id, student: req.user._id });
    }
    res.json({ success: true, task, mySubmission });
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    res.json({ success: true, message: 'Task archived.' });
  } catch (err) {
    next(err);
  }
};

// Task-centric view of all submissions for the review queue.
exports.getTaskSubmissions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { task: req.params.id };
    if (status) query.status = status;
    const submissions = await Submission.find(query)
      .populate('student', 'name rollNo branch year email')
      .populate({ path: 'flags.matchedSubmission', populate: { path: 'student', select: 'name rollNo' } });
    res.json({ success: true, submissions });
  } catch (err) {
    next(err);
  }
};
