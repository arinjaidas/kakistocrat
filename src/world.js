/* India against the world: rankings explorer. Data: /api/world/<indicator>.json */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#15171A', MUTE = '#6B7078', RED = '#B42318', RULE = '#E2DFD8';
  const W = window.__WD, cache = {};
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  const fmt = (v, u) => v == null ? '—' : u === '%' || u.startsWith('%') ? v.toFixed(1) + '%' : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(v < 10 ? 2 : 1);
  const get = id => cache[id] ? Promise.resolve(cache[id]) : fetch(`/api/world/${id}.json`).then(r => r.json()).then(d => (cache[id] = d));
  const name = iso => (W.countries[iso] || iso).replace("China, People's Republic of", 'China').replace('Korea, Republic of', 'South Korea').replace('Taiwan Province of China', 'Taiwan').replace(', The', '').replace('Russian Federation', 'Russia').replace('Türkiye, Republic of', 'Türkiye').replace('Kyrgyz Republic', 'Kyrgyzstan').replace('Slovak Republic', 'Slovakia').replace('Lao P.D.R.', 'Laos');
  let ind = 'NGDPD', year = String(W.year), bars, line;
  const draw = async () => {
    const D = await get(ind), meta = W.indicators[ind];
    const rows = Object.entries(D).map(([iso, s]) => ({ iso, v: s[year] })).filter(r => r.v != null).sort((a, b) => b.v - a.v);
    const i = rows.findIndex(r => r.iso === 'IND');
    $('#wd-title').textContent = `${meta.label}, ${year}`; $('#wd-yl').textContent = year;
    $('#wd-rank').innerHTML = i < 0 ? '<b>—</b><span>No data for India this year</span>' : `<b>${ord(i + 1)}</b><span>of ${rows.length} · India ${fmt(rows[i].v, meta.unit)} ${meta.unit.startsWith('%') ? '' : meta.unit}</span>`;
    const lo = Math.max(0, i - 5), nb = i < 0 ? [] : rows.slice(lo, i + 6);
    $('#wd-nb').innerHTML = nb.map((r, k) => `<li class="${r.iso === 'IND' ? 'me' : ''}" value="${lo + k + 1}"><span>${name(r.iso)}</span><b>${fmt(r.v, meta.unit)}</b></li>`).join('');
    const top = rows.slice(0, 30); if (i >= 30) top.push(rows[i]);
    bars.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 130, right: 70, top: 6, bottom: 20 }, tooltip: { trigger: 'item', formatter: p => `${p.name}: ${fmt(p.value, meta.unit)} ${meta.unit.startsWith('%') ? '' : meta.unit}` },
      xAxis: { type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 10 }, splitLine: { lineStyle: { color: '#EEECE7' } } },
      yAxis: { type: 'category', inverse: true, data: top.map((r, k) => `${r.iso === 'IND' && i >= 30 ? i + 1 : k + 1}. ${name(r.iso)}`), axisTick: { show: false }, axisLine: { lineStyle: { color: RULE } }, axisLabel: { color: INK, fontSize: 11, formatter: n => /India$/.test(n) ? `{r|${n}}` : n, rich: { r: { color: RED, fontWeight: 700 } } } },
      series: [{ type: 'bar', barWidth: '70%', data: top.map(r => ({ value: r.v, itemStyle: { color: r.iso === 'IND' ? RED : '#9AA0A8', borderRadius: 2 } })), label: { show: true, position: 'right', fontFamily: MONO, fontSize: 10, color: MUTE, formatter: p => fmt(p.value, meta.unit) } }] }, true);
    $('#wd-note').textContent = `Top 30 of ${rows.length} countries with data${i >= 30 ? ', plus India' : ''}. ${meta.label}, ${meta.unit}. ${+year >= W.year ? 'IMF projection.' : ''}`;
    // rank over time
    const yrs = Array.from({ length: 42 }, (_, k) => String(1990 + k));
    const rk = yrs.map(y => { const r = Object.entries(D).map(([iso, s]) => [iso, s[y]]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]); const j = r.findIndex(x => x[0] === 'IND'); return j < 0 ? null : j + 1; });
    const cut = yrs.indexOf(String(W.year));
    line.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 40, right: 20, top: 16, bottom: 30 }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : ord(v) },
      xAxis: { type: 'category', data: yrs, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 10 }, axisLine: { lineStyle: { color: RULE } } },
      yAxis: { type: 'value', inverse: true, min: 1, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 10 }, splitLine: { lineStyle: { color: '#EEECE7' } } },
      series: [{ type: 'line', data: rk.map((v, k) => k < cut ? v : null), lineStyle: { color: RED, width: 2.4 }, itemStyle: { color: RED }, symbolSize: 5 }, { type: 'line', data: rk.map((v, k) => k >= cut - 1 ? v : null), lineStyle: { color: RED, width: 2, type: 'dashed' }, itemStyle: { color: RED }, symbolSize: 4 }] }, true);
  };
  const go = () => { if (!window.echarts) return setTimeout(go, 60);
    bars = echarts.init($('#wd-bars')); line = echarts.init($('#wd-line')); addEventListener('resize', () => { bars.resize(); line.resize(); });
    $('#wd-ind').addEventListener('change', e => { ind = e.target.value; draw(); });
    $('#wd-year').addEventListener('input', e => { year = e.target.value; draw(); });
    $$('.wd-card').forEach(c => c.addEventListener('click', () => { ind = c.dataset.i; $('#wd-ind').value = ind; draw(); $('#wd-title').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    draw(); };
  go();
})();
