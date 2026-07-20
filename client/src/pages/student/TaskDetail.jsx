import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { format } from 'date-fns';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    api.get(`/tasks/${id}`).then((r) => {
      setTask(r.data.task);
      setMySubmission(r.data.mySubmission);
    });

  useEffect(() => { load(); }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('remarks', remarks);
      if (proofLink) form.append('proofLink', proofLink);
      if (file) form.append('proof', file);
      await api.post(`/submissions/tasks/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Submission sent for review!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!task) return <Layout title="Task"><p className="text-ink/50">Loading…</p></Layout>;

  const locked = mySubmission?.status === 'approved';

  return (
    <Layout title={task.title}>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <span className="badge bg-primary-50 text-primary-700 capitalize mb-3">{task.category.replace('_', ' ')}</span>
          <p className="text-ink/80 whitespace-pre-line">{task.description}</p>
          <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
            <div><p className="text-ink/50">Points</p><p className="font-semibold">{task.points}</p></div>
            <div><p className="text-ink/50">Hours</p><p className="font-semibold">{task.hoursWorth}</p></div>
            <div><p className="text-ink/50">Deadline</p><p className="font-semibold">{format(new Date(task.deadline), 'MMM d, yyyy')}</p></div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-lg text-primary-900 mb-3">
            {locked ? 'Submission approved ✅' : mySubmission ? 'Update your submission' : 'Submit your proof'}
          </h3>

          {mySubmission?.status === 'rejected' || mySubmission?.status === 'resubmit_requested' ? (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2 mb-3">{mySubmission.reviewNote || 'Please resubmit with valid proof.'}</p>
          ) : null}

          {!locked && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-ink/70">Remarks</label>
                <textarea className="input mt-1" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Proof link (optional)</label>
                <input className="input mt-1" placeholder="https://..." value={proofLink} onChange={(e) => setProofLink(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Upload file (image/PDF)</label>
                <input type="file" className="input mt-1" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Submitting…' : mySubmission ? 'Resubmit' : 'Submit proof'}
              </button>
            </form>
          )}

          {mySubmission && (
            <div className="mt-4 text-xs text-ink/50">
              Last submitted {format(new Date(mySubmission.submittedAt), 'MMM d, yyyy p')}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
