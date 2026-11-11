(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = fn => window.echarts ? fn() : setTimeout(() => wait(fn), 60);
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', SERIF = '"Newsreader", Georgia, serif', INK = '#15171A', MUTE = '#6B7078';
  const Y = window.__IGYEAR, charts = {};
  const FLAG = { IND: '#B42318', CHN: '#B45309', USA: '#1D4ED8', IDN: '#0F766E', VNM: '#3F6212', BRA: '#7C3AED', MEX: '#334155', ZAF: '#9A5B00', TUR: '#6B7078', BGD: '#0F6B3A', PHL: '#1E3A8A', DEU: '#15171A', JPN: '#BE185D', GBR: '#475569' };
  wait(async () => {
    const [IG, W] = await Promise.all([fetch('/api/infographics.json').then(r => r.json()), fetch('/api/markets/world.json').then(r => r.json())]);
    const mk = id => (charts[id] = echarts.init($('#' + id)));
    addEventListener('resize', () => Object.values(charts).forEach(c => c.resize()));
    $$('.ig-save').forEach(b => b.addEventListener('click', () => { const c = charts[b.dataset.for]; const a = document.createElement('a'); a.href = c.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' }); a.download = `kakistocrat-${b.dataset.for}.png`; a.click(); }));

    // 1. Budget rupee sankey
    const R = IG.rupee, MID = 'The Budget rupee';
    const srcCol = n => /Borrow/.test(n) ? '#B42318' : /tax|Customs|excise/i.test(n) ? '#15171A' : '#6B7078';
    const useCol = n => /Interest/.test(n) ? '#B42318' : /States|Finance Commission|Centrally/.test(n) ? '#1D4ED8' : /Defence/.test(n) ? '#334155' : '#0F766E';
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

    // 2. bar race of GDP (US$ bn)
    const G = W.imf.NGDPD.data, C = W.countries, years = Array.from({ length: Y + 5 - 1990 + 1 }, (_, i) => 1990 + i);
    const race = mk('ig-race');
    const drawYear = y => { const rows = Object.keys(C).map(k => ({ k, n: C[k], v: G[k]?.[String(y)] })).filter(r => r.v != null).sort((a, b) => b.v - a.v);
      race.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 130, right: 90, top: 20, bottom: 30 }, xAxis: { max: 'dataMax', axisLabel: { fontFamily: MONO, color: MUTE, formatter: v => v >= 1000 ? `$${(v / 1000).toFixed(0)}tn` : `$${v}bn` }, splitLine: { lineStyle: { color: '#EEECE7' } } },
        yAxis: { type: 'category', inverse: true, data: rows.map(r => r.n), animationDuration: 300, animationDurationUpdate: 300, axisLabel: { fontFamily: FONT, fontSize: 13, color: INK, fontWeight: 600 } },
        series: [{ type: 'bar', realtimeSort: true, data: rows.map(r => ({ value: +r.v.toFixed(0), itemStyle: { color: FLAG[r.k] || INK } })), label: { show: true, position: 'right', fontFamily: MONO, fontSize: 12, formatter: p => p.value >= 1000 ? `$${(p.value / 1000).toFixed(2)}tn` : `$${p.value}bn` }, barCategoryGap: '22%' }],
        graphic: [{ type: 'text', right: 30, bottom: 50, style: { text: String(y) + (y >= Y ? ' (IMF projection)' : ''), font: `600 ${y >= Y ? 34 : 54}px ${MONO}`, fill: 'rgba(21,23,26,.18)' } }],
        animationDuration: 0, animationDurationUpdate: 700, animationEasing: 'linear', animationEasingUpdate: 'linear' });
      $('#ig-yl').textContent = y; $('#ig-year').value = y; };
    drawYear(Y); let timer = null;
    $('#ig-year').addEventListener('input', e => drawYear(+e.target.value));
    $('#ig-play').addEventListener('click', () => { if (timer) { clearInterval(timer); timer = null; $('#ig-play').textContent = 'Play'; return; } let y = +$('#ig-year').value >= Y + 5 ? 1990 : +$('#ig-year').value; $('#ig-play').textContent = 'Pause'; drawYear(y); timer = setInterval(() => { y++; if (y > Y + 5) { clearInterval(timer); timer = null; $('#ig-play').textContent = 'Play'; return; } drawYear(y); }, 750); });

    // 3. bubbles: growth vs inflation
    const bub = mk('ig-bub');
    const drawBub = y => { const pts = Object.keys(C).map(k => ({ k, n: C[k], g: W.imf.NGDP_RPCH.data[k]?.[String(y)], i: W.imf.PCPIPCH.data[k]?.[String(y)], s: G[k]?.[String(y)] })).filter(p => p.g != null && p.i != null && p.s != null);
      bub.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 60, right: 30, top: 30, bottom: 50 }, tooltip: { formatter: p => `<b>${p.data.n}</b> ${y}${y >= Y ? ' (projection)' : ''}<br>Growth ${p.data.value[1]}%<br>Inflation ${p.data.raw}%<br>GDP $${(p.data.value[2] / 1000).toFixed(2)}tn` },
        xAxis: { name: 'Consumer price inflation, % (log scale)', type: 'log', logBase: 2, min: 0.5, nameLocation: 'middle', nameGap: 30, nameTextStyle: { fontFamily: FONT, color: MUTE }, axisLabel: { fontFamily: MONO, color: MUTE }, splitLine: { lineStyle: { color: '#EEECE7' } } },
        yAxis: { name: 'Real GDP growth, %', nameTextStyle: { fontFamily: FONT, color: MUTE }, scale: true, axisLabel: { fontFamily: MONO, color: MUTE }, splitLine: { lineStyle: { color: '#EEECE7' } } },
        series: [{ type: 'scatter', data: pts.map(p => ({ n: p.n, value: [Math.max(0.5, p.i), p.g, p.s], raw: p.i, itemStyle: { color: FLAG[p.k], opacity: p.k === 'IND' ? 0.95 : 0.6, borderColor: '#fff', borderWidth: 1 } })), symbolSize: d => 10 + Math.sqrt(d[2] / 32000) * 70,
          label: { show: true, formatter: p => p.data.n, position: 'top', fontFamily: FONT, fontSize: 11, color: INK }, animationDurationUpdate: 600 }] }, true); };
    drawBub(Y); $('#ig-by').addEventListener('change', e => drawBub(+e.target.value));

    // 4. debt vs deficit
    const yy = String(Y);
    const pts = Object.keys(C).map(k => ({ k, n: C[k], d: W.imf.GGXWDG_NGDP.data[k]?.[yy], b: W.imf.GGXCNL_NGDP.data[k]?.[yy] })).filter(p => p.d != null && p.b != null);
    mk('ig-debt').setOption({ textStyle: { fontFamily: FONT }, grid: { left: 70, right: 30, top: 40, bottom: 50 }, tooltip: { formatter: p => `<b>${p.data.n}</b> ${Y} (IMF projection)<br>Debt ${p.data.value[0]}% of GDP<br>Overall balance ${p.data.value[1]}% of GDP` },
      xAxis: { name: 'General government gross debt, % of GDP', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: MUTE }, axisLabel: { fontFamily: MONO, color: MUTE }, splitLine: { lineStyle: { color: '#EEECE7' } } },
      yAxis: { name: 'Overall balance, % of GDP (negative = deficit)', nameTextStyle: { color: MUTE }, axisLabel: { fontFamily: MONO, color: MUTE }, splitLine: { lineStyle: { color: '#EEECE7' } } },
      series: [{ type: 'scatter', symbolSize: 16, data: pts.map(p => ({ n: p.n, value: [p.d, p.b], itemStyle: { color: FLAG[p.k], opacity: p.k === 'IND' ? 1 : 0.7 } })), label: { show: true, position: 'right', formatter: p => p.data.n, fontFamily: FONT, fontSize: 11, color: INK },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: '#CFCBC2', type: 'dashed' }, label: { fontFamily: MONO, fontSize: 10 }, data: [{ xAxis: 60, name: '60% of GDP' }, { yAxis: -3, name: '−3% deficit' }] } }] });
  });
})();
