/**
 * Pure unit tests for booklet access/publish rules and content schemas.
 * No DB, no network.   npm run test:booklet
 */
import assert from 'node:assert/strict';
import { chapterPublishBlockers, decideAccess, isChapterLive, parsePageRange } from '../src/lib/booklet/access';
import { ChapterContent, McqData, parseItemData } from '../src/lib/booklet/schemas';
import { generateJson, type JsonGenerator } from '../src/lib/booklet/gemini';
import { z } from 'zod';

let passed = 0;
const t = async (name: string, fn: () => void | Promise<void>) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${(e as Error).message}`);
    process.exitCode = 1;
  }
};

const live = { status: 'PUBLISHED', licenseConfirmed: true, accessExamId: 'x' };
const ch = (o: object = {}) => ({ publishedAt: new Date(), isFreePreview: false, reviewStatus: 'APPROVED', ...o });
const student = (o: object = {}) => ({ userId: 'u1', isAdmin: false, hasEntitlement: false, ...o });

(async () => {
  console.log('access rules');
  await t('unpublished chapter is invisible to students', () => {
    assert.deepEqual(decideAccess(live, ch({ publishedAt: null }), student({ hasEntitlement: true })), { ok: false, reason: 'unpublished' });
  });
  await t('DRAFT booklet hides published chapters', () => {
    assert.equal(decideAccess({ ...live, status: 'DRAFT' }, ch(), student({ hasEntitlement: true })).ok, false);
  });
  await t('unlicensed booklet still shows published+approved chapters to students', () => {
    // Licensing is a publication blocker (chapterPublishBlockers), not an
    // independent student-visibility gate. A PUBLISHED booklet whose licence
    // flag is off is still PUBLISHED; revoking the flag via the admin API
    // reverts it to DRAFT (tested in the integration suite).
    assert.equal(isChapterLive({ ...live, licenseConfirmed: false }, ch()), true);
  });
  await t('entitled student can access published booklet even if licenseConfirmed is false', () => {
    assert.deepEqual(
      decideAccess({ ...live, licenseConfirmed: false }, ch(), student({ hasEntitlement: true })),
      { ok: true, reason: 'entitled' }
    );
  });
  await t('unreviewed chapter is not live regardless of licensing', () => {
    assert.equal(isChapterLive(live, ch({ reviewStatus: 'DRAFT' })), false);
    assert.deepEqual(decideAccess(live, ch({ reviewStatus: 'DRAFT' }), student({ hasEntitlement: true })), { ok: false, reason: 'unpublished' });
  });
  await t('chapter not clinically approved is not live', () => {
    assert.equal(isChapterLive(live, ch({ reviewStatus: 'IN_REVIEW' })), false);
  });
  await t('anonymous viewer must log in', () => {
    assert.deepEqual(decideAccess(live, ch(), { isAdmin: false, hasEntitlement: false }), { ok: false, reason: 'login-required' });
  });
  await t('paid chapter without entitlement => purchase-required', () => {
    assert.deepEqual(decideAccess(live, ch(), student()), { ok: false, reason: 'purchase-required' });
  });
  await t('paid chapter with entitlement => ok', () => {
    assert.deepEqual(decideAccess(live, ch(), student({ hasEntitlement: true })), { ok: true, reason: 'entitled' });
  });
  await t('free-preview chapter opens without entitlement (signed in)', () => {
    assert.deepEqual(decideAccess(live, ch({ isFreePreview: true }), student()), { ok: true, reason: 'free-preview' });
  });
  await t('free-preview still requires publication', () => {
    assert.equal(decideAccess(live, ch({ isFreePreview: true, publishedAt: null }), student()).ok, false);
  });
  await t('admin can preview drafts', () => {
    assert.deepEqual(decideAccess({ ...live, status: 'DRAFT', licenseConfirmed: false }, ch({ publishedAt: null }), student({ isAdmin: true })), { ok: true, reason: 'admin' });
  });

  console.log('publish blockers');
  const okInfo = { processStatus: 'PROCESSED', reviewStatus: 'APPROVED', reviewerName: 'Dr X', approvedItemCount: 5, draftItemCount: 0, publishedMcqCount: 3, highSeverityIssues: 0 };
  await t('fully reviewed + licensed chapter has no blockers', () => {
    assert.deepEqual(chapterPublishBlockers({ licenseConfirmed: true, accessExamId: 'x' }, okInfo), []);
  });
  await t('licence unconfirmed blocks', () => {
    assert.match(chapterPublishBlockers({ licenseConfirmed: false, accessExamId: 'x' }, okInfo)[0], /licensing/);
  });
  await t('missing clinical reviewer blocks', () => {
    const b = chapterPublishBlockers({ licenseConfirmed: true, accessExamId: 'x' }, { ...okInfo, reviewerName: '  ' });
    assert.ok(b.some((x) => /reviewer name/.test(x)));
  });
  await t('unapproved review + draft items + high issues all block', () => {
    const b = chapterPublishBlockers({ licenseConfirmed: true, accessExamId: 'x' }, { ...okInfo, reviewStatus: 'IN_REVIEW', draftItemCount: 2, highSeverityIssues: 1 });
    assert.equal(b.length, 3);
  });
  await t('empty chapter blocks', () => {
    assert.ok(chapterPublishBlockers({ licenseConfirmed: true, accessExamId: 'x' }, { ...okInfo, approvedItemCount: 0, publishedMcqCount: 0 }).some((x) => /no approved content/.test(x)));
  });

  console.log('schemas');
  await t('parsePageRange', () => {
    assert.deepEqual(parsePageRange('58-65'), { from: 58, to: 65 });
    assert.deepEqual(parsePageRange(' 3 – 9 '), { from: 3, to: 9 });
    assert.equal(parsePageRange('9-3'), null);
    assert.equal(parsePageRange('abc'), null);
  });
  await t('MCQ with correct id outside options is rejected', () => {
    assert.equal(McqData.safeParse({ stem: 's', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correct: ['c'], explanation: 'e' }).success, false);
  });
  await t('MCQ with duplicate option ids is rejected', () => {
    assert.equal(McqData.safeParse({ stem: 's', options: [{ id: 'a', text: 'A' }, { id: 'a', text: 'B' }], correct: ['a'], explanation: 'e' }).success, false);
  });
  await t('valid MCQ parses with defaults', () => {
    const r = McqData.parse({ stem: 's', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correct: ['a'], explanation: 'e' });
    assert.equal(r.difficulty, 3);
    assert.deepEqual(r.pages, []);
  });
  await t('item data is validated per kind', () => {
    assert.throws(() => parseItemData('TABLE', { title: 't' }));
    assert.ok(parseItemData('FLASHCARD', { front: 'a', back: 'b' }));
  });
  await t('ChapterContent accepts pilot shape (single flowchart)', () => {
    const c = ChapterContent.parse({ summary: 's', notes: [], keyConcepts: [], tables: [], flowchart: { title: 'f', steps: [{ title: 'a', detail: 'b' }], pages: [1] }, flashcards: [], mcqs: [] });
    assert.equal(c.flowchart?.steps.length, 1);
  });

  console.log('gemini wrapper (mock generator — NOT a real Gemini call)');
  const mk = (responses: (string | Error)[]): JsonGenerator => {
    let i = 0;
    return {
      model: 'mock',
      async generate() {
        const r = responses[Math.min(i++, responses.length - 1)];
        if (r instanceof Error) throw r;
        return r;
      }
    };
  };
  const Z = z.object({ a: z.number() });
  await t('retries bad JSON then succeeds', async () => {
    assert.deepEqual(await generateJson(mk(['not json', '{"a":1}']), [], {}, Z, 0, 1), { a: 1 });
  });
  await t('retries on 429 then succeeds', async () => {
    const e = Object.assign(new Error('rate'), { status: 429 });
    assert.deepEqual(await generateJson(mk([e, '{"a":2}']), [], {}, Z, 0, 1), { a: 2 });
  });
  await t('non-retryable error surfaces immediately', async () => {
    const e = Object.assign(new Error('bad key'), { status: 401 });
    await assert.rejects(generateJson(mk([e]), [], {}, Z, 0, 1), /Gemini error 401/);
  });
  await t('gives up after repeated schema failures', async () => {
    await assert.rejects(generateJson(mk(['{"a":"x"}']), [], {}, Z, 0, 1), /failed after retries/);
  });

  console.log(`\n${passed} passed${process.exitCode ? ' (with failures)' : ''}`);
})();
