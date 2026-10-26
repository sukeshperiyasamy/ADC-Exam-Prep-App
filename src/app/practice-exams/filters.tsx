'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

export type DomainStat = {
  domain: string;
  count: number;
};

export function CatalogFilters({
  q,
  selectedDomain,
  domains,
  totalQuestions
}: {
  q: string;
  selectedDomain: string;
  domains: DomainStat[];
  totalQuestions: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleDomainClick = (domain: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (domain && domain !== selectedDomain) {
        params.set('domain', domain);
      }
      const qs = params.toString();
      router.push(`/practice-exams${qs ? `?${qs}` : ''}`);
    });
  };

  const clearAll = () => {
    startTransition(() => {
      router.push('/practice-exams');
    });
  };

  return (
    <div className="mb-8 space-y-4">
      {/* Search Bar */}
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const query = (fd.get('q') as string || '').trim();
          startTransition(() => {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            if (selectedDomain) params.set('domain', selectedDomain);
            const qs = params.toString();
            router.push(`/practice-exams${qs ? `?${qs}` : ''}`);
          });
        }}
        className="flex max-w-2xl items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search clinical topics (e.g. TMJ, Endodontics, Amoxicillin, Trauma)..."
            className="input pl-10 pr-4 text-sm"
          />
        </div>
        <button type="submit" className="btn-primary-grad px-5 py-2 text-sm font-semibold shadow-sm">
          Search
        </button>
        {(q || selectedDomain) && (
          <button
            type="button"
            onClick={clearAll}
            className="btn-outline flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        )}
      </form>

      {/* Clinical Domain Pills */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Filter by Dental Specialty
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleDomainClick('')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              !selectedDomain
                ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-600'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Disciplines</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
              !selectedDomain ? 'bg-brand-800/80 text-brand-100' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {totalQuestions}
            </span>
          </button>

          {domains.map((d) => {
            const isSelected = selectedDomain === d.domain;
            return (
              <button
                key={d.domain}
                type="button"
                onClick={() => handleDomainClick(d.domain)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-600'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>{d.domain}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                  isSelected ? 'bg-brand-800/80 text-brand-100' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {d.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

