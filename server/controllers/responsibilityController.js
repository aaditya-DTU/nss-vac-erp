const Responsibility = require('../models/Responsibility');
const { notify } = require('../utils/ledger');

exports.createResponsibility = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { title, description, category, assignedTo, deadline } = req.body;

    const responsibility = await Responsibility.create({
      title,
      description,
      category,
      deadline: deadline || undefined,
      createdBy: req.user._id,
      // Directly assigning at creation skips the "open, anyone can claim"
      // state — it's already spoken for.
      assignedTo: assignedTo || null,
      status: assignedTo ? 'claimed' : 'open',
      claimedAt: assignedTo ? new Date() : undefined,
    });

    if (assignedTo) {
      await notify({
        userId: assignedTo,
        title: 'New responsibility assigned',
        message: `You've been assigned: "${title}"`,
        type: 'general',
        link: '/responsibilities',
        io,
      });
    }

    res.status(201).json({ success: true, responsibility });
  } catch (err) {
    next(err);
  }
};

exports.listResponsibilities = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const responsibilities = await Responsibility.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name rollNo branch year');

    res.json({ success: true, responsibilities });
  } catch (err) {
    next(err);
  }
};

// A student picking an open responsibility for themselves — the "choose"
// half of "allot/choose". Guarded so two students can't race for the same
// one: the update only succeeds if it's still open at the moment of write.
exports.claimResponsibility = async (req, res, next) => {
  try {
    const responsibility = await Responsibility.findOneAndUpdate(
      { _id: req.params.id, status: 'open' },
      { assignedTo: req.user._id, status: 'claimed', claimedAt: new Date() },
      { new: true }
    );
    if (!responsibility) {
      return res.status(409).json({ success: false, message: 'This responsibility has already been claimed by someone else.' });
    }
    res.json({ success: true, responsibility });
  } catch (err) {
    next(err);
  }
};

exports.updateResponsibility = async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'category', 'deadline'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const responsibility = await Responsibility.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!responsibility) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, responsibility });
  } catch (err) {
    next(err);
  }
};

// Either the assigned student or an admin can mark it done.
exports.completeResponsibility = async (req, res, next) => {
  try {
    const responsibility = await Responsibility.findById(req.params.id);
    if (!responsibility) return res.status(404).json({ success: false, message: 'Not found.' });

    const isOwner = responsibility.assignedTo && String(responsibility.assignedTo) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the assigned student or an admin can mark this complete.' });
    }

    responsibility.status = 'completed';
    responsibility.completedAt = new Date();
    await responsibility.save();
    res.json({ success: true, responsibility });
  } catch (err) {
    next(err);
  }
};

exports.deleteResponsibility = async (req, res, next) => {
  try {
    const responsibility = await Responsibility.findByIdAndDelete(req.params.id);
    if (!responsibility) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: 'Responsibility deleted.' });
  } catch (err) {
    next(err);
  }
};