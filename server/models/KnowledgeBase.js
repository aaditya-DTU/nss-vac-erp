const mongoose = require('mongoose');

// FAQ / handbook chunks that back the "NSS Saathi" chatbot's retrieval step.
// Kept as simple Q&A pairs rather than raw document chunks — for an NSS VAC
// course the real questions students ask are a fairly closed set (hours,
// deadlines, categories, certificate rules), so retrieval-by-FAQ is both
// simpler to run (no vector DB needed) and more accurate than generic
// chunk retrieval over a handbook PDF.
const knowledgeBaseSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    category: { type: String, default: 'general' },
    keywords: [{ type: String }], // extra terms to help matching beyond the question text
  },
  { timestamps: true }
);

knowledgeBaseSchema.index({ question: 'text', answer: 'text', keywords: 'text' });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
