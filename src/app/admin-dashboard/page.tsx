import Link from 'next/link';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/admin/page-header';
import { signupsIn, activeLearnersIn, Ranges } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const last30 = Ranges.lastNDays(30);
  const [signups30, activeLearners30, latestUsers, questionDrafts] = await Promise.all([
    signupsIn(last30),
    activeLearnersIn(last30),
    db.user.findMany({
      where: { role: 'USER' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, email: true, name: true, active: true, createdAt: true }
    }),
    db.question.count({ where: { status: 'DRAFT' } })
  ]);

  return (
    <div>
      <PageHeader title="ADC preparation workspace" subtitle="Review learner activity and content readiness for the independent demo." />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Kpi label="Signups · 30d" value={signups30.toLocaleString()} sub="new learners" accent="brand" href="/admin-dashboard/users" />
        <Kpi label="Active learners · 30d" value={activeLearners30.toLocaleString()} sub="unique attempts" accent="cyan" href="/admin-dashboard/users" />
        <Kpi label="Questions to review" value={questionDrafts.toLocaleString()} sub="draft items" accent={questionDrafts > 0 ? 'amber' : 'slate'} href="/admin-dashboard/questions" />
      </div>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Recent learners</h2>
            <p className="mt-0.5 text-xs text-slate-500">Account activity only; no fabricated performance metrics.</p>
          </div>
          <Link href="/admin-dashboard/users" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-300">View all →</Link>
        </div>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800/70">
          {latestUsers.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link href={`/admin-dashboard/users/${user.id}`} className="truncate font-medium text-brand-700 hover:underline dark:text-brand-300">
                  {user.name || user.email}
                </Link>
                <div className="truncate text-xs text-slate-500">{user.email}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                {!user.active && <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-200">Inactive</span>}
                <span>{user.createdAt.toLocaleDateString()}</span>
              </div>
            </li>
          ))}
          {latestUsers.length === 0 && <li className="py-6 text-sm text-slate-500">No learner accounts yet.</li>}
        </ul>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <QuickLink href="/admin-dashboard/exams" title="Mock tests" text="Manage the available preparation sets." />
        <QuickLink href="/admin-dashboard/questions" title="Question review" text="Check draft content before publishing." />
        <QuickLink href="/admin-dashboard/settings" title="Demo settings" text="Review presentation and operational settings." />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
  href
}: {
  label: string;
  value: string;
  sub: string;
  accent: 'brand' | 'cyan' | 'amber' | 'slate';
  href: string;
}) {
  const colors = {
    brand: 'border-l-brand-600',
    cyan: 'border-l-cyan-600',
    amber: 'border-l-amber-500',
    slate: 'border-l-slate-400'
  };
  return (
    <Link href={href} className={`card flex flex-col gap-0.5 border-l-2 p-4 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${colors[accent]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </Link>
  );
}

function QuickLink({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="card-hover p-4">
      <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p>
    </Link>
  );
}
