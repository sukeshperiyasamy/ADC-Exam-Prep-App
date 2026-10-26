import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ProcessingClient from './processing-client';

export const dynamic = 'force-dynamic';

export default function ProcessingPage() {
  return (
    <div className="container-app max-w-xl py-20">
      <div className="card p-10 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Processing your payment…</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          This page will update automatically once we receive confirmation from your payment provider.
        </p>
        <Suspense fallback={null}>
          <ProcessingClient />
        </Suspense>
      </div>
    </div>
  );
}
