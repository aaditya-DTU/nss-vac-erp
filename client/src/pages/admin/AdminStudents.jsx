import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../context/PageTitleContext';
import api from '../../api/axios';
import { format } from 'date-fns';
import {
  Award,
  FileSpreadsheet,
  Activity,
  X,
  MapPin,
  CheckCircle2,
  Pencil,
  Power,
  Save,
} from 'lucide-react';

export default function AdminStudents() {
  usePageTitle("Students");
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  // Combined admin panel — clicking a row opens this. Shows editable
  // profile fields, current status, deactivate toggle, and the
  // student's full participation/activity history.
  const [panelFor, setPanelFor] = useState(null); // student being viewed/edited
  const [activity, setActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const load = () => api.get('/users', { params: { role: 'student', search } }).then((r) => setStudents(r.data.users));
  useEffect(() => { load(); }, [search]);

  const issueCertificate = async (studentId) => {
    try {
      await api.post(`/certificates/issue/${studentId}`);
      toast.success('Certificate issued');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Not eligible yet');
    }
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/reports/nss-summary', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `nss-vac-report-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Could not generate report');
    } finally {
      setExporting(false);
    }
  };

  const openPanel = async (student) => {
    setPanelFor(student);
    setEditForm({
      name: student.name || '',
      rollNo: student.rollNo || '',
      branch: student.branch || '',
      year: student.year || '',
      email: student.email || '',
    });
    setLoadingActivity(true);
    try {
      const { data } = await api.get(`/users/${student._id}/activity`);
      setActivity(data);
    } catch {
      toast.error('Could not load activity');
    } finally {
      setLoadingActivity(false);
    }
  };

  const closePanel = () => {
    setPanelFor(null);
    setActivity(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/users/${panelFor._id}`, editForm);
      toast.success('Student updated');
      setStudents((prev) => prev.map((s) => (s._id === panelFor._id ? { ...s, ...data.user } : s)));
      setPanelFor((prev) => ({ ...prev, ...data.user }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (student) => {
    const next = !student.isActive;
    const label = next ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${label} ${student.name}?`)) return;
    setTogglingStatus(true);
    try {
      const { data } = await api.patch(`/users/${student._id}`, { isActive: next });
      toast.success(`Student ${next ? 'activated' : 'deactivated'}`);
      setStudents((prev) => prev.map((s) => (s._id === student._id ? { ...s, isActive: data.user.isActive } : s)));
      setPanelFor((prev) => (prev && prev._id === student._id ? { ...prev, isActive: data.user.isActive } : prev));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 justify-between mb-5">
        <input
          className="input sm:w-72"
          placeholder="Search by name, roll no, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={exportReport} disabled={exporting} className="btn-secondary flex items-center gap-2">
          <FileSpreadsheet size={16} /> {exporting ? 'Generating…' : 'Export NSS report'}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-primary-100">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Roll No.</th>
              <th className="py-2 pr-4">Branch/Year</th>
              <th className="py-2 pr-4">Hours</th>
              <th className="py-2 pr-4">Points</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr
                key={s._id}
                onClick={() => openPanel(s)}
                className="border-b border-primary-50 last:border-0 cursor-pointer hover:bg-primary-50/50 transition-colors"
              >
                <td className="py-2.5 pr-4 font-medium">{s.name}</td>
                <td className="py-2.5 pr-4 text-ink/60">{s.rollNo}</td>
                <td className="py-2.5 pr-4 text-ink/60">{s.branch} · Y{s.year}</td>
                <td className="py-2.5 pr-4">{s.totalHours}</td>
                <td className="py-2.5 pr-4">{s.totalPoints}</td>
                <td className="py-2.5 pr-4">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={!!s.isActive} readOnly className="accent-primary-600 pointer-events-none" />
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-2.5 pr-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => issueCertificate(s._id)} className="text-primary-600 hover:underline flex items-center gap-1 text-xs">
                      <Award size={14} /> Certificate
                    </button>
                    <button
                      onClick={() => toggleStatus(s)}
                      disabled={togglingStatus}
                      className={`hover:underline flex items-center gap-1 text-xs ${s.isActive ? 'text-red-600' : 'text-green-600'}`}
                    >
                      <Power size={14} /> {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="text-ink/50 text-sm py-4 text-center">No students found.</p>}
      </div>

      {/* Combined edit + participation panel */}
      {panelFor && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4" onClick={closePanel}>
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={closePanel} className="absolute right-4 top-4 text-ink/40 hover:text-ink">
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-xl text-primary-900">{panelFor.name}</h3>
              <span className="inline-flex items-center gap-1 text-xs">
                <input type="checkbox" checked={!!panelFor.isActive} readOnly className="accent-primary-600 pointer-events-none" />
                {panelFor.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-ink/50 mb-4">{panelFor.rollNo} · {panelFor.branch} · Y{panelFor.year}</p>

            {/* Edit form */}
            {editForm && (
              <div className="mb-6 border border-primary-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5"><Pencil size={14} /> Edit profile</p>
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="Name" value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  <input className="input" placeholder="Roll No." value={editForm.rollNo}
                    onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })} />
                  <input className="input" placeholder="Branch" value={editForm.branch}
                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })} />
                  <input className="input" placeholder="Year" value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} />
                  <input className="input col-span-2" placeholder="Email" value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={saveEdit} disabled={saving} className="btn-primary flex items-center gap-2 text-xs">
                    <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    onClick={() => toggleStatus(panelFor)}
                    disabled={togglingStatus}
                    className={`flex items-center gap-2 text-xs hover:underline ${panelFor.isActive ? 'text-red-600' : 'text-green-600'}`}
                  >
                    <Power size={14} /> {panelFor.isActive ? 'Deactivate student' : 'Activate student'}
                  </button>
                </div>
              </div>
            )}

            {loadingActivity && <p className="text-sm text-ink/50">Loading activity…</p>}

            {activity && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-primary-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-primary-800">{activity.student.totalHours}</p>
                    <p className="text-xs text-ink/50">Hours</p>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-primary-800">{activity.student.totalPoints}</p>
                    <p className="text-xs text-ink/50">Points</p>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-primary-800">{activity.attendance.length}</p>
                    <p className="text-xs text-ink/50">Events attended</p>
                  </div>
                </div>

                <p className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5"><Activity size={14} /> Event attendance</p>
                <ul className="space-y-2 mb-6">
                  {activity.attendance.map((a) => (
                    <li key={a._id} className="flex items-center justify-between text-sm border-b border-primary-50 pb-2">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-primary-500" />
                        <span>{a.event?.title || 'Deleted event'}</span>
                      </div>
                      <span className="text-xs text-ink/50">{format(new Date(a.checkedInAt), 'MMM d, p')} · {a.method}</span>
                    </li>
                  ))}
                  {activity.attendance.length === 0 && <p className="text-xs text-ink/40">No event check-ins yet.</p>}
                </ul>

                <p className="text-sm font-semibold text-ink mb-2">Approved tasks</p>
                <ul className="space-y-2">
                  {activity.submissions.map((s) => (
                    <li key={s._id} className="flex items-center justify-between text-sm border-b border-primary-50 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-600" />
                        <span>{s.task?.title || 'Deleted task'}</span>
                      </div>
                      <span className="text-xs text-ink/50">{format(new Date(s.reviewedAt), 'MMM d, yyyy')}</span>
                    </li>
                  ))}
                  {activity.submissions.length === 0 && <p className="text-xs text-ink/40">No approved tasks yet.</p>}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}