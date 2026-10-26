import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { chapterPublishBlockers } from './access';
import { ChapterContent, McqData, parseItemData, type ItemKind } from './schemas';
import { saveContent, ensureAccessExam } from './store';

/** Domain errors the routes turn into 4xx responses. */
export class BookletError extends Error {
  constructor(message: string, public status = 400, public blockers?: string[]) {
    super(message);
  }
}

type Log = (action: string, targetType: string, targetId: string, metadata?: object) => Promise<unknown>;
export const makeLogger = (adminId: string): Log => (action, targetType, targetId, metadata) =>
  db.adminLog.create({ data: { adminId, action, targetType, targetId, metadata: (metadata ?? {}) as Prisma.InputJsonValue } });

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';

export async function createBooklet(
  input: { title: string; slug?: string; publisher?: string; description?: string },
  log: Log
) {
  const title = input.title.trim();
  if (!title) throw new BookletError('Title is required');
  const slug = input.slug?.trim() || slugify(title);
  if (!SLUG.test(slug)) throw new BookletError('Slug must be lowercase letters, numbers and hyphens');
  if (await db.booklet.findUnique({ where: { slug } })) throw new BookletError('Slug already in use', 409);
  const b = await db.booklet.create({
    data: { title, slug, publisher: input.publisher?.trim() || null, description: input.description?.trim() ?? '' }
  });
  await ensureAccessExam(b.id);
  await log('booklet.create', 'Booklet', b.id, { slug });
  return b;
}

export async function addChapter(
  bookletId: string,
  input: { title: string; pdfPageFrom: number; pdfPageTo: number; isFreePreview?: boolean },
  log: Log
) {
  const b = await db.booklet.findUnique({ where: { id: bookletId } });
  if (!b) throw new BookletError('Booklet not found', 404);
  const title = input.title.trim();
  if (!title) throw new BookletError('Chapter title is required');
  if (!(input.pdfPageFrom >= 1 && input.pdfPageTo >= input.pdfPageFrom)) throw new BookletError('Invalid PDF page range');
  if (b.totalPages && input.pdfPageTo > b.totalPages) throw new BookletError(`Booklet only has ${b.totalPages} pages`);
  if (input.pdfPageTo - input.pdfPageFrom > 60) throw new BookletError('A chapter may span at most 61 pages');
  let slug = slugify(title);
  if (await db.bookletChapter.findUnique({ where: { bookletId_slug: { bookletId, slug } } })) slug = `${slug}-${input.pdfPageFrom}`;
  const position = await db.bookletChapter.count({ where: { bookletId } });
  const c = await db.bookletChapter.create({
    data: { bookletId, title, slug, position, pdfPageFrom: input.pdfPageFrom, pdfPageTo: input.pdfPageTo, isFreePreview: !!input.isFreePreview }
  });
  await log('booklet.chapter.create', 'BookletChapter', c.id, { title });
  return c;
}

/** Counts that drive publish gating. */
export async function chapterGateInfo(chapterId: string) {
  const [c, items, mcq] = await Promise.all([
    db.bookletChapter.findUniqueOrThrow({ where: { id: chapterId }, include: { booklet: true } }),
    db.bookletItem.groupBy({ by: ['status'], where: { chapterId }, _count: true }),
    db.question.groupBy({ by: ['status'], where: { bookletChapterId: chapterId }, _count: true })
  ]);
  const n = (rows: { status: string; _count: number }[], s: string) => rows.find((r) => r.status === s)?._count ?? 0;
  const issues = ((c.verification as any)?.issues ?? []) as { severity: string; resolved?: boolean }[];
  return {
    chapter: c,
    gate: chapterPublishBlockers(c.booklet, {
      processStatus: c.processStatus,
      reviewStatus: c.reviewStatus,
      reviewerName: c.reviewerName,
      approvedItemCount: n(items, 'APPROVED'),
      draftItemCount: n(items, 'DRAFT') + n(mcq, 'DRAFT'),
      publishedMcqCount: n(mcq, 'PUBLISHED'),
      highSeverityIssues: issues.filter((i) => i.severity === 'high' && !i.resolved).length
    })
  };
}

