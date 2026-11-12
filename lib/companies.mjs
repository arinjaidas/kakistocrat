// Nifty 500 company pages and the companies hub. Prices, turnover and delivery share come from NSE bhavcopies
// (data/markets/nse500/YYYY-MM.json); names, industries and market caps from the NSE index list and PR file.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';

export const IND_INDEX = { 'Financial Services': 'nse-nifty-financial-services', 'Information Technology': 'nse-nifty-it', 'Healthcare': 'nse-nifty-healthcare-index', 'Automobile and Auto Components': 'nse-nifty-auto',
  'Fast Moving Consumer Goods': 'nse-nifty-fmcg', 'Metals & Mining': 'nse-nifty-metal', 'Oil Gas & Consumable Fuels': 'nse-nifty-oil-and-gas', 'Realty': 'nse-nifty-realty', 'Consumer Durables': 'nse-nifty-consumer-durables',
  'Media Entertainment & Publication': 'nse-nifty-media', 'Power': 'nse-nifty-energy', 'Capital Goods': 'nse-nifty-infrastructure', 'Construction': 'nse-nifty-infrastructure', 'Construction Materials': 'nse-nifty-infrastructure', 'Telecommunication': 'nse-nifty-infrastructure' };
export const csym = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-');

export function loadCompanies(dir = 'data/markets') {
  const metaP = join(dir, 'nse500_meta.json'), folder = join(dir, 'nse500');
  if (!existsSync(metaP) || !existsSync(folder)) return null;
  const meta = JSON.parse(readFileSync(metaP, 'utf8'));
  const days = {}; for (const f of readdirSync(folder).filter(f => /^\d{4}-\d{2}\.json$/.test(f)).sort()) Object.assign(days, JSON.parse(readFileSync(join(folder, f), 'utf8')));
  const dates = Object.keys(days).sort(); if (dates.length < 5) return null;
  const C = {};
  for (const [s, m] of Object.entries(meta.companies)) {
    const c = [], t = [], dp = [];
    for (const d of dates) { const r = days[d][s]; c.push(r ? r[0] : null); t.push(r ? r[1] : null); dp.push(r ? r[2] : null); }
    if (c.filter(x => x != null).length < 5) continue;
    // splits and bonus issues: a one-day move beyond −38%/+60% in a Nifty 500 stock is a corporate action, so earlier prices are scaled to match
    let prev = null, adj = 0; for (let i = 0; i < c.length; i++) { if (c[i] == null) continue; if (prev != null) { const r = c[i] / c[prev]; if (r < 0.62 || r > 1.6) { for (let j = 0; j < i; j++) if (c[j] != null) c[j] = +(c[j] * r).toFixed(2); adj++; } } prev = i; }
    C[s] = { s, ...m, slug: csym(s), c, t, dp, adj };
  }
  // returns and stats
  const lastI = dates.length - 1, idxAt = days => { const target = new Date(Date.parse(dates[lastI]) - days * 864e5).toISOString().slice(0, 10); let i = dates.findIndex(d => d >= target); return i < 0 ? 0 : i; };
  const ytdI = Math.max(0, dates.findIndex(d => d >= dates[lastI].slice(0, 4) + '-01-01') - 1);
  const W = { d1: lastI - 1, w1: idxAt(7), m1: idxAt(30), m3: idxAt(91), m6: idxAt(182), y1: idxAt(365), ytd: ytdI };
  for (const x of Object.values(C)) {
    const L = x.c.at(-1) ?? x.c.filter(v => v != null).at(-1), ret = i => { const b = x.c.slice(0, i + 1).filter(v => v != null).at(-1) ?? x.c.find(v => v != null); return L && b ? +((L / b - 1) * 100).toFixed(2) : null; };
    x.last = L; x.r = Object.fromEntries(Object.entries(W).map(([k, i]) => [k, ret(i)]));
    if (dates.length - 1 - W.y1 < 200) x.r.y1 = null; // not enough history yet
    const yr = x.c.slice(W.y1).filter(v => v != null); x.hi = Math.max(...yr); x.lo = Math.min(...yr);
    const t20 = x.t.slice(-20).filter(v => v != null), d20 = x.dp.slice(-20).filter(v => v != null);
    x.tov = t20.length ? +(t20.reduce((a, b) => a + b, 0) / t20.length).toFixed(1) : null; x.deliv = d20.length ? +(d20.reduce((a, b) => a + b, 0) / d20.length).toFixed(1) : null;
    // daily volatility, annualised
    const rr = []; for (let i = Math.max(1, x.c.length - 250); i < x.c.length; i++) if (x.c[i] && x.c[i - 1]) rr.push(Math.log(x.c[i] / x.c[i - 1]));
    const m = rr.reduce((a, b) => a + b, 0) / (rr.length || 1); x.vol = rr.length > 20 ? +(Math.sqrt(rr.reduce((a, b) => a + (b - m) ** 2, 0) / rr.length) * Math.sqrt(250) * 100).toFixed(1) : null;
  }
  return { date: dates[lastI], dates, C, windows: W, history: dates.length };
}

