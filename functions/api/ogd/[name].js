import { DATASETS, PAGE } from './_datasets.js';
// GET /api/ogd/<name>          -> {name, fetched, pages, note} (and triggers a refresh if stale and the request is served in India)
// GET /api/ogd/<name>?page=N   -> raw data.gov.in JSON for page N, as last stored
// GET /api/ogd/refresh         -> refresh the stalest dataset (no-op outside India); called by a beacon on the site
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...h } });
// The project's Functions placement is pinned to AWS ap-south-1 (Mumbai), so these fetches leave Cloudflare from India.
// Until DATA_GOV_IN_KEY is set we use data.gov.in's public demo key, which returns at most 10 rows (enough to test).
const DEMO = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

async function refresh(env, name) {
  const d = DATASETS[name];
  const key = env.DATA_GOV_IN_KEY || DEMO, demo = !env.DATA_GOV_IN_KEY;
  const lockKey = `lock:${name}`;
  if (await env.OGD.get(lockKey)) return { name, skipped: 'locked' };
  await env.OGD.put(lockKey, '1', { expirationTtl: 120 });
  let n = 0, total = null;
  for (let i = 0; i < (demo ? 1 : d.pages); i++) {
    const q = new URLSearchParams({ 'api-key': key, format: 'json', limit: String(demo ? 10 : PAGE), offset: String(i * PAGE), ...(d.q || {}) });
    const r = await fetch(`https://api.data.gov.in/resource/${d.rid}?${q}`);
    if (!r.ok) { await env.OGD.delete(lockKey); return { name, error: `HTTP ${r.status} on page ${i}`, colo: globalThis.__colo }; }
    const txt = await r.text();
    const m = txt.match(/"total"\s*:\s*"?(\d+)/); if (m) total = +m[1];
    const cnt = txt.match(/"count"\s*:\s*"?(\d+)/);
    await env.OGD.put(`${name}:${i}`, txt);
    n = i + 1;
    if (!cnt || +cnt[1] < PAGE || (total !== null && (i + 1) * PAGE >= total)) break;
  }
  const meta = { name, rid: d.rid, note: d.note, fetched: new Date().toISOString(), pages: n, total, demo };
  await env.OGD.put(`meta:${name}`, JSON.stringify(meta));
  await env.OGD.delete(lockKey);
  return meta;
}

const stale = (meta, d, env) => (meta && meta.demo && !!env.DATA_GOV_IN_KEY) || !meta || (Date.now() - Date.parse(meta.fetched)) > d.ttlH * 3600e3;

export async function onRequestGet({ request, env, params, waitUntil }) {
  if (!env.OGD) return json({ error: 'KV binding OGD missing' }, 503);
  const name = params.name;
  globalThis.__colo = request.cf && request.cf.colo;
  const canFetch = true;
  if (name === 'refresh') {
        const metas = await Promise.all(Object.keys(DATASETS).map(async k => [k, JSON.parse(await env.OGD.get(`meta:${k}`) || 'null')]));
    const force = new URL(request.url).searchParams.get('all') !== null;  // ?all: refresh the oldest even if fresh
    const due = metas.filter(([k, m]) => force || stale(m, DATASETS[k], env)).sort((a, b) => (a[1] ? Date.parse(a[1].fetched) : 0) - (b[1] ? Date.parse(b[1].fetched) : 0));
    if (!due.length) return json({ ok: true, due: 0 });
    const out = await refresh(env, due[0][0]);
    return json({ ok: true, due: due.length, did: out });
  }
  const d = DATASETS[name];
  if (!d) return json({ error: 'unknown dataset', known: Object.keys(DATASETS) }, 404);
  const page = new URL(request.url).searchParams.get('page');
  if (page !== null) {
    const txt = await env.OGD.get(`${name}:${+page}`);
    return txt ? new Response(txt, { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }) : json({ error: 'no such page' }, 404);
  }
  const meta = JSON.parse(await env.OGD.get(`meta:${name}`) || 'null');
  if (stale(meta, d, env) && canFetch) waitUntil(refresh(env, name));
  return json(meta || { name, fetched: null, note: d.note, waiting: 'first fetch happens on a request served from India' });
}
