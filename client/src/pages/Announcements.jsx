import React from 'react';
import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Pin, Plus, X, Trash2, Pencil, Megaphone } from 'lucide-react';
import clsx from 'clsx';
import { useAnnouncementFeed } from '../hooks/useAnnouncementFeed';
import { useAnnouncementAdmin } from '../hooks/useAnnouncementAdmin';

const categoryStyles = {
  general: 'bg-primary-50 text-primary-700',
  urgent: 'bg-red-50 text-red-600',
  event: 'bg-amber-50 text-amber-700',
  deadline: 'bg-orange-50 text-orange-700',
};

export default function Announcements() {
  usePageTitle("Announcements");
  const { user } = useAuth();

  const { announcements, load, markRead } = useAnnouncementFeed();
  const { form, setForm, showForm, editingId, openCreate, openEdit, closeForm, submit, remove } =
    useAnnouncementAdmin(load);

  return (
    <>
      {user.role === 'admin' && (
        <div className="flex justify-end mb-4">
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={18} /> New announcement
          </button>
        </div>
      )}

      <div className="space-y-4 max-w-3xl">
        {announcements.map((a) => (
          <div
            key={a._id}
            onMouseEnter={() => user.role === 'student' && !a.isRead && markRead(a._id)}
            className={clsx('card relative', !a.isRead && user.role === 'student' && 'border-primary-300 ring-1 ring-primary-100')}
          >
            {a.pinned && <Pin size={14} className="absolute top-4 right-4 text-primary-500" fill="currentColor" />}

            <div className="flex items-center gap-2 mb-2">
              <span className={clsx('badge capitalize', categoryStyles[a.category])}>{a.category}</span>
              {!a.isRead && user.role === 'student' && <span className="badge bg-primary-600 text-white">New</span>}
              <span className="text-xs text-ink/40 ml-auto">{format(new Date(a.createdAt), 'MMM d, yyyy · p')}</span>
            </div>

            <h3 className="font-semibold text-ink mb-1 pr-6">{a.title}</h3>
            <p className="text-sm text-ink/70 whitespace-pre-line">{a.content}</p>

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-ink/40">— {a.createdBy?.name}</p>
              {user.role === 'admin' && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-ink/40">{a.readCount} read</span>
                  <button onClick={() => openEdit(a)} className="text-primary-600 hover:underline flex items-center gap-1">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => remove(a._id)} className="text-red-500 hover:underline flex items-center gap-1">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="card text-center py-10">
            <Megaphone className="mx-auto text-primary-300 mb-2" size={32} />
            <p className="text-ink/50 text-sm">No announcements yet.</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <form onSubmit={submit} className="card w-full max-w-lg relative">
            <button type="button" onClick={closeForm} className="absolute right-4 top-4 text-ink/40 hover:text-ink">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl text-primary-900 mb-4">{editingId ? 'Edit announcement' : 'New announcement'}</h3>

            <label className="text-sm font-medium text-ink/70">Title</label>
            <input required className="input mt-1 mb-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

            <label className="text-sm font-medium text-ink/70">Content</label>
            <textarea required rows={4} className="input mt-1 mb-3" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-sm font-medium text-ink/70">Category</label>
                <select className="input mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {['general', 'urgent', 'event', 'deadline'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Auto-expire (optional)</label>
                <input type="date" className="input mt-1" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink/70 mb-4">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              Pin to top
            </label>

            <button type="submit" className="btn-primary w-full">{editingId ? 'Save changes' : 'Publish to all students'}</button>
          </form>
        </div>
      )}
    </>
  );
}