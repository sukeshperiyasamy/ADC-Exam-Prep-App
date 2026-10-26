import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MyInvoicesPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect('/login');

  const invoices = await db.invoice.findMany({
    where: { userId },
    include: { order: { include: { exam: { select: { title: true, code: true } }, bundle: { select: { title: true } } } } },
    orderBy: { issueDate: 'desc' }
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Your tax invoices and credit notes. Each PDF is a tax receipt for your records.
      </p>

      {invoices.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          You don&apos;t have any invoices yet. They&apos;ll appear here after your first paid order.
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-slate-200 dark:divide-slate-800">
          {invoices.map((inv) => {
            const product = inv.order.bundle
              ? `${inv.order.bundle.title} (bundle)`
              : inv.order.exam
                ? `${inv.order.exam.title} (${inv.order.exam.code})`
                : 'Order';
            const isCredit = inv.status === 'CREDIT_NOTE';
            const isVoid = inv.status === 'VOID';
            return (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{inv.number}</span>
                    {isCredit && (
                      <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        Credit Note
                      </span>
                    )}
                    {isVoid && (
                      <span className="badge bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300">
                        Void
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {product} · Issued {inv.issueDate.toISOString().slice(0, 10)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold">{formatPrice(inv.total, inv.currency)}</div>
                    {inv.taxAmount !== 0 && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        incl. {inv.taxLabel} {formatPrice(inv.taxAmount, inv.currency)}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/api/invoices/${inv.id}/pdf`}
                    target="_blank"
                    className="btn-sm-outline"
                  >
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
