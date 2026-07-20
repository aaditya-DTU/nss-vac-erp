const mongoose = require('mongoose');

const pointsLedgerSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['task', 'event', 'bonus', 'penalty', 'reversal'], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId },
    points: { type: Number, required: true, default: 0 },
    hours: { type: Number, required: true, default: 0 },
    note: { type: String },
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

pointsLedgerSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('PointsLedger', pointsLedgerSchema);
