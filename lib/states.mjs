import { esc, inr } from './charts.mjs';

export function statesPage(S, { pageHead }) {
  const ind = S.indicators;
  const fmt = (i, v) => v == null ? '—' : i.fmt === 'inr' ? '₹' + inr(v) : i.fmt === 'pct2' ? v.toFixed(2) + '%' : v.toFixed(1) + '%';
  const head = `<tr><th data-k="name">State</th>${ind.map(i => `<th data-k="${i.id}" title="${esc(i.def)}">${esc(i.short)}<small>${esc(i.year)}</small></th>`).join('')}</tr>`;
  const body = [...S.states].sort((a, b) => a.name.localeCompare(b.name)).map(s => `<tr data-code="${s.code}"><th scope="row">${esc(s.name)}</th>${ind.map(i => `<td data-v="${s[i.id] ?? ''}">${fmt(i, s[i.id])}</td>`).join('')}</tr>`).join('');
  const allRow = `<tr class="lead"><th scope="row">All India / all states</th>${ind.map(i => `<td>${S.allIndia[i.id] != null ? fmt(i, S.allIndia[i.id]) : '—'}</td>`).join('')}</tr>`;
  const opts = sel => ind.map(i => `<option value="${i.id}"${i.id === sel ? ' selected' : ''}>${esc(i.label)} (${esc(i.year)})</option>`).join('');
  return pageHead('India by State', 'India by State', 'Thirty-one states and union territories compared on income, growth, prices and the health of their budgets. Pick a measure to colour the map, or plot any two against each other.') +
  `<div class="wrap" id="states">
  <div class="st-bar"><label for="st-ind">Colour the map by</label><select id="st-ind">${opts('pcIncome')}</select><span class="meta" id="st-def"></span></div>
  <div class="st-grid">
   <div><div id="st-map" class="st-map" aria-label="Tile map of Indian states"></div><div class="st-legend" id="st-legend"></div>
   <p class="meta">Each tile is one state, placed roughly where it sits on the map. Tiles are the same size whatever the state's population. Grey means no figure is published for that year.</p></div>
   <div><h2 class="col-title">Ranking</h2><ol class="st-rank" id="st-rank"></ol></div>
  </div>

  <section class="xr-sec"><h2 class="col-title">Plot two measures</h2>
   <div class="st-bar"><label for="st-x">Across</label><select id="st-x">${opts('pcIncome')}</select><label for="st-y">Up</label><select id="st-y">${opts('debt')}</select><span class="meta" id="st-r"></span></div>
   <div class="chart-wrap"><div id="st-scatter"></div></div>
   <p class="meta">The dashed line is a least-squares fit. A correlation across states says nothing about cause: richer states differ from poorer ones in many ways at once.</p>
  </section>

  <section class="xr-sec"><h2 class="col-title">All figures</h2>
  <div class="tbl-wrap"><table class="xr-table st-table" id="st-table"><thead>${head}</thead><tbody>${body}${allRow}</tbody></table></div>
  <p class="meta">Click a column heading to sort. “All India” uses per capita net national income for income, the national CPI for inflation, and the all-states aggregate for the fiscal measures.</p></section>

  <section class="xr-sec"><h2 class="col-title">Definitions and sources</h2>
  <dl class="xr-extra">${ind.map(i => `<dt>${esc(i.label)}</dt><dd>${esc(i.def)} <a href="${esc(S.sources[i.src].url)}" style="text-decoration:underline">${esc(S.sources[i.src].name)}</a></dd>`).join('')}</dl>
  <p class="meta" style="margin-top:12px">State income figures are on the 2011-12 base and are not yet revised to the new 2022-23 national accounts base. Several states have not yet published 2025-26 estimates, so 2024-25 is used for all. Checked ${esc(S.checked)}.</p></section>
  </div>
  <script>window.__STATES=${JSON.stringify(S).replace(/</g, '\\u003c')};</script>`;
}
