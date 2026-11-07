import { expect, test, type Page } from '@playwright/test';

const shot = (page: Page, name: string, info: { project: { name: string } }) =>
  page.screenshot({ path: `screenshots/${info.project.name}-${name}.png`, fullPage: true });

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function bg(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test('theme follows system, can be toggled and persists', async ({ page }, info) => {
  await page.goto('./');
  const dark = info.project.name.includes('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', dark ? 'dark' : 'light');
  const before = await bg(page);
  await page.locator('#theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', dark ? 'light' : 'dark');
  expect(await bg(page)).not.toBe(before);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', dark ? 'light' : 'dark');
});

test('home has Tests and Contact tabs, 17 test cards, no horizontal scroll', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.locator('#tab-tests')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.card')).toHaveCount(17);
  await noHorizontalScroll(page);
  await shot(page, 'tests', info);
  await page.locator('#tab-contact').click();
  await expect(page.locator('#tab-contact')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('link', { name: /GitHub|issue|問題/i }).first()).toBeVisible();
  await noHorizontalScroll(page);
  await shot(page, 'contact', info);
});

test('language switch toggles Traditional Chinese and English and persists', async ({ page }) => {
  await page.goto('./');
  const lang = page.locator('#lang');
  const wasZh = (await page.locator('html').getAttribute('lang')) === 'zh-Hant';
  await lang.click();
  await expect(page.locator('html')).toHaveAttribute('lang', wasZh ? 'en' : 'zh-Hant');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', wasZh ? 'en' : 'zh-Hant');
  await expect(page.locator('#tab-tests')).toHaveText(wasZh ? 'Tests' : '測驗');
});

test('complete a test: answer all 24, see pass/fail result and review', async ({ page }, info) => {
  await page.goto('./#/tests/5');
  await expect(page.locator('#question')).toBeVisible();
  await noHorizontalScroll(page);
  // First question: wrong answer shows feedback with the right answer.
  const opts = page.locator('button.opt');
  await expect(opts).toHaveCount(4);
  await opts.first().click();
  await expect(page.locator('.feedback')).toBeVisible();
  await expect(page.locator('button.opt.right')).toHaveCount(1);
  await shot(page, 'quiz-feedback', info);
  await page.locator('#next').click();
  // Answer the rest, always choosing the first displayed option.
  for (let i = 2; i <= 24; i++) {
    await page.locator('button.opt').first().click();
    await page.locator('#next').click();
  }
  await expect(page.locator('#result')).toBeVisible();
  await noHorizontalScroll(page);
  await shot(page, 'result', info);
  await expect(page.locator('.rev').first()).toBeVisible();
  await page.locator('#retry').click();
  await expect(page.locator('#question')).toBeVisible();
});

test("a full run always renders a score between 0 and 24", async ({ page }) => {
  await page.goto('./#/tests/1');
  for (let i = 0; i < 24; i++) {
    await page.locator('button.opt').first().click();
    await page.locator('#next').click();
  }
  await expect(page.locator('.big b')).toBeVisible();
  const score = Number(await page.locator('.big b').innerText());
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(24);
});

test('best score is stored and shown on the list', async ({ page }) => {
  await page.goto('./#/tests/2');
  for (let i = 0; i < 24; i++) {
    await page.locator('button.opt').first().click();
    await page.locator('#next').click();
  }
  await page.locator('.back').click();
  await expect(page.locator('[data-test="2"] .badge')).toContainText(/\d+\/24|\d+\s*\/\s*24/);
});

test('unknown hash falls back to the tests list', async ({ page }) => {
  await page.goto('./#/tests/999');
  await expect(page.locator('.card')).toHaveCount(17);
});

test('Discussions link is visible in header, footer and Contact tab, opens in a new tab, in both languages', async ({ page }) => {
  await page.goto('./');
  const url = 'https://github.com/HomerLee2016/life-in-hk/discussions';
  for (const sel of ['#link-discussions', '#footer-discussions']) {
    await expect(page.locator(sel)).toBeVisible();
    await expect(page.locator(sel)).toHaveAttribute('href', url);
    await expect(page.locator(sel)).toHaveAttribute('target', '_blank');
  }
  await page.locator('#lang').click();
  const zh = (await page.locator('html').getAttribute('lang')) === 'zh-Hant';
  await expect(page.locator('#link-discussions')).toContainText(zh ? '新增題目' : 'Add or vote');
  await page.locator('#tab-contact').click();
  await expect(page.locator('#contact-discussions')).toHaveAttribute('href', url);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('best score is recorded as soon as the last question is answered', async ({ page }) => {
  await page.goto('./#/tests/3');
  for (let i = 0; i < 23; i++) {
    await page.locator('button.opt').first().click();
    await page.locator('#next').click();
  }
  await page.locator('button.opt').first().click();
  await page.goto('./#/tests');
  await expect(page.locator('[data-test="3"] .badge')).toContainText('/24');
});

test('corrupt saved scores do not break the app', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lih.bests', 'null'));
  await page.goto('./');
  await expect(page.locator('.card')).toHaveCount(17);
});

test('switching language or theme mid-quiz keeps progress, answers, option order and focus', async ({ page }) => {
  await page.goto('./#/tests/6');
  // Answer Q1 and go to Q2 so there is progress to lose.
  await page.locator('button.opt').first().click();
  await page.locator('#next').click();
  await expect(page.locator('.qn')).toContainText('2');
  const question = await page.locator('#question').innerText();
  const orderBefore = await page.locator('button.opt .key + span').allInnerTexts();
  const startLang = await page.locator('html').getAttribute('lang');

  await page.locator('#lang').click();
  await expect(page.locator('html')).not.toHaveAttribute('lang', startLang!);
  await expect(page.locator('.qn')).toContainText('2'); // still question 2
  expect(await page.locator('#question').innerText()).not.toBe(question); // text switched language
  await expect(page.locator('#lang')).toBeFocused();
  await expect(page.locator('button.opt')).toHaveCount(4);

  // Answer in the new language, then switch back: answer + feedback must persist.
  await page.locator('button.opt').nth(1).click();
  await expect(page.locator('.feedback')).toBeVisible();
  const bad = await page.locator('button.opt.bad').count();
  await page.locator('#lang').click();
  await expect(page.locator('.feedback')).toBeVisible();
  expect(await page.locator('button.opt.bad').count()).toBe(bad);
  await expect(page.locator('button.opt.right')).toHaveCount(1);
  expect(await page.locator('#question').innerText()).toBe(question);
  expect(await page.locator('button.opt .key + span').allInnerTexts()).toEqual(orderBefore);

  // Theme toggle mid-quiz too.
  await page.locator('#theme').click();
  await expect(page.locator('.feedback')).toBeVisible();
  await expect(page.locator('#theme')).toBeFocused();
});

test('switching language on the result screen keeps the result and review', async ({ page }) => {
  await page.goto('./#/tests/7');
  for (let i = 0; i < 24; i++) {
    await page.locator('button.opt').first().click();
    await page.locator('#next').click();
  }
  const score = await page.locator('.big b').innerText();
  const reviews = await page.locator('.rev').count();
  await page.locator('#lang').click();
  await expect(page.locator('.big b')).toHaveText(score);
  await expect(page.locator('.rev')).toHaveCount(reviews);
});
