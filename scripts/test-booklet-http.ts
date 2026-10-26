/**
 * HTTP-level end-to-end test of the booklet workflow against a running dev
 * server that points at a THROWAWAY LOCAL database. Gemini is not called
 * (conversion is exercised via the JSON-import path; process => 503 check).
 *
 *   TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/booklet_test \
 *   BASE_URL=http://127.0.0.1:3041 npx tsx scripts/test-booklet-http.ts
 */
import assert from 'node:assert/strict';

const dbUrl = process.env.TEST_DATABASE_URL;
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3041';
if (!dbUrl || !/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl) || !/^http:\/\/(127\.0\.0\.1|localhost)/.test(BASE)) {
  console.error('Refusing to run: TEST_DATABASE_URL and BASE_URL must both be local.');
  process.exit(2);
}
process.env.DATABASE_URL = dbUrl;
process.env.DATABASE_URL_UNPOOLED = dbUrl;

let passed = 0;
const t = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${(e as Error).message.split('\n').slice(0, 5).join('\n    ')}`);
    process.exitCode = 1;
  }
};

class Client {
  jar = new Map<string, string>();
  constructor(public label: string) {}
  private cookieHeader() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  private store(res: Response) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      if (!v || /expires=Thu, 01 Jan 1970/i.test(c)) this.jar.delete(k);
      else this.jar.set(k, v);
    }
  }
  async req(path: string, init: RequestInit & { json?: unknown } = {}) {
    const headers: Record<string, string> = { cookie: this.cookieHeader(), ...(init.headers as any) };
    let body = init.body;
    if (init.json !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(init.json);
    }
    const res = await fetch(BASE + path, { ...init, headers, body, redirect: 'manual' });
    this.store(res);
    return res;
  }
  async login(email: string, password: string) {
    const csrf = await (await this.req('/api/auth/csrf')).json();
    const res = await this.req('/api/auth/callback/password', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: BASE + '/' }).toString()
    });
    assert.ok([200, 302].includes(res.status), `login status ${res.status}`);
    const me = await (await this.req('/api/auth/session')).json();
    assert.ok(me?.user?.email, `${this.label}: login failed`);
    return me.user;
  }
}

(async () => {
  const { db } = await import('../src/lib/db');
  const argon2 = (await import('argon2')).default;
  const { putFigure } = await import('../src/lib/booklet/figure-storage');
  const { PDFDocument } = await import('pdf-lib');
  const sharp = (await import('sharp')).default;

  const uniq = Date.now().toString(36);
  const PW = `Pw-${uniq}-xA1!`;
  const hash = await argon2.hash(PW);
  const mk = (n: string, role: 'ADMIN' | 'USER') =>
    db.user.create({ data: { email: `${n}-${uniq}@test.local`, role, passwordHash: hash, emailVerified: new Date(), active: true } });
  const [admin, paid, nobody] = await Promise.all([mk('admin', 'ADMIN'), mk('paid', 'USER'), mk('nobody', 'USER')]);
  await db.vendor.upsert({ where: { slug: 'adc' }, update: {}, create: { slug: 'adc', name: 'ADC' } });

  const anon = new Client('anon');
  const A = new Client('admin');
  const P = new Client('paid');
  const N = new Client('nobody');
  await A.login(admin.email, PW);
  await P.login(paid.email, PW);
  await N.login(nobody.email, PW);

  console.log('auth boundaries');
  await t('anonymous cannot reach study area or admin APIs', async () => {
    assert.equal((await anon.req('/user-dashboard/study')).status, 307);
    const r = await anon.req('/api/admin/booklets', { method: 'POST', json: { title: 'x' } });
    assert.ok([307, 401, 403].includes(r.status), `got ${r.status}`);
    assert.equal((await anon.req('/api/booklets/whatever/attempts', { method: 'POST', json: { kind: 'mock' } })).status, 401);
  });
  await t('non-admin student gets 403 on every admin booklet endpoint', async () => {
    for (const [m, p] of [
      ['POST', '/api/admin/booklets'], ['PATCH', '/api/admin/booklets/x'], ['POST', '/api/admin/booklets/x/chapters'],
      ['POST', '/api/admin/booklets/x/source'], ['POST', '/api/admin/booklets/chapters/x'], ['PATCH', '/api/admin/booklets/items/x'],
      ['PATCH', '/api/admin/booklets/questions/x'], ['PATCH', '/api/admin/booklets/figures/x']
    ] as const) {
      const r = await P.req(p, { method: m, json: { title: 'x' } });
      assert.ok([307, 403].includes(r.status), `${m} ${p} -> ${r.status}`);
    }
    assert.equal((await P.req('/admin-dashboard/booklets')).status === 200, false);
  });

  console.log('admin workflow over HTTP');
  let bookletId = '', slug = '', ch1 = '', ch2 = '';
  await t('create booklet, set licence, add chapters', async () => {
    const r = await A.req('/api/admin/booklets', { method: 'POST', json: { title: `HTTP Booklet ${uniq}`, publisher: 'Test' } });
    assert.equal(r.status, 201);
    const b = await r.json();
    bookletId = b.id; slug = b.slug;
    assert.equal((await A.req('/api/admin/booklets', { method: 'POST', json: { title: `HTTP Booklet ${uniq}` } })).status, 409, 'duplicate slug');
    assert.equal((await A.req(`/api/admin/booklets/${bookletId}`, { method: 'PATCH', json: { licenseConfirmed: true } })).status, 400, 'licence needs details');
    assert.equal((await A.req(`/api/admin/booklets/${bookletId}`, { method: 'PATCH', json: { licenseConfirmed: true, licenseNote: '   ' } })).status, 400, 'blank licence note rejected');
    const rDraft = await A.req(`/api/admin/booklets/${bookletId}`, { method: 'PATCH', json: { licenseNote: 'Synthetic draft note without confirmation', licenseConfirmed: false } });
    assert.equal(rDraft.status, 200);
    const bDraft = await db.booklet.findUniqueOrThrow({ where: { id: bookletId } });
    assert.equal(bDraft.licenseNote, 'Synthetic draft note without confirmation');
    assert.equal(bDraft.licenseConfirmed, false);
    const rConfirmed = await A.req(`/api/admin/booklets/${bookletId}`, { method: 'PATCH', json: { licenseConfirmed: true, licenseNote: 'Synthetic test licence ref 42' } });
    assert.equal(rConfirmed.status, 200);
    const bConfirmed = await db.booklet.findUniqueOrThrow({ where: { id: bookletId } });
    assert.equal(bConfirmed.licenseConfirmed, true);
    assert.equal(bConfirmed.licenseNote, 'Synthetic test licence ref 42');
    const c1 = await A.req(`/api/admin/booklets/${bookletId}/chapters`, { method: 'POST', json: { title: 'Chapter One', pdfPageFrom: 1, pdfPageTo: 2 } });
    ch1 = (await c1.json()).id;
    const c2 = await A.req(`/api/admin/booklets/${bookletId}/chapters`, { method: 'POST', json: { title: 'Chapter Two', pdfPageFrom: 3, pdfPageTo: 3, isFreePreview: true } });
    ch2 = (await c2.json()).id;
    assert.ok(ch1 && ch2);
  });
  await t('PDF upload: valid PDF accepted (private), non-PDF rejected, page count read', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage(); pdf.addPage(); pdf.addPage();
    const bytes = Buffer.from(await pdf.save());
    const ok = await A.req(`/api/admin/booklets/${bookletId}/source`, { method: 'POST', headers: { 'content-type': 'application/pdf' }, body: bytes });
    assert.equal(ok.status, 201);
    assert.equal((await ok.json()).totalPages, 3);
    const bad = await A.req(`/api/admin/booklets/${bookletId}/source`, { method: 'POST', headers: { 'content-type': 'application/pdf' }, body: Buffer.from('not a pdf at all') });
    assert.equal(bad.status, 415);
    const row = await db.booklet.findUniqueOrThrow({ where: { id: bookletId } });
    assert.ok(row.sourcePath?.includes('uploads'));
  });
  await t('conversion without Gemini credentials fails fast with a clear 503 (nothing stuck in PROCESSING)', async () => {
    const r = await A.req(`/api/admin/booklets/chapters/${ch1}`, { method: 'POST', json: { action: 'process' } });
    assert.equal(r.status, 503);
    assert.match((await r.json()).error, /Gemini is not configured/);
    assert.notEqual((await db.bookletChapter.findUniqueOrThrow({ where: { id: ch1 } })).processStatus, 'PROCESSING');
  });
  await t('import converted JSON as DRAFT; invalid JSON rejected', async () => {
    const mcq = (n: number, ok = true) => ({
      stem: `HTTP question ${n}?`,
      options: [{ id: 'a', text: 'Alpha' }, { id: 'b', text: 'Beta' }, { id: 'c', text: 'Gamma' }, { id: 'd', text: 'Delta' }],
      correct: [ok ? 'a' : 'zz'], explanation: 'Alpha is right.', difficulty: 2, pages: [1]
    });
    const content = {
      summary: 'Chapter one summary text.',
      notes: [{ heading: 'Unique heading ALPHA', bullets: ['bullet one'], pages: [1] }],
      keyConcepts: [{ point: 'Concept ZETA', pages: [1] }],
      tables: [{ title: 'Table OMEGA', headers: ['H1', 'H2'], rows: [['r1c1', 'r1c2']], pages: [2] }],
      flowchart: { title: 'Flow SIGMA', steps: [{ title: 'Step1', detail: 'Do thing' }, { title: 'Step2', detail: 'Next' }], pages: [2] },
      flashcards: [{ front: 'FRONT-KAPPA', back: 'BACK-KAPPA', pages: [1] }],
      mcqs: [mcq(1), mcq(2), mcq(3, false)]
    };
    const bad = await A.req(`/api/admin/booklets/chapters/${ch1}`, { method: 'POST', json: { action: 'import', content: { nonsense: true } } });
    assert.equal(bad.status, 400);
    const r = await A.req(`/api/admin/booklets/chapters/${ch1}`, { method: 'POST', json: { action: 'import', content } });
    assert.equal(r.status, 200);
    const out = await r.json();
    assert.equal(out.mcqs, 2);
    assert.equal(out.droppedMcqs, 1);
    await A.req(`/api/admin/booklets/chapters/${ch2}`, { method: 'POST', json: { action: 'import', content: { ...content, notes: [{ heading: 'Preview note', bullets: ['free'], pages: [3] }] } } });
  });
  await t('admin pages render (list, booklet, chapter review)', async () => {
    for (const p of ['/admin-dashboard/booklets', `/admin-dashboard/booklets/${bookletId}`, `/admin-dashboard/booklets/chapters/${ch1}`]) {
      const r = await A.req(p);
      assert.equal(r.status, 200, `${p} -> ${r.status}`);
    }
    const html = await (await A.req(`/admin-dashboard/booklets/chapters/${ch1}`)).text();
    assert.match(html, /Unique heading ALPHA/);
    assert.match(html, /HTTP question 1\?/);
  });

  console.log('nothing is visible before publication');
  await t('student gets 404 on unpublished chapter + library empty + cannot start attempts', async () => {
    await db.entitlement.create({ data: { userId: paid.id, examId: (await db.booklet.findUniqueOrThrow({ where: { id: bookletId } })).accessExamId!, tier: 'PRACTICE' } });
    assert.equal((await P.req(`/user-dashboard/study/${slug}/chapter-one`)).status, 404);
    assert.equal((await P.req(`/user-dashboard/study/${slug}`)).status, 404);
    const lib = await (await P.req('/user-dashboard/study')).text();
    assert.ok(!lib.includes(`HTTP Booklet ${uniq}`));
    const r = await P.req(`/api/booklets/${slug}/attempts`, { method: 'POST', json: { kind: 'chapter', chapterId: ch1 } });
    assert.equal(r.status, 404);
    assert.equal((await P.req(`/api/booklets/${slug}/attempts`, { method: 'POST', json: { kind: 'mock' } })).status, 402, 'mock before any chapter is live');
  });
  await t('publish is refused with explicit blockers until reviewed', async () => {
    const r = await A.req(`/api/admin/booklets/chapters/${ch1}`, { method: 'POST', json: { action: 'publish', publish: true } });
    assert.equal(r.status, 422);
    const j = await r.json();
    assert.ok(j.blockers.some((b: string) => /clinical reviewer/.test(b)));
    assert.ok(j.blockers.some((b: string) => /DRAFT/.test(b)));
  });

  console.log('review, publish, student study');
  await t('approve + publish both chapters and the booklet', async () => {
    for (const cid of [ch1, ch2]) {
      assert.equal((await A.req(`/api/admin/booklets/chapters/${cid}`, { method: 'POST', json: { action: 'bulk', status: 'APPROVED' } })).status, 200);
      assert.equal((await A.req(`/api/admin/booklets/chapters/${cid}`, { method: 'POST', json: { action: 'review', review: 'submit' } })).status, 200);
      assert.equal((await A.req(`/api/admin/booklets/chapters/${cid}`, { method: 'POST', json: { action: 'review', review: 'approve' } })).status, 400, 'reviewer name required');
      assert.equal((await A.req(`/api/admin/booklets/chapters/${cid}`, { method: 'POST', json: { action: 'review', review: 'approve', reviewerName: 'Dr Test (AHPRA DEN000)' } })).status, 200);
      const p = await A.req(`/api/admin/booklets/chapters/${cid}`, { method: 'POST', json: { action: 'publish', publish: true } });
      assert.equal(p.status, 200, JSON.stringify(await p.json().catch(() => ({}))));
    }
    assert.equal((await A.req(`/api/admin/booklets/${bookletId}`, { method: 'PATCH', json: { status: 'PUBLISHED' } })).status, 200);
  });
  await t('entitled student: library, booklet, all study modes render with the content', async () => {
    const libText = await (await P.req('/user-dashboard/study')).text();
    assert.match(libText, new RegExp(`HTTP Booklet ${uniq}`));
    assert.match(libText, /Full Access/);
    const b = await P.req(`/user-dashboard/study/${slug}`);
    assert.equal(b.status, 200);
    const expect: Record<string, RegExp> = {
      notes: /Unique heading ALPHA/, summary: /Chapter one summary text\./, concepts: /Concept ZETA/, tables: /Table OMEGA/,
      flowcharts: /Flow SIGMA/, flashcards: /FRONT-KAPPA/, mcqs: /Practice \(untimed\)/
    };
    for (const [mode, re] of Object.entries(expect)) {
      const r = await P.req(`/user-dashboard/study/${slug}/chapter-one?mode=${mode}`);
      assert.equal(r.status, 200, `${mode} -> ${r.status}`);
      assert.match(await r.text(), re, `${mode} content`);
    }
  });
  await t('licence flag alone does not block an entitled student over HTTP (status does)', async () => {
    // Out-of-band direct-DB state: PUBLISHED booklet with the licence flag off.
    // The guarded admin API always reverts status to DRAFT when licensing is
    // revoked; this proves no API path gates on the flag itself.
    await db.booklet.update({ where: { id: bookletId }, data: { licenseConfirmed: false } });
    try {
      const libText = await (await P.req('/user-dashboard/study')).text();
      assert.match(libText, new RegExp(`HTTP Booklet ${uniq}`), 'still listed in library');
      assert.equal((await P.req(`/user-dashboard/study/${slug}`)).status, 200, 'booklet page 200');
      const notes = await P.req(`/user-dashboard/study/${slug}/chapter-one?mode=notes`);
      assert.equal(notes.status, 200, 'chapter page 200');
      assert.match(await notes.text(), /Unique heading ALPHA/, 'content served');
    } finally {
      await db.booklet.update({ where: { id: bookletId }, data: { licenseConfirmed: true } });
    }
  });
  await t('student without entitlement: paid chapter locked, free-preview chapter open', async () => {
    const libText = await (await N.req('/user-dashboard/study')).text();
    assert.match(libText, /Unlock Full Dental Study Booklets/);
    assert.match(libText, /Free Preview · 1 Chapter Free/);

    const locked = await N.req(`/user-dashboard/study/${slug}/chapter-one`);
    assert.equal(locked.status, 200);
    const html = await locked.text();
    assert.match(html, /Unlock this booklet/);
    assert.ok(!html.includes('Unique heading ALPHA'), 'paid content must not be in the page');
    assert.ok(!html.includes('Concept ZETA'));
    const open = await N.req(`/user-dashboard/study/${slug}/chapter-two`);
    assert.match(await open.text(), /Preview note/);
    assert.equal((await N.req(`/api/booklets/${slug}/attempts`, { method: 'POST', json: { kind: 'chapter', chapterId: ch1 } })).status, 402);
    assert.equal((await N.req(`/api/booklets/chapters/${ch1}/progress`, { method: 'POST', json: { mode: 'notes', completed: true } })).status, 402);
    assert.equal((await N.req(`/api/booklets/chapters/${ch1}/bookmarks`, { method: 'POST', json: { label: 'x' } })).status, 402);
  });

  await t('page inspector API rejects unentitled with 403, allows entitled with 200', async () => {
    // Unentitled gets 403 on paid chapter page
    const forbidden = await N.req(`/api/booklets/${slug}/chapters/chapter-one/pages/1`);
    assert.equal(forbidden.status, 403);

    // Free preview chapter page is accessible to signed-in user
    const freePreviewPage = await N.req(`/api/booklets/${slug}/chapters/chapter-two/pages/3`);
    assert.equal(freePreviewPage.status, 200);
    assert.equal(freePreviewPage.headers.get('content-type'), 'image/webp');

    // Entitled student gets 200 on paid chapter page
    const ok = await P.req(`/api/booklets/${slug}/chapters/chapter-one/pages/1`);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/webp');
  });

  await t('candidate with ADC-PART1 exam entitlement accesses paid booklet over HTTP', async () => {
    const part1User = await mk('part1http', 'USER');
    const Part1Client = new Client('part1');
    await Part1Client.login(part1User.email, PW);

    const part1Exam = await db.exam.upsert({
      where: { slug: `adc-part1-http-${uniq}` },
      update: {},
      create: {
        vendorId: (await db.vendor.findUniqueOrThrow({ where: { slug: 'adc' } })).id,
        code: 'ADC-PART1',
        slug: `adc-part1-http-${uniq}`,
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
    await db.entitlement.create({ data: { userId: part1User.id, examId: part1Exam.id, tier: 'PRACTICE' } });

    // Library displays Enrolled status and Full Access badge
    const libHtml = await (await Part1Client.req('/user-dashboard/study')).text();
    assert.match(libHtml, /Enrolled Candidate · Full Access/);
    assert.match(libHtml, /Full Access/);

    // Paid chapter is accessible
    const chRes = await Part1Client.req(`/user-dashboard/study/${slug}/chapter-one`);
    assert.equal(chRes.status, 200);
    const chHtml = await chRes.text();
    assert.match(chHtml, /Unique heading ALPHA/);

    // API attempts endpoint succeeds
    const attRes = await Part1Client.req(`/api/booklets/${slug}/attempts`, {
      method: 'POST',
      json: { kind: 'chapter', chapterId: ch1, mode: 'PRACTICE' }
    });
    assert.equal(attRes.status, 200);
  });

  await t('expired entitlement student is blocked on paid chapter and APIs', async () => {
    const expiredUser = await mk('expiredhttp', 'USER');
    const ExpClient = new Client('expired');
    await ExpClient.login(expiredUser.email, PW);

    const bExamId = (await db.booklet.findUniqueOrThrow({ where: { id: bookletId } })).accessExamId!;
    await db.entitlement.create({
      data: {
        userId: expiredUser.id,
        examId: bExamId,
        tier: 'PRACTICE',
        expiresAt: new Date(Date.now() - 1000)
      }
    });

    const locked = await ExpClient.req(`/user-dashboard/study/${slug}/chapter-one`);
    assert.equal(locked.status, 200);
    const html = await locked.text();
    assert.match(html, /Unlock this booklet/);
    assert.ok(!html.includes('Unique heading ALPHA'));

    assert.equal((await ExpClient.req(`/api/booklets/${slug}/attempts`, { method: 'POST', json: { kind: 'chapter', chapterId: ch1 } })).status, 402);
    assert.equal((await ExpClient.req(`/api/booklets/${slug}/chapters/chapter-one/pages/1`)).status, 403);
    assert.equal((await ExpClient.req(`/api/booklets/chapters/${ch1}/progress`, { method: 'POST', json: { mode: 'notes', completed: true } })).status, 402);
    assert.equal((await ExpClient.req(`/api/booklets/chapters/${ch1}/bookmarks`, { method: 'POST', json: { label: 'test' } })).status, 402);
  });

  console.log('progress, bookmarks, figures');
  await t('progress and bookmarks persist; chapter completes when every available mode is done', async () => {
    for (const m of ['notes', 'summary', 'concepts', 'tables', 'flowcharts', 'flashcards']) {
      const r = await P.req(`/api/booklets/chapters/${ch1}/progress`, { method: 'POST', json: { mode: m, completed: true } });
      assert.equal(r.status, 200);
    }
    let p = await db.bookletProgress.findFirstOrThrow({ where: { userId: paid.id, chapterId: ch1 } });
    assert.equal(p.completedAt, null, 'mcqs mode still outstanding');
    const last = await (await P.req(`/api/booklets/chapters/${ch1}/progress`, { method: 'POST', json: { mode: 'mcqs', completed: true } })).json();
    assert.equal(last.completed, true);
    const bm = await P.req(`/api/booklets/chapters/${ch1}/bookmarks`, { method: 'POST', json: { itemId: 'abc', label: 'Dose table', pdfPage: 2 } });
    assert.equal((await bm.json()).bookmarked, true);
    assert.equal(await db.bookletBookmark.count({ where: { userId: paid.id, chapterId: ch1 } }), 1);
    const rm = await P.req(`/api/booklets/chapters/${ch1}/bookmarks`, { method: 'POST', json: { itemId: 'abc', label: 'Dose table', remove: true } });
    assert.equal((await rm.json()).bookmarked, false);
    p = await db.bookletProgress.findFirstOrThrow({ where: { userId: paid.id, chapterId: ch1 } });
    assert.ok(p.completedAt);
  });
  await t('figure proxy: unapproved => 404 for students, admin ok; approved => entitled ok, others 404', async () => {
    const webp = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#336699' } }).webp().toBuffer();
    const key = await putFigure(`${ch1}/http-test-${uniq}.webp`, webp);
    const fig = await db.bookletFigure.create({ data: { chapterId: ch1, pdfPage: 1, label: 'Figure 9', caption: 'Test fig', storageKey: key } });
    assert.equal((await P.req(`/api/booklets/figures/${fig.id}`)).status, 404);
    assert.equal((await anon.req(`/api/booklets/figures/${fig.id}`)).status, 404);
    assert.equal((await A.req(`/api/booklets/figures/${fig.id}`)).status, 200);
    assert.equal((await A.req(`/api/admin/booklets/figures/${fig.id}`, { method: 'PATCH', json: { approved: true } })).status, 200);
    const ok = await P.req(`/api/booklets/figures/${fig.id}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/webp');
    assert.equal((await N.req(`/api/booklets/figures/${fig.id}`)).status, 404, 'no entitlement');
    assert.equal((await anon.req(`/api/booklets/figures/${fig.id}`)).status, 404);
    assert.equal((await anon.req(`/api/booklets/figures/does-not-exist`)).status, 404);
  });

  console.log('MCQ attempt through the existing runner, autosave, submit, review');
  await t('chapter attempt: start -> runner page -> answer -> autosave -> submit -> results with explanations', async () => {
    const s = await P.req(`/api/booklets/${slug}/attempts`, { method: 'POST', json: { kind: 'chapter', chapterId: ch1, mode: 'PRACTICE' } });
    assert.equal(s.status, 200);
    const { attemptId, questions } = await s.json();
    assert.equal(questions, 2);
    const page = await P.req(`/exam/${attemptId}`);
    assert.equal(page.status, 200);
    const attempt = await db.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    assert.equal(attempt.userId, paid.id);
    const [q1, q2] = attempt.questionIds;
    // answer route must NOT leak the key in practice mode (no mid-test reveal)
    const ans = await P.req('/api/attempts/answer', { method: 'POST', json: { attemptId, questionId: q1, answer: ['a'] } });
    const ansBody = await ans.json();
    assert.equal(ans.status, 200);
    assert.deepEqual(Object.keys(ansBody), ['saved']);
    const auto = await P.req('/api/attempts/autosave', { method: 'POST', json: { attemptId, responses: { [q1]: { answer: ['a'] }, [q2]: { answer: ['b'] } } } });
    assert.equal(auto.status, 200);
    // another user cannot touch this attempt
    assert.equal((await N.req('/api/attempts/answer', { method: 'POST', json: { attemptId, questionId: q1, answer: ['a'] } })).status, 403);
    const sub = await P.req('/api/attempts/submit', { method: 'POST', json: { attemptId } });
    assert.equal(sub.status, 200, JSON.stringify(await sub.clone().json().catch(() => ({}))));
    const res = await P.req(`/results/${attemptId}`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /Back to booklet/);
    assert.match(html, /is right\./); // ExplanationView splits the correct option title from the body
    const done = await db.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    assert.ok(done.submittedAt && done.score !== null);
    assert.equal(done.score, 50, 'one of two correct');
  });
  await t('timed mock test starts as EXAM with a deadline; unentitled student only gets free-preview questions', async () => {
    const m = await P.req(`/api/booklets/${slug}/attempts`, { method: 'POST', json: { kind: 'mock' } });
    assert.equal(m.status, 200);
    const a = await db.attempt.findUniqueOrThrow({ where: { id: (await m.json()).attemptId } });
    assert.equal(a.mode, 'EXAM');
    assert.ok(a.expiresAt && a.expiresAt.getTime() > Date.now());
    assert.equal(a.questionIds.length, 4);
    const n = await N.req(`/api/booklets/${slug}/attempts`, { method: 'POST', json: { kind: 'mock' } });
    assert.equal(n.status, 200);
    const na = await db.attempt.findUniqueOrThrow({ where: { id: (await n.json()).attemptId } });
    const qs = await db.question.findMany({ where: { id: { in: na.questionIds } } });
    assert.ok(qs.every((q) => q.bookletChapterId === ch2), 'only the free-preview chapter');
  });

  console.log('takedown');
  await t('unpublishing makes content 404 immediately; existing site pages unaffected', async () => {
    assert.equal((await A.req(`/api/admin/booklets/chapters/${ch1}`, { method: 'POST', json: { action: 'publish', publish: false } })).status, 200);
    assert.equal((await P.req(`/user-dashboard/study/${slug}/chapter-one`)).status, 404);
    assert.equal((await P.req(`/api/booklets/${slug}/attempts`, { method: 'POST', json: { kind: 'chapter', chapterId: ch1 } })).status, 404);
    for (const p of ['/', '/practice-exams', '/user-dashboard/exams', '/user-dashboard']) {
      const r = await P.req(p);
      assert.ok(r.status === 200, `${p} -> ${r.status}`);
    }
  });

  console.log(`\n${passed} passed${process.exitCode ? ' (with FAILURES)' : ''}`);
  await db.$disconnect();
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
