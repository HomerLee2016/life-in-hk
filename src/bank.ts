/**
 * Question bank: parsing of GitHub Discussion posts and merging them into the 17 quizzes.
 *
 * Source of truth for ranking is the Discussion "upvoteCount". The app ships with seed questions
 * (src/data/tests/*.ts, 0 votes); community questions are ranked by votes, and for each test the
 * top-voted community questions for that test replace seed questions, up to 24 per test.
 */
import { QUESTIONS_PER_TEST } from './quiz';
import type { Question, QuizTest, Txt } from './types';

export type Bi = [string, string];

/** Serialisable form stored in src/data/community.json */
export interface CommunityQuestion {
  test: number; // 1..17
  votes: number;
  source: string; // discussion URL
  question: Bi;
  correct: Bi;
  wrong: [Bi, Bi, Bi];
  explanation: Bi;
}

export const TEST_COUNT = 17;

/** Headings used by .github/DISCUSSION_TEMPLATE/question-bank.yml (GitHub renders them as "### Label"). */
export const FIELDS = {
  test: 'Test number (1-17)',
  qZh: 'Question (繁體中文)',
  qEn: 'Question (English)',
  cZh: 'Correct answer (繁體中文)',
  cEn: 'Correct answer (English)',
  w1Zh: 'Wrong answer 1 (繁體中文)',
  w1En: 'Wrong answer 1 (English)',
  w2Zh: 'Wrong answer 2 (繁體中文)',
  w2En: 'Wrong answer 2 (English)',
  w3Zh: 'Wrong answer 3 (繁體中文)',
  w3En: 'Wrong answer 3 (English)',
  eZh: 'Explanation and source (繁體中文)',
  eEn: 'Explanation and source (English)',
} as const;

/** Split "### Heading\n\nvalue" sections into a map. "_No response_" counts as empty. */
export function parseSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = body.replace(/\r\n/g, '\n').split(/^###\s+/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    let value = nl === -1 ? '' : part.slice(nl + 1).trim();
    if (value === '_No response_') value = '';
    out[heading] = value;
  }
  return out;
}

/** Returns null when the post is not a complete, valid question. */
export function parseDiscussion(body: string, votes: number, source: string): CommunityQuestion | null {
  const s = parseSections(body);
  const get = (k: keyof typeof FIELDS) => (s[FIELDS[k]] ?? '').trim();
  const test = Number.parseInt(get('test'), 10);
  if (!Number.isInteger(test) || test < 1 || test > TEST_COUNT) return null;
  const pairs: [keyof typeof FIELDS, keyof typeof FIELDS][] = [
    ['qZh', 'qEn'], ['cZh', 'cEn'], ['w1Zh', 'w1En'], ['w2Zh', 'w2En'], ['w3Zh', 'w3En'], ['eZh', 'eEn'],
  ];
  const bi = pairs.map(([zh, en]) => [get(zh), get(en)] as Bi);
  if (bi.some(([zh, en]) => !zh || !en)) return null;
  const [question, correct, w1, w2, w3, explanation] = bi;
  const all = [correct, w1, w2, w3].map(([zh, en]) => `${zh}\u0000${en}`);
  if (new Set(all).size !== 4) return null; // duplicate options
  return { test, votes, source, question, correct, wrong: [w1, w2, w3], explanation };
}

/** Highest votes first; ties broken by source URL for deterministic output. */
export function rankQuestions(qs: readonly CommunityQuestion[], limit = TEST_COUNT * QUESTIONS_PER_TEST): CommunityQuestion[] {
  return [...qs]
    .sort((a, b) => b.votes - a.votes || a.source.localeCompare(b.source))
    .slice(0, limit);
}

const bi = (x: Bi): Txt => (x[0] === x[1] ? x[0] : x);

export function toQuestion(c: CommunityQuestion): Question {
  return {
    question: bi(c.question),
    options: [bi(c.correct), ...c.wrong.map(bi)],
    explanation: bi(c.explanation),
  };
}

/**
 * Build the final quizzes: for each seed test, take its community questions (by votes, desc),
 * then fill the remaining slots with seed questions in their original order. Always 24 per test.
 */
export function mergeTests(seed: readonly QuizTest[], community: readonly CommunityQuestion[]): QuizTest[] {
  const ranked = rankQuestions(community);
  return seed.map((t) => {
    const mine = ranked.filter((c) => c.test === t.id).slice(0, QUESTIONS_PER_TEST).map(toQuestion);
    const fill = t.questions.slice(0, QUESTIONS_PER_TEST - mine.length);
    return { ...t, questions: [...mine, ...fill] };
  });
}

