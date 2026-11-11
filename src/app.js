/* The Kakistocrat — client script. No dependencies. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (v, d = 2) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateFmt = iso => { if (!iso) return '—'; const p = iso.split('-'); const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return p.length === 3 ? `${+p[2]} ${m[+p[1]-1]} ${p[0]}` : p.length === 2 ? `${m[+p[1]-1]} ${p[0]}` : iso; };

  /* ---------- mobile menu ---------- */
  const mb = $('.menu-btn');
  if (mb) mb.addEventListener('click', () => { const n = $('.nav'); const open = n.classList.toggle('open'); mb.setAttribute('aria-expanded', open); });

  /* ---------- charts ---------- */
  function drawChart(el, pts, opts = {}) {
    if (!pts || pts.length < 2) return;
    const W = el.clientWidth || 600, H = el.clientHeight || (opts.spark ? 56 : 260);
    const pad = opts.spark ? { l: 2, r: 2, t: 6, b: 6 } : { l: 48, r: 16, t: 14, b: 30 };
    const vs = pts.map(p => p.v); let lo = Math.min(...vs), hi = Math.max(...vs);
    const span = hi - lo || Math.abs(hi) * 0.05 || 1; lo -= span * 0.15; hi += span * 0.15;
    const x = i => pad.l + (W - pad.l - pad.r) * (i / (pts.length - 1));
    const y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(opts.label || 'Chart')}">`;
    if (!opts.spark) {
      for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, yy = y(v); svg += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}"/><text x="${pad.l - 8}" y="${yy + 4}" text-anchor="end">${fmt(v, opts.decimals ?? 2)}</text>`; }
      pts.forEach((p, i) => { svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${esc(p.t)}</text>`; });
      svg += `<path class="area" d="${path}L${x(pts.length - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z"/>`;
    }
    svg += `<path class="line" d="${path}" style="${opts.spark ? 'stroke-width:1.6' : ''}"/>`;
    pts.forEach((p, i) => { if (!opts.spark || i === pts.length - 1) svg += `<circle class="dot" cx="${x(i)}" cy="${y(p.v)}" r="${opts.spark ? 2.5 : 3.5}"><title>${esc(p.t)}: ${fmt(p.v, opts.decimals ?? 2)}</title></circle>`; });
    el.innerHTML = svg + '</svg>';
  }
  $$('[data-chart]').forEach(el => { try { const d = JSON.parse(el.dataset.chart); drawChart(el, d.pts, d); } catch (e) {} });
  window.addEventListener('resize', () => $$('[data-chart]').forEach(el => { try { const d = JSON.parse(el.dataset.chart); drawChart(el, d.pts, d); } catch (e) {} }));

  /* ---------- macro tape pop-ups ---------- */
  const TAPE = window.__TAPE;
  let pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; $$('.tick[aria-expanded=true]').forEach(t => t.setAttribute('aria-expanded', 'false')); } }
  $$('.tick').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = btn.getAttribute('aria-expanded') === 'true'; closePop(); if (open || !TAPE) return;
    const ind = TAPE.indicators.find(i => i.id === btn.dataset.id); if (!ind) return;
    const pre = ind.prefix || '', unit = ind.unit === '%' ? '%' : '';
    const val = v => `${pre}${fmt(v, ind.decimals)}${unit}`;
    const rev = (ind.revisions || []).map(r => `<tr><td>${esc(r.period)}</td><td>${val(r.first)} → ${val(r.revised)}</td></tr>`).join('');
    pop = document.createElement('div'); pop.className = 'tape-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', ind.label);
    pop.innerHTML = `<button class="x" aria-label="Close">×</button>
      <div class="meta">${esc(ind.latest.status)} · checked ${dateFmt(ind.checked)}</div>
      <h3>${esc(ind.label)}</h3>
      <div class="big">${val(ind.latest.value)}</div>
      <div class="meta">${esc(ind.latest.period)}</div>
      <div class="spark-wrap" style="height:70px;margin-top:8px"></div>
      <table><tr><th>Previous</th><th>Latest</th></tr>
        <tr><td>${val(ind.previous.value)} <span class="meta">${esc(ind.previous.period)}</span></td><td>${val(ind.latest.value)}</td></tr>
        ${rev ? `<tr><th colspan="2">Revised</th></tr>${rev}` : ''}
        <tr><td>Next release</td><td>${dateFmt(ind.next.date)}</td></tr></table>
      <div class="meta" style="text-transform:none;letter-spacing:0">${esc(ind.next.what)}</div>
      <div class="links"><a href="/data/${ind.id}/">Full data page →</a><a href="${esc(ind.sources[0].url)}" rel="noopener">Source</a></div>`;
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
    pop.style.left = Math.max(12, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 12)) + 'px';
    drawChart($('.spark-wrap', pop), ind.history, { spark: false, decimals: ind.decimals, label: ind.label + ' history' });
    $('.x', pop).addEventListener('click', closePop);
    btn.setAttribute('aria-expanded', 'true');
  }));
  document.addEventListener('click', e => { if (pop && !pop.contains(e.target)) closePop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

  /* ---------- archive filters + search ---------- */
  const arch = $('#archive');
  if (arch) {
    let IDX = [];
    const state = { topic: '', format: '', year: '', q: new URLSearchParams(location.search).get('q') || '' };
    const qInput = $('#q'); if (qInput) qInput.value = state.q;
    const out = $('#results'), count = $('#count');
    const render = () => {
      const q = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const rows = IDX.filter(a => (!state.topic || a.topic === state.topic) && (!state.format || a.format === state.format) && (!state.year || a.date.startsWith(state.year)) && q.every(w => (a.title + ' ' + a.excerpt + ' ' + a.topicName + ' ' + (a.series || '')).toLowerCase().includes(w)));
      count.textContent = `${rows.length} ${rows.length === 1 ? 'piece' : 'pieces'}`;
      out.innerHTML = rows.map(a => `<a class="row-story story" href="${a.url}"><div class="when">${dateFmt(a.date)}<br><span style="color:${a.color}">${esc(a.topicName)}</span></div><div><span class="fmt ${a.format.toLowerCase()}">${esc(a.format)}</span>${a.series ? ` <span class="meta">${esc(a.series)}</span>` : ''}<h3 class="h-3">${esc(a.title)}</h3><p class="dek sm">${esc(a.excerpt)}</p></div></a>`).join('') || '<p>No pieces match. Try fewer words or clear a filter.</p>';
    };
    fetch('/search.json').then(r => r.json()).then(d => { IDX = d; render(); });
    $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.filter, v = b.dataset.value; state[k] = state[k] === v ? '' : v;
      $$(`[data-filter="${k}"]`).forEach(x => x.setAttribute('aria-pressed', x.dataset.value === state[k] && state[k] !== '' ? 'true' : 'false'));
      render();
    }));
    if (qInput) qInput.addEventListener('input', () => { state.q = qInput.value; history.replaceState(null, '', state.q ? '?q=' + encodeURIComponent(state.q) : location.pathname); render(); });
  }

  /* ---------- shock lab: oil & rupee ---------- */
  const lab = $('#shocklab');
  if (lab) {
    const F = ['brent0', 'inr0', 'brent1', 'inr1', 'barrels', 'pass', 'pump0', 'litres'];
    const get = id => parseFloat($('#' + id).value);
    const fromHash = () => { const p = new URLSearchParams(location.hash.slice(1)); F.forEach(k => { if (p.has(k)) $('#' + k).value = p.get(k); }); };
    const toHash = () => { const p = new URLSearchParams(); F.forEach(k => p.set(k, $('#' + k).value)); history.replaceState(null, '', '#' + p.toString()); return location.href; };
    const L_PER_BBL = 158.987;
    const calc = () => {
      F.forEach(k => { const o = $(`output[for=${k}]`); if (o) o.textContent = k === 'pass' ? $('#' + k).value + '%' : fmt(get(k), ['inr0', 'inr1'].includes(k) ? 2 : (k === 'barrels' || k === 'litres' || k === 'pump0') ? 0 : 1); });
      const b0 = get('brent0'), r0 = get('inr0'), b1 = get('brent1'), r1 = get('inr1'), bbl = get('barrels'), pass = get('pass') / 100, pump0 = get('pump0'), L = get('litres');
      const cost0 = bbl * b0 * r0, cost1 = bbl * b1 * r1, d = cost1 - cost0;
      const oilFx = bbl * (b1 - b0) * r0, fxFx = bbl * b0 * (r1 - r0), inter = d - oilFx - fxFx;
      const crore = v => (v / 1e7);
      $('#r-cost').textContent = '₹' + fmt(crore(cost1), 1) + ' cr';
      $('#r-cost-sub').textContent = `from ₹${fmt(crore(cost0), 1)} cr (${d >= 0 ? '+' : ''}${fmt(cost0 ? d / cost0 * 100 : 0, 1)}%)`;
      const perL0 = b0 * r0 / L_PER_BBL, perL1 = b1 * r1 / L_PER_BBL, dPerL = perL1 - perL0;
      $('#r-litre').textContent = (dPerL >= 0 ? '+₹' : '−₹') + fmt(Math.abs(dPerL), 2);
      $('#r-litre-sub').textContent = `crude cost per litre: ₹${fmt(perL0, 2)} → ₹${fmt(perL1, 2)}`;
      const pumpD = dPerL * pass, pump1 = pump0 + pumpD;
      $('#r-pump').textContent = '₹' + fmt(pump1, 2);
      $('#r-pump-sub').textContent = `${pumpD >= 0 ? '+' : '−'}₹${fmt(Math.abs(pumpD), 2)} a litre at ${fmt(pass * 100, 0)}% pass-through`;
      $('#r-house').textContent = (pumpD * L >= 0 ? '+₹' : '−₹') + fmt(Math.abs(pumpD * L), 0);
      $('#r-house-sub').textContent = `a month for a household using ${fmt(L, 0)} litres`;
      $('#r-absorb').textContent = (dPerL * (1 - pass) >= 0 ? '₹' : '−₹') + fmt(Math.abs(dPerL * (1 - pass)), 2);
      $('#r-absorb-sub').textContent = 'a litre absorbed by oil company margins or fuel taxes';
      const tot = Math.abs(oilFx) + Math.abs(fxFx) + Math.abs(inter) || 1;
      $('#bar').innerHTML = `<span style="width:${Math.abs(oilFx) / tot * 100}%;background:var(--ink)"></span><span style="width:${Math.abs(fxFx) / tot * 100}%;background:var(--accent)"></span><span style="width:${Math.abs(inter) / tot * 100}%;background:var(--rule-2)"></span>`;
      $('#r-split').innerHTML = `<span><i style="background:var(--ink)"></i>Oil price: ${oilFx >= 0 ? '+' : '−'}₹${fmt(Math.abs(crore(oilFx)), 1)} cr</span><span><i style="background:var(--accent)"></i>Rupee: ${fxFx >= 0 ? '+' : '−'}₹${fmt(Math.abs(crore(fxFx)), 1)} cr</span><span><i style="background:var(--rule-2)"></i>Both together: ${inter >= 0 ? '+' : '−'}₹${fmt(Math.abs(crore(inter)), 1)} cr</span>`;
    };
    fromHash();
    F.forEach(k => $('#' + k).addEventListener('input', calc));
    $('#share').addEventListener('click', () => { const u = toHash(); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { $('#share').textContent = 'Link copied'; setTimeout(() => $('#share').textContent = 'Copy link to this scenario', 1800); }).catch(() => prompt('Copy this link', u)); });
    $('#reset').addEventListener('click', () => { history.replaceState(null, '', location.pathname); location.reload(); });
    calc();
  }
  /* ---------- budget x-ray: year-end calculator ---------- */
  const ye = $('#yearend');
  if (ye && window.__BUDGET) {
    const B = window.__BUDGET, F = ['h2tax', 'h2nontax', 'h2exp', 'gdp'];
    const v = id => parseFloat($('#' + id).value);
    const p0 = new URLSearchParams(location.hash.slice(1)); F.forEach(k => { if (p0.has(k)) $('#' + k).value = p0.get(k); });
    const lk = x => (x / 1e5).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const run = () => {
      F.forEach(k => { const o = $(`output[for=${k}]`); if (o) o.textContent = (k === 'h2tax' || k === 'h2exp') ? (v(k) >= 0 ? '+' : '') + v(k).toFixed(1) + '%' : '₹' + v(k).toFixed(k === 'gdp' ? 1 : 2); });
      const tax = B.h1tax * (2 + v('h2tax') / 100), exp = B.h1exp * (2 + v('h2exp') / 100), other = B.h1other + v('h2nontax') * 1e5;
      const fd = exp - tax - other, gdp = v('gdp') * 1e5, slip = fd - B.beFD;
      $('#y-fd').textContent = '₹' + lk(fd) + ' lakh cr';
      $('#y-fd-sub').textContent = `Budget Estimate: ₹${lk(B.beFD)} lakh crore`;
      $('#y-gdp').textContent = (fd / gdp * 100).toFixed(2) + '%';
      $('#y-gdp-sub').textContent = `Budget target: 4.3% of GDP (on ₹${lk(B.beGDP)} lakh crore GDP)`;
      const tiny = Math.abs(slip) < 1000; $('#y-slip').textContent = tiny ? 'On target' : (slip >= 0 ? '+₹' : '−₹') + lk(Math.abs(slip)) + ' lakh cr';
      $('#y-slip-sub').textContent = tiny ? 'This scenario reproduces the Budget Estimate.' : `${slip >= 0 ? 'more' : 'less'} borrowing than budgeted, about ${(Math.abs(slip) / gdp * 100).toFixed(2)}% of GDP`;
      $('#y-slip').style.color = slip > 5000 ? 'var(--down)' : slip < -5000 ? 'var(--up)' : '';
    };
    F.forEach(k => $('#' + k).addEventListener('input', run));
    $('#share').addEventListener('click', () => { const q = new URLSearchParams(); F.forEach(k => q.set(k, $('#' + k).value)); history.replaceState(null, '', '#' + q); const u = location.href; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { $('#share').textContent = 'Link copied'; setTimeout(() => $('#share').textContent = 'Copy link to this scenario', 1800); }).catch(() => prompt('Copy this link', u)); });
    $('#reset').addEventListener('click', () => { history.replaceState(null, '', location.pathname); location.reload(); });
    run();
  }
})();
