import { PASS_MARK, QUESTIONS_PER_QUIZ, QUIZ_COUNT } from './constants';
import type { Lang, QuizTest, Txt } from './types';

export { PASS_MARK, QUESTIONS_PER_QUIZ, QUIZ_COUNT };


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

export function startSession(source: QuizTest, rng: () => number = Math.random): Session {
  const test: QuizTest = { ...source, questions: shuffle(source.questions, rng) }; // fresh question order every attempt
  return {
    test,
    order: test.questions.map((q) => shuffle(q.options.map((_, i) => i), rng)),
    picked: test.questions.map(() => null),
    current: 0,
  };
}

export function answer(s: Session, qIndex: number, optionIndex: number): boolean {
  if (!s.test.questions[qIndex]) return false;
  if (s.picked[qIndex] !== null) return s.picked[qIndex] === 0; // no changing answers
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= s.test.questions[qIndex].options.length) return false;
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

/** Lifetime per-question tally: c = times answered correctly, w = times answered wrong. */
export type Stats = Record<string, { c: number; w: number }>;

export function sanitizeStats(raw: unknown): Stats {
  const out: Stats = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const r = v as { c?: unknown; w?: unknown } | null;
    const c = r && Number.isInteger(r.c) && (r.c as number) >= 0 ? (r.c as number) : 0;
    const w = r && Number.isInteger(r.w) && (r.w as number) >= 0 ? (r.w as number) : 0;
    if (c + w > 0) out[id] = { c, w };
  }
  return out;
}

export function recordAnswer(stats: Stats, id: string, correct: boolean): Stats {
  const cur = stats[id] ?? { c: 0, w: 0 };
  return { ...stats, [id]: { c: cur.c + (correct ? 1 : 0), w: cur.w + (correct ? 0 : 1) } };
}

export function statTotals(stats: Stats): { correct: number; wrong: number; pct: number | null } {
  let correct = 0, wrong = 0;
  for (const v of Object.values(stats)) { correct += v.c; wrong += v.w; }
  const n = correct + wrong;
  return { correct, wrong, pct: n === 0 ? null : Math.round((correct / n) * 100) };
}

export type Bests = Record<number, number>;

/** Keep only entries with an integer test id 1..17 and an integer score 0..24; anything else is dropped. */
export function sanitizeBests(raw: unknown): Bests {
  const out: Bests = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(k);
    if (Number.isInteger(id) && id >= 1 && id <= QUIZ_COUNT && typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= QUESTIONS_PER_QUIZ) out[id] = v;
  }
  return out;
}
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
