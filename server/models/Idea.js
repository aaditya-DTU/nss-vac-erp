const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    status: { type: String, enum: ['new', 'reviewed', 'implemented'], default: 'new' },
    adminNote: { type: String },
    // Who has upvoted — kept as a set of user IDs so a toggle is a single
    // findByIdAndUpdate with $addToSet / $pull (no read-modify-write race).
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Denormalized count, updated alongside `upvotes` in the same update.
    // Sorting by upvotes.length would require an aggregation pipeline;
    // sorting by this plain Number field is a normal indexed sort.
    upvoteCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ideaSchema.index({ status: 1, createdAt: -1 });
ideaSchema.index({ upvoteCount: -1, createdAt: -1 });

module.exports = mongoose.model('Idea', ideaSchema);