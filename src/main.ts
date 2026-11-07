import './styles.css';
import { allRows, tests } from './data/questions';
import { TOPICS, topicName } from './topics';
import { tr } from './i18n';
import {
  PASS_MARK, QUESTIONS_PER_QUIZ, answer, detectLang, detectTheme, hasPassed,
  load, recordBest, sanitizeBests, isFinished, save, score, startSession, t, verdict, wrongQuestions,
  type Bests, type Session,
} from './quiz';
import type { Lang, QuizTest, Theme } from './types';

const REPO = 'https://github.com/HomerLee2016/life-in-hk';
const DISCUSSIONS = `${REPO}/discussions`;

const store = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const put = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
};

let lang: Lang = detectLang(navigator.language, store('lih.lang'));
let theme: Theme = detectTheme(matchMedia('(prefers-color-scheme: dark)').matches, store('lih.theme'));
let bests: Bests = sanitizeBests(load<unknown>('lih.bests', {}));
let session: Session | null = null;
let showResult = false;

const app = document.getElementById('app')!;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function applyChrome() {
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  document.title = tr('appTitle', lang);
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute('content', theme);
}

type Route = { page: 'tests' } | { page: 'questions' } | { page: 'contact' } | { page: 'quiz'; id: number };
function route(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const m = /^tests\/(\d+)$/.exec(h);
  if (m && tests.some((x) => x.id === Number(m[1]))) return { page: 'quiz', id: Number(m[1]) };
  if (h === 'contact') return { page: 'contact' };
  return h === 'questions' ? { page: 'questions' } : { page: 'tests' };
}

function header(active: 'tests' | 'questions' | 'contact'): string {
  const nextTheme = theme === 'dark' ? tr('themeToLight', lang) : tr('themeToDark', lang);
  return `
  <header class="top">
    <div class="brand">
      <div><h1>${esc(tr('appTitle', lang))}</h1><p class="tag">${esc(tr('tagline', lang))}</p></div></div>
    <div class="tools">
      <button id="lang" class="chip" aria-label="${esc(tr('langAria', lang))}">${esc(tr('langBtn', lang))}</button>
      <button id="theme" class="chip" aria-label="${esc(nextTheme)}" title="${esc(nextTheme)}">${theme === 'dark' ? '☀️' : '🌙'}</button>
    </div>
  </header>
  <nav class="tabs" role="tablist">
    <a role="tab" id="tab-tests" href="#/tests" aria-selected="${active === 'tests'}">${esc(tr('tabTests', lang))}</a>
    <a role="tab" id="tab-questions" href="#/questions" aria-selected="${active === 'questions'}">${esc(tr('tabQuestions', lang))}</a>
    <a role="tab" id="tab-contact" href="#/contact" aria-selected="${active === 'contact'}">${esc(tr('tabContact', lang))}</a>
    <a class="tab-extra" id="link-discussions" href="${DISCUSSIONS}" target="_blank" rel="noopener">${esc(tr('contribute', lang))} ↗</a>
  </nav>`;
}

function testsPage(): string {
  const cards = tests.map((x) => {
    const b = bests[x.id];
    const badge = b === undefined
      ? `<span class="badge">${esc(tr('notTried', lang))}</span>`
      : `<span class="badge ${b >= PASS_MARK ? 'ok' : 'no'}">${esc(tr('best', lang))} ${b}/${QUESTIONS_PER_QUIZ}${b >= PASS_MARK ? ' ✓' : ''}</span>`;
    return `<a class="card" href="#/tests/${x.id}" data-test="${x.id}">
      <span class="num">${x.id}</span>
      <h3>${esc(tr('quizN', lang, { n: x.id }))}</h3>
      <p>${esc(tr('quizBlurb', lang))}</p>
      <div class="meta"><span>${esc(tr('questionsN', lang))}</span>${badge}</div></a>`;
  }).join('');
  return `<p class="intro">${esc(tr('intro', lang))}</p><section class="grid">${cards}</section>
    <p class="note"><a id="footer-discussions" href="${DISCUSSIONS}" target="_blank" rel="noopener">${esc(tr('contribute', lang))} ↗</a> · ${esc(tr('disclaimer', lang))}</p>`;
}

function contactPage(): string {
  return `<section class="panel"><h2>${esc(tr('contactTitle', lang))}</h2>
    <p>${esc(tr('contactBody', lang))}</p>
    <p>${esc(tr('contributeHint', lang))}</p>
    <p class="links"><a class="btn" id="contact-discussions" href="${DISCUSSIONS}" target="_blank" rel="noopener">${esc(tr('contribute', lang))} ↗</a>
    <a class="btn ghost" href="${REPO}/issues" target="_blank" rel="noopener">${esc(tr('contactIssues', lang))}</a>
    <a class="btn ghost" href="${REPO}" target="_blank" rel="noopener">${esc(tr('contactRepo', lang))}</a></p>
    <p class="note">${esc(tr('disclaimer', lang))}</p></section>`;
}

