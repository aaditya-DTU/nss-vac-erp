import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Plus, X, Lightbulb, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const statusStyles = {
  new: 'bg-primary-50 text-primary-700',
  reviewed: 'bg-amber-50 text-amber-700',
  implemented: 'bg-green-50 text-green-700',
};

// "New ideas dene ke liye ek section" — students submit suggestions/opinions,
// admins see everything submitted and can mark it reviewed/implemented.
export default function Ideas() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const load = () => api.get('/ideas').then((r) => setIdeas(r.data.ideas));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/ideas', form);
      toast.success('Idea submitted — thanks for the input!');
      setShowForm(false);
      setForm({ title: '', content: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    }
  };

  const setStatus = async (id, status) => {
    await api.patch(`/ideas/${id}/status`, { status });
    toast.success('Status updated');
    load();
  };

  const remove = async (id) => {
    await api.delete(`/ideas/${id}`);
    load();
  };

  return (
    <Layout title="Ideas & Suggestions">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-ink/60">
          {user.role === 'admin' ? 'Every idea submitted by students, most recent first.' : 'Got a suggestion for the NSS program? Submit it here.'}
        </p>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={18} /> {user.role === 'admin' ? 'Add note' : 'Submit an idea'}
        </button>
      </div>

      <div className="space-y-4 max-w-2xl">
        {ideas.map((idea) => (
          <div key={idea._id} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className={clsx('badge capitalize', statusStyles[idea.status])}>{idea.status}</span>
              <span className="text-xs text-ink/40">{format(new Date(idea.createdAt), 'MMM d, yyyy')}</span>
            </div>
            <h3 className="font-semibold text-ink mb-1">{idea.title}</h3>
            <p className="text-sm text-ink/70 whitespace-pre-line mb-2">{idea.content}</p>
            {idea.adminNote && (
              <p className="text-xs bg-primary-50 text-primary-700 rounded-lg px-2 py-1 mb-2">Coordinator note: {idea.adminNote}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              {user.role === 'admin' && <p className="text-xs text-ink/40">— {idea.student?.name} ({idea.student?.rollNo})</p>}
              <div className="flex items-center gap-3 ml-auto text-xs">
                {user.role === 'admin' && idea.status !== 'reviewed' && (
                  <button onClick={() => setStatus(idea._id, 'reviewed')} className="text-primary-600 hover:underline">Mark reviewed</button>
                )}
                {user.role === 'admin' && idea.status !== 'implemented' && (
                  <button onClick={() => setStatus(idea._id, 'implemented')} className="text-green-600 hover:underline">Mark implemented</button>
                )}
                {(user.role === 'admin' || idea.student?._id === user._id) && (
                  <button onClick={() => remove(idea._id)} className="text-red-500 hover:underline flex items-center gap-1">
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {ideas.length === 0 && (
          <div className="card text-center py-10">
            <Lightbulb className="mx-auto text-primary-300 mb-2" size={32} />
            <p className="text-ink/50 text-sm">{user.role === 'admin' ? 'No ideas submitted yet.' : "You haven't submitted any ideas yet."}</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <form onSubmit={submit} className="card w-full max-w-lg relative">
            <button type="button" onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-ink/40 hover:text-ink">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl text-primary-900 mb-4">Share an idea</h3>

            <label className="text-sm font-medium text-ink/70">Title</label>
            <input required className="input mt-1 mb-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

            <label className="text-sm font-medium text-ink/70">Details</label>
            <textarea required rows={5} className="input mt-1 mb-4" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />

            <button type="submit" className="btn-primary w-full">Submit</button>
          </form>
        </div>
      )}
    </Layout>
  );
}