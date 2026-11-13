// Indicator page charts: every panel loads its series from /api/series/, draws actuals solid and IMF projections dashed,
// shades target bands, marks series breaks, and offers range buttons and a CSV of exactly what is drawn.
(function () {
  const C = ['#b3261e', '#1f4e79', '#c98a1b', '#2e7d5b', '#6b4c9a', '#4a4a4a', '#0e7c86', '#a0522d'];
  const ts = d => Date.parse((d.length === 4 ? d + '-12-31' : d.length === 7 ? d + '-15' : d) + 'T00:00:00Z');
  const cache = {};
  const load = id => cache[id] || (cache[id] = fetch('/api/series/' + id + '.json').then(r => r.json()));
  const fmt = v => v == null ? '—' : Math.abs(v) >= 1000 ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  function draw(el) {
    const cfg = JSON.parse(el.dataset.cfg), sec = el.closest('.ip-panel');
    Promise.all(cfg.ids.map(load)).then(S => {
      const chart = echarts.init(el), series = [];
      let tMax = 0, tMin = Infinity;
      S.forEach((s, k) => {
        const P = s.projectionFrom, act = [], proj = [];
        const sc = (cfg.scales || {})[s.id] || 1; s.d.forEach((d, i) => { if (s.v[i] == null) return; const p = [ts(d), s.v[i] / sc]; tMax = Math.max(tMax, p[0]); tMin = Math.min(tMin, p[0]); if (P && d.slice(0, 4) >= P) proj.push(p); else act.push(p); });
        if (proj.length && act.length) proj.unshift(act.at(-1));
        const name = (cfg.names[s.id] || s.name) + (cfg.units && /US\$ bn/.test(cfg.units[s.id] || '') ? ' (US$ bn)' : ''), color = C[k % C.length];
        const base = { name, type: cfg.bar && k === 0 ? 'bar' : 'line', showSymbol: false, symbolSize: 4, connectNulls: false, color, lineStyle: { width: k ? 1.6 : 2.2 }, emphasis: { focus: 'series' } };
        const s1 = { ...base, data: act, ...(base.type === 'bar' ? { barGap: '-100%' } : {}) };
        if (k === 0) {
          const ml = [];
          if (cfg.line != null) ml.push({ yAxis: cfg.line, lineStyle: { color: '#333', type: 'dashed', width: 1 }, label: { show: !!cfg.lineLabel, formatter: cfg.lineLabel || '', position: 'insideEndTop', color: '#333', fontSize: 11 } });
          (cfg.breaks || []).forEach(b => ml.push({ xAxis: ts(b.at), lineStyle: { color: '#777', type: 'dotted' }, label: { formatter: b.label, position: 'insideEndTop', color: '#555', fontSize: 11 } }));
          if (ml.length) s1.markLine = { silent: true, symbol: 'none', data: ml };
          if (cfg.band) s1.markArea = { silent: true, itemStyle: { color: 'rgba(46,125,91,.08)' }, data: [[{ yAxis: cfg.band[0] }, { yAxis: cfg.band[1] }]] };
        }
        series.push(s1);
        if (proj.length) { if (base.type === 'bar') proj.shift(); series.push({ ...base, name: name + ' (IMF projection)', data: proj, lineStyle: { width: 1.6, type: 'dashed' }, showSymbol: true, itemStyle: base.type === 'bar' ? { color: 'transparent', borderColor: color, borderWidth: 1.5, borderType: 'dashed' } : undefined }); }
      });
      chart.setOption({
        animation: false, grid: { left: 52, right: 18, top: 36, bottom: 64 }, legend: { top: 0, type: 'scroll', textStyle: { fontSize: 12 } },
        tooltip: { trigger: 'axis', valueFormatter: fmt },
        xAxis: { type: 'time', min: 'dataMin', max: 'dataMax' }, yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: '#eee' } } },
        dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }], series,
      });
      const setRange = r => {
        const yrs = { '1Y': 1, '3Y': 3, '5Y': 5, '10Y': 10 }[r];
        chart.dispatchAction({ type: 'dataZoom', startValue: yrs ? Math.max(tMin, tMax - yrs * 365.25 * 864e5) : tMin, endValue: tMax });
      };
      sec.querySelectorAll('.ip-range button').forEach(b => b.addEventListener('click', () => {
        sec.querySelectorAll('.ip-range button').forEach(x => x.setAttribute('aria-pressed', x === b)); setRange(b.dataset.r);
      }));
      setRange(cfg.range);
      sec.querySelector('.ip-csv').addEventListener('click', () => {
        const dates = [...new Set(S.flatMap(s => s.d))].sort(), maps = S.map(s => new Map(s.d.map((d, i) => [d, s.v[i] == null ? null : s.v[i] / ((cfg.scales || {})[s.id] || 1)])));
        const csv = ['date,' + S.map(s => '"' + (cfg.names[s.id] || s.name).replace(/"/g, "'") + ' (' + ((cfg.units || {})[s.id] || s.unit) + ')"').join(','), ...dates.map(d => d + ',' + maps.map(m => m.get(d) ?? '').join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = (sec.id || 'data') + '.csv'; a.click();
      });
      addEventListener('resize', () => chart.resize());
    });
  }
  const go = () => document.querySelectorAll('.ip-chart').forEach(el => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); draw(el); } }), { rootMargin: '300px' }); io.observe(el);
  });
  if (window.echarts) go(); else addEventListener('load', go);
})();
