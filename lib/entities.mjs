// The connected layer: a page for every series, state and country; links between them computed from the data
// (co-movement), from geography and size, and from the articles that mention them; plus a site-wide search index.
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';

export const slugify = t => String(t).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const RENAME = { "China, People's Republic of": 'China', 'Korea, Republic of': 'South Korea', 'Taiwan Province of China': 'Taiwan', 'Hong Kong SAR': 'Hong Kong', 'Türkiye, Republic of': 'Türkiye',
  'Russian Federation': 'Russia', 'Slovak Republic': 'Slovakia', 'Kyrgyz Republic': 'Kyrgyzstan', 'Lao P.D.R.': 'Laos', 'Congo, Dem. Rep. of the': 'DR Congo', 'Congo, Republic of ': 'Republic of the Congo',
  'Micronesia, Fed. States of': 'Micronesia', 'Bahamas, The': 'The Bahamas', 'Gambia, The': 'The Gambia', 'Macao SAR': 'Macao', 'South Sudan, Republic of': 'South Sudan', 'Netherlands, The': 'Netherlands',
  'Czech Republic': 'Czechia', 'Egypt': 'Egypt', 'Iran': 'Iran', 'Syria': 'Syria', 'Afghanistan, Islamic Republic of': 'Afghanistan', 'Brunei Darussalam': 'Brunei', "Côte d'Ivoire": 'Côte d’Ivoire', 'Timor-Leste': 'Timor-Leste' };
export const cleanCountry = n => (RENAME[n] || n).trim();
const strip = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
const f = (v, d = 2) => v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const fAuto = v => v == null ? '—' : Math.abs(v) >= 1000 ? f(v, 0) : Math.abs(v) >= 100 ? f(v, 1) : f(v, 2);
const longD = iso => { const d = new Date((iso.length === 4 ? iso + '-07-01' : iso.length === 7 ? iso + '-01' : iso) + 'T00:00:00Z'); return iso.length === 4 ? iso : d.toLocaleDateString('en-GB', { day: iso.length === 7 ? undefined : 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const isRate = m => /%|per cent|percent/i.test(m.unit || '') || /yield|Treasury|rate|inflation|growth|balance|debt|borrowing/i.test(m.name);
const isProjection = (meta, period) => Boolean(meta.projectionFrom && period.slice(0, 4) >= meta.projectionFrom);
const observationMonthsAgo = (dates, months, frequency) => {
  const [year, month, day = 1] = dates.at(-1).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 - months, 1));
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, daysInMonth));
  const monthOnly = frequency === 'monthly' || frequency === 'quarterly';
  const length = monthOnly ? 7 : 10;
  const cutoff = target.toISOString().slice(0, length);
  const i = dates.findLastIndex(date => date.slice(0, length) <= cutoff);
  if (i < 0 || i === dates.length - 1) return null;
  if (monthOnly) return dates[i].slice(0, length) === cutoff ? i : null;
  const maxGap = { daily: 7, weekly: 10, fortnightly: 21 }[frequency] ?? 0;
  return Date.parse(cutoff) - Date.parse(dates[i]) <= maxGap * 864e5 ? i : null;
};

/* ---------------------------------------------------------------- article mentions */
const SERIES_KW = {
  'nse-nifty-50': /\bNifty(?: 50)?\b(?! ?(?:Bank|IT|Auto|Pharma|Metal|FMCG|Realty|Media|Energy|Midcap|Smallcap|Next|Financial|PSU|Private|100|500))|\bSensex\b/g,
  'nse-nifty-bank': /\bBank Nifty\b|\bNifty Bank\b/g, 'nse-india-vix': /\bIndia VIX\b/g,
  'nse-nifty-10-yr-benchmark-g-sec': /\b10-year (?:G-Sec|government bond|bond yield|yield)\b|\bG-Sec yields?\b|\bbond yields?\b/gi,
  'fred-dgs10': /\bUS 10-year\b|\bTreasury yields?\b|\bUS Treasur(?:y|ies)\b/g, 'fred-dff': /\bFederal Reserve\b|\bthe Fed\b|\bFed funds\b/g,
  'fx-usdinr': /\brupee\b/gi, 'fx-usdcny': /\byuan\b|\brenminbi\b/gi, 'fx-usdeur': /\beuro\b/gi, 'fx-usdjpy': /\byen\b/g, 'fx-usdgbp': /\bsterling\b/gi,
  'fred-dcoilbrenteu': /\bBrent\b|\bcrude(?: oil)?\b|\boil prices?\b/gi, 'fred-dhhngsp': /\bnatural gas\b|\bLNG\b/gi, 'fred-dtwexbgs': /\bdollar index\b|\bstrong dollar\b|\bdollar strength\b/gi,
  'wb-coal': /\bcoal\b/gi, 'wb-cocoa': /\bcocoa\b/gi, 'wb-coffee': /\bcoffee\b/gi, 'wb-teakol': /\btea\b/g, 'wb-sugar': /\bsugar(?:cane)?\b/gi, 'wb-cotton': /\bcotton\b/gi, 'wb-rubber': /\brubber\b/gi,
  'wb-palm': /\bpalm oil\b/gi, 'wb-soyoil': /\bsoy(?:bean)? oil\b/gi, 'wb-sunoil': /\bsunflower oil\b/gi, 'wb-soy': /\bsoy(?:bean|a)s?\b/gi, 'wb-maize': /\bmaize\b|\bcorn\b/gi,
  'wb-rice': /\brice\b/gi, 'wb-wheat': /\bwheat\b/gi, 'wb-dap': /\bDAP\b|\bdi-ammonium phosphate\b/g, 'wb-urea': /\burea\b/gi, 'wb-potash': /\bpotash\b|\bMOP\b/g, 'wb-rockphos': /\bphosphate rock\b|\brock phosphate\b/gi,
  'wb-aluminium': /\balumini?um\b/gi, 'wb-ironore': /\biron ore\b/gi, 'wb-copper': /\bcopper\b/gi, 'wb-nickel': /\bnickel\b/gi, 'wb-zinc': /\bzinc\b/gi, 'wb-gold': /\bgold\b/gi, 'wb-silver': /\bsilver\b/gi, 'wb-platinum': /\bplatinum\b/gi,
  'pw-strait-of-hormuz': /\bHormuz\b/g, 'pw-bab-el-mandeb-strait': /\bBab[- ]el[- ]Mandeb\b|\bRed Sea\b/g, 'pw-suez-canal': /\bSuez\b/g, 'pw-cape-of-good-hope': /\bCape of Good Hope\b/g, 'pw-malacca-strait': /\bMalacca\b/g,
  'crypto-bitcoin': /\bbitcoin\b|\bcrypto(?:currenc(?:y|ies))?\b/gi, 'crypto-ethereum': /\bethereum\b/gi,
  'imf-ngdp-rpch-ind': /\bGDP growth\b|\bgrowth rate\b|\breal GDP\b/gi, 'imf-pcpipch-ind': /\binflation\b|\bCPI\b/gi, 'imf-bca-ngdpd-ind': /\bcurrent account\b/gi,
  'imf-ggxwdg-ngdp-ind': /\bpublic debt\b|\bgovernment debt\b|\bdebt-to-GDP\b/gi, 'imf-ggxcnl-ngdp-ind': /\bfiscal deficit\b/gi,
};
const STATE_ALIAS = { 'Jammu & Kashmir': ['Jammu and Kashmir', 'Jammu & Kashmir', 'J&K'], 'Delhi': ['Delhi'], 'Puducherry': ['Puducherry', 'Pondicherry'], 'Odisha': ['Odisha', 'Orissa'], 'Andaman & Nicobar': ['Andaman'] };
const COUNTRY_ALIAS = { 'United States': ['United States', 'the US', 'U.S.', 'America', 'Washington'], 'United Kingdom': ['United Kingdom', 'Britain', 'the UK'], 'China': ['China', 'Chinese', 'Beijing'],
  'Russia': ['Russia', 'Russian', 'Moscow'], 'United Arab Emirates': ['United Arab Emirates', 'UAE'], 'Saudi Arabia': ['Saudi Arabia', 'Saudi', 'Riyadh'], 'Iran': ['Iran', 'Iranian', 'Tehran'], 'Japan': ['Japan', 'Japanese'],
  'Germany': ['Germany', 'German'], 'Pakistan': ['Pakistan'], 'Bangladesh': ['Bangladesh'], 'Sri Lanka': ['Sri Lanka'], 'South Korea': ['South Korea', 'Korea'], 'Türkiye': ['Türkiye', 'Turkey'], 'Vietnam': ['Vietnam', 'Viet Nam'] };
const SKIP_COUNTRY = new Set(['Chad', 'Georgia', 'Jordan', 'Guinea', 'Niger', 'Dominica', 'Mali', 'Oman', 'Peru', 'Togo', 'India']); // ambiguous as words or people's names, or India itself
const rx = words => new RegExp(words.map(w => (/^\w/.test(w) ? '\\b' : '') + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (/\w$/.test(w) ? '\\b' : '')).join('|'), 'g');

export function mentions(articles, entities) {
  // entities: [{key, re}] → key → [{a, n}]
  const texts = articles.map(a => a.title + ' ' + a.title + ' ' + strip(a.html || '') + ' ' + (a.excerpt || ''));
  const out = {};
  for (const e of entities) {
    const hits = [];
    texts.forEach((t, i) => { const n = (t.match(e.re) || []).length; if (n >= (e.min || 1)) hits.push({ a: articles[i], n }); });
    hits.sort((x, y) => y.n - x.n || y.a.date.localeCompare(x.a.date)); if (hits.length) out[e.key] = hits;
  }
  return out;
}

/* ---------------------------------------------------------------- co-movement */
const toMonthly = (d, v) => { const m = new Map(); d.forEach((x, i) => { if (v[i] != null) m.set(x.slice(0, 7), v[i]); }); return m; };
export function correlations(SD, catalog) {
  const cand = catalog.filter(c => c.freq !== 'annual' && SD[c.id]);
  const since = new Date(); since.setFullYear(since.getFullYear() - 6); const s0 = since.toISOString().slice(0, 7);
  const ch = {};
  for (const c of cand) {
    const m = toMonthly(SD[c.id].d, SD[c.id].v), ks = [...m.keys()].sort().filter(k => k >= s0), rate = isRate(c), o = new Map();
    for (let i = 1; i < ks.length; i++) { const a = m.get(ks[i - 1]), b = m.get(ks[i]); if (a == null || b == null) continue; const x = rate || a <= 0 ? b - a : Math.log(b / a); if (Number.isFinite(x)) o.set(ks[i], x); }
    if (o.size >= 24) ch[c.id] = o;
  }
  const ids = Object.keys(ch), R = Object.fromEntries(ids.map(i => [i, []]));
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const A = ch[ids[i]], B = ch[ids[j]]; let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
    for (const [k, x] of A) { const y = B.get(k); if (y == null) continue; n++; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y; }
    if (n < 24) continue;
    const r = (n * sab - sa * sb) / Math.sqrt((n * saa - sa * sa) * (n * sbb - sb * sb)); if (!Number.isFinite(r) || Math.abs(r) > 0.985) continue;
    R[ids[i]].push({ id: ids[j], r: +r.toFixed(2), n }); R[ids[j]].push({ id: ids[i], r: +r.toFixed(2), n });
  }
  for (const k in R) R[k].sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return R;
}

/* ---------------------------------------------------------------- tools that use each kind of series */
const TOOL_BY_GROUP = [
  [/^Indian equity|^Indian markets/, [['/markets/', 'Markets'], ['/terminal/', 'Terminal']]],
  [/^Global rates/, [['/external/', 'Rupee & reserves'], ['/terminal/', 'Terminal']]],
  [/^Currencies/, [['/external/', 'Rupee & reserves'], ['/terminal/', 'Terminal']]],
  [/Energy|Commodities \(daily\)/, [['/commodities/', 'Commodities'], ['/what-if/pump-price/', 'Pump price'], ['/what-if/', 'Scenario engine'], ['/hormuz/', 'Chokepoint watch']]],
  [/Fertilisers|Grains|Edible oils/, [['/commodities/', 'Commodities'], ['/economy/prices/', 'Prices']]],
  [/^Commodities/, [['/commodities/', 'Commodities']]],
  [/^Shipping/, [['/hormuz/', 'Chokepoint watch'], ['/terminal/', 'Terminal']]],
  [/^Crypto/, [['/markets/', 'Markets'], ['/terminal/', 'Terminal']]],
  [/^India: annual/, [['/desk/', 'Desk'], ['/world/', 'World'], ['/external/', 'Rupee & reserves']]],
  [/^India: industry|^India: money and credit|^India: trade \(monthly\)/, [['/economy/', 'Economy'], ['/terminal/', 'Terminal']]],
  [/^India: external|^India: money markets/, [['/external/', 'Rupee & reserves'], ['/terminal/', 'Terminal']]],
  [/^World economy/, [['/world/', 'World'], ['/external/', 'Rupee & reserves']]],
];
const toolsFor = g => { for (const [re, t] of TOOL_BY_GROUP) if (re.test(g)) return t; return []; };

/* ---------------------------------------------------------------- shared bits */
const artList = (hits, k = 6) => hits && hits.length ? `<ul class="en-arts">${hits.slice(0, k).map(h => `<li><a href="${h.a.url}">${esc(h.a.title)}</a><span>${esc(longD(h.a.date.slice(0, 10)))} · mentioned ${h.n}×</span></li>`).join('')}</ul>${hits.length > k ? `<p class="meta">${hits.length - k} more articles mention it.</p>` : ''}` : '<p class="meta">No articles mention it yet.</p>';
const chips = items => `<div class="en-chips">${items.map(([u, t, s]) => `<a href="${u}">${esc(t)}${s ? ` <small>${esc(s)}</small>` : ''}</a>`).join('')}</div>`;

