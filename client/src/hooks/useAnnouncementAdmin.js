import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const emptyForm = { title: '', content: '', category: 'general', pinned: false, expiresAt: '' };

/**
 * Owns the admin-only create/edit/delete announcement form. Depends on a
 * `reload` callback (typically the `load` from useAnnouncementFeed) so the
 * list refreshes after a mutation, without this hook needing to know
 * anything about how the list itself is fetched.
 */
export function useAnnouncementAdmin(reload) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };

  const openEdit = (a) => {
    setForm({
      title: a.title,
      content: a.content,
      category: a.category,
      pinned: a.pinned,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : '',
    });
    setEditingId(a._id);
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, expiresAt: form.expiresAt || undefined };
      if (editingId) {
        await api.patch(`/announcements/${editingId}`, payload);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', payload);
        toast.success('Announcement published to all students');
      }
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save announcement');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    toast.success('Deleted');
    reload();
  };

  return { form, setForm, showForm, editingId, openCreate, openEdit, closeForm, submit, remove };
}