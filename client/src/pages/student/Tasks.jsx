import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../context/PageTitleContext';
import api from '../../api/axios';
import { format } from 'date-fns';
import clsx from 'clsx';
import Ledger from '../../components/ledger/Ledger';
import LedgerSummaryModal from '../../components/ledger/LedgerSummaryModal';

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

  // Past-tasks ledger: once the deadline passes, a task moves down here.
  // Clicking one shows the student their own final submission summary.
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);

  useEffect(() => {
    api.get('/tasks').then((r) => setTasks(r.data.tasks));
  }, []);

  const openTaskLedgerSummary = (item) => {
    const task = tasks.find((t) => t._id === item.id);
    if (!task) return;
    setLedgerData({ task });
    setLedgerOpen(true);
  };

  const now = new Date();
  const liveTasks = tasks.filter((t) => new Date(t.deadline) >= now);
  const pastTasks = tasks.filter((t) => new Date(t.deadline) < now);

  const ledgerItems = pastTasks
    .sort((a, b) => new Date(b.deadline) - new Date(a.deadline))
    .map((t) => {
      const status = t.mySubmission?.status || 'none';
      return {
        id: t._id,
        title: t.title,
        meta: `Due ${format(new Date(t.deadline), 'MMM d, yyyy')} · ${t.points} pts · ${t.hoursWorth} hrs`,
        badge: status === 'none' ? 'Missed' : status.replace('_', ' '),
        badgeClass: status === 'none' ? 'bg-red-100 text-red-700' : statusStyles[status],
      };
    });

  return (
    <>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {liveTasks.map((t) => {
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
        {liveTasks.length === 0 && <p className="text-ink/50">No active tasks assigned.</p>}
      </div>

      <Ledger title="Past tasks" items={ledgerItems} onItemClick={openTaskLedgerSummary} />

      <LedgerSummaryModal
        open={ledgerOpen}
        onClose={() => { setLedgerOpen(false); setLedgerData(null); }}
        title={ledgerData?.task ? `${ledgerData.task.title} — summary` : ''}
        subtitle={ledgerData?.task ? `Deadline was ${format(new Date(ledgerData.task.deadline), 'MMM d, yyyy')}` : ''}
        stats={
          ledgerData?.task
            ? [
                { label: 'Points', value: ledgerData.task.points },
                { label: 'Hours', value: ledgerData.task.hoursWorth },
              ]
            : []
        }
        rows={
          ledgerData?.task
            ? [
                {
                  id: 'me',
                  primary: ledgerData.task.mySubmission ? 'Your submission' : 'No submission made',
                  secondary:
                    ledgerData.task.mySubmission?.remarks ||
                    (ledgerData.task.mySubmission
                      ? undefined
                      : "You didn't submit proof before the deadline."),
                  note: ledgerData.task.mySubmission?.reviewNote
                    ? `Reviewer note: ${ledgerData.task.mySubmission.reviewNote}`
                    : undefined,
                  badge: (ledgerData.task.mySubmission?.status || 'missed').replace('_', ' '),
                  badgeClass:
                    statusStyles[ledgerData.task.mySubmission?.status] || 'bg-red-100 text-red-700',
                },
              ]
            : []
        }
        emptyText="No record for this task."
      />
    </>
  );
}