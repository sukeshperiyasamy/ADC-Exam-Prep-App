import React from 'react';

export function QuestionStemView({
  stem,
  className = ''
}: {
  stem: string;
  className?: string;
}) {
  // Strip any lingering markdown artifact symbols like **, >, >> just in case
  const clean = stem
    .replace(/^[ \t]*>[ \t]*/gm, '')
    .replace(/>+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();

  // Check if stem has "Clinical Scenario:\n...\n\nQuestion: ..."
  const match = clean.match(/^Clinical Scenario:\s*([\s\S]*?)\n\nQuestion:\s*([\s\S]*)$/i);

  if (match) {
    const scenario = match[1].trim();
    const question = match[2].trim();

    return (
      <div className={`space-y-4 ${className}`}>
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4 text-sm text-slate-800 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-slate-200">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
            Clinical Scenario
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{scenario}</p>
        </div>
        <div className="text-base font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
          {question}
        </div>
      </div>
    );
  }

  return (
    <p className={`whitespace-pre-wrap text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100 ${className}`}>
      {clean}
    </p>
  );
}
