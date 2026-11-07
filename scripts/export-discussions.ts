/**
 * Export top-voted question proposals from GitHub Discussions into src/data/questions.csv
 * (community rows are those with a `source` URL; they are replaced on every run, seed rows are untouched).
 *
 *   GITHUB_TOKEN=... npm run export:questions            # uses GITHUB_REPOSITORY or HomerLee2016/life-in-hk
 *   npm run export:questions -- --category question-bank --min-votes 1 --dry-run
 *
 * Discussions must use the "Question bank" category form (.github/DISCUSSION_TEMPLATE/question-bank.yml).
 * Invalid / incomplete posts are skipped and listed so authors can fix them.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { mergeCommunityIntoCsv } from '../src/data/merge';
import { parseDiscussion, seedIdOf, topPerQuiz } from '../src/discussions';
import type { QuestionRow } from '../src/types';

const args = process.argv.slice(2);
const fail = (msg: string): never => { console.error(msg); process.exit(1); };
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? fail(`--${name} needs a value`) : v;
};
const intOpt = (name: string, dflt: number) => {
  const v = Number(opt(name, String(dflt)));
  return Number.isInteger(v) && v >= 0 ? v : fail(`--${name} must be a non-negative integer`);
};
const repoFull = process.env.GITHUB_REPOSITORY ?? 'HomerLee2016/life-in-hk';
const [owner, name] = repoFull.split('/');
if (!owner || !name) fail(`Invalid GITHUB_REPOSITORY: ${repoFull}`);
const categorySlug = opt('category', 'question-bank');
const minVotes = intOpt('min-votes', 1);
const dryRun = args.includes('--dry-run');
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required (needs discussions:read)');

const query = `query($owner:String!,$name:String!,$after:String){
  repository(owner:$owner,name:$name){
    discussions(first:100, after:$after, orderBy:{field:CREATED_AT,direction:DESC}){
      pageInfo{hasNextPage endCursor}
      nodes{ number url body upvoteCount category{slug} }
    }
  }
}`;

interface Node { number: number; url: string; body: string; upvoteCount: number; category: { slug: string } }

async function fetchAll(): Promise<Node[]> {
  const all: Node[] = [];
  let after: string | null = null;
  for (;;) {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { owner, name, after } }),
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { errors?: unknown; data: { repository: { discussions: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: Node[] } } } };
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    if (!json.data?.repository) throw new Error(`Repository ${owner}/${name} not found or token lacks access`);
    const d = json.data.repository.discussions;
    all.push(...d.nodes);
    if (!d.pageInfo.hasNextPage) return all;
    after = d.pageInfo.endCursor;
  }
}

const nodes = (await fetchAll()).filter((n) => n.category.slug === categorySlug);
const valid: QuestionRow[] = [];
const skipped: string[] = [];
const seedVotes = new Map<string, number>(); // seeded discussions (initial version) carry votes for their CSV row
for (const n of nodes) {
  const seedId = seedIdOf(n.body);
  if (seedId) { seedVotes.set(seedId, n.upvoteCount); continue; }
  const q = parseDiscussion(n.body, n.upvoteCount, n.url, `d${n.number}`);
  if (!q) skipped.push(n.url);
  else if (q.votes >= minVotes) valid.push(q);
}
const top = topPerQuiz(valid); // top 24 per quiz
console.log(`${seedVotes.size} seeded discussions (votes applied to seed rows).`);
console.log(`${nodes.length} discussions, ${valid.length} valid with >=${minVotes} votes, ${top.length} ${dryRun ? 'would be ' : ''}exported.`);
if (skipped.length) console.log(`Skipped (incomplete/invalid):\n${skipped.map((u) => ` - ${u}`).join('\n')}`);
if (!dryRun) {
  const csvUrl = new URL('../src/data/questions.csv', import.meta.url);
  const { csv, seed } = mergeCommunityIntoCsv(readFileSync(csvUrl, 'utf8'), top, seedVotes);
  writeFileSync(csvUrl, csv);
  console.log(`Wrote src/data/questions.csv (${seed} seed + ${top.length} community rows)`);
}
