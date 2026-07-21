import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../context/PageTitleContext';
import api from '../../api/axios';
import { Users, ListChecks, FileClock, CalendarDays } from 'lucide-react';

const COLORS = ['#1565C0', '#4C9AFF', '#90CAF9', '#0D47A1', '#2379E0', '#7FB8FF'];

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="card flex items-center gap-4">
    <div className="p-3 rounded-xl bg-primary-100"><Icon className="text-primary-700" size={22} /></div>
    <div>
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="text-sm text-ink/60">{label}</p>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/dashboard/admin').then((r) => setData(r.data)); }, []);

  // Hook must run every render regardless of the loading early-return below.
  usePageTitle(data ? 'NSS Command Centre' : 'Admin Dashboard');

  if (!data) return <p className="text-ink/50">Loading…</p>;

  const { stats, categoryBreakdown, recentSubmissions } = data;

  return (
    <>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard icon={Users} label="Active students" value={stats.totalStudents} />
        <StatCard icon={ListChecks} label="Active tasks" value={stats.activeTasks} />
        <StatCard icon={FileClock} label="Pending reviews" value={stats.pendingReviews} />
        <StatCard icon={CalendarDays} label="Upcoming events" value={stats.upcomingEvents} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="card lg:col-span-1">
          <h3 className="font-display text-lg text-primary-900 mb-2">Task categories</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryBreakdown} dataKey="count" nameKey="_id" outerRadius={80}>
                {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg text-primary-900">Awaiting review</h3>
            <Link to="/admin/tasks" className="text-sm text-primary-600 hover:underline">Review queue</Link>
          </div>
          <ul className="divide-y divide-primary-50">
            {recentSubmissions.map((s) => (
              <li key={s._id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-ink">{s.student?.name} <span className="text-ink/40">· {s.student?.rollNo}</span></p>
                  <p className="text-ink/50">{s.task?.title}</p>
                </div>
                <span className="badge bg-amber-100 text-amber-700">Pending</span>
              </li>
            ))}
            {recentSubmissions.length === 0 && <p className="text-ink/50 text-sm py-2">Review queue is clear 🎉</p>}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex gap-4 text-sm text-primary-700">
        <div className="card !py-3 !px-4">Total community hours logged: <strong>{stats.totalCommunityHours}</strong></div>
      </div>
    </>
  );
}