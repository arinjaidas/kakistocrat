/* India's trade page charts. Data: window.__TR */
(function () {
  const T = window.__TR; if (!T) return;
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#15171A', MUTE = '#6B7078', RULE = '#E2DFD8', G = '#0F6B3A', R = '#B42318';
  const PAL = ['#1D4ED8', '#B42318', '#0F766E', '#B45309', '#7C3AED', '#3F6212', '#0E7490', '#9D174D', '#57534E', '#A16207', '#4338CA', '#15803D'];
  const axis = (x = {}) => ({ axisLine: { lineStyle: { color: RULE } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#EEECE7' } }, ...x });
  const tip = { trigger: 'axis', backgroundColor: '#fff', borderColor: INK, borderWidth: 1, textStyle: { color: INK, fontFamily: FONT, fontSize: 12 }, valueFormatter: v => v == null ? '—' : '$' + v.toFixed(1) + 'bn' };
  const b = v => v == null ? null : +(v / 1e9).toFixed(2);
  const go = () => { if (!window.echarts) return setTimeout(go, 60);
    const mk = id => { const c = echarts.init(document.getElementById(id)); addEventListener('resize', () => c.resize()); return c; };
    mk('tr-world').setOption({ textStyle: { fontFamily: FONT }, grid: { left: 52, right: 20, top: 34, bottom: 30 }, tooltip: tip, legend: { top: 0, textStyle: { color: MUTE } },
      xAxis: axis({ type: 'category', data: T.years }), yAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '${value}bn' } }),
      series: [{ name: 'Exports', type: 'bar', data: T.years.map(y => b(T.world.X[y])), itemStyle: { color: G } }, { name: 'Imports', type: 'bar', data: T.years.map(y => b(T.world.M[y])), itemStyle: { color: R } },
        { name: 'Deficit', type: 'line', data: T.years.map(y => b((T.world.M[y] || 0) - (T.world.X[y] || 0))), lineStyle: { color: INK, width: 2 }, itemStyle: { color: INK } }] });
    const tm = (id, rows, col) => mk(id).setOption({ tooltip: { formatter: p => `${p.name}: $${(p.value / 1e9).toFixed(1)}bn` }, series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, width: '100%', height: '100%', top: 0, left: 0,
      itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 }, label: { formatter: p => `${p.name}\n$${(p.value / 1e9).toFixed(1)}bn`, fontFamily: FONT, fontSize: 12, color: '#fff' },
      data: rows.slice(0, 30).map((r, i) => ({ name: r.n, value: r.v, itemStyle: { color: col, opacity: 1 - Math.min(0.6, i * 0.025) } })) }] });
    tm('tr-cx', T.chapters.X || [], G); tm('tr-cm', T.chapters.M || [], R);
    const lines = (id, fl) => { const c = mk(id); c.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 52, right: 110, top: 10, bottom: 30 }, tooltip: { ...tip, order: 'valueDesc' },
      xAxis: axis({ type: 'category', data: T.years, boundaryGap: false }), yAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '${value}bn' } }),
      series: T.top.slice(0, 8).map((p, i) => ({ name: p.name, type: 'line', showSymbol: false, data: T.years.map(y => b(p[fl][y])), lineStyle: { color: PAL[i], width: 2 }, itemStyle: { color: PAL[i] }, endLabel: { show: true, formatter: '{a}', color: PAL[i], fontSize: 11 } })) });
      c.on('click', p => { const t = T.top.find(x => x.name === p.seriesName); if (t?.slug) location.href = `/country/${t.slug}/`; }); };
    lines('tr-px', 'X'); lines('tr-pm', 'M');
    const bal = [...T.balance].sort((a, b) => a.b - b.b), cb = mk('tr-bal');
    cb.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 150, right: 60, top: 10, bottom: 30 }, tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value >= 0 ? 'surplus' : 'deficit'} of $${Math.abs(p.value).toFixed(1)}bn` },
      xAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '${value}bn' } }), yAxis: axis({ type: 'category', data: bal.map(x => x.name), axisLabel: { color: INK, fontSize: 11 } }),
      series: [{ type: 'bar', barWidth: '64%', data: bal.map(x => ({ value: b(x.b), itemStyle: { color: x.b >= 0 ? G : R } })), label: { show: true, position: 'right', fontFamily: MONO, fontSize: 10, color: MUTE, formatter: p => (p.value >= 0 ? '+' : '') + p.value.toFixed(1) } }] });
    cb.on('click', p => { const t = bal[p.dataIndex]; if (t?.slug) location.href = `/country/${t.slug}/`; });
  };
  go();
})();
