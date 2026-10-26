import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { ChapterContent, McqData, type ChapterContentT, type PageExtractT } from './schemas';

/** Ensure the (unpublished) Exam that carries entitlements + MCQs exists. */
export async function ensureAccessExam(bookletId: string): Promise<string> {
  const b = await db.booklet.findUniqueOrThrow({ where: { id: bookletId } });
  if (b.accessExamId) return b.accessExamId;
  const vendor =
    (await db.vendor.findUnique({ where: { slug: 'adc' } })) ?? (await db.vendor.findFirst({ orderBy: { slug: 'asc' } }));
  if (!vendor) throw new Error('No vendor exists to attach the booklet access exam to');
  const slug = `booklet-${b.slug}`;
  const exam = await db.exam.upsert({
    where: { slug },
    update: {},
    create: {
      vendorId: vendor.id,
      code: `BK-${b.slug}`.slice(0, 40).toUpperCase(),
      slug,
      title: `${b.title} — study booklet access`,
      description: `Internal access record for the study booklet "${b.title}". Not sold individually.`,
      level: 'Booklet',
      durationMinutes: 60,
      passingScore: 70,
      questionCount: 20,
      domains: [],
      published: false // never shown in the public catalog
    }
  });
  await db.booklet.update({ where: { id: b.id }, data: { accessExamId: exam.id } });
  return exam.id;
}

/** Body text plus any tables, flattened so tables survive in the stored transcription. */
export function pageTranscript(p: PageExtractT): string {
  const rows = (t: PageExtractT['tables'][number]) => [t.headers, ...t.rows].map((r) => r.join(' | ')).join('\n');
  const tables = p.tables
    .map((t) => ['', '', `TABLE ${t.caption}`, rows(t), t.footnotes].filter((x, i) => i < 2 || x).join('\n'))
    .join('');
  return `${p.markdown}${tables}`.trim();
}

export async function saveExtraction(
  chapterId: string,
  pages: Record<number, PageExtractT>,
  figures: { pdfPage: number; label: string; caption: string; storageKey: string }[]
) {
  for (const [n, p] of Object.entries(pages)) {
    await db.bookletPage.upsert({
      where: { chapterId_pdfPage: { chapterId, pdfPage: Number(n) } },
      update: { printedPage: p.printedPage || null, markdown: pageTranscript(p) },
      create: { chapterId, pdfPage: Number(n), printedPage: p.printedPage || null, markdown: pageTranscript(p) }
    });
  }
  if (figures.length) {
    await db.bookletFigure.deleteMany({ where: { chapterId, approved: false } });
    await db.bookletFigure.createMany({ data: figures.map((f) => ({ chapterId, ...f })) });
  }
}

/**
 * Replace DRAFT study items and DRAFT MCQs for a chapter with fresh output.
 * APPROVED / REJECTED items and PUBLISHED questions are never touched, so a
 * re-run cannot silently destroy reviewed work.
 */
export async function saveContent(chapterId: string, raw: unknown, model: string) {
  const content: ChapterContentT = ChapterContent.parse(raw);
  const chapter = await db.bookletChapter.findUniqueOrThrow({ where: { id: chapterId }, include: { booklet: true } });
  const examId = await ensureAccessExam(chapter.bookletId);

  const items: Prisma.BookletItemCreateManyInput[] = [];
  let pos = 0;
  const push = (kind: Prisma.BookletItemCreateManyInput['kind'], data: object, pages: number[] = []) =>
    items.push({ chapterId, kind, data: data as Prisma.InputJsonValue, pages, position: pos++ });
  if (content.summary.trim()) push('SUMMARY', { text: content.summary });
  content.notes.forEach(({ pages, ...d }) => push('NOTE', d, pages));
  content.keyConcepts.forEach(({ pages, ...d }) => push('KEY_CONCEPT', d, pages));
  content.tables.forEach(({ pages, ...d }) => push('TABLE', d, pages));
  const flows = content.flowcharts ?? (content.flowchart ? [content.flowchart] : []);
  flows.forEach(({ pages, ...d }) => push('FLOWCHART', d, pages));
  content.flashcards.forEach(({ pages, ...d }) => push('FLASHCARD', d, pages));

  // Drop MCQs that are internally inconsistent instead of storing a bad key.
  const goodMcqs = content.mcqs.flatMap((q) => {
    const r = McqData.safeParse(q);
    return r.success ? [r.data] : [];
  });

  await db.$transaction([
    db.bookletItem.deleteMany({ where: { chapterId, status: 'DRAFT' } }),
    db.question.deleteMany({ where: { bookletChapterId: chapterId, status: 'DRAFT' } }),
    db.bookletItem.createMany({ data: items }),
    db.question.createMany({
      data: goodMcqs.map((q) => ({
        examId,
        domain: chapter.title,
        difficulty: q.difficulty,
        type: q.correct.length > 1 ? ('MULTI' as const) : ('SINGLE' as const),
        stem: q.stem,
        options: q.options as unknown as Prisma.InputJsonValue,
        correct: q.correct as unknown as Prisma.InputJsonValue,
        explanation: q.explanation,
        references: q.pages.map((p) => ({ label: `${chapter.booklet.title}, PDF p.${p}`, url: '' })) as unknown as Prisma.InputJsonValue,
        status: 'DRAFT' as const,
        generatedBy: `booklet:${model}`,
        bookletChapterId: chapterId,
        sourcePages: q.pages
      }))
    })
  ]);
  return { items: items.length, mcqs: goodMcqs.length, droppedMcqs: content.mcqs.length - goodMcqs.length };
}
