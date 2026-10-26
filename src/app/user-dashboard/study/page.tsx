import Link from 'next/link';
import { auth } from '@/lib/auth';
import { loadLibrary, resolveViewer } from '@/lib/booklet/queries';
import { LibraryBrowser, type LibraryCard } from '@/components/booklet/library-browser';

export const dynamic = 'force-dynamic';

function extractEditionOrYear(title: string): string | null {
  const parenMatch = title.match(/\(([^)]*(?:\d{4}|edition|ed\.)[^)]*)\)/i);
  if (parenMatch) return parenMatch[1].trim();
  const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) return yearMatch[1];
  return null;
}

export default async function StudyLibraryPage() {
  const session = await auth();
  const viewer = await resolveViewer(session, null);
  const booklets = await loadLibrary(viewer);
  const isEnrolled = viewer.isAdmin || viewer.hasEntitlement;

  const items: LibraryCard[] = booklets.map((b) => {
    const adminPreview = b.status !== 'PUBLISHED';
    const access: LibraryCard['access'] = adminPreview
      ? 'admin'
      : b.entitled
        ? 'full'
        : b.freePreviewCount > 0
          ? 'preview'
          : 'locked';
    return {
      id: b.id,
      slug: b.slug,
      title: b.title,
      publisher: b.publisher,
      description: b.description,
      edition: b.title ? extractEditionOrYear(b.title) : null,
      chapterCount: b.chapterCount,
      completed: b.completed,
      freePreviewCount: b.freePreviewCount,
      access,
      adminStatus: adminPreview ? b.status : undefined
    };
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ADC Dental Study Library</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Chapter notes, key concepts, tables, flowcharts, flashcards and mock tests built from reviewed study material.
          </p>
        </div>
        {isEnrolled && !viewer.isAdmin && (
          <span className="badge-brand px-3 py-1 text-xs font-semibold">Enrolled Candidate · Full Access</span>
        )}
      </div>

      {!isEnrolled && items.length > 0 && (
        <div className="card mt-5 flex flex-col items-start justify-between gap-3 border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Unlock Full Dental Study Booklets
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              Free access includes preview chapters. Enroll to unlock complete summaries, clinical tables, flashcards and mock questions.
            </p>
          </div>
          <Link href="/practice-exams" className="btn-primary-grad shrink-0 text-xs">
            Unlock Full Access
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-medium">No study booklets are available yet.</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Booklets appear here once their content has been clinically reviewed and published.
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <LibraryBrowser items={items} />
        </div>
      )}
    </div>
  );
}
