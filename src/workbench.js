/* Chart workbench: any series from /api/catalog.json, up to six, with transforms, two axes, events, share link, CSV and PNG. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PAL = ['#17202C', '#B5367A', '#1C7C99', '#5F7F14', '#B87708', '#6D5BA8'];
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', MUTE = '#555A61', RULE = '#D9DED3';
  let EVENTS = []; fetch('/api/events.json').then(r => r.json()).then(j => { EVENTS = j.events.map(e => [e.date, e.short]); }).catch(() => {});
  const TF = { lvl: 'Level', yoy: 'Change on a year earlier, %', rb: 'Rebased, start = 100' };
  let CAT = [], byId = {}, cache = {}, sel = [], range = '3Y', chart;
  const wait = fn => window.echarts ? fn() : setTimeout(() => wait(fn), 60);
  const getS = id => cache[id] ? Promise.resolve(cache[id]) : fetch(`/api/series/${id}.json`).then(r => r.json()).then(d => (cache[id] = d));
  const fromHash = () => { const p = new URLSearchParams(location.hash.slice(1)); const s = (p.get('s') || '').split(',').filter(Boolean).map(x => { const [id, t] = x.split(':'); return { id, t: t || 'lvl' }; }).filter(x => byId[x.id]); if (p.get('r')) range = p.get('r'); return s; };
  const toHash = () => history.replaceState(null, '', '#' + new URLSearchParams({ s: sel.map(x => `${x.id}:${x.t}`).join(','), r: range }));
  const startDate = lastISO => { if (range === 'Max') return '1900-01-01'; const t = new Date(lastISO); t.setFullYear(t.getFullYear() - parseInt(range)); return t.toISOString().slice(0, 10); };
  function transform(s, t, from) {
    let pts = s.d.map((d, i) => [d, s.v[i]]);
    if (t === 'yoy') { const out = []; let j = 0; for (let i = 0; i < pts.length; i++) { const [d, v] = pts[i]; const tgt = new Date(d); tgt.setFullYear(tgt.getFullYear() - 1); const ti = tgt.toISOString().slice(0, 10); while (j < i && pts[j + 1][0] <= ti) j++; if (pts[j][0] <= ti && pts[j][1]) out.push([d, +((v / pts[j][1] - 1) * 100).toFixed(2)]); } pts = out; }
    pts = pts.filter(p => p[0] >= from);
    if (t === 'rb' && pts.length) { const f = pts[0][1]; pts = pts.map(p => [p[0], +(p[1] / f * 100).toFixed(2)]); }
    return pts;
  }
  const unitOf = x => x.t === 'yoy' ? '% y/y' : x.t === 'rb' ? 'index' : byId[x.id].unit;
  async function draw() {
    toHash();
    const data = await Promise.all(sel.map(x => getS(x.id)));
    const today = new Date().toISOString().slice(0, 10), lastISO = data.reduce((m, s) => s.d.at(-1) > m ? s.d.at(-1) : m, '1900-01-01'), from = startDate(lastISO > today ? today : lastISO);
    const units = [...new Set(sel.map(unitOf))], dual = $('#wb-dual').checked && units.length >= 2;
    const series = sel.map((x, k) => ({ name: `${byId[x.id].name}${x.t !== 'lvl' ? ` (${x.t === 'yoy' ? '% y/y' : '=100'})` : ''}`, type: 'line', showSymbol: byId[x.id].freq === 'annual', symbolSize: 5, connectNulls: true, yAxisIndex: dual ? (unitOf(x) === units[0] ? 0 : 1) : 0, data: transform(data[k], x.t, from), lineStyle: { width: 2, color: PAL[k] }, itemStyle: { color: PAL[k] } }));
    if ($('#wb-ev').checked && series.length) series[0].markLine = { symbol: 'none', silent: true, label: { formatter: p => p.name, fontFamily: MONO, fontSize: 10, color: MUTE, position: 'insideEndTop' }, lineStyle: { color: '#C9CFC3', type: 'dashed' }, data: EVENTS.filter(e => e[0] >= from).map((e, i) => ({ xAxis: e[0], name: e[1], label: { distance: [0, (i % 3) * 64] } })) };
    const ax = (i) => ({ type: 'value', scale: true, name: dual ? (i ? units.slice(1).join(' · ') : units[0]) : units.length === 1 ? units[0] : '', nameTextStyle: { fontFamily: MONO, fontSize: 10, color: MUTE }, position: i ? 'right' : 'left', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { show: !i, lineStyle: { color: '#E6EAE2' } } });
    chart.setOption({ textStyle: { fontFamily: FONT }, animationDuration: 400, color: PAL, grid: { left: 60, right: dual ? 64 : 24, top: 44, bottom: 64 }, legend: { top: 0, textStyle: { fontFamily: FONT, fontSize: 12 } },
      tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#17202C', textStyle: { color: '#17202C', fontFamily: FONT, fontSize: 12 } },
      xAxis: { type: 'time', axisLine: { lineStyle: { color: RULE } }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 } }, yAxis: dual ? [ax(0), ax(1)] : [ax(0)],
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 22, bottom: 8 }], series }, true);
    $('#wb-chips').innerHTML = sel.map((x, k) => `<span class="wb-chip" style="--c:${PAL[k]}"><i></i><b>${byId[x.id].hidden ? byId[x.id].name : `<a href="/s/${x.id}/" style="color:inherit">${byId[x.id].name}</a>`}</b><select data-k="${k}" aria-label="Transform">${Object.entries(TF).map(([v, l]) => `<option value="${v}"${v === x.t ? ' selected' : ''}>${l}</option>`).join('')}</select><small>${byId[x.id].source}</small><button type="button" data-rm="${k}" aria-label="Remove">×</button></span>`).join('') || '<p class="meta">Pick a series from the library to start.</p>';
    $$('#wb-chips select').forEach(s => s.addEventListener('change', () => { sel[+s.dataset.k].t = s.value; draw(); }));
    $$('#wb-chips [data-rm]').forEach(b => b.addEventListener('click', () => { sel.splice(+b.dataset.rm, 1); draw(); }));
    $$('#wb-list button').forEach(b => b.classList.toggle('on', sel.some(x => x.id === b.dataset.id)));
    $('#wb-note').textContent = sel.length ? `Latest data: ${lastISO > today ? today + ' (projections shown beyond)' : lastISO}.` : '';
    window.__WB = { series, from };
  }
  wait(async () => {
    chart = echarts.init($('#wb-chart')); addEventListener('resize', () => chart.resize());
    CAT = await fetch('/api/catalog.json').then(r => r.json()); byId = Object.fromEntries(CAT.map(c => [c.id, c]));
    sel = fromHash(); if (!sel.length) sel = [{ id: 'fx-usdinr', t: 'lvl' }, { id: 'fred-dcoilbrenteu', t: 'lvl' }];
    $$('#wb-range button').forEach(b => b.toggleAttribute('aria-pressed', b.dataset.r === range));
    $$('#wb-range button').forEach(b => b.addEventListener('click', () => { range = b.dataset.r; $$('#wb-range button').forEach(x => x.removeAttribute('aria-pressed')); b.setAttribute('aria-pressed', 'true'); draw(); }));
    ['#wb-dual', '#wb-ev'].forEach(s => $(s).addEventListener('change', draw));
    $$('#wb-list button').forEach(b => b.addEventListener('click', () => { const id = b.dataset.id, i = sel.findIndex(x => x.id === id); if (i >= 0) sel.splice(i, 1); else { if (sel.length >= 6) sel.shift(); sel.push({ id, t: 'lvl' }); } draw(); }));
    $('#wb-q').addEventListener('input', e => { const q = e.target.value.toLowerCase().split(/\s+/).filter(Boolean); $$('#wb-list li').forEach(li => { li.hidden = q.length && !q.every(w => li.textContent.toLowerCase().includes(w)); }); $$('#wb-list details').forEach(d => { const any = [...d.querySelectorAll('li')].some(li => !li.hidden); d.hidden = !any; if (q.length) d.open = any; }); });
    $('#wb-link').addEventListener('click', () => { const u = location.href; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { $('#wb-link').textContent = 'Link copied'; setTimeout(() => $('#wb-link').textContent = 'Copy link to this chart', 1600); }).catch(() => prompt('Copy this link', u)); });
    $('#wb-csv').addEventListener('click', () => { const S = window.__WB.series, dates = [...new Set(S.flatMap(s => s.data.map(p => p[0])))].sort(); const maps = S.map(s => Object.fromEntries(s.data)); const csv = ['date,' + S.map(s => `"${s.name.replace(/"/g, '""')}"`).join(','), ...dates.map(d => d + ',' + maps.map(m => m[d] ?? '').join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'kakistocrat-chart.csv'; a.click(); });
    $('#wb-png').addEventListener('click', () => { const a = document.createElement('a'); a.href = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' }); a.download = 'kakistocrat-chart.png'; a.click(); });
    draw();
  });
})();
