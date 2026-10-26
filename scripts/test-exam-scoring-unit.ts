import assert from 'node:assert/strict';
import { isAnswerCorrect, scoreAttempt, validateAttemptQuestions, type Responses } from '../src/lib/attempts';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n============================================================');
console.log('EXAM ENGINE IN-MEMORY UNIT TESTS');
console.log('============================================================\n');

// -------------------------------------------------------------
// Group 1: Question Type Correctness & Answer Comparisons
// -------------------------------------------------------------
console.log('--- Group 1: Question Types (isAnswerCorrect) ---');

test('SINGLE: correct choice matches', () => {
  const q = { type: 'SINGLE' as const, correct: ['opt2'] };
  assert.equal(isAnswerCorrect(q, ['opt2']), true);
});

test('SINGLE: incorrect choice fails', () => {
  const q = { type: 'SINGLE' as const, correct: ['opt2'] };
  assert.equal(isAnswerCorrect(q, ['opt1']), false);
});

test('SINGLE: multiple choices submitted for SINGLE question fails', () => {
  const q = { type: 'SINGLE' as const, correct: ['opt2'] };
  assert.equal(isAnswerCorrect(q, ['opt2', 'opt3']), false);
});

test('MULTI: exact set match passes regardless of order', () => {
  const q = { type: 'MULTI' as const, correct: ['opt1', 'opt3'] };
  assert.equal(isAnswerCorrect(q, ['opt3', 'opt1']), true);
  assert.equal(isAnswerCorrect(q, ['opt1', 'opt3']), true);
});

test('MULTI: partial selection fails (all-or-nothing)', () => {
  const q = { type: 'MULTI' as const, correct: ['opt1', 'opt2', 'opt3'] };
  assert.equal(isAnswerCorrect(q, ['opt1', 'opt2']), false);
});

test('MULTI: superset selection with extra wrong option fails', () => {
  const q = { type: 'MULTI' as const, correct: ['opt1', 'opt2'] };
  assert.equal(isAnswerCorrect(q, ['opt1', 'opt2', 'opt3']), false);
});

test('MULTI: duplicate candidate answer IDs do not receive credit', () => {
  const q = { type: 'MULTI' as const, correct: ['opt1', 'opt2'] };
  assert.equal(isAnswerCorrect(q, ['opt1', 'opt1']), false);
});

test('ORDERING: exact sequence matches', () => {
  const q = { type: 'ORDERING' as const, correct: ['step1', 'step2', 'step3'] };
  assert.equal(isAnswerCorrect(q, ['step1', 'step2', 'step3']), true);
});

test('ORDERING: reversed or swapped sequence fails', () => {
  const q = { type: 'ORDERING' as const, correct: ['step1', 'step2', 'step3'] };
  assert.equal(isAnswerCorrect(q, ['step3', 'step2', 'step1']), false);
  assert.equal(isAnswerCorrect(q, ['step1', 'step3', 'step2']), false);
});

test('TRUE_FALSE: exact match passes and mismatch fails', () => {
  const q = { type: 'TRUE_FALSE' as const, correct: ['true'] };
  assert.equal(isAnswerCorrect(q, ['true']), true);
  assert.equal(isAnswerCorrect(q, ['false']), false);
});

// -------------------------------------------------------------
// Group 2: Unanswered, Empty Array, and Malformed Keys
// -------------------------------------------------------------
console.log('\n--- Group 2: Unanswered Answers & Malformed Keys ---');

test('Unanswered: empty candidate answer array fails for valid question', () => {
  const q = { type: 'SINGLE' as const, correct: ['opt1'] };
  assert.equal(isAnswerCorrect(q, []), false);
});

test('SECURITY / DEFECT: Empty correct-key [] MUST NOT award points if candidate submits []', () => {
  // If the database has a question with an empty correct key, an unanswered question ([] == [])
  // must NEVER evaluate to true.
  const qEmpty = { type: 'SINGLE' as const, correct: [] as string[] };
  assert.equal(isAnswerCorrect(qEmpty, []), false, 'Empty correct key must not score true for empty answer');
  assert.equal(isAnswerCorrect(qEmpty, ['any']), false, 'Empty correct key must not score true for non-empty answer');
});

test('SECURITY / DEFECT: Null / undefined / non-array correct key fails safely', () => {
  const qNull = { type: 'SINGLE' as const, correct: null as any };
  assert.equal(isAnswerCorrect(qNull, []), false);
  assert.equal(isAnswerCorrect(qNull, ['opt1']), false);

  const qUndefined = { type: 'MULTI' as const, correct: undefined as any };
  assert.equal(isAnswerCorrect(qUndefined, []), false);

  const qString = { type: 'SINGLE' as const, correct: 'not-an-array' as any };
  assert.equal(isAnswerCorrect(qString, ['not-an-array']), false);
});

test('Candidate submits non-array or null answer safely fails', () => {
  const q = { type: 'SINGLE' as const, correct: ['opt1'] };
  assert.equal(isAnswerCorrect(q, null as any), false);
  assert.equal(isAnswerCorrect(q, undefined as any), false);
  assert.equal(isAnswerCorrect(q, 'opt1' as any), false);
});

// -------------------------------------------------------------
// Group 3: Score Attempt Boundaries & Rounding
// -------------------------------------------------------------
console.log('\n--- Group 3: Score Boundaries & Rounding (scoreAttempt) ---');

function makeQuestion(id: string, domain = 'Restorative Dentistry', correct = ['opt1'], type: any = 'SINGLE') {
  return { id, type, correct, domain };
}

test('0% score: 0 out of 10 correct', () => {
  const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i}`));
  const responses: Responses = {}; // Unanswered
  const result = scoreAttempt(questions, responses);
  assert.equal(result.total, 10);
  assert.equal(result.correctCount, 0);
  assert.equal(result.score, 0);
  assert.equal(result.score >= 70, false);
});

test('50% score: 5 out of 10 correct', () => {
  const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i}`));
  const responses: Responses = {};
  for (let i = 0; i < 5; i++) {
    responses[`q${i}`] = { answer: ['opt1'] }; // correct
  }
  for (let i = 5; i < 10; i++) {
    responses[`q${i}`] = { answer: ['wrong'] }; // wrong
  }
  const result = scoreAttempt(questions, responses);
  assert.equal(result.total, 10);
  assert.equal(result.correctCount, 5);
  assert.equal(result.score, 50);
  assert.equal(result.score >= 70, false);
});

test('69% boundary: 69 out of 100 correct (strictly below 70% passing threshold)', () => {
  const questions = Array.from({ length: 100 }, (_, i) => makeQuestion(`q${i}`));
  const responses: Responses = {};
  for (let i = 0; i < 69; i++) {
    responses[`q${i}`] = { answer: ['opt1'] };
  }
  const result = scoreAttempt(questions, responses);
  assert.equal(result.total, 100);
  assert.equal(result.correctCount, 69);
  assert.equal(result.score, 69);
  assert.equal(result.score >= 70, false, '69% must not pass 70% threshold');
});

test('70% boundary: 70 out of 100 correct (meets passing threshold)', () => {
  const questions = Array.from({ length: 100 }, (_, i) => makeQuestion(`q${i}`));
  const responses: Responses = {};
  for (let i = 0; i < 70; i++) {
    responses[`q${i}`] = { answer: ['opt1'] };
  }
  const result = scoreAttempt(questions, responses);
  assert.equal(result.total, 100);
  assert.equal(result.correctCount, 70);
  assert.equal(result.score, 70);
  assert.equal(result.score >= 70, true, '70% must pass 70% threshold');
});

test('100% score: 10 out of 10 correct', () => {
  const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(`q${i}`));
  const responses: Responses = {};
  for (let i = 0; i < 10; i++) {
    responses[`q${i}`] = { answer: ['opt1'] };
  }
  const result = scoreAttempt(questions, responses);
  assert.equal(result.total, 10);
  assert.equal(result.correctCount, 10);
  assert.equal(result.score, 100);
  assert.equal(result.score >= 70, true);
});

test('Rounding behavior: 2/3 rounds to 67%, 5/7 rounds to 71%, 4/7 rounds to 57%', () => {
  // 2 of 3 (66.666...%) -> rounds to 67
  const q3 = [makeQuestion('q1'), makeQuestion('q2'), makeQuestion('q3')];
  const r3: Responses = { q1: { answer: ['opt1'] }, q2: { answer: ['opt1'] }, q3: { answer: ['wrong'] } };
  assert.equal(scoreAttempt(q3, r3).score, 67);

  // 5 of 7 (71.428...%) -> rounds to 71
  const q7 = Array.from({ length: 7 }, (_, i) => makeQuestion(`q${i}`));
  const r7: Responses = {};
  for (let i = 0; i < 5; i++) r7[`q${i}`] = { answer: ['opt1'] };
  assert.equal(scoreAttempt(q7, r7).score, 71);

  // 4 of 7 (57.142...%) -> rounds to 57
  const r7_4: Responses = {};
  for (let i = 0; i < 4; i++) r7_4[`q${i}`] = { answer: ['opt1'] };
  assert.equal(scoreAttempt(q7, r7_4).score, 57);
});

test('Empty questions set: returns score 0, total 0, no NaN or crash', () => {
  const result = scoreAttempt([], {});
  assert.equal(result.total, 0);
  assert.equal(result.correctCount, 0);
  assert.equal(result.score, 0);
  assert.deepEqual(result.perDomain, {});
});

// -------------------------------------------------------------
// Group 4: Per-Domain Breakdown Integrity
// -------------------------------------------------------------
console.log('\n--- Group 4: Per-Domain Breakdown Integrity ---');

test('Multi-domain attempt calculates separate domain counts and percentages', () => {
  const questions = [
    makeQuestion('q1', 'Periodontics', ['a']),
    makeQuestion('q2', 'Periodontics', ['b']),
    makeQuestion('q3', 'Periodontics', ['c']),
    makeQuestion('q4', 'Oral Surgery', ['x']),
    makeQuestion('q5', 'Oral Surgery', ['y']),
    makeQuestion('q6', 'Endodontics', ['z']),
  ];

  const responses: Responses = {
    q1: { answer: ['a'] }, // Periodontics correct
    q2: { answer: ['b'] }, // Periodontics correct
    q3: { answer: ['wrong'] }, // Periodontics incorrect -> 2/3
    q4: { answer: ['x'] }, // Oral Surgery correct
    q5: { answer: ['wrong'] }, // Oral Surgery incorrect -> 1/2
    q6: { answer: ['wrong'] }, // Endodontics incorrect -> 0/1
  };

  const result = scoreAttempt(questions, responses);
  assert.equal(result.total, 6);
  assert.equal(result.correctCount, 3);
  assert.equal(result.score, 50);

  assert.deepEqual(result.perDomain['Periodontics'], { correct: 2, total: 3 });
  assert.deepEqual(result.perDomain['Oral Surgery'], { correct: 1, total: 2 });
  assert.deepEqual(result.perDomain['Endodontics'], { correct: 0, total: 1 });
});

// -------------------------------------------------------------
// Group 5: Denominator Integrity & Expected Question Count Validation
// -------------------------------------------------------------
console.log('\n--- Group 5: Denominator Integrity & Attempt Question Validation ---');

test('validateAttemptQuestions: all expected IDs retrieved -> valid', () => {
  const expected = ['q1', 'q2', 'q3'];
  const retrieved = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
  const validation = validateAttemptQuestions(expected, retrieved);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.missingIds, []);
});

test('validateAttemptQuestions: missing question IDs detected -> invalid with missingIds list', () => {
  const expected = ['q1', 'q2', 'q3', 'q4'];
  const retrieved = [{ id: 'q1' }, { id: 'q3' }]; // q2 and q4 missing from DB
  const validation = validateAttemptQuestions(expected, retrieved);
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.missingIds, ['q2', 'q4']);
});

test('validateAttemptQuestions: empty expected IDs -> invalid', () => {
  const validation = validateAttemptQuestions([], []);
  assert.equal(validation.valid, false);
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n============================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED:      ${passedTests}`);
console.log(`FAILED:      ${failedTests}`);
console.log('============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
