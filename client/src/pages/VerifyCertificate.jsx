import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ShieldCheck, ShieldX, Search } from 'lucide-react';
import { format } from 'date-fns';

// Deliberately outside the authenticated app shell — this is the page a
// recruiter or the university office lands on from the QR code printed on
// the certificate itself, so it must work with zero login.
export default function VerifyCertificate() {
  const { certificateId } = useParams();
  const navigate = useNavigate();
  const [id, setId] = useState(certificateId || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const verify = async (targetId) => {
    if (!targetId) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get(`/certificates/verify/${targetId}`);
      setResult(data);
    } catch (err) {
      setResult(err.response?.data || { valid: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certificateId) verify(certificateId);
  }, [certificateId]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/verify/${id}`);
    verify(id);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md card">
        <p className="text-xs uppercase tracking-widest text-primary-500 text-center mb-1">NSS VAC · DTU</p>
        <h1 className="font-display text-2xl text-primary-900 text-center mb-6">Certificate Verification</h1>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input className="input flex-1" placeholder="Enter certificate ID" value={id} onChange={(e) => setId(e.target.value)} />
          <button className="btn-primary !px-3"><Search size={18} /></button>
        </form>

        {loading && <p className="text-center text-ink/50 text-sm">Checking…</p>}

        {!loading && searched && result && (
          result.valid ? (
            <div className="text-center">
              <ShieldCheck size={48} className="text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-green-700 mb-4">This certificate is valid</p>
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
              <ShieldX size={48} className="text-red-500 mx-auto mb-3" />
              <p className="font-semibold text-red-600">No certificate found with this ID</p>
              <p className="text-sm text-ink/50 mt-1">Double-check the ID or contact the NSS coordinator.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
