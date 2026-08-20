import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../context/PageTitleContext';
import api from '../../api/axios';
import { format } from 'date-fns';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import Ledger from '../../components/ledger/Ledger';
import LedgerSummaryModal from '../../components/ledger/LedgerSummaryModal';

const statusBadgeClass = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  resubmit_requested: 'bg-orange-100 text-orange-700',
};

const emptyForm = {
  title: '', description: '', category: 'other', points: 10, hoursWorth: 2,
  deadline: '', scope: 'all', year: '', branch: '', section: '',
};

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // null = creating, an id = editing that task
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  // Past-tasks ledger: clicking an entry pops a read-only overall summary
  // (assigned/submitted/approved counts + every student's status), separate
  // from the live "Review submissions" modal used for actionable review.
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);

  const loadTasks = () => api.get('/tasks').then((r) => setTasks(r.data.tasks));
  useEffect(() => { loadTasks(); }, []);

  const openReview = async (task) => {
    setSelectedTask(task);
    const { data } = await api.get(`/tasks/${task._id}/submissions`);
    setSubmissions(data.submissions);
  };

  // Opens the ledger summary for a past (deadline-passed) task: overall
  // stats plus every student's final submission status.
  const openTaskLedgerSummary = async (item) => {
    const task = tasks.find((t) => t._id === item.id);
    if (!task) return;
    setLedgerOpen(true);
    setLedgerLoading(true);
    setLedgerData({ task });
    try {
      const { data } = await api.get(`/tasks/${task._id}/submissions`);
      setLedgerData({ task, submissions: data.submissions });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load summary');
    } finally {
      setLedgerLoading(false);
    }
  };

  const review = async (subId, decision) => {
    const reviewNote = decision !== 'approved' ? prompt('Note for the student (optional):') || '' : '';
    await api.patch(`/submissions/${subId}/review`, { decision, reviewNote });
    toast.success(`Submission ${decision.replace('_', ' ')}`);
    openReview(selectedTask);
    loadTasks();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (task) => {
    setEditingId(task._id);
    setForm({
      title: task.title,
      description: task.description,
      category: task.category,
      points: task.points,
      hoursWorth: task.hoursWorth,
      deadline: task.deadline ? task.deadline.slice(0, 10) : '',
      scope: task.assignedTo?.scope === 'filter' ? 'filter' : 'all',
      year: task.assignedTo?.filter?.year || '',
      branch: task.assignedTo?.filter?.branch || '',
      section: task.assignedTo?.filter?.section || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const saveTask = async (e) => {
    e.preventDefault();
    try {
      const assignedTo =
        form.scope === 'all'
          ? { scope: 'all' }
          : { scope: 'filter', filter: { year: form.year || undefined, branch: form.branch || undefined, section: form.section || undefined } };

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        points: Number(form.points),
        hoursWorth: Number(form.hoursWorth),
        deadline: form.deadline,
        assignedTo,
      };

      if (editingId) {
        await api.patch(`/tasks/${editingId}`, payload);
        toast.success('Task updated');
      } else {
        await api.post('/tasks', payload);
        toast.success('Task published and students notified');
      }
      closeForm();
      setForm(emptyForm);
      loadTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    }
  };

  const deleteTask = async (task) => {
    if (!confirm(`Delete "${task.title}"? Students will no longer see it, but existing review history is kept.`)) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      toast.success('Task deleted');
      loadTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const notArchived = tasks.filter((t) => t.status !== 'archived');
  const now = new Date();
  // Once a task's deadline has passed it drops out of the live grid and
  // into the ledger below — still reachable, just out of the way.
  const visibleTasks = notArchived.filter((t) => new Date(t.deadline) >= now);
  const pastTasks = notArchived.filter((t) => new Date(t.deadline) < now);

  const ledgerItems = pastTasks
    .sort((a, b) => new Date(b.deadline) - new Date(a.deadline))
    .map((t) => ({
      id: t._id,
      title: t.title,
      meta: `Due ${format(new Date(t.deadline), 'MMM d, yyyy')} · ${t.stats.submittedCount}/${t.stats.assignedCount} submitted`,
      badge: `${t.stats.approvedCount} approved`,
      badgeClass: 'bg-green-50 text-green-700',
    }));

  usePageTitle('Admin tasks');

  return (
    <>
      <div className="flex justify-end mb-4">
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={18} /> New task
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleTasks.map((t) => (
          <div key={t._id} className="card">
            <div className="flex items-start justify-between mb-2">
              <span className="badge bg-primary-50 text-primary-700 capitalize">{t.category.replace('_', ' ')}</span>
              <span className="text-xs text-ink/50">Due {format(new Date(t.deadline), 'MMM d')}</span>
            </div>
            <h3 className="font-semibold text-ink mb-1">{t.title}</h3>
            <p className="text-xs text-ink/50 mb-4">
              {t.stats.submittedCount}/{t.stats.assignedCount} submitted · {t.stats.approvedCount} approved
            </p>
            <div className="space-y-2">
              <button className="btn-secondary w-full text-sm" onClick={() => openReview(t)}>Review submissions</button>
              <div className="flex gap-2">
                <button
                  className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1"
                  onClick={() => openEdit(t)}
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1 text-red-500"
                  onClick={() => deleteTask(t)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {visibleTasks.length === 0 && <p className="text-ink/50">No active tasks.</p>}
      </div>

      <Ledger title="Past tasks" items={ledgerItems} onItemClick={openTaskLedgerSummary} />

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <form onSubmit={saveTask} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <button type="button" onClick={closeForm} className="absolute right-4 top-4 text-ink/40 hover:text-ink"><X size={20} /></button>
            <h3 className="font-display text-xl text-primary-900 mb-4">{editingId ? 'Edit task' : 'Create task'}</h3>

            <label className="text-sm font-medium text-ink/70">Title</label>
            <input required className="input mt-1 mb-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

            <label className="text-sm font-medium text-ink/70">Description</label>
            <textarea required rows={3} className="input mt-1 mb-3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-sm font-medium text-ink/70">Category</label>
                <select className="input mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {['plantation', 'blood_donation', 'cleanliness', 'awareness_camp', 'teaching', 'survey', 'event_duty', 'other'].map((c) => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Deadline</label>
                <input type="date" required className="input mt-1" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Points</label>
                <input type="number" className="input mt-1" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Hours worth</label>
                <input type="number" className="input mt-1" value={form.hoursWorth} onChange={(e) => setForm({ ...form, hoursWorth: e.target.value })} />
              </div>
            </div>

            <label className="text-sm font-medium text-ink/70">Assign to</label>
            <select className="input mt-1 mb-3" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <option value="all">All students</option>
              <option value="filter">Filtered group</option>
            </select>

            {form.scope === 'filter' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input placeholder="Year" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                <input placeholder="Branch" className="input" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
                <input placeholder="Section" className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2">{editingId ? 'Save changes' : 'Publish task'}</button>
          </form>
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto relative">
            <button onClick={() => setSelectedTask(null)} className="absolute right-4 top-4 text-ink/40 hover:text-ink"><X size={20} /></button>
            <h3 className="font-display text-xl text-primary-900 mb-4">{selectedTask.title} — submissions</h3>
            <ul className="space-y-3">
              {submissions.map((s) => (
                <li key={s._id} className="border border-primary-100 rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-ink">{s.student?.name} <span className="text-ink/40 text-xs">· {s.student?.rollNo}</span></p>
                      <p className="text-xs text-ink/50">{s.remarks}</p>
                      {s.proofUrl && <a href={s.proofUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">View proof file</a>}
                      {s.proofLink && <a href={s.proofLink} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline block">{s.proofLink}</a>}
                    </div>
                    <span className="badge bg-primary-50 text-primary-700 capitalize">{s.status.replace('_', ' ')}</span>
                  </div>
                  {s.flags?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {s.flags.map((f, i) => (
                        <p key={i} className="text-xs bg-red-50 text-red-600 rounded-lg px-2 py-1">
                          ⚠ {f.type === 'duplicate_image' ? 'Possible duplicate image' : 'Similar text'} matching{' '}
                          <strong>{f.matchedSubmission?.student?.name || 'another submission'}</strong> ({f.detail})
                        </p>
                      ))}
                    </div>
                  )}
                  {s.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => review(s._id, 'approved')}>Approve</button>
                      <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => review(s._id, 'resubmit_requested')}>Request resubmit</button>
                      <button className="btn-secondary !py-1 !px-3 text-xs text-red-500" onClick={() => review(s._id, 'rejected')}>Reject</button>
                    </div>
                  )}
                </li>
              ))}
              {submissions.length === 0 && <p className="text-sm text-ink/50">No submissions yet.</p>}
            </ul>
          </div>
        </div>
      )}

      <LedgerSummaryModal
        open={ledgerOpen}
        onClose={() => { setLedgerOpen(false); setLedgerData(null); }}
        title={ledgerData?.task ? `${ledgerData.task.title} — summary` : ''}
        subtitle={ledgerData?.task ? `Deadline was ${format(new Date(ledgerData.task.deadline), 'MMM d, yyyy')}` : ''}
        loading={ledgerLoading}
        stats={
          ledgerData?.task
            ? [
                { label: 'Assigned', value: ledgerData.task.stats.assignedCount },
                { label: 'Submitted', value: ledgerData.task.stats.submittedCount },
                { label: 'Approved', value: ledgerData.task.stats.approvedCount },
              ]
            : []
        }
        rows={(ledgerData?.submissions || []).map((s) => ({
          id: s._id,
          primary: `${s.student?.name || 'Unknown'} · ${s.student?.rollNo || '—'}`,
          secondary: s.remarks || undefined,
          badge: s.status.replace('_', ' '),
          badgeClass: statusBadgeClass[s.status],
        }))}
        emptyText="No students submitted this task."
      />
    </>
  );
}