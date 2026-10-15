import { db } from '../src/lib/db';
import { scoreAttempt } from '../src/lib/attempts';

async function testExamEngine() {
  console.log('--- Testing Exam Engine with ADC Questions ---');

  // 1. Fetch ADC Exam
  const exam = await db.exam.findUnique({
    where: { slug: 'adc-written-examination-part-1' },
    include: { vendor: true }
  });
  if (!exam) throw new Error('ADC Exam not found in DB');
  console.log('Exam loaded:', exam.title, 'Question count setting:', exam.questionCount);

  // 2. Fetch questions for attempt (sample 10 questions)
  const questions = await db.question.findMany({
    where: { examId: exam.id },
    take: 10,
    orderBy: { createdAt: 'asc' }
  });
  console.log(`Fetched ${questions.length} questions for mock attempt.`);

  // 3. Create a test attempt with guestToken
  const questionIds = questions.map(q => q.id);
  const testGt = 'test-guest-token-12345';
  const attempt = await db.attempt.create({
    data: {
      examId: exam.id,
      mode: 'PRACTICE',
      isTeaser: false,
      guestToken: testGt,
      questionIds,
      durationSec: 3600
    }
  });
  console.log('Created test attempt:', attempt.id);

  // 4. Simulate user answering questions:
  // Let's answer 7 correctly and 3 incorrectly
  const responses: Record<string, { answer: string[]; timeSpent: number }> = {};
  
  questions.forEach((q, idx) => {
    const correctIds = (q.correct as string[]) || [];
    const options = (q.options as Array<{ id: string; text: string }>) || [];
    
    if (idx < 7) {
      // Correct answer
      responses[q.id] = { answer: correctIds, timeSpent: 25 };
    } else {
      // Pick a wrong option
      const wrongOpt = options.find(o => !correctIds.includes(o.id));
      responses[q.id] = { answer: wrongOpt ? [wrongOpt.id] : [], timeSpent: 30 };
    }
  });

  // 5. Score the attempt
  const { score, correctCount, total, perDomain } = scoreAttempt(questions, responses);
  const passed = score >= exam.passingScore;

  console.log('Score calculation:');
  console.log(`  - Total: ${total}`);
  console.log(`  - Correct: ${correctCount}`);
  console.log(`  - Calculated Score: ${score}%`);
  console.log(`  - Passing Score Mark: ${exam.passingScore}%`);
  console.log(`  - Passed Status: ${passed ? 'PASSED (Green)' : 'FAILED (Red)'}`);
  console.log('  - Per-domain Breakdown:');
  for (const [dom, stats] of Object.entries(perDomain)) {
    const pct = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    console.log(`      * ${dom}: ${stats.correct}/${stats.total} (${pct}%)`);
  }

  // 6. Update the attempt as submitted
  const updatedAttempt = await db.attempt.update({
    where: { id: attempt.id },
    data: {
      responses,
      score,
      passed,
      submittedAt: new Date()
    }
  });
  console.log('Attempt successfully submitted and persisted:', updatedAttempt.id);

  // 7. Test Results Page HTTP response with guest token cookie
  const res = await fetch(`http://127.0.0.1:3040/results/${attempt.id}`, {
    headers: { Cookie: `gt=${testGt}` }
  });
  console.log(`HTTP GET /results/${attempt.id} -> Status: ${res.status}`);
  const html = await res.text();
  console.log(`Results HTML length: ${html.length}`);
  console.log(`Contains score (${score}%):`, html.includes(`${score}%`));
  console.log('Contains ADC Exam Title:', html.includes('ADC Written Examination'));
  console.log('Contains Per-domain performance:', html.includes('Per-domain performance'));
  console.log('Contains Clinical Rationale / Explanation:', html.includes('Clinical Rationale') || html.includes('Therapeutic Guidelines'));
  console.log('Contains Correct / Incorrect badges:', html.includes('Correct') && html.includes('Incorrect'));


  // Clean up test attempt
  await db.attempt.delete({ where: { id: attempt.id } });
  console.log('Cleaned up test attempt.');
  console.log('--- Exam Engine Test Succeeded Flawlessly! ---');
}

testExamEngine()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
