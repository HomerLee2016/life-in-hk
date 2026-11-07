import { parseCsvObjects, toCsv } from '../csv';
import type { QuestionRow } from '../types';
import { CSV_COLUMNS } from './parse';

const toCells = (r: QuestionRow): string[] => [
  r.id, r.quiz === null ? '' : String(r.quiz), r.topic, String(r.votes), r.source, r.question[0], r.question[1],
  r.correct[0], r.correct[1], r.wrong[0][0], r.wrong[0][1], r.wrong[1][0], r.wrong[1][1], r.wrong[2][0], r.wrong[2][1],
  r.explanation[0], r.explanation[1],
];

/** Replace all community rows (those with a `source`) in the CSV text with `community`. Seed rows keep their content; `seedVotes` (id -> upvotes of the seeded Discussion) updates their `votes`. */
export function mergeCommunityIntoCsv(
  csvText: string,
  community: readonly QuestionRow[],
  seedVotes: ReadonlyMap<string, number> = new Map(),
): { csv: string; seed: number } {
  const seed = parseCsvObjects(csvText).filter((r) => !r.source).map((r) => (seedVotes.has(r.id) ? { ...r, votes: String(seedVotes.get(r.id)) } : r));
  const rows = [[...CSV_COLUMNS], ...seed.map((r) => CSV_COLUMNS.map((c) => r[c] ?? '')), ...community.map(toCells)];
  return { csv: toCsv(rows), seed: seed.length };
}
