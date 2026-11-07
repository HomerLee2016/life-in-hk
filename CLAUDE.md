# Response format

- Start every answer with a 1–2 sentence summary that directly answers the question.
- Put details, steps, and explanations after it.

# Project

- Static Vite + TypeScript quiz app (no backend), deployed to GitHub Pages.
- 17 tests × 24 questions, bilingual (繁體中文 / English), dark/light, pass mark 18/24.
- Questions: `src/data/tests/tNN.ts` (seed) + `src/data/community.json` (exported from Discussions).
- Tone: cheeky cultural quiz; facts must be defensible; no slurs or attacks on individuals.

# Unit tests

- After any change run `npm test` and `npx tsc --noEmit` before reporting done.
- UI changes: also run `npm run build && npm run e2e` (Playwright: light/dark × desktop/mobile).
- Question data is validated by tests (24 per test, 4 distinct options, both languages).

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

- Community questions come from GitHub Discussions (category `question-bank`, form in `.github/DISCUSSION_TEMPLATE/`).
- `npm run export:questions` ranks by upvotes (top 24 per test, ≤ 408) into `community.json`; the weekly workflow opens a PR.
- Don't edit field labels in the form: `src/bank.ts` parses them.

# Code structure

- If understanding or changing something means digging through many layers of files, treat it as a sign the code needs refactoring.
- Point it out and suggest a refactor (e.g. a `refactor/` branch) rather than adding another layer on top.

# Writing this file

- Keep CLAUDE.md short, simple, and concise.
- Use point form; no long paragraphs.
