'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import type { MyExamsListItem } from '@/lib/my-exams';

export function MyExamsList({ items, cols = 2 }: { items: MyExamsListItem[]; cols?: 2 | 3 }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          No mock tests are assigned yet.
        </p>
        <Link href="/practice-exams" className="btn-primary-grad mt-4 inline-flex items-center gap-1">
          Browse mock tests →
        </Link>
      </div>
    );
  }

  const gridCols = cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2';
  const bundleExpandedSpan = cols === 3 ? 'sm:col-span-2 lg:col-span-3' : 'sm:col-span-2';
  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {items.map(item => {
        if (item.kind === 'bundle') {
          const b = item.data;
          const isOpen = expanded.has(b.bundleId);
          const totalQs = b.items.reduce((s, x) => s + x.questionCount, 0);
          return (
            <div
              key={`b-${b.bundleId}`}
              className={`card flex flex-col p-4 transition ${isOpen ? `${bundleExpandedSpan} border-blue-300 dark:border-blue-500/60` : ''}`}
            >
              <button
                onClick={() => toggle(b.bundleId)}
                className="-m-1 flex flex-1 flex-col rounded-md p-1 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                aria-expanded={isOpen}
              >
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="badge-brand">{b.vendorName}</span>
                  <span className="badge">{b.code}</span>
                  <span className="badge">{b.level}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold">{b.bundleTitle}</h3>
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}
                  />
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {b.items.length} practice exam{b.items.length === 1 ? '' : 's'} · {totalQs} total questions
                </div>
              </button>

              {isOpen && (
                <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <ul className="space-y-2">
                    {b.items.map((row, i) => (
                      <li
                        key={row.entitlementId}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium">Practice Exam {i + 1}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {row.questionCount} questions · {row.durationMinutes} min
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/practice-exams/${row.vendorSlug}/${row.examSlug}`}
                          className="btn-primary-grad shrink-0 text-xs"
                        >
                          Open
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }

        // Standalone — single-variant card with an Open button.
        const e = item.data;
        return (
          <div key={`e-${e.entitlementId}`} className="card flex flex-col p-4">
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="badge-brand">{e.vendorName}</span>
              <span className="badge">{e.examCode}</span>
              <span className="badge bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                Practice access
              </span>
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold">{e.examTitle}</h3>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {e.questionCount} questions · {e.durationMinutes} min
            </div>
            <div className="mt-auto pt-3">
              <Link
                href={`/practice-exams/${e.vendorSlug}/${e.examSlug}`}
                className="btn-primary-grad w-full text-sm"
              >
                Open exam
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

