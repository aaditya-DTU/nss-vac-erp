import React from 'react';
import { X, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';

/**
 * "Overall summary" popup opened by clicking a ledger item.
 * stats: [{ label, value }]
 * rows:  [{ id, primary, secondary, note, badge, badgeClass }]
 * onDownload: optional — if provided, shows a "Download report" button
 * (e.g. admin exporting a past event's attendance as Excel).
 * extraActions: optional — extra header buttons rendered next to Download
 * report (e.g. a "Mark attendance manually" trigger).
 */
export default function LedgerSummaryModal({
  open,
  onClose,
  title,
  subtitle,
  stats = [],
  rows = [],
  loading = false,
  emptyText = 'No records.',
  onDownload,
  downloading = false,
  extraActions,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-ink/40 hover:text-ink">
          <X size={20} />
        </button>
        <div className="flex items-start justify-between gap-3 pr-8 mb-1">
          <h3 className="font-display text-xl text-primary-900">{title}</h3>
          <div className="shrink-0 flex items-center gap-2">
            {extraActions}
            {onDownload && (
              <button
                onClick={onDownload}
                disabled={downloading}
                className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileSpreadsheet size={14} /> {downloading ? 'Generating…' : 'Download report'}
              </button>
            )}
          </div>
        </div>
        {subtitle && <p className="text-xs text-ink/50 mb-4">{subtitle}</p>}

        {stats.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {stats.map((s, i) => (
              <span key={i} className="badge bg-primary-50 text-primary-700">
                {s.label}: {s.value}
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, i) => (
              <li
                key={row.id || i}
                className="border border-primary-100 rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink text-sm truncate">{row.primary}</p>
                  {row.secondary && <p className="text-xs text-ink/50 truncate">{row.secondary}</p>}
                  {row.note && <p className="text-xs text-ink/40 mt-1">{row.note}</p>}
                </div>
                {row.badge && (
                  <span className={clsx('badge shrink-0 capitalize', row.badgeClass || 'bg-primary-50 text-primary-700')}>
                    {row.badge}
                  </span>
                )}
              </li>
            ))}
            {rows.length === 0 && <p className="text-sm text-ink/50">{emptyText}</p>}
          </ul>
        )}
      </div>
    </div>
  );
}