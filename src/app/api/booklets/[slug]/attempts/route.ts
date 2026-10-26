import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { pickQuestionIds, resolveViewer } from '@/lib/booklet/queries';

const Body = z.object({
  kind: z.enum(['chapter', 'mock']),
  chapterId: z.string().optional(),
  mode: z.enum(['PRACTICE', 'EXAM']).optional()
});

const MOCK_QUESTIONS = 40;
const CHAPTER_QUESTIONS = 20;
const SECONDS_PER_QUESTION = 90;

/**
 * Start a booklet MCQ attempt. Reuses the normal Attempt model against the
 * booklet's hidden access Exam, so the existing runner, autosave, submit and
 * scoring (and /results review) apply unchanged.
 *  - chapter: PRACTICE/EXAM over one chapter's published MCQs
 *  - mock: timed EXAM across every chapter the viewer can open
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (parsed.data.kind === 'chapter' && !parsed.data.chapterId))
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { slug } = await params;
  const booklet = await db.booklet.findUnique({ where: { slug } });
  if (!booklet || !booklet.accessExamId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const viewer = await resolveViewer(session, booklet.accessExamId);

  const isMock = parsed.data.kind === 'mock';
  const { ids, error } = await pickQuestionIds({
    bookletId: booklet.id,
    chapterId: isMock ? undefined : parsed.data.chapterId,
    viewer,
    count: isMock ? MOCK_QUESTIONS : CHAPTER_QUESTIONS
  });
  if (error === 'not-found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (error === 'forbidden') return NextResponse.json({ error: 'Purchase required' }, { status: 402 });
  if (error === 'no-questions') return NextResponse.json({ error: 'No approved questions yet' }, { status: 400 });

  const mode = isMock ? 'EXAM' : (parsed.data.mode ?? 'PRACTICE');
  const durationSec = mode === 'EXAM' ? ids.length * SECONDS_PER_QUESTION : 0;
  const attempt = await db.attempt.create({
    data: {
      userId,
      examId: booklet.accessExamId,
      mode,
      questionIds: ids,
      durationSec,
      expiresAt: mode === 'EXAM' ? new Date(Date.now() + durationSec * 1000) : null,
      responses: {}
    }
  });
  return NextResponse.json({ attemptId: attempt.id, questions: ids.length });
}
