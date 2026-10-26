import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { decideAccess } from '@/lib/booklet/access';
import { getFigure } from '@/lib/booklet/figure-storage';
import { resolveViewer } from '@/lib/booklet/queries';

export const runtime = 'nodejs';

/**
 * Access-checked figure proxy. Figures are stored under unguessable keys and
 * never linked directly; this is the only way a browser can get the bytes.
 * Unpublished / unapproved / unentitled => 404 (does not reveal existence).
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fig = await db.bookletFigure.findUnique({
    where: { id },
    include: { chapter: { include: { booklet: true } } }
  });
  if (!fig) return new NextResponse('Not found', { status: 404 });
  const session = await auth();
  const viewer = await resolveViewer(session, fig.chapter.booklet.accessExamId);
  const d = decideAccess(fig.chapter.booklet, fig.chapter, viewer);
  if (!d.ok || (!viewer.isAdmin && !fig.approved)) return new NextResponse('Not found', { status: 404 });
  const file = await getFigure(fig.storageKey);
  if (!file) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(file.body), {
    headers: { 'content-type': file.contentType, 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff' }
  });
}
