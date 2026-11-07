# Life in HK Quiz 香港人生活測驗

A cheeky, static quiz: **17 tests × 24 questions** on Hong Kong history (1841 → 2019 and after), civic values and manners, culture, media, sport, festivals and everyday life. Score **18/24** to pass. UI and questions are bilingual (繁體中文 / English), with light/dark mode (follows your system, remembers your choice).

## Develop

```bash
npm install
npm run dev          # local dev server
npm test             # unit tests (vitest)
npm run build        # typecheck + production build into dist/
npm run e2e          # Playwright: desktop/mobile × light/dark
```

Set `CHROMIUM_PATH` to use an existing Chromium for Playwright.

## Deploy to GitHub Pages

The build uses a relative base (`./`) and hash routing, so it works on any Pages URL.
In **Settings → Pages**, set *Source* to **GitHub Actions**. Pushes to `main` run tests, e2e and deploy (`.github/workflows/pages.yml`).

## Question bank (community)

Seed questions live in `src/data/tests/`. Anyone can propose more in **Discussions → Question bank** (form in `.github/DISCUSSION_TEMPLATE/question-bank.yml`); 👍 upvotes rank them.
`npm run export:questions` (needs `GITHUB_TOKEN`) writes the top ~408 voted into `src/data/community.json`; top-voted questions for each test replace seed questions, always keeping 24 per test. The *Export question bank* workflow runs weekly and opens a PR.
Create the `question-bank` Discussions category (with *Open-ended discussion* format) in repo settings first.

This quiz is a cultural game based on documented history and civic values. Be respectful: no harassment of individuals.
