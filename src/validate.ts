import { QUESTIONS_PER_QUIZ, QUIZ_COUNT } from './constants';
import { topicKeys } from './topics';
import type { QuestionRow } from './types';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const CJK = /[一-鿿]/;

/** Returns a list of human-readable problems; empty = the question bank is valid. Used by CI and unit tests. */
export function validateRows(rows: readonly QuestionRow[]): string[] {
  const errors: string[] = [];
  const err = (r: QuestionRow | null, msg: string) => errors.push(r ? `${r.id}: ${msg}` : msg);
  const ids = new Set<string>();
  const seenQuestion = new Map<string, string>();

  for (const r of rows) {
    if (!r.id) err(r, 'missing id');
    if (ids.has(r.id)) err(r, 'duplicate id');
    ids.add(r.id);
    if (!topicKeys.includes(r.topic)) err(r, `unknown topic "${r.topic}"`);
    if (r.quiz !== null && !(Number.isInteger(r.quiz) && r.quiz >= 1 && r.quiz <= QUIZ_COUNT)) err(r, `quiz must be empty or 1..${QUIZ_COUNT}`);
    if (!Number.isInteger(r.votes) || r.votes < 0) err(r, 'votes must be an integer >= 0');
    if (r.source && !/^https:\/\//.test(r.source)) err(r, 'source must be an https URL');

    const fields: [string, readonly [string, string]][] = [
      ['question', r.question], ['correct', r.correct], ['wrong1', r.wrong[0]], ['wrong2', r.wrong[1]],
      ['wrong3', r.wrong[2]], ['explanation', r.explanation],
    ];
    for (const [name, [zh, en]] of fields) {
      if (!zh.trim()) err(r, `${name}_zh is empty`);
      if (!en.trim()) err(r, `${name}_en is empty`);
    }
    if (r.question[0] && !CJK.test(r.question[0])) err(r, 'q_zh has no Chinese characters');
    if (r.question[1] && !/[A-Za-z]/.test(r.question[1])) err(r, 'q_en has no Latin letters');

    const opts = [r.correct, ...r.wrong];
    for (const [i, lang] of [[0, 'zh'], [1, 'en']] as const) {
      if (new Set(opts.map((o) => norm(o[i]))).size !== 4) err(r, `options are not 4 distinct values (${lang})`);
    }
    const key = norm(r.question[1]);
    const prev = seenQuestion.get(key);
    if (prev) err(r, `same English question as ${prev}`);
    else seenQuestion.set(key, r.id);
  }

  for (let quiz = 1; quiz <= QUIZ_COUNT; quiz++) {
    const assigned = rows.filter((r) => r.quiz === quiz);
    const active = assigned.filter((r) => r.active);
    if (assigned.length < QUESTIONS_PER_QUIZ) err(null, `quiz ${quiz} has ${assigned.length} questions, needs at least ${QUESTIONS_PER_QUIZ}`);
    if (active.length !== QUESTIONS_PER_QUIZ) err(null, `quiz ${quiz} shows ${active.length} questions, expected exactly ${QUESTIONS_PER_QUIZ}`);
  }
  return errors;
}

/** Per-quiz and per-topic counts for the CI log. */
export function summarize(rows: readonly QuestionRow[]) {
  const perQuiz = Array.from({ length: QUIZ_COUNT }, (_, i) => rows.filter((r) => r.quiz === i + 1 && r.active).length);
  const perTopic = Object.fromEntries(topicKeys.map((k) => [k, rows.filter((r) => r.topic === k).length]));
  return { total: rows.length, active: perQuiz.reduce((a, b) => a + b, 0), bankOnly: rows.filter((r) => !r.active).length, perQuiz, perTopic };
}
