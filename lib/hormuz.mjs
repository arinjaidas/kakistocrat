// Chokepoint watch: ship transits through Hormuz, Bab el-Mandeb, Suez, the Cape and Malacca (IMF PortWatch).
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';

const f = (v, d = 0) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const longD = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const mean = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

export const SHORT = { 'Strait of Hormuz': 'Hormuz', 'Bab el-Mandeb Strait': 'Bab el-Mandeb', 'Suez Canal': 'Suez', 'Cape of Good Hope': 'Cape of Good Hope', 'Malacca Strait': 'Malacca' };
const WHY = {
  'Strait of Hormuz': 'The only sea route out of the Persian Gulf: crude and LNG from Iraq, Kuwait, Qatar, the UAE and Saudi Arabia’s Gulf ports.',
  'Bab el-Mandeb Strait': 'The southern gate of the Red Sea, on the route between Asia and Europe via Suez.',
  'Suez Canal': 'Links the Red Sea and the Mediterranean; the short route from India to Europe.',
  'Cape of Good Hope': 'The long way round Africa, used when ships avoid the Red Sea.',
  'Malacca Strait': 'The main route between the Indian Ocean and East Asia.',
};

/** Summary statistics per chokepoint. */
export function chokeStats(PW) {
  const out = [];
  for (const [name, c] of Object.entries(PW?.chokepoints || {})) {
    const n = c.d.length, last7 = c.total.slice(-7), last7T = c.tanker.slice(-7);
    const yr = c.d.map((d, i) => d.startsWith('2025') ? c.total[i] : null), yrT = c.d.map((d, i) => d.startsWith('2025') ? c.tanker[i] : null);
    const avg7 = mean(last7), base = mean(yr);
    out.push({ name, short: SHORT[name] || name, why: WHY[name] || '', last: c.d[n - 1], avg7, avg7T: mean(last7T), base, baseT: mean(yrT), chg: base ? (avg7 / base - 1) * 100 : null,
      spark: Array.from({ length: 26 }, (_, k) => mean(c.total.slice(Math.max(0, n - 7 * (26 - k)), n - 7 * (25 - k)))) });
  }
  return out;
}

export function hormuzPage(M, { pageHead }) {
  const S = chokeStats(M.portwatch); if (!S.length) return pageHead('Chokepoints', 'Chokepoint watch', 'Data unavailable.');
  const H = S.find(s => s.name === 'Strait of Hormuz') || S[0];
  const c = M.portwatch.chokepoints[H.name];
  // Monthly averages for Hormuz, for the headline sentence
  const byM = {}; c.d.forEach((d, i) => { (byM[d.slice(0, 7)] ||= []).push(c.total[i]); });
  const months = Object.keys(byM).sort(), mAvg = Object.fromEntries(months.map(m => [m, mean(byM[m])]));
  const peakM = months.filter(m => m >= '2025-07').sort((a, b) => mAvg[b] - mAvg[a])[0];
  const brent = M.fredLast?.DCOILBRENTEU;
  const card = s => `<div class="mk-card${s === H ? ' hz-key' : ''}"><span class="lbl">${esc(s.short)}</span><span class="v">${f(s.avg7, 1)}</span><span class="c ${s.chg == null ? '' : s.chg < -10 ? 'dn' : s.chg > 10 ? 'up' : ''}">${s.chg == null ? '' : (s.chg > 0 ? '+' : '−') + Math.abs(s.chg).toFixed(0) + '% vs 2025'}</span>${sparkSVG(s.spark, 120, 32, s === H ? '#B42318' : '#15171A')}<span class="sub">ships a day, 7-day avg to ${longD(s.last)}</span></div>`;
  const mn = m => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">Chokepoint watch</span><h1>Ships through Hormuz and the world’s other oil and trade chokepoints</h1>
  <p class="dek sm">Daily counts of cargo ships and tankers passing five maritime chokepoints, estimated by the IMF from ship-tracking (AIS) signals. In the seven days to ${longD(H.last)}, an average of <b>${f(H.avg7, 1)}</b> ships a day passed through the Strait of Hormuz, against ${f(H.base, 1)} a day in 2025${peakM ? ` and ${f(mAvg[peakM], 1)} a day in ${mn(peakM)}` : ''}.${brent ? ` Brent crude was $${f(brent.last[1], 2)} a barrel on ${longD(brent.last[0])}.` : ''}</p></div></div>
  <div class="mk-cards">${S.map(card).join('')}</div></div></div>
  <div class="wrap"><a class="st-promo" href="/stories/hormuz/"><b>Read the story →</b> Hormuz, in numbers: the closure, oil, the rupee and India’s Gulf trade, told with live data</a>
  <section class="xr-sec"><div class="mk-chart-head"><h2 class="col-title" style="margin:0" id="hz-title">Strait of Hormuz: ships a day</h2><div class="mk-ctrl"><select id="hz-cp" aria-label="Chokepoint">${S.map(s => `<option value="${esc(s.name)}"${s === H ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
   <span class="seg" id="hz-range">${['3M', '6M', '1Y', 'All'].map(r => `<button type="button" data-r="${r}"${r === '1Y' ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span><label class="chk"><input type="checkbox" id="hz-brent" checked> Brent price</label></div></div>
   <div id="hz-chart" class="ec" style="height:440px"></div>
   <p class="meta" id="hz-why"></p><p class="meta">Bars: daily transits by ship type. Line: seven-day average of all transits. Dashed line (right axis): Brent crude, $ a barrel. The latest days are often revised up as more signals arrive.</p></section>
  <section class="xr-sec"><h2 class="col-title">Five chokepoints against their 2025 average</h2><div id="hz-multi" class="ec" style="height:400px"></div>
   <p class="meta">Seven-day average of daily transits as a percentage of the chokepoint’s 2025 daily average. 100 means normal traffic for 2025.</p></section>
  <section class="xr-sec"><h2 class="col-title">Tanker capacity through Hormuz</h2><div id="hz-cap" class="ec" style="height:320px"></div>
   <p class="meta">Estimated deadweight tonnage of tankers passing through each day, seven-day average, in thousand tonnes. A rough guide to how much oil and gas capacity is moving, not how much cargo is aboard.</p></section>
  <section class="xr-sec"><h2 class="col-title">Sources</h2><ul class="src"><li><a href="https://portwatch.imf.org/">IMF PortWatch</a>, Daily Chokepoint Transit Calls and Trade Volume Estimates, built from AIS ship-tracking data. Counts cover container ships, dry bulk carriers, general cargo, ro-ro and tankers.</li><li>Brent crude spot price: US Energy Information Administration via FRED.</li></ul>
   <p class="meta">See also the <a href="/tools/shock-lab/" style="text-decoration:underline">what-if engine</a>, the <a href="/commodities/" style="text-decoration:underline">commodities board</a> and the <a href="/tools/pump-price/" style="text-decoration:underline">pump price</a> breakdown. Data at <a href="/api/markets/portwatch.json" style="text-decoration:underline">/api/markets/portwatch.json</a>.</p></section>
  </div>
  <script>window.__HZ=${JSON.stringify({ why: Object.fromEntries(S.map(s => [s.name, s.why])), base: Object.fromEntries(S.map(s => [s.name, s.base])) })};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/hormuz.js?v=${Date.now()}" defer></script>`;
}
