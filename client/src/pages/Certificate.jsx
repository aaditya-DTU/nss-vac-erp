import React, { useEffect, useState } from 'react';
import { usePageTitle } from '../context/PageTitleContext';
import api from '../api/axios';
import { Award, Download, ShieldCheck, Loader2, CalendarDays, Hash, Share2 } from 'lucide-react';
import { format } from 'date-fns';

function Seal() {
  // CSS/SVG-drawn embossed seal — no image asset required.
  // Swap for <img src="/nss-seal.png" /> if you have an official stamp graphic.
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#B08D2B" strokeWidth="2" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#B08D2B" strokeWidth="1" strokeDasharray="2 3" />
        <path
          id="sealArcTop"
          d="M 15 50 A 35 35 0 0 1 85 50"
          fill="none"
        />
        <text fontSize="7" fill="#8A6D1F" fontWeight="600" letterSpacing="1.5">
          <textPath href="#sealArcTop" startOffset="50%" textAnchor="middle">
            NSS · DTU · VERIFIED
          </textPath>
        </text>
        <circle cx="50" cy="50" r="26" fill="#FBF3DC" stroke="#B08D2B" strokeWidth="1.5" />
        <ShieldCheckPath />
      </svg>
    </div>
  );
}

function ShieldCheckPath() {
  return (
    <g transform="translate(38,38) scale(1)">
      <path
        d="M12 1 L21 5 V11 C21 16 17 20 12 22 C7 20 3 16 3 11 V5 Z"
        fill="none"
        stroke="#8A6D1F"
        strokeWidth="1.4"
      />
      <path d="M8 12 L11 15 L16 9" fill="none" stroke="#8A6D1F" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

export default function Certificate() {
  usePageTitle("My Certificate");
  const [cert, setCert] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | not-issued | issued

  useEffect(() => {
    api
      .get('/certificates/me')
      .then((r) => {
        setCert(r.data.certificate);
        setStatus('issued');
      })
      .catch(() => setStatus('not-issued'));
  }, []);

  return (
    <>
      {status === 'loading' && (
        <div className="card max-w-2xl mx-auto py-16 flex flex-col items-center gap-3 text-ink/50">
          <Loader2 size={28} className="animate-spin text-primary-500" />
          <p className="text-sm">Checking your certificate status…</p>
        </div>
      )}

      {status === 'not-issued' && (
        <div className="card max-w-lg mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-5">
            <Award size={30} className="text-primary-400" />
          </div>
          <h3 className="font-display text-xl text-primary-900 mb-2">Not issued yet</h3>
          <p className="text-sm text-ink/60 leading-relaxed max-w-sm mx-auto">
            Once you complete the required NSS hours, your coordinator will issue your certificate here —
            or check back once your progress hits 100%.
          </p>
        </div>
      )}

      {status === 'issued' && cert && (
        <div className="max-w-3xl mx-auto">
          {/* Certificate preview */}
          <div className="relative bg-white rounded-2xl border-[3px] border-primary-100 p-1">
            <div className="border border-primary-200 rounded-xl px-8 py-10 sm:px-12 sm:py-12 relative overflow-hidden">
              {/* Corner flourishes */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary-300 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-primary-300 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-primary-300 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary-300 rounded-br-xl" />

              {/* Header: dual logos */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  {/* Replace with <img src="/dtu-logo.png" className="w-10 h-10" /> */}
                  <div className="w-10 h-10 rounded-full bg-primary-700 text-white flex items-center justify-center text-[10px] font-bold">
                    DTU
                  </div>
                  <div className="text-left leading-tight">
                    <p className="text-[11px] font-semibold text-primary-900">Delhi Technological University</p>
                    <p className="text-[10px] text-ink/40">Formerly Delhi College of Engineering</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right leading-tight">
                    <p className="text-[11px] font-semibold text-primary-900">National Service Scheme</p>
                    <p className="text-[10px] text-ink/40">Value Added Course</p>
                  </div>
                  {/* Replace with <img src="/nss-logo.png" className="w-10 h-10" /> */}
                  <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                    NSS
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.25em] text-primary-500 mb-3">Certificate of Completion</p>
                <h2 className="font-display text-2xl sm:text-3xl text-primary-900 mb-4">
                  {cert.studentName || 'Certificate Holder'}
                </h2>
                <p className="text-sm text-ink/60 max-w-md mx-auto leading-relaxed mb-1">
                  has successfully completed the required community service hours under the
                  NSS Value Added Course at Delhi Technological University.
                </p>
                {cert.totalHours && (
                  <p className="text-sm text-primary-700 font-medium mt-3">{cert.totalHours} hours of verified service</p>
                )}
              </div>

              {/* Footer: seal, ID, date */}
              <div className="flex items-end justify-between mt-10 pt-6 border-t border-dashed border-primary-200">
                <div className="text-left space-y-1.5">
                  <p className="text-[11px] text-ink/50 flex items-center gap-1.5">
                    <Hash size={12} /> {cert.certificateId}
                  </p>
                  {cert.issuedAt && (
                    <p className="text-[11px] text-ink/50 flex items-center gap-1.5">
                      <CalendarDays size={12} /> Issued {format(new Date(cert.issuedAt), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <Seal />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <a
              href={cert.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Download size={16} /> Download PDF
            </a>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/verify?id=${cert.certificateId}`);
              }}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Share2 size={16} /> Copy verification link
            </button>
          </div>

          <p className="text-center text-xs text-ink/40 mt-4">
            Anyone can verify this certificate at{' '}
            <span className="text-primary-600 font-medium">/verify</span> using the certificate ID above.
          </p>
        </div>
      )}
    </>
  );
}