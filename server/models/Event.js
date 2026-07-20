const mongoose = require('mongoose');
const crypto = require('crypto');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    location: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    hoursWorth: { type: Number, default: 4 },
    pointsWorth: { type: Number, default: 20 },

    // Unique rotating code used to render a QR for on-site attendance check-in
    attendanceCode: { type: String, default: () => crypto.randomBytes(6).toString('hex') },
    isAttendanceOpen: { type: Boolean, default: false },

    registeredStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
