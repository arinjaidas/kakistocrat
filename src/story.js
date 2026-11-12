/* Scrolling story: one sticky chart, redrawn as each step scrolls into view. Data: window.__ST */
(function () {
  const S = window.__ST; if (!S) return;
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#15171A', MUTE = '#6B7078', RED = '#B42318', RULE = '#E2DFD8';
  const axis = (x = {}) => ({ axisLine: { lineStyle: { color: RULE } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#EEECE7' } }, ...x });
  const ma = (v, n = 7) => v.map((_, i) => { const w = v.slice(Math.max(0, i - n + 1), i + 1).filter(x => x != null); return w.length ? +(w.reduce((a, b) => a + b, 0) / w.length).toFixed(1) : null; });
  const cut = (o, a, b = '9999') => { const I = o.d.map((d, i) => d >= a && d <= b ? i : -1).filter(i => i >= 0); return { d: I.map(i => o.d[i]), v: I.map(i => (o.v || o.t)[i]), k: o.k ? I.map(i => o.k[i]) : null }; };
  const shut = (d, label = 'Closure') => ({ symbol: 'none', silent: true, lineStyle: { color: RED, type: 'dashed' }, label: { formatter: label, color: RED, fontFamily: MONO, fontSize: 11 }, data: d.includes(S.shut) || d.some(x => x >= S.shut) ? [{ xAxis: d.find(x => x >= S.shut) }] : [] });
  const base = (d, y = {}) => ({ textStyle: { fontFamily: FONT }, animationDuration: 700, animationDurationUpdate: 700, grid: { left: 52, right: 24, top: 40, bottom: 34 }, tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: INK, borderWidth: 1, textStyle: { color: INK, fontSize: 12 } },
    xAxis: axis({ type: 'category', data: d, boundaryGap: false, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: v => v.slice(0, 7) } }), yAxis: axis({ type: 'value', ...y }) });
  const line = (name, v, c = INK, w = 2, extra = {}) => ({ name, type: 'line', showSymbol: false, data: v, lineStyle: { color: c, width: w }, itemStyle: { color: c }, ...extra });
  const CH = {
    'h-long': () => { const x = cut(S.H, '2024-06-01', '2026-02-27'); return [base(x.d), [line('Ships a day', x.v, '#C9C5BC', 1), line('7-day average', ma(x.v), INK, 2.4)], 'Ships through the Strait of Hormuz a day, to 27 February 2026'] },
    'h-shut': () => { const x = cut(S.H, '2026-02-01', '2026-03-31'); return [base(x.d), [line('Ships a day', x.v, INK, 2.4, { showSymbol: true, symbolSize: 5, markLine: shut(x.d) })], 'Ships through Hormuz a day, February–March 2026'] },
    'h-since': () => { const x = cut(S.H, '2025-06-01'); return [base(x.d), [line('Ships a day', x.v, '#C9C5BC', 1), line('7-day average', ma(x.v), INK, 2.4, { markLine: shut(x.d) })], 'Ships through Hormuz a day, since June 2025'] },
    'h-tank': () => { const x = cut(S.H, '2025-06-01'); return [base(x.d), [line('All ships', ma(x.v), '#C9C5BC', 1.6), line('Tankers', ma(x.k), RED, 2.4, { markLine: shut(x.d) })], 'Tankers and all ships through Hormuz, 7-day average'] },
    'brent': () => { const x = cut(S.brent, '2025-06-01'); return [base(x.d, { scale: true, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '${value}' } }), [line('Brent, $ a barrel', x.v, INK, 2.4, { markLine: shut(x.d) })], 'Brent crude, US$ a barrel'] },
    'inr': () => { const x = cut(S.inr, '2025-06-01'); return [base(x.d, { scale: true, inverse: false }), [line('Rupees per dollar', x.v, '#1D4ED8', 2.4, { markLine: shut(x.d) })], 'Rupees per US dollar (higher = weaker rupee)'] },
    'rbar': () => { const m = Object.fromEntries(S.inr.d.map((d, i) => [d, S.inr.v[i]])); let r = null; const d = [], v = []; S.brent.d.forEach((x, i) => { if (m[x] != null) r = m[x]; if (r && S.brent.v[i] != null) { d.push(x); v.push(Math.round(S.brent.v[i] * r)); } });
      return [base(d, { scale: true, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: v => '₹' + (v / 1000).toFixed(0) + 'k' } }), [line('₹ a barrel', v, RED, 2.4, { areaStyle: { color: 'rgba(180,35,24,.07)' }, markLine: shut(d) })], 'Brent in rupees a barrel'] },
    'gulf': () => { const g = [...S.gulf].sort((a, b) => a.v - b.v); return [{ textStyle: { fontFamily: FONT }, animationDurationUpdate: 700, grid: { left: 110, right: 70, top: 20, bottom: 30 }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '${value}bn' } }), yAxis: axis({ type: 'category', data: g.map(x => x.n), axisLabel: { color: INK, fontSize: 12 } }) },
      [{ type: 'bar', data: g.map(x => +(x.v / 1e9).toFixed(1)), itemStyle: { color: RED }, barWidth: '60%', label: { show: true, position: 'right', fontFamily: MONO, fontSize: 11, formatter: '${c}bn', color: MUTE } }], 'India’s imports from the Gulf, last full year, US$ bn'] },
    'routes': () => { const names = Object.keys(S.routes), all = names.map(n => cut(S.routes[n], '2025-10-01')), d = all[0].d, PAL = [RED, INK, '#1D4ED8', '#B45309', '#0F766E'];
      const idx = v => { const b = v.slice(0, 120).filter(x => x != null), m = b.reduce((a, c) => a + c, 0) / b.length; return ma(v).map(x => x == null ? null : +(x / m * 100).toFixed(1)); };
      return [base(d, { axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 } }), all.map((x, i) => line(names[i], idx(x.v), PAL[i], i ? 1.6 : 2.6, i ? {} : { markLine: shut(d) })), 'Transits through each chokepoint, 7-day average, October 2025–February 2026 average = 100'] },
  };
  let ch, cur;
  const draw = k => { if (k === cur || !CH[k]) return; cur = k; const [o, series, cap] = CH[k](); ch.setOption({ ...o, legend: series.length > 1 ? { top: 0, textStyle: { color: MUTE } } : { show: false }, series }, true); document.getElementById('st-cap').textContent = cap; };
  const go = () => { if (!window.echarts) return setTimeout(go, 60);
    ch = echarts.init(document.getElementById('st-chart')); addEventListener('resize', () => ch.resize());
    const steps = [...document.querySelectorAll('.st-step')];
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { steps.forEach(s => s.classList.toggle('on', s === e.target)); draw(e.target.dataset.chart); } }), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s)); draw(steps[0].dataset.chart); steps[0].classList.add('on'); };
  go();
})();
