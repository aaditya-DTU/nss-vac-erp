const mongoose = require('mongoose');

// Every time the chatbot has to say "I don't have an answer" (or the agent
// itself signals low confidence), the question gets logged here instead of
// just vanishing. The admin FAQ panel can then surface the most common gaps
// so the coordinator adds a real FAQ once, and the whole system improves —
// rather than the same unanswered question recurring silently forever.
const unansweredQuerySchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    askedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['none', 'low_confidence'], default: 'none' },
    resolved: { type: Boolean, default: false }, // admin can mark it handled once an FAQ is added
  },
  { timestamps: true }
);

unansweredQuerySchema.index({ resolved: 1, createdAt: -1 });

module.exports = mongoose.model('UnansweredQuery', unansweredQuerySchema);