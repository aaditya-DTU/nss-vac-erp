import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { format } from 'date-fns';
import { Upload, Award, FileSpreadsheet, Activity, X, MapPin, CheckCircle2 } from 'lucide-react';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  // Attendance/contribution tracker — drills into one student's full
  // activity picture (event check-ins with timing + approved task history).
  const [activityFor, setActivityFor] = useState(null); // student being viewed
  const [activity, setActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const load = () => api.get('/users', { params: { role: 'student', search } }).then((r) => setStudents(r.data.users));
  useEffect(() => { load(); }, [search]);

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/users/bulk-import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${data.results.created} students, skipped ${data.results.skipped}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    }
  };

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

  const openActivity = async (student) => {
    setActivityFor(student);
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

  return (
    <Layout title="Students">
      <div className="flex flex-col sm:flex-row gap-3 justify-between mb-5">
        <input
          className="input sm:w-72"
          placeholder="Search by name, roll no, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="btn-secondary flex items-center gap-2 cursor-pointer">
          <Upload size={16} /> Bulk import CSV
          <input type="file" accept=".csv" hidden onChange={handleImport} />
        </label>
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
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s._id} className="border-b border-primary-50 last:border-0">
                <td className="py-2.5 pr-4 font-medium">{s.name}</td>
                <td className="py-2.5 pr-4 text-ink/60">{s.rollNo}</td>
                <td className="py-2.5 pr-4 text-ink/60">{s.branch} · Y{s.year}</td>
                <td className="py-2.5 pr-4">{s.totalHours}</td>
                <td className="py-2.5 pr-4">{s.totalPoints}</td>
                <td className="py-2.5 pr-4 flex items-center gap-3">
                  <button onClick={() => openActivity(s)} className="text-primary-600 hover:underline flex items-center gap-1 text-xs">
                    <Activity size={14} /> Attendance
                  </button>
                  <button onClick={() => issueCertificate(s._id)} className="text-primary-600 hover:underline flex items-center gap-1 text-xs">
                    <Award size={14} /> Certificate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="text-ink/50 text-sm py-4 text-center">No students found.</p>}
      </div>

      {/* Attendance/contribution tracker */}
      {activityFor && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4" onClick={() => { setActivityFor(null); setActivity(null); }}>
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setActivityFor(null); setActivity(null); }} className="absolute right-4 top-4 text-ink/40 hover:text-ink">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl text-primary-900 mb-1">{activityFor.name}</h3>
            <p className="text-xs text-ink/50 mb-4">{activityFor.rollNo} · {activityFor.branch} · Y{activityFor.year}</p>

            {loadingActivity && <p className="text-sm text-ink/50">Loading…</p>}

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

                <p className="text-sm font-semibold text-ink mb-2">Event attendance</p>
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
    </Layout>
  );
}