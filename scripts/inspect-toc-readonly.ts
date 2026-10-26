// Read-only: verify the reconstructed hierarchy covers every tg-oral-dental
// chapter exactly once. Run against the local dev DB.
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55434/adc_local npx tsx scripts/inspect-toc-readonly.ts
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:55434/adc_local';
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  const b = await db.booklet.findUnique({ where: { slug: 'tg-oral-dental' }, select: { id: true } });
  if (!b) { console.log('tg-oral-dental not found in this database'); return; }
  const chapters = await db.bookletChapter.findMany({
    where: { bookletId: b.id },
    orderBy: { position: 'asc' },
    select: { id: true, slug: true, title: true }
  });
  const { buildBookletHierarchy } = await import('../src/lib/booklet/toc');
  const items = chapters.map((c) => ({
    ...c,
    pdfPageFrom: 1,
    pdfPageTo: 1,
    isFreePreview: false,
    live: false,
    access: { ok: false, reason: 'unpublished' as const },
    mcqCount: 0,
    progress: null
  }));
  const groups = buildBookletHierarchy('tg-oral-dental', items);
  const flat = groups.flatMap((g) => g.chapters);
  const unmatched = chapters.filter((c) => !flat.some((f) => f.id === c.id));
  console.log(JSON.stringify({
    chaptersInDb: chapters.length,
    groups: groups.length,
    flattened: flat.length,
    uniqueIds: new Set(flat.map((c) => c.id)).size,
    unmatched: unmatched.map((c) => c.slug)
  }, null, 1));
  await db.$disconnect();
}
main().then(
  () => process.exit(0),
  (e) => { console.error(e); process.exit(1); }
);
