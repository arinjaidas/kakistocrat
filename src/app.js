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
  /* ---------- india by state ---------- */
  const stRoot = $('#states');
  if (stRoot && window.__STATES) {
    const S = window.__STATES, IND = Object.fromEntries(S.indicators.map(i => [i.id, i]));
    const f = (i, v) => v == null ? '—' : i.fmt === 'inr' ? '₹' + Math.round(v).toLocaleString('en-IN') : v.toFixed(i.fmt === 'pct2' ? 2 : 1) + '%';
    const PAL = ['#EEF2F7', '#C9D6E8', '#93AED3', '#5A82B8', '#24508F'];
    const bins = id => { const v = S.states.map(s => s[id]).filter(x => x != null).sort((a, b) => a - b); return [0.2, 0.4, 0.6, 0.8].map(q => v[Math.floor(q * (v.length - 1))]); };
    const colorOf = (id, v, b) => v == null ? '#E2DFD8' : PAL[b.filter(x => v > x).length];
    const sel = $('#st-ind');
    const draw = () => {
      const id = sel.value, I = IND[id], b = bins(id);
      $('#st-def').textContent = I.def;
      const cols = Math.max(...S.states.map(s => s.col)) + 1, rows = Math.max(...S.states.map(s => s.row)) + 1;
      $('#st-map').style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      $('#st-map').innerHTML = S.states.map(s => { const c = colorOf(id, s[id], b), dark = PAL.indexOf(c) >= 3; return `<button class="tile" style="grid-column:${s.col + 1};grid-row:${s.row + 1};background:${c};color:${dark ? '#fff' : 'var(--ink)'}" title="${s.name}: ${f(I, s[id])}" data-code="${s.code}"><b>${s.code}</b><span>${f(I, s[id]).replace('₹', '₹')}</span></button>`; }).join('');
      $('#st-legend').innerHTML = `<span class="meta">${I.higherIs === 'good' ? 'Higher is better' : 'Higher is worse'} ·</span>` + PAL.map((c, k) => `<span><i style="background:${c}"></i>${k === 0 ? '≤ ' + f(I, b[0]) : k === 4 ? '> ' + f(I, b[3]) : f(I, b[k - 1]) + '–' + f(I, b[k])}</span>`).join('') + '<span><i style="background:#E2DFD8"></i>No data</span>';
      const ranked = S.states.filter(s => s[id] != null).sort((a, z) => z[id] - a[id]);
      const max = Math.max(...ranked.map(s => Math.abs(s[id])));
      const all = S.allIndia[id];
      $('#st-rank').innerHTML = ranked.map(s => `<li data-code="${s.code}"><span class="n">${s.name}</span><span class="b"><i style="width:${Math.abs(s[id]) / max * 100}%"></i>${all != null ? `<em style="left:${all / max * 100}%"></em>` : ''}</span><span class="v">${f(I, s[id])}</span></li>`).join('') + (all != null ? `<li class="all"><span class="n">All India</span><span class="b"></span><span class="v">${f(I, all)}</span></li>` : '');
      history.replaceState(null, '', '#' + new URLSearchParams({ map: id, x: $('#st-x').value, y: $('#st-y').value }));
    };
    const scatter = () => {
      const X = IND[$('#st-x').value], Y = IND[$('#st-y').value];
      const pts = S.states.filter(s => s[X.id] != null && s[Y.id] != null).map(s => ({ x: s[X.id], y: s[Y.id], c: s.code, n: s.name }));
      const W = 760, H = 420, P = { l: 64, r: 20, t: 16, b: 46 };
      let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
      const dx = (x1 - x0) || 1, dy = (y1 - y0) || 1; x0 -= dx * .06; x1 += dx * .06; y0 -= dy * .08; y1 += dy * .08;
      const sx = v => P.l + (W - P.l - P.r) * (v - x0) / (x1 - x0), sy = v => P.t + (H - P.t - P.b) * (1 - (v - y0) / (y1 - y0));
      const n = pts.length, mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
      const sxy = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0), sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0), syy = pts.reduce((a, p) => a + (p.y - my) ** 2, 0);
      const bb = sxy / sxx, aa = my - bb * mx, r = sxy / Math.sqrt(sxx * syy);
      const tick = (I, v) => I.fmt === 'inr' ? '₹' + Math.round(v / 1000) + 'k' : v.toFixed(1) + '%';
      let g = '';
      for (let k = 0; k <= 4; k++) { const yv = y0 + (y1 - y0) * k / 4, xv = x0 + (x1 - x0) * k / 4; g += `<line x1="${P.l}" x2="${W - P.r}" y1="${sy(yv)}" y2="${sy(yv)}" stroke="#E2DFD8"/><text class="ax" x="${P.l - 8}" y="${sy(yv) + 4}" text-anchor="end">${tick(Y, yv)}</text><text class="ax" x="${sx(xv)}" y="${H - 26}" text-anchor="middle">${tick(X, xv)}</text>`; }
      g += `<text class="axt" x="${(P.l + W - P.r) / 2}" y="${H - 6}" text-anchor="middle">${X.label} (${X.year})</text><text class="axt" transform="rotate(-90 14 ${(P.t + H - P.b) / 2})" x="14" y="${(P.t + H - P.b) / 2}" text-anchor="middle">${Y.label} (${Y.year})</text>`;
      g += `<line x1="${sx(x0)}" y1="${sy(aa + bb * x0)}" x2="${sx(x1)}" y2="${sy(aa + bb * x1)}" stroke="#B42318" stroke-dasharray="4 4" stroke-width="1.5"/>`;
      pts.forEach(p => { g += `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="4.5" fill="#15171A" fill-opacity=".8"><title>${p.n}: ${f(X, p.x)}, ${f(Y, p.y)}</title></circle><text class="pt" x="${sx(p.x) + 7}" y="${sy(p.y) + 4}">${p.c}</text>`; });
      $('#st-scatter').innerHTML = `<svg class="svgchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${Y.label} against ${X.label} across states">${g}</svg>`;
      $('#st-r').textContent = X.id === Y.id ? '' : `Correlation across ${n} states: ${r.toFixed(2)}`;
      draw();
    };
    const h = new URLSearchParams(location.hash.slice(1));
    [['map', sel], ['x', $('#st-x')], ['y', $('#st-y')]].forEach(([k, el]) => { if (h.get(k) && IND[h.get(k)]) el.value = h.get(k); });
    sel.addEventListener('change', draw); $('#st-x').addEventListener('change', scatter); $('#st-y').addEventListener('change', scatter);
    // sortable table
    let sortK = 'name', dir = 1;
    $$('#st-table thead th').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k; dir = sortK === k ? -dir : (k === 'name' ? 1 : -1); sortK = k;
      const tb = $('#st-table tbody'), rows = $$('tr[data-code]', tb), idx = [...th.parentNode.children].indexOf(th);
      rows.sort((a, b) => { if (k === 'name') return dir * a.children[0].textContent.localeCompare(b.children[0].textContent); const va = parseFloat(a.children[idx].dataset.v), vb = parseFloat(b.children[idx].dataset.v); return (isNaN(va) ? 1 : isNaN(vb) ? -1 : dir * (va - vb)); });
      const last = tb.querySelector('tr.lead'); rows.forEach(r => tb.insertBefore(r, last));
      $$('#st-table thead th').forEach(x => x.removeAttribute('aria-sort')); th.setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
    }));
    scatter();
  }
  /* ---------- exposure: supplier disruption ---------- */
  const ex = $('#disrupt');
  if (ex && window.__EXPO) {
    const ids = ['ex-sup', 'ex-lost', 'ex-prem', 'ex-vol'];
    const run = () => {
      const share = parseFloat($('#ex-sup').value) / 100, lost = parseFloat($('#ex-lost').value) / 100, prem = parseFloat($('#ex-prem').value), vol = parseFloat($('#ex-vol').value);
      $('output[for=ex-lost]').textContent = Math.round(lost * 100) + '%'; $('output[for=ex-prem]').textContent = '$' + prem.toFixed(1); $('output[for=ex-vol]').textContent = vol.toFixed(2);
      const bpd = vol * 1e6 * share * lost, usd = bpd * prem * 365;
      $('#ex-b').textContent = (bpd / 1e6).toFixed(2) + ' mn';
      $('#ex-usd').textContent = '$' + (usd / 1e9).toFixed(2) + ' bn';
      $('#ex-usd-sub').textContent = 'a year';
      $('#ex-inr').textContent = '₹' + Math.round(usd * window.__EXPO.inr / 1e7).toLocaleString('en-IN') + ' cr';
    };
    ids.forEach(i => $('#' + i).addEventListener('input', run)); $('#ex-sup').addEventListener('change', run); run();
  }
})();
