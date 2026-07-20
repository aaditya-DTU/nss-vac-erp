const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    status: { type: String, enum: ['new', 'reviewed', 'implemented'], default: 'new' },
    adminNote: { type: String },
  },
  { timestamps: true }
);

ideaSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Idea', ideaSchema);