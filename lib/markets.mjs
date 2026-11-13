import { esc } from './charts.mjs';

const f2 = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v, d = 2) => v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}%`;
const cls = v => v == null ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : '';
const fmtDate = iso => { const d = new Date(iso + 'T00:00:00Z'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
export const sparkSVG = (vals, w = 120, h = 32, color) => {
  const v = vals.filter(x => x != null); if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v), sp = hi - lo || 1;
  const pts = vals.map((x, i) => x == null ? null : `${(i / (vals.length - 1) * w).toFixed(1)},${(h - 2 - (x - lo) / sp * (h - 4)).toFixed(1)}`).filter(Boolean).join(' ');
  const c = color || (v.at(-1) >= v[0] ? '#5F7F14' : '#B5367A');
  return `<svg class="spk" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${c}" stroke-width="1.6" points="${pts}"/></svg>`;
};
const heat = v => { if (v == null) return ''; const a = Math.min(Math.abs(v) / 8, 1); return v >= 0 ? `background:rgba(95,127,20,${(0.08 + a * 0.55).toFixed(2)})` : `background:rgba(181,54,122,${(0.08 + a * 0.55).toFixed(2)})`; };

export function marketsPage(M, { pageHead }) {
  const L = M.dates.length - 1;
  const card = (label, n, sub = '') => { const s = M.series[n]; if (!s) return ''; const v = s[L], p = s[L - 1], c = p ? (v / p - 1) * 100 : null;
    return `<a class="mk-card" href="#chart" data-idx="${esc(n)}"><span class="lbl">${esc(label)}</span><span class="v">${f2(v)}</span><span class="c ${cls(c)}">${pct(c)}</span>${sparkSVG(s.slice(-60))}<span class="sub">${esc(sub || fmtDate(M.lastDate))}</span></a>`; };
  const fredCard = (label, id, unit = '', d = 2) => { const x = M.fredLast?.[id]; if (!x) return ''; const ch = x.prev ? x.last[1] - x.prev[1] : null;
    return `<div class="mk-card"><span class="lbl">${esc(label)}</span><span class="v">${f2(x.last[1], d)}${unit}</span><span class="c ${cls(ch)}">${ch == null ? '' : (ch > 0 ? '+' : ch < 0 ? '−' : '') + Math.abs(ch).toFixed(d) + (unit === '%' ? ' pts' : '')}</span>${sparkSVG(M.fred[id].pts.slice(-60).map(p => p[1]), 120, 32, '#17202C')}<span class="sub">${fmtDate(x.last[0])}</span></div>`; };
  const inr = M.fxOut?.table.find(t => t.c === 'INR');
  const cards = [card('Nifty 50', 'Nifty 50'), card('Nifty Bank', 'Nifty Bank'), card('Nifty Midcap 100', 'NIFTY Midcap 100'), card('Nifty Smallcap 100', 'NIFTY Smallcap 100'), card('India VIX', 'India VIX', 'Volatility index'),
    inr ? `<div class="mk-card"><span class="lbl">Rupees per dollar</span><span class="v">${f2(inr.last)}</span><span class="c ${cls(-inr.d1)}">${pct(-inr.d1)} rupee</span>${sparkSVG(M.fx.rates.INR.slice(-60), 120, 32, '#1C7C99')}<span class="sub">ECB reference, ${fmtDate(M.fxOut.date)}</span></div>` : '',
    fredCard('Brent crude, $/bbl', 'DCOILBRENTEU'), fredCard('US 10-year yield', 'DGS10', '%'),
    `<div class="mk-card" id="btc-card"><span class="lbl">Bitcoin, $</span><span class="v" data-live="btc">${f2(M.crypto?.bitcoin?.at(-1)?.[1], 0)}</span><span class="c" data-live="btc-c">live</span>${sparkSVG((M.crypto?.bitcoin || []).slice(-60).map(p => p[1]), 120, 32, '#B87708')}<span class="sub" data-live="btc-t">CoinGecko</span></div>`].join('');

  const SECT = ['Nifty Bank', 'Nifty Financial Services', 'Nifty IT', 'Nifty Auto', 'Nifty FMCG', 'Nifty Pharma', 'Nifty Healthcare Index', 'Nifty Metal', 'Nifty Energy', 'Nifty Oil & Gas', 'Nifty Realty', 'Nifty PSU Bank', 'Nifty Private Bank', 'Nifty Media', 'Nifty Consumer Durables', 'Nifty Infrastructure', 'Nifty Commodities', 'Nifty India Defence', 'Nifty CPSE', 'Nifty PSE'];
  const BROAD = ['Nifty 50', 'Nifty Next 50', 'Nifty 100', 'Nifty 500', 'NIFTY Midcap 100', 'NIFTY Smallcap 100'];
  const perfRow = p => `<tr><th scope="row"><a href="#chart" data-idx="${esc(p.n)}">${esc(p.n.replace(/^NIFTY /, 'Nifty '))}</a> <a class="pg" href="/s/nse-${p.n.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/" title="Full page: history, what moves with it, articles">↗</a></th><td>${f2(p.last)}</td>${['d1', 'w1', 'm1', 'm3', 'ytd', 'y1'].map(k => `<td style="${heat(p[k])}">${pct(p[k], 1)}</td>`).join('')}</tr>`;
  const table = list => `<div class="tbl-wrap"><table class="xr-table mk-perf"><thead><tr><th>Index</th><th>Close</th><th>1 day</th><th>1 week</th><th>1 month</th><th>3 months</th><th>Year to date</th><th>1 year</th></tr></thead><tbody>${list.map(n => M.perf.find(p => p.n === n)).filter(Boolean).map(perfRow).join('')}</tbody></table></div>`;

  const st = M.stocks?.nifty50 || [], sorted = [...st].sort((a, b) => b.chg - a.chg);
  const mover = s => `<li><a class="n" href="/company/${s.s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-')}/">${esc(s.n)}</a><span class="v">${f2(s.c)}</span><span class="c ${cls(s.chg)}">${pct(s.chg)}</span></li>`;
  const br = M.stocks?.breadth;
  const fx = M.fxOut?.table || [];
  const fxName = { INR: 'Indian rupee', EUR: 'Euro', GBP: 'British pound', JPY: 'Japanese yen', CNY: 'Chinese yuan', KRW: 'Korean won', IDR: 'Indonesian rupiah', MYR: 'Malaysian ringgit', PHP: 'Philippine peso', THB: 'Thai baht', SGD: 'Singapore dollar', BRL: 'Brazilian real', MXN: 'Mexican peso', ZAR: 'South African rand', TRY: 'Turkish lira' };
  const fxRow = t => `<tr><th scope="row"><a href="/s/fx-usd${t.c.toLowerCase()}/">${esc(fxName[t.c] || t.c)}</a> <small>${t.c}</small></th><td>${f2(t.last, t.last > 100 ? 2 : 4)}</td>${['d1', 'm1', 'ytd', 'y1'].map(k => `<td style="${heat(t[k] == null ? null : -t[k])}">${pct(t[k] == null ? null : -t[k], 1)}</td>`).join('')}</tr>`;

  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">Markets</span><h1>Indian markets, rates, currencies and crypto</h1><p class="dek sm">NSE closing data for ${fmtDate(M.lastDate)}, with global rates, ECB exchange rates and live crypto. Click any card or index to chart it.</p></div><div class="mk-clock" id="mk-clock"><span class="dot"></span><b id="mk-status">NSE</b><span id="mk-time"></span></div></div>
  <div class="mk-cards">${cards}</div></div></div>
  <div class="wrap">
  <section class="xr-sec" id="chart"><div class="mk-chart-head"><h2 class="col-title" style="margin:0">Chart</h2>
   <div class="mk-ctrl"><select id="mk-idx" aria-label="Index">${M.names.filter(n => !/G-Sec/.test(n)).map(n => `<option${n === 'Nifty 50' ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
   <select id="mk-cmp" aria-label="Compare with"><option value="">Compare with…</option>${M.names.filter(n => !/G-Sec|VIX/.test(n)).map(n => `<option>${esc(n)}</option>`).join('')}</select>
   <span class="seg" id="mk-range">${['1M', '3M', '6M', '1Y', 'YTD', 'All'].map(r => `<button type="button" data-r="${r}"${r === '1Y' ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span>
   <label class="chk"><input type="checkbox" id="mk-log"> Log</label></div></div>
   <div id="mk-chart" class="ec" style="height:440px"></div>
   <p class="meta" id="mk-chart-note">Daily closes. With a comparison selected, both series are rebased to 100 at the start of the range.</p></section>

  <section class="xr-sec"><h2 class="col-title">Nifty 50 heatmap, ${fmtDate(M.stocks?.date || M.lastDate)}</h2>
   <div id="mk-heat" class="ec" style="height:520px"></div>
   <p class="meta">Each tile is a Nifty 50 company, sized by full market capitalisation and coloured by the day's price change. Grouped by industry.</p></section>

  <div class="mk-two">
   <section class="xr-sec"><h2 class="col-title">Top movers in the Nifty 50</h2><div class="mk-movers"><div><h3>Gainers</h3><ol>${sorted.slice(0, 6).map(mover).join('')}</ol></div><div><h3>Losers</h3><ol>${sorted.slice(-6).reverse().map(mover).join('')}</ol></div></div></section>
   <section class="xr-sec"><h2 class="col-title">Market breadth, all NSE equities</h2>${br ? `<div class="mk-breadth"><span style="flex:${br.advances};background:#5F7F14"></span><span style="flex:${br.unchanged};background:#C9CFC3"></span><span style="flex:${br.declines};background:#B5367A"></span></div><div class="legend"><span><i style="background:#5F7F14"></i>Advances ${br.advances.toLocaleString('en-IN')}</span><span><i style="background:#C9CFC3"></i>Unchanged ${br.unchanged.toLocaleString('en-IN')}</span><span><i style="background:#B5367A"></i>Declines ${br.declines.toLocaleString('en-IN')}</span></div><p class="meta" style="margin-top:8px">Advance–decline ratio: ${(br.advances / Math.max(1, br.declines)).toFixed(2)}. EQ series, ${br.universe.toLocaleString('en-IN')} stocks.</p>` : ''}
   <h2 class="col-title" style="margin-top:24px">Nifty 50 valuation</h2><div class="mk-val"><div><span class="lbl">P/E</span><b>${f2(M.pe.at(-1))}</b><small>${M.pePct}th percentile of the last ${Math.round(M.dates.length / 250)} years</small></div><div><span class="lbl">P/B</span><b>${f2(M.pb.at(-1))}</b></div><div><span class="lbl">Dividend yield</span><b>${f2(M.dy.at(-1))}%</b></div></div></section>
  </div>

  <section class="xr-sec"><h2 class="col-title">Nifty 50 price-to-earnings, with its range</h2><div id="mk-pe" class="ec" style="height:320px"></div>
   <p class="meta">Bands show the average P/E over the period held here, plus and minus one standard deviation. NSE computes P/E on trailing earnings.</p></section>

  <section class="xr-sec"><h2 class="col-title">Sectors</h2>${table(SECT)}</section>
  <section class="xr-sec"><h2 class="col-title">Broad market</h2>${table(BROAD)}</section>

  <div class="mk-two">
   <section class="xr-sec"><h2 class="col-title">US Treasury yield curve</h2><div id="mk-curve" class="ec" style="height:300px"></div><p class="meta">Latest against one year earlier. Source: US Treasury via FRED.</p></section>
   <section class="xr-sec"><h2 class="col-title">Rupee per dollar</h2><div id="mk-inr" class="ec" style="height:300px"></div><p class="meta">ECB reference rates (daily, around 16:00 CET), via Frankfurter.</p></section>
  </div>

  <section class="xr-sec"><h2 class="col-title">Asian and emerging currencies against the dollar</h2>
   <div class="mk-chart-head" style="margin-bottom:6px"><span class="meta">Index of the dollar price of each currency, start of range = 100. Lower means the currency weakened.</span><span class="seg" id="fx-range">${['3M', '1Y', '3Y'].map(r => `<button type="button" data-r="${r}"${r === '1Y' ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span></div>
   <div id="mk-race" class="ec" style="height:400px"></div>
   <div class="tbl-wrap"><table class="xr-table mk-perf"><thead><tr><th>Currency</th><th>Per US dollar</th><th>1 day</th><th>1 month</th><th>Year to date</th><th>1 year</th></tr></thead><tbody>${fx.map(fxRow).join('')}</tbody></table></div>
   <p class="meta">Changes show the currency's move against the dollar: green means it strengthened.</p></section>

  <section class="xr-sec"><h2 class="col-title">Crypto</h2><div class="mk-two" style="margin-top:0"><div id="mk-btc" class="ec" style="height:300px"></div><div class="mk-live" id="mk-live"><div><span class="lbl">Bitcoin</span><b data-live="btc2">—</b><span data-live="btc2-c"></span></div><div><span class="lbl">Ether</span><b data-live="eth">—</b><span data-live="eth-c"></span></div><p class="meta">Live prices from CoinGecko, refreshed every minute while this page is open.</p></div></div></section>

  <section class="xr-sec"><h2 class="col-title">Sources and terms</h2><ul class="src">
   <li>Index closes, valuations, stock prices, market capitalisation and breadth: <a href="https://www.nseindia.com/">National Stock Exchange of India</a> daily archive files. End of day, not real time.</li>
   <li>US Treasury yields, federal funds rate, broad dollar index, EIA spot oil and gas prices: <a href="https://fred.stlouisfed.org/">FRED, Federal Reserve Bank of St Louis</a>.</li>
   <li>Exchange rates: <a href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html">ECB euro reference rates</a> via <a href="https://frankfurter.dev/">Frankfurter</a>.</li>
   <li>Crypto: <a href="https://www.coingecko.com/">CoinGecko</a>.</li></ul>
   <p class="meta">Data refreshed ${esc(M.meta?.fetched || '')}. For information only; not investment advice. Download everything from the <a href="/api/" style="text-decoration:underline">data API</a>.</p></section>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/markets.js?v=${Date.now()}" defer></script>`;
}

export function commoditiesPage(M, { pageHead }) {
  const C = M.comm; if (!C) return pageHead('Commodities', 'Commodities', 'Data unavailable.');
  const ORDER = ['Energy', 'Precious metals', 'Base metals', 'Fertilisers', 'Grains', 'Edible oils', 'Softs'];
  const groups = [...new Set(C.items.map(i => i.group))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const unitFmt = (v, u) => u.includes('/kg') || u.includes('mmbtu') ? f2(v, 2) : f2(v, v >= 100 ? 0 : 2);
  const tile = i => `<button class="cm-tile" type="button" data-c="${i.id}"><span class="n">${esc(i.name)} <a class="cm-go" href="/s/wb-${i.id}/" title="Open the ${esc(i.name)} page" onclick="event.stopPropagation()">↗</a></span><span class="v">${unitFmt(i.cur, i.unit)}<small>${esc(i.unit)}</small></span>
   <span class="ch"><b class="${cls(i.mm)}">${pct(i.mm, 1)}</b> m/m · <b class="${cls(i.yy)}">${pct(i.yy, 1)}</b> y/y</span>${sparkSVG(i.spark, 140, 30)}
   <span class="rng" title="Position in its five-year range"><i style="left:${i.pos.toFixed(0)}%"></i></span><span class="rl"><span>${unitFmt(i.lo, i.unit)}</span><span>5-yr range</span><span>${unitFmt(i.hi, i.unit)}</span></span></button>`;
  const fl = M.fredLast || {};
  const daily = [['Brent', 'DCOILBRENTEU', '$/bbl'], ['WTI', 'DCOILWTICO', '$/bbl'], ['Henry Hub gas', 'DHHNGSP', '$/mmbtu']].map(([n, id, u]) => fl[id] ? `<div class="mk-card"><span class="lbl">${n}, daily spot</span><span class="v">${f2(fl[id].last[1])}</span><span class="c">${u}</span>${sparkSVG(M.fred[id].pts.slice(-90).map(p => p[1]), 120, 32, '#17202C')}<span class="sub">${fmtDate(fl[id].last[0])} · EIA</span></div>` : '').join('');
  const gold = C.items.find(i => i.id === 'gold'), silver = C.items.find(i => i.id === 'silver');
  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">Commodities</span><h1>Commodities: energy, metals, fertilisers and food</h1><p class="dek sm">${C.items.length} world prices from the World Bank's Pink Sheet, monthly averages to ${esc(monthName(C.month))}, plus daily oil and gas spot prices. India imports most of its crude, edible oil, fertiliser and gold, so these prices feed straight into inflation, the trade deficit and the Budget.</p></div></div>
  <div class="mk-cards">${daily}${gold && silver ? `<div class="mk-card"><span class="lbl">Gold–silver ratio</span><span class="v">${(gold.cur / silver.cur).toFixed(1)}</span><span class="c">ounces of silver per ounce of gold</span><span class="sub">${esc(monthName(C.month))}</span></div>` : ''}${gold && M.fx ? (() => { const r = M.fx.dates.map((d, i) => d.startsWith(C.month) ? M.fx.rates.INR[i] : null).filter(Boolean); const inr = r.length ? r.reduce((a, b) => a + b, 0) / r.length : null; return inr ? `<div class="mk-card"><span class="lbl">Gold in rupees</span><span class="v">₹${Math.round(gold.cur * inr / 31.1035 * 10).toLocaleString('en-IN')}</span><span class="c">per 10 grams, before duties and GST</span><span class="sub">${esc(monthName(C.month))} avg × ₹${inr.toFixed(2)}/$</span></div>` : ''; })() : ''}<div class="mk-card"><span class="lbl">Brent in rupees</span><span class="v" id="brent-inr">—</span><span class="c">₹ per barrel, monthly average</span><span class="sub">Brent × ECB rupee rate</span></div></div></div></div>
  <div class="wrap">
  ${groups.map(g => `<section class="xr-sec"><h2 class="col-title">${esc(g)}</h2><div class="cm-grid">${C.items.filter(i => i.group === g).map(tile).join('')}</div></section>`).join('')}
  <section class="xr-sec" id="cm-chart-sec"><div class="mk-chart-head"><h2 class="col-title" style="margin:0">Compare prices</h2><div class="mk-ctrl"><span class="meta" id="cm-picked"></span><span class="seg" id="cm-range">${['1Y', '3Y', '5Y', 'All'].map(r => `<button type="button" data-r="${r}"${r === '5Y' ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span><label class="chk"><input type="checkbox" id="cm-rebase" checked> Rebase to 100</label></div></div>
   <div id="cm-chart" class="ec" style="height:440px"></div><p class="meta">Click tiles above to add or remove commodities (up to six). Monthly averages.</p></section>
  <section class="xr-sec"><h2 class="col-title">Year-on-year change, last 12 months</h2><div id="cm-heat" class="ec" style="height:${Math.max(420, C.items.length * 22)}px"></div></section>
  <section class="xr-sec"><h2 class="col-title">Sources</h2><ul class="src"><li><a href="https://www.worldbank.org/en/research/commodity-markets">World Bank Commodity Price Data (The Pink Sheet)</a>, updated ${esc(C.updated)}. Licensed CC BY 4.0.</li><li>Daily spot prices for Brent, WTI and Henry Hub: US Energy Information Administration, via <a href="https://fred.stlouisfed.org/">FRED</a>.</li><li>Rupee conversion: ECB reference rates via Frankfurter.</li></ul><p class="meta">Download the data from the <a href="/api/" style="text-decoration:underline">data API</a>.</p></section>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/markets.js?v=${Date.now()}" defer></script>`;
}
const monthName = m => { const [y, mm] = m.split('-'); return new Date(Date.UTC(+y, +mm - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
