export type Lang = 'zh' | 'en';
export type Theme = 'light' | 'dark';

/** Text in both languages: [繁體中文, English]. A bare string is shared by both (years, names, numbers). */
export type Txt = string | readonly [string, string];

/** [question, correct answer, three wrong answers, explanation] */
export type RawQuestion = readonly [Txt, Txt, readonly [Txt, Txt, Txt], Txt];

export interface RawTest {
  id: number;
  title: readonly [string, string];
  blurb: readonly [string, string];
  qs: readonly RawQuestion[];
}

export interface Question {
  question: Txt;
  options: readonly Txt[]; // options[0] is always the correct answer in source order
  explanation: Txt;
}

export interface QuizTest {
  id: number;
  title: readonly [string, string];
  blurb: readonly [string, string];
  questions: readonly Question[];
}
