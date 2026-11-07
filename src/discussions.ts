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

/** Label put on every seeded discussion (the initial question bank from questions.csv). */
export const INITIAL_LABEL = 'initial version';

const SEED_MARKER = /<!--\s*life-in-hk-seed:\s*([A-Za-z0-9_-]+)\s*-->/;

/** Hidden marker that ties a seeded discussion to its CSV row; used for idempotent seeding and vote export. */
export const seedMarker = (id: string): string => `<!-- life-in-hk-seed: ${id} -->`;

/** CSV id of the seed row a discussion was created from, or null for community posts. */
export const seedIdOf = (body: string): string | null => SEED_MARKER.exec(body)?.[1] ?? null;

/** Discussion title for a seed row: stable id prefix + English question (trimmed). */
export function seedTitle(r: QuestionRow): string {
  const q = r.question[1].replace(/\s+/g, ' ').trim();
  return `[Question] ${r.id} · ${q.length > 150 ? `${q.slice(0, 147)}…` : q}`;
}

/**
 * Discussion body for a seed row, in the same "### Label" layout as the Question bank form so that
 * parseSections/parseDiscussion read it back. Bank-only rows (no quiz yet) get "none".
 */
export function seedBody(r: QuestionRow): string {
  const v: Record<keyof typeof FIELDS, string> = {
    quiz: r.quiz === null ? 'none (bank only, not in a quiz yet)' : String(r.quiz),
    topic: r.topic,
    qZh: r.question[0], qEn: r.question[1],
    cZh: r.correct[0], cEn: r.correct[1],
    w1Zh: r.wrong[0][0], w1En: r.wrong[0][1],
    w2Zh: r.wrong[1][0], w2En: r.wrong[1][1],
    w3Zh: r.wrong[2][0], w3En: r.wrong[2][1],
    eZh: `${r.explanation[0]}\n\n來源：初版種子題目，歡迎在留言補充或核實來源。`,
    eEn: `${r.explanation[1]}\n\nSource: initial seed question. Please add or verify a source in the comments.`,
  };
  const sections = (Object.keys(FIELDS) as (keyof typeof FIELDS)[]).map((k) => `### ${FIELDS[k]}\n\n${v[k]}`);
  return `${sections.join('\n\n')}\n\n---\n👍 Upvote if this question should be in the quiz. How votes are counted: docs/SHORTLIST_GUIDE.md\n${seedMarker(r.id)}\n`;
}
