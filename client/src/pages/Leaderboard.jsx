import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Trophy } from 'lucide-react';
import clsx from 'clsx';

const medalColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

export default function Leaderboard() {
  const { user } = useAuth();
  const [list, setList] = useState([]);

  useEffect(() => { api.get('/dashboard/leaderboard').then((r) => setList(r.data.leaderboard)); }, []);

  return (
    <Layout title="Leaderboard">
      <div className="card max-w-2xl">
        <ul className="divide-y divide-primary-50">
          {list.map((s) => (
            <li key={s._id} className={clsx('py-3 flex items-center gap-4', s._id === user?._id && 'bg-primary-50 -mx-5 px-5 rounded-xl')}>
              <div className="w-8 text-center font-semibold text-ink/60">
                {s.rank <= 3 ? <Trophy size={18} className={medalColors[s.rank - 1]} /> : s.rank}
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink">{s.name}</p>
                <p className="text-xs text-ink/50">{s.branch} · Y{s.year}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary-700">{s.totalPoints} pts</p>
                <p className="text-xs text-ink/50">{s.totalHours} hrs</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
