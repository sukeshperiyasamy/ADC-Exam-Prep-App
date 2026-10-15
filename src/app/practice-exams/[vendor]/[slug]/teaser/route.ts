import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getTeaserSize } from '@/lib/settings';

async function handleTeaser(req: Request, params: { vendor: string; slug: string }) {
  const { vendor: vendorSlug, slug: examSlug } = params;
  const exam = await db.exam.findFirst({
    where: {
      slug: examSlug,
      vendor: { slug: vendorSlug },
      published: true
    }
  });

  if (!exam) {
    return NextResponse.redirect(new URL('/practice-exams', req.url));
  }

  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  let guestToken: string | undefined;
  const c = await cookies();
  if (!userId) {
    guestToken = c.get('gt')?.value;
    if (!guestToken) {
      guestToken = `g_${crypto.randomUUID()}`;
      c.set('gt', guestToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/'
      });
    }
  }

  const questions = await db.question.findMany({
    where: { examId: exam.id, isTeaser: true, status: 'PUBLISHED' },
    select: { id: true }
  });

  if (questions.length === 0) {
    return NextResponse.redirect(new URL(`/practice-exams/${vendorSlug}/${examSlug}`, req.url));
  }

  const teaserLimit = await getTeaserSize();
  const ids = questions.map(q => q.id).sort(() => Math.random() - 0.5).slice(0, teaserLimit);

  const attempt = await db.attempt.create({
    data: {
      userId: userId ?? null,
      guestToken: !userId ? guestToken : null,
      examId: exam.id,
      mode: 'PRACTICE',
      isTeaser: true,
      questionIds: ids,
      durationSec: 0,
      responses: {}
    }
  });

  return NextResponse.redirect(new URL(`/exam/${attempt.id}`, req.url));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ vendor: string; slug: string }> }
) {
  return handleTeaser(req, await params);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ vendor: string; slug: string }> }
) {
  return handleTeaser(req, await params);
}
