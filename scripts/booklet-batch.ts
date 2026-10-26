/**
 * Convert every chapter listed in a booklet chapter map, one after another.
 * Resumable: chapters already PROCESSED (with content) are skipped, and inside
 * a chapter finished pages are never re-transcribed. A failing chapter is
 * logged and the batch moves on. Output is DRAFT only — nothing is published.
 *
 *   DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/booklet-batch.ts \
 *     [--map scripts/booklets/etg-2025-chapters.json] [--only 12,13] [--force]
 *
 * Refuses non-local databases. Progress: .localdb/booklet-batch-report.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

for (const l of (existsSync('.env') ? readFileSync('.env', 'utf8') : '').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const arg = (n: string, d = '') => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};

type ChapterSpec = { title: string; from: number; to: number; seedPages?: string };
type MapFile = { slug: string; title: string; publisher?: string; pdf: string; chapters: ChapterSpec[] };

(async () => {
  for (const k of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']) {
    const host = ((process.env[k] ?? '').match(/@([^/:?]+)/) ?? [])[1];
    if (!host || !/^(localhost|127\.0\.0\.1)$/.test(host)) {
      console.error(`Refusing: ${k} must point at a local database (got ${host ?? 'nothing'}).`);
      process.exit(2);
    }
  }
  const map: MapFile = JSON.parse(readFileSync(arg('map', 'scripts/booklets/etg-2025-chapters.json'), 'utf8'));
  const only = arg('only') ? new Set(arg('only').split(',').map(Number)) : null;
  const force = process.argv.includes('--force');
  const pdf = path.resolve(map.pdf);
  if (!existsSync(pdf)) throw new Error(`PDF not found: ${pdf}`);

  const { db } = await import('../src/lib/db');
  const { createBooklet, addChapter, makeLogger } = await import('../src/lib/booklet/admin-actions');
  const { processChapter, defaultRenderer, cropFigures } = await import('../src/lib/booklet/pipeline');
  const { saveExtraction } = await import('../src/lib/booklet/store');
  const { PageExtract } = await import('../src/lib/booklet/schemas');

  const admin = await db.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  const log = admin ? makeLogger(admin.id) : async () => {};
  let booklet = await db.booklet.findUnique({ where: { slug: map.slug } });
  if (!booklet) booklet = await createBooklet({ title: map.title, slug: map.slug, publisher: map.publisher }, log);
  await db.booklet.update({ where: { id: booklet.id }, data: { sourcePath: pdf, totalPages: 356 } });

  mkdirSync('.localdb', { recursive: true });
  const reportFile = '.localdb/booklet-batch-report.json';
  const report: any[] = [];
  const save = () => writeFileSync(reportFile, JSON.stringify({ updatedAt: new Date().toISOString(), booklet: map.slug, chapters: report }, null, 2));
  const started = Date.now();

  for (const [idx, spec] of map.chapters.entries()) {
    const n = idx + 1;
    if (only && !only.has(n)) continue;
    const tag = `[${n}/${map.chapters.length}] ${spec.title} (PDF ${spec.from}-${spec.to})`;
    let ch = await db.bookletChapter.findFirst({ where: { bookletId: booklet.id, pdfPageFrom: spec.from, pdfPageTo: spec.to } });
    if (!ch) ch = await addChapter(booklet.id, { title: spec.title, pdfPageFrom: spec.from, pdfPageTo: spec.to }, log);
    if (ch.position !== idx) await db.bookletChapter.update({ where: { id: ch.id }, data: { position: idx } });

    const itemsBefore = await db.bookletItem.count({ where: { chapterId: ch.id } });
    if (!force && ch.processStatus === 'PROCESSED' && itemsBefore > 0 && ch.verification) {
      console.log(`${tag} — already converted, skipping`);
      report.push({ n, title: spec.title, status: 'skipped' });
      save();
      continue;
    }
    const t0 = Date.now();
    console.log(`${tag} — converting…`);
    try {
      if (spec.seedPages && existsSync(spec.seedPages)) {
        const raw = JSON.parse(readFileSync(spec.seedPages, 'utf8')) as Record<string, unknown>;
        const have = new Set((await db.bookletPage.findMany({ where: { chapterId: ch.id }, select: { pdfPage: true } })).map((p) => p.pdfPage));
        const pages: Record<number, any> = {};
        for (const [k, v] of Object.entries(raw)) {
          const p = Number(k);
          if (p >= spec.from && p <= spec.to && !have.has(p)) pages[p] = PageExtract.parse(v);
        }
        const nums = Object.keys(pages).map(Number);
        if (nums.length) {
          const imgs = await defaultRenderer(pdf, nums.filter((p) => pages[p].figures.some((f: any) => f.meaningful)));
          const figs = [];
          for (const [p, png] of imgs) figs.push(...(await cropFigures(ch.id, p, png, pages[p].figures)));
          await saveExtraction(ch.id, pages, figs);
          console.log(`   reused ${nums.length} previously transcribed page(s)`);
        }
      }
      const r = await processChapter(ch.id, { force });
      const [items, mcqs, figs] = await Promise.all([
        db.bookletItem.count({ where: { chapterId: ch.id } }),
        db.question.count({ where: { bookletChapterId: ch.id } }),
        db.bookletFigure.count({ where: { chapterId: ch.id } })
      ]);
      const c = await db.bookletChapter.findUniqueOrThrow({ where: { id: ch.id } });
      const issues = ((c.verification as any)?.issues ?? []) as { severity: string }[];
      const row = {
        n, title: spec.title, status: 'ok', chapterId: ch.id, transcribedPages: r.transcribedPages,
        items, mcqs, figures: figs, issues: issues.length, highIssues: issues.filter((i) => i.severity === 'high').length,
        seconds: Math.round((Date.now() - t0) / 1000)
      };
      report.push(row);
      console.log(`   done in ${row.seconds}s: ${items} items, ${mcqs} MCQs, ${figs} figures, ${row.issues} fact-check issues (${row.highIssues} high)`);
    } catch (e: any) {
      report.push({ n, title: spec.title, status: 'failed', chapterId: ch.id, error: String(e?.message ?? e).slice(0, 300) });
      console.log(`   FAILED: ${String(e?.message ?? e).slice(0, 200)} — continuing; re-run to resume`);
    }
    save();
  }

  const ok = report.filter((r) => r.status === 'ok').length;
  const failed = report.filter((r) => r.status === 'failed').length;
  console.log(`\nBatch finished in ${Math.round((Date.now() - started) / 60000)} min: ${ok} converted, ${failed} failed, ${report.filter((r) => r.status === 'skipped').length} skipped. Report: ${reportFile}`);
  await db.$disconnect();
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('BATCH FAILED:', e.message);
  process.exit(1);
});
