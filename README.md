# Life in HK Quiz 香港人生活測驗

A cheeky, static quiz: **17 quizzes × 24 questions** (408 shown, topics mixed across quizzes; a few more sit in the bank) on Hong Kong history (1841 → 2019 and after), civic values and manners, culture, media, sport, festivals and everyday life. Score **18/24** to pass. UI and questions are bilingual (繁體中文 / English), with light/dark mode (follows your system, remembers your choice).

## Develop

```bash
npm install
npm run dev          # local dev server
npm run check:questions  # validate src/data/questions.csv (17 quizzes × 24, options, duplicates)
npm test             # unit tests (vitest)
npm run build        # typecheck + production build into dist/
npm run e2e          # Playwright: desktop/mobile × light/dark
```

Set `CHROMIUM_PATH` to use an existing Chromium for Playwright.

## Deploy to GitHub Pages

The build uses a relative base (`./`) and hash routing, so it works on any Pages URL.
In **Settings → Pages**, set *Source* to **GitHub Actions**. Pushes to `main` run tests, e2e and deploy (`.github/workflows/pages.yml`).

## Question bank

All questions live in one table: [`src/data/questions.csv`](src/data/questions.csv) (open it in Excel/Sheets or browse the **All questions** tab in the app).
Columns: `id, quiz, topic, votes, source` + Chinese/English `q, correct, wrong1–3, explanation`. `quiz` (1–17) and `topic` are independent, so quizzes mix topics. A quiz shows its top 24 rows by `votes`; extra rows remain in the bank.
CI runs `npm run check:questions`: it fails unless every one of the 17 quizzes has exactly 24 questions, each with 4 distinct options in both languages, valid topics and no duplicate ids/questions.

Community questions: propose in **Discussions → Question bank** (form in `.github/DISCUSSION_TEMPLATE/question-bank.yml`) and 👍 upvote.
`npm run export:questions` (needs `GITHUB_TOKEN`) writes the top 24 voted per quiz into the CSV (rows with a `source` URL); the *Export question bank* workflow runs weekly and opens a PR.
Create a Discussions category with slug `question-bank` first.

This quiz is a cultural game based on documented history and civic values. Be respectful: no harassment of individuals.
