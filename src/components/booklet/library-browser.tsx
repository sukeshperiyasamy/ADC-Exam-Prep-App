'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Library as LibraryIcon, Lock, Search } from 'lucide-react';

export type LibraryCard = {
  id: string;
  slug: string;
  title: string;
  publisher: string | null;
  description: string | null;
  edition: string | null;
  chapterCount: number;
  completed: number;
  freePreviewCount: number;
  /** full = entitled · preview = free chapters available · locked = paid only · admin = draft preview */
  access: 'full' | 'preview' | 'locked' | 'admin';
  adminStatus?: string;
};

function accessBadge(c: LibraryCard): { label: string; badge: string } {
  switch (c.access) {
    case 'full':
      return { label: 'Full Access', badge: 'badge bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' };
    case 'preview':
      return {
        label: `Free Preview · ${c.freePreviewCount} ${c.freePreviewCount === 1 ? 'Chapter' : 'Chapters'} Free`,
        badge: 'badge bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
      };
    case 'locked':
      return { label: 'Purchase required', badge: 'badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    case 'admin':
      return { label: `Admin preview · ${c.adminStatus ?? 'DRAFT'}`, badge: 'badge bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' };
  }
}

const FILTERS: { key: 'all' | LibraryCard['access']; label: string }[] = [
  { key: 'all', label: 'All booklets' },
  { key: 'full', label: 'Full access' },
  { key: 'preview', label: 'Free preview' },
  { key: 'locked', label: 'Purchase required' }
];

function ctaLabel(c: LibraryCard): string {
  if (c.access === 'admin') return 'Open preview';
  if (c.completed === 0) return 'Start reading';
  if (c.completed < c.chapterCount) return 'Continue learning';
  return 'Review chapters';
}

export function LibraryBrowser({ items }: { items: LibraryCard[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | LibraryCard['access']>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((b) => {
      if (filter !== 'all' && b.access !== filter) return false;
      if (!q) return true;
      return [b.title, b.publisher, b.description, b.edition]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q));
    });
  }, [items, query, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const b of items) c[b.access] = (c[b.access] ?? 0) + 1;
    return c;
  }, [items]);

  return (
    <div>
      {/* Search + status filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search booklets…"
            aria-label="Search booklets"
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by access">
          {FILTERS.map(({ key, label }) => {
            const n = counts[key] ?? 0;
            if (key !== 'all' && n === 0) return null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`badge shrink-0 px-2.5 py-1 text-xs transition ${
                  filter === key
                    ? 'bg-brand-700 text-white dark:bg-brand-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {label} {key === 'all' ? `(${n})` : n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <LibraryIcon className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
          <p className="mt-3 font-medium">No booklets match your search.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try a different term or clear the filters.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {visible.map((b) => {
            const meta = accessBadge(b);
            const started = b.completed > 0;
            const pct = b.chapterCount ? Math.round((b.completed / b.chapterCount) * 100) : 0;
            return (
              <li key={b.id}>
                <Link
                  href={`/user-dashboard/study/${b.slug}`}
                  className="card-hover flex h-full flex-col p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-snug text-slate-950 dark:text-white">{b.title}</h2>
                    <span className={`badge shrink-0 ${meta.badge}`}>{meta.label}</span>
                  </div>

                  {(b.publisher || b.edition) && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {[b.publisher, b.edition].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {b.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {b.description}
                    </p>
                  )}

                  <div className="mt-auto pt-4">
                    {started && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Progress</span>
                          <span>{b.completed}/{b.chapterCount} chapters</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                      <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <BookOpen className="h-3.5 w-3.5" />
                        {b.chapterCount} chapter{b.chapterCount === 1 ? '' : 's'}
                        {b.access === 'admin' && b.adminStatus ? ` · ${b.adminStatus}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300">
                        {ctaLabel(b)}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