const pct = v => v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
const cls = v => v > 0 ? 'up' : v < 0 ? 'dn' : '';
const cr = v => v == null ? '—' : v >= 1e5 ? `₹${(v / 1e5).toFixed(2)} lakh cr` : `₹${Math.round(v).toLocaleString('en-IN')} cr`;
const inr = v => v == null ? '—' : '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: v < 100 ? 2 : 1 });

export function companyPage(x, ctx) {
  const { CO, SD, byId, articles } = ctx, peers = Object.values(CO.C).filter(p => p.ind === x.ind).sort((a, b) => (b.mcap || 0) - (a.mcap || 0));
  const rank = peers.findIndex(p => p.s === x.s) + 1, all = Object.values(CO.C).sort((a, b) => (b.mcap || 0) - (a.mcap || 0)), arank = all.findIndex(p => p.s === x.s) + 1;
  const idx = IND_INDEX[x.ind] && SD[IND_INDEX[x.ind]] ? IND_INDEX[x.ind] : null;
  const bench = id => { const s = SD[id]; if (!s) return null; const m = Object.fromEntries(s.d.map((d, i) => [d, s.v[i]])); return CO.dates.map(d => m[d] ?? null); };
  const pos = x.hi > x.lo ? (x.last - x.lo) / (x.hi - x.lo) * 100 : 50;
  const payload = { s: x.s, n: x.n, d: CO.dates, c: x.c, t: x.t, nifty: bench('nse-nifty-50'), ind: idx ? { id: idx, n: byId[idx].name, v: bench(idx) } : null };
  const peerRows = peers.slice(0, 12).map(p => `<tr${p.s === x.s ? ' class="hl"' : ''}><th scope="row"><a href="/company/${p.slug}/">${esc(p.n)}</a></th><td class="num">${cr(p.mcap)}</td><td class="num ${cls(p.r.d1)}">${pct(p.r.d1)}</td><td class="num ${cls(p.r.m1)}">${pct(p.r.m1)}</td><td class="num ${cls(p.r.ytd)}">${pct(p.r.ytd)}</td><td class="num ${cls(p.r.y1)}">${pct(p.r.y1)}</td><td>${sparkSVG(p.c.slice(-120), 90, 20, '#15171A')}</td></tr>`).join('');
  return `<div class="mk-top"><div class="wrap"><nav class="en-crumb"><a href="/companies/">Companies</a> › <a href="/companies/#${csym(x.ind)}">${esc(x.ind)}</a></nav><div class="mk-head"><div><span class="kicker">NSE: ${esc(x.s)}</span><h1>${esc(x.n)}</h1>
   <p class="dek sm">${esc(x.ind)}. ${arank ? `${arank}${arank % 10 === 1 && arank !== 11 ? 'st' : arank % 10 === 2 && arank !== 12 ? 'nd' : arank % 10 === 3 && arank !== 13 ? 'rd' : 'th'} largest in the Nifty 500 by market value, ` : ''}${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} of ${peers.length} in its industry. Closing prices from NSE, last on ${esc(new Date(CO.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }))}.</p></div></div></div></div>
  <div class="wrap">
   <div class="mk-cards"><div class="mk-card"><span class="lbl">Close</span><span class="v">${inr(x.last)}</span><span class="c ${cls(x.r.d1)}">${pct(x.r.d1)} on the day</span></div>
    <div class="mk-card"><span class="lbl">Market value</span><span class="v">${cr(x.mcap)}</span><span class="c">NSE, ${esc(new Date(CO.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }))}</span></div>
    <div class="mk-card"><span class="lbl">This year</span><span class="v ${cls(x.r.ytd)}">${pct(x.r.ytd)}</span><span class="c">1 month ${pct(x.r.m1)} · 3 months ${pct(x.r.m3)}</span></div>
    <div class="mk-card"><span class="lbl">One year</span><span class="v ${cls(x.r.y1)}">${pct(x.r.y1)}</span><span class="c">6 months ${pct(x.r.m6)}</span></div>
    <div class="mk-card"><span class="lbl">52-week range</span><span class="v" style="font-size:16px">${inr(x.lo)} – ${inr(x.hi)}</span><span class="co-range"><i style="left:${pos.toFixed(0)}%"></i></span><span class="c">${(x.last / x.hi * 100 - 100).toFixed(1)}% from the high</span></div>
    <div class="mk-card"><span class="lbl">Trading</span><span class="v" style="font-size:18px">₹${x.tov == null ? '—' : x.tov.toLocaleString('en-IN')} cr a day</span><span class="c">${x.deliv == null ? '' : `${x.deliv}% taken for delivery`}${x.vol ? ` · volatility ${x.vol}%` : ''}</span></div></div>
   <section class="xr-sec"><div class="xr-bar"><h2 class="col-title">Price</h2><div class="seg" id="co-mode"><button data-m="price" class="on">Price</button><button data-m="rel">Against the market</button></div></div><div id="co-chart" class="ec" style="height:360px"></div>
    <p class="meta">Daily closes in rupees, not adjusted for dividends.${x.adj ? ' Earlier prices are scaled for ' + (x.adj > 1 ? x.adj + ' splits or bonus issues' : 'a split or bonus issue') + ' so the line is continuous.' : ''} “Against the market” rebases the stock, the Nifty 50${payload.ind ? ` and the ${esc(payload.ind.n)}` : ''} to 100 at the start.</p></section>
   <section class="xr-sec"><h2 class="col-title">${esc(x.ind)}: the biggest names</h2><div class="tbl-wrap"><table class="xr-table"><thead><tr><th>Company</th><th class="num">Market value</th><th class="num">Day</th><th class="num">Month</th><th class="num">This year</th><th class="num">1 year</th><th>6 months</th></tr></thead><tbody>${peerRows}</tbody></table></div>
    <p class="meta"><a href="/companies/#${csym(x.ind)}">All ${peers.length} ${esc(x.ind)} companies in the Nifty 500 →</a></p></section>
   <div class="en-grid"><section class="en-box"><h2 class="col-title">Connected</h2><div class="chips">${[['/s/nse-nifty-50/', 'Nifty 50'], ...(idx ? [[`/s/${idx}/`, byId[idx].name]] : []), ['/markets/', 'Markets'], ['/companies/', 'All Nifty 500 companies']].map(([u, t]) => `<a class="chip" href="${u}">${esc(t)}</a>`).join('')}</div></section>
    <section class="en-box"><h2 class="col-title">In the articles</h2>${articles?.length ? `<ul class="en-arts">${articles.slice(0, 6).map(a => `<li><a href="${esc(a.url)}">${esc(a.title)}</a><small>${esc(a.date.slice(0, 10))}</small></li>`).join('')}</ul>` : '<p class="meta">Not mentioned in any article yet.</p>'}</section></div>
   <p class="meta">ISIN ${esc(x.isin || '')}. Data: NSE bhavcopy (closing price, turnover, delivery) and NSE market capitalisation file. This page is information, not investment advice.</p>
  </div>
  <script>window.__CO=${JSON.stringify(payload)};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/companies.js?v=${Date.now()}" defer></script>`;
}

