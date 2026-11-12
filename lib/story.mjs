// Scrolling data story: the Strait of Hormuz closure and India. Every number in the text is computed from the site's data at build time,
// so the story stays current; the words describe the data and nothing more.
import { esc } from './charts.mjs';

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ld = d => `${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const mean = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null; };

export function hormuzStory(MK, SD, { pageHead, trade }) {
  const cp = MK.portwatch?.chokepoints, H = cp?.['Strait of Hormuz']; if (!H || !SD['fred-dcoilbrenteu']) return null;
  const win = (c, a, b, k = 'total') => mean(c.d.map((d, i) => d >= a && d <= b ? c[k][i] : null));
  const at = (c, d, k = 'total') => { const i = c.d.indexOf(d); return i >= 0 ? c[k][i] : null; };
  const SHUT = '2026-03-01', PRE = ['2026-01-01', '2026-02-27'], last = H.d.at(-1);
  const pre = win(H, ...PRE), post = win(H, '2026-03-02', last), year = win(H, '2025-03-01', '2025-10-31');
  const preT = win(H, ...PRE, 'tanker'), postT = win(H, '2026-03-02', last, 'tanker');
  const d28 = at(H, '2026-02-28'), d02 = at(H, '2026-03-02'), lastV = H.total.at(-1);
  const B = SD['fred-dcoilbrenteu'], bAt = d => { let i = B.d.findLastIndex(x => x <= d); return i >= 0 ? [B.d[i], B.v[i]] : null; };
  const b0 = bAt('2026-02-27'), bPk = B.d.map((d, i) => [d, B.v[i]]).filter(([d]) => d >= SHUT).reduce((m, x) => x[1] > m[1] ? x : m, [null, -1]), bL = [B.d.at(-1), B.v.at(-1)];
  const R = SD['fx-usdinr'], rAt = d => { let i = R.d.findLastIndex(x => x <= d); return [R.d[i], R.v[i]]; }, r0 = rAt('2026-02-27'), rL = [R.d.at(-1), R.v.at(-1)];
  const rupBar = (b, r) => b * r; // rupees per barrel
  const others = ['Cape of Good Hope', 'Bab el-Mandeb Strait', 'Suez Canal', 'Malacca Strait'].filter(n => cp[n]).map(n => ({ n, pre: win(cp[n], ...PRE), post: win(cp[n], '2026-03-02', last) }));
  const gulf = trade ? [['SAU', 'Saudi Arabia'], ['ARE', 'UAE'], ['IRQ', 'Iraq'], ['QAT', 'Qatar'], ['KWT', 'Kuwait'], ['OMN', 'Oman'], ['BHR', 'Bahrain'], ['IRN', 'Iran']].map(([k, n]) => ({ n, v: trade.partners[k]?.M?.[String(trade.years.at(-1))] || 0 })).filter(x => x.v) : [];
  const fuel = trade ? (() => { const ks = ['SAU', 'ARE', 'IRQ', 'QAT', 'KWT', 'OMN'].filter(k => trade.partnerChapters?.[k]?.M); const tot = ks.reduce((a, k) => a + Object.values(trade.partnerChapters[k].M).reduce((x, y) => x + y, 0), 0), f = ks.reduce((a, k) => a + (trade.partnerChapters[k].M['27'] || 0), 0); return ks.length && tot ? { share: f / tot * 100, names: ks } : null; })() : null;
  const gy = trade?.years.at(-1), gsum = gulf.reduce((a, x) => a + x.v, 0), gshare = trade ? gsum / trade.world.M[String(gy)] * 100 : null;
  const f0 = (v, d = 0) => v == null ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pc = (a, b) => (a / b - 1) * 100;

  const steps = [
    { chart: 'h-long', kick: 'The strait', text: `In the eight months to October 2025, an average of ${f0(year)} ships a day passed through the Strait of Hormuz, the 33-kilometre-wide channel between Iran and Oman. In January and February 2026 the average was ${f0(pre)}.` },
    { chart: 'h-shut', kick: 'The closure', text: `On 28 February ${f0(d28)} ships crossed. On 2 March, ${f0(d02)}. Shipping through the strait had all but stopped.` },
    { chart: 'h-since', kick: 'Since then', text: `From 2 March to ${ld(last)}, transits averaged ${f0(post, 1)} a day, ${f0(100 - post / pre * 100)}% below the level of January and February. The latest count, for ${ld(last)}, is ${f0(lastV)}.` },
    { chart: 'h-tank', kick: 'Tankers', text: `Tankers, which carry crude oil, oil products and gas, averaged ${f0(preT, 1)} a day in January and February and ${f0(postT, 1)} a day since the closure.` },
    { chart: 'brent', kick: 'Oil', text: `Brent crude was $${f0(b0[1], 2)} a barrel on ${ld(b0[0])}. It peaked at $${f0(bPk[1], 2)} on ${ld(bPk[0])}, ${f0(pc(bPk[1], b0[1]))}% higher, and was $${f0(bL[1], 2)} on ${ld(bL[0])}.` },
    { chart: 'inr', kick: 'The rupee', text: `The rupee was ${f0(r0[1], 2)} to the dollar on ${ld(r0[0])} and ${f0(rL[1], 2)} on ${ld(rL[0])}, ${rL[1] > r0[1] ? `${f0(pc(rL[1], r0[1]), 1)}% weaker` : `${f0(-pc(rL[1], r0[1]), 1)}% stronger`}.` },
    { chart: 'rbar', kick: 'India’s oil bill', text: `India pays for oil in dollars. In rupees, a barrel of Brent cost about ₹${f0(rupBar(b0[1], r0[1]))} before the closure and about ₹${f0(rupBar(bL[1], rL[1]))} at the latest prices, ${f0(pc(rupBar(bL[1], rL[1]), rupBar(b0[1], r0[1])))}% more.` },
    ...(gulf.length ? [{ chart: 'gulf', kick: 'Where India buys', text: `In ${gy}, before the closure, India imported $${f0(gsum / 1e9, 1)}bn of goods from the Gulf states on this chart, ${f0(gshare, 1)}% of all its imports. ${fuel ? `Mineral fuels, oils and gas (HS chapter 27) made up ${f0(fuel.share)}% of India’s imports from ${fuel.names.map(k => ({ SAU: 'Saudi Arabia', ARE: 'the UAE', IRQ: 'Iraq', QAT: 'Qatar', KWT: 'Kuwait', OMN: 'Oman' })[k]).join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : ''}` }] : []),
    { chart: 'routes', kick: 'Other routes', text: others.map(o => `${o.n}: ${f0(o.pre)} a day before, ${f0(o.post)} since`).join('; ') + '. Transits through the other main chokepoints, January–February average against the average since 2 March.' },
  ];
  const payload = {
    shut: SHUT, H: { d: H.d, t: H.total, k: H.tanker }, brent: { d: B.d.filter(d => d >= '2025-06-01'), v: B.v.filter((_, i) => B.d[i] >= '2025-06-01') },
    inr: { d: R.d.filter(d => d >= '2025-06-01'), v: R.v.filter((_, i) => R.d[i] >= '2025-06-01') }, gulf, routes: Object.fromEntries(['Strait of Hormuz', ...others.map(o => o.n)].map(n => [n, { d: cp[n].d, v: cp[n].total }])),
  };
  return pageHead('Data story', 'Hormuz, in numbers', `What happened when the Strait of Hormuz closed on 1 March 2026, told only with data: ship counts from IMF PortWatch, oil prices, the rupee and India’s trade. The numbers update with every build; last ship count ${esc(ld(last))}.`) + `<div class="wrap st-wrap">
  <div class="st-graphic"><div id="st-chart" class="st-chart"></div><p class="st-cap" id="st-cap"></p></div>
  <div class="st-steps">${steps.map((s, i) => `<section class="st-step" data-chart="${s.chart}" data-i="${i}"><span class="kicker">${esc(s.kick)}</span><p>${esc(s.text)}</p></section>`).join('')}
   <section class="st-step st-end" data-chart="routes"><span class="kicker">Follow it</span><p>Ship counts update daily on <a href="/hormuz/">Chokepoint watch</a>. Try a different oil price or exchange rate in the <a href="/tools/shock-lab/">scenario engine</a>, or open the series: <a href="/s/pw-strait-of-hormuz/">Hormuz transits</a>, <a href="/s/fred-dcoilbrenteu/">Brent</a>, <a href="/s/fx-usdinr/">the rupee</a>.</p>
   <p class="meta">Sources: IMF PortWatch (daily transits from satellite ship-tracking), FRED/EIA (Brent), ECB (rupee), UN Comtrade (India’s imports by partner). The date of the closure follows the PortWatch counts: ${f0(d28)} transits on 28 February and ${f0(d02)} on 2 March.</p></section>
  </div></div>
  <script>window.__ST=${JSON.stringify(payload)};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/story.js?v=${Date.now()}" defer></script>`;
}
