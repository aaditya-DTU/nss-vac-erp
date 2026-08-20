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

    // Venue coordinates the admin sets when creating/editing the event.
    // Required for GPS-gated check-in: a student's device location must be
    // within checkinRadiusMeters of this point at check-in time, so the
    // static attendance code alone can no longer be used remotely (e.g.
    // forwarded in a WhatsApp group to someone not actually at the venue).
    // Left null on events created before this feature — check-in falls
    // back to code-only (with a console warning to the admin) for those.
    venueLat: { type: Number, default: null },
    venueLng: { type: Number, default: null },
    checkinRadiusMeters: { type: Number, default: 75 },

    // Unique rotating code used to render a QR for on-site attendance check-in
    attendanceCode: { type: String, default: () => crypto.randomBytes(6).toString('hex') },
    isAttendanceOpen: { type: Boolean, default: false },

    registeredStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);