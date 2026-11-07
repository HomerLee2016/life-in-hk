/**
 * Parsing of GitHub Discussion posts (the "Question bank" form) into question rows.
 * Ranking is by Discussion upvotes; the export script writes the result into src/data/questions.csv.
 */
import { QUESTIONS_PER_QUIZ, QUIZ_COUNT } from './constants';
import { topicKeys } from './topics';
import type { Bi, QuestionRow } from './types';

/** Headings used by .github/DISCUSSION_TEMPLATE/question-bank.yml (GitHub renders them as "### Label"). */
export const FIELDS = {
  quiz: 'Quiz number (1-17)',
  topic: 'Topic',
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

/** Returns null when the post is not a complete, valid question. `id` becomes the CSV id (e.g. "d123"). */
export function parseDiscussion(body: string, votes: number, source: string, id: string): QuestionRow | null {
  const s = parseSections(body);
  const get = (k: keyof typeof FIELDS) => (s[FIELDS[k]] ?? '').trim();
  const qm = /^(\d{1,2})(?:\s*[-–:)].*)?$/.exec(get('quiz'));
  const quiz = qm ? Number(qm[1]) : NaN;
  if (!Number.isInteger(quiz) || quiz < 1 || quiz > QUIZ_COUNT) return null;
  const topic = get('topic').split(/\s/)[0];
  if (!topicKeys.includes(topic)) return null;
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
  return { id, quiz, topic, votes, source, question, correct, wrong: [w1, w2, w3], explanation, active: false };
}

/** Top-voted community rows per quiz (≤ 24 each), deterministic order. */
export function topPerQuiz(rows: readonly QuestionRow[]): QuestionRow[] {
  const out: QuestionRow[] = [];
  for (let q = 1; q <= QUIZ_COUNT; q++) {
    out.push(
      ...rows
        .filter((r) => r.quiz === q)
        .sort((a, b) => b.votes - a.votes || (a.source < b.source ? -1 : a.source > b.source ? 1 : 0))
        .slice(0, QUESTIONS_PER_QUIZ),
    );
  }
  return out;
}
