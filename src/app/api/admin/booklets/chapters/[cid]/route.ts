import { z } from 'zod';
import { db } from '@/lib/db';
import { adminContext, forbidden, respond } from '@/lib/booklet/http';
import { BookletError, bulkSetStatus, chapterGateInfo, importChapterContent, publishChapter, reviewChapter } from '@/lib/booklet/admin-actions';
import { processChapter } from '@/lib/booklet/pipeline';
import { GeminiNotConfiguredError, getJsonGenerator } from '@/lib/booklet/gemini';

export const runtime = 'nodejs';
export const maxDuration = 300;

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('process'), force: z.boolean().optional() }),
  z.object({ action: z.literal('import'), content: z.unknown() }),
  z.object({
    action: z.literal('review'),
    review: z.enum(['submit', 'approve', 'revert']),
    reviewerName: z.string().max(200).optional(),
    note: z.string().max(2000).optional(),
    resolveIssueIndexes: z.array(z.number().int()).optional()
  }),
  z.object({ action: z.literal('publish'), publish: z.boolean() }),
  z.object({ action: z.literal('bulk'), status: z.enum(['APPROVED', 'DRAFT']) }),
  z.object({ action: z.literal('free-preview'), value: z.boolean() })
]);

export async function GET(_: Request, { params }: { params: Promise<{ cid: string }> }) {
  const ctx = await adminContext();
  if (!ctx) return forbidden();
  const { cid } = await params;
  return respond(async () => {
    const { chapter, gate } = await chapterGateInfo(cid);
    return {
      processStatus: chapter.processStatus,
      processStage: chapter.processStage,
      processError: chapter.processError,
      reviewStatus: chapter.reviewStatus,
      publishedAt: chapter.publishedAt,
      blockers: gate
    };
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const ctx = await adminContext();
  if (!ctx) return forbidden();
  const { cid } = await params;
  return respond(async () => {
    const body = Body.parse(await req.json());
    const c = await db.bookletChapter.findUnique({ where: { id: cid } });
    if (!c) throw new BookletError('Chapter not found', 404);
    switch (body.action) {
      case 'process': {
        if (c.publishedAt) throw new BookletError('Unpublish the chapter before re-processing', 409);
        if (c.processStatus === 'PROCESSING') throw new BookletError('Already processing', 409);
        // Fail fast (and visibly) when Gemini is not configured instead of
        // leaving a chapter stuck in PROCESSING.
        try {
          await getJsonGenerator();
        } catch (e) {
          if (e instanceof GeminiNotConfiguredError) throw new BookletError(e.message, 503);
          throw e;
        }
        await ctx.log('booklet.chapter.process', 'BookletChapter', cid, { force: !!body.force });
        // Fire-and-forget: the admin UI polls GET for stage/status. Errors are
        // persisted on the chapter by processChapter itself.
        void processChapter(cid, { force: body.force }).catch((e) => console.error('[booklet] process failed', cid, e?.message));
        return { started: true };
      }
      case 'import':
        return importChapterContent(cid, body.content, ctx.log);
      case 'review':
        return reviewChapter(
          cid,
          { action: body.review, reviewerName: body.reviewerName, note: body.note, resolveIssueIndexes: body.resolveIssueIndexes },
          ctx.log
        );
      case 'publish':
        return publishChapter(cid, body.publish, ctx.log);
      case 'bulk':
        return bulkSetStatus(cid, body.status, ctx.log);
      case 'free-preview':
        await db.bookletChapter.update({ where: { id: cid }, data: { isFreePreview: body.value } });
        await ctx.log('booklet.chapter.free-preview', 'BookletChapter', cid, { value: body.value });
        return { ok: true };
    }
  });
}
