const Announcement = require('../models/Announcement');
const User = require('../models/User');

exports.createAnnouncement = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { title, content, category, pinned, expiresAt } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      category: category || 'general',
      pinned: !!pinned,
      expiresAt: expiresAt || undefined,
      createdBy: req.user._id,
    });

    const populated = await announcement.populate('createdBy', 'name');

    // Broadcast to every connected socket (not a per-user notify like task
    // assignment) — an announcement is meant for everyone at once, so a
    // single io.emit is both simpler and cheaper than fanning out
    // individual Notification documents to every student.
    if (io) io.emit('announcement:new', populated);

    res.status(201).json({ success: true, announcement: populated });
  } catch (err) {
    next(err);
  }
};

exports.listAnnouncements = async (req, res, next) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
    })
      .sort({ pinned: -1, createdAt: -1 })
      .populate('createdBy', 'name')
      .limit(100);

    const withReadState = announcements.map((a) => ({
      ...a.toObject(),
      isRead: a.readBy.some((id) => String(id) === String(req.user._id)),
      readCount: a.readBy.length,
      readBy: undefined, // don't ship the full id list to students
    }));

    res.json({ success: true, announcements: withReadState });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await Announcement.updateOne({ _id: req.params.id }, { $addToSet: { readBy: req.user._id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.unreadCount = async (req, res, next) => {
  try {
    const now = new Date();
    const count = await Announcement.countDocuments({
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
      readBy: { $ne: req.user._id },
    });
    res.json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

exports.updateAnnouncement = async (req, res, next) => {
  try {
    const allowed = ['title', 'content', 'category', 'pinned', 'expiresAt'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const announcement = await Announcement.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found.' });
    res.json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found.' });
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    next(err);
  }
};
