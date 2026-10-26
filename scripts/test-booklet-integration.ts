/**
 * Booklet workflow integration test against a THROWAWAY LOCAL Postgres.
 * Gemini and PDF rendering are MOCKED — no real Gemini call is made.
 *
 *   TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/booklet_test \
 *     npx tsx scripts/test-booklet-integration.ts
 *
 * Refuses to run against anything that is not localhost.
 */
import assert from 'node:assert/strict';

const url = process.env.TEST_DATABASE_URL;
if (!url || !/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)) {
  console.error('Refusing to run: set TEST_DATABASE_URL to a LOCAL database (localhost/127.0.0.1).');
  process.exit(2);
}
process.env.DATABASE_URL = url;
process.env.DATABASE_URL_UNPOOLED = url;

let passed = 0;
const t = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${(e as Error).stack?.split('\n').slice(0, 4).join('\n    ')}`);
    process.exitCode = 1;
  }
};
const rejectsWith = async (p: Promise<unknown>, re: RegExp) => {
  try {
    await p;
  } catch (e: any) {
    const msg = `${e?.message} ${(e?.blockers ?? []).join(' | ')}`;
    assert.match(msg, re);
    return e;
  }
  assert.fail('expected rejection');
};

(async () => {
  const { db } = await import('../src/lib/db');
  const A = await import('../src/lib/booklet/admin-actions');
  const Q = await import('../src/lib/booklet/queries');
  const { processChapter } = await import('../src/lib/booklet/pipeline');
  const { decideAccess } = await import('../src/lib/booklet/access');
  const { scoreAttempt } = await import('../src/lib/attempts');
  const { getFigure } = await import('../src/lib/booklet/figure-storage');
  const { getGroupedExams } = await import('../src/lib/my-exams');
  const sharp = (await import('sharp')).default;

  // ---- fixtures ---------------------------------------------------------------
  const uniq = Date.now().toString(36);
  const vendor = await db.vendor.upsert({ where: { slug: 'adc' }, update: {}, create: { slug: 'adc', name: 'ADC' } });
  const mkUser = (email: string, role: 'ADMIN' | 'USER') => db.user.create({ data: { email: `${email}-${uniq}@test.local`, role } });
  const admin = await mkUser('admin', 'ADMIN');
  const paid = await mkUser('paid', 'USER');
  const free = await mkUser('free', 'USER');
  const log = A.makeLogger(admin.id);

  const png = await sharp({ create: { width: 200, height: 300, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const render = async (_p: string, pages: number[]) => new Map(pages.map((n) => [n, png]));

  let genCalls = 0;
  let failNext = false;
  const mkGen = () => ({
    model: 'mock-gemini',
    async generate(parts: any[], schema: any) {
      genCalls++;
      if (failNext) {
        failNext = false;
        throw Object.assign(new Error('API key invalid'), { status: 401 });
      }
      const props = Object.keys(schema.properties ?? {});
      if (props.includes('printedPage')) {
        return JSON.stringify({
          printedPage: '7',
          markdown: '# Local anaesthetics\nArticaine 4% max dose is 7 mg/kg.',
          tables: [{ caption: 'Table 1', headers: ['Drug', 'Max'], rows: [['Articaine', '7 mg/kg']], footnotes: '' }],
          figures: [{ label: 'Figure 1', caption: 'Injection sites', meaningful: true, box: [100, 100, 600, 900] }]
        });
      }
      if (props.includes('issues')) {
        return JSON.stringify({ issues: [{ item: 'MCQ 2', problem: 'Dose not in source', severity: 'high', suggestedFix: 'Use 7 mg/kg' }] });
      }
      const mcq = (n: number) => ({
        stem: `Question ${n}?`,
        options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }, { id: 'd', text: 'D' }],
        correct: ['a'],
        explanation: 'Because A.',
        difficulty: 2,
        pages: [10]
      });
      return JSON.stringify({
        summary: 'A short summary.',
        notes: [{ heading: 'Doses', bullets: ['Articaine 7 mg/kg'], pages: [10] }],
        keyConcepts: [{ point: 'Check max dose', pages: [10] }, { point: 'Aspirate first', pages: [10] }],
        tables: [{ title: 'Max doses', headers: ['Drug', 'Max'], rows: [['Articaine', '7 mg/kg']], pages: [10] }],
        flowchart: { title: 'Workflow', steps: [{ title: 'Assess', detail: 'History' }, { title: 'Inject', detail: 'Slowly' }], pages: [10] },
        flashcards: [{ front: 'Max articaine?', back: '7 mg/kg', pages: [10] }],
        // one invalid MCQ (key not in options) must be dropped, not stored
        mcqs: [mcq(1), mcq(2), { ...mcq(3), correct: ['z'] }]
      });
    }
  });

  console.log('setup & conversion');
  const booklet = await A.createBooklet({ title: `Test Booklet ${uniq}`, publisher: 'Test' }, log);
  const examId = booklet.accessExamId ?? (await db.booklet.findUniqueOrThrow({ where: { id: booklet.id } })).accessExamId!;
  await db.booklet.update({ where: { id: booklet.id }, data: { sourcePath: 'C:/fake/source.pdf', totalPages: 100 } });

  await t('creating a booklet makes a hidden, unpublished access exam', async () => {
    const exam = await db.exam.findUniqueOrThrow({ where: { id: examId } });
    assert.equal(exam.published, false);
    assert.equal(exam.level, 'Booklet');
  });
  await t('chapter validation rejects bad page ranges', async () => {
    await rejectsWith(A.addChapter(booklet.id, { title: 'x', pdfPageFrom: 10, pdfPageTo: 5 }, log), /page range/);
    await rejectsWith(A.addChapter(booklet.id, { title: 'x', pdfPageFrom: 90, pdfPageTo: 101 }, log), /only has 100/);
  });
  const ch1 = await A.addChapter(booklet.id, { title: 'Local anaesthetics', pdfPageFrom: 9, pdfPageTo: 11 }, log);
  const ch2 = await A.addChapter(booklet.id, { title: 'Preview chapter', pdfPageFrom: 20, pdfPageTo: 20, isFreePreview: true }, log);

  await t('API failure marks chapter FAILED with a readable error, nothing half-saved as ready', async () => {
    failNext = true;
    await rejectsWith(processChapter(ch1.id, {}, { gen: mkGen(), render, retryDelayMs: 1 }), /Gemini error 401/);
    const c = await db.bookletChapter.findUniqueOrThrow({ where: { id: ch1.id } });
    assert.equal(c.processStatus, 'FAILED');
    assert.match(c.processError ?? '', /401/);
    assert.equal(await db.bookletItem.count({ where: { chapterId: ch1.id } }), 0);
  });

  await t('retry converts: pages, figure, DRAFT items, DRAFT MCQs, fact-check issues', async () => {
    const r = await processChapter(ch1.id, {}, { gen: mkGen(), render, retryDelayMs: 1 });
    assert.equal(r.transcribedPages, 3);
    assert.equal(r.generated, true);
    const c = await db.bookletChapter.findUniqueOrThrow({ where: { id: ch1.id } });
    assert.equal(c.processStatus, 'PROCESSED');
    assert.equal(c.reviewStatus, 'DRAFT');
    assert.equal(c.publishedAt, null);
    assert.equal(await db.bookletPage.count({ where: { chapterId: ch1.id } }), 3);
    const figs = await db.bookletFigure.findMany({ where: { chapterId: ch1.id } });
    assert.equal(figs.length, 3);
    assert.ok(figs.every((f) => !f.approved), 'figures start unapproved');
    const stored = await getFigure(figs[0].storageKey);
    assert.ok(stored && stored.body.length > 0, 'figure bytes retrievable from private storage');
    const items = await db.bookletItem.findMany({ where: { chapterId: ch1.id } });
    assert.ok(items.length >= 7 && items.every((i) => i.status === 'DRAFT'));
    const qs = await db.question.findMany({ where: { bookletChapterId: ch1.id } });
    assert.equal(qs.length, 2, 'invalid MCQ dropped');
    assert.ok(qs.every((q) => q.status === 'DRAFT' && q.examId === examId && q.sourcePages.includes(10)));
    assert.equal(((c.verification as any).issues as any[]).length, 1);
  });

  await t('re-running does NOT call Gemini again for completed stages', async () => {
    const before = genCalls;
    const r = await processChapter(ch1.id, {}, { gen: mkGen(), render, retryDelayMs: 1 });
    assert.equal(r.transcribedPages, 0);
    assert.equal(r.generated, false);
    assert.equal(genCalls, before);
  });

  console.log('access before publication');
  const bookletRow = () => db.booklet.findUniqueOrThrow({ where: { id: booklet.id } });
  const viewerOf = (u: { id: string }, isAdmin = false, hasEntitlement = false) => ({ userId: u.id, isAdmin, hasEntitlement });

  await t('student cannot read or start MCQs on an unpublished chapter', async () => {
    const r = await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(paid));
    assert.equal(r.status, 'unpublished');
    const p = await Q.pickQuestionIds({ bookletId: booklet.id, chapterId: ch1.id, viewer: viewerOf(paid), count: 10 });
    assert.equal(p.error, 'not-found');
    assert.equal(await Q.loadBookletForStudent(booklet.slug, viewerOf(paid)), null);
    assert.ok(!(await Q.loadLibrary(viewerOf(paid))).some((b) => b.id === booklet.id), 'draft booklet not listed');
  });
  await t('admin can preview drafts', async () => {
    const r = await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(admin, true, true));
    assert.equal(r.status, 'ok');
  });

  console.log('publication gates');
  await t('cannot confirm licence without recording details', async () => {
    await rejectsWith(A.updateBooklet(booklet.id, { licenseConfirmed: true }, log), /licence/i);
    await rejectsWith(A.updateBooklet(booklet.id, { licenseConfirmed: true, licenseNote: '   ' }, log), /Record the licence/i);
  });
  await t('saving license note without confirming licensing keeps licenseConfirmed false', async () => {
    await A.updateBooklet(booklet.id, { licenseNote: 'Synthetic draft note without confirmation', licenseConfirmed: false }, log);
    const b = await db.booklet.findUniqueOrThrow({ where: { id: booklet.id } });
    assert.equal(b.licenseNote, 'Synthetic draft note without confirmation');
    assert.equal(b.licenseConfirmed, false);
  });
  await t('saving license note and confirmation checkbox together persists both', async () => {
    await A.updateBooklet(booklet.id, { licenseNote: 'Synthetic test licence #123 from Test Publisher, signed 2026-10-01', licenseConfirmed: true }, log);
    const b = await db.booklet.findUniqueOrThrow({ where: { id: booklet.id } });
    assert.equal(b.licenseNote, 'Synthetic test licence #123 from Test Publisher, signed 2026-10-01');
    assert.equal(b.licenseConfirmed, true);
  });
  await t('revoking licensing confirmation resets licenseConfirmed to false and status to DRAFT', async () => {
    await A.updateBooklet(booklet.id, { licenseConfirmed: false }, log);
    const b = await db.booklet.findUniqueOrThrow({ where: { id: booklet.id } });
    assert.equal(b.licenseConfirmed, false);
    assert.equal(b.status, 'DRAFT');
  });
  await t('cannot publish chapter: licence, review, drafts, high-severity issue', async () => {
    const e = await rejectsWith(A.publishChapter(ch1.id, true, log), /cannot be published/);
    const text = e.blockers.join(' | ');
    for (const re of [/licensing/, /clinical reviewer/, /DRAFT/, /high-severity/]) assert.match(text, re);
  });
  await t('cannot approve without a named reviewer, or before submission', async () => {
    await rejectsWith(A.reviewChapter(ch1.id, { action: 'approve' }, log), /name is required/);
    await rejectsWith(A.reviewChapter(ch1.id, { action: 'approve', reviewerName: 'Dr X' }, log), /Submit the chapter/);
  });
  await t('cannot publish booklet before any chapter is live', async () => {
    await A.updateBooklet(booklet.id, { licenseNote: 'Licence #123 from Publisher, signed 2026-10-01', licenseConfirmed: true }, log);
    await rejectsWith(A.updateBooklet(booklet.id, { status: 'PUBLISHED' }, log), /cannot be published/);
  });

  console.log('review & publish');
  await t('invalid edits are rejected; valid edits saved', async () => {
    const q = (await db.question.findMany({ where: { bookletChapterId: ch1.id }, orderBy: { createdAt: 'asc' } }))[0];
    await rejectsWith(A.editQuestion(q.id, { mcq: { stem: 's', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correct: ['q'], explanation: 'e' } }, log), /Invalid question/);
    await A.editQuestion(q.id, { mcq: { stem: 'Edited stem?', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correct: ['b'], explanation: 'Because B.', pages: [10] } }, log);
    const after = await db.question.findUniqueOrThrow({ where: { id: q.id } });
    assert.equal(after.stem, 'Edited stem?');
    assert.deepEqual(after.correct, ['b']);
    assert.equal(after.version, 2);
    const item = (await db.bookletItem.findMany({ where: { chapterId: ch1.id, kind: 'FLASHCARD' } }))[0];
    await rejectsWith(A.editItem(item.id, { data: { front: 'only front' } }, log), /Invalid FLASHCARD/);
  });
  await t('rejected items are never shown to students', async () => {
    const kc = (await db.bookletItem.findMany({ where: { chapterId: ch1.id, kind: 'KEY_CONCEPT' }, orderBy: { position: 'asc' } }));
    await A.editItem(kc[1].id, { status: 'REJECTED' }, log);
  });
  await t('full review path then publish succeeds', async () => {
    await A.bulkSetStatus(ch1.id, 'APPROVED', log);
    // bulk approve must not resurrect the rejected item
    assert.equal(await db.bookletItem.count({ where: { chapterId: ch1.id, status: 'REJECTED' } }), 1);
    await A.reviewChapter(ch1.id, { action: 'submit' }, log);
    await A.reviewChapter(ch1.id, { action: 'approve', reviewerName: 'Dr A. Smith (AHPRA DEN123)', note: 'Checked vs source' }, log);
    // still blocked: unresolved high-severity AI finding
    await rejectsWith(A.publishChapter(ch1.id, true, log), /high-severity/);
    await A.reviewChapter(ch1.id, { action: 'approve', reviewerName: 'Dr A. Smith (AHPRA DEN123)', resolveIssueIndexes: [0] }, log);
    await A.publishChapter(ch1.id, true, log);
    assert.ok((await db.bookletChapter.findUniqueOrThrow({ where: { id: ch1.id } })).publishedAt);
    await A.updateBooklet(booklet.id, { status: 'PUBLISHED' }, log);
  });

  console.log('student access & entitlements');
  await db.entitlement.create({ data: { userId: paid.id, examId, tier: 'PRACTICE' } });
  await db.entitlement.create({ data: { userId: free.id, examId, tier: 'PRACTICE', expiresAt: new Date(Date.now() - 1000) } });
  const unentitled = await mkUser('nobody', 'USER');

  await t('entitled student sees APPROVED content only (no rejected, no drafts)', async () => {
    const r = await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(paid));
    assert.equal(r.status, 'ok');
    if (r.status !== 'ok') return;
    assert.ok(r.items.every((i) => i.status === 'APPROVED'));
    assert.equal(r.items.filter((i) => i.kind === 'KEY_CONCEPT').length, 1, 'rejected concept hidden');
    assert.equal(r.figures.length, 0, 'unapproved figures hidden');
    assert.equal(r.mcqCount, 2);
    assert.ok(!('markdown' in (r.pages[0] ?? {})), 'source transcription not exposed');
  });
  await t('student without entitlement is told to purchase; with expired entitlement too', async () => {
    assert.equal((await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(unentitled))).status, 'purchase-required');
    assert.equal((await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(free))).status, 'purchase-required');
    const p = await Q.pickQuestionIds({ bookletId: booklet.id, chapterId: ch1.id, viewer: viewerOf(unentitled), count: 10 });
    assert.equal(p.error, 'forbidden');
    assert.equal((await Q.pickQuestionIds({ bookletId: booklet.id, viewer: viewerOf(unentitled), count: 10 })).error, 'forbidden');
  });
  await t('anonymous viewer is refused', async () => {
    assert.equal((await Q.loadChapterForStudent(booklet.slug, ch1.slug, { isAdmin: false, hasEntitlement: false })).status, 'login-required');
  });
  await t('approved figure becomes visible; unapproved stays hidden', async () => {
    const figs = await db.bookletFigure.findMany({ where: { chapterId: ch1.id }, orderBy: { pdfPage: 'asc' } });
    await A.setFigureApproved(figs[0].id, true, log);
    const r = await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(paid));
    if (r.status !== 'ok') throw new Error('expected ok');
    assert.deepEqual(r.figures.map((f) => f.id), [figs[0].id]);
  });
  await t('free-preview chapter: unpublished => hidden, published => open to non-entitled', async () => {
    assert.equal((await Q.loadChapterForStudent(booklet.slug, ch2.slug, viewerOf(unentitled))).status, 'unpublished');
    await processChapter(ch2.id, {}, { gen: mkGen(), render, retryDelayMs: 1 });
    await A.bulkSetStatus(ch2.id, 'APPROVED', log);
    await A.reviewChapter(ch2.id, { action: 'submit' }, log);
    await A.reviewChapter(ch2.id, { action: 'approve', reviewerName: 'Dr A. Smith', resolveIssueIndexes: [0] }, log);
    await A.publishChapter(ch2.id, true, log);
    assert.equal((await Q.loadChapterForStudent(booklet.slug, ch2.slug, viewerOf(unentitled))).status, 'ok');
    // ...but only that chapter's questions are reachable without entitlement
    const all = await Q.pickQuestionIds({ bookletId: booklet.id, viewer: viewerOf(unentitled), count: 99 });
    const ch2q = new Set((await db.question.findMany({ where: { bookletChapterId: ch2.id } })).map((q) => q.id));
    assert.ok(all.ids.length > 0 && all.ids.every((id) => ch2q.has(id)));
  });

  await t('paid user with ADC-PART1 exam entitlement gets full access to published booklet', async () => {
    const part1User = await mkUser('part1-student', 'USER');
    const adcPart1Exam = await db.exam.upsert({
      where: { slug: `adc-part1-${uniq}` },
      update: {},
      create: {
        vendorId: vendor.id,
        code: 'ADC-PART1',
        slug: `adc-part1-${uniq}`,
        title: 'ADC Written Examination (Part 1)',
        description: 'Primary ADC Written Examination preparation exam',
        level: 'Standard',
        durationMinutes: 120,
        passingScore: 70,
        questionCount: 50,
        domains: [],
        published: true
      }
    });
    // Grant ADC-PART1 entitlement to part1User
    await db.entitlement.create({ data: { userId: part1User.id, examId: adcPart1Exam.id, tier: 'PRACTICE' } });

    assert.equal(await Q.hasBookletEntitlement(part1User.id, examId), true);
    const r = await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(part1User));
    assert.equal(r.status, 'ok');
    const lib = await Q.loadLibrary(viewerOf(part1User));
    const entry = lib.find((b) => b.id === booklet.id);
    assert.ok(entry);
    assert.equal(entry.entitled, true);
  });

  await t('paid user with bundle entitlement containing booklet access exam gets full access', async () => {
    const bundleUser = await mkUser('bundle-student', 'USER');
    const siblingExam = await db.exam.create({
      data: {
        vendorId: vendor.id,
        code: `SIB-${uniq}`.slice(0, 40),
        slug: `sibling-exam-${uniq}`,
        title: 'Sibling Bundle Exam',
        description: 'Sibling exam in bundle',
        level: 'Standard',
        durationMinutes: 60,
        passingScore: 70,
        questionCount: 20,
        domains: [],
        published: true
      }
    });
    await db.bundle.create({
      data: {
        slug: `bundle-${uniq}`,
        title: `Dental Prep Bundle ${uniq}`,
        description: 'Complete bundle',
        price: 9900,
        published: true,
        items: {
          create: [
            { examId: siblingExam.id, tier: 'PRACTICE', position: 0 },
            { examId: examId, tier: 'PRACTICE', position: 1 }
          ]
        }
      }
    });
    // Grant entitlement to the sibling exam
    await db.entitlement.create({ data: { userId: bundleUser.id, examId: siblingExam.id, tier: 'PRACTICE' } });

    assert.equal(await Q.hasBookletEntitlement(bundleUser.id, examId), true);
    const r = await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(bundleUser));
    assert.equal(r.status, 'ok');
  });

  await t('cancelled or refunded entitlement loses access to paid content', async () => {
    const refundUser = await mkUser('refund-student', 'USER');
    const ent = await db.entitlement.create({ data: { userId: refundUser.id, examId, tier: 'PRACTICE' } });
    assert.equal(await Q.hasBookletEntitlement(refundUser.id, examId), true);
    // Simulate refund: entitlement row deleted
    await db.entitlement.delete({ where: { id: ent.id } });
    assert.equal(await Q.hasBookletEntitlement(refundUser.id, examId), false);
    const r = await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(refundUser));
    assert.equal(r.status, 'purchase-required');
  });

  await t('library lists free preview counts and distinguishes paid vs free visibility', async () => {
    const libPaid = await Q.loadLibrary(viewerOf(paid));
    const paidEntry = libPaid.find((b) => b.id === booklet.id);
    assert.ok(paidEntry);
    assert.equal(paidEntry.entitled, true);
    assert.equal(paidEntry.freePreviewCount, 1);

    const libFree = await Q.loadLibrary(viewerOf(unentitled));
    const freeEntry = libFree.find((b) => b.id === booklet.id);
    assert.ok(freeEntry);
    assert.equal(freeEntry.entitled, false);
    assert.equal(freeEntry.freePreviewCount, 1);
  });

  await t('paid-only booklet without free preview is visible to paid user but hidden from free user', async () => {
    const paidOnlyBooklet = await A.createBooklet({ title: `Paid Only Booklet ${uniq}`, publisher: 'Test' }, log);
    await db.booklet.update({ where: { id: paidOnlyBooklet.id }, data: { sourcePath: 'C:/fake/source.pdf', totalPages: 50 } });
    await A.updateBooklet(paidOnlyBooklet.id, { licenseNote: 'Synthetic licence #999 from Test Publisher', licenseConfirmed: true }, log);
    const poCh = await A.addChapter(paidOnlyBooklet.id, { title: 'Paid Only Chapter', pdfPageFrom: 1, pdfPageTo: 1, isFreePreview: false }, log);
    await processChapter(poCh.id, {}, { gen: mkGen(), render, retryDelayMs: 1 });
    await A.bulkSetStatus(poCh.id, 'APPROVED', log);
    await A.reviewChapter(poCh.id, { action: 'submit' }, log);
    await A.reviewChapter(poCh.id, { action: 'approve', reviewerName: 'Dr A. Smith', resolveIssueIndexes: [0] }, log);
    await A.publishChapter(poCh.id, true, log);
    await A.updateBooklet(paidOnlyBooklet.id, { status: 'PUBLISHED' }, log);

    // Give paid user entitlement to this new booklet's access exam
    const poExamId = (await db.booklet.findUniqueOrThrow({ where: { id: paidOnlyBooklet.id } })).accessExamId!;
    await db.entitlement.create({ data: { userId: paid.id, examId: poExamId, tier: 'PRACTICE' } });

    const libForPaid = await Q.loadLibrary(viewerOf(paid));
    assert.ok(libForPaid.some((b) => b.id === paidOnlyBooklet.id && b.entitled));

    const libForFree = await Q.loadLibrary(viewerOf(unentitled));
    assert.ok(!libForFree.some((b) => b.id === paidOnlyBooklet.id), 'paid-only booklet hidden from free student without entitlement');
  });

  await t('draft booklet remains inaccessible to paid students (even with an entitlement)', async () => {
    const draftBooklet = await A.createBooklet({ title: `Draft Booklet ${uniq}`, publisher: 'Test' }, log);
    const dCh = await A.addChapter(draftBooklet.id, { title: 'Draft Chapter', pdfPageFrom: 1, pdfPageTo: 1 }, log);
    // Even if paid user has an entitlement granted to its access exam:
    const dExamId = (await db.booklet.findUniqueOrThrow({ where: { id: draftBooklet.id } })).accessExamId!;
    await db.entitlement.create({ data: { userId: paid.id, examId: dExamId, tier: 'PRACTICE' } });

    assert.equal(await Q.loadBookletForStudent(draftBooklet.slug, viewerOf(paid)), null);
    assert.equal((await Q.loadChapterForStudent(draftBooklet.slug, dCh.slug, viewerOf(paid))).status, 'unpublished');
    assert.ok(!(await Q.loadLibrary(viewerOf(paid))).some((b) => b.id === draftBooklet.id));
  });

  await t('licence flag alone does not gate student visibility of a published booklet', async () => {
    // Out-of-band direct-DB state the admin API never produces: PUBLISHED with
    // licenseConfirmed false (revoking via updateBooklet also reverts status to
    // DRAFT). Locks in the policy: licensing blocks publishing, not visibility.
    const polBooklet = await A.createBooklet({ title: `Licence Policy Booklet ${uniq}`, publisher: 'Test' }, log);
    await db.booklet.update({ where: { id: polBooklet.id }, data: { sourcePath: 'C:/fake/source.pdf', totalPages: 10 } });
    await A.updateBooklet(polBooklet.id, { licenseNote: 'Synthetic licence #777 from Test Publisher', licenseConfirmed: true }, log);
    const polCh = await A.addChapter(polBooklet.id, { title: 'Policy Chapter', pdfPageFrom: 1, pdfPageTo: 1 }, log);
    await processChapter(polCh.id, {}, { gen: mkGen(), render, retryDelayMs: 1 });
    await A.bulkSetStatus(polCh.id, 'APPROVED', log);
    await A.reviewChapter(polCh.id, { action: 'submit' }, log);
    await A.reviewChapter(polCh.id, { action: 'approve', reviewerName: 'Dr A. Smith', resolveIssueIndexes: [0] }, log);
    await A.publishChapter(polCh.id, true, log);
    await A.updateBooklet(polBooklet.id, { status: 'PUBLISHED' }, log);
    await db.booklet.update({ where: { id: polBooklet.id }, data: { licenseConfirmed: false } });

    const polExamId = (await db.booklet.findUniqueOrThrow({ where: { id: polBooklet.id } })).accessExamId!;
    await db.entitlement.create({ data: { userId: paid.id, examId: polExamId, tier: 'PRACTICE' } });
    assert.equal((await Q.loadChapterForStudent(polBooklet.slug, polCh.slug, viewerOf(paid))).status, 'ok');
    assert.ok((await Q.loadLibrary(viewerOf(paid))).some((b) => b.id === polBooklet.id));
    assert.equal((await Q.loadBookletForStudent(polBooklet.slug, viewerOf(paid)))!.booklet.id, polBooklet.id);
    // …but a DRAFT booklet with the flag ON is still invisible (status is the gate).
    await db.booklet.update({ where: { id: polBooklet.id }, data: { licenseConfirmed: true, status: 'DRAFT' } });
    assert.equal(await Q.loadBookletForStudent(polBooklet.slug, viewerOf(paid)), null);
  });

  await t('hierarchy groups cover every chapter exactly once (no duplicates or omissions)', async () => {
    const { buildBookletHierarchy } = await import('../src/lib/booklet/toc');
    const hierBooklet = await A.createBooklet({ title: `Hierarchy Booklet ${uniq}`, publisher: 'Test' }, log);
    await db.booklet.update({ where: { id: hierBooklet.id }, data: { sourcePath: 'C:/fake/source.pdf', totalPages: 30 } });
    const titles = ['Alpha Chapter', 'Beta Chapter', 'Gamma Chapter', 'Delta Chapter', 'Epsilon Chapter'];
    const created = [];
    for (let i = 0; i < titles.length; i++) {
      created.push(await A.addChapter(hierBooklet.id, { title: titles[i], pdfPageFrom: i + 1, pdfPageTo: i + 1, isFreePreview: i === 0 }, log));
    }
    const studentView = await Q.loadBookletForStudent(hierBooklet.slug, viewerOf(admin, true, true));
    assert.ok(studentView);
    const groups = buildBookletHierarchy(hierBooklet.slug, studentView.chapters);
    const flattened = groups.flatMap((g) => g.chapters);
    assert.equal(flattened.length, titles.length, 'every chapter appears exactly once in the hierarchy');
    assert.equal(new Set(flattened.map((c) => c.id)).size, titles.length, 'no duplicate chapters across groups');
    for (const c of created) assert.ok(flattened.some((f) => f.id === c.id), `chapter ${c.title} present`);
  });

  console.log('MCQ attempts, autosave & scoring (existing engine)');
  await t('mock draws only from chapters the viewer can open; attempt saves & scores', async () => {
    const p = await Q.pickQuestionIds({ bookletId: booklet.id, viewer: viewerOf(paid), count: 40 });
    assert.equal(p.ids.length, 4, '2 questions per published chapter');
    const attempt = await db.attempt.create({
      data: { userId: paid.id, examId, mode: 'EXAM', questionIds: p.ids, durationSec: 360, expiresAt: new Date(Date.now() + 360_000), responses: {} }
    });
    const qs = await db.question.findMany({ where: { id: { in: p.ids } } });
    const resp: Record<string, any> = {};
    // answer first question correctly, second wrong, leave rest blank
    resp[qs[0].id] = { answer: qs[0].correct as string[] };
    resp[qs[1].id] = { answer: ['d'] };
    await db.attempt.update({ where: { id: attempt.id }, data: { responses: resp, lastSavedAt: new Date() } }); // autosave
    const reloaded = await db.attempt.findUniqueOrThrow({ where: { id: attempt.id } });
    assert.deepEqual(Object.keys(reloaded.responses as object).sort(), [qs[0].id, qs[1].id].sort());
    const ordered = p.ids.map((id) => qs.find((q) => q.id === id)!);
    const s = scoreAttempt(ordered, reloaded.responses as any);
    assert.equal(s.correctCount, 1);
    assert.equal(s.total, 4);
    assert.equal(s.score, 25);
    assert.ok(Object.keys(s.perDomain).length >= 1);
  });
  await t('un-approving an MCQ removes it from future attempts', async () => {
    const q = (await db.question.findMany({ where: { bookletChapterId: ch1.id, status: 'PUBLISHED' } }))[0];
    await A.editQuestion(q.id, { status: 'DRAFT' }, log);
    const p = await Q.pickQuestionIds({ bookletId: booklet.id, chapterId: ch1.id, viewer: viewerOf(paid), count: 10 });
    assert.ok(!p.ids.includes(q.id));
  });

  console.log('takedown & regressions');
  await t('editing a live item pulls the chapter offline until re-published', async () => {
    const note = (await db.bookletItem.findMany({ where: { chapterId: ch1.id, kind: 'NOTE' } }))[0];
    await A.editItem(note.id, { data: { heading: 'Doses (edited)', bullets: ['Articaine 7 mg/kg'] } }, log);
    assert.equal((await db.bookletChapter.findUniqueOrThrow({ where: { id: ch1.id } })).publishedAt, null);
    assert.equal((await Q.loadChapterForStudent(booklet.slug, ch1.slug, viewerOf(paid))).status, 'unpublished');
  });
  await t('revoking the licence takes the whole booklet offline immediately', async () => {
    await A.updateBooklet(booklet.id, { licenseConfirmed: false }, log);
    assert.equal((await bookletRow()).status, 'DRAFT');
    assert.equal((await Q.loadChapterForStudent(booklet.slug, ch2.slug, viewerOf(paid))).status, 'unpublished');
    assert.equal(decideAccess(await bookletRow(), await db.bookletChapter.findUniqueOrThrow({ where: { id: ch2.id } }), viewerOf(paid, false, true)).ok, false);
  });
  await t('force re-process keeps reviewed items, replaces only drafts', async () => {
    const rejectedBefore = await db.bookletItem.count({ where: { chapterId: ch1.id, status: 'REJECTED' } });
    await processChapter(ch1.id, { force: true }, { gen: mkGen(), render, retryDelayMs: 1 });
    assert.equal(await db.bookletItem.count({ where: { chapterId: ch1.id, status: 'REJECTED' } }), rejectedBefore);
    assert.equal((await db.bookletChapter.findUniqueOrThrow({ where: { id: ch1.id } })).reviewStatus, 'DRAFT', 'approval reset after regeneration');
  });
  await t('concurrent processing is refused', async () => {
    await db.bookletChapter.update({ where: { id: ch2.id }, data: { processStatus: 'PROCESSING' } });
    await rejectsWith(processChapter(ch2.id, {}, { gen: mkGen(), render }), /already being processed/);
    await db.bookletChapter.update({ where: { id: ch2.id }, data: { processStatus: 'PROCESSED' } });
  });
  await t('booklet entitlement does not appear in the normal My Exams list', async () => {
    const g = await getGroupedExams(paid.id);
    assert.equal([...g.standalone, ...g.bundles.flatMap((b) => b.items)].filter((e) => e.examId === examId).length, 0);
  });
  await t('booklet exam is never in the public catalog (unpublished)', async () => {
    assert.equal(await db.exam.count({ where: { id: examId, published: true } }), 0);
  });

  console.log(`\n${passed} passed${process.exitCode ? ' (with FAILURES)' : ''}`);
  await db.$disconnect();
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
