import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { scoreAttempt, validateAttemptQuestions, type Responses } from '@/lib/attempts';

const Body = z.object({ attemptId: z.string() });

export async function POST(req: Request) {
  const { attemptId } = Body.parse(await req.json());
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  const attempt = await db.attempt.findUnique({ where: { id: attemptId }, include: { exam: true } });
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (attempt.userId) {
    if (attempt.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    const gt = (await cookies()).get('gt')?.value;
    if (!gt || gt !== attempt.guestToken) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (attempt.submittedAt) return NextResponse.json({ ok: true, attemptId });

  const questions = await db.question.findMany({
    where: { id: { in: attempt.questionIds } },
    select: { id: true, type: true, correct: true, domain: true }
  });

  const validation = validateAttemptQuestions(attempt.questionIds, questions);
  if (!validation.valid) {
    console.error(`[Attempt Submit] Incomplete questions for attempt ${attemptId}: missing ${validation.missingIds.join(', ')}`);
    return NextResponse.json(
      {
        error: 'Incomplete question set retrieved for attempt',
        missingQuestionIds: validation.missingIds
      },
      { status: 422 }
    );
  }

  const responses = (attempt.responses as Responses) || {};
  const { score } = scoreAttempt(questions, responses);
  const passed = score >= attempt.exam.passingScore;

  await db.attempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), score, passed }
  });
  return NextResponse.json({ ok: true, attemptId, score, passed });
}
