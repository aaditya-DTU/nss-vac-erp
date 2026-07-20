const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    certificateId: { type: String, required: true, unique: true },
    totalHours: { type: Number, required: true },
    totalPoints: { type: Number, required: true },
    issuedAt: { type: Date, default: Date.now },
    fileUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);
