(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = fn => window.echarts ? fn() : setTimeout(() => wait(fn), 60);
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', SERIF = '"Newsreader", Georgia, serif', INK = '#17202C', MUTE = '#555A61';
  const Y = window.__IGYEAR, charts = {};
  const FLAG = { IND: '#B5367A', CHN: '#B87708', USA: '#1C7C99', IDN: '#5F7F14', VNM: '#5E6B4E', BRA: '#6D5BA8', MEX: '#4B5563', ZAF: '#7B4B2A', TUR: '#555A61', BGD: '#5F7F14', PHL: '#16506A', DEU: '#17202C', JPN: '#B5367A', GBR: '#4B5563' };
  wait(async () => {
    const [IG, W] = await Promise.all([fetch('/api/infographics.json').then(r => r.json()), fetch('/api/markets/world.json').then(r => r.json())]);
    const mk = id => (charts[id] = echarts.init($('#' + id)));
    addEventListener('resize', () => Object.values(charts).forEach(c => c.resize()));
    $$('.ig-save').forEach(b => b.addEventListener('click', () => { const c = charts[b.dataset.for]; const a = document.createElement('a'); a.href = c.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' }); a.download = `kakistocrat-${b.dataset.for}.png`; a.click(); }));

    if ($('#ig-rupee')) {
    // 1. Budget rupee sankey
    const R = IG.rupee, MID = 'The Budget rupee';
    const srcCol = n => /Borrow/.test(n) ? '#B5367A' : /tax|Customs|excise/i.test(n) ? '#17202C' : '#555A61';
    const useCol = n => /Interest/.test(n) ? '#B5367A' : /States|Finance Commission|Centrally/.test(n) ? '#1C7C99' : /Defence/.test(n) ? '#4B5563' : '#5F7F14';
    mk('ig-rupee').setOption({ textStyle: { fontFamily: FONT }, tooltip: { formatter: p => p.dataType === 'edge' ? `${p.data.source === MID ? p.data.target : p.data.source}: <b>${p.data.value} paise</b> in every rupee` : `<b>${p.name}</b>` },
      series: [{ type: 'sankey', left: 10, right: 300, top: 20, bottom: 20, nodeWidth: 16, nodeGap: 10, layoutIterations: 0, draggable: false, emphasis: { focus: 'adjacency' },
        label: { fontFamily: FONT, fontSize: 13, color: INK, formatter: p => p.name === MID ? '' : `{n|${p.name}}  {v|${p.value}p}`, rich: { n: { fontFamily: FONT, fontSize: 13 }, v: { fontFamily: MONO, fontSize: 12, fontWeight: 700, color: INK } } },
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },
        data: [...R.from.map(([n]) => ({ name: n, itemStyle: { color: srcCol(n) }, label: { position: 'left' } })), { name: MID, itemStyle: { color: INK } }, ...R.to.map(([n]) => ({ name: n, itemStyle: { color: useCol(n) } }))],
        links: [...R.from.map(([n, v]) => ({ source: n, target: MID, value: v })), ...R.to.map(([n, v]) => ({ source: MID, target: n, value: v }))] }],
      graphic: [{ type: 'text', left: 'center', top: 0, style: { text: '', fontFamily: SERIF } }] });
    $('#ig-rupee-note').textContent = `${R.year}. ${R.notes} Source: ${R.source.name}.`;
    // The sankey needs the left labels on the left: shift left margin
    charts['ig-rupee'].setOption({ series: [{ left: 230 }] });

    }
    const C = W.countries, G = W.imf.NGDPD.data;
    if ($('#ig-race')) {
    // 2. bar race of GDP (US$ bn)
    const years = Array.from({ length: Y + 5 - 1990 + 1 }, (_, i) => 1990 + i);
    const race = mk('ig-race');
    const drawYear = y => { const rows = Object.keys(C).map(k => ({ k, n: C[k], v: G[k]?.[String(y)] })).filter(r => r.v != null).sort((a, b) => b.v - a.v);
      race.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 130, right: 90, top: 20, bottom: 30 }, xAxis: { max: 'dataMax', axisLabel: { fontFamily: MONO, color: MUTE, formatter: v => v >= 1000 ? `$${(v / 1000).toFixed(0)}tn` : `$${v}bn` }, splitLine: { lineStyle: { color: '#E6EAE2' } } },
        yAxis: { type: 'category', inverse: true, data: rows.map(r => r.n), animationDuration: 300, animationDurationUpdate: 300, axisLabel: { fontFamily: FONT, fontSize: 13, color: INK, fontWeight: 600 } },
        series: [{ type: 'bar', realtimeSort: true, data: rows.map(r => ({ value: +r.v.toFixed(0), itemStyle: { color: FLAG[r.k] || INK } })), label: { show: true, position: 'right', fontFamily: MONO, fontSize: 12, formatter: p => p.value >= 1000 ? `$${(p.value / 1000).toFixed(2)}tn` : `$${p.value}bn` }, barCategoryGap: '22%' }],
        graphic: [{ type: 'text', right: 30, bottom: 50, style: { text: String(y) + (y >= Y ? ' (IMF projection)' : ''), font: `600 ${y >= Y ? 34 : 54}px ${MONO}`, fill: 'rgba(21,23,26,.18)' } }],
        animationDuration: 0, animationDurationUpdate: 700, animationEasing: 'linear', animationEasingUpdate: 'linear' });
      $('#ig-yl').textContent = y; $('#ig-year').value = y; };
    drawYear(Y); let timer = null;
    $('#ig-year').addEventListener('input', e => drawYear(+e.target.value));
    $('#ig-play').addEventListener('click', () => { if (timer) { clearInterval(timer); timer = null; $('#ig-play').textContent = 'Play'; return; } let y = +$('#ig-year').value >= Y + 5 ? 1990 : +$('#ig-year').value; $('#ig-play').textContent = 'Pause'; drawYear(y); timer = setInterval(() => { y++; if (y > Y + 5) { clearInterval(timer); timer = null; $('#ig-play').textContent = 'Play'; return; } drawYear(y); }, 750); });

    }
    if ($('#ig-bub')) {
    // 3. bubbles: growth vs inflation
    const bub = mk('ig-bub');
    const drawBub = y => { const pts = Object.keys(C).map(k => ({ k, n: C[k], g: W.imf.NGDP_RPCH.data[k]?.[String(y)], i: W.imf.PCPIPCH.data[k]?.[String(y)], s: G[k]?.[String(y)] })).filter(p => p.g != null && p.i != null && p.s != null);
      bub.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 60, right: 30, top: 30, bottom: 50 }, tooltip: { formatter: p => `<b>${p.data.n}</b> ${y}${y >= Y ? ' (projection)' : ''}<br>Growth ${p.data.value[1]}%<br>Inflation ${p.data.raw}%<br>GDP $${(p.data.value[2] / 1000).toFixed(2)}tn` },
        xAxis: { name: 'Consumer price inflation, % (log scale)', type: 'log', logBase: 2, min: 0.5, nameLocation: 'middle', nameGap: 30, nameTextStyle: { fontFamily: FONT, color: MUTE }, axisLabel: { fontFamily: MONO, color: MUTE }, splitLine: { lineStyle: { color: '#E6EAE2' } } },
        yAxis: { name: 'Real GDP growth, %', nameTextStyle: { fontFamily: FONT, color: MUTE }, scale: true, axisLabel: { fontFamily: MONO, color: MUTE }, splitLine: { lineStyle: { color: '#E6EAE2' } } },
        series: [{ type: 'scatter', data: pts.map(p => ({ n: p.n, value: [Math.max(0.5, p.i), p.g, p.s], raw: p.i, itemStyle: { color: FLAG[p.k], opacity: p.k === 'IND' ? 0.95 : 0.6, borderColor: '#fff', borderWidth: 1 } })), symbolSize: d => 10 + Math.sqrt(d[2] / 32000) * 70,
          label: { show: true, formatter: p => p.data.n, position: 'top', fontFamily: FONT, fontSize: 11, color: INK }, animationDurationUpdate: 600 }] }, true); };
    drawBub(Y); $('#ig-by').addEventListener('change', e => drawBub(+e.target.value));

    }
    if ($('#ig-debt')) {
    // 4. debt vs deficit
    const yy = String(Y);
    const pts = Object.keys(C).map(k => ({ k, n: C[k], d: W.imf.GGXWDG_NGDP.data[k]?.[yy], b: W.imf.GGXCNL_NGDP.data[k]?.[yy] })).filter(p => p.d != null && p.b != null);
    mk('ig-debt').setOption({ textStyle: { fontFamily: FONT }, grid: { left: 70, right: 30, top: 40, bottom: 50 }, tooltip: { formatter: p => `<b>${p.data.n}</b> ${Y} (IMF projection)<br>Debt ${p.data.value[0]}% of GDP<br>Overall balance ${p.data.value[1]}% of GDP` },
      xAxis: { name: 'General government gross debt, % of GDP', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: MUTE }, axisLabel: { fontFamily: MONO, color: MUTE }, splitLine: { lineStyle: { color: '#E6EAE2' } } },
      yAxis: { name: 'Overall balance, % of GDP (negative = deficit)', nameTextStyle: { color: MUTE }, axisLabel: { fontFamily: MONO, color: MUTE }, splitLine: { lineStyle: { color: '#E6EAE2' } } },
      series: [{ type: 'scatter', symbolSize: 16, data: pts.map(p => ({ n: p.n, value: [p.d, p.b], itemStyle: { color: FLAG[p.k], opacity: p.k === 'IND' ? 1 : 0.7 } })), label: { show: true, position: 'right', formatter: p => p.data.n, fontFamily: FONT, fontSize: 11, color: INK },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: '#C9CFC3', type: 'dashed' }, label: { fontFamily: MONO, fontSize: 10 }, data: [{ xAxis: 60, name: '60% of GDP' }, { yAxis: -3, name: '−3% deficit' }] } }] });
    }
  });
})();

/* Inflation basket treemap, contributions and item movers */
(function () {
  const el = document.getElementById('ig-cpi'); if (!el) return;
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#17202C', MUTE = '#555A61';
  const scale = v => { // diverging: low = teal, ~4% target = sand, high = deep red
    const stops = [[0, [15, 118, 110]], [2, [94, 160, 150]], [4, [232, 224, 205]], [7, [222, 120, 90]], [10, [180, 35, 24]], [14, [110, 20, 14]]];
    const x = Math.max(0, Math.min(14, v)); let i = 0; while (i < stops.length - 2 && x > stops[i + 1][0]) i++;
    const [a, ca] = stops[i], [b, cb] = stops[i + 1], t = (x - a) / (b - a); return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(',')})`; };
  const txt = v => v > 5.5 || v < 2.5 ? '#fff' : INK;
  const go = async () => { if (!window.echarts) return setTimeout(go, 60);
    const B = await fetch('/api/cpi_basket.json').then(r => r.json());
    const tm = echarts.init(el), cc = echarts.init(document.getElementById('ig-cpic')), ii = echarts.init(document.getElementById('ig-cpii'));
    addEventListener('resize', () => [tm, cc, ii].forEach(c => c.resize()));
    document.querySelectorAll('.ig-save[data-for="ig-cpi"]').forEach(b => b.addEventListener('click', () => { const a = document.createElement('a'); a.href = tm.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' }); a.download = 'kakistocrat-inflation-basket.png'; a.click(); }));
    tm.setOption({ textStyle: { fontFamily: FONT }, tooltip: { formatter: p => `<b>${p.data.full}</b><br>Weight ${p.data.value.toFixed(2)}% of the basket<br>Inflation ${p.data.inf.toFixed(2)}% in ${B.month}` },
      series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, width: '100%', height: '100%', top: 0, left: 0,
        itemStyle: { borderColor: '#fff', borderWidth: 3, gapWidth: 3 },
        label: { show: true, formatter: p => `{n|${p.data.name}}\n{v|${p.data.inf.toFixed(1)}%}\n{w|${p.data.value.toFixed(1)}% of basket}`, rich: { n: { fontFamily: FONT, fontSize: 14, fontWeight: 600, lineHeight: 20 }, v: { fontFamily: MONO, fontSize: 22, fontWeight: 700, lineHeight: 30 }, w: { fontFamily: MONO, fontSize: 11, lineHeight: 16, opacity: 0.85 } } },
        data: B.divisions.map(d => ({ name: d.short, full: d.name, value: d.weight, inf: d.inflation, itemStyle: { color: scale(d.inflation) }, label: { color: txt(d.inflation) } })) }] });
    const con = B.divisions.map(d => ({ n: d.short, v: +(d.weight * d.inflation / 100).toFixed(3), inf: d.inflation })).sort((a, b) => a.v - b.v);
    const axis = { axisLine: { lineStyle: { color: '#D9DED3' } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#E6EAE2' } } };
    cc.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 200, right: 50, top: 6, bottom: 24 }, tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value.toFixed(2)} points` },
      xAxis: { type: 'value', ...axis }, yAxis: { type: 'category', data: con.map(c => c.n), ...axis, axisLabel: { color: INK, fontSize: 11, fontFamily: FONT } },
      series: [{ type: 'bar', barWidth: '64%', data: con.map(c => ({ value: c.v, itemStyle: { color: scale(c.inf), borderRadius: 2 } })), label: { show: true, position: 'right', fontFamily: MONO, fontSize: 10, color: MUTE, formatter: p => p.value.toFixed(2) } }] });
    const it = [...B.items].sort((a, b) => a.inflation - b.inflation);
    ii.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 110, right: 60, top: 6, bottom: 24 }, tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value > 0 ? '+' : ''}${p.value.toFixed(1)}% a year<br>Basket weight ${it[p.dataIndex].weight.toFixed(2)}%` },
      xAxis: { type: 'value', ...axis, axisLabel: { ...axis.axisLabel, formatter: v => v + '%' } }, yAxis: { type: 'category', data: it.map(x => x.name), ...axis, axisLabel: { color: INK, fontSize: 11, fontFamily: FONT } },
      series: [{ type: 'bar', barWidth: '64%', data: it.map(x => ({ value: x.inflation, itemStyle: { color: x.inflation >= 0 ? '#B5367A' : '#5F7F14', borderRadius: 2 } })), label: { show: true, position: 'right', fontFamily: MONO, fontSize: 10, color: MUTE, formatter: p => (p.value > 0 ? '+' : '') + p.value.toFixed(1) + '%' } }] });
  };
  go();
})();