/* ---------------------------------------------------------------- series page */
export function seriesPage(meta, sd, ctx) {
  const { catalog, corr, ment, byId, crumbsFor, tapeBy } = ctx; const T = tapeBy?.[meta.id];
  const d = sd.d, v = sd.v, n = v.length, last = v[n - 1], rate = isRate(meta);
  const chg = months => {
    const i = observationMonthsAgo(d, months, meta.freq);
    if (i == null || v[i] == null || (!rate && v[i] === 0)) return null;
    return rate ? last - v[i] : (last / v[i] - 1) * 100;
  };
  const chgTxt = c => c == null ? '—' : `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c).toFixed(rate ? 2 : 1)}${rate ? ' pts' : '%'}`;
  const annual = meta.freq === 'annual';
  const hist = annual ? v.filter((_, i) => !isProjection(meta, d[i])) : v;
  const sorted = [...hist].sort((a, b) => a - b), pct = Math.round(sorted.filter(x => x <= last).length / sorted.length * 100);
  const hi = Math.max(...hist), lo = Math.min(...hist), hiD = d[v.indexOf(hi)], loD = d[v.indexOf(lo)];
  const cards = [
    [`Latest${isProjection(meta, d[n - 1]) ? ' (projection)' : ''}`, fAuto(last), `${meta.unit} · ${longD(d[n - 1])}`],
    ...(annual ? (() => { const y = String(+d[n - 1].slice(0, 4) - 10), k = d.findIndex(x => x.startsWith(y)); return [['10 years earlier', k >= 0 ? fAuto(v[k]) : '—', y]]; })() : [['1 month', chgTxt(chg(1)), 'change'], ['1 year', chgTxt(chg(12)), 'change'], ['5 years', chgTxt(chg(60)), 'change']]),
    ['Record high', fAuto(hi), longD(hiD)], ['Record low', fAuto(lo), longD(loD)],
    ['Where it sits', `${ord(Math.max(1, pct))} pctile`, `of ${hist.length.toLocaleString('en-IN')} observations since ${longD(d[0])}`],
  ].map(([l, x, s]) => `<div class="mk-card"><span class="lbl">${esc(l)}</span><span class="v">${esc(x)}</span><span class="sub">${esc(s)}</span></div>`).join('');
  const rel = (corr[meta.id] || []).filter(x => byId[x.id]), pos = rel.filter(x => x.r > 0).slice(0, 6), neg = rel.filter(x => x.r < 0).slice(0, 4);
  const relRow = x => `<li><a href="/s/${x.id}/">${esc(byId[x.id].name)}</a><span class="en-r ${x.r > 0 ? 'up' : 'dn'}" style="--w:${Math.round(Math.abs(x.r) * 100)}%">${x.r > 0 ? '+' : '−'}${Math.abs(x.r).toFixed(2)}</span><button type="button" class="en-cmp" data-id="${x.id}" title="Overlay on the chart">Compare</button></li>`;
  const family = catalog.filter(c => c.group === meta.group && c.id !== meta.id).slice(0, 14);
  const tools = toolsFor(meta.group);
  return `<div class="mk-top"><div class="wrap"><nav class="en-crumb">${crumbsFor(meta)}</nav><div class="mk-head"><div><span class="kicker">${esc(meta.group)}</span><h1>${esc(meta.name)}</h1>
   <p class="dek sm">${esc(meta.unit)}, ${esc(meta.freq)}. Source: ${esc(meta.source)}. ${n.toLocaleString('en-IN')} observations, ${longD(d[0])} to ${longD(d[n - 1])}.</p></div></div>
   <div class="mk-cards">${cards}</div></div></div>
  <div class="wrap">
  <section class="xr-sec"><div class="mk-chart-head"><h2 class="col-title" style="margin:0" id="en-ct">${esc(meta.name)}</h2><div class="mk-ctrl"><span class="seg" id="en-range">${(annual ? ['All'] : ['1Y', '3Y', '5Y', 'All']).map(r => `<button type="button" data-r="${r}"${r === (annual ? 'All' : '3Y') ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span>
    <select id="en-add" aria-label="Compare with"><option value="">+ Compare with…</option>${rel.slice(0, 12).map(x => `<option value="${x.id}">${esc(byId[x.id].name)}</option>`).join('')}${family.slice(0, 10).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div></div>
   <div id="en-chart" class="ec" style="height:440px"></div><p class="meta" id="en-legend">${meta.projectionFrom ? 'Dashed: projections.' : 'Compare rebases both series to 100 at the start of the range.'}</p></section>
  ${T ? `<section class="xr-sec en-release"><h2 class="col-title">Latest release: ${esc(T.label)}</h2><div class="en-rel-grid"><div><span class="lbl">${esc(T.latest.period)}${T.latest.status ? ` · ${esc(T.latest.status)}` : ''}</span><b>${f(T.latest.value, T.decimals ?? 2)}${T.unit === '%' ? '%' : ''}</b>${T.previous ? `<span>Previous ${esc(T.previous.period)}: ${f(T.previous.value, T.decimals ?? 2)}${T.unit === '%' ? '%' : ''}</span>` : ''}${T.next ? `<span class="nx">Next: ${esc(T.next.what)}, ${esc(longD(T.next.date))}</span>` : ''}</div>
    <div><p>${esc(T.context || '')}</p>${(T.revisions || []).length ? `<p class="meta">Revisions: ${T.revisions.map(r => `${esc(r.period)} first ${r.first}, revised to ${r.revised} (${esc(longD(r.revisedDate))})`).join('; ')}.</p>` : ''}<p class="meta">${esc(T.definition || '')} Sources: ${(T.sources || []).map(x => `<a href="${esc(x.url)}">${esc(x.name)}</a>`).join('; ')}. Checked ${esc(longD(T.checked))}.</p></div></div></section>` : ''}
  <div class="en-grid">
   <section class="en-box"><h2 class="col-title">Moves with</h2>${pos.length ? `<ul class="en-rel">${pos.map(relRow).join('')}</ul>` : '<p class="meta">Not enough overlapping monthly data.</p>'}
    ${neg.length ? `<h3 class="sub-h" style="margin-top:14px">Moves against</h3><ul class="en-rel">${neg.map(relRow).join('')}</ul>` : ''}
    <p class="meta">Correlation of monthly changes over the last six years, across all ${Object.keys(corr).length} monthly or daily series on the site. Near +1: they rise and fall together. Near −1: opposite. Correlation is not cause.</p></section>
   <section class="en-box"><h2 class="col-title">In the articles</h2>${artList(ment[meta.id])}</section>
   <section class="en-box"><h2 class="col-title">Same family</h2>${chips(family.map(c => [`/s/${c.id}/`, c.name]))}</section>
   <section class="en-box"><h2 class="col-title">Used in</h2>${chips([...tools.map(([u, t]) => [u, t]), [`/charts/#s=${meta.id}:lvl`, 'Chart workbench'], ['/chartle/', 'Chartle']])}
    <h3 class="sub-h" style="margin-top:14px">Download</h3>${chips([[`/api/series/${meta.id}.json`, 'JSON'], [`/charts/#s=${meta.id}:lvl`, 'CSV via workbench'], [`/img/s/${meta.id}.png`, 'Chart image']])}</section>
  </div>
  <section class="xr-sec en-embed"><h2 class="col-title">Put this chart in a post</h2><div class="en-embed-g"><img src="/img/s/${meta.id}.png" alt="${esc(meta.name)} chart" loading="lazy" width="600" height="338">
   <div><p>This image is redrawn every time the site rebuilds, at the same address. Insert it once and the chart in your post stays current.</p>
   <ol><li>In the WordPress editor add an <b>Image</b> block.</li><li>Choose <b>Insert from URL</b> and paste the address below.</li><li>Link the image to this page so readers can explore it.</li></ol>
   <div class="en-copy"><input readonly value="https://kakistocrat.pages.dev/img/s/${meta.id}.png" aria-label="Image address"><button type="button" class="btn ghost" data-copy="https://kakistocrat.pages.dev/img/s/${meta.id}.png">Copy</button></div>
   <div class="en-copy"><input readonly value="https://kakistocrat.pages.dev/s/${meta.id}/" aria-label="Page address"><button type="button" class="btn ghost" data-copy="https://kakistocrat.pages.dev/s/${meta.id}/">Copy link</button></div></div></div></section>
  <div>
  </div></div>
  <script>window.__EN=${JSON.stringify({ id: meta.id, name: meta.name, unit: meta.unit, annual, projectionFrom: meta.projectionFrom })};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/entity.js?v=${Date.now()}" defer></script>`;
}

/* ---------------------------------------------------------------- state page */
export function statePage(s, ctx) {
  const { S, SC, ment, posters } = ctx;
  const inds = S.indicators.filter(i => s[i.id] != null);
  const rankOf = i => { const r = S.states.filter(x => x[i.id] != null).sort((a, b) => i.higherIs === 'good' ? b[i.id] - a[i.id] : a[i.id] - b[i.id]); return [r.findIndex(x => x.name === s.name) + 1, r.length]; };
  const fmtI = (i, v) => v == null ? '—' : i.fmt === 'inr' ? `₹${Math.round(v).toLocaleString('en-IN')}` : `${f(v, i.fmt === 'pct2' ? 2 : 1)}%`;
  const cards = inds.map(i => { const [r, of] = rankOf(i), all = S.allIndia[i.id], better = all == null ? null : (i.higherIs === 'good' ? s[i.id] >= all : s[i.id] <= all);
    return `<a class="mk-card" href="/states/#${{ cpi: 'inflation', pcIncome: 'income', growth: 'growth', debt: 'debt', interest: 'interest', ownRev: 'self-reliance' }[i.id]}"><span class="lbl">${esc(i.label)}</span><span class="v">${fmtI(i, s[i.id])}</span><span class="c ${better == null ? '' : better ? 'up' : 'dn'}">${ord(r)} best of ${of}${all != null ? ` · India ${fmtI(i, all)}` : ''}</span><span class="sub">${esc(i.year)}</span></a>`; }).join('');
  const sc = SC?.states.find(x => x.name === s.name);
  // similar states: nearest neighbours on standardised indicators
  const keys = S.indicators.map(i => i.id), stats = Object.fromEntries(keys.map(k => { const xs = S.states.map(x => x[k]).filter(x => x != null); const m = xs.reduce((a, b) => a + b, 0) / xs.length; const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) || 1; return [k, [m, sd]]; }));
  const dist = (a, b) => { let t = 0, c = 0; for (const k of keys) if (a[k] != null && b[k] != null) { t += ((a[k] - b[k]) / stats[k][1]) ** 2; c++; } return c >= 4 ? Math.sqrt(t / c) : Infinity; };
  const similar = S.states.filter(x => x.name !== s.name).map(x => [x, dist(s, x)]).filter(x => Number.isFinite(x[1])).sort((a, b) => a[1] - b[1]).slice(0, 5);
  return `<div class="mk-top"><div class="wrap"><nav class="en-crumb"><a href="/explore/">Explore</a> › <a href="/explore/#states">States</a></nav><div class="mk-head"><div><span class="kicker">State</span><h1>${esc(s.name)}</h1>
   <p class="dek sm">${sc ? `An economy of about <b>$${Math.round(sc.usd)} billion</b> (${esc(sc.year)}), close to the size of <a href="/country/${slugify(sc.country)}/">${esc(sc.country)}</a>. ` : ''}Ranks are among the ${S.states.length} states and union territories with data; green means better than the all-India figure.</p></div></div>
   <div class="mk-cards">${cards}</div></div></div>
  <div class="wrap"><div class="en-grid">
   <section class="en-box"><h2 class="col-title">On the map</h2><div id="st-map" class="ec" style="height:420px"></div><p class="meta">Click any state to go to its page.</p></section>
   <section class="en-box"><h2 class="col-title">Most similar states</h2><ul class="en-rel">${similar.map(([x, dd]) => `<li><a href="/state/${slugify(x.name)}/">${esc(x.name)}</a><span class="en-r up" style="--w:${Math.max(8, Math.round((1 - Math.min(dd, 2) / 2) * 100))}%">${(1 / (1 + dd)).toFixed(2)}</span></li>`).join('')}</ul>
    <p class="meta">Closest on income, growth, inflation, debt, interest burden and self-reliance, each scaled by how much it varies across states.</p>
    <h3 class="sub-h" style="margin-top:14px">See it on</h3>${chips([...posters.map(p => [`/states/#${p.id}`, p.kicker]), ['/states/', 'India by State']])}</section>
   <section class="en-box"><h2 class="col-title">In the articles</h2>${artList(ment['state:' + s.name], 8)}</section>
  </div></div>
  <script>window.__ST=${JSON.stringify({ name: s.name, states: S.states.map(x => x.name) })};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/entity.js?v=${Date.now()}" defer></script>`;
}

/* ---------------------------------------------------------------- country page */
export function countryPage(iso, ctx) {
  const { W, SC, ment, year, catalog, fxCodes } = ctx;
  const name = cleanCountry(W.countries[iso]), Y = String(year);
  const rows = Object.entries(W.indicators).map(([id, m]) => {
    const ser = W.data[id]?.[iso]; if (!ser) return '';
    const ys = Object.keys(ser).sort(), val = ser[Y] ?? ser[ys.filter(y => y <= Y).pop()];
    const all = Object.entries(W.data[id]).map(([k, s2]) => [k, s2[Y]]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]); const r = all.findIndex(x => x[0] === iso) + 1;
    const ind = W.data[id].IND?.[Y];
    return `<tr><th>${esc(m.label)}<small>${esc(m.unit)}</small></th><td class="num">${fAuto(val)}</td><td class="num">${r ? `${ord(r)}<small> of ${all.length}</small>` : '—'}</td><td class="num">${iso === 'IND' ? '' : fAuto(ind)}</td><td>${sparkSVG(ys.filter(y => y >= '1995').map(y => ser[y]), 150, 30, '#17202C')}</td></tr>`; }).join('');
  const twins = (SC?.states || []).filter(s => s.country === name);
  const code = { CHN: 'CNY', JPN: 'JPY', GBR: 'GBP', KOR: 'KRW', IDN: 'IDR', MYS: 'MYR', PHL: 'PHP', THA: 'THB', SGP: 'SGD', BRA: 'BRL', MEX: 'MXN', ZAF: 'ZAR', TUR: 'TRY', DEU: 'EUR', FRA: 'EUR', ITA: 'EUR', ESP: 'EUR', NLD: 'EUR' }[iso];
  const peerSeries = catalog.filter(c => c.id.endsWith('-' + iso.toLowerCase()) && c.id.startsWith('imf-') || c.id.startsWith('wdi-') && c.id.endsWith('-' + iso.toLowerCase()));
  return `<div class="mk-top"><div class="wrap"><nav class="en-crumb"><a href="/explore/">Explore</a> › <a href="/explore/#countries">Countries</a></nav><div class="mk-head"><div><span class="kicker">Country</span><h1>${esc(name)}</h1>
   <p class="dek sm">IMF World Economic Outlook figures for ${Y}${+Y >= year ? ' (estimates and projections)' : ''}, with ${esc(name)}’s rank among ${Object.keys(W.countries).length} economies and India alongside.${twins.length ? ` Its economy is about the size of ${twins.map(t => `<a href="/state/${slugify(t.name)}/">${esc(t.name)}</a>`).join(', ')}.` : ''}</p></div></div></div></div>
  <div class="wrap">
   <section class="xr-sec"><table class="tbl en-tbl"><thead><tr><th>Indicator</th><th class="num">${Y}</th><th class="num">World rank</th><th class="num">${iso === 'IND' ? '' : 'India'}</th><th>1995–2031</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="meta">Ranks run from the largest or highest value. <a href="/world/">Explore every country’s ranking →</a></p></section>
   ${ctx.tradeHTML || ''}
   <div class="en-grid">
    <section class="en-box"><h2 class="col-title">Connected</h2>${chips([...(code && fxCodes.has(code) ? [[`/s/fx-usd${code.toLowerCase()}/`, `${code} per US dollar`]] : []), ...peerSeries.slice(0, 8).map(c => [`/s/${c.id}/`, c.name]), ...twins.map(t => [`/state/${slugify(t.name)}/`, `${t.name} (same size)`]), ['/world/', 'World rankings']])}</section>
    <section class="en-box"><h2 class="col-title">In the articles</h2>${artList(ment['country:' + iso], 8)}</section>
   </div></div>`;
}

