const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, enum: ['general', 'urgent', 'event', 'deadline'], default: 'general' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    pinned: { type: Boolean, default: false },
    // Optional auto-expiry — e.g. a deadline reminder that stops showing
    // once the deadline has passed, without an admin having to remember to
    // delete it.
    expiresAt: { type: Date },

    // Lightweight read-receipt tracking so the admin can see engagement
    // ("142/160 students have seen this") without a separate analytics
    // system — just a set of user ids that have opened it.
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

announcementSchema.index({ pinned: -1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
