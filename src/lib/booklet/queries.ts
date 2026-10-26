import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { decideAccess, isChapterLive, type AccessDecision, type Viewer } from './access';

/** Entitlement tiers that unlock exam content (matches /api/attempts/start). */
const UNLOCK_TIERS = ['PRACTICE', 'BUNDLE', 'VOUCHER', 'ADMIN_GRANT'] as const;

export async function hasBookletEntitlement(userId: string | undefined, accessExamId: string | null): Promise<boolean> {
  if (!userId) return false;

  const activeFilter = {
    userId,
    tier: { in: [...UNLOCK_TIERS] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
  };

  const orConditions: Prisma.EntitlementWhereInput[] = [
    { exam: { code: 'ADC-PART1' } }
  ];

  if (accessExamId) {
    orConditions.push({ examId: accessExamId });

    // Check if accessExamId belongs to any published bundle
    const bundles = await db.bundle.findMany({
      where: { published: true, items: { some: { examId: accessExamId } } },
      select: { items: { select: { examId: true } } }
    });
    const siblingExamIds = bundles.flatMap((b) => b.items.map((i) => i.examId));
    if (siblingExamIds.length > 0) {
      orConditions.push({ examId: { in: siblingExamIds } });
    }
  }

  const ent = await db.entitlement.findFirst({
    where: {
      ...activeFilter,
      AND: [{ OR: orConditions }]
    },
    select: { id: true }
  });
  return !!ent;
}

export async function resolveViewer(
  session: { user?: any } | null,
  accessExamId: string | null
): Promise<Viewer> {
  const u = session?.user as { id?: string; role?: string } | undefined;
  const isAdmin = u?.role === 'ADMIN';
  return {
    userId: u?.id,
    isAdmin,
    hasEntitlement: isAdmin ? true : await hasBookletEntitlement(u?.id, accessExamId)
  };
}

/** Library: PUBLISHED booklets with at least one live chapter. Licensing is a
 * publication blocker (chapterPublishBlockers), not an independent visibility gate. */
export async function loadLibrary(viewer: Viewer) {
  const booklets = await db.booklet.findMany({
    where: viewer.isAdmin ? {} : { status: 'PUBLISHED' },
    orderBy: { title: 'asc' },
    include: { chapters: { orderBy: { position: 'asc' } } }
  });
  const progress = viewer.userId
    ? await db.bookletProgress.findMany({ where: { userId: viewer.userId } })
    : [];

  const items = await Promise.all(
    booklets.map(async (b) => {
      const live = b.chapters.filter((c) => viewer.isAdmin || isChapterLive(b, c));
      const isEntitled = viewer.isAdmin ? true : await hasBookletEntitlement(viewer.userId, b.accessExamId);
      const freePreviewCount = live.filter((c) => c.isFreePreview).length;
      return {
        id: b.id,
        slug: b.slug,
        title: b.title,
        publisher: b.publisher,
        description: b.description,
        status: b.status,
        entitled: isEntitled,
        freePreviewCount,
        chapterCount: live.length,
        completed: live.filter((c) => progress.find((p) => p.chapterId === c.id)?.completedAt).length
      };
    })
  );

  return items.filter(
    (b) => viewer.isAdmin || (b.chapterCount > 0 && (b.entitled || b.freePreviewCount > 0))
  );
}

export async function loadBookletForStudent(slug: string, viewer: Viewer) {
  const b = await db.booklet.findUnique({ where: { slug }, include: { chapters: { orderBy: { position: 'asc' } } } });
  if (!b) return null;
  if (!viewer.isAdmin && b.status !== 'PUBLISHED') return null;
  const v = viewer.isAdmin ? viewer : { ...viewer, hasEntitlement: await hasBookletEntitlement(viewer.userId, b.accessExamId) };
  const live = b.chapters.filter((c) => viewer.isAdmin || isChapterLive(b, c));
  if (!viewer.isAdmin && live.length === 0) return null;
  const progress = viewer.userId
    ? await db.bookletProgress.findMany({ where: { userId: viewer.userId, chapterId: { in: live.map((c) => c.id) } } })
    : [];
  const mcqCounts = await db.question.groupBy({
    by: ['bookletChapterId'],
    where: { bookletChapterId: { in: live.map((c) => c.id) }, status: 'PUBLISHED' },
    _count: true
  });
  return {
    booklet: b,
    viewer: v,
    chapters: live.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      pdfPageFrom: c.pdfPageFrom,
      pdfPageTo: c.pdfPageTo,
      isFreePreview: c.isFreePreview,
      live: isChapterLive(b, c),
      access: decideAccess(b, c, v),
      mcqCount: mcqCounts.find((m) => m.bookletChapterId === c.id)?._count ?? 0,
      progress: progress.find((p) => p.chapterId === c.id) ?? null
    }))
  };
}