// ---- All questions (review table) ----
const filters = { search: '', quiz: '', topic: '' };

function questionRows(): string {
  const term = filters.search.trim().toLowerCase();
  const matches = allRows.filter((r) => {
    if (filters.quiz && String(r.quiz) !== filters.quiz) return false;
    if (filters.topic && r.topic !== filters.topic) return false;
    if (!term) return true;
    const hay = [r.id, ...r.question, ...r.correct, ...r.wrong.flat(), ...r.explanation].join('\n').toLowerCase();
    return hay.includes(term);
  });
  const i = lang === 'zh' ? 0 : 1;
  const rows = matches.map((r) => `<tr class="${r.active ? '' : 'bank'}" data-qid="${esc(r.id)}">
    <td data-label="${esc(tr('colId', lang))}">${esc(r.id)}</td>
    <td data-label="${esc(tr('colQuiz', lang))}">${r.quiz === null ? '—' : r.quiz}${r.active ? '' : ` <span class="badge">${esc(tr('bankOnly', lang))}</span>`}</td>
    <td data-label="${esc(tr('colTopic', lang))}">${esc(topicName(r.topic, lang))}</td>
    <td data-label="${esc(tr('colQuestion', lang))}" class="qcell">${esc(r.question[i])}</td>
    <td data-label="${esc(tr('colCorrect', lang))}" class="ok-t">${esc(r.correct[i])}</td>
    <td data-label="${esc(tr('colWrong', lang))}">${r.wrong.map((w) => esc(w[i])).join(' · ')}</td>
    <td data-label="${esc(tr('colExplanation', lang))}" class="why">${esc(r.explanation[i])}</td></tr>`).join('');
  return `<p class="note" id="qcount" role="status">${esc(tr('qShowing', lang, { n: matches.length, total: allRows.length }))}</p>
    ${matches.length === 0 ? `<p>${esc(tr('noMatches', lang))}</p>` : `<div class="tablewrap"><table class="qtable" id="qtable"><thead><tr>
      ${(['colId', 'colQuiz', 'colTopic', 'colQuestion', 'colCorrect', 'colWrong', 'colExplanation'] as const).map((k) => `<th>${esc(tr(k, lang))}</th>`).join('')}
    </tr></thead><tbody>${rows}</tbody></table></div>`}`;
}

function questionsPage(): string {
  const quizOpts = tests.map((x) => `<option value="${x.id}" ${filters.quiz === String(x.id) ? 'selected' : ''}>${esc(tr('quizN', lang, { n: x.id }))}</option>`).join('');
  const topicOpts = TOPICS.map((x) => `<option value="${x.key}" ${filters.topic === x.key ? 'selected' : ''}>${esc(topicName(x.key, lang))}</option>`).join('');
  return `<p class="intro">${esc(tr('qIntro', lang))}</p>
    <div class="filters">
      <input id="q-search" type="search" value="${esc(filters.search)}" placeholder="${esc(tr('qSearch', lang))}" aria-label="${esc(tr('qSearch', lang))}">
      <select id="q-quiz" aria-label="${esc(tr('colQuiz', lang))}"><option value="">${esc(tr('qAllQuizzes', lang))}</option>${quizOpts}</select>
      <select id="q-topic" aria-label="${esc(tr('colTopic', lang))}"><option value="">${esc(tr('qAllTopics', lang))}</option>${topicOpts}</select>
    </div>
    <div id="qresults">${questionRows()}</div>`;
}

function optionLabel(s: Session, q: number, src: number): string {
  return t(s.test.questions[q].options[src], lang);
}

function quizPage(test: QuizTest): string {
  const s = session!;
  const back = `<a class="back" href="#/tests">${esc(tr('back', lang))}</a>`;
  const title = `<h2 class="qt">${esc(tr('quizN', lang, { n: test.id }))}</h2>`;
  if (showResult) return back + title + resultView(s);

  const qi = s.current;
  const q = test.questions[qi];
  const picked = s.picked[qi];
  const done = picked !== null;
  const opts = s.order[qi].map((src, pos) => {
    let cls = 'opt';
    if (done) cls += src === 0 ? ' right' : src === picked ? ' bad' : ' dim';
    return `<button class="${cls}" data-opt="${src}" ${done ? 'disabled' : ''}>
      <span class="key">${'ABCD'[pos]}</span><span>${esc(optionLabel(s, qi, src))}</span>${done && src === 0 ? '<span class="mark" aria-hidden="true">✓</span>' : done && src === picked ? '<span class="mark" aria-hidden="true">✗</span>' : ''}</button>`;
  }).join('');
  const feedback = done ? `<div class="feedback ${picked === 0 ? 'ok' : 'no'}" role="status">
      <strong>${picked === 0 ? '✓ ' : '✗ '}${esc(tr(picked === 0 ? 'correct' : 'wrong', lang))}</strong>
      ${picked === 0 ? '' : `<div>${esc(tr('rightAnswerWas', lang))}${esc(optionLabel(s, qi, 0))}</div>`}
      <p>${esc(t(q.explanation, lang))}</p>
      <button id="next" class="btn">${esc(tr(qi === test.questions.length - 1 ? 'seeResult' : 'next', lang))}</button></div>` : '';
  const pct = (qi / test.questions.length) * 100;
  return `${back}${title}
    <div class="progress" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <p class="qn">${esc(tr('qOf', lang, { n: qi + 1, total: test.questions.length }))}</p>
    <p class="topic-tag">${esc(topicName(q.topic, lang))}</p>
    <h3 class="question" id="question">${esc(t(q.question, lang))}</h3>
    <div class="opts">${opts}</div>${feedback}`;
}

