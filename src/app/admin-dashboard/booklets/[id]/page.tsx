import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/admin/page-header';
import { AddChapterForm, BookletMetaForm, SourceUpload } from '@/components/booklet/admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminBookletPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/');
  const { id } = await params;
  const b = await db.booklet.findUnique({
    where: { id },
    include: {
      accessExam: { select: { id: true, code: true, title: true } },
      chapters: {
        orderBy: { position: 'asc' },
        include: { _count: { select: { items: true, figures: true, questions: true } } }
      }
    }
  });
  if (!b) notFound();
  const bundles = b.accessExamId
    ? await db.bundle.findMany({ where: { items: { some: { examId: b.accessExamId } } }, select: { id: true, title: true, published: true } })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title={b.title} subtitle={`Status: ${b.status} · slug: ${b.slug}`} />
      <Link href="/admin-dashboard/booklets" className="text-sm text-blue-700 hover:underline dark:text-blue-300">← All booklets</Link>

      <BookletMetaForm id={b.id} title={b.title} publisher={b.publisher ?? ''} description={b.description} licenseConfirmed={b.licenseConfirmed} licenseNote={b.licenseNote ?? ''} status={b.status} />
      <SourceUpload id={b.id} hasSource={!!b.sourcePath} totalPages={b.totalPages} />

      <div className="card p-4 text-sm">
        <h3 className="font-semibold">Paid access</h3>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Students unlock this booklet through an entitlement on the hidden access record <code>{b.accessExam?.code}</code>. Add that record to a bundle
          (Admin → Bundled Exams → bundle → add exam) so the normal checkout grants it.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {bundles.length ? <>In bundle(s): {bundles.map((x) => `${x.title}${x.published ? '' : ' (unpublished)'}`).join(', ')}</> : 'Not in any bundle yet — only admins and manual grants can open paid chapters.'}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Chapters</h2>
        <div className="card mb-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Chapter</th><th className="px-3 py-2">PDF pages</th><th className="px-3 py-2">Conversion</th><th className="px-3 py-2">Content</th><th className="px-3 py-2">Review</th><th className="px-3 py-2">Live</th></tr>
            </thead>
            <tbody>
              {b.chapters.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Add the first chapter below.</td></tr>}
              {b.chapters.map((c, i) => (
                <tr key={c.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2"><Link className="font-medium text-blue-700 hover:underline dark:text-blue-300" href={`/admin-dashboard/booklets/chapters/${c.id}`}>{c.title}</Link>{c.isFreePreview && <span className="badge ml-2">free preview</span>}</td>
                  <td className="px-3 py-2">{c.pdfPageFrom}–{c.pdfPageTo}</td>
                  <td className="px-3 py-2">{c.processStatus}</td>
                  <td className="px-3 py-2 text-xs">{c._count.items} items · {c._count.questions} MCQs · {c._count.figures} figs</td>
                  <td className="px-3 py-2">{c.reviewStatus}{c.reviewerName ? ` · ${c.reviewerName}` : ''}</td>
                  <td className="px-3 py-2">{c.publishedAt ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddChapterForm id={b.id} />
      </section>
    </div>
  );
}
