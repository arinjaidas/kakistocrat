/* Chokepoint watch charts (Apache ECharts). Data: /api/markets/portwatch.json and /api/markets/fred.json */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#15171A', MUTE = '#6B7078', RULE = '#E2DFD8';
  const TYPE = [['tanker', 'Tankers', '#B42318'], ['container', 'Container ships', '#1D4ED8'], ['bulk', 'Dry bulk', '#B45309'], ['other', 'Other cargo', '#9AA0A8']];
  const SH = { 'Strait of Hormuz': 'Hormuz', 'Bab el-Mandeb Strait': 'Bab el-Mandeb', 'Suez Canal': 'Suez', 'Cape of Good Hope': 'Cape of Good Hope', 'Malacca Strait': 'Malacca' };
  const COL = { 'Strait of Hormuz': '#B42318', 'Bab el-Mandeb Strait': '#B45309', 'Suez Canal': '#1D4ED8', 'Cape of Good Hope': '#0F766E', 'Malacca Strait': '#6B7078' };
  const axis = (x = {}) => ({ axisLine: { lineStyle: { color: RULE } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#EEECE7' } }, ...x });
  const tip = { trigger: 'axis', backgroundColor: '#fff', borderColor: INK, borderWidth: 1, textStyle: { color: INK, fontFamily: FONT, fontSize: 12 } };
  const ma = (a, n = 7) => a.map((_, i) => { if (i < n - 1) return null; const w = a.slice(i - n + 1, i + 1).filter(x => x != null); return w.length ? +(w.reduce((s, x) => s + x, 0) / w.length).toFixed(1) : null; });
  const startFor = (d, r) => { if (r === 'All') return 0; const t = new Date(d.at(-1)); const n = parseInt(r); r.endsWith('M') ? t.setMonth(t.getMonth() - n) : t.setFullYear(t.getFullYear() - n); const iso = t.toISOString().slice(0, 10); return Math.max(0, d.findIndex(x => x >= iso)); };
  const go = async () => { if (!window.echarts) return setTimeout(go, 60);
    const [PW, FR] = await Promise.all([fetch('/api/markets/portwatch.json').then(r => r.json()), fetch('/api/markets/fred.json').then(r => r.json()).catch(() => ({}))]);
    const C = PW.chokepoints, brent = new Map((FR.DCOILBRENTEU?.pts) || []);
    const main = echarts.init($('#hz-chart')), multi = echarts.init($('#hz-multi')), cap = echarts.init($('#hz-cap'));
    addEventListener('resize', () => [main, multi, cap].forEach(c => c.resize()));
    let cp = $('#hz-cp').value, rng = '1Y';
    const draw = () => {
      const c = C[cp], s = startFor(c.d, rng), d = c.d.slice(s);
      const other = c.total.map((t, i) => Math.max(0, t - (c.tanker[i] || 0) - (c.container[i] || 0) - (c.bulk[i] || 0)));
      const ser = { tanker: c.tanker, container: c.container, bulk: c.bulk, other };
      const withB = $('#hz-brent').checked; let lb = null; const bv = d.map(x => { const v = brent.get(x); if (v != null) lb = v; return v ?? lb; });
      $('#hz-title').textContent = `${cp}: ships a day`; $('#hz-why').textContent = window.__HZ.why[cp] || '';
      main.setOption({ textStyle: { fontFamily: FONT }, animationDuration: 400, grid: { left: 48, right: withB ? 56 : 20, top: 40, bottom: 40 }, tooltip: tip,
        legend: { top: 0, textStyle: { color: MUTE, fontSize: 11 } },
        xAxis: axis({ type: 'category', data: d }), yAxis: [axis({ type: 'value', name: 'ships', nameTextStyle: { color: MUTE } }), axis({ type: 'value', show: withB, scale: true, splitLine: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '${value}' } })],
        series: [...TYPE.map(([k, n, col]) => ({ name: n, type: 'bar', stack: 't', data: ser[k].slice(s), itemStyle: { color: col, opacity: 0.55 }, barCategoryGap: '10%' })),
          { name: '7-day average', type: 'line', data: ma(c.total).slice(s), showSymbol: false, lineStyle: { color: INK, width: 2.4 }, itemStyle: { color: INK }, z: 5,
            markLine: window.__HZ.base[cp] ? { silent: true, symbol: 'none', data: [{ yAxis: +window.__HZ.base[cp].toFixed(1) }], lineStyle: { color: MUTE, type: 'dotted' }, label: { formatter: '2025 average', color: MUTE, fontSize: 10, position: 'insideEndTop' } } : undefined },
          ...(withB ? [{ name: 'Brent, $/bbl', type: 'line', yAxisIndex: 1, data: bv, showSymbol: false, lineStyle: { color: '#B45309', width: 1.6, type: 'dashed' }, itemStyle: { color: '#B45309' } }] : [])] }, true);
    };
    $('#hz-cp').addEventListener('change', e => { cp = e.target.value; draw(); });
    $('#hz-brent').addEventListener('change', draw);
    $$('#hz-range button').forEach(b => b.addEventListener('click', () => { $$('#hz-range button').forEach(x => x.removeAttribute('aria-pressed')); b.setAttribute('aria-pressed', 'true'); rng = b.dataset.r; draw(); }));
    draw();
    // Small multiples as one indexed chart
    const names = Object.keys(C), d0 = C[names[0]].d;
    multi.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 48, right: 150, top: 30, bottom: 56 }, tooltip: { ...tip, valueFormatter: v => v == null ? '—' : v.toFixed(0) },
      legend: { top: 0, textStyle: { color: MUTE, fontSize: 11 } }, dataZoom: [{ type: 'inside', start: 50 }, { type: 'slider', height: 18, bottom: 8, borderColor: RULE, start: 50 }],
      xAxis: axis({ type: 'category', data: d0, boundaryGap: false }), yAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 } }),
      series: names.map(n => { const m = new Map(C[n].d.map((x, i) => [x, C[n].total[i]])), b = window.__HZ.base[n]; const sm = ma(d0.map(x => m.get(x) ?? null));
        return { name: SH[n] || n, type: 'line', data: sm.map(v => v == null || !b ? null : +(v / b * 100).toFixed(1)), showSymbol: false, lineStyle: { width: n === 'Strait of Hormuz' ? 2.8 : 1.6, color: COL[n] }, itemStyle: { color: COL[n] },
          endLabel: { show: true, formatter: p => `${SH[n] || n} ${p.value == null ? '' : Math.round(p.value)}`, color: COL[n], fontFamily: MONO, fontSize: 11 } }; }).concat([{ type: 'line', data: [], markLine: { silent: true, symbol: 'none', data: [{ yAxis: 100 }], lineStyle: { color: MUTE, type: 'dotted' }, label: { show: false } } }]) });
    // Tanker capacity Hormuz
    const h = C['Strait of Hormuz'];
    if (h) cap.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 56, right: 20, top: 16, bottom: 56 }, tooltip: { ...tip, valueFormatter: v => v == null ? '—' : Math.round(v).toLocaleString('en-IN') + ' thousand t' },
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8, borderColor: RULE }],
      xAxis: axis({ type: 'category', data: h.d, boundaryGap: false }), yAxis: axis({ type: 'value' }),
      series: [{ name: 'Tanker deadweight, 7-day avg', type: 'line', data: ma(h.capT.map(v => v == null ? null : v / 1000)), showSymbol: false, lineStyle: { color: '#B42318', width: 1.8 }, itemStyle: { color: '#B42318' }, areaStyle: { color: 'rgba(180,35,24,.12)' } }] });
  };
  go();
})();