export function companiesHub(CO, { pageHead }) {
  const all = Object.values(CO.C).sort((a, b) => (b.mcap || 0) - (a.mcap || 0));
  const inds = {}; for (const x of all) (inds[x.ind] ||= []).push(x);
  const tot = all.reduce((a, x) => a + (x.mcap || 0), 0);
  const adv = all.filter(x => x.r.d1 > 0).length, dec = all.filter(x => x.r.d1 < 0).length;
  const tm = Object.entries(inds).map(([ind, xs]) => ({ name: ind, children: xs.filter(x => x.mcap).map(x => ({ name: x.n, s: x.slug, value: x.mcap, r: x.r })) }));
  const rows = all.map(x => `<tr data-n="${esc((x.n + ' ' + x.s).toLowerCase())}" data-i="${esc(x.ind)}"><th scope="row"><a href="/company/${x.slug}/">${esc(x.n)}</a><small>${esc(x.s)}</small></th><td>${esc(x.ind)}</td><td class="num" data-v="${x.mcap || 0}">${cr(x.mcap)}</td><td class="num" data-v="${x.last || 0}">${inr(x.last)}</td>${['d1', 'm1', 'ytd', 'y1'].map(k => `<td class="num ${cls(x.r[k])}" data-v="${x.r[k] ?? -1e9}">${pct(x.r[k])}</td>`).join('')}<td class="num" data-v="${x.deliv ?? 0}">${x.deliv ?? '—'}%</td></tr>`).join('');
  return pageHead('Companies', 'The Nifty 500, company by company', `${all.length} of India’s largest listed companies, worth ${cr(tot)} together. On ${esc(CO.date)}, ${adv} rose and ${dec} fell. Each has its own page with prices, peers and how it has done against the market.`) + `<div class="wrap">
  <section class="xr-sec"><div class="xr-bar"><h2 class="col-title">The market, sized by value</h2><div class="seg" id="cm-win"><button data-w="d1" class="on">Day</button><button data-w="m1">Month</button><button data-w="ytd">This year</button><button data-w="y1">1 year</button></div></div><div id="cm-tree" class="ec" style="height:620px"></div><p class="meta">Each box is a company, sized by market value and grouped by industry; colour shows the change. Click a company to open its page.</p></section>
  <section class="xr-sec" id="list"><div class="xr-bar"><h2 class="col-title">Every company</h2><input id="cm-q" class="cm-q" placeholder="Filter by name, symbol or industry" aria-label="Filter companies"></div>
   <div class="tbl-wrap"><table class="xr-table cm-t" id="cm-t"><thead><tr><th data-k="0">Company</th><th data-k="1">Industry</th><th class="num" data-k="2">Market value</th><th class="num" data-k="3">Close</th><th class="num" data-k="4">Day</th><th class="num" data-k="5">Month</th><th class="num" data-k="6">This year</th><th class="num" data-k="7">1 year</th><th class="num" data-k="8">Delivery</th></tr></thead><tbody>${rows}</tbody></table></div>
   <p class="meta">Click a column to sort. Delivery is the share of traded shares taken for delivery, averaged over 20 sessions. Data: NSE; <a href="/api/companies.json">/api/companies.json</a>.</p></section>
  <section class="xr-sec"><h2 class="col-title">By industry</h2><div class="chips">${Object.entries(inds).sort((a, b) => b[1].length - a[1].length).map(([ind, xs]) => `<a class="chip" id="${csym(ind)}" href="#${csym(ind)}" data-ind="${esc(ind)}">${esc(ind)} <small>${xs.length}</small></a>`).join('')}</div><p class="meta">Pick an industry to filter the table above.</p></section>
  </div>
  <script>window.__CM=${JSON.stringify(tm)};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/companies.js?v=${Date.now()}" defer></script>`;
}
