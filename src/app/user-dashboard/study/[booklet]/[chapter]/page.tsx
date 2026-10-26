import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronDown, ChevronRight, FileText, Lock } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { loadChapterForStudent, loadBookletForStudent, resolveViewer } from '@/lib/booklet/queries';
import { buildBookletHierarchy } from '@/lib/booklet/toc';
import { BookmarkButton, FlashcardDeck, ModeCompleteButton, StartAttemptButton, PdfSourceCitation } from '@/components/booklet/client';
import { ChapterRail } from '@/components/booklet/toc';

export const dynamic = 'force-dynamic';

const MODES = [
  { key: 'notes', label: 'Easy Notes' },
  { key: 'summary', label: 'Short Summary' },
  { key: 'concepts', label: 'Key concepts' },
  { key: 'tables', label: 'Tables' },
  { key: 'flowcharts', label: 'Flowcharts' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'mcqs', label: 'MCQs' }
] as const;

function shortTitle(t: string, max = 34): string {
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export default async function ChapterPage({
  params,
  searchParams
}: {
  params: Promise<{ booklet: string; chapter: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { booklet: bslug, chapter: cslug } = await params;
  const { mode: modeParam } = await searchParams;
  const mode = MODES.find((m) => m.key === modeParam)?.key ?? 'notes';
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect(`/login?next=/user-dashboard/study/${bslug}/${cslug}`);
  const viewer = await resolveViewer(session, null);

  const r = await loadChapterForStudent(bslug, cslug, viewer);
  if (r.status === 'not-found' || r.status === 'unpublished') notFound();
  if (r.status === 'login-required') redirect('/login');
  if (r.status === 'purchase-required') {
    const bundle = r.booklet?.accessExamId
      ? await db.bundle.findFirst({ where: { published: true, items: { some: { examId: r.booklet.accessExamId } } }, select: { id: true } })
      : null;
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{r.chapter?.title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This chapter is part of the paid study booklet.</p>
        <Link href={bundle ? `/checkout/bundle/${bundle.id}?tier=PRACTICE` : '/practice-exams'} className="btn-primary-grad mt-5 inline-flex">Unlock this booklet</Link>
        <div className="mt-3"><Link href={`/user-dashboard/study/${bslug}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">← Back to chapters</Link></div>
      </div>
    );
  }
  if (r.status !== 'ok') notFound();

  const { booklet, chapter, items, figures, mcqCount, progress, bookmarks, pages } = r;
  const printedObj = Object.fromEntries(pages.map((p) => [p.pdfPage, p.printedPage]));
  const cite = (ps: number[]) =>
    ps.length ? (
      <PdfSourceCitation
        bookletSlug={booklet.slug}
        chapterSlug={chapter.slug}
        bookletTitle={booklet.title}
        chapterTitle={chapter.title}
        pages={ps}
        printedPages={printedObj}
      />
    ) : null;
  const done = new Set(progress?.completedModes ?? []);
  const bm = new Set(bookmarks.map((b) => b.itemId));
  const of = <K extends string>(k: K) => items.filter((i) => i.kind === k);
  const data = (i: { data: unknown }) => i.data as any;

  const counts: Record<string, number> = {
    notes: of('NOTE').length,
    summary: of('SUMMARY').length,
    concepts: of('KEY_CONCEPT').length,
    tables: of('TABLE').length,
    flowcharts: of('FLOWCHART').length,
    flashcards: of('FLASHCARD').length,
    mcqs: mcqCount
  };
  const figuresByPage = (p: number[]) => figures.filter((f) => p.includes(f.pdfPage));

  // Sidebar TOC + linear prev/next across chapters the viewer can open.
  const lib = await loadBookletForStudent(booklet.slug, viewer);
  const groups = buildBookletHierarchy(booklet.slug, lib?.chapters ?? []);
  const readable = (lib?.chapters ?? []).filter((c) => c.access.ok);
  const idx = readable.findIndex((c) => c.slug === chapter.slug);
  const prev = idx > 0 ? readable[idx - 1] : null;
  const next = idx >= 0 && idx < readable.length - 1 ? readable[idx + 1] : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/user-dashboard/study" className="hover:text-slate-900 hover:underline dark:hover:text-slate-100">Study Library</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <Link href={`/user-dashboard/study/${booklet.slug}`} className="max-w-[24ch] truncate hover:text-slate-900 hover:underline dark:hover:text-slate-100">
            {booklet.title}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className="max-w-[28ch] truncate font-medium text-slate-900 dark:text-slate-100" aria-current="page">{chapter.title}</span>
        </nav>

        {/* Chapter header */}
        <header className="mt-3 max-w-3xl">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{chapter.title}</h1>
            <div className="flex shrink-0 items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <FileText className="h-3 w-3" aria-hidden />
                PDF pp. {chapter.pdfPageFrom}–{chapter.pdfPageTo}
              </span>
              {progress?.completedAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700 dark:bg-green-950/50 dark:text-green-300">
                  <CheckCircle2 className="h-3 w-3" aria-hidden /> Completed
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {done.size}/7 modes done
                </span>
              )}
            </div>
          </div>
          {!chapter.publishedAt && (
            <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Admin preview — this chapter is not published. Students cannot see it.
            </p>
          )}
        </header>

        {/* Mobile chapter list (desktop uses the right-hand rail) */}
        <details className="mt-4 max-w-3xl xl:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-900">
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-700 dark:text-brand-300" aria-hidden />
              Chapters
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
          </summary>
          <div className="mt-2">
            <ChapterRail bookletSlug={booklet.slug} groups={groups} currentChapterSlug={chapter.slug} />
          </div>
        </details>

        {/* Study-mode tabs */}
        <div className="sticky top-16 z-20 -mx-4 mt-5 bg-[#f7fbfb]/95 px-4 backdrop-blur sm:top-20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:bg-slate-950/95">
          <div className="max-w-3xl">
            <nav aria-label="Study modes" className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
              {MODES.map((m) => {
                const active = m.key === mode;
                return (
                  <Link
                    key={m.key}
                    href={`?mode=${m.key}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition ${
                      active
                        ? 'border-brand-600 font-semibold text-brand-700 dark:border-brand-400 dark:text-brand-300'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                    <span
                      className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                        active
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {counts[m.key]}
                    </span>
                    {done.has(m.key) && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-label="mode completed" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-6 max-w-3xl">
          {counts[mode] === 0 && (
            <div className="card p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Nothing has been published for “{MODES.find((m) => m.key === mode)?.label}” in this chapter yet.
            </div>
          )}

          {mode === 'summary' && counts.summary > 0 && (
            <div className="space-y-4">
              {of('SUMMARY').map((s) => (
                <section key={s.id} className="card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-[15px] font-semibold text-slate-950 dark:text-white">
                      Short Summary{cite(s.pages)}
                    </h2>
                    <BookmarkButton chapterId={chapter.id} itemId={s.id} label="Summary" pdfPage={s.pages[0]} initial={bm.has(s.id)} />
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{data(s).text}</p>
                </section>
              ))}
            </div>
          )}

          {mode === 'notes' && counts.notes > 0 && (
            <div className="space-y-4">
              {of('NOTE').map((n) => (
                <section key={n.id} className="card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-[15px] font-semibold text-slate-950 dark:text-white">{data(n).heading}{cite(n.pages)}</h2>
                    <BookmarkButton chapterId={chapter.id} itemId={n.id} label={data(n).heading} pdfPage={n.pages[0]} initial={bm.has(n.id)} />
                  </div>
                  <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 marker:text-brand-600 dark:text-slate-200 dark:marker:text-brand-400">
                    {(data(n).bullets as string[]).map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                  {figuresByPage(n.pages).map((f) => (
                    <figure key={f.id} className="mt-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/booklets/figures/${f.id}`} alt={f.caption || f.label} loading="lazy" className="max-h-96 w-full rounded border border-slate-200 object-contain dark:border-slate-700" />
                      <figcaption className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><span>{f.label} — {f.caption}</span>{cite([f.pdfPage])}</figcaption>
                    </figure>
                  ))}
                </section>
              ))}
            </div>
          )}

          {mode === 'concepts' && counts.concepts > 0 && (
            <ol className="space-y-2">
              {of('KEY_CONCEPT').map((k, i) => (
                <li key={k.id} className="card flex items-start gap-3 p-4 text-sm">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">{i + 1}</span>
                  <span className="min-w-0 flex-1 leading-relaxed text-slate-700 dark:text-slate-200">{data(k).point}{cite(k.pages)}</span>
                  <BookmarkButton chapterId={chapter.id} itemId={k.id} label={data(k).point.slice(0, 120)} pdfPage={k.pages[0]} initial={bm.has(k.id)} />
                </li>
              ))}
            </ol>
          )}

          {mode === 'tables' && counts.tables > 0 && (
            <div className="space-y-6">
              {of('TABLE').map((t) => (
                <section key={t.id}>
                  <h2 className="mb-2 text-[15px] font-semibold text-slate-950 dark:text-white">{data(t).title}{cite(t.pages)}</h2>
                  <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/60">
                        <tr>{(data(t).headers as string[]).map((h, i) => <th key={i} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {(data(t).rows as string[][]).map((row, ri) => (
                          <tr key={ri} className="border-t border-slate-200 dark:border-slate-700">{row.map((c, ci) => <td key={ci} className="px-3 py-2 align-top">{c}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}

          {mode === 'flowcharts' && counts.flowcharts > 0 && (
            <div className="space-y-8">
              {of('FLOWCHART').map((f) => (
                <section key={f.id}>
                  <h2 className="mb-3 text-[15px] font-semibold text-slate-950 dark:text-white">{data(f).title}{cite(f.pages)}</h2>
                  <ol className="space-y-1">
                    {(data(f).steps as { title: string; detail: string }[]).map((s, i, a) => (
                      <li key={i}>
                        <div className="card p-4">
                          <div className="text-sm font-semibold">{i + 1}. {s.title}</div>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.detail}</p>
                        </div>
                        {i < a.length - 1 && <div className="flex justify-center py-1 text-slate-400" aria-hidden><ArrowRight className="h-4 w-4 rotate-90" /></div>}
                      </li>
                    ))}
                  </ol>
                  {figuresByPage(f.pages).map((fig) => (
                    <figure key={fig.id} className="mt-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/booklets/figures/${fig.id}`} alt={fig.caption || fig.label} loading="lazy" className="max-h-[28rem] w-full rounded border border-slate-200 object-contain dark:border-slate-700" />
                      <figcaption className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><span>{fig.label} — {fig.caption}</span>{cite([fig.pdfPage])}</figcaption>
                    </figure>
                  ))}
                </section>
              ))}
            </div>
          )}

          {mode === 'flashcards' && counts.flashcards > 0 && (
            <FlashcardDeck cards={of('FLASHCARD').map((c) => ({ id: c.id, front: data(c).front, back: data(c).back, pages: c.pages }))} />
          )}

          {mode === 'mcqs' && counts.mcqs > 0 && (
            <div className="card p-6">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-950 dark:text-white">
                <BookOpen className="h-4 w-4 text-brand-700 dark:text-brand-300" /> Chapter questions
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {mcqCount} question{mcqCount === 1 ? '' : 's'} available. Answers and explanations (with PDF page references) are shown on the results page after you finish.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <StartAttemptButton slug={booklet.slug} kind="chapter" chapterId={chapter.id} mode="PRACTICE" label="Practice (untimed)" />
                <StartAttemptButton slug={booklet.slug} kind="chapter" chapterId={chapter.id} mode="EXAM" label="Timed quiz" className="btn-outline" />
              </div>
            </div>
          )}

          {mode !== 'mcqs' && counts[mode] > 0 && <ModeCompleteButton key={mode} chapterId={chapter.id} mode={mode} done={done.has(mode)} />}

          {/* Previous / next chapter navigation */}
          {(prev || next) && (
            <nav aria-label="Chapter navigation" className="mt-8 flex items-stretch justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              {prev ? (
                <Link href={`/user-dashboard/study/${booklet.slug}/${prev.slug}`} className="btn-outline group min-w-0 flex-1 items-start justify-start gap-1.5 text-left sm:flex-none sm:max-w-[48%]">
                  <ArrowLeft className="mt-0.5 h-4 w-4 shrink-0 transition group-hover:-translate-x-0.5" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Previous</span>
                    <span className="block truncate">{shortTitle(prev.title)}</span>
                  </span>
                </Link>
              ) : (
                <span aria-hidden className="flex-1 sm:flex-none" />
              )}
              {next ? (
                <Link href={`/user-dashboard/study/${booklet.slug}/${next.slug}`} className="btn-primary group min-w-0 flex-1 items-start justify-end gap-1.5 text-right sm:flex-none sm:max-w-[48%]">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-80">Next</span>
                    <span className="block truncate">{shortTitle(next.title)}</span>
                  </span>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
              ) : (
                <span aria-hidden className="flex-1 sm:flex-none" />
              )}
            </nav>
          )}

          {bookmarks.length > 0 && (
            <aside className="card mt-8 p-4">
              <h2 className="text-sm font-semibold">Your bookmarks in this chapter</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {bookmarks.map((b) => <li key={b.id}>• {b.label}{b.pdfPage ? ` (PDF p. ${b.pdfPage})` : ''}</li>)}
              </ul>
            </aside>
          )}
        </div>
      </div>

      {/* Desktop chapter sidebar */}
      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <ChapterRail bookletSlug={booklet.slug} groups={groups} currentChapterSlug={chapter.slug} />
        </div>
      </aside>
    </div>
  );
}
