const mongoose = require('mongoose');

// Persisted transcript per user. Only 'user' and 'assistant' turns are
// stored — the tool-call plumbing within a single request (see
// utils/llmClient.js runAgentTurn) is ephemeral and never written here, so
// re-hydrating history for the next message stays small and clean.
const chatMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    toolsUsed: [{ type: String }], // names of tools the agent called to produce this reply, for UI transparency
    feedback: { type: String, enum: ['up', 'down', null], default: null }, // student rating on assistant replies
  },
  { timestamps: true }
);

chatMessageSchema.index({ user: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);