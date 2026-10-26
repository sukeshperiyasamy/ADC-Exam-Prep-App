'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Lock, CheckCircle2, Folder, FolderOpen, FileText } from 'lucide-react';
import type { ChapterHierarchyItem, SectionGroup } from '@/lib/booklet/toc';

interface BookletTableOfContentsProps<T extends ChapterHierarchyItem> {
  bookletSlug: string;
  groups: SectionGroup<T>[];
  /** Highlights the chapter the reader currently has open. */
  currentChapterSlug?: string;
}

/** Global sequential chapter numbering across groups. */
function useNumbering() {
  let n = 0;
  return () => ++n;
}

export function BookletTableOfContents<T extends ChapterHierarchyItem>({
  bookletSlug,
  groups,
  currentChapterSlug
}: BookletTableOfContentsProps<T>) {
  // All sections expanded by default so users immediately see content
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of groups) initial[g.id] = true;
    return initial;
  });

  const allExpanded = groups.length > 0 && groups.every((g) => expandedSections[g.id]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    for (const g of groups) next[g.id] = expand;
    setExpandedSections(next);
  };

  const nextNumber = useNumbering();

  return (
    <div className="mt-6">
      {/* Controls Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {`Table of Contents (${groups.reduce((acc, g) => acc + g.chapters.length, 0)} chapters in ${groups.length} sections)`}
        </h2>
        <button
          type="button"
          onClick={() => setAll(!allExpanded)}
          className="rounded px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <p className="mb-3 px-1 text-xs text-slate-500 dark:text-slate-400">
        Section groupings are curated for navigation and reconstructed from the source PDF — they may not reflect the
        publisher&apos;s original table of contents.
      </p>

      {/* Sections List */}
      <div className="space-y-4">
        {groups.map((group, groupIdx) => {
          const isExpanded = !!expandedSections[group.id];
          const groupPct = Math.round((group.completedCount / group.totalChapters) * 100);

          return (
            <div key={group.id} className="card overflow-hidden">
              {/* Section Header Button */}
              <button
                type="button"
                onClick={() => toggleSection(group.id)}
                aria-expanded={isExpanded}
                aria-controls={`section-content-${group.id}`}
                className="w-full rounded-t-xl p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                      <span className="text-xs font-bold">{groupIdx + 1}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">
                        {group.title}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{`${group.totalChapters} chapter${group.totalChapters === 1 ? '' : 's'}`}</span>
                        <span aria-hidden>·</span>
                        <span>{`PDF pp. ${group.pdfPageFrom}–${group.pdfPageTo}`}</span>
                        {group.completedCount > 0 && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="font-medium text-green-700 dark:text-green-400">
                              {group.completedCount}/${group.totalChapters} completed
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {group.completedCount > 0 && (
                      <div className="hidden items-center gap-2 sm:flex" aria-hidden>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${groupPct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{groupPct}%</span>
                      </div>
                    )}
                    <span className="text-slate-400">
                      {isExpanded ? <ChevronDown className="h-5 w-5" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
                    </span>
                  </div>
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div
                  id={`section-content-${group.id}`}
                  className="border-t border-slate-100 bg-slate-50/50 p-2 sm:p-3 dark:border-slate-800/60 dark:bg-slate-950/30"
                >
                  <ul className="space-y-1.5">
                    {group.chapters.map((c) => {
                      const current = c.slug === currentChapterSlug;
                      const locked = !c.access.ok;
                      const completed = !!c.progress?.completedAt;
                      const pct = c.progress?.completedAt
                        ? 100
                        : Math.min(100, Math.round(((c.progress?.completedModes.length ?? 0) / 7) * 100));
                      const inner = (
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              current
                                ? 'bg-brand-600 text-white'
                                : completed
                                  ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {nextNumber()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  current ? 'text-brand-800 dark:text-brand-200' : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {c.title}
                              </span>
                              {current && (
                                <span className="badge bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
                                  Current
                                </span>
                              )}
                              {c.isFreePreview && (
                                <span className="badge bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300">
                                  Free preview
                                </span>
                              )}
                              {!c.live && <span className="badge">Draft (admin)</span>}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              PDF pp. {c.pdfPageFrom}–{c.pdfPageTo} · {c.mcqCount} MCQ{c.mcqCount === 1 ? '' : 's'}
                            </div>
                            {!locked && pct > 0 && pct < 100 && (
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${pct}%` }} />
                              </div>
                            )}
                          </div>
                          {locked ? (
                            <Lock className="h-4 w-4 text-slate-400" aria-label="Locked" />
                          ) : completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="Completed" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                          )}
                        </div>
                      );

                      return (
                        <li key={c.id}>
                          {locked ? (
                            <div className={`rounded-lg p-3 ${current ? 'ring-1 ring-brand-400 dark:ring-brand-500' : ''} bg-white opacity-70 dark:bg-slate-900`}>
                              {inner}
                            </div>
                          ) : (
                            <Link
                              href={`/user-dashboard/study/${bookletSlug}/${c.slug}`}
                              aria-current={current ? 'page' : undefined}
                              className={`card-hover block rounded-lg p-3 ${
                                current ? 'ring-1 ring-brand-500 dark:ring-brand-400' : ''
                              }`}
                            >
                              {inner}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact chapter rail for the chapter reader (desktop sidebar). */
export function ChapterRail<T extends ChapterHierarchyItem>({
  bookletSlug,
  groups,
  currentChapterSlug
}: BookletTableOfContentsProps<T>) {
  const nextNumber = useNumbering();
  return (
    <nav aria-label="Chapters" className="card max-h-[calc(100vh-8rem)] overflow-y-auto p-3">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <FileText className="h-3.5 w-3.5" /> Chapters
      </p>
      <div className="space-y-3">
        {groups.map((group, gi) => (
          <div key={group.id}>
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {`${gi + 1}. ${group.title}`}
            </p>
            <ul className="space-y-0.5">
              {group.chapters.map((c) => {
                const current = c.slug === currentChapterSlug;
                const locked = !c.access.ok;
                const completed = !!c.progress?.completedAt;
                return (
                  <li key={c.id}>
                    {locked ? (
                      <span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <span className="w-4 shrink-0 text-right tabular-nums">{nextNumber()}</span>
                        <span className="truncate">{c.title}</span>
                        <Lock className="ml-auto h-3 w-3 shrink-0" aria-label="Locked" />
                      </span>
                    ) : (
                      <Link
                        href={`/user-dashboard/study/${bookletSlug}/${c.slug}`}
                        aria-current={current ? 'page' : undefined}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
                          current
                            ? 'bg-brand-50 font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                        }`}
                      >
                        <span className="w-4 shrink-0 text-right tabular-nums opacity-70">{nextNumber()}</span>
                        <span className="truncate">{c.title}</span>
                        {completed && <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-green-600" aria-label="Completed" />}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
