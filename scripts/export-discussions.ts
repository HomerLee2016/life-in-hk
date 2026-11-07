/**
 * Export top-voted question proposals from GitHub Discussions into src/data/community.json.
 *
 *   GITHUB_TOKEN=... npm run export:questions            # uses GITHUB_REPOSITORY or HomerLee2016/life-in-hk
 *   npm run export:questions -- --category question-bank --limit 408 --min-votes 1 --dry-run
 *
 * Discussions must use the "Question bank" category form (.github/DISCUSSION_TEMPLATE/question-bank.yml).
 * Invalid / incomplete posts are skipped and listed so authors can fix them.
 */
import { writeFileSync } from 'node:fs';
import { parseDiscussion, rankQuestions, type CommunityQuestion } from '../src/bank';

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const repoFull = process.env.GITHUB_REPOSITORY ?? 'HomerLee2016/life-in-hk';
const [owner, name] = repoFull.split('/');
const categorySlug = opt('category', 'question-bank');
const limit = Number(opt('limit', '408'));
const minVotes = Number(opt('min-votes', '1'));
const dryRun = args.includes('--dry-run');
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required (needs discussions:read)');

const query = `query($owner:String!,$name:String!,$after:String){
  repository(owner:$owner,name:$name){
    discussions(first:100, after:$after, orderBy:{field:CREATED_AT,direction:DESC}){
      pageInfo{hasNextPage endCursor}
      nodes{ url body upvoteCount category{slug} }
    }
  }
}`;

interface Node { url: string; body: string; upvoteCount: number; category: { slug: string } }

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
    const d = json.data.repository.discussions;
    all.push(...d.nodes);
    if (!d.pageInfo.hasNextPage) return all;
    after = d.pageInfo.endCursor;
  }
}

const nodes = (await fetchAll()).filter((n) => n.category.slug === categorySlug);
const valid: CommunityQuestion[] = [];
const skipped: string[] = [];
for (const n of nodes) {
  const q = parseDiscussion(n.body, n.upvoteCount, n.url);
  if (!q) skipped.push(n.url);
  else if (q.votes >= minVotes) valid.push(q);
}
const top = rankQuestions(valid, limit);
console.log(`${nodes.length} discussions, ${valid.length} valid with >=${minVotes} votes, ${top.length} exported.`);
if (skipped.length) console.log(`Skipped (incomplete/invalid):\n${skipped.map((u) => ` - ${u}`).join('\n')}`);
if (!dryRun) {
  writeFileSync(new URL('../src/data/community.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), questions: top }, null, 2) + '\n');
  console.log('Wrote src/data/community.json');
}
