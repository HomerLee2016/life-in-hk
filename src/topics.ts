import type { Lang } from './types';

/** Syllabus topics. A question has exactly one topic; quizzes mix topics (see data/questions.csv). */
export const TOPICS: readonly { key: string; name: readonly [string, string] }[] = [
  { key: 'early_hk', name: ['早期香港（1841–1949）', 'Early Hong Kong (1841–1949)'] },
  { key: 'boom', name: ['難民、徙置區與起飛（1950–1960s）', 'Refugees, Resettlement and Take-off (1950s–60s)'] },
  { key: 'lionrock', name: ['獅子山下的年代（1970s–1980s）', 'The Lion Rock Years (1970s–1980s)'] },
  { key: 'road1997', name: ['九七前途：中英談判（1982–1996）', 'The Road to 1997 (1982–1996)'] },
  { key: 'june4', name: ['八九六四與香港', 'June 4, 1989 and Hong Kong'] },
  { key: 'handover', name: ['九七回歸與特區早年', 'Handover and the Early SAR (1997–2012)'] },
  { key: 'rights', name: ['權利、自由與法治', 'Rights, Freedoms and the Rule of Law'] },
  { key: 'vote', name: ['爭普選的年代（2005–2018）', 'The Fight for the Vote (2005–2018)'] },
  { key: 'y2019', name: ['2019：反修例運動', '2019: The Anti-Extradition Movement'] },
  { key: 'people_slogans', name: ['人物、禁書禁片與口號', 'People, Banned Works and Slogans'] },
  { key: 'after2019', name: ['2019 之後', 'After 2019'] },
  { key: 'manners', name: ['禮貌、公德與做人', 'Manners, Civic Duty and Decency'] },
  { key: 'culture', name: ['文化與藝術', 'Culture and the Arts'] },
  { key: 'media_sport', name: ['傳媒與體育', 'Media and Sport'] },
  { key: 'festivals', name: ['節日與公眾假期', 'Festivals and Public Holidays'] },
  { key: 'life_services', name: ['日常生活：教育、醫療與民生', 'Everyday Life: Education, Health and Living'] },
  { key: 'life_work_money', name: ['日常生活：工作、金錢與義工', 'Everyday Life: Work, Money and Volunteering'] },
];

export const topicKeys = TOPICS.map((t) => t.key);
export const topicName = (key: string, lang: Lang): string =>
  TOPICS.find((t) => t.key === key)?.name[lang === 'zh' ? 0 : 1] ?? key;
