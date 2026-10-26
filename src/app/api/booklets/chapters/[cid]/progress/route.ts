import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { decideAccess } from '@/lib/booklet/access';
import { resolveViewer } from '@/lib/booklet/queries';

const STUDY_MODES = ['notes', 'summary', 'concepts', 'tables', 'flowcharts', 'flashcards', 'mcqs'] as const;
const Body = z.object({ mode: z.enum(STUDY_MODES), completed: z.boolean().optional() });

/** Record that a student visited / finished a study mode; chapter completes when every available mode is done. */
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

  const prev = await db.bookletProgress.findUnique({ where: { userId_chapterId: { userId, chapterId: cid } } });
  const modes = new Set(prev?.completedModes ?? []);
  if (parsed.data.completed) modes.add(parsed.data.mode);

  // Modes that actually have content for this chapter.
  const [kinds, mcqs] = await Promise.all([
    db.bookletItem.findMany({ where: { chapterId: cid, status: 'APPROVED' }, select: { kind: true }, distinct: ['kind'] }),
    db.question.count({ where: { bookletChapterId: cid, status: 'PUBLISHED' } })
  ]);
  const has = new Set(kinds.map((k) => k.kind));
  const available = [
    has.has('NOTE') ? 'notes' : null,
    has.has('SUMMARY') ? 'summary' : null,
    has.has('KEY_CONCEPT') ? 'concepts' : null,
    has.has('TABLE') ? 'tables' : null,
    has.has('FLOWCHART') ? 'flowcharts' : null,
    has.has('FLASHCARD') ? 'flashcards' : null,
    mcqs > 0 ? 'mcqs' : null
  ].filter(Boolean) as string[];
  const done = available.length > 0 && available.every((m) => modes.has(m));

  const row = await db.bookletProgress.upsert({
    where: { userId_chapterId: { userId, chapterId: cid } },
    update: { completedModes: [...modes], lastMode: parsed.data.mode, completedAt: done ? (prev?.completedAt ?? new Date()) : null },
    create: { userId, chapterId: cid, completedModes: [...modes], lastMode: parsed.data.mode, completedAt: done ? new Date() : null }
  });
  return NextResponse.json({ completedModes: row.completedModes, completed: !!row.completedAt, available });
}
