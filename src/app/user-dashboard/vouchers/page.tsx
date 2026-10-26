import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export default async function VouchersPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect('/login');
  // Fetch ALL VOUCHER-tier entitlements. `voucher: null` means the
  // admin hasn't issued a code yet (pending delivery, 3-5 business days).
  const ents = await db.entitlement.findMany({
    where: { userId, tier: 'VOUCHER' },
    include: { exam: { include: { vendor: true } } },
    orderBy: { grantedAt: 'desc' }
  });
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">My Vouchers</h1>
      <div className="mt-4 card divide-y divide-slate-200 dark:divide-slate-800">
        {ents.length === 0 && <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No vouchers yet.</p>}
        {ents.map(e => (
          <div key={e.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-medium">{e.exam.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{e.exam.vendor.name}</div>
            </div>
            <div className="flex items-center gap-2">
              {e.voucher ? (
                <>
                  <code className="rounded bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800 dark:text-slate-200">{e.voucher}</code>
                  <a href={`/api/vouchers/${e.id}/pdf`} className="btn-outline">Download PDF</a>
                </>
              ) : (
                <div className="text-right">
                  <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Pending delivery</span>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Typically 3–5 business days. We'll email you when it's ready.</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
