// India against the world: IMF WEO rankings for every country, any indicator, any year.
import { esc } from './charts.mjs';

const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
export function worldRank(W, ind, year, desc = true) {
  const d = W.data[ind] || {}; const rows = Object.entries(d).map(([iso, s]) => ({ iso, v: s[year] })).filter(r => r.v != null).sort((a, b) => desc ? b.v - a.v : a.v - b.v);
  const i = rows.findIndex(r => r.iso === 'IND'); return { rank: i + 1, of: rows.length, v: rows[i]?.v };
}

export function worldPage(W, { pageHead, year }) {
  if (!W) return pageHead('World', 'India against the world', 'Data unavailable.');
  const cards = [['NGDPD', 'GDP, US$', v => `$${(v / 1000).toFixed(2)} trn`], ['PPPGDP', 'GDP at PPP', v => `$${(v / 1000).toFixed(1)} trn`], ['LP', 'Population', v => `${(v / 1000).toFixed(2)} bn`], ['NGDP_RPCH', 'Real growth', v => `${v.toFixed(1)}%`], ['NGDPDPC', 'GDP per person', v => `$${Math.round(v).toLocaleString('en-IN')}`], ['PPPPC', 'Per person at PPP', v => `$${Math.round(v).toLocaleString('en-IN')}`]]
    .map(([id, l, fmt]) => { const r = worldRank(W, id, String(year)); return r.rank ? `<button class="mk-card wd-card" type="button" data-i="${id}"><span class="lbl">${l}</span><span class="v">${ord(r.rank)}</span><span class="c">of ${r.of} · ${fmt(r.v)}</span><span class="sub">IMF, ${year}</span></button>` : ''; }).join('');
  const opts = Object.entries(W.indicators).map(([k, v]) => `<option value="${k}"${k === 'NGDPD' ? ' selected' : ''}>${esc(v.label)} (${esc(v.unit)})</option>`).join('');
  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">India against the world</span><h1>Where India ranks among ${Object.keys(W.countries).length} economies</h1>
  <p class="dek sm">Every country in the IMF’s World Economic Outlook, ranked on size, income, growth, inflation, debt and the external balance. Pick an indicator and a year; India is in red. Years from ${year} onward are IMF projections, and India’s figures are for financial years (${year} means ${year}-${String(year + 1).slice(2)}).</p></div></div>
  <div class="mk-cards">${cards}</div></div></div>
  <div class="wrap">
  <section class="xr-sec"><div class="mk-chart-head"><h2 class="col-title" style="margin:0" id="wd-title">Ranking</h2><div class="mk-ctrl"><select id="wd-ind" aria-label="Indicator">${opts}</select>
   <input type="range" id="wd-year" min="1990" max="2031" value="${year}" aria-label="Year" style="width:180px"><b id="wd-yl" style="font:600 18px var(--mono)">${year}</b></div></div>
   <div class="wd-two"><div><div class="wd-rank" id="wd-rank"></div><ol class="wd-nb" id="wd-nb"></ol></div><div id="wd-bars" class="ec" style="height:560px"></div></div>
   <p class="meta" id="wd-note"></p></section>
  <section class="xr-sec"><h2 class="col-title">India’s rank over time</h2><div id="wd-line" class="ec" style="height:320px"></div><p class="meta">Rank among countries with data that year; 1 is the largest (or the highest value). Dashed: IMF projections.</p></section>
  <section class="xr-sec"><h2 class="col-title">Sources</h2><ul class="src"><li><a href="https://www.imf.org/external/datamapper/">IMF World Economic Outlook</a> via the DataMapper API, all countries, 1990–2031. Projections from ${year}.</li></ul><p class="meta">Data at <code>/api/world/&lt;indicator&gt;.json</code>, for example <a href="/api/world/NGDPD.json" style="text-decoration:underline">/api/world/NGDPD.json</a>.</p></section>
  </div>
  <script>window.__WD=${JSON.stringify({ year, indicators: W.indicators, countries: W.countries })};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/world.js?v=${Date.now()}" defer></script>`;
}
