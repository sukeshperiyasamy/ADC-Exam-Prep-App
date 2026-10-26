import { Question } from '@prisma/client';

export type ResponseEntry = { answer: string[]; flagged?: boolean; timeSpent?: number };
export type Responses = Record<string, ResponseEntry>;

export function isAnswerCorrect(q: Pick<Question, 'type' | 'correct'>, answer: string[]): boolean {
  if (!Array.isArray(answer)) return false;
  if (!q || !Array.isArray(q.correct) || q.correct.length === 0) return false;
  const correct = q.correct as string[];

  if (q.type === 'ORDERING') {
    return answer.length === correct.length && answer.every((v, i) => v === correct[i]);
  }
  // SINGLE / MULTI / TRUE_FALSE / HOTSPOT — set equality
  if (answer.length !== correct.length) return false;
  const a = new Set(answer);
  if (a.size !== correct.length) return false;
  return correct.every(c => a.has(c));
}

export function scoreAttempt(
  questions: Pick<Question, 'id' | 'type' | 'correct' | 'domain'>[],
  responses: Responses
): { score: number; correctCount: number; total: number; perDomain: Record<string, { correct: number; total: number }> } {
  const total = questions.length;
  let correctCount = 0;
  const perDomain: Record<string, { correct: number; total: number }> = {};
  for (const q of questions) {
    perDomain[q.domain] ||= { correct: 0, total: 0 };
    perDomain[q.domain].total += 1;
    const ans = responses[q.id]?.answer || [];
    if (isAnswerCorrect(q, ans)) {
      correctCount += 1;
      perDomain[q.domain].correct += 1;
    }
  }
  const score = total ? Math.round((correctCount / total) * 100) : 0;
  return { score, correctCount, total, perDomain };
}

export function validateAttemptQuestions(
  expectedIds: string[],
  retrievedQuestions: Pick<Question, 'id'>[]
): { valid: boolean; missingIds: string[] } {
  if (!Array.isArray(expectedIds) || expectedIds.length === 0) {
    return { valid: false, missingIds: [] };
  }
  const retrievedSet = new Set((retrievedQuestions || []).map(q => q.id));
  const missingIds = expectedIds.filter(id => !retrievedSet.has(id));
  return {
    valid: missingIds.length === 0,
    missingIds
  };
}

