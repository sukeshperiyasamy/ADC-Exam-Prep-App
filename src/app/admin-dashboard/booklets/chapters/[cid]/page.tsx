import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { chapterGateInfo } from '@/lib/booklet/admin-actions';
import { PageHeader } from '@/components/admin/page-header';
import { FigureRow, ImportPanel, ItemRow, McqRow, ProcessPanel, ReviewPanel } from '@/components/booklet/admin-client';

export const dynamic = 'force-dynamic';

const KIND_ORDER = ['SUMMARY', 'NOTE', 'KEY_CONCEPT', 'TABLE', 'FLOWCHART', 'FLASHCARD'] as const;

function summarize(kind: string, d: any): string {
  switch (kind) {
    case 'SUMMARY': return String(d.text).slice(0, 160);
    case 'NOTE': return `${d.heading} — ${(d.bullets ?? []).length} bullets`;
    case 'KEY_CONCEPT': return String(d.point);
    case 'TABLE': return `${d.title} (${(d.rows ?? []).length} rows)`;
    case 'FLOWCHART': return `${d.title} (${(d.steps ?? []).length} steps)`;
    default: return `${d.front} → ${d.back}`;
  }
}

export default async function AdminChapterPage({ params }: { params: Promise<{ cid: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/');
  const { cid } = await params;
  const exists = await db.bookletChapter.findUnique({ where: { id: cid }, select: { id: true } });
  if (!exists) notFound();
  const { chapter: c, gate } = await chapterGateInfo(cid);
  const [items, mcqs, figures, pages] = await Promise.all([
    db.bookletItem.findMany({ where: { chapterId: cid }, orderBy: { position: 'asc' } }),
    db.question.findMany({ where: { bookletChapterId: cid }, orderBy: { createdAt: 'asc' } }),
    db.bookletFigure.findMany({ where: { chapterId: cid }, orderBy: { pdfPage: 'asc' } }),
    db.bookletPage.findMany({ where: { chapterId: cid }, orderBy: { pdfPage: 'asc' } })
  ]);
  const issues = ((c.verification as any)?.issues ?? []) as any[];
  const expected = c.pdfPageTo - c.pdfPageFrom + 1;

  return (
    <div className="space-y-6">
      <PageHeader title={c.title} subtitle={`${c.booklet.title} · PDF pages ${c.pdfPageFrom}–${c.pdfPageTo}`} />
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={`/admin-dashboard/booklets/${c.bookletId}`} className="text-blue-700 hover:underline dark:text-blue-300">← Booklet</Link>
        <Link href={`/user-dashboard/study/${c.booklet.slug}/${c.slug}`} className="text-blue-700 hover:underline dark:text-blue-300" target="_blank">Preview as student ↗</Link>
      </div>

      <ProcessPanel chapterId={c.id} status={c.processStatus} stage={c.processStage} error={c.processError} published={!!c.publishedAt} />
      <div className="card p-4 text-xs text-slate-600 dark:text-slate-300">
        Transcribed pages: <b>{pages.length}/{expected}</b> · Items: <b>{items.length}</b> · MCQs: <b>{mcqs.length}</b> · Figures: <b>{figures.length}</b>
        {c.model && <> · Model: <b>{c.model}</b></>}
        {pages.length < expected && <span className="ml-2 text-amber-700">Incomplete: {expected - pages.length} page(s) not yet transcribed.</span>}
      </div>
      <ImportPanel chapterId={c.id} disabled={!!c.publishedAt} />

      <ReviewPanel
        chapterId={c.id}
        reviewStatus={c.reviewStatus}
        reviewerName={c.reviewerName ?? ''}
        published={!!c.publishedAt}
        blockers={gate}
        issues={issues}
      />

      {KIND_ORDER.map((k) => {
        const list = items.filter((i) => i.kind === k);
        if (!list.length) return null;
        return (
          <section key={k}>
            <h2 className="mb-2 text-lg font-semibold">{k.replace('_', ' ')} <span className="text-sm font-normal text-slate-500">({list.length})</span></h2>
            <ul className="space-y-2">{list.map((i) => <ItemRow key={i.id} id={i.id} kind={i.kind} status={i.status} summary={summarize(i.kind, i.data)} data={i.data} pages={i.pages} />)}</ul>
          </section>
        );
      })}

      {mcqs.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">MCQs <span className="text-sm font-normal text-slate-500">({mcqs.length})</span></h2>
          <ul className="space-y-2">
            {mcqs.map((q) => (
              <McqRow key={q.id} id={q.id} status={q.status} mcq={{ stem: q.stem, options: q.options as any, correct: q.correct as any, explanation: q.explanation, difficulty: q.difficulty, pages: q.sourcePages }} />
            ))}
          </ul>
        </section>
      )}

      {figures.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Figures <span className="text-sm font-normal text-slate-500">({figures.length})</span></h2>
          <ul className="space-y-2">{figures.map((f) => <FigureRow key={f.id} id={f.id} label={f.label} caption={f.caption} pdfPage={f.pdfPage} approved={f.approved} />)}</ul>
        </section>
      )}

      {pages.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-semibold">Source transcription (admin only — compare against the PDF)</summary>
          <div className="mt-3 space-y-4">
            {pages.map((p) => (
              <div key={p.id}>
                <div className="text-xs font-semibold text-slate-500">PDF page {p.pdfPage}{p.printedPage ? ` (printed ${p.printedPage})` : ''}</div>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs dark:bg-slate-800/60">{p.markdown}</pre>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
