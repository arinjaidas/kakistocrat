// Fetches a fixed list of official Indian pages from Mumbai (this project's Functions placement), for sources that refuse non-Indian IPs.
// Only the whitelisted URLs below can be fetched; responses are cached in KV for 6 hours.
const SRC = {
  'npci-upi': 'https://www.npci.org.in/what-we-do/upi/product-statistics',
  'grid-psp': 'https://grid-india.in/en/reports/daily-psp-report',
  'grid-report': 'https://report.grid-india.in/',
  'mospi-cal': 'https://www.mospi.gov.in/advance-release-calendar',
};
export async function onRequestGet({ params, env, request }) {
  const u = SRC[params.name]; if (!u) return new Response(JSON.stringify({ error: 'unknown', known: Object.keys(SRC) }), { status: 404 });
  const k = `in:${params.name}`, fresh = new URL(request.url).searchParams.has('fresh');
  if (env.OGD && !fresh) { const c = await env.OGD.get(k); if (c) return new Response(c, { headers: { 'content-type': 'text/plain; charset=utf-8', 'x-cache': 'kv' } }); }
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', accept: 'text/html,application/json;q=0.9,*/*;q=0.8', 'accept-language': 'en-IN,en;q=0.9' } });
  const t = await r.text();
  if (r.ok && env.OGD) await env.OGD.put(k, t, { expirationTtl: 6 * 3600 });
  return new Response(t, { status: r.status, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-upstream-status': String(r.status) } });
}
