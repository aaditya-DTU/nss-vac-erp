import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../context/PageTitleContext';
import api from '../../api/axios';
import { format } from 'date-fns';
import clsx from 'clsx';

const statusStyles = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  resubmit_requested: 'bg-orange-100 text-orange-700',
  none: 'bg-primary-100 text-primary-700',
};

export default function Tasks() {
  usePageTitle("My Tasks");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get('/tasks').then((r) => setTasks(r.data.tasks));
  }, []);

  return (
    <>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {tasks.map((t) => {
          const status = t.mySubmission?.status || 'none';
          const overdue = new Date(t.deadline) < new Date() && status === 'none';
          return (
            <Link to={`/tasks/${t._id}`} key={t._id} className="card hover:shadow-lg transition-shadow block">
              <div className="flex items-start justify-between mb-3">
                <span className="badge bg-primary-50 text-primary-700 capitalize">{t.category.replace('_', ' ')}</span>
                <span className={clsx('badge', statusStyles[status])}>{status === 'none' ? 'Not started' : status.replace('_', ' ')}</span>
              </div>
              <h3 className="font-semibold text-ink mb-1">{t.title}</h3>
              <p className="text-sm text-ink/60 line-clamp-2 mb-4">{t.description}</p>
              <div className="flex items-center justify-between text-xs text-ink/50">
                <span>{t.points} pts · {t.hoursWorth} hrs</span>
                <span className={overdue ? 'text-red-500 font-medium' : ''}>
                  Due {format(new Date(t.deadline), 'MMM d, yyyy')}
                </span>
              </div>
            </Link>
          );
        })}
        {tasks.length === 0 && <p className="text-ink/50">No tasks assigned yet.</p>}
      </div>
    </>
  );
}
