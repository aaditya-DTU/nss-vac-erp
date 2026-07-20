const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['plantation', 'blood_donation', 'cleanliness', 'awareness_camp', 'teaching', 'survey', 'event_duty', 'other'],
      default: 'other',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Assignment scope: all students, or specific year/branch/section, or explicit list
    assignedTo: {
      scope: { type: String, enum: ['all', 'filter', 'specific'], default: 'all' },
      filter: {
        year: Number,
        branch: String,
        section: String,
      },
      studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },

    points: { type: Number, default: 10, min: 0 },
    hoursWorth: { type: Number, default: 2, min: 0 },

    deadline: { type: Date, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['draft', 'published', 'closed', 'archived'], default: 'published' },

    attachments: [{ url: String, filename: String }],
    requiresProof: { type: Boolean, default: true },
    proofType: { type: String, enum: ['image', 'document', 'link', 'any'], default: 'any' },

    // denormalized counters kept in sync via hooks/controllers for fast dashboard reads
    stats: {
      assignedCount: { type: Number, default: 0 },
      submittedCount: { type: Number, default: 0 },
      approvedCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

taskSchema.index({ deadline: 1, status: 1 });
taskSchema.index({ 'assignedTo.scope': 1 });

module.exports = mongoose.model('Task', taskSchema);