/** What a student may read for one chapter: APPROVED items + approved figures only. */
export async function loadChapterForStudent(bookletSlug: string, chapterSlug: string, viewer: Viewer) {
  const b = await db.booklet.findUnique({ where: { slug: bookletSlug } });
  if (!b) return { status: 'not-found' as const };
  const c = await db.bookletChapter.findUnique({ where: { bookletId_slug: { bookletId: b.id, slug: chapterSlug } } });
  if (!c) return { status: 'not-found' as const };
  const v = viewer.isAdmin ? viewer : { ...viewer, hasEntitlement: await hasBookletEntitlement(viewer.userId, b.accessExamId) };
  const access: AccessDecision = decideAccess(b, c, v);
  if (!access.ok) return { status: access.reason, booklet: access.reason === 'unpublished' ? null : b, chapter: access.reason === 'unpublished' ? null : c };
  const statusFilter = viewer.isAdmin ? {} : { status: 'APPROVED' as const };
  const [items, figures, mcqCount, progress, bookmarks, pages] = await Promise.all([
    db.bookletItem.findMany({ where: { chapterId: c.id, ...statusFilter, NOT: { status: 'REJECTED' } }, orderBy: { position: 'asc' } }),
    db.bookletFigure.findMany({ where: { chapterId: c.id, ...(viewer.isAdmin ? {} : { approved: true }) }, orderBy: { pdfPage: 'asc' } }),
    db.question.count({ where: { bookletChapterId: c.id, status: 'PUBLISHED' } }),
    viewer.userId ? db.bookletProgress.findUnique({ where: { userId_chapterId: { userId: viewer.userId, chapterId: c.id } } }) : null,
    viewer.userId ? db.bookletBookmark.findMany({ where: { userId: viewer.userId, chapterId: c.id } }) : [],
    // Printed page numbers only (never the transcription text) for citations.
    db.bookletPage.findMany({ where: { chapterId: c.id }, select: { pdfPage: true, printedPage: true } })
  ]);
  return { status: 'ok' as const, access, booklet: b, chapter: c, items, figures, mcqCount, progress, bookmarks, pages };
}

/**
 * Pick the MCQs for a study attempt. `scope: chapter` needs access to that
 * chapter; `mock` draws across every chapter the viewer may open.
 */
export async function pickQuestionIds(opts: {
  bookletId: string;
  chapterId?: string;
  viewer: Viewer;
  count: number;
}): Promise<{ ids: string[]; error?: 'not-found' | 'forbidden' | 'no-questions' }> {
  const b = await db.booklet.findUnique({ where: { id: opts.bookletId }, include: { chapters: true } });
  if (!b) return { ids: [], error: 'not-found' };
  const v = opts.viewer.isAdmin ? opts.viewer : { ...opts.viewer, hasEntitlement: await hasBookletEntitlement(opts.viewer.userId, b.accessExamId) };
  let chapters = b.chapters;
  if (opts.chapterId) {
    chapters = chapters.filter((c) => c.id === opts.chapterId);
    if (!chapters.length) return { ids: [], error: 'not-found' };
    const d = decideAccess(b, chapters[0], v);
    if (!d.ok) return { ids: [], error: d.reason === 'unpublished' ? 'not-found' : 'forbidden' };
  } else {
    chapters = chapters.filter((c) => decideAccess(b, c, v).ok);
    if (!chapters.length) return { ids: [], error: 'forbidden' };
  }
  const qs = await db.question.findMany({
    where: { bookletChapterId: { in: chapters.map((c) => c.id) }, status: 'PUBLISHED' },
    select: { id: true }
  });
  if (!qs.length) return { ids: [], error: 'no-questions' };
  const a = qs.map((q) => q.id);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return { ids: a.slice(0, opts.count) };
}
