/**
 * READ-ONLY completeness check of a converted booklet against its chapter map.
 * Makes no API calls and writes nothing to the database.
 *
 *   DATABASE_URL=... npx tsx scripts/booklet-verify.ts [--map scripts/booklets/etg-2025-chapters.json] [--json]
 *
 * A section is COMPLETE only if: processed, every PDF page in its range is
 * transcribed, it has notes/key concepts/flashcards and >=5 valid MCQs, all
 * page references fall inside its range, no duplicated items/MCQs, tables
 * exist when the source pages contain tables, and fact-checking ran.
 */
import { readFileSync } from 'node:fs';

const arg = (n: string, d = '') => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};

(async () => {
  const host = ((process.env.DATABASE_URL ?? '').match(/@([^/:?]+)/) ?? [])[1];
  if (!host || !/^(localhost|127\.0\.0\.1)$/.test(host)) {
    console.error('Refusing: DATABASE_URL must point at a local database.');
    process.exit(2);
  }
  const map = JSON.parse(readFileSync(arg('map', 'scripts/booklets/etg-2025-chapters.json'), 'utf8'));
  const { db } = await import('../src/lib/db');
  const { McqData } = await import('../src/lib/booklet/schemas');
  const booklet = await db.booklet.findUnique({ where: { slug: map.slug } });
  if (!booklet) throw new Error(`Booklet ${map.slug} not found`);

  const rows: any[] = [];
  for (const [i, spec] of (map.chapters as { title: string; from: number; to: number }[]).entries()) {
    const c = await db.bookletChapter.findFirst({
      where: { bookletId: booklet.id, pdfPageFrom: spec.from, pdfPageTo: spec.to },
      include: { pages: true, items: true, questions: true, figures: true }
    });
    const row: any = { n: i + 1, title: spec.title, range: `${spec.from}-${spec.to}`, problems: [] as string[] };
    if (!c) {
      row.state = 'PENDING';
      rows.push(row);
      continue;
    }
    row.state = c.processStatus;
    row.stage = c.processStage;
    row.published = !!c.publishedAt;
    row.review = c.reviewStatus;
    const want = spec.to - spec.from + 1;
    const pageNums = new Set(c.pages.map((p) => p.pdfPage));
    const missing = [] as number[];
    for (let p = spec.from; p <= spec.to; p++) if (!pageNums.has(p)) missing.push(p);
    const outside = c.pages.filter((p) => p.pdfPage < spec.from || p.pdfPage > spec.to).length;
    // A page with no text is fine when it is a full-page figure we captured.
    const figPages = new Set(c.figures.map((f) => f.pdfPage));
    const empty = c.pages.filter((p) => !p.markdown.trim() && !figPages.has(p.pdfPage)).map((p) => p.pdfPage);
    const kinds: Record<string, number> = {};
    for (const it of c.items) kinds[it.kind] = (kinds[it.kind] ?? 0) + 1;
    const badRefs = [...c.items.flatMap((it) => it.pages), ...c.questions.flatMap((q) => q.sourcePages)].filter((p) => p < spec.from || p > spec.to);
    const noRefs = c.items.filter((it) => it.kind !== 'SUMMARY' && it.pages.length === 0).length + c.questions.filter((q) => q.sourcePages.length === 0).length;
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const itemKeys = c.items.map((it) => `${it.kind}:${norm(JSON.stringify(it.data))}`);
    const dupItems = itemKeys.length - new Set(itemKeys).size;
    const stems = c.questions.map((q) => norm(q.stem));
    const dupMcqs = stems.length - new Set(stems).size;
    const invalidMcqs = c.questions.filter(
      (q) => !McqData.safeParse({ stem: q.stem, options: q.options, correct: q.correct, explanation: q.explanation, difficulty: q.difficulty, pages: q.sourcePages }).success
    ).length;
    const sourceTables = c.pages.filter((p) => /\nTABLE /.test(`\n${p.markdown}`)).length;
    const issues = ((c.verification as any)?.issues ?? []) as { severity: string; resolved?: boolean }[];

    Object.assign(row, {
      pages: `${c.pages.length}/${want}`,
      items: c.items.length,
      kinds,
      mcqs: c.questions.length,
      figures: c.figures.length,
      sourceTables,
      factCheck: c.verification ? `${issues.length} (${issues.filter((x) => x.severity === 'high').length} high)` : 'NOT RUN'
    });
    const P = row.problems as string[];
    if (c.processStatus !== 'PROCESSED') P.push(`status ${c.processStatus}${c.processError ? `: ${c.processError.slice(0, 120)}` : ''}`);
    if (missing.length) P.push(`missing pages ${missing.join(',')}`);
    if (outside) P.push(`${outside} page rows outside range`);
    if (empty.length) P.push(`empty transcription on page(s) ${empty.join(',')}`);
    for (const k of ['NOTE', 'KEY_CONCEPT', 'FLASHCARD']) if (!kinds[k]) P.push(`no ${k}`);
    if (c.questions.length < 5) P.push(`only ${c.questions.length} MCQs`);
    if (invalidMcqs) P.push(`${invalidMcqs} invalid MCQs`);
    if (badRefs.length) P.push(`${badRefs.length} page refs outside ${spec.from}-${spec.to}`);
    if (noRefs) P.push(`${noRefs} items/MCQs without a page reference`);
    if (dupItems) P.push(`${dupItems} duplicated items`);
    if (dupMcqs) P.push(`${dupMcqs} duplicated MCQ stems`);
    if (sourceTables && !kinds.TABLE) P.push(`source has ${sourceTables} page(s) with tables but no TABLE item`);
    if (!c.verification && c.processStatus === 'PROCESSED') P.push('fact-check did not run');
    if (c.publishedAt) P.push('PUBLISHED (should be draft)');
    row.complete = c.processStatus === 'PROCESSED' && P.length === 0;
    rows.push(row);
  }

  const all = await db.question.findMany({ where: { bookletChapter: { bookletId: booklet.id } }, select: { stem: true, bookletChapterId: true } });
  const seen = new Map<string, string>();
  let crossDup = 0;
  for (const q of all) {
    const k = q.stem.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(k) && seen.get(k) !== q.bookletChapterId) crossDup++;
    seen.set(k, q.bookletChapterId!);
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ rows, crossChapterDuplicateMcqs: crossDup }, null, 2));
  } else {
    for (const r of rows) {
      const head = `${String(r.n).padStart(2)}. [${r.complete ? 'COMPLETE' : r.state}] ${r.title} (${r.range})`;
      console.log(head);
      if (r.state !== 'PENDING') console.log(`      pages ${r.pages} · items ${r.items} ${JSON.stringify(r.kinds)} · MCQs ${r.mcqs} · figures ${r.figures} · source table pages ${r.sourceTables} · fact-check ${r.factCheck} · ${r.published ? 'PUBLISHED' : 'draft'}`);
      for (const p of r.problems) console.log(`      ! ${p}`);
    }
    const count = (s: string) => rows.filter((r) => (s === 'COMPLETE' ? r.complete : !r.complete && r.state === s)).length;
    console.log(`\nComplete ${count('COMPLETE')} · processed-with-problems ${rows.filter((r) => !r.complete && r.state === 'PROCESSED').length} · processing ${count('PROCESSING')} · failed ${count('FAILED')} · pending ${count('PENDING')} · cross-chapter duplicate MCQs ${crossDup}`);
  }
  await db.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('VERIFY FAILED:', e.message);
  process.exit(1);
});