export async function importChapterContent(chapterId: string, json: unknown, log: Log) {
  const c = await db.bookletChapter.findUnique({ where: { id: chapterId } });
  if (!c) throw new BookletError('Chapter not found', 404);
  if (c.publishedAt) throw new BookletError('Unpublish the chapter before importing over it', 409);
  if (c.processStatus === 'PROCESSING') throw new BookletError('Chapter is being converted; wait for it to finish', 409);
  // Accept the pilot's content.json envelope ({chapter, pdfPages, assets, ...content}).
  const parsed = ChapterContent.safeParse(json);
  if (!parsed.success) throw new BookletError(`Invalid content JSON: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`);
  const r = await saveContent(chapterId, parsed.data, 'imported');
  await db.bookletChapter.update({
    where: { id: chapterId },
    data: { processStatus: 'PROCESSED', processStage: 'imported', processedAt: new Date(), model: 'imported', reviewStatus: 'DRAFT', processError: null }
  });
  await log('booklet.chapter.import', 'BookletChapter', chapterId, r);
  return r;
}

export async function editItem(itemId: string, patch: { data?: unknown; status?: 'DRAFT' | 'APPROVED' | 'REJECTED'; pages?: number[] }, log: Log) {
  const item = await db.bookletItem.findUnique({ where: { id: itemId }, include: { chapter: true } });
  if (!item) throw new BookletError('Item not found', 404);
  const upd: Prisma.BookletItemUpdateInput = {};
  if (patch.data !== undefined) {
    try {
      upd.data = parseItemData(item.kind as ItemKind, patch.data) as Prisma.InputJsonValue;
    } catch (e: any) {
      throw new BookletError(`Invalid ${item.kind} data: ${e?.issues?.[0]?.message ?? e.message}`);
    }
  }
  if (patch.status) upd.status = patch.status;
  if (patch.pages) upd.pages = patch.pages.filter((p) => Number.isInteger(p) && p >= item.chapter.pdfPageFrom && p <= item.chapter.pdfPageTo);
  // Editing a live chapter's item pulls the chapter back to review.
  const updated = await db.bookletItem.update({ where: { id: itemId }, data: upd });
  if (item.chapter.publishedAt && patch.data !== undefined) await unpublishChapter(item.chapterId, 'item edited', log);
  await log('booklet.item.update', 'BookletItem', itemId, { status: patch.status, edited: patch.data !== undefined });
  return updated;
}

export async function editQuestion(
  qid: string,
  patch: { mcq?: unknown; status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
  log: Log
) {
  const q = await db.question.findUnique({ where: { id: qid }, include: { bookletChapter: true } });
  if (!q || !q.bookletChapterId) throw new BookletError('Booklet question not found', 404);
  const upd: Prisma.QuestionUpdateInput = {};
  let finalMcq: ReturnType<typeof McqData.parse> | null = null;
  if (patch.mcq !== undefined) {
    const r = McqData.safeParse({ pages: q.sourcePages, difficulty: q.difficulty, ...(patch.mcq as object) });
    if (!r.success) throw new BookletError(`Invalid question: ${r.error.issues[0]?.message}`);
    finalMcq = r.data;
    Object.assign(upd, {
      stem: r.data.stem,
      options: r.data.options as unknown as Prisma.InputJsonValue,
      correct: r.data.correct as unknown as Prisma.InputJsonValue,
      explanation: r.data.explanation,
      difficulty: r.data.difficulty,
      sourcePages: r.data.pages,
      type: r.data.correct.length > 1 ? 'MULTI' : 'SINGLE',
      version: { increment: 1 }
    });
  }
  if (patch.status) {
    if (patch.status === 'PUBLISHED' && !finalMcq && !McqData.safeParse({ stem: q.stem, options: q.options, correct: q.correct, explanation: q.explanation, difficulty: q.difficulty, pages: q.sourcePages }).success)
      throw new BookletError('Question is invalid and cannot be approved');
    upd.status = patch.status;
  }
  const updated = await db.question.update({ where: { id: qid }, data: upd });
  if (q.bookletChapter?.publishedAt && patch.mcq !== undefined) await unpublishChapter(q.bookletChapterId, 'question edited', log);
  await log('booklet.question.update', 'Question', qid, { status: patch.status, edited: patch.mcq !== undefined });
  return updated;
}

export async function setFigureApproved(fid: string, approved: boolean, log: Log) {
  const f = await db.bookletFigure.update({ where: { id: fid }, data: { approved } }).catch(() => null);
  if (!f) throw new BookletError('Figure not found', 404);
  await log('booklet.figure.update', 'BookletFigure', fid, { approved });
  return f;
}

export async function bulkSetStatus(chapterId: string, status: 'APPROVED' | 'DRAFT', log: Log) {
  const items = await db.bookletItem.updateMany({
    where: { chapterId, status: status === 'APPROVED' ? 'DRAFT' : 'APPROVED' },
    data: { status }
  });
  const qs = await db.question.updateMany({
    where: { bookletChapterId: chapterId, status: status === 'APPROVED' ? 'DRAFT' : 'PUBLISHED' },
    data: { status: status === 'APPROVED' ? 'PUBLISHED' : 'DRAFT' }
  });
  await log('booklet.chapter.bulk', 'BookletChapter', chapterId, { status, items: items.count, questions: qs.count });
  return { items: items.count, questions: qs.count };
}

export async function reviewChapter(
  chapterId: string,
  input: { action: 'submit' | 'approve' | 'revert'; reviewerName?: string; note?: string; resolveIssueIndexes?: number[] },
  log: Log
) {
  const c = await db.bookletChapter.findUnique({ where: { id: chapterId } });
  if (!c) throw new BookletError('Chapter not found', 404);
  if (input.action === 'submit') {
    if (c.processStatus !== 'PROCESSED') throw new BookletError('Chapter is not processed');
    await db.bookletChapter.update({ where: { id: chapterId }, data: { reviewStatus: 'IN_REVIEW' } });
  } else if (input.action === 'approve') {
    const name = input.reviewerName?.trim();
    if (!name) throw new BookletError('The qualified clinical reviewer’s name is required to approve');
    if (c.reviewStatus === 'DRAFT') throw new BookletError('Submit the chapter for review first');
    const v: any = c.verification ?? { issues: [] };
    (input.resolveIssueIndexes ?? []).forEach((i) => {
      if (v.issues?.[i]) v.issues[i].resolved = true;
    });
    await db.bookletChapter.update({
      where: { id: chapterId },
      data: { reviewStatus: 'APPROVED', reviewerName: name, reviewerNote: input.note ?? null, reviewedAt: new Date(), verification: v }
    });
  } else {
    await unpublishChapter(chapterId, 'review reverted', log);
    await db.bookletChapter.update({ where: { id: chapterId }, data: { reviewStatus: 'DRAFT', reviewedAt: null } });
  }
  await log(`booklet.chapter.review.${input.action}`, 'BookletChapter', chapterId, { reviewer: input.reviewerName });
}

export async function unpublishChapter(chapterId: string, why: string, log: Log) {
  await db.bookletChapter.update({ where: { id: chapterId }, data: { publishedAt: null } });
  await log('booklet.chapter.unpublish', 'BookletChapter', chapterId, { why });
}

export async function publishChapter(chapterId: string, publish: boolean, log: Log) {
  if (!publish) return unpublishChapter(chapterId, 'manual', log);
  const { gate } = await chapterGateInfo(chapterId);
  if (gate.length) throw new BookletError('Chapter cannot be published yet', 422, gate);
  await db.bookletChapter.update({ where: { id: chapterId }, data: { publishedAt: new Date() } });
  await log('booklet.chapter.publish', 'BookletChapter', chapterId);
}

export async function updateBooklet(
  id: string,
  patch: { title?: string; publisher?: string; description?: string; licenseConfirmed?: boolean; licenseNote?: string; status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
  log: Log
) {
  const b = await db.booklet.findUnique({ where: { id }, include: { chapters: { select: { publishedAt: true } } } });
  if (!b) throw new BookletError('Booklet not found', 404);
  const upd: Prisma.BookletUpdateInput = {};
  if (patch.title !== undefined) upd.title = patch.title.trim() || b.title;
  if (patch.publisher !== undefined) upd.publisher = patch.publisher.trim() || null;
  if (patch.description !== undefined) upd.description = patch.description;
  if (patch.licenseNote !== undefined) upd.licenseNote = patch.licenseNote;
  if (patch.licenseConfirmed !== undefined) {
    if (patch.licenseConfirmed && !(patch.licenseNote ?? b.licenseNote)?.trim())
      throw new BookletError('Record the licence / permission details before confirming licensing');
    upd.licenseConfirmed = patch.licenseConfirmed;
  }
  if (patch.status) {
    if (patch.status === 'PUBLISHED') {
      const licensed = patch.licenseConfirmed ?? b.licenseConfirmed;
      const blockers: string[] = [];
      if (!licensed) blockers.push('Copyright/licensing for this booklet is not confirmed.');
      if (!b.chapters.some((c) => c.publishedAt)) blockers.push('No chapter is published yet.');
      if (blockers.length) throw new BookletError('Booklet cannot be published yet', 422, blockers);
    }
    upd.status = patch.status;
  }
  // Revoking the licence takes live content offline immediately.
  if (patch.licenseConfirmed === false) upd.status = 'DRAFT';
  const r = await db.booklet.update({ where: { id }, data: upd });
  await log('booklet.update', 'Booklet', id, patch);
  return r;
}
