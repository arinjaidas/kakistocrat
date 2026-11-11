const scSection = (SC, pos) => {
  if (!SC) return '';
  const P = Object.fromEntries((pos || []).map(p => [p.name, p])), max = Math.log10(SC.states[0].usd), min = Math.log10(3);
  const shade = v => { const t = Math.max(0, Math.min(1, (Math.log10(v) - min) / (max - min))); return `rgb(${Math.round(244 - t * 214)},${Math.round(242 - t * 200)},${Math.round(237 - t * 150)})`; };
  const cols = Math.max(...(pos || []).map(p => p.col)) + 1, rows = Math.max(...(pos || []).map(p => p.row)) + 1;
  const tiles = SC.states.filter(s => P[s.name]).map(s => { const p = P[s.name], bg = shade(s.usd), dark = Math.log10(s.usd) > (min + max) / 2;
    return `<div class="sc-t" style="grid-column:${p.col + 1};grid-row:${p.row + 1};background:${bg};color:${dark ? '#fff' : '#15171A'}" title="${s.name}: $${s.usd} billion (${s.year}); ${s.country}: $${s.countryUsd} billion"><b>${p.code}</b><span>${s.country}</span><small>$${Math.round(s.usd)}bn</small></div>`; }).join('');
  const top = SC.states[0].usd;
  const list = SC.states.map(s => `<li><span class="n">${s.name}${s.year !== '2024-25' ? ` <small>(${s.year})</small>` : ''}</span><span class="bar"><i style="width:${(s.usd / top * 100).toFixed(1)}%"></i></span><span class="v">$${s.usd >= 10 ? Math.round(s.usd) : s.usd.toFixed(1)}bn</span><span class="c">≈ ${s.country} <small>$${s.countryUsd >= 10 ? Math.round(s.countryUsd) : s.countryUsd}bn</small></span></li>`).join('');
  return `<section class="xr-sec ig"><div class="ig-head"><div><span class="kicker">States as countries</span><h2>If India’s states were countries</h2><p class="dek sm">Each state’s economy (gross state domestic product, converted to dollars at that year’s average exchange rate) next to the country closest to it in size. Maharashtra’s economy, at about $${Math.round(SC.states[0].usd)} billion, is the size of ${SC.states[0].country}’s; India as a whole was $${(SC.indiaUsd / 1000).toFixed(2)} trillion in 2024-25.</p></div></div>
   <div class="sc-wrap"><div class="sc-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr));grid-template-rows:repeat(${rows},auto)">${tiles}</div><ol class="sc-list">${list}</ol></div>
   <p class="meta">State figures are for 2024-25 except where shown; they are compared with country GDP for the same year (IMF, calendar year, except India’s financial year). Rupees converted at $1 = ₹${SC.fx} for 2024-25 (financial-year average). Tile positions are a rough map, not geography. Sources: ${SC.sources.map(x => `<a href="${x.url}">${x.name}</a>`).join('; ')}.</p></section>`;
};

