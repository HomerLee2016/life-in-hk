# Response format

- Start every answer with a 1–2 sentence summary that directly answers the question.
- Put details, steps, and explanations after it.

# Project

- Static Vite + TypeScript quiz app (no backend), deployed to GitHub Pages.
- 17 quizzes × 24 questions, bilingual (繁體中文 / English), dark/light, pass mark 18/24.
- `src/data/questions.csv` is the single source of truth for all questions (one row each).
- Quizzes mix topics: columns `quiz` (1–17) and `topic` (key in `src/topics.ts`) are independent.
- Tone: cheeky and unapologetically Hongkonger — a remembrance quiz, not politically neutral. Facts must stay accurate; no slurs or harassment of private individuals.

# Unit tests

- After any change run `npm run check:questions`, `npm test` and `npx tsc --noEmit` before reporting done.
- `npm run check:questions` (CI) fails unless 17 quizzes each show exactly 24 questions with 4 distinct options per language.
- UI changes: also run `npm run build && npm run e2e` (Playwright: light/dark × desktop/mobile).
- Edit questions only in the CSV (UTF-8, quoted cells); never hard-code questions in TS.

# Working on a big story or epic

1. Create a feature branch (see "Branch naming").
2. Make at least one commit per sub-issue.
3. Test the work and check the code.
4. QA carefully and fix the bugs found.
5. Create a PR for the user to review.

# Merge conflicts

- Before pushing or QA-ing a PR: `git fetch origin main`, then `git merge-tree --write-tree origin/main HEAD`.
- If it conflicts (or is behind main): `git rebase origin/main`, resolve, `git push --force-with-lease`.
- Re-run the tests after the rebase.

# Branch naming

- Use a type prefix: `feature/`, `bug/`, `refactor/`.
- Then the issue number (if any) and a short kebab-case description, e.g. `feature/12-add-sports-quiz`.
- Never use auto-generated names like `claude/modest-fayman-ahuz4`.

# Question bank

- CSV columns: id, quiz, topic, votes, source, q_/correct_/wrong1-3_/explanation_ in `_zh` and `_en`.
- Seed rows have empty `source`; community rows (from Discussions) have a `source` URL and are rewritten on export.
- A quiz shows its top 24 rows by `votes` (ties: CSV order); extra rows stay as "bank only".
- Community questions: Discussions category `question-bank` (form in `.github/DISCUSSION_TEMPLATE/`).
- `npm run export:questions` writes top 24 per quiz into the CSV; weekly workflow opens a PR.
- Don't edit form field labels: `src/discussions.ts` parses them.

# Code structure

- If understanding or changing something means digging through many layers of files, treat it as a sign the code needs refactoring.
- Point it out and suggest a refactor (e.g. a `refactor/` branch) rather than adding another layer on top.

# Writing this file

- Keep CLAUDE.md short, simple, and concise.
- Use point form; no long paragraphs.
