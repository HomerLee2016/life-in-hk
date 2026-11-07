/**
 * Post every row of src/data/questions.csv as a Discussion (category `question-bank`) labelled "initial version",
 * so everyone can upvote. Safe to re-run: rows whose id marker already exists in a Discussion are skipped.
 *
 *   GITHUB_TOKEN=... npm run seed:discussions -- --dry-run          # preview, writes nothing
 *   GITHUB_TOKEN=... npm run seed:discussions -- --limit 5          # try a few first
 *   GITHUB_TOKEN=... npm run seed:discussions                       # everything
 *
 * Options: --category <slug> (default question-bank), --delay <seconds> between posts (default 6),
 *          --limit <n> max new discussions this run, --dry-run.
 * Token needs: discussions write + issues/labels write (workflow permissions or a PAT with repo scope).
 * GitHub caps content creation (~500/hour, 80/min), so the script paces itself and honours Retry-After;
 * 450 questions take ~45 min at the default delay. Interrupted? Just run it again.
 * The Discussions category must exist first (categories can't be created through the API).
 */
import { readFileSync } from 'node:fs';
import { INITIAL_LABEL, seedBody, seedIdOf, seedTitle } from '../src/discussions';
import { parseQuestionRows } from '../src/data/parse';
import { topicName } from '../src/topics';

const args = process.argv.slice(2);
const fail = (msg: string): never => { console.error(msg); process.exit(1); };
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? fail(`--${name} needs a value`) : v;
};
const num = (name: string, dflt: number) => {
  const v = Number(opt(name, String(dflt)));
  return v >= 0 ? v : fail(`--${name} must be a non-negative number`);
};
const [owner, name] = (process.env.GITHUB_REPOSITORY ?? 'HomerLee2016/life-in-hk').split('/');
const categorySlug = opt('category', 'question-bank');
const delayMs = num('delay', 6) * 1000;
const limit = num('limit', Infinity);
const dryRun = args.includes('--dry-run');
const token = process.env.GITHUB_TOKEN;
if (!token) fail('GITHUB_TOKEN is required');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' };

/** fetch with backoff on rate limits (403/429) and 5xx. */
async function call(url: string, init: RequestInit, tries = 6): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { ...init, headers });
    const limited = res.status === 429 || res.status >= 500 || (res.status === 403 && /rate|abuse|secondary/i.test(await res.clone().text()));
    if (!limited || attempt >= tries) return res;
    const wait = Math.max(Number(res.headers.get('retry-after') ?? 0) * 1000, 2 ** attempt * 5000, 60_000 * (res.status === 403 ? 1 : 0));
    console.warn(`  rate limited / server error (${res.status}); waiting ${Math.round(wait / 1000)}s (attempt ${attempt}/${tries})`);
    await sleep(wait);
  }
}
async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await call('https://api.github.com/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data as T;
}

interface RepoInfo { repository: { id: string; discussionCategories: { nodes: { id: string; slug: string }[] }; labels: { nodes: { id: string; name: string }[] } } }
const info = await gql<RepoInfo>(
  `query($o:String!,$n:String!){repository(owner:$o,name:$n){id discussionCategories(first:50){nodes{id slug}} labels(first:100){nodes{id name}}}}`,
  { o: owner, n: name },
);
const repo = info.repository;
const category = repo.discussionCategories.nodes.find((c) => c.slug === categorySlug);
if (!category) fail(`Discussions category "${categorySlug}" not found. Create it first: Settings → Features → Discussions (then Discussions → ✏️ next to Categories → New category, format "Open-ended discussion").`);

// ---- labels ----
const LABEL_COLORS: Record<string, string> = { [INITIAL_LABEL]: '1d76db' };
const labelIds = new Map(repo.labels.nodes.map((l) => [l.name.toLowerCase(), l.id]));
async function ensureLabel(label: string, color = 'ededed', description = ''): Promise<string | undefined> {
  const hit = labelIds.get(label.toLowerCase());
  if (hit) return hit;
  if (dryRun) { console.log(`[dry-run] would create label "${label}"`); return undefined; }
  const res = await call(`https://api.github.com/repos/${owner}/${name}/labels`, { method: 'POST', body: JSON.stringify({ name: label, color, description }) });
  if (!res.ok && res.status !== 422) throw new Error(`create label "${label}" failed: ${res.status} ${await res.text()}`);
  const got = await call(`https://api.github.com/repos/${owner}/${name}/labels/${encodeURIComponent(label)}`, { method: 'GET' });
  const id = ((await got.json()) as { node_id: string }).node_id;
  labelIds.set(label.toLowerCase(), id);
  console.log(`created label "${label}"`);
  return id;
}
await ensureLabel(INITIAL_LABEL, LABEL_COLORS[INITIAL_LABEL], 'Seed question from the initial question bank (questions.csv)');

// ---- existing seeded discussions (idempotency) ----
const seeded = new Set<string>();
for (let after: string | null = null; ;) {
  const d: { repository: { discussions: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: { body: string; category: { slug: string } }[] } } } = await gql(
    `query($o:String!,$n:String!,$a:String){repository(owner:$o,name:$n){discussions(first:100,after:$a){pageInfo{hasNextPage endCursor} nodes{body category{slug}}}}}`,
    { o: owner, n: name, a: after },
  );
  for (const x of d.repository.discussions.nodes) { const id = seedIdOf(x.body); if (id) seeded.add(id); }
  if (!d.repository.discussions.pageInfo.hasNextPage) break;
  after = d.repository.discussions.pageInfo.endCursor;
}

const rows = parseQuestionRows(readFileSync(new URL('../src/data/questions.csv', import.meta.url), 'utf8')).filter((r) => !r.source);
const todo = rows.filter((r) => !seeded.has(r.id));
console.log(`${rows.length} questions in CSV, ${seeded.size} already posted, ${todo.length} to post${Number.isFinite(limit) ? ` (limit ${limit})` : ''}.`);

let done = 0;
for (const r of todo) {
  if (done >= limit) break;
  const title = seedTitle(r);
  if (dryRun) { console.log(`[dry-run] ${title}  labels: ${INITIAL_LABEL}, topic: ${r.topic}`); done++; continue; }
  const created = await gql<{ createDiscussion: { discussion: { id: string; url: string } } }>(
    `mutation($r:ID!,$c:ID!,$t:String!,$b:String!){createDiscussion(input:{repositoryId:$r,categoryId:$c,title:$t,body:$b}){discussion{id url}}}`,
    { r: repo.id, c: category!.id, t: title, b: seedBody(r) },
  );
  const topicLabel = await ensureLabel(`topic: ${r.topic}`, 'c5def5', topicName(r.topic, 'en'));
  const ids = [labelIds.get(INITIAL_LABEL.toLowerCase()), topicLabel].filter((x): x is string => !!x);
  await gql(`mutation($l:ID!,$ids:[ID!]!){addLabelsToLabelable(input:{labelableId:$l,labelIds:$ids}){clientMutationId}}`, { l: created.createDiscussion.discussion.id, ids });
  done++;
  console.log(`${done}/${Math.min(todo.length, limit)} ${r.id} → ${created.createDiscussion.discussion.url}`);
  await sleep(delayMs);
}
console.log(`${dryRun ? 'Would post' : 'Posted'} ${done} discussions.`);
