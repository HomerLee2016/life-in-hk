import './styles.css';
import { tests } from './data';
import { tr } from './i18n';
import {
  PASS_MARK, QUESTIONS_PER_TEST, answer, detectLang, detectTheme, hasPassed,
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

type Route = { page: 'tests' } | { page: 'contact' } | { page: 'quiz'; id: number };
function route(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const m = /^tests\/(\d+)$/.exec(h);
  if (m && tests.some((x) => x.id === Number(m[1]))) return { page: 'quiz', id: Number(m[1]) };
  return h === 'contact' ? { page: 'contact' } : { page: 'tests' };
}

function header(active: 'tests' | 'contact'): string {
  const nextTheme = theme === 'dark' ? tr('themeToLight', lang) : tr('themeToDark', lang);
  return `
  <header class="top">
    <div class="brand"><span class="logo" aria-hidden="true">🏮</span>
      <div><h1>${esc(tr('appTitle', lang))}</h1><p class="tag">${esc(tr('tagline', lang))}</p></div></div>
    <div class="tools">
      <button id="lang" class="chip" aria-label="${esc(tr('langAria', lang))}">${esc(tr('langBtn', lang))}</button>
      <button id="theme" class="chip" aria-label="${esc(nextTheme)}" title="${esc(nextTheme)}">${theme === 'dark' ? '☀️' : '🌙'}</button>
    </div>
  </header>
  <nav class="tabs" role="tablist">
    <a role="tab" id="tab-tests" href="#/tests" aria-selected="${active === 'tests'}">${esc(tr('tabTests', lang))}</a>
    <a role="tab" id="tab-contact" href="#/contact" aria-selected="${active === 'contact'}">${esc(tr('tabContact', lang))}</a>
    <a class="tab-extra" id="link-discussions" href="${DISCUSSIONS}" target="_blank" rel="noopener">${esc(tr('contribute', lang))} ↗</a>
  </nav>`;
}

function testsPage(): string {
  const cards = tests.map((x) => {
    const b = bests[x.id];
    const badge = b === undefined
      ? `<span class="badge">${esc(tr('notTried', lang))}</span>`
      : `<span class="badge ${b >= PASS_MARK ? 'ok' : 'no'}">${esc(tr('best', lang))} ${b}/${QUESTIONS_PER_TEST}${b >= PASS_MARK ? ' ✓' : ''}</span>`;
    return `<a class="card" href="#/tests/${x.id}" data-test="${x.id}">
      <span class="num">${x.id}</span>
      <h3>${esc(x.title[lang === 'zh' ? 0 : 1])}</h3>
      <p>${esc(x.blurb[lang === 'zh' ? 0 : 1])}</p>
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

function optionLabel(s: Session, q: number, src: number): string {
  return t(s.test.questions[q].options[src], lang);
}

function quizPage(test: QuizTest): string {
  const s = session!;
  const back = `<a class="back" href="#/tests">${esc(tr('back', lang))}</a>`;
  const title = `<h2 class="qt">${test.id}. ${esc(test.title[lang === 'zh' ? 0 : 1])}</h2>`;
  if (showResult) return back + title + resultView(s);

  const qi = s.current;
  const q = test.questions[qi];
  const picked = s.picked[qi];
  const done = picked !== null;
  const opts = s.order[qi].map((src, pos) => {
    let cls = 'opt';
    if (done) cls += src === 0 ? ' right' : src === picked ? ' bad' : ' dim';
    return `<button class="${cls}" data-opt="${src}" ${done ? 'disabled' : ''}>
      <span class="key">${'ABCD'[pos]}</span><span>${esc(optionLabel(s, qi, src))}</span></button>`;
  }).join('');
  const feedback = done ? `<div class="feedback ${picked === 0 ? 'ok' : 'no'}" role="status">
      <strong>${esc(tr(picked === 0 ? 'correct' : 'wrong', lang))}</strong>
      ${picked === 0 ? '' : `<div>${esc(tr('rightAnswerWas', lang))}${esc(optionLabel(s, qi, 0))}</div>`}
      <p>${esc(t(q.explanation, lang))}</p>
      <button id="next" class="btn">${esc(tr(qi === test.questions.length - 1 ? 'seeResult' : 'next', lang))}</button></div>` : '';
  const pct = (qi / test.questions.length) * 100;
  return `${back}${title}
    <div class="progress" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <p class="qn">${esc(tr('qOf', lang, { n: qi + 1, total: test.questions.length }))}</p>
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
    body = r.page === 'contact' ? contactPage() : testsPage();
  }
  app.innerHTML = header(r.page === 'contact' ? 'contact' : 'tests') + `<main>${body}</main>`;
  wire();
}

function wire() {
  document.getElementById('lang')!.onclick = () => {
    lang = lang === 'zh' ? 'en' : 'zh'; put('lih.lang', lang); render();
  };
  document.getElementById('theme')!.onclick = () => {
    theme = theme === 'dark' ? 'light' : 'dark'; put('lih.theme', theme); render();
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
  const retry = document.getElementById('retry');
  if (retry) retry.onclick = () => {
    if (!session) return;
    session = startSession(session.test); showResult = false; render(); window.scrollTo({ top: 0 });
  };
}

window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0 }); });
render();
