import { describe, expect, it } from 'vitest';
import { allRows } from './data/questions';
import { validateRows } from './validate';
import type { QuestionRow } from './types';

const clone = (): QuestionRow[] => allRows.map((r) => ({ ...r, wrong: [...r.wrong] as QuestionRow['wrong'] }));

describe('validateRows catches CI-relevant problems', () => {
  it('passes on the real data', () => expect(validateRows(allRows)).toEqual([]));
  it('quiz with fewer than 24 questions', () => {
    const rows = clone().filter((r) => r.id !== 'q001');
    const q1 = rows.find((r) => r.quiz === 1)!.quiz;
    expect(q1).toBe(1);
    expect(validateRows(rows).join('\n')).toMatch(/quiz 1 has 23/);
  });
  it('quiz outside 1..17 and an empty quiz', () => {
    const rows = clone();
    rows[0].quiz = 18;
    expect(validateRows(rows).join('\n')).toMatch(/quiz must be empty or 1\.\.17/);
    expect(validateRows(rows).join('\n')).toMatch(/quiz 1 has 23/);
  });
  it('duplicate options (per language), empty fields, unknown topic, duplicate id/question', () => {
    const rows = clone();
    rows[1].wrong = [rows[1].correct, rows[1].wrong[1], rows[1].wrong[2]];
    rows[2].explanation = ['', 'x'];
    rows[3].topic = 'nope';
    rows[4].id = rows[5].id;
    rows[6].question = [rows[6].question[0], rows[7].question[1]];
    const msg = validateRows(rows).join('\n');
    expect(msg).toMatch(/not 4 distinct/);
    expect(msg).toMatch(/explanation_zh is empty/);
    expect(msg).toMatch(/unknown topic/);
    expect(msg).toMatch(/duplicate id/);
    expect(msg).toMatch(/same English question/);
  });
  it('a 25th row in a quiz is fine (bank), but must not be active', () => {
    const rows = clone();
    rows.push({ ...rows[0], id: 'zz', question: ['另一題？', 'Another question?'], active: false });
    expect(validateRows(rows)).toEqual([]);
  });
});
