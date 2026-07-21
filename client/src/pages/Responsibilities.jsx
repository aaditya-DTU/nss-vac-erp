import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '../context/PageTitleContext';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Plus, X, HandHelping, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

const CATEGORIES = ['pr', 'field_work', 'photography', 'social_media', 'logistics', 'documentation', 'other'];
const emptyForm = { title: '', description: '', category: 'other', assignedTo: '', deadline: '' };

const statusStyles = {
  open: 'bg-primary-50 text-primary-700',
  claimed: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
};

export default function Responsibilities() {
  usePageTitle("Responsibilities");
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => api.get('/responsibilities').then((r) => setItems(r.data.responsibilities));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/users', { params: { role: 'student', limit: 200 } }).then((r) => setStudents(r.data.users));
    }
  }, [user.role]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/responsibilities', { ...form, assignedTo: form.assignedTo || undefined, deadline: form.deadline || undefined });
      toast.success('Responsibility created');
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const claim = async (id) => {
    try {
      await api.post(`/responsibilities/${id}/claim`);
      toast.success('You\'ve claimed this responsibility');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not claim');
    }
  };

  const complete = async (id) => {
    await api.post(`/responsibilities/${id}/complete`);
    toast.success('Marked complete');
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this responsibility?')) return;
    await api.delete(`/responsibilities/${id}`);
    load();
  };

  return (
    <>
      {user.role === 'admin' && (
        <div className="flex justify-end mb-4">
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus size={18} /> New responsibility
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((r) => (
          <div key={r._id} className="card">
            <div className="flex items-start justify-between mb-2">
              <span className="badge bg-primary-50 text-primary-700 capitalize">{r.category.replace('_', ' ')}</span>
              <span className={clsx('badge capitalize', statusStyles[r.status])}>{r.status}</span>
            </div>
            <h3 className="font-semibold text-ink mb-1">{r.title}</h3>
            <p className="text-sm text-ink/60 mb-3">{r.description}</p>
            {r.deadline && <p className="text-xs text-ink/50 mb-2">Due {format(new Date(r.deadline), 'MMM d, yyyy')}</p>}
            {r.assignedTo && (
              <p className="text-xs text-ink/50 mb-3">Holder: <span className="font-medium text-ink">{r.assignedTo.name}</span></p>
            )}

            {r.status === 'open' && user.role === 'student' && (
              <button onClick={() => claim(r._id)} className="btn-primary w-full text-sm flex items-center justify-center gap-1">
                <HandHelping size={14} /> Claim this
              </button>
            )}
            {r.status === 'claimed' && (user.role === 'admin' || r.assignedTo?._id === user._id) && (
              <button onClick={() => complete(r._id)} className="btn-secondary w-full text-sm flex items-center justify-center gap-1">
                <CheckCircle2 size={14} /> Mark complete
              </button>
            )}
            {user.role === 'admin' && (
              <button onClick={() => remove(r._id)} className="text-xs text-red-500 hover:underline mt-2">Delete</button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-ink/50">No responsibilities yet.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <form onSubmit={create} className="card w-full max-w-lg relative">
            <button type="button" onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-ink/40 hover:text-ink">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl text-primary-900 mb-4">New responsibility</h3>

            <label className="text-sm font-medium text-ink/70">Title</label>
            <input required className="input mt-1 mb-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

            <label className="text-sm font-medium text-ink/70">Description</label>
            <textarea rows={3} className="input mt-1 mb-3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-sm font-medium text-ink/70">Category</label>
                <select className="input mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Deadline (optional)</label>
                <input type="date" className="input mt-1" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>

            <label className="text-sm font-medium text-ink/70">Assign directly to (optional)</label>
            <select className="input mt-1 mb-4" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">— Leave open for students to claim —</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.rollNo})</option>)}
            </select>

            <button type="submit" className="btn-primary w-full">Create</button>
          </form>
        </div>
      )}
    </>
  );
}