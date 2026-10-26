import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/admin/page-header';
import { CreateBookletForm } from '@/components/booklet/admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminBookletsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/');
  const booklets = await db.booklet.findMany({
    orderBy: { createdAt: 'desc' },
    include: { chapters: { select: { processStatus: true, reviewStatus: true, publishedAt: true } } }
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Study Booklets" subtitle="Convert textbook chapters into notes, tables, flowcharts, flashcards, MCQs and mock tests. Everything stays DRAFT until licensing is confirmed and a clinical reviewer approves it." />
      <CreateBookletForm />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr><th className="px-3 py-2">Booklet</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Licence</th><th className="px-3 py-2">Chapters</th><th className="px-3 py-2">Processed</th><th className="px-3 py-2">Live</th></tr>
          </thead>
          <tbody>
            {booklets.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No booklets yet.</td></tr>}
            {booklets.map((b) => (
              <tr key={b.id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2"><Link className="font-medium text-blue-700 hover:underline dark:text-blue-300" href={`/admin-dashboard/booklets/${b.id}`}>{b.title}</Link></td>
                <td className="px-3 py-2">{b.status}</td>
                <td className="px-3 py-2">{b.licenseConfirmed ? 'Confirmed' : <span className="text-amber-700 dark:text-amber-300">Not confirmed</span>}</td>
                <td className="px-3 py-2">{b.chapters.length}</td>
                <td className="px-3 py-2">{b.chapters.filter((c) => c.processStatus === 'PROCESSED').length}</td>
                <td className="px-3 py-2">{b.chapters.filter((c) => c.publishedAt).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