/* ---------------------------------------------------------------- explore hub with a network of connections */
export function explorePage(ctx) {
  const { catalog, S, W, ment, articles, net, unusual, sections = [] } = ctx;
  const groups = {}; for (const c of catalog) (groups[c.group] ||= []).push(c);
  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">Explore</span><h1>Everything on the site, connected</h1>
   <p class="dek sm">${catalog.length} data series, ${S.states.length} states, ${Object.keys(W.countries).length} countries and ${articles.length} articles, each with its own page and linked to everything related: series that move together, places that resemble each other, and the articles that mention them. The network below shows which subjects the articles discuss together. Press <kbd>/</kbd> or <kbd>⌘K</kbd> anywhere to search.</p></div></div></div></div>
  <div class="wrap">
   ${sections.length ? `<section class="xr-sec"><h2 class="col-title">The sections</h2><div class="ex-secs">${sections.filter(x => x.url !== '/explore/').map(x => `<a class="ex-sec" href="${x.url}"><b>${esc(x.name)}</b><span>${esc(x.blurb)}</span>${x.tabs.length > 1 ? `<small>${x.tabs.map(t => `<span data-href="${t[0]}">${esc(t[1])}</span>`).join(' · ')}</small>` : ''}</a>`).join('')}</div></section>` : ''}
   ${unusual?.length ? `<section class="xr-sec"><h2 class="col-title">Unusual moves right now</h2>${movesHTML(unusual)}<p class="meta">The latest change in each of the site’s daily and monthly series, measured against its own typical change over the past year (daily) or five years (monthly). σ is the number of standard deviations.</p></section>` : ''}
   <section class="xr-sec"><h2 class="col-title">What the articles connect</h2><div id="ex-net" class="ec" style="height:640px;background:#fff;border:1px solid var(--rule-2)"></div>
    <p class="meta">Each dot is a state, country, commodity or indicator mentioned in at least two articles; size shows how many. Lines join subjects that appear in the same articles; thicker means more often. Drag to rearrange, scroll to zoom, click to open.</p></section>
   <section class="xr-sec" id="series"><h2 class="col-title">Data series</h2>${Object.entries(groups).map(([g, cs]) => `<h3 class="sub-h" style="margin-top:14px">${esc(g)} <small class="t-mu">${cs.length}</small></h3>${chips(cs.map(c => [`/s/${c.id}/`, c.name.replace(/: (?=[A-Z])/, ' · ')]))}`).join('')}</section>
   <section class="xr-sec" id="states"><h2 class="col-title">States and union territories</h2>${chips(S.states.map(s => [`/state/${slugify(s.name)}/`, s.name, ment['state:' + s.name] ? `${ment['state:' + s.name].length}` : '']))}</section>
   <section class="xr-sec" id="countries"><h2 class="col-title">Countries</h2>${chips(Object.entries(W.countries).map(([iso, n]) => [iso, cleanCountry(n)]).sort((a, b) => a[1].localeCompare(b[1])).map(([iso, n]) => [`/country/${slugify(n)}/`, n, ment['country:' + iso] ? `${ment['country:' + iso].length}` : '']))}</section>
  </div>
  <script>window.__NET=${JSON.stringify(net)};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/entity.js?v=${Date.now()}" defer></script>`;
}

