// Temporary reachability test: can Cloudflare reach api.data.gov.in? Uses data.gov.in's public demo key only.
export async function onRequest({ request }) {
  const demo = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
  const t0 = Date.now();
  try {
    const r = await fetch(`https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${demo}&format=json&limit=1`);
    const txt = await r.text();
    return Response.json({ status: r.status, ms: Date.now() - t0, colo: request.cf && request.cf.colo, head: txt.slice(0, 160) });
  } catch (e) {
    return Response.json({ error: String(e), ms: Date.now() - t0, colo: request.cf && request.cf.colo });
  }
}
