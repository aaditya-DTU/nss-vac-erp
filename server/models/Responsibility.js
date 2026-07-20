const mongoose = require('mongoose');

// Distinct from Task: a Task is a one-off activity worth hours/points with
// a deadline. A Responsibility is an ongoing role/duty (PR lead, field-work
// coordinator, documentation, social media) that a student holds until it's
// marked complete — no hours/points attached, since "being responsible for
// X" isn't itself proof-of-work the way a task submission is.
const responsibilitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['pr', 'field_work', 'photography', 'social_media', 'logistics', 'documentation', 'other'],
      default: 'other',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // If assignedTo is set at creation, the admin directly allotted it.
    // If left null, it's open for any student to claim themselves.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['open', 'claimed', 'completed'], default: 'open' },
    claimedAt: { type: Date },
    completedAt: { type: Date },
    deadline: { type: Date },
  },
  { timestamps: true }
);

responsibilitySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Responsibility', responsibilitySchema);