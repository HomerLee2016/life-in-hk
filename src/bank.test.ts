import { describe, expect, it } from 'vitest';
import { FIELDS, mergeTests, parseDiscussion, parseSections, rankQuestions, type CommunityQuestion } from './bank';
import { seedTests } from './data/tests';

const form = (over: Partial<Record<keyof typeof FIELDS, string>> = {}) => {
  const v: Record<keyof typeof FIELDS, string> = {
    test: '5', qZh: '問題？', qEn: 'Question?', cZh: '甲', cEn: 'A', w1Zh: '乙', w1En: 'B',
    w2Zh: '丙', w2En: 'C', w3Zh: '丁', w3En: 'D', eZh: '解釋 https://x', eEn: 'Why https://x', ...over,
  };
  return (Object.keys(FIELDS) as (keyof typeof FIELDS)[]).map((k) => `### ${FIELDS[k]}\n\n${v[k] || '_No response_'}\n`).join('\n');
};
const cq = (test: number, votes: number, id = String(votes)): CommunityQuestion => ({
  test, votes, source: `https://github.com/x/${id}`, question: [`問${id}`, `Q${id}`], correct: ['a', 'A'],
  wrong: [['b', 'B'], ['c', 'C'], ['d', 'D']], explanation: ['解', 'why'],
});

describe('parseDiscussion', () => {
  it('parses a form-rendered discussion', () => {
    const q = parseDiscussion(form(), 7, 'u')!;
    expect(q.test).toBe(5);
    expect(q.votes).toBe(7);
    expect(q.question).toEqual(['問題？', 'Question?']);
    expect(q.wrong).toHaveLength(3);
  });
  it('handles CRLF and "5 - Road to 1997" style values', () => {
    expect(parseDiscussion(form({ test: '5 - Road' }).replace(/\n/g, '\r\n'), 1, 'u')?.test).toBe(5);
  });
  it('rejects missing fields, bad test numbers and duplicate options', () => {
    expect(parseDiscussion(form({ qEn: '' }), 1, 'u')).toBeNull();
    expect(parseDiscussion(form({ test: '18' }), 1, 'u')).toBeNull();
    expect(parseDiscussion(form({ test: 'abc' }), 1, 'u')).toBeNull();
    expect(parseDiscussion(form({ w1Zh: '甲', w1En: 'A' }), 1, 'u')).toBeNull();
    expect(parseDiscussion('just chatting', 1, 'u')).toBeNull();
  });
  it('parseSections ignores text before the first heading', () => {
    expect(parseSections(`hi\n### ${FIELDS.qZh}\n\nx\n### ${FIELDS.qEn}\n\n_No response_`)).toEqual({ [FIELDS.qZh]: 'x', [FIELDS.qEn]: '' });
  });
});

describe('ranking and merging', () => {
  it('ranks by votes, deterministic ties, and limits', () => {
    const r = rankQuestions([cq(1, 1, 'b'), cq(1, 5, 'a'), cq(1, 1, 'a')], 2);
    expect(r.map((x) => x.source)).toEqual(['https://github.com/x/a', 'https://github.com/x/a'.replace('a', 'a')]);
    expect(r[0].votes).toBe(5);
  });
  it('replaces seed questions with top-voted community ones, always 24 per test', () => {
    const community = Array.from({ length: 30 }, (_, i) => cq(1, 100 - i, String(i)));
    const merged = mergeTests(seedTests, [...community, cq(2, 3, 'z')]);
    expect(merged.every((t) => t.questions.length === 24)).toBe(true);
    expect(merged[0].questions[0].question).toEqual(['問0', 'Q0']); // highest-voted first
    expect(merged[0].questions[23].question).toEqual(['問23', 'Q23']); // 24th; the lowest 6 are dropped
    expect(merged[1].questions[0].question).toEqual(['問z', 'Qz']);
    expect(merged[1].questions[1].question).toEqual(seedTests[1].questions[0].question);
    expect(merged[2].questions).toEqual(seedTests[2].questions); // untouched
  });
  it('with no community questions the seed bank is used as-is', () => {
    expect(mergeTests(seedTests, [])).toEqual(seedTests);
  });
});

describe('edge cases (review findings)', () => {
  it('unknown ### headings inside a value do not truncate or hijack fields', () => {
    const body = form({ eEn: `Line\n### Source\nfoo\n### ${FIELDS.qEn}\nHIJACK` });
    const q = parseDiscussion(body, 1, 'u')!;
    expect(q.question[1]).toBe('Question?'); // first occurrence wins
    expect(q.explanation[1]).toContain('### Source');
  });
  it('rejects garbage test numbers', () => {
    for (const bad of ['3abc', '1.9', '1e1', '0', '-1', '']) expect(parseDiscussion(form({ test: bad }), 1, 'u'), bad).toBeNull();
    expect(parseDiscussion(form({ test: '17' }), 1, 'u')?.test).toBe(17);
  });
  it('rejects options that collide within one language', () => {
    expect(parseDiscussion(form({ w1Zh: '甲' }), 1, 'u')).toBeNull();
    expect(parseDiscussion(form({ w1En: ' a ' }), 1, 'u')).toBeNull();
  });
  it('filters per test before capping: a flood for test 1 cannot starve test 2', () => {
    const flood = Array.from({ length: 500 }, (_, i) => cq(1, 10, String(i)));
    const merged = mergeTests(seedTests, [...flood, cq(2, 1, 'only'), cq(99, 1000, 'bad')]);
    expect(merged[1].questions[0].question).toEqual(['問only', 'Qonly']);
    expect(merged.every((t) => t.questions.length === 24)).toBe(true);
  });
  it('de-duplicates community vs seed and community vs community', () => {
    const s = seedTests[0].questions[0];
    const dupOfSeed: CommunityQuestion = { ...cq(1, 5, 'x'), question: s.question as [string, string] };
    const merged = mergeTests(seedTests, [dupOfSeed, cq(1, 4, 'd'), cq(1, 3, 'd')])[0].questions;
    const keys = merged.map((q) => JSON.stringify(q.question));
    expect(new Set(keys).size).toBe(24);
  });
});
