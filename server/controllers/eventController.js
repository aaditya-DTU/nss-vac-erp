const crypto = require('crypto');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const { awardCredit, notify } = require('../utils/ledger');

exports.createEvent = async (req, res, next) => {
  try {
    const event = await Event.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'location', 'startTime', 'endTime', 'hoursWorth', 'pointsWorth'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

exports.listEvents = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const events = await Event.find(query).sort({ startTime: -1 }).populate('createdBy', 'name');
    res.json({ success: true, events });
  } catch (err) {
    next(err);
  }
};

exports.registerForEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { registeredStudents: req.user._id } },
      { new: true }
    );
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};


exports.openAttendance = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { isAttendanceOpen: true, status: 'ongoing' },
      { new: true }
    );
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

exports.closeAttendance = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, { isAttendanceOpen: false, status: 'completed' }, { new: true });
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// Student scans the QR (or the frontend decodes it) and posts the code here.
exports.checkIn = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { code } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    if (!event.isAttendanceOpen) {
      const now = new Date();
      let hint = 'Ask your coordinator to open attendance from the Events page.';
      if (now < new Date(event.startTime)) {
        hint = "This event hasn't started yet — attendance opens once your coordinator starts it on-site.";
      } else if (now > new Date(event.endTime)) {
        hint = 'This event has already ended and attendance is closed.';
      }
      return res.status(400).json({ success: false, message: `Attendance isn't open right now. ${hint}` });
    }

    if (code !== String(event._id)) {
      return res.status(400).json({
        success: false,
        message: 'That ID doesn\'t match this event. Double-check the ID or QR shown on your coordinator\'s screen.',
      });
    }

    const existing = await Attendance.findOne({ event: event._id, student: req.user._id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already checked in for this event.' });
    }

    const attendance = await Attendance.create({ event: event._id, student: req.user._id, method: 'qr' });

    await awardCredit({
      studentId: req.user._id,
      source: 'event',
      refId: event._id,
      points: event.pointsWorth,
      hours: event.hoursWorth,
      note: `Attended: ${event.title}`,
      io,
    });

    res.status(201).json({ success: true, attendance });
  } catch (err) {
    next(err);
  }
};

exports.manualCheckIn = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const existing = await Attendance.findOne({ event: event._id, student: req.body.studentId });
    if (existing) return res.status(409).json({ success: false, message: 'Attendance already marked.' });

    const attendance = await Attendance.create({
      event: event._id,
      student: req.body.studentId,
      method: 'manual',
      markedBy: req.user._id,
    });

    await awardCredit({
      studentId: req.body.studentId,
      source: 'event',
      refId: event._id,
      points: event.pointsWorth,
      hours: event.hoursWorth,
      note: `Attended (manual): ${event.title}`,
      awardedBy: req.user._id,
      io,
    });

    res.status(201).json({ success: true, attendance });
  } catch (err) {
    next(err);
  }
};

exports.eventAttendanceList = async (req, res, next) => {
  try {
    const list = await Attendance.find({ event: req.params.id }).populate('student', 'name rollNo branch year');
    res.json({ success: true, attendance: list });
  } catch (err) {
    next(err);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};
