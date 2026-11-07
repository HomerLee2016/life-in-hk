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
const KNOWN_HEADINGS = new Set<string>(Object.values(FIELDS));

/**
 * Split "### Heading\n\nvalue" sections into a map. Only known field headings start a section
 * (other "###" lines belong to the previous value); the first occurrence of a heading wins.
 */
export function parseSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (current !== null && !(current in out)) {
      let value = buf.join('\n').trim();
      if (value === '_No response_') value = '';
      out[current] = value;
    }
  };
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    const m = /^###[ \t]+(.+?)[ \t]*$/.exec(line);
    if (m && KNOWN_HEADINGS.has(m[1])) {
      flush();
      current = m[1];
      buf = [];
    } else if (current !== null) buf.push(line);
  }
  flush();
  return out;
}

/** Returns null when the post is not a complete, valid question. */
export function parseDiscussion(body: string, votes: number, source: string): CommunityQuestion | null {
  const s = parseSections(body);
  const get = (k: keyof typeof FIELDS) => (s[FIELDS[k]] ?? '').trim();
  const m = /^(\d{1,2})(?:\s*[-–:)].*)?$/.exec(get('test'));
  const test = m ? Number(m[1]) : NaN;
  if (!Number.isInteger(test) || test < 1 || test > TEST_COUNT) return null;
  const pairs: [keyof typeof FIELDS, keyof typeof FIELDS][] = [
    ['qZh', 'qEn'], ['cZh', 'cEn'], ['w1Zh', 'w1En'], ['w2Zh', 'w2En'], ['w3Zh', 'w3En'], ['eZh', 'eEn'],
  ];
  const bi = pairs.map(([zh, en]) => [get(zh), get(en)] as Bi);
  if (bi.some(([zh, en]) => !zh || !en)) return null;
  const [question, correct, w1, w2, w3, explanation] = bi;
  const opts = [correct, w1, w2, w3];
  for (const i of [0, 1]) {
    if (new Set(opts.map((o) => o[i].trim().toLowerCase())).size !== 4) return null; // duplicate options in a language
  }
  return { test, votes, source, question, correct, wrong: [w1, w2, w3], explanation };
}

/** Ranking applied per test at export: top 24 for each of the 17 tests (so ≤ 408 in total). */
export function topPerTest(qs: readonly CommunityQuestion[]): CommunityQuestion[] {
  const out: CommunityQuestion[] = [];
  for (let id = 1; id <= TEST_COUNT; id++) out.push(...rankQuestions(qs.filter((q) => q.test === id), QUESTIONS_PER_TEST));
  return out;
}

/** Highest votes first; ties broken by source URL for deterministic output. */
export function rankQuestions(qs: readonly CommunityQuestion[], limit: number = TEST_COUNT * QUESTIONS_PER_TEST): CommunityQuestion[] {
  return [...qs]
    .sort((a, b) => b.votes - a.votes || (a.source < b.source ? -1 : a.source > b.source ? 1 : 0))
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
const norm = (x: Txt) => (typeof x === 'string' ? x : x.join('|')).trim().toLowerCase();

export function mergeTests(seed: readonly QuizTest[], community: readonly CommunityQuestion[]): QuizTest[] {
  return seed.map((t) => {
    const seen = new Set<string>();
    const mine: Question[] = [];
    for (const c of rankQuestions(community.filter((x) => x.test === t.id), Infinity)) {
      const qn = toQuestion(c);
      const key = norm(qn.question);
      if (seen.has(key) || mine.length >= QUESTIONS_PER_TEST) continue;
      seen.add(key);
      mine.push(qn);
    }
    const fill: Question[] = [];
    for (const sq of t.questions) {
      if (mine.length + fill.length >= QUESTIONS_PER_TEST) break;
      if (!seen.has(norm(sq.question))) fill.push(sq);
    }
    return { ...t, questions: [...mine, ...fill] };
  });
}

