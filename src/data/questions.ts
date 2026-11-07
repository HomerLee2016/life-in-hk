import csvText from './questions.csv?raw';
import { parseQuestionRows } from './parse';
import { QUIZ_COUNT } from '../constants';
import type { Bi, Question, QuestionRow, QuizTest, Txt } from '../types';

export { CSV_COLUMNS, parseQuestionRows, rankedForQuiz } from './parse';

const bi = (x: Bi): Txt => (x[0] === x[1] ? x[0] : x);

export function toQuestion(r: QuestionRow): Question {
  return {
    id: r.id,
    topic: r.topic,
    question: bi(r.question),
    options: [bi(r.correct), ...r.wrong.map(bi)],
    explanation: bi(r.explanation),
  };
}

export function buildQuizzes(rows: readonly QuestionRow[]): QuizTest[] {
  return Array.from({ length: QUIZ_COUNT }, (_, i) => ({
    id: i + 1,
    questions: rows.filter((r) => r.quiz === i + 1 && r.active).map(toQuestion),
  }));
}

export const allRows: QuestionRow[] = parseQuestionRows(csvText);
export const tests: QuizTest[] = buildQuizzes(allRows);
