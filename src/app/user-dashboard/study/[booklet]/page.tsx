import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Timer } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { loadBookletForStudent, resolveViewer } from '@/lib/booklet/queries';
import { StartAttemptButton } from '@/components/booklet/client';
import { buildBookletHierarchy } from '@/lib/booklet/toc';
import { BookletTableOfContents } from '@/components/booklet/toc';

export const dynamic = 'force-dynamic';

export default async function BookletPage({ params }: { params: Promise<{ booklet: string }> }) {
  const { booklet: slug } = await params;
  const session = await auth();
  const viewer = await resolveViewer(session, null);
  const data = await loadBookletForStudent(slug, viewer);
  if (!data) notFound();
  const { booklet, chapters } = data;

  const openChapters = chapters.filter((c) => c.access.ok);
  const lockedCount = chapters.length - openChapters.length;
  const completedCount = chapters.filter((c) => c.progress?.completedAt).length;
  const canMock = openChapters.some((c) => c.mcqCount > 0);
  // Where to buy: a published bundle that includes this booklet's access exam.
  const bundle = lockedCount
    ? await db.bundle.findFirst({ where: { published: true, items: { some: { examId: booklet.accessExamId ?? '' } } }, select: { id: true } })
    : null;

  const groups = buildBookletHierarchy(booklet.slug, chapters);

  return (
    <div>
      <Link
        href="/user-dashboard/study"
        className="inline-flex items-center gap-1 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ChevronLeft className="h-4 w-4" /> Study Library
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{booklet.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {[booklet.publisher, completedCount > 0 ? `${completedCount}/${chapters.length} chapters completed` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>
      {booklet.description && (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{booklet.description}</p>
      )}
      {booklet.status !== 'PUBLISHED' && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Admin preview — this booklet is {booklet.status.toLowerCase()} and not visible to students.
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Timer className="h-4 w-4 text-brand-700 dark:text-brand-300" />
              Booklet mock test
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Timed, up to 40 questions drawn from every chapter you can open. Answers and explanations appear after you submit.
            </p>
          </div>
          {canMock ? (
            <StartAttemptButton slug={booklet.slug} kind="mock" label="Start mock test" />
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">Available once chapters with questions are open to you.</span>
          )}
        </div>

        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Your access</div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {lockedCount === 0
                ? `All ${chapters.length} chapters are open to you.`
                : `${openChapters.length} of ${chapters.length} chapters open${lockedCount ? ` · ${lockedCount} locked` : ''}.`}
            </p>
          </div>
          {lockedCount > 0 && (
            <Link
              href={bundle ? `/checkout/bundle/${bundle.id}?tier=PRACTICE` : '/practice-exams'}
              className="btn-primary-grad shrink-0 text-xs"
            >
              Unlock all chapters
            </Link>
          )}
        </div>
      </div>

      <BookletTableOfContents bookletSlug={booklet.slug} groups={groups} />
    </div>
  );
}
