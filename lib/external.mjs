// External sector lab: reserves, the rupee, money-market rates and forward premia from the RBI's weekly supplement,
// annual sustainability indicators from the World Bank and IMF, and the 2013 and 2026 FCNR(B) episodes side by side.
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';

const f = (v, d = 1) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const longD = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function externalPage(MK, { pageHead, episodes }) {
  const FX = MK.rbiFx?.weeks || {}, RT = MK.rbiRates?.weeks || {}, W = MK.world;
  const fxD = Object.keys(FX), last = fxD.at(-1), L = FX[last] || {};
  const yAgo = fxD.find(d => d >= new Date(new Date(last).getTime() - 365 * 864e5).toISOString().slice(0, 10));
  const peak = fxD.reduce((a, d) => (FX[d].total > (FX[a]?.total || 0) ? d : a), fxD[0]);
  const rtD = Object.keys(RT), rl = RT[rtD.at(-1)] || {};
  const ind = (src, code) => W?.[src]?.[code]?.data?.IND || {};
  const latestY = o => Object.keys(o).filter(y => +y <= new Date().getUTCFullYear()).sort().at(-1);
  const cad = ind('imf', 'BCA_NGDPD'), cadY = latestY(cad);
  const imp = ind('wdi', 'NE.IMP.GNFS.ZS');
  const cards = [
    ['Foreign exchange reserves', `$${f(L.total / 1000, 1)} bn`, yAgo ? `${L.total >= FX[yAgo].total ? '+' : '−'}$${f(Math.abs(L.total - FX[yAgo].total) / 1000, 1)} bn on a year ago` : '', `RBI, week to ${longD(last)}`, sparkSVG(fxD.slice(-104).map(d => FX[d].total), 120, 32, '#1D4ED8')],
    ['Record high', `$${f(FX[peak]?.total / 1000, 1)} bn`, `${f((L.total / FX[peak]?.total - 1) * 100, 1)}% from the peak`, `week to ${longD(peak)}`, ''],
    ['Gold in reserves', `${f(L.gold / L.total * 100, 1)}%`, `$${f(L.gold / 1000, 1)} bn`, `RBI, ${longD(last)}`, sparkSVG(fxD.slice(-104).map(d => FX[d].gold / FX[d].total * 100), 120, 32, '#B45309')],
    ['Current account', cadY ? `${f(cad[cadY], 1)}% of GDP` : '—', cadY ? `FY${cadY}-${String(+cadY + 1).slice(2)} (IMF)` : '', 'IMF World Economic Outlook', ''],
    ['3-month forward premium', rl.fwd3m != null ? `${f(rl.fwd3m, 2)}%` : '—', 'annualised cost of hedging dollars', `FBIL, ${rtD.length ? longD(rtD.at(-1)) : ''}`, sparkSVG(rtD.slice(-104).map(d => RT[d].fwd3m), 120, 32, '#B42318')],
    ['10-year G-Sec', rl.gsec10 != null ? `${f(rl.gsec10, 2)}%` : '—', rl.call != null ? `call money ${f(rl.call, 2)}%` : '', `FBIL/RBI, ${rtD.length ? longD(rtD.at(-1)) : ''}`, sparkSVG(rtD.slice(-104).map(d => RT[d].gsec10), 120, 32, '#15171A')],
  ].map(([l, v, c, s, sp]) => `<div class="mk-card"><span class="lbl">${esc(l)}</span><span class="v">${v}</span><span class="c">${esc(c)}</span>${sp}<span class="sub">${esc(s)}</span></div>`).join('');
  const epBox = e => `<article class="xt-ep"><h3>${esc(e.name)}</h3><ul>${e.facts.map(x => `<li>${esc(x.text)} <a href="${esc(x.url)}">${esc(x.source)}</a></li>`).join('')}</ul></article>`;
  const annual = [['imf', 'BCA_NGDPD', 'Current account (IMF)', '% of GDP'], ['wdi', 'FI.RES.TOTL.MO', 'Reserves cover', 'months of imports'], ['wdi', 'DT.DOD.DSTC.IR.ZS', 'Short-term debt', '% of reserves'], ['wdi', 'DT.DOD.DECT.GN.ZS', 'External debt', '% of GNI'],
    ['wdi', 'DT.TDS.DECT.EX.ZS', 'Debt service', '% of exports'], ['wdi', 'BX.KLT.DINV.CD.WD', 'FDI inflows', 'US$ bn'], ['wdi', 'BX.PEF.TOTL.CD.WD', 'Portfolio equity inflows', 'US$ bn'], ['wdi', 'BX.TRF.PWKR.CD.DT', 'Remittances', 'US$ bn']]
    .filter(([s, c]) => Object.keys(ind(s, c)).length);
  const payload = { annual: annual.map(([s, c, n, u]) => ({ n, u, d: Object.fromEntries(Object.entries(ind(s, c)).filter(([y]) => +y >= 1995).map(([y, v]) => [y, u.startsWith('US$') ? +(v / 1e9).toFixed(2) : +(+v).toFixed(2)])) })), episodes: episodes.episodes.map(e => ({ id: e.id, name: e.name, start: e.start, window: e.window, anchor: e.anchor })) };
  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">External sector lab</span><h1>Reserves, the rupee and the price of dollars</h1>
   <p class="dek sm">India’s foreign exchange reserves every week since ${fxD.length ? longD(fxD[0]) : '1998'}, money-market rates and the cost of hedging the dollar from the RBI’s Weekly Statistical Supplement, and the annual measures of external sustainability. The 2013 taper tantrum and the 2026 oil shock are marked; both ended with an FCNR(B) deposit window.</p></div></div>
   <div class="mk-cards">${cards}</div></div></div>
  <div class="wrap">
   <section class="xr-sec"><div class="mk-chart-head"><h2 class="col-title" style="margin:0">Foreign exchange reserves, weekly</h2><div class="mk-ctrl"><span class="seg" id="xt-range">${['5Y', '10Y', 'All'].map(r => `<button type="button" data-r="${r}"${r === 'All' ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span></div></div>
    <div id="xt-res" class="ec" style="height:440px"></div><p class="meta">Stacked: foreign currency assets, gold, SDRs and the reserve position in the IMF, US$ billion. Shaded: the 2013 and 2026 FCNR(B) swap windows. <a href="/s/rbi-fx-total/">Series page →</a></p></section>
   <section class="xr-sec"><h2 class="col-title">Two episodes, side by side</h2><div class="mk-two" style="align-items:start"><div><h3 class="sub-h">Reserves around the window announcement (=100)</h3><div id="xt-ep-res" class="ec" style="height:340px"></div></div><div><h3 class="sub-h">The rupee around the announcement (rupees per dollar, =100)</h3><div id="xt-ep-inr" class="ec" style="height:340px"></div></div></div>
    <p class="meta">Weeks before and after the RBI announced each FCNR(B) window (4 September 2013 and 5 June 2026). Both are rebased to 100 in the week of the announcement, so a rise in the rupee line means a weaker rupee. The rupee is the RBI/FBIL reference rate.</p>
    <div class="xt-eps">${episodes.episodes.map(epBox).join('')}</div></section>
   <section class="xr-sec"><div class="mk-chart-head"><h2 class="col-title" style="margin:0">Money markets and the cost of dollars</h2><div class="mk-ctrl"><span class="seg" id="xt-r-range">${['3Y', '10Y', 'All'].map(r => `<button type="button" data-r="${r}"${r === '10Y' ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span></div></div>
    <div id="xt-rates" class="ec" style="height:400px"></div><p class="meta">Weekly: call money rate, 91-day Treasury bill, 10-year G-Sec and the annualised 3-month forward premium on the dollar. When the forward premium jumps, hedging foreign currency debt gets dearer, which is what the concessional swap windows subsidise.</p></section>
   <section class="xr-sec"><h2 class="col-title">Is the external position sustainable? The annual measures</h2><div class="xt-grid" id="xt-annual"></div><p class="meta">India, financial years for IMF data and calendar years for World Bank data. Sources: IMF World Economic Outlook; World Bank World Development Indicators.</p></section>
   <section class="xr-sec"><h2 class="col-title">Use the data</h2><ul class="src"><li>Weekly reserves and rates: <a href="/api/markets/rbi_fx.json">/api/markets/rbi_fx.json</a> and <a href="/api/markets/rbi_rates.json">/api/markets/rbi_rates.json</a>, built from the RBI Weekly Statistical Supplement, Tables 2 and 4 (one value per issue: the latest week).</li>
    <li>Every series here has its own page and chart image: <a href="/s/rbi-fx-total/">reserves</a>, <a href="/s/rbi-fwd3m/">3-month forward premium</a>, <a href="/s/rbi-call/">call rate</a>, <a href="/s/rbi-gsec10/">10-year G-Sec</a>, <a href="/s/rbi-inr/">rupee reference rate</a>.</li>
    <li>Compare anything in the <a href="/charts/#s=rbi-fx-total:lvl,rbi-inr:lvl&r=All">chart workbench</a>, or run a shock in the <a href="/tools/shock-lab/">what-if engine</a>.</li></ul></section>
  </div>
  <script>window.__XT=${JSON.stringify(payload)};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/external.js?v=${Date.now()}" defer></script>`;
}
