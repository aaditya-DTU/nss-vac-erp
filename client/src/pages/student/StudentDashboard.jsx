import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../context/PageTitleContext';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { format } from 'date-fns';
import { Clock, CheckCircle2, FileClock, Info } from 'lucide-react';

// Signature element: a hand-drawn-feeling progress ring that visualizes
// hours-completed vs. the VAC requirement — the one number every NSS
// student actually cares about.
function ProgressRing({ percent }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <circle cx="90" cy="90" r={r} stroke="#D6E9FF" strokeWidth="14" fill="none" />
      <circle
        cx="90" cy="90" r={r} stroke="#1565C0" strokeWidth="14" fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 90 90)" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="90" y="84" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0D47A1">{percent}%</text>
      <text x="90" y="106" textAnchor="middle" fontSize="12" fill="#5F6368">of hours logged</text>
    </svg>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const [data, setData] = useState(null);

  const load = () => api.get('/dashboard/student').then((r) => setData(r.data));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('ledger:update', load);
    return () => socket.off('ledger:update', load);
  }, [socket]);

  usePageTitle(data ? `Welcome, ${user.name.split(' ')[0]}` : 'Dashboard');

  if (!data) return <p className="text-ink/50">Loading…</p>;

  const { stats, upcomingTasks } = data;

  return (
    <>
      <div className="flex items-center justify-end -mt-2 mb-4">
        <Link
          to="/about"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-medium text-ink/60 hover:text-primary-600 hover:border-primary-300 transition-colors"
        >
          <Info size={14} />
          How it works & policies
        </Link>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card flex items-center gap-6 lg:col-span-1">
          <ProgressRing percent={stats.progressPercent} />
          <div>
            <p className="text-sm text-ink/60">{stats.totalHours} / {stats.requiredHours} hrs</p>
            <p className="text-sm text-ink/60 mt-1">{stats.totalPoints} points earned</p>
            {stats.certificateEligible && (
              <Link to="/certificate" className="badge bg-primary-100 text-primary-700 mt-3">Certificate eligible 🎉</Link>
            )}
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary-100"><FileClock className="text-primary-700" /></div>
          <div>
            <p className="text-2xl font-semibold text-ink">{stats.pendingSubmissions}</p>
            <p className="text-sm text-ink/60">Pending review</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary-100"><CheckCircle2 className="text-primary-700" /></div>
          <div>
            <p className="text-2xl font-semibold text-ink">{stats.approvedSubmissions}</p>
            <p className="text-sm text-ink/60">Approved tasks</p>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-primary-900">Upcoming deadlines</h3>
          <Link to="/tasks" className="text-sm text-primary-600 hover:underline">View all tasks</Link>
        </div>
        {upcomingTasks.length === 0 && <p className="text-sm text-ink/50">Nothing due soon. Nice work staying ahead.</p>}
        <ul className="divide-y divide-primary-50">
          {upcomingTasks.map((t) => (
            <li key={t._id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{t.title}</p>
                <p className="text-xs text-ink/50 capitalize">{t.category.replace('_', ' ')} · {t.points} pts · {t.hoursWorth} hrs</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-700">
                <Clock size={16} /> {format(new Date(t.deadline), 'MMM d')}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
