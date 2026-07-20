const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Attendance = require('../models/Attendance');
const Submission = require('../models/Submission');
const PointsLedger = require('../models/PointsLedger');
const { parse } = require('csv-parse/sync');

// Admin-provisioned account creation (e.g. adding another NSS admin/teacher).
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, rollNo, branch, year, section } = req.body;
    const user = await User.create({ name, email, password, role: role || 'student', rollNo, branch, year, section, isVerified: true });
    await AuditLog.create({ actor: req.user._id, action: 'user.create', targetType: 'User', targetId: user._id });
    res.status(201).json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const { role, branch, year, section, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (branch) query.branch = branch;
    if (year) query.year = Number(year);
    if (section) query.section = section;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({ success: true, users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// The "attendance tracker" — one student's full activity picture for the
// admin: every event they checked into (with timing), every task they've
// had approved, and their running hours/points. Deliberately built by
// reading from the models that already exist (Attendance, Submission,
// PointsLedger) rather than a new schema — this data was always there,
// just never assembled into one view.
exports.getStudentActivity = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const [attendance, submissions, ledger] = await Promise.all([
      Attendance.find({ student: student._id }).populate('event', 'title location startTime endTime').sort({ checkedInAt: -1 }),
      Submission.find({ student: student._id, status: 'approved' }).populate('task', 'title category').sort({ reviewedAt: -1 }),
      PointsLedger.find({ student: student._id }).sort({ createdAt: -1 }).limit(100),
    ]);

    res.json({
      success: true,
      student: student.toSafeObject(),
      attendance,
      submissions,
      ledger,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const allowed = ['name', 'role', 'branch', 'year', 'section', 'isActive', 'rollNo', 'phone'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await AuditLog.create({ actor: req.user._id, action: 'user.update', targetType: 'User', targetId: user._id, meta: updates });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await AuditLog.create({ actor: req.user._id, action: 'user.deactivate', targetType: 'User', targetId: user._id });
    res.json({ success: true, message: 'Student account deactivated.' });
  } catch (err) {
    next(err);
  }
};

// Bulk-onboard an entire NSS batch from a CSV: name,email,password,rollNo,branch,year,section
exports.bulkImport = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'CSV file is required.' });

    const records = parse(req.file.buffer.toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true });

    const results = { created: 0, skipped: 0, errors: [] };
    for (const row of records) {
      try {
        if (!row.email || !row.name) {
          results.errors.push({ row, reason: 'Missing name or email' });
          continue;
        }
        const exists = await User.findOne({ email: row.email.toLowerCase() });
        if (exists) {
          results.skipped++;
          continue;
        }
        await User.create({
          name: row.name,
          email: row.email,
          password: row.password || 'nss@dtu123',
          rollNo: row.rollNo,
          branch: row.branch,
          year: row.year ? Number(row.year) : undefined,
          section: row.section,
          role: 'student',
          isVerified: true,
        });
        results.created++;
      } catch (e) {
        results.errors.push({ row, reason: e.message });
      }
    }

    await AuditLog.create({ actor: req.user._id, action: 'user.bulkImport', meta: results });
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
};