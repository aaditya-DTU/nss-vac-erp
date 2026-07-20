const PointsLedger = require('../models/PointsLedger');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Central place where NSS hours/points are ever credited. Writing here and
// updating the User cache atomically is what keeps the leaderboard and the
// certificate-eligibility check trustworthy — nothing should mutate
// User.totalHours/totalPoints directly anywhere else in the codebase.
async function awardCredit({ studentId, source, refId, points = 0, hours = 0, note, awardedBy, io }) {
  const entry = await PointsLedger.create({ student: studentId, source, refId, points, hours, note, awardedBy });

  const updatedUser = await User.findByIdAndUpdate(
    studentId,
    { $inc: { totalPoints: points, totalHours: hours } },
    { new: true }
  );

  if (io) {
    io.to(`user:${studentId}`).emit('ledger:update', {
      totalPoints: updatedUser.totalPoints,
      totalHours: updatedUser.totalHours,
      delta: { points, hours },
    });
  }

  return entry;
}

async function reverseCredit({ studentId, originalEntry, note, awardedBy, io }) {
  return awardCredit({
    studentId,
    source: 'reversal',
    refId: originalEntry._id,
    points: -originalEntry.points,
    hours: -originalEntry.hours,
    note: note || `Reversal of ledger entry ${originalEntry._id}`,
    awardedBy,
    io,
  });
}

async function notify({ userId, title, message, type = 'general', link, io }) {
  const n = await Notification.create({ user: userId, title, message, type, link });
  if (io) io.to(`user:${userId}`).emit('notification:new', n);
  return n;
}

module.exports = { awardCredit, reverseCredit, notify };