export function infographicsPage({ pageHead, year, basket, sc, statePos }) {
  const B = basket, food = B?.divisions.find(d => /^Food/.test(d.name));
  return pageHead('Infographics', 'India in pictures', 'Big, interactive graphics built from official data. Hover for numbers; every chart can be saved as an image.') + `<div class="wrap">
  <section class="xr-sec ig"><div class="ig-head"><div><span class="kicker">Union Budget</span><h2>Where the rupee comes from, and where it goes</h2><p class="dek sm">Every rupee the Centre handles in 2026-27, by source and by use. Almost a quarter is borrowed; a fifth goes on interest.</p></div><button class="btn ghost ig-save" data-for="ig-rupee" type="button">Save image</button></div>
   <div id="ig-rupee" class="ec" style="height:560px"></div><p class="meta" id="ig-rupee-note"></p></section>

  ${B ? `<section class="xr-sec ig"><div class="ig-head"><div><span class="kicker">Inflation</span><h2>What’s in the inflation basket, and what’s driving it</h2><p class="dek sm">India’s consumer price index splits household spending into 12 groups. Each box is sized by its share of the average budget and coloured by its inflation rate in ${B.month}. Headline inflation was ${B.headline.toFixed(2)}%; food and drink, ${food ? food.weight.toFixed(1) : ''}% of the basket, rose ${food ? food.inflation.toFixed(2) : ''}%.</p></div><button class="btn ghost ig-save" data-for="ig-cpi" type="button">Save image</button></div>
   <div id="ig-cpi" class="ec" style="height:520px"></div>
   <div class="mk-two" style="align-items:start;margin-top:18px"><div><h3 class="sub-h">Contribution to headline inflation, percentage points</h3><div id="ig-cpic" class="ec" style="height:400px"></div></div><div><h3 class="sub-h">The month’s biggest movers among items</h3><div id="ig-cpii" class="ec" style="height:400px"></div></div></div>
   <p class="meta">Contribution is weight × inflation, an approximation that sums to ${(B.divisions.reduce((a, d) => a + d.weight * d.inflation, 0) / 100).toFixed(2)} points against the official ${B.headline.toFixed(2)}%. ${B.status} figures, all-India combined, CPI base 2024=100. Item movers are the highest- and lowest-inflation items MoSPI lists in its release, with their basket weights. Sources: ${B.sources.map(s => `<a href="${s.url}">${s.name}</a>`).join('; ')}.</p></section>` : ''}

  ${scSection(sc, statePos)}
  <section class="xr-sec ig"><div class="ig-head"><div><span class="kicker">World economy</span><h2>The race to the top: the biggest economies, 1990 to ${year + 5}</h2><p class="dek sm">GDP in current US dollars for India and 13 other economies, year by year. Press play. Years from ${year} are IMF projections.</p></div><div class="mk-ctrl"><button class="btn" id="ig-play" type="button">Play</button><input type="range" id="ig-year" min="1990" max="${year + 5}" value="${year}" style="width:200px" aria-label="Year"><b id="ig-yl" style="font:600 20px var(--mono)">${year}</b><button class="btn ghost ig-save" data-for="ig-race" type="button">Save image</button></div></div>
   <div id="ig-race" class="ec" style="height:520px"></div></section>

  <section class="xr-sec ig"><div class="ig-head"><div><span class="kicker">Peers</span><h2>Growth against inflation, with economy size</h2><p class="dek sm">Each bubble is an economy, sized by GDP. Top left is the sweet spot: fast growth, low inflation.</p></div><div class="mk-ctrl"><select id="ig-by" aria-label="Year">${Array.from({ length: 12 }, (_, i) => year + 3 - i).map(y => `<option${y === year ? ' selected' : ''}>${y}</option>`).join('')}</select><button class="btn ghost ig-save" data-for="ig-bub" type="button">Save image</button></div></div>
   <div id="ig-bub" class="ec" style="height:520px"></div></section>

  <section class="xr-sec ig"><div class="ig-head"><div><span class="kicker">Public debt</span><h2>Government debt and deficits: India among its peers</h2><p class="dek sm">General government gross debt against the overall deficit, % of GDP. India's figures cover the Centre and states together.</p></div><button class="btn ghost ig-save" data-for="ig-debt" type="button">Save image</button></div>
   <div id="ig-debt" class="ec" style="height:480px"></div></section>

  <section class="xr-sec"><h2 class="col-title">Sources</h2><ul class="src"><li><a href="https://doe.gov.in/files/whats_new_documents/budget_at_a_glance.pdf">Budget at a Glance 2026-27</a>, Ministry of Finance.</li><li><a href="https://www.imf.org/external/datamapper/">IMF World Economic Outlook</a> via the DataMapper API: GDP in US dollars, real growth, inflation, government debt and net lending. India on a fiscal-year basis. Years from ${year} are projections.</li></ul><p class="meta">Data on the <a href="/api/" style="text-decoration:underline">data API</a>.</p></section>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script>window.__IGYEAR=${year};</script>
  <script src="/infographics.js?v=${Date.now()}" defer></script>`;
}
