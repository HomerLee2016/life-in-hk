import type { Lang } from './types';

const dict = {
  appTitle: ['香港人生活測驗', 'Life in HK Quiz'],
  tagline: [
    '只有真正的香港人先過到關。',
    'Only a true Hongkonger makes the grade.',
  ],
  tabTests: ['測驗', 'Tests'],
  tabContact: ['聯絡', 'Contact'],
  langBtn: ['English', '繁體中文'],
  langAria: ['切換語言', 'Switch language'],
  themeToLight: ['切換至淺色模式', 'Switch to light mode'],
  themeToDark: ['切換至深色模式', 'Switch to dark mode'],
  intro: [
    '17 份測驗，每份 24 題，由英國開埠、六四、九七、2019 到日常生活禮儀。答啱 18 題或以上即合格。',
    '17 tests of 24 questions each — from 1841 to 2019, from queuing manners to Cantopop. Score 18 or more to pass.',
  ],
  questionsN: ['24 題', '24 questions'],
  best: ['最佳', 'Best'],
  notTried: ['未作答', 'Not tried'],
  passed: ['合格', 'Passed'],
  back: ['← 返回測驗列表', '← Back to tests'],
  qOf: ['第 {n} / {total} 題', 'Question {n} of {total}'],
  next: ['下一題', 'Next'],
  seeResult: ['查看結果', 'See result'],
  correct: ['答啱！', 'Correct!'],
  wrong: ['唔啱。', 'Not quite.'],
  rightAnswerWas: ['正確答案：', 'Correct answer: '],
  score: ['得分', 'Score'],
  passMark: ['合格分數：{n} / 24', 'Pass mark: {n} / 24'],
  verdictHk: ['恭喜，你係真香港人！👏', 'Well done — you are a true Hongkonger! 👏'],
  verdictAlmost: [
    '差少少。再溫習歷史同禮貌，下次一定得。',
    'So close. Brush up on the history and manners and try again.',
  ],
  verdictTourist: [
    '唔合格。去睇多啲歷史書，同埋記得排隊啊。',
    'Not a pass. Read more history — and please join the queue.',
  ],
  retry: ['重做', 'Try again'],
  reviewWrong: ['答錯的題目', 'Questions you missed'],
  yourAnswer: ['你的答案：', 'Your answer: '],
  allRight: ['全部答啱，冇得彈！', 'Full marks — flawless!'],
  contactTitle: ['聯絡我們', 'Contact'],
  contactBody: [
    '發現題目有錯、想提供更好的資料來源，或者想加新題目？歡迎到 GitHub 留言或提交 Pull Request。',
    'Spotted a mistake, have a better source, or want to suggest new questions? Open an issue or send a pull request on GitHub.',
  ],
  contactIssues: ['回報問題 / 建議', 'Report an issue / suggestion'],
  contactRepo: ['原始碼', 'Source code'],
  disclaimer: [
    '本測驗純屬文化娛樂，題目根據公開史實及公民價值設計；請以尊重態度討論，切勿騷擾或攻擊任何個人。',
    'This quiz is a cultural game. Questions are based on documented history and civic values. Please keep discussion respectful — no harassment of individuals.',
  ],
} as const;

export type Key = keyof typeof dict;

export function tr(key: Key, lang: Lang, vars: Record<string, string | number> = {}): string {
  let s: string = dict[key][lang === 'zh' ? 0 : 1];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
