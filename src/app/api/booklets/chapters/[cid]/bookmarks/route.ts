import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { decideAccess } from '@/lib/booklet/access';
import { resolveViewer } from '@/lib/booklet/queries';

const Body = z.object({
  itemId: z.string().max(60).default(''),
  label: z.string().min(1).max(200),
  pdfPage: z.number().int().positive().optional(),
  remove: z.boolean().optional()
});

/** Toggle (create or remove) a bookmark on a chapter item or PDF page. */
export async function POST(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { cid } = await params;
  const chapter = await db.bookletChapter.findUnique({ where: { id: cid }, include: { booklet: true } });
  if (!chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const viewer = await resolveViewer(session, chapter.booklet.accessExamId);
  const d = decideAccess(chapter.booklet, chapter, viewer);
  if (!d.ok) return NextResponse.json({ error: d.reason === 'unpublished' ? 'Not found' : 'Purchase required' }, { status: d.reason === 'unpublished' ? 404 : 402 });

  const key = { userId_chapterId_itemId: { userId, chapterId: cid, itemId: parsed.data.itemId } };
  if (parsed.data.remove) {
    await db.bookletBookmark.delete({ where: key }).catch(() => {});
    return NextResponse.json({ bookmarked: false });
  }
  await db.bookletBookmark.upsert({
    where: key,
    update: { label: parsed.data.label, pdfPage: parsed.data.pdfPage ?? null },
    create: { userId, chapterId: cid, itemId: parsed.data.itemId, label: parsed.data.label, pdfPage: parsed.data.pdfPage ?? null }
  });
  return NextResponse.json({ bookmarked: true });
}
