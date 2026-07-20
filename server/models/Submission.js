const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    remarks: { type: String, trim: true },
    proofUrl: { type: String },
    proofLink: { type: String },
    proofFilename: { type: String },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'resubmit_requested'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String },
    reviewedAt: { type: Date },

    pointsAwarded: { type: Number, default: 0 },
    hoursAwarded: { type: Number, default: 0 },

    isLate: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },

    // Anti-duplicate / proof-authenticity signals (see utils/imageHash.js)
    imageHash: { type: String },
    flags: [
      {
        type: { type: String, enum: ['duplicate_image', 'similar_text'] },
        matchedSubmission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
        detail: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// A student may resubmit, but only one active (pending/approved) submission per task
submissionSchema.index({ task: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
