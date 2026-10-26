/**
 * Convert one booklet chapter from the command line (same pipeline the admin
 * "Convert with Gemini" button uses). Output is DRAFT only — nothing is
 * published, and re-running skips stages that are already complete.
 *
 *   npx tsx scripts/booklet-process.ts \
 *     --slug tg-oral-dental --title "Therapeutic Guidelines: Oral and Dental" \
 *     --pdf "docs/books/eTG 2025.pdf" \
 *     --chapter "Local anaesthetics in dentistry" --from 58 --to 65 \
 *     [--seed-pages scripts/pilot/out/local-anaesthetics/pages.json] [--force]
 *
 * SAFETY: refuses to touch a non-local database unless you pass --yes-remote
 * (the .env DATABASE_URL points at the shared Neon "production" branch).
 * Credentials come from Admin settings / .env (GEMINI_API_KEY or Vertex ADC).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function loadEnv() {
  try {
    for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  } catch {}
}
loadEnv();
const arg = (n: string, d = '') => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const flag = (n: string) => process.argv.includes(`--${n}`);

(async () => {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const host = (dbUrl.match(/@([^/:?]+)/) ?? [])[1] ?? '?';
  const local = /^(localhost|127\.0\.0\.1)$/.test(host);
  console.log(`Database host: ${host}${local ? ' (local)' : ' (REMOTE)'}`);
  if (!local && !flag('yes-remote')) {
    console.error('Refusing: database is not local. Re-run with --yes-remote if you really mean to write DRAFT rows there.');
    process.exit(2);
  }

  const { db } = await import('../src/lib/db');
  const { createBooklet, addChapter, makeLogger } = await import('../src/lib/booklet/admin-actions');
  const { processChapter, defaultRenderer, cropFigures } = await import('../src/lib/booklet/pipeline');
  const { pageTranscript, saveExtraction } = await import('../src/lib/booklet/store');
  const { PageExtract } = await import('../src/lib/booklet/schemas');

  const slug = arg('slug');
  const pdf = path.resolve(arg('pdf'));
  const chapterTitle = arg('chapter');
  const from = Number(arg('from'));
  const to = Number(arg('to'));
  if (!slug || !arg('pdf') || !chapterTitle || !from || !to) throw new Error('--slug --pdf --chapter --from --to are required');
  if (!existsSync(pdf)) throw new Error(`PDF not found: ${pdf}`);

  const admin = await db.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  const log = makeLogger(admin?.id ?? 'cli');

  let booklet = await db.booklet.findUnique({ where: { slug } });
  if (!booklet) booklet = await createBooklet({ title: arg('title', slug), slug, publisher: arg('publisher') || undefined }, admin ? log : async () => {});
  await db.booklet.update({ where: { id: booklet.id }, data: { sourcePath: pdf } });

  let chapter = await db.bookletChapter.findFirst({ where: { bookletId: booklet.id, pdfPageFrom: from, pdfPageTo: to } });
  if (!chapter) chapter = await addChapter(booklet.id, { title: chapterTitle, pdfPageFrom: from, pdfPageTo: to }, admin ? log : async () => {});
  console.log(`Booklet ${booklet.slug} / chapter "${chapter.title}" (PDF ${from}-${to}) — status ${chapter.processStatus}`);

  // Re-use an earlier extraction instead of paying to transcribe the same pages again.
  const seed = arg('seed-pages');
  if (seed) {
    const raw = JSON.parse(readFileSync(seed, 'utf8')) as Record<string, unknown>;
    const have = new Set((await db.bookletPage.findMany({ where: { chapterId: chapter.id }, select: { pdfPage: true } })).map((p) => p.pdfPage));
    const pages: Record<number, import('../src/lib/booklet/schemas').PageExtractT> = {};
    for (const [n, v] of Object.entries(raw)) {
      const num = Number(n);
      if (num < from || num > to || have.has(num)) continue;
      pages[num] = PageExtract.parse(v);
    }
    const nums = Object.keys(pages).map(Number);
    if (nums.length) {
      const images = await defaultRenderer(pdf, nums.filter((n) => pages[n].figures.some((f) => f.meaningful)));
      const figs: { pdfPage: number; label: string; caption: string; storageKey: string }[] = [];
      for (const [n, png] of images) figs.push(...(await cropFigures(chapter.id, n, png, pages[n].figures)));
      await saveExtraction(chapter.id, pages, figs);
      console.log(`Seeded ${nums.length} previously transcribed page(s) (${nums.join(', ')}); cropped ${figs.length} figure(s).`);
    }
  }

  const r = await processChapter(chapter.id, { force: flag('force') });
  const [items, mcqs, figs, pages] = await Promise.all([
    db.bookletItem.count({ where: { chapterId: chapter.id } }),
    db.question.count({ where: { bookletChapterId: chapter.id } }),
    db.bookletFigure.count({ where: { chapterId: chapter.id } }),
    db.bookletPage.count({ where: { chapterId: chapter.id } })
  ]);
  const c = await db.bookletChapter.findUniqueOrThrow({ where: { id: chapter.id } });
  console.log('Result:', r);
  console.log(`DRAFT content: pages ${pages}, items ${items}, MCQs ${mcqs}, figures ${figs}; fact-check issues ${((c.verification as any)?.issues ?? []).length}`);
  console.log(`Review at /admin-dashboard/booklets/chapters/${chapter.id}`);
  await db.$disconnect();
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
