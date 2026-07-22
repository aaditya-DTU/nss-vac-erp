import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp, Archive } from 'lucide-react';
import clsx from 'clsx';

/**
 * Common "ledger" strip for items that have passed their deadline/end time
 * (past tasks, past events, ...). Sits at the bottom of a page, below the
 * live/active cards grid.
 *
 * items: [{
 *   id: string,
 *   title: string,
 *   meta?: string,
 *   badge?: string,
 *   badgeClass?: string,
 * }]
 */
export default function Ledger({
  title = 'Ledger',
  icon: Icon = History,
  items = [],
  onItemClick,
  defaultOpen = false,
  emptyText = null,
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!items.length && !emptyText) return null;

  return (
    <div className="mt-8 border-t border-primary-100 pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink transition-colors"
      >
        <Icon size={16} />
        {title}
        <span className="badge bg-primary-50 text-primary-700">{items.length}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-3">
          {items.length === 0 ? (
            <p className="text-sm text-ink/40 flex items-center gap-2">
              <Archive size={14} /> {emptyText}
            </p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onItemClick?.(it)}
                  className="card !p-3 text-left opacity-70 hover:opacity-100 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-ink text-sm truncate">{it.title}</h4>
                    {it.badge && (
                      <span className={clsx('badge shrink-0', it.badgeClass || 'bg-ink/5 text-ink/50')}>
                        {it.badge}
                      </span>
                    )}
                  </div>
                  {it.meta && <p className="text-xs text-ink/50 truncate">{it.meta}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}