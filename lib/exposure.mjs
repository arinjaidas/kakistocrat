import { esc } from './charts.mjs';

const PAL = ['#15171A', '#B42318', '#1D4ED8', '#0F766E', '#B45309', '#7C3AED', '#CFCBC2'];

export function exposurePage(E, { pageHead, inrRate }) {
  const c = E.crude, top = c.shares.filter(s => s.c !== 'Others');
  const hhi = Math.round(top.reduce((a, s) => a + s.v * s.v, 0));
  const crudeBar = `<div class="stack" style="height:40px">${c.shares.map((s, i) => `<span style="width:${s.v}%;background:${PAL[i]}" title="${esc(s.c)}: ${s.v}%"></span>`).join('')}</div><div class="legend">${c.shares.map((s, i) => `<span><i style="background:${PAL[i]}"></i>${esc(s.c)} ${s.v}%</span>`).join('')}</div>`;
  const dapRows = E.dap.rows.map(r => { const p = r.china / r.total * 100; return `<div class="pace-row"><div class="pace-lbl">${esc(r.period)}<small>${r.total.toFixed(2)} lakh t imported</small></div><div class="pace-track"><span class="pace-fill" style="width:${p}%;background:#B42318"></span></div><div class="pace-val">${p.toFixed(1)}%<small>${r.china.toFixed(2)} lakh t</small></div></div>`; }).join('');
  const chinaRows = E.china.items.map(r => `<div class="pace-row"><div class="pace-lbl">${esc(r.p)}<small>${esc(r.g)}</small></div><div class="pace-track"><span class="pace-fill" style="width:${r.v}%;background:${r.v >= 80 ? '#B42318' : '#C97A00'}"></span><span class="pace-mark" style="left:50%"></span></div><div class="pace-val">${r.v.toFixed(1)}%</div></div>`).join('');
  const src = s => `<ul class="src">${s.map(x => `<li><a href="${esc(x.url)}">${esc(x.name)}</a></li>`).join('')}</ul>`;
  return pageHead('Geoeconomics Exposure Map', 'Where India is exposed', 'Which countries India depends on for the things it cannot easily make at home, how concentrated that supply is, and what a disruption would cost. Oil, fertiliser and the electronics and clean-energy goods that come mostly from China.') +
  `<div class="wrap">
  <div class="results" style="margin-top:22px">
   <div class="res"><div class="lbl">Largest crude supplier</div><div class="num">${esc(top[0].c)} ${top[0].v}%</div><div class="sub">of India's crude imports in ${esc(c.period)}</div></div>
   <div class="res"><div class="lbl">Crude through the Strait of Hormuz</div><div class="num">${esc(c.hormuz)}%</div><div class="sub">Iraq, Saudi Arabia, Kuwait and UAE cargoes. For gas imports: ${esc(c.hormuzGas)} per cent.</div></div>
   <div class="res"><div class="lbl">China's share of solar cell imports</div><div class="num">${E.china.items.find(i => i.p === 'Solar cells').v}%</div><div class="sub">and ${E.china.items.find(i => i.p === 'Lithium-ion batteries').v}% for lithium-ion batteries</div></div>
  </div>

  <section class="xr-sec"><h2 class="col-title">${esc(c.title)}, ${esc(c.period)}</h2>${crudeBar}
  <p class="dek sm" style="margin-top:12px">${esc(c.note)} The concentration index for named suppliers (sum of squared shares) is about ${hhi.toLocaleString('en-IN')}; above 2,500 is conventionally read as highly concentrated.</p></section>

  <section class="xr-sec lab" id="disrupt"><div class="controls">
   <h2 class="col-title">What if a supplier stops?</h2>
   <div class="ctrl"><label for="ex-sup">Supplier</label><select id="ex-sup" style="width:100%;height:36px;border:1px solid var(--ink);background:#fff;font:500 14px var(--sans)">${top.map(s => `<option value="${s.v}">${esc(s.c)} (${s.v}%)</option>`).join('')}</select></div>
   <div class="ctrl"><label for="ex-lost">Share of its barrels lost<output for="ex-lost"></output></label><input type="range" id="ex-lost" min="10" max="100" step="5" value="50"></div>
   <div class="ctrl"><label for="ex-prem">Extra cost of replacement barrels, $ a barrel<output for="ex-prem"></output></label><input type="range" id="ex-prem" min="0" max="25" step="0.5" value="5"><div class="hint">Replacement crude usually costs more: a lost discount, longer voyages, higher freight and insurance.</div></div>
   <div class="ctrl"><label for="ex-vol">Total crude imports, million barrels a day<output for="ex-vol"></output></label><input type="range" id="ex-vol" min="4" max="6" step="0.01" value="${c.volume}"><div class="hint">${esc(c.volumeNote)}</div></div>
  </div><div>
   <div class="results">
    <div class="res"><div class="lbl">Barrels to replace</div><div class="num" id="ex-b"></div><div class="sub">a day</div></div>
    <div class="res"><div class="lbl">Extra import bill</div><div class="num" id="ex-usd"></div><div class="sub" id="ex-usd-sub"></div></div>
    <div class="res"><div class="lbl">In rupees</div><div class="num" id="ex-inr"></div><div class="sub">a year, at ₹${inrRate} per dollar</div></div>
   </div>
   <div class="assume"><b>How this works</b><ul><li>Barrels to replace = total imports × supplier's share × share lost.</li><li>Extra bill = barrels to replace × extra cost per barrel × 365 days. It assumes replacement barrels can be found at that premium; in a real disruption they might not be, and the global price would also move.</li><li>Use the <a href="/tools/shock-lab/" style="text-decoration:underline">Shock Lab</a> to see what a change in the Brent price itself does to the import bill and the pump.</li></ul></div>
  </div></section>
  <script>window.__EXPO={inr:${inrRate}};</script>

  <section class="xr-sec"><h2 class="col-title">${esc(E.dap.title)}</h2><div class="pace">${dapRows}</div>
  <p class="dek sm" style="margin-top:12px">${esc(E.dap.note)}</p></section>

  <section class="xr-sec"><h2 class="col-title">${esc(E.china.title)}</h2><div class="pace">${chinaRows}<div class="pace-key"><span><i class="k-mark"></i>Half of imports</span></div></div>
  <p class="dek sm" style="margin-top:12px">${esc(E.china.note)}</p></section>

  <section class="xr-sec"><h2 class="col-title">Sources</h2>${src([...c.sources, ...E.dap.sources, ...E.china.sources])}<p class="meta">Checked ${esc(E.checked)}. Crude shares are for 2024-25, the latest full year in a single consistent source; monthly shares in 2026 have swung widely.</p></section>
  </div>`;
}
