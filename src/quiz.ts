import type { Lang, QuizTest, RawTest, Txt } from './types';

export const QUESTIONS_PER_TEST = 24;
export const PASS_MARK = 18; // 75%

export function defineTest(raw: RawTest): QuizTest {
  return {
    id: raw.id,
    title: raw.title,
    blurb: raw.blurb,
    questions: raw.qs.map(([question, correct, wrong, explanation]) => ({
      question,
      options: [correct, ...wrong],
      explanation,
    })),
  };
}

export function t(txt: Txt, lang: Lang): string {
  return typeof txt === 'string' ? txt : txt[lang === 'zh' ? 0 : 1];
}

/** Fisher–Yates, returns a new array. `rng` is injectable for deterministic tests. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Session {
  test: QuizTest;
  /** order[q] = source option indexes in display order (0 is the correct one). */
  order: number[][];
  /** picked[q] = source option index chosen, or null. */
  picked: (number | null)[];
  current: number;
}

export function startSession(test: QuizTest, rng: () => number = Math.random): Session {
  return {
    test,
    order: test.questions.map((q) => shuffle(q.options.map((_, i) => i), rng)),
    picked: test.questions.map(() => null),
    current: 0,
  };
}

export function answer(s: Session, qIndex: number, optionIndex: number): boolean {
  if (s.picked[qIndex] !== null) return s.picked[qIndex] === 0; // no changing answers
  s.picked[qIndex] = optionIndex;
  return optionIndex === 0;
}

export const isCorrect = (s: Session, q: number) => s.picked[q] === 0;
export const answeredCount = (s: Session) => s.picked.filter((p) => p !== null).length;
export const score = (s: Session) => s.picked.filter((p) => p === 0).length;
export const isFinished = (s: Session) => answeredCount(s) === s.test.questions.length;
export const hasPassed = (s: Session) => score(s) >= PASS_MARK;
export const wrongQuestions = (s: Session) =>
  s.picked.map((p, i) => (p !== 0 ? i : -1)).filter((i) => i >= 0);

/** Verdict tiers shown on the result screen. */
export function verdict(sc: number): 'hongkonger' | 'almost' | 'tourist' {
  if (sc >= PASS_MARK) return 'hongkonger';
  if (sc >= PASS_MARK - 4) return 'almost';
  return 'tourist';
}

// ---- persistence (all wrapped: storage can be blocked) ----
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export type Bests = Record<number, number>;
export function recordBest(bests: Bests, id: number, sc: number): Bests {
  return sc > (bests[id] ?? -1) ? { ...bests, [id]: sc } : bests;
}

export function detectLang(navLang: string | undefined, stored: string | null): Lang {
  if (stored === 'zh' || stored === 'en') return stored;
  return navLang?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function detectTheme(prefersDark: boolean, stored: string | null): 'light' | 'dark' {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}
