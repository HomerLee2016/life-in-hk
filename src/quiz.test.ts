import { describe, expect, it } from 'vitest';
import {
  PASS_MARK, answer, answeredCount, detectLang, detectTheme, hasPassed, isFinished, recordBest,
  score, shuffle, startSession, t, verdict, wrongQuestions,
} from './quiz';
import { tests } from './data/questions';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('t()', () => {
  it('picks language and shares plain strings', () => {
    expect(t(['中', 'en'], 'zh')).toBe('中');
    expect(t(['中', 'en'], 'en')).toBe('en');
    expect(t('1997', 'zh')).toBe('1997');
  });
});

describe('shuffle', () => {
  it('keeps all items and does not mutate', () => {
    const src = [1, 2, 3, 4, 5, 6];
    const out = shuffle(src, seeded());
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('session', () => {
  const test = tests[0];
  it('scores correct answers (option 0) and locks answers', () => {
    const s = startSession(test, seeded());
    expect(answer(s, 0, 0)).toBe(true);
    expect(answer(s, 1, 2)).toBe(false);
    expect(answer(s, 0, 3)).toBe(true); // locked: still reflects first pick
    expect(score(s)).toBe(1);
    expect(answeredCount(s)).toBe(2);
    expect(wrongQuestions(s)).toContain(1);
    expect(isFinished(s)).toBe(false);
  });
  it('shuffles options for every question while keeping a permutation', () => {
    const s = startSession(test, seeded(7));
    s.order.forEach((o) => expect([...o].sort()).toEqual([0, 1, 2, 3]));
    expect(s.order.some((o) => o[0] !== 0)).toBe(true);
  });
  it('shuffles question order per attempt but keeps the same 24 questions', () => {
    const a = startSession(test, seeded(3));
    const ids = (s: typeof a) => s.test.questions.map((x) => x.id);
    expect([...ids(a)].sort()).toEqual(test.questions.map((x) => x.id).sort());
    expect(ids(a)).not.toEqual(test.questions.map((x) => x.id));
    expect(ids(startSession(test, seeded(4)))).not.toEqual(ids(a));
  });
  it('pass mark is 18 of 24', () => {
    const s = startSession(test, seeded());
    for (let i = 0; i < 24; i++) answer(s, i, i < PASS_MARK - 1 ? 0 : 1);
    expect(isFinished(s)).toBe(true);
    expect(score(s)).toBe(17);
    expect(hasPassed(s)).toBe(false);
    const s2 = startSession(test, seeded());
    for (let i = 0; i < 24; i++) answer(s2, i, i < PASS_MARK ? 0 : 1);
    expect(hasPassed(s2)).toBe(true);
  });
  it('verdict tiers', () => {
    expect(PASS_MARK).toBe(18);
    expect(verdict(24)).toBe('hongkonger');
    expect(verdict(18)).toBe('hongkonger');
    expect(verdict(17)).toBe('almost');
    expect(verdict(14)).toBe('almost');
    expect(verdict(13)).toBe('tourist');
  });
});

describe('persistence helpers', () => {
  it('keeps best scores', () => {
    expect(recordBest({ 1: 10 }, 1, 8)).toEqual({ 1: 10 });
    expect(recordBest({ 1: 10 }, 1, 12)).toEqual({ 1: 12 });
    expect(recordBest({}, 3, 0)).toEqual({ 3: 0 });
  });
  it('detects language: stored wins, zh browsers get zh, else en', () => {
    expect(detectLang('en-US', 'zh')).toBe('zh');
    expect(detectLang('zh-HK', null)).toBe('zh');
    expect(detectLang('fr', null)).toBe('en');
    expect(detectLang(undefined, 'xx')).toBe('en');
  });
  it('detects theme: stored wins, else system preference', () => {
    expect(detectTheme(true, 'light')).toBe('light');
    expect(detectTheme(false, 'dark')).toBe('dark');
    expect(detectTheme(true, null)).toBe('dark');
    expect(detectTheme(false, null)).toBe('light');
  });
});

import { sanitizeBests } from './quiz';
describe('edge cases (review findings)', () => {
  it('sanitizeBests drops corrupt data', () => {
    expect(sanitizeBests(null)).toEqual({});
    expect(sanitizeBests(5)).toEqual({});
    expect(sanitizeBests([1, 2])).toEqual({});
    expect(sanitizeBests({ 1: 'abc', 2: 99, 3: 12.5, 4: -1, 99: 5, 5: 20 })).toEqual({ 5: 20 });
  });
  it('answer ignores out-of-range / NaN options and bad question index', () => {
    const s = startSession(tests[0], seeded());
    expect(answer(s, 0, NaN)).toBe(false);
    expect(answer(s, 0, 7)).toBe(false);
    expect(answer(s, 99, 0)).toBe(false);
    expect(answeredCount(s)).toBe(0);
  });
});
