// Rupee, rates and the external sector: one page on the rupee, the interest-rate gap with the US,
// and how India's external accounts compare with peers.
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';

const f2 = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const sg = (v, d = 2, u = '') => v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}${u}`;
const cls = v => v == null ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : '';
const fmtDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const FX_NAME = { INR: 'Indian rupee', EUR: 'Euro', GBP: 'British pound', JPY: 'Japanese yen', CNY: 'Chinese yuan', KRW: 'Korean won', IDR: 'Indonesian rupiah', MYR: 'Malaysian ringgit', PHP: 'Philippine peso', THB: 'Thai baht', SGD: 'Singapore dollar', BRL: 'Brazilian real', MXN: 'Mexican peso', ZAR: 'South African rand', TRY: 'Turkish lira' };

const EXT = [
  { id: 'BCA_NGDPD', src: 'imf', short: 'Current account', unit: '% of GDP', note: 'Positive means a surplus: the country earns more from the rest of the world than it spends. IMF projections from 2026 shown dashed.' },
  { id: 'FI.RES.TOTL.MO', src: 'wdi', short: 'Reserves cover', unit: 'months of imports', note: 'Foreign-exchange reserves (including gold) divided by monthly imports of goods and services. Three months is the traditional floor.' },
  { id: 'BX.TRF.PWKR.CD.DT', src: 'wdi', short: 'Remittances', unit: 'US$ billion', scale: 1e-9, note: 'Money sent home by workers abroad. India is the largest recipient in the world.' },
  { id: 'BX.KLT.DINV.CD.WD', src: 'wdi', short: 'FDI inflows', unit: 'US$ billion', scale: 1e-9, note: 'Net inflows of foreign direct investment, as recorded in the balance of payments.' },
  { id: 'NE.EXP.GNFS.ZS', src: 'wdi', short: 'Exports', unit: '% of GDP', note: 'Exports of goods and services as a share of GDP: a rough measure of how open an economy is.' },
  { id: 'NE.IMP.GNFS.ZS', src: 'wdi', short: 'Imports', unit: '% of GDP', note: 'Imports of goods and services as a share of GDP.' },
  { id: 'GGXWDG_NGDP', src: 'imf', short: 'Government debt', unit: '% of GDP', note: 'General government gross debt (Centre plus states for India). IMF projections from 2026 shown dashed.' },
];

/** Build the JSON the page's charts read (also published at /api/rupee.json). */
export function rupeeData(M, tape) {
  const fx = M.fx, fred = M.fred || {}, W = M.world;
  const r4 = v => v == null ? null : +Number(v).toPrecision(6);
  const fxOut = fx ? { dates: fx.dates, rates: Object.fromEntries(Object.entries(fx.rates).map(([c, a]) => [c, a.map(r4)])) } : null;
  const pick = ['DGS3MO', 'DGS2', 'DGS10', 'DGS30', 'DFF', 'T10YIE', 'DTWEXBGS', 'DEXINUS'];
  const fr = Object.fromEntries(pick.filter(k => fred[k]).map(k => [k, { label: fred[k].label, pts: fred[k].pts }]));
  const ind = id => tape.indicators.find(i => i.id === id);
  const ext = {};
  if (W) for (const e of EXT) { const s = W[e.src]?.[e.id]; if (!s) continue;
    ext[e.id] = { ...e, label: s.label, data: Object.fromEntries(Object.entries(s.data).map(([c, o]) => [c, Object.fromEntries(Object.entries(o).filter(([, v]) => v != null).map(([y, v]) => [y, +(v * (e.scale || 1)).toFixed(2)]))])) }; }
  return { fx: fxOut, fred: fr, india: { repo: ind('repo'), g10: ind('g10') }, ext, countries: W?.countries || {}, built: new Date().toISOString().slice(0, 10) };
}

export function rupeePage(M, tape, { pageHead, embed = false }) {
  const fx = M.fx; if (!fx) return pageHead('Rupee', 'The rupee', 'Data unavailable.');
  const L = fx.dates.length - 1, R = fx.rates, last = fx.dates[L];
  const at = days => { const t = new Date(last); t.setDate(t.getDate() - days); const iso = t.toISOString().slice(0, 10); const i = fx.dates.findIndex(d => d >= iso); return i < 0 ? L : i; };
  const inr = R.INR, y1 = at(365);
  // Rupee move: positive = rupee stronger (fewer rupees per dollar)
  const rupeeMove = i => (inr[i] / inr[L] - 1) * 100;
  const cross = c => inr[L] / R[c][L];
  const crossY = c => inr[y1] / R[c][y1];
  const fl = M.fredLast || {};
  const repo = tape.indicators.find(i => i.id === 'repo'), g10 = tape.indicators.find(i => i.id === 'g10');
  const us10 = fl.DGS10?.last[1], ff = fl.DFF?.last[1];
  const allTime = Math.max(...inr.filter(Boolean)), atIdx = inr.lastIndexOf(allTime);
  const card = (lbl, v, c, cc, spark, sub) => `<div class="mk-card"><span class="lbl">${lbl}</span><span class="v">${v}</span><span class="c ${cc}">${c}</span>${spark || ''}<span class="sub">${sub}</span></div>`;
  const crossCard = (c, lbl, mult = 1) => { const now = cross(c) * mult, then = crossY(c) * mult, mv = (then / now - 1) * 100;
    return card(lbl, f2(now), `${sg(mv, 1, '%')} rupee, 1 year`, cls(mv), sparkSVG(fx.dates.slice(-250).map((_, k) => inr[L - 249 + k] / R[c][L - 249 + k] * mult), 120, 32, '#1C7C99'), `ECB cross rate, ${fmtDate(last)}`); };
  const cards = [
    card('Rupees per US dollar', f2(inr[L]), `${sg(rupeeMove(y1), 1, '%')} rupee, 1 year`, cls(rupeeMove(y1)), sparkSVG(inr.slice(-250), 120, 32, '#1C7C99'), `ECB reference, ${fmtDate(last)}`),
    crossCard('EUR', 'Rupees per euro'), crossCard('GBP', 'Rupees per pound'), crossCard('JPY', 'Rupees per 100 yen', 100), crossCard('CNY', 'Rupees per yuan'),
    fl.DTWEXBGS ? card('Broad US dollar index', f2(fl.DTWEXBGS.last[1]), fl.DTWEXBGS.yago ? `${sg((fl.DTWEXBGS.last[1] / fl.DTWEXBGS.yago[1] - 1) * 100, 1, '%')}, 1 year` : '', '', sparkSVG(M.fred.DTWEXBGS.pts.slice(-250).map(p => p[1]), 120, 32, '#17202C'), `Federal Reserve, ${fmtDate(fl.DTWEXBGS.last[0])}`) : '',
    us10 != null ? card('India–US 10-year gap', `${f2(g10.latest.value - us10)} pts`, `India ${f2(g10.latest.value)}% · US ${f2(us10)}%`, '', '', `${esc(g10.latest.period)}; US ${fmtDate(fl.DGS10.last[0])}`) : '',
    ff != null ? card('Repo minus Fed funds', `${f2(repo.latest.value - ff)} pts`, `RBI ${f2(repo.latest.value)}% · Fed ${f2(ff)}%`, '', '', 'Policy rates') : '',
  ].join('');

  const extTabs = EXT.filter(e => M.world?.[e.src]?.[e.id]).map((e, i) => `<button type="button" data-x="${e.id}"${i === 0 ? ' aria-pressed="true"' : ''}>${esc(e.short)}</button>`).join('');
  const rng = (id, def, opts) => `<span class="seg" id="${id}">${opts.map(r => `<button type="button" data-r="${r}"${r === def ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span>`;

  if (embed) { const full = rupeePageFull(); const a = full.indexOf('<section class="xr-sec" id="rp-main">'), b = full.indexOf('<section class="xr-sec"><h2 class="col-title">Sources</h2>'); return { cards, sections: full.slice(a, b), scripts: '<script src="/rupee.js?v=' + Date.now() + '" defer></script>' }; }
  return rupeePageFull();
  function rupeePageFull() {
  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">Rupee &amp; external sector</span><h1>The rupee, the rate gap and India’s external accounts</h1>
  <p class="dek sm">The rupee against the dollar and 14 other currencies, the interest-rate gap with the United States, and India’s current account, reserves, remittances and investment inflows next to its peers. Rupee rates are ECB reference rates to ${fmtDate(last)}; the rupee’s weakest close in this five-year window was ${f2(allTime)} per dollar on ${fmtDate(fx.dates[atIdx])}.</p></div></div>
  <div class="mk-cards">${cards}</div></div></div>
  <div class="wrap">
  <section class="xr-sec" id="rp-main"><div class="mk-chart-head"><h2 class="col-title" style="margin:0">Rupees per dollar</h2><div class="mk-ctrl">${rng('rp-range', '1Y', ['3M', '6M', '1Y', '3Y', '5Y'])}<label class="chk"><input type="checkbox" id="rp-dxy"> Overlay the dollar index</label></div></div>
   <div id="rp-chart" class="ec" style="height:420px"></div>
   <p class="meta">Higher means a weaker rupee. Daily ECB reference rates. The dollar index overlay (right axis) is the Federal Reserve’s broad trade-weighted index: when both rise together, the rupee is falling because the dollar is strong everywhere, not because of anything specific to India.</p></section>

  <section class="xr-sec"><div class="mk-chart-head"><h2 class="col-title" style="margin:0">Currency race against the dollar</h2><div class="mk-ctrl">${rng('rc-range', '1Y', ['1M', '3M', '1Y', '3Y', '5Y'])}</div></div>
   <div class="mk-two" style="align-items:start"><div id="rc-chart" class="ec" style="height:460px"></div><div id="rc-bars" class="ec" style="height:460px"></div></div>
   <p class="meta">Each currency’s value in dollars, rebased to 100 at the start of the period, so a line above 100 means the currency gained on the dollar. The rupee is drawn in bold. Bars show the total change over the period. Click a name in the legend to hide or show it.</p></section>

  <section class="xr-sec"><h2 class="col-title">The rate gap</h2>
   <div class="mk-two" style="align-items:start">
    <div><h3 class="sub-h">US Treasury yield curve: now and a year ago, with India’s rates</h3><div id="yc-chart" class="ec" style="height:360px"></div></div>
    <div><h3 class="sub-h">US yields and the Fed funds rate</h3><div id="us-chart" class="ec" style="height:360px"></div></div>
   </div>
   <p class="meta">India’s points are the RBI repo rate (${f2(repo.latest.value)}%, ${esc(repo.latest.period.toLowerCase())}) and the 10-year government bond yield (${f2(g10.latest.value)}%, ${esc(g10.latest.period.toLowerCase())}). A narrower gap with US yields makes Indian bonds less attractive to foreign investors and puts pressure on the rupee; a wider gap pulls money in.</p></section>

  <section class="xr-sec"><div class="mk-chart-head"><h2 class="col-title" style="margin:0">India’s external accounts against its peers</h2><div class="mk-ctrl"><span class="seg" id="ex-tabs">${extTabs}</span></div></div>
   <p class="meta" id="ex-note" style="margin:6px 0 10px"></p>
   <div class="mk-two" style="align-items:start"><div><h3 class="sub-h" id="ex-h1">India over time</h3><div id="ex-line" class="ec" style="height:380px"></div></div><div><h3 class="sub-h" id="ex-h2">Peers, latest year</h3><div id="ex-bars" class="ec" style="height:380px"></div></div></div>
   <p class="meta">Peers: China, Indonesia, Vietnam, Bangladesh, the Philippines, Brazil, Mexico, South Africa and Turkey, with the US, Germany, Japan and the UK for scale. IMF years are calendar years except India’s, which are financial years (2025 means 2025-26).</p></section>

  <section class="xr-sec"><h2 class="col-title">Sources</h2><ul class="src">
   <li>Exchange rates: European Central Bank reference rates via <a href="https://frankfurter.dev/">Frankfurter</a>. Cross rates computed from rates against the dollar.</li>
   <li>US Treasury yields, Fed funds rate, 10-year breakeven inflation and the broad dollar index: Federal Reserve Board and US Treasury, via <a href="https://fred.stlouisfed.org/">FRED</a>.</li>
   <li>India’s repo rate and 10-year yield: RBI and market closes, as recorded on the <a href="/s/india-repo/">repo</a> and <a href="/s/nse-nifty-10-yr-benchmark-g-sec/">10-year yield</a> pages.</li>
   <li>Current account and government debt: <a href="https://www.imf.org/external/datamapper/">IMF World Economic Outlook DataMapper</a>. Reserves, remittances, FDI, exports and imports: <a href="https://data.worldbank.org/">World Bank World Development Indicators</a>.</li>
  </ul><p class="meta">All of it is downloadable from the <a href="/api/" style="text-decoration:underline">data API</a> at <code>/api/rupee.json</code>, or chart any series in the <a href="/charts/" style="text-decoration:underline">workbench</a>.</p></section>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/rupee.js?v=${Date.now()}" defer></script>`;
  }
}
