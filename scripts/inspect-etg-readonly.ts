// Read-only inspection of the tg-oral-dental booklet (change-control audit).
// SELECT-only: never mutates rows. Run with the local DB URL:
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55434/adc_local npx tsx scripts/inspect-etg-readonly.ts
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const b = await db.booklet.findUnique({
    where: { slug: 'tg-oral-dental' },
    include: {
      chapters: {
        orderBy: { position: 'asc' },
        select: {
          title: true,
          processStatus: true,
          reviewStatus: true,
          reviewerName: true,
          publishedAt: true,
          isFreePreview: true
        }
      }
    }
  });
  if (!b) {
    console.log('NOT FOUND in this database');
    return;
  }
  console.log(JSON.stringify({
    slug: b.slug,
    title: b.title,
    status: b.status,
    licenseConfirmed: b.licenseConfirmed,
    licenseNote: b.licenseNote,
    accessExamId: b.accessExamId,
    chapterCount: b.chapters.length,
    chapters: b.chapters
  }, null, 1));

  const [items, figs, mcqs, pages] = await Promise.all([
    db.bookletItem.groupBy({ by: ['status'], where: { chapter: { bookletId: b.id } }, _count: true }),
    db.bookletFigure.count({ where: { chapter: { bookletId: b.id } } }),
    db.question.count({ where: { bookletChapter: { bookletId: b.id } } }),
    db.bookletPage.count({ where: { chapter: { bookletId: b.id } } })
  ]);
  console.log('items by status:', JSON.stringify(items));
  console.log('figures:', figs, '| mcq rows:', mcqs, '| pages:', pages);
}

main().finally(() => db.$disconnect());
