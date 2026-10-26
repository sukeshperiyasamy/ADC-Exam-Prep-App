/**
 * LOCAL-ONLY dev fixture: creates a clearly-labeled synthetic published booklet
 * so the full student experience (library card, TOC, reader, all six study
 * modes, MCQs, mock test) can be tested without publishing the real eTG
 * booklet, whose licensing/clinical-review safeguards stay untouched.
 *
 * Drives the SAME admin-actions workflow the admin UI uses — no direct table
 * writes, no invented licensing evidence (the note says exactly what it is).
 *
 *   npx tsx scripts/dev-booklet-fixture.ts        # uses local DB by default
 */
import assert from 'node:assert/strict';

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:55434/adc_local';
process.env.DATABASE_URL = url;
process.env.DATABASE_URL_UNPOOLED = url;
if (!/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)) {
  console.error('Refusing to run: this fixture only targets a LOCAL database.');
  process.exit(2);
}

const SLUG = 'study-experience-demo';
const log = async () => {};

async function main() {
  const { db } = await import('../src/lib/db');
  const A = await import('../src/lib/booklet/admin-actions');

  const existing = await db.booklet.findUnique({ where: { slug: SLUG }, select: { id: true, status: true } });
  if (existing && existing.status === 'PUBLISHED') {
    console.log(`Fixture booklet already PUBLISHED (id ${existing.id}) — nothing to do.`);
    await db.$disconnect();
    return;
  }
  if (existing) {
    // Half-created by an earlier failed run: recreate from scratch.
    console.log(`Removing incomplete fixture (id ${existing.id}, status ${existing.status}) to recreate it…`);
    await db.booklet.delete({ where: { id: existing.id } });
  }

  const booklet = await A.createBooklet(
    {
      title: 'Study Experience Demo',
      slug: SLUG,
      publisher: 'Internal Test Fixture',
      description:
        'Synthetic demo booklet for testing the student reading experience. The content is placeholder text — NOT clinical guidance and NOT part of any licensed publication.'
    },
    log
  );
  await A.updateBooklet(
    booklet.id,
    { licenseNote: 'Synthetic demo fixture — contains no licensed source material.', licenseConfirmed: true },
    log
  );

  const mcq = (n: number, ok: 'a' | 'b' = 'a') => ({
    stem: `Demo question ${n}: which statement matches the fixture content?`,
    options: [
      { id: 'a', text: 'The demo option (correct for this fixture)' },
      { id: 'b', text: 'An incorrect demo option' },
      { id: 'c', text: 'Another incorrect demo option' },
      { id: 'd', text: 'One more incorrect demo option' }
    ],
    correct: [ok],
    explanation: 'Fixture explanation: the demo content marks this option as correct for demonstration purposes.',
    difficulty: 1,
    pages: [1]
  });

  const chapters: Array<{ title: string; content: unknown }> = [
    {
      title: 'Getting Around the Demo',
      content: {
        summary: 'This fixture booklet exists so the study library, chapter navigation and reader can be tested with a student account. Every mode below is populated with placeholder content.',
        notes: [
          {
            heading: 'Unique heading ALPHA (fixture)',
            bullets: [
              'Open the Study Library to see this card with a Free Preview badge.',
              'Use the sticky mode tabs above to switch between the six study modes.',
              'On wide screens a chapter rail appears on the right; Previous/Next links sit below the content.',
              'This is placeholder content — it is not dental advice and not part of any licensed publication.'
            ],
            pages: [1]
          }
        ],
        keyConcepts: [],
        tables: [],
        flashcards: [],
        mcqs: []
      }
    },
    {
      title: 'Concepts and Tables',
      content: {
        summary: 'Demonstrates key-concept chips and the scrollable table renderer.',
        notes: [],
        keyConcepts: [
          { point: 'Fixture concept one: key concepts render as numbered cards with bookmark support.', pages: [2] },
          { point: 'Fixture concept two: tables scroll horizontally on narrow screens.', pages: [2] },
          { point: 'Fixture concept three: page citations open the source PDF inspector.', pages: [2] }
        ],
        tables: [
          {
            title: 'Demo table — fixture data',
            headers: ['Mode', 'What it shows', 'Fixture notes'],
            rows: [
              ['Easy Notes', 'Bulleted chapter notes', 'Placeholder bullets'],
              ['Short Summary', 'Single-paragraph summary', 'This chapter'],
              ['Key concepts', 'Numbered concept cards', 'Three fixture concepts'],
              ['Tables', 'Structured data', 'The table you are reading'],
              ['Flowcharts', 'Step-by-step sequences', 'Next chapter'],
              ['Flashcards', 'Flip cards with keyboard support', 'Final chapter']
            ],
            pages: [2]
          }
        ],
        flashcards: [],
        mcqs: []
      }
    },
    {
      title: 'Flowcharts',
      content: {
        summary: 'Demonstrates the step-by-step flowchart renderer.',
        notes: [],
        keyConcepts: [],
        tables: [],
        flowchart: {
          title: 'Fixture flow — testing the reader',
          steps: [
            { title: 'Sign in', detail: 'Any account works; the chapters are free previews.' },
            { title: 'Browse the library', detail: 'Filter by access status or search by title.' },
            { title: 'Open a chapter', detail: 'Switch modes with the sticky tabs.' },
            { title: 'Try flashcards and MCQs', detail: 'Continue to the final chapter.' }
          ],
          pages: [3]
        },
        flashcards: [],
        mcqs: []
      }
    },
    {
      title: 'Flashcards and Practice MCQs',
      content: {
        summary: 'Demonstrates flashcards and booklet MCQs, including the timed mock entry.',
        notes: [],
        keyConcepts: [],
        tables: [],
        flashcards: [
          { front: 'Fixture front: what does this booklet demonstrate?', back: 'The redesigned study library, TOC and chapter reader.', pages: [4] },
          { front: 'Fixture front: is this real clinical content?', back: 'No — every line here is synthetic placeholder text.', pages: [4] }
        ],
        mcqs: [mcq(1, 'a'), mcq(2, 'b')]
      }
    }
  ];

  for (const [i, c] of chapters.entries()) {
    const ch = await A.addChapter(
      booklet.id,
      { title: c.title, pdfPageFrom: i + 1, pdfPageTo: i + 1, isFreePreview: true },
      log
    );
    await A.importChapterContent(ch.id, c.content, log);
    await A.bulkSetStatus(ch.id, 'APPROVED', log);
    await A.reviewChapter(ch.id, { action: 'submit' }, log);
    await A.reviewChapter(
      ch.id,
      { action: 'approve', reviewerName: 'Demo Fixture (synthetic content, not clinically reviewed)' },
      log
    );
    await A.publishChapter(ch.id, true, log);
    console.log(`  ✓ chapter "${c.title}" imported, approved, published`);
  }

  await A.updateBooklet(booklet.id, { status: 'PUBLISHED' }, log);
  const final = await db.booklet.findUniqueOrThrow({
    where: { slug: SLUG },
    select: { status: true, licenseConfirmed: true, licenseNote: true, accessExamId: true }
  });
  console.log('Fixture ready:', JSON.stringify(final, null, 1));
  assert.equal(final.status, 'PUBLISHED');
  await db.$disconnect();
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e?.message ?? e);
    process.exit(1);
  }
);
