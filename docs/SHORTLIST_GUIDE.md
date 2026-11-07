# Shortlist guide: from Discussions votes to the 17 quizzes

This guide explains, step by step, how the most-upvoted questions in **Discussions → Question bank** become the shortlist that ships in the quizzes.
It is public on purpose. **If you think any rule here is unfair or unclear, open an [issue](../../../issues) or a pull request that edits this file.** Changes to the rules are discussed in the open and merged like any other change.

## The short version

1. Every question is a Discussion in the `question-bank` category.
2. The 400-odd questions from the first release carry the label **`initial version`**. Anyone can add new ones with the form.
3. 👍 upvote the questions you want in the quiz.
4. Questions are ranked by upvotes. Each quiz shows its top 24.
5. A weekly workflow turns the ranking into a pull request that anyone can review before it is merged.

## 1. Find the questions

- Go to **Discussions** and choose the **Question bank** category.
- Filter by label (the 🏷 *Labels* button next to the search box):
  - `initial version`: the seed questions from the first release.
  - `topic: <key>`: one label per topic (for example `topic: june4`). Combine it with `initial version` to review one topic at a time.
- Sort by **Top** to see the most upvoted first (*Top* → choose a time range, *All time* for the full ranking).
- Search works too, for example `label:"initial version" is:open`.

## 2. Read and vote

- Each post shows question, options (the first answer listed is the correct one), explanation and source, in 繁體中文 and English.
- A question is a good one when it is **factual, checkable (has a source), clearly worded, and respectful** (no slurs, no targeting of private individuals).
- Vote with 👍 on the **Discussion itself** (the upvote arrow on the post), not on a comment.
- Spotted a mistake? Comment on the Discussion with a source. Wrong questions can be fixed in the CSV by pull request.

## 3. Rank (what counts as the shortlist)

The ranking rules are implemented in code, so what is described here is what actually runs:

| Rule | Where |
|---|---|
| Rank = upvote count of the Discussion (`upvoteCount`) | `scripts/export-discussions.ts` |
| Each quiz shows its **top 24** rows by `votes` | `src/data/parse.ts`, `src/discussions.ts` |
| **Ties** keep the order of `src/data/questions.csv` for seed questions; for community questions the Discussion URL order breaks ties, so the result is deterministic | `topPerQuiz` |
| Questions outside the top 24 stay in the bank ("bank only") and can move up later | `src/data/questions.csv` |
| Incomplete or invalid posts (missing a field, duplicate options, unknown topic) are skipped and listed in the workflow log so the author can fix them | `parseDiscussion` |
| Minimum votes to be exported: `--min-votes` (default 1) | `export:questions` |

Seed questions: the vote count of their Discussion is written into the `votes` column of their own CSV row (they are matched by the hidden `life-in-hk-seed` marker at the end of the post), so they are never duplicated.

### Spam and vote manipulation

- Only GitHub accounts can vote; one account gives one upvote per Discussion.
- Maintainers may discount votes from obviously fake or newly created accounts. Any such adjustment must be posted publicly (a comment on the weekly PR) with the reason.
- Posts that are spam, abusive or inaccurate may be locked or removed by maintainers; say so in the PR. Removal is for rule-breaking, never for being unpopular.
- Because votes are public on GitHub, anyone can audit a suspicious spike and raise it in an issue.

## 4. Turn the shortlist into the CSV and quizzes

You do not need to do this by hand, but you can reproduce it:

```bash
npm ci
GITHUB_TOKEN=<token with discussions:read> npm run export:questions -- --dry-run   # preview
GITHUB_TOKEN=<token> npm run export:questions                                      # write src/data/questions.csv
npm run check:questions   # 17 quizzes × 24 questions, 4 distinct options per language
npm test
```

- Seed rows keep their content; their `votes` are updated from their Discussion.
- Community rows (with a `source` URL) are rewritten on every export.
- The **Export question bank** workflow (`.github/workflows/export-questions.yml`) does this every Monday and opens a pull request. Review the diff there: that is the transparent shortlist. Comment on it if you disagree.
- Merging the PR to `main` redeploys the site, and the 17 quizzes show the new top 24.

### How a question is assigned to a quiz

The form asks for a **quiz number (1–17)** and a **topic**. These are independent: quizzes deliberately mix topics. If a quiz is full, only the 24 highest-voted questions for that quiz appear.
Seed questions without a quiz (`none (bank only…)`) can be assigned to a quiz by a pull request that edits the `quiz` column of the CSV.

## 5. Seeding the initial version (maintainers)

`npm run seed:discussions` (or the **Seed question bank into Discussions** workflow) posts every CSV row as a Discussion with the `initial version` and `topic: …` labels. It skips questions already posted, so it is safe to re-run, and it waits between posts to stay under GitHub's rate limits (about 45 minutes for the whole bank). The `question-bank` category must exist first.

## Suggest a change to this guide

- Open an **issue** describing what is unclear or unfair, or
- Open a **pull request** editing `docs/SHORTLIST_GUIDE.md` (or the scripts it describes).

Everyone is welcome, and rule changes are decided in public.
