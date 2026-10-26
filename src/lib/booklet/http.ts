import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { BookletError, makeLogger } from './admin-actions';

export async function adminContext() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'ADMIN') return null;
  return { user, log: makeLogger(user.id) };
}

/** Wrap a route body: BookletError/ZodError -> JSON 4xx, anything else -> 500 (no stack leak). */
export async function respond(fn: () => Promise<unknown>, okStatus = 200) {
  try {
    return NextResponse.json((await fn()) ?? { ok: true }, { status: okStatus });
  } catch (e: any) {
    if (e instanceof BookletError) return NextResponse.json({ error: e.message, blockers: e.blockers }, { status: e.status });
    if (e instanceof ZodError) return NextResponse.json({ error: 'invalid-input', issues: e.issues.slice(0, 5) }, { status: 400 });
    console.error('[booklet]', e);
    return NextResponse.json({ error: 'server-error', message: String(e?.message ?? e).slice(0, 200) }, { status: 500 });
  }
}

export const forbidden = () => NextResponse.json({ error: 'forbidden' }, { status: 403 });
