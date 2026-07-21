const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkedInAt: { type: Date, default: Date.now },
    method: { type: String, enum: ['qr', 'manual'], default: 'qr' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    distanceFromVenueMeters: { type: Number, default: null },
  },
  { timestamps: true }
);

attendanceSchema.index({ event: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