export { STATE_ALIAS, COUNTRY_ALIAS, SKIP_COUNTRY, SERIES_KW, rx };

/* ---------------------------------------------------------------- unusual moves: the latest change measured against the series' own history */
export function unusualMoves(SD, catalog, k = 15) {
  const out = [];
  for (const c of catalog) {
    if (c.freq === 'annual' || !SD[c.id] || /tankers/.test(c.id)) continue;
    const { d, v } = SD[c.id], n = v.length; if (n < 40) continue;
    const rate = isRate(c), ch = []; for (let i = 1; i < n; i++) { const a = v[i - 1], b = v[i]; if (a == null || b == null) continue; ch.push(rate || a <= 0 ? b - a : (b / a - 1) * 100); }
    const last = ch.at(-1), hist = ch.slice(-(c.freq === 'daily' ? 251 : c.freq === 'weekly' ? 105 : 61), -1); if (hist.length < 20) continue;
    const m = hist.reduce((a, b) => a + b, 0) / hist.length, sd = Math.sqrt(hist.reduce((a, b) => a + (b - m) ** 2, 0) / hist.length); if (!sd) continue;
    // only recent observations count as news: within 10 days for daily series, 75 days for monthly
    const age = (Date.now() - new Date(d[n - 1] + (d[n - 1].length === 7 ? '-28' : '')).getTime()) / 864e5; if (age > (c.freq === 'daily' ? 10 : c.freq === 'weekly' ? 21 : 75)) continue;
    out.push({ id: c.id, name: c.name, group: c.group, date: d[n - 1], last: v[n - 1], ch: last, z: (last - m) / sd, rate, freq: c.freq });
  }
  return out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, k);
}
export const movesHTML = (U, dark = false) => `<ul class="${dark ? 't-un' : 'un-list'}">${U.map(u => `<li><a href="/s/${u.id}/">${esc(u.name)}</a><span class="${u.ch > 0 ? (dark ? 't-up' : 'up') : (dark ? 't-dn' : 'dn')}">${u.ch > 0 ? '+' : '−'}${Math.abs(u.ch).toFixed(u.rate ? 2 : 1)}${u.rate ? ' pts' : '%'}</span><em title="Size of the move in standard deviations of its usual ${u.freq} change">${Math.abs(u.z).toFixed(1)}σ</em><small>${new Date(u.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</small></li>`).join('')}</ul>`;

/* ---------------------------------------------------------------- articles inside the data space */
// Link the first mention of each subject in an article's text to its page (never inside links, headings or figures).
export function autolink(html, keys, reOf, urlOf) {
  const todo = keys.map(k => ({ k, re: reOf[k] ? new RegExp(reOf[k].source, reOf[k].flags.replace('g', '')) : null })).filter(x => x.re);
  const done = new Set(); let depth = 0, out = '';
  for (const part of html.split(/(<[^>]+>)/)) {
    if (part.startsWith('<')) { if (/^<(a|h[1-6]|figure|figcaption|code|pre|table)\b/i.test(part)) depth++; else if (/^<\/(a|h[1-6]|figure|figcaption|code|pre|table)>/i.test(part)) depth = Math.max(0, depth - 1); out += part; continue; }
    let t = part;
    if (!depth && t.trim()) for (const x of todo) { if (done.has(x.k)) continue; const mm = x.re.exec(t); if (!mm) continue;
      t = t.slice(0, mm.index) + `<a class="dl" href="${urlOf(x.k)}" title="Data page">${mm[0]}</a>` + t.slice(mm.index + mm[0].length); done.add(x.k);
      // stop scanning this text once it contains a link, to keep indices simple and avoid nested anchors
      break; }
    out += t;
  }
  return out;
}
export function storyCards(items, SD, byId, k = 4) {
  const ser = items.filter(x => x.type === 'series' && SD[x.k] && byId[x.k]).slice(0, k);
  return ser.map(x => { const c = byId[x.k], { d, v } = SD[x.k], n = v.length, rate = isRate(c), annual = c.freq === 'annual';
    const i0 = annual ? Math.max(0, n - 15) : Math.max(0, d.findIndex(z => z >= new Date(Date.now() - 3 * 365 * 864e5).toISOString().slice(0, d[n - 1].length)));
    const period = d[n - 1];
    const y = annual ? null : observationMonthsAgo(d, 12, c.freq);
    const ch = y != null && v[y] != null && (rate || v[y] !== 0) ? (rate ? v[n - 1] - v[y] : (v[n - 1] / v[y] - 1) * 100) : null;
    const status = isProjection(c, period) ? 'IMF projection' : c.latestStatus;
    const source = c.source.split(' (from ')[0];
    return `<a class="sd-card" href="/s/${x.k}/"><span class="lbl">${esc(c.name)}</span><b>${fAuto(v[n - 1])}<small> ${esc(c.unit)}</small></b><span class="sub">${esc(longD(period))}${status ? ' · ' + esc(status) : ''}${ch != null ? ` · <i class="${ch > 0 ? 'up' : 'dn'}">${ch > 0 ? '+' : '−'}${Math.abs(ch).toFixed(rate ? 2 : 1)}${rate ? ' pts' : '%'} in a year</i>` : ''}</span><span class="sub">${esc(source)}</span>${sparkSVG(v.slice(i0), 220, 44, '#B5367A')}</a>`; }).join('');
}
