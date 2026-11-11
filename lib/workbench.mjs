import { esc } from './charts.mjs';
export function workbenchPage(catalog, { pageHead }) {
  const groups = [...new Set(catalog.map(c => c.group))];
  return `<div class="wb">
  <aside class="wb-side"><div class="wb-side-head"><span class="kicker">Data library</span><b>${catalog.length} series</b></div>
   <label class="sr" for="wb-q">Search series</label><input id="wb-q" type="search" placeholder="Search: rupee, Nifty IT, copper, India debt…" autocomplete="off">
   <div class="wb-list" id="wb-list">${groups.map(g => `<details${/Indian equity|Currencies|India: annual/.test(g) ? ' open' : ''}><summary>${esc(g)} <small>${catalog.filter(c => c.group === g).length}</small></summary><ul>${catalog.filter(c => c.group === g).map(c => `<li><button type="button" data-id="${c.id}" title="${esc(c.source)} · ${c.first} to ${c.last}">${esc(c.name)}<small>${esc(c.freq)} · ${esc(c.unit)}</small></button></li>`).join('')}</ul></details>`).join('')}</div></aside>
  <section class="wb-main">
   <div class="wb-top"><div><span class="kicker">Chart workbench</span><h1>Plot anything against anything</h1></div>
    <div class="mk-ctrl"><span class="seg" id="wb-range">${['1Y', '3Y', '5Y', '10Y', 'Max'].map(r => `<button type="button" data-r="${r}"${r === '3Y' ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span>
    <label class="chk"><input type="checkbox" id="wb-dual" checked> Two axes</label><label class="chk"><input type="checkbox" id="wb-ev" checked> Events</label></div></div>
   <div class="wb-chips" id="wb-chips"></div>
   <div id="wb-chart" class="ec" style="height:min(62vh,560px)"></div>
   <div class="wb-actions"><button class="btn" id="wb-link" type="button">Copy link to this chart</button><button class="btn ghost" id="wb-csv" type="button">Download CSV</button><button class="btn ghost" id="wb-png" type="button">Download PNG</button><span class="meta" id="wb-note"></span></div>
   <div class="assume"><b>How to use it</b><ul><li>Pick up to six series from the library. Each can be shown as its level, its change on a year earlier, or rebased to 100 at the start of the range.</li><li>Series with different units go on two axes. Mixed frequencies (daily, monthly, annual) share one time axis.</li><li>Scroll or drag on the chart to zoom. The link reproduces exactly what you see.</li><li>Every series names its source; IMF figures for the current year and beyond are projections. All data is downloadable from the <a href="/api/" style="text-decoration:underline">data API</a>.</li></ul></div>
  </section></div>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/workbench.js?v=${Date.now()}" defer></script>`;
}
