import React, { useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { ShieldCheck, ShieldX, Search } from 'lucide-react';
import { format } from 'date-fns';

// In-app counterpart to the public /verify/:certificateId page — same
// backend endpoint, but wrapped in the admin Layout/Sidebar so a
// coordinator can verify a certificate without leaving the app or logging
// out to reach the public page.
export default function AdminVerifyCertificate() {
  const [id, setId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    if (!id.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get(`/certificates/verify/${id.trim()}`);
      setResult(data);
    } catch (err) {
      setResult(err.response?.data || { valid: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Verify Certificate">
      <div className="card max-w-md">
        <p className="text-sm text-ink/60 mb-4">
          Look up any NSS VAC certificate by its ID to confirm it's genuine — the same check anyone gets from the QR code printed on the certificate.
        </p>

        <form onSubmit={verify} className="flex gap-2 mb-6">
          <input
            className="input flex-1"
            placeholder="Enter certificate ID (e.g. NSS-DTU-2026-A1B2C3)"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <button className="btn-primary !px-3" disabled={loading}><Search size={18} /></button>
        </form>

        {loading && <p className="text-center text-ink/50 text-sm">Checking…</p>}

        {!loading && searched && result && (
          result.valid ? (
            <div className="text-center">
              <ShieldCheck size={40} className="text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-700 mb-4">Valid certificate</p>
              <div className="text-left text-sm bg-primary-50 rounded-xl p-4 space-y-1">
                <p><span className="text-ink/50">Name:</span> <strong>{result.certificate.studentName}</strong></p>
                <p><span className="text-ink/50">Branch / Year:</span> {result.certificate.branch} · Y{result.certificate.year}</p>
                <p><span className="text-ink/50">Hours completed:</span> {result.certificate.totalHours}</p>
                <p><span className="text-ink/50">Points:</span> {result.certificate.totalPoints}</p>
                <p><span className="text-ink/50">Issued:</span> {format(new Date(result.certificate.issuedAt), 'MMM d, yyyy')}</p>
                <p><span className="text-ink/50">Certificate ID:</span> {result.certificate.certificateId}</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <ShieldX size={40} className="text-red-500 mx-auto mb-2" />
              <p className="font-semibold text-red-600">No certificate found with this ID</p>
              <p className="text-sm text-ink/50 mt-1">Double-check the ID and try again.</p>
            </div>
          )
        )}
      </div>
    </Layout>
  );
}