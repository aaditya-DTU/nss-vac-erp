const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { generateCertificatePdf } = require('../utils/certificateGenerator');
const { notify } = require('../utils/ledger');

exports.issueCertificate = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const requiredHours = Number(process.env.REQUIRED_NSS_HOURS || 120);
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    if (student.totalHours < requiredHours) {
      return res.status(400).json({
        success: false,
        message: `Student has only ${student.totalHours}/${requiredHours} required hours. Not yet eligible.`,
      });
    }

    let certificate = await Certificate.findOne({ student: student._id });
    const certificateId = certificate?.certificateId || `NSS-DTU-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const fileUrl = await generateCertificatePdf({
      studentName: student.name,
      rollNo: student.rollNo,
      totalHours: student.totalHours,
      totalPoints: student.totalPoints,
      certificateId,
      issuedAt: new Date(),
    });

    if (certificate) {
      certificate.totalHours = student.totalHours;
      certificate.totalPoints = student.totalPoints;
      certificate.fileUrl = fileUrl;
      certificate.issuedAt = new Date();
      await certificate.save();
    } else {
      certificate = await Certificate.create({
        student: student._id,
        certificateId,
        totalHours: student.totalHours,
        totalPoints: student.totalPoints,
        fileUrl,
      });
    }

    await notify({
      userId: student._id,
      title: 'Certificate ready',
      message: 'Your NSS VAC completion certificate has been generated. Download it from your dashboard.',
      type: 'certificate_ready',
      link: '/certificate',
      io,
    });

    res.json({ success: true, certificate });
  } catch (err) {
    next(err);
  }
};

exports.myCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ student: req.user._id });
    if (!certificate) return res.status(404).json({ success: false, message: 'No certificate issued yet.' });
    res.json({ success: true, certificate });
  } catch (err) {
    next(err);
  }
};

// Public, unauthenticated verification — deliberately returns only the
// minimum needed to confirm authenticity (name, hours, issue date), not the
// student's email or roll number, since this endpoint has no login wall.
exports.verifyCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId }).populate('student', 'name branch year');
    if (!certificate) {
      return res.status(404).json({ success: false, valid: false, message: 'No certificate found with this ID.' });
    }
    res.json({
      success: true,
      valid: true,
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.student.name,
        branch: certificate.student.branch,
        year: certificate.student.year,
        totalHours: certificate.totalHours,
        totalPoints: certificate.totalPoints,
        issuedAt: certificate.issuedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};
