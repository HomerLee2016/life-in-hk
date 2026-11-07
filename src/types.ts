export type Lang = 'zh' | 'en';
export type Theme = 'light' | 'dark';

/** Text in both languages: [繁體中文, English]. A bare string is shared by both (years, names, numbers). */
export type Txt = string | readonly [string, string];
export type Bi = readonly [string, string];

/** One row of src/data/questions.csv — the single source of truth for all questions. */
export interface QuestionRow {
  id: string;
  /** Quiz number 1..17, or null when the question is only in the bank. */
  quiz: number | null;
  topic: string;
  /** Discussion upvotes (0 for seed questions). Higher votes win a place in the quiz. */
  votes: number;
  /** Discussion URL for community questions; empty for seed questions. */
  source: string;
  question: Bi;
  correct: Bi;
  wrong: readonly [Bi, Bi, Bi];
  explanation: Bi;
  /** True when this row is one of the 24 shown in its quiz (false = bank only / outranked). */
  active: boolean;
}

export interface Question {
  id: string;
  topic: string;
  question: Txt;
  options: readonly Txt[]; // options[0] is always the correct answer in source order
  explanation: Txt;
}

export interface QuizTest {
  id: number;
  questions: readonly Question[];
}
