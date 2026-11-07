/**
 * CI helper: validate src/data/questions.csv (the single source of truth).
 *   npm run check:questions
 * Fails (exit 1) unless there are 17 quizzes with exactly 24 active questions each,
 * every question has 4 distinct options in both languages, unique ids/questions, valid topics, etc.
 */
import { readFileSync } from 'node:fs';
import { parseQuestionRows } from '../src/data/parse';
import { summarize, validateRows } from '../src/validate';

const path = new URL('../src/data/questions.csv', import.meta.url);
let rows;
try {
  rows = parseQuestionRows(readFileSync(path, 'utf8'));
} catch (e) {
  console.error(`✗ Cannot parse questions.csv: ${(e as Error).message}`);
  process.exit(1);
}
const errors = validateRows(rows);
const s = summarize(rows);
console.log(`questions.csv: ${s.total} rows, ${s.active} in quizzes, ${s.bankOnly} bank-only`);
console.log(`per quiz: ${s.perQuiz.join(' ')}`);
console.log(`per topic: ${Object.entries(s.perTopic).map(([k, v]) => `${k}=${v}`).join(' ')}`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):\n${errors.map((e) => ` - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log('✓ question bank is valid');
