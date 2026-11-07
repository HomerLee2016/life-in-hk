import { describe, expect, it } from 'vitest';
import { seedTests } from './tests';
import { tests } from './index';
import { t } from '../quiz';

describe('question data', () => {
  it('has 17 tests × 24 questions = 408', () => {
    expect(seedTests).toHaveLength(17);
    expect(seedTests.map((x) => x.id)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    for (const x of seedTests) expect(x.questions, `test ${x.id}`).toHaveLength(24);
    expect(tests.reduce((n, x) => n + x.questions.length, 0)).toBe(408);
  });

  for (const x of seedTests) {
    it(`test ${x.id}: bilingual, 4 distinct options, no duplicate questions`, () => {
      const seen = new Set<string>();
      x.questions.forEach((q, i) => {
        const where = `test ${x.id} Q${i + 1}`;
        for (const lang of ['zh', 'en'] as const) {
          expect(t(q.question, lang).trim(), where).not.toBe('');
          expect(t(q.explanation, lang).trim(), where).not.toBe('');
          expect(q.options, where).toHaveLength(4);
          const opts = q.options.map((o) => t(o, lang).trim());
          expect(new Set(opts).size, `${where} duplicate options (${lang})`).toBe(4);
          opts.forEach((o) => expect(o, where).not.toBe(''));
        }
        // Chinese text should contain CJK; English text should not be CJK only.
        if (typeof q.question !== 'string') {
          expect(q.question[0], where).toMatch(/[一-鿿]/);
          expect(q.question[1], where).toMatch(/[A-Za-z]/);
        }
        const key = t(q.question, 'en');
        expect(seen.has(key), `${where} duplicate question`).toBe(false);
        seen.add(key);
      });
    });
  }
});
