/* Real-economy tracker charts. Data: window.__EC */
(function () {
  const E = window.__EC; if (!E) return;
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#17202C', MUTE = '#555A61', RULE = '#D9DED3';
  const PAL = ['#17202C', '#1C7C99', '#B87708', '#5F7F14', '#B5367A', '#6D5BA8'];
  const axis = (x = {}) => ({ axisLine: { lineStyle: { color: RULE } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#E6EAE2' } }, ...x });
  const tip = { trigger: 'axis', backgroundColor: '#fff', borderColor: INK, borderWidth: 1, textStyle: { color: INK, fontFamily: FONT, fontSize: 12 } };
  const go = () => { if (!window.echarts) return setTimeout(go, 60);
    const mk = id => { const el = document.getElementById(id); if (!el) return null; const c = echarts.init(el); addEventListener('resize', () => c.resize()); return c; };
    const h = mk('ec-heat');
    if (h) { const data = []; E.heat.forEach((r, y) => r.v.forEach((v, x) => data.push([x, y, v == null ? '-' : v])));
      h.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 210, right: 16, top: 8, bottom: 60 }, tooltip: { formatter: p => `${E.heat[p.value[1]].n}, ${E.months[p.value[0]]}: ${p.value[2] === '-' ? 'n/a' : (p.value[2] > 0 ? '+' : '') + p.value[2] + '%'}` },
        xAxis: axis({ type: 'category', data: E.months, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 10, rotate: 45 }, splitArea: { show: false } }),
        yAxis: axis({ type: 'category', data: E.heat.map(r => r.n), inverse: true, axisLabel: { color: INK, fontSize: 12 } }),
        visualMap: { show: false, min: -10, max: 10, inRange: { color: ['#9F1D14', '#E8A39B', '#F6F3EE', '#9CCBAE', '#0B5A2F'] } },
        series: [{ type: 'heatmap', data, label: { show: innerWidth > 700, fontFamily: MONO, fontSize: 9.5, color: INK, formatter: p => p.value[2] === '-' ? '' : Math.round(p.value[2]) }, itemStyle: { borderColor: '#fff', borderWidth: 1.5 } }] });
      h.on('click', p => { const r = E.heat[p.value[1]]; if (r) location.href = `/s/${r.id}/`; }); }
    const lines = (id, sers, from) => { const c = mk(id); if (!c) return; const ds = [...new Set(sers.flatMap(s => s.d))].sort().filter(d => !from || d >= from);
      c.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 44, right: 20, top: 36, bottom: 56 }, tooltip: { ...tip, valueFormatter: v => v == null ? '—' : v + '%' }, legend: { top: 0, textStyle: { color: MUTE } },
        dataZoom: [{ type: 'slider', height: 18, bottom: 8, start: from ? 0 : 60 }], xAxis: axis({ type: 'category', data: ds, boundaryGap: false }), yAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '{value}%' } }),
        series: sers.map((s, i) => { const m = Object.fromEntries(s.d.map((d, j) => [d, s.v[j]])); return { name: s.n, type: 'line', showSymbol: false, connectNulls: true, data: ds.map(d => m[d] ?? null), lineStyle: { width: i ? 1.6 : 2.4, color: PAL[i] }, itemStyle: { color: PAL[i] } }; }) });
      c.on('click', p => { const s = sers[p.seriesIndex]; if (s) location.href = `/s/${s.id}/`; }); };
    lines('ec-iip', E.iip, '2015-01-01'); lines('ec-money', E.money);
    const t = E.trade && mk('ec-trade');
    if (t) { const k = E.trade.d.findIndex(d => d >= '2019-01-01'), d = E.trade.d.slice(k), x = E.trade.x.slice(k), m = E.trade.m.slice(k);
      t.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 50, right: 20, top: 36, bottom: 30 }, tooltip: { ...tip, valueFormatter: v => v == null ? '—' : '$' + v + 'bn' }, legend: { top: 0, textStyle: { color: MUTE } },
        xAxis: axis({ type: 'category', data: d.map(s => s.slice(0, 7)) }), yAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '${value}bn' } }),
        series: [{ name: 'Exports', type: 'line', showSymbol: false, data: x, lineStyle: { color: '#5F7F14', width: 2 }, itemStyle: { color: '#5F7F14' } }, { name: 'Imports', type: 'line', showSymbol: false, data: m, lineStyle: { color: '#B5367A', width: 2 }, itemStyle: { color: '#B5367A' } },
          { name: 'Deficit', type: 'bar', data: x.map((v, i) => v == null || m[i] == null ? null : +(v - m[i]).toFixed(2)), itemStyle: { color: '#C9CFC3' } }] }); }
  };
  go();
})();