function resultView(s: Session): string {
  const sc = score(s);
  const v = verdict(sc);
  const vk = v === 'hongkonger' ? 'verdictHk' : v === 'almost' ? 'verdictAlmost' : 'verdictTourist';
  const wrong = wrongQuestions(s);
  const review = wrong.length === 0
    ? `<p class="allright">${esc(tr('allRight', lang))}</p>`
    : `<h3>${esc(tr('reviewWrong', lang))}</h3>` + wrong.map((qi) => {
      const q = s.test.questions[qi];
      const mine = s.picked[qi];
      return `<article class="rev"><h4>${qi + 1}. ${esc(t(q.question, lang))}</h4>
        ${mine !== null ? `<p class="bad-t">${esc(tr('yourAnswer', lang))}${esc(optionLabel(s, qi, mine))}</p>` : ''}
        <p class="ok-t">${esc(tr('rightAnswerWas', lang))}${esc(optionLabel(s, qi, 0))}</p>
        <p class="why">${esc(t(q.explanation, lang))}</p></article>`;
    }).join('');
  return `<section class="result ${hasPassed(s) ? 'pass' : 'fail'}" id="result">
    <p class="big">${esc(tr('score', lang))} <b>${sc}</b> / ${s.test.questions.length}</p>
    <p class="verdict">${esc(tr(vk, lang))}</p>
    <p class="note">${esc(tr('passMark', lang, { n: PASS_MARK }))}</p>
    <p><button id="retry" class="btn">${esc(tr('retry', lang))}</button></p></section>${review}`;
}

function render() {
  applyChrome();
  const r = route();
  let body: string;
  if (r.page === 'quiz') {
    const test = tests.find((x) => x.id === r.id)!;
    if (!session || session.test.id !== test.id) { session = startSession(test); showResult = false; }
    body = quizPage(test);
  } else {
    session = null; showResult = false;
    body = r.page === 'contact' ? contactPage() : r.page === 'questions' ? questionsPage() : testsPage();
  }
  app.innerHTML = header(r.page === 'contact' ? 'contact' : r.page === 'questions' ? 'questions' : 'tests') + `<main>${body}</main>`;
  wire();
}

function wire() {
  // Switching language/theme re-renders in place: quiz state (answers, option order, position,
  // result screen) lives in `session`, and scroll/focus are preserved.
  const rerenderKeepingView = (focusId: string) => {
    const y = window.scrollY;
    render();
    window.scrollTo({ top: y });
    document.getElementById(focusId)?.focus({ preventScroll: true });
  };
  document.getElementById('lang')!.onclick = () => {
    lang = lang === 'zh' ? 'en' : 'zh'; put('lih.lang', lang); rerenderKeepingView('lang');
  };
  document.getElementById('theme')!.onclick = () => {
    theme = theme === 'dark' ? 'light' : 'dark'; put('lih.theme', theme); rerenderKeepingView('theme');
  };
  app.querySelectorAll<HTMLButtonElement>('button.opt').forEach((b) => {
    b.onclick = () => {
      if (!session) return;
      answer(session, session.current, Number(b.dataset.opt));
      if (isFinished(session)) {
        bests = recordBest(sanitizeBests(load<unknown>('lih.bests', {})), session.test.id, score(session));
        save('lih.bests', bests);
      }
      render();
      document.getElementById('next')?.scrollIntoView({ block: 'nearest' });
    };
  });
  const next = document.getElementById('next');
  if (next) next.onclick = () => {
    if (!session) return;
    if (session.current === session.test.questions.length - 1) {
      showResult = true;
    } else session.current++;
    render();
    window.scrollTo({ top: 0 });
  };
  const results = document.getElementById('qresults');
  if (results) {
    const refresh = () => { results.innerHTML = questionRows(); };
    const bind = (id: string, key: keyof typeof filters, ev: string) => {
      document.getElementById(id)!.addEventListener(ev, (e) => { filters[key] = (e.target as HTMLInputElement).value; refresh(); });
    };
    bind('q-search', 'search', 'input'); bind('q-quiz', 'quiz', 'change'); bind('q-topic', 'topic', 'change');
  }
  const retry = document.getElementById('retry');
  if (retry) retry.onclick = () => {
    if (!session) return;
    session = startSession(session.test); showResult = false; render(); window.scrollTo({ top: 0 });
  };
}

window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0 }); });
render();
