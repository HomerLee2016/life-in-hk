import { parseCsvObjects } from '../csv';
import { QUESTIONS_PER_QUIZ, QUIZ_COUNT } from '../constants';
import type { Bi, QuestionRow } from '../types';

export const CSV_COLUMNS = [
  'id', 'quiz', 'topic', 'votes', 'source', 'q_zh', 'q_en', 'correct_zh', 'correct_en',
  'wrong1_zh', 'wrong1_en', 'wrong2_zh', 'wrong2_en', 'wrong3_zh', 'wrong3_en', 'explanation_zh', 'explanation_en',
] as const;

/** Parse the CSV text into rows. Marks the top-voted QUESTIONS_PER_QUIZ per quiz as `active`. */
export function parseQuestionRows(text: string): QuestionRow[] {
  const rows = parseCsvObjects(text).map((r): QuestionRow => {
    const bi = (k: string): Bi => [r[`${k}_zh`] ?? '', r[`${k}_en`] ?? ''];
    const quiz = r.quiz?.trim() ? Number(r.quiz) : null;
    return {
      id: r.id, quiz, topic: r.topic, votes: Number(r.votes || 0), source: r.source ?? '',
      question: bi('q'), correct: bi('correct'), wrong: [bi('wrong1'), bi('wrong2'), bi('wrong3')],
      explanation: bi('explanation'), active: false,
    };
  });
  for (let quiz = 1; quiz <= QUIZ_COUNT; quiz++) {
    rankedForQuiz(rows, quiz).slice(0, QUESTIONS_PER_QUIZ).forEach((r) => { r.active = true; });
  }
  return rows;
}

/** Rows of a quiz, highest votes first; ties keep CSV order (stable sort). */
export function rankedForQuiz(rows: readonly QuestionRow[], quiz: number): QuestionRow[] {
  return rows.filter((r) => r.quiz === quiz).sort((a, b) => b.votes - a.votes);
}

