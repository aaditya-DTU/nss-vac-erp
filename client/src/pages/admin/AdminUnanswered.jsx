import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../context/PageTitleContext';
import api from '../../api/axios';
import { format } from 'date-fns';
import { HelpCircle, Plus, X, Check, MessageCircleQuestion } from 'lucide-react';

// Closes the chatbot's self-improvement loop: every question NSS Saathi
// couldn't answer well (see logUnanswered in chatbotController.js) lands
// here, grouped and ranked by how often it comes up. The admin can turn any
// gap straight into a real FAQ — one click, no separate FAQ-management page
// needed for the common case.
export default function AdminUnanswered() {
  usePageTitle("Chatbot Gaps");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faqFormFor, setFaqFormFor] = useState(null);
  const [faqForm, setFaqForm] = useState({ answer: '', category: 'general' });

  const load = () => {
    setLoading(true);
    api.get('/chatbot/unanswered').then((r) => setItems(r.data.unanswered)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const dismiss = async (item) => {
    await api.post(`/chatbot/unanswered/${item.ids[0]}/resolve`);
    toast.success('Dismissed');
    load();
  };

  const openFaqForm = (item) => {
    setFaqFormFor(item);
    setFaqForm({ answer: '', category: 'general' });
  };

  const submitFaq = async (e) => {
    e.preventDefault();
    try {
      await api.post('/chatbot/faqs', {
        question: faqFormFor.question,
        answer: faqForm.answer,
        category: faqForm.category,
        keywords: [],
      });
      await api.post(`/chatbot/unanswered/${faqFormFor.ids[0]}/resolve`);
      toast.success('FAQ added — NSS Saathi will use it right away');
      setFaqFormFor(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add FAQ');
    }
  };

  return (
    <>
      <p className="text-sm text-ink/60 mb-5 max-w-2xl">
        Questions NSS Saathi couldn't answer confidently, grouped by how often they come up. Turn any of these into a
        real FAQ and the chatbot gets smarter immediately — no redeploy needed.
      </p>

      {loading && <p className="text-ink/50 text-sm">Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="card text-center py-10 max-w-xl">
          <MessageCircleQuestion className="mx-auto text-primary-300 mb-2" size={32} />
          <p className="text-ink/50 text-sm">No unresolved gaps right now — the bot's covering everything it's been asked.</p>
        </div>
      )}

      <div className="space-y-3 max-w-2xl">
        {items.map((item) => (
          <div key={item._id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{item.question}</p>
                <p className="text-xs text-ink/40 mt-1">
                  Asked {item.count} time{item.count === 1 ? '' : 's'} · last {format(new Date(item.lastAsked), 'MMM d, yyyy')}
                </p>
              </div>
              <span className="badge bg-amber-50 text-amber-700 shrink-0">
                <HelpCircle size={12} className="mr-1" /> {item.count}
              </span>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={() => openFaqForm(item)} className="btn-secondary !py-1 !px-3 text-xs flex items-center gap-1">
                <Plus size={12} /> Add as FAQ
              </button>
              <button onClick={() => dismiss(item)} className="btn-secondary !py-1 !px-3 text-xs flex items-center gap-1 text-ink/50">
                <Check size={12} /> Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>

      {faqFormFor && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <form onSubmit={submitFaq} className="card w-full max-w-lg relative">
            <button type="button" onClick={() => setFaqFormFor(null)} className="absolute right-4 top-4 text-ink/40 hover:text-ink">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl text-primary-900 mb-1">Add FAQ</h3>
            <p className="text-sm text-ink/50 mb-4">"{faqFormFor.question}"</p>

            <label className="text-sm font-medium text-ink/70">Answer</label>
            <textarea
              required
              rows={4}
              className="input mt-1 mb-3"
              placeholder="What should NSS Saathi say when this is asked?"
              value={faqForm.answer}
              onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
            />

            <label className="text-sm font-medium text-ink/70">Category</label>
            <input
              className="input mt-1 mb-4"
              placeholder="e.g. requirements, events, certificate"
              value={faqForm.category}
              onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
            />

            <button type="submit" className="btn-primary w-full">Save FAQ &amp; resolve</button>
          </form>
        </div>
      )}
    </>
  );
}