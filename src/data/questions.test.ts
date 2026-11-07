import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allRows, tests } from './questions';
import { buildQuizzes, parseQuestionRows } from './questions';
import { summarize, validateRows } from '../validate';
import { t } from '../quiz';
import { topicKeys } from '../topics';

describe('shipped question bank (questions.csv)', () => {
  it('is valid: 17 quizzes × 24 questions, 4 distinct options per language, unique ids…', () => {
    expect(validateRows(allRows)).toEqual([]);
    expect(tests).toHaveLength(17);
    for (const x of tests) expect(x.questions, `quiz ${x.id}`).toHaveLength(24);
    expect(summarize(allRows).active).toBe(408);
  });
  it('every quiz mixes several topics, and every topic is used', () => {
    for (const x of tests) expect(new Set(x.questions.map((q) => q.topic)).size, `quiz ${x.id}`).toBeGreaterThanOrEqual(8);
    expect(new Set(allRows.map((r) => r.topic))).toEqual(new Set(topicKeys));
  });
  it('first option is the correct one and text exists in both languages', () => {
    for (const x of tests) for (const q of x.questions) {
      for (const lang of ['zh', 'en'] as const) {
        expect(t(q.question, lang).length).toBeGreaterThan(5);
        expect(t(q.options[0], lang)).toBeTruthy();
      }
    }
  });
  it('the file on disk is what is bundled', () => {
    const disk = parseQuestionRows(readFileSync(new URL('./questions.csv', import.meta.url), 'utf8'));
    expect(disk.map((r) => r.id)).toEqual(allRows.map((r) => r.id));
    expect(buildQuizzes(disk)).toEqual(tests);
  });
});

describe('ranking: community votes decide who is in a quiz', () => {
  const base = readFileSync(new URL('./questions.csv', import.meta.url), 'utf8');
  it('a voted question displaces the last seed question; quiz stays at 24', () => {
    const lines = base.trimEnd().split('\n');
    const extra = 'd1,1,culture,5,https://github.com/x/y/discussions/1,新問題？,New question?,甲,A,乙,B,丙,C,丁,D,解,Why';
    const rows = parseQuestionRows([...lines, extra].join('\n') + '\n');
    const quiz1 = buildQuizzes(rows)[0];
    expect(quiz1.questions).toHaveLength(24);
    expect(quiz1.questions.map((q) => q.id)).toContain('d1');
    expect(rows.filter((r) => r.quiz === 1 && !r.active)).toHaveLength(1);
    expect(validateRows(rows)).toEqual([]);
  });
});

import { mergeCommunityIntoCsv } from './merge';
describe('export merge (Discussions → CSV)', () => {
  const base = readFileSync(new URL('./questions.csv', import.meta.url), 'utf8');
  const comm = (id: string, votes: number) => ({
    id, quiz: 3, topic: 'culture', votes, source: `https://github.com/x/y/discussions/${id}`,
    question: ['問題，含逗號？', 'Q, with "quotes"\nand newline?'], correct: ['甲', 'A'],
    wrong: [['乙', 'B'], ['丙', 'C'], ['丁', 'D']], explanation: ['解', 'Why'], active: false,
  }) as never;
  it('keeps seed rows byte-for-byte equal in content, replaces old community rows, round-trips', () => {
    const once = mergeCommunityIntoCsv(base, [comm('d1', 3), comm('d2', 2)]);
    expect(once.seed).toBe(allRows.length);
    const rows1 = parseQuestionRows(once.csv);
    expect(rows1).toHaveLength(allRows.length + 2);
    expect(rows1.find((r) => r.id === 'd1')!.question[1]).toBe('Q, with "quotes"\nand newline?');
    const twice = mergeCommunityIntoCsv(once.csv, [comm('d9', 1)]); // old community rows are replaced
    const rows2 = parseQuestionRows(twice.csv);
    expect(rows2.filter((r) => r.source).map((r) => r.id)).toEqual(['d9']);
    expect(rows2.filter((r) => !r.source).map((r) => r.id)).toEqual(allRows.map((r) => r.id));
    expect(mergeCommunityIntoCsv(base, []).csv).toBe(base); // no-op export keeps the file identical
  });
});
