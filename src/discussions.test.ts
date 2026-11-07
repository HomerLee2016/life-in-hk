import { describe, expect, it } from 'vitest';
import { FIELDS, parseDiscussion, parseSections, seedBody, seedIdOf, seedTitle, topPerQuiz } from './discussions';
import { allRows } from './data/questions';
import type { QuestionRow } from './types';

const form = (over: Partial<Record<keyof typeof FIELDS, string>> = {}) => {
  const v: Record<keyof typeof FIELDS, string> = {
    quiz: '5', topic: 'culture', qZh: '問題？', qEn: 'Question?', cZh: '甲', cEn: 'A', w1Zh: '乙', w1En: 'B',
    w2Zh: '丙', w2En: 'C', w3Zh: '丁', w3En: 'D', eZh: '解釋 https://x', eEn: 'Why https://x', ...over,
  };
  return (Object.keys(FIELDS) as (keyof typeof FIELDS)[]).map((k) => `### ${FIELDS[k]}\n\n${v[k] || '_No response_'}\n`).join('\n');
};
const row = (quiz: number, votes: number, src: string): QuestionRow => ({
  id: src, quiz, topic: 'culture', votes, source: `https://x/${src}`, question: ['問', 'Q'], correct: ['a', 'A'],
  wrong: [['b', 'B'], ['c', 'C'], ['d', 'D']], explanation: ['解', 'why'], active: false,
});

describe('parseDiscussion', () => {
  it('parses a form-rendered discussion', () => {
    const q = parseDiscussion(form(), 7, 'https://u', 'd9')!;
    expect(q).toMatchObject({ id: 'd9', quiz: 5, topic: 'culture', votes: 7, source: 'https://u' });
    expect(q.wrong).toHaveLength(3);
  });
  it('handles CRLF and "5 - something" quiz values', () => {
    expect(parseDiscussion(form({ quiz: '5 - Road' }).replace(/\n/g, '\r\n'), 1, 'u', 'd')?.quiz).toBe(5);
  });
  it('rejects missing fields, bad quiz numbers, unknown topics and duplicate options', () => {
    expect(parseDiscussion(form({ qEn: '' }), 1, 'u', 'd')).toBeNull();
    for (const bad of ['3abc', '1.9', '1e1', '0', '-1', '18', '']) expect(parseDiscussion(form({ quiz: bad }), 1, 'u', 'd'), bad).toBeNull();
    expect(parseDiscussion(form({ topic: 'cooking' }), 1, 'u', 'd')).toBeNull();
    expect(parseDiscussion(form({ w1Zh: '甲', w1En: 'A' }), 1, 'u', 'd')).toBeNull();
    expect(parseDiscussion(form({ w1Zh: '甲' }), 1, 'u', 'd')).toBeNull();
    expect(parseDiscussion(form({ w1En: ' a ' }), 1, 'u', 'd')).toBeNull();
    expect(parseDiscussion('just chatting', 1, 'u', 'd')).toBeNull();
  });
  it('unknown ### headings inside a value do not truncate or hijack fields', () => {
    const q = parseDiscussion(form({ eEn: `Line\n### Source\nfoo\n### ${FIELDS.qEn}\nHIJACK` }), 1, 'u', 'd')!;
    expect(q.question[1]).toBe('Question?');
    expect(q.explanation[1]).toContain('### Source');
  });
  it('parseSections ignores text before the first known heading', () => {
    expect(parseSections(`hi\n### ${FIELDS.qZh}\n\nx\n### ${FIELDS.qEn}\n\n_No response_`)).toEqual({ [FIELDS.qZh]: 'x', [FIELDS.qEn]: '' });
  });
});

describe('topPerQuiz', () => {
  it('caps at 24 per quiz without starving other quizzes, drops out-of-range quizzes', () => {
    const flood = Array.from({ length: 500 }, (_, i) => row(1, 10, `a${i}`));
    const out = topPerQuiz([...flood, row(2, 1, 'only'), row(99, 1000, 'bad')]);
    expect(out.filter((r) => r.quiz === 1)).toHaveLength(24);
    expect(out.filter((r) => r.quiz === 2)).toHaveLength(1);
    expect(out.some((r) => r.quiz === 99)).toBe(false);
  });
  it('orders by votes then source, deterministically', () => {
    const out = topPerQuiz([row(1, 1, 'b'), row(1, 5, 'z'), row(1, 1, 'a')]);
    expect(out.map((r) => r.id)).toEqual(['z', 'a', 'b']);
  });
});

describe('seed discussions', () => {
  it('every CSV row round-trips through seedBody -> parseDiscussion (quiz rows) and carries its id marker', () => {
    for (const r of allRows) {
      const body = seedBody(r);
      expect(seedIdOf(body), r.id).toBe(r.id);
      expect(seedTitle(r)).toContain(r.id);
      expect(seedTitle(r).length).toBeLessThanOrEqual(200);
      const back = parseDiscussion(body, 0, 'u', r.id);
      if (r.quiz === null) expect(back, r.id).toBeNull();
      else {
        expect(back, r.id).not.toBeNull();
        expect(back!.question).toEqual(r.question);
        expect(back!.correct).toEqual(r.correct);
        expect(back!.wrong).toEqual(r.wrong);
        expect(back!.quiz).toBe(r.quiz);
        expect(back!.topic).toBe(r.topic);
      }
    }
  });
  it('community posts have no seed id', () => expect(seedIdOf(form())).toBeNull());
});
