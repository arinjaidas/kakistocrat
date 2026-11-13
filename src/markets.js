/* Markets and Commodities pages: interactive charts (Apache ECharts), live crypto, market clock. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const J = u => fetch(u).then(r => r.json());
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace';
  const INK = '#17202C', RULE = '#D9DED3', MUTE = '#555A61', UP = '#5F7F14', DN = '#B5367A';
  const PAL = ['#17202C', '#B5367A', '#1C7C99', '#5F7F14', '#B87708', '#6D5BA8', '#5E6B4E'];
  const nf = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const charts = [];
  const mk = (el) => { const c = echarts.init(el, null, { renderer: 'canvas' }); charts.push(c); return c; };
  addEventListener('resize', () => charts.forEach(c => c.resize()));
  const axis = (extra = {}) => ({ axisLine: { lineStyle: { color: RULE } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#E6EAE2' } }, ...extra });
  const base = () => ({ textStyle: { fontFamily: FONT }, grid: { left: 56, right: 24, top: 28, bottom: 56 }, tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: INK, borderWidth: 1, textStyle: { color: INK, fontFamily: FONT, fontSize: 12 }, axisPointer: { type: 'cross', lineStyle: { color: MUTE } } }, animationDuration: 500 });
  const startFor = (dates, r) => { if (r === 'All') return 0; const last = new Date(dates.at(-1)); const t = new Date(last); if (r === 'YTD') t.setMonth(0, 1); else { const n = parseInt(r); r.endsWith('M') ? t.setMonth(t.getMonth() - n) : t.setFullYear(t.getFullYear() - n); } const iso = t.toISOString().slice(0, 10); const i = dates.findIndex(d => d >= iso); return Math.max(0, i); };
  const seg = (root, cb) => $$('button', root).forEach(b => b.addEventListener('click', () => { $$('button', root).forEach(x => x.removeAttribute('aria-pressed')); b.setAttribute('aria-pressed', 'true'); cb(b.dataset.r); }));
  const waitE = fn => { if (window.echarts) fn(); else setTimeout(() => waitE(fn), 60); };

  /* ---------- market clock (NSE 09:15–15:30 IST, Mon–Fri; holidays not shown) ---------- */
  const clock = $('#mk-clock');
  if (clock) { const tick = () => { const ist = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60000); const m = ist.getHours() * 60 + ist.getMinutes(), wd = ist.getDay(); const open = wd > 0 && wd < 6 && m >= 555 && m < 930;
      clock.classList.toggle('open', open); $('#mk-status').textContent = open ? 'NSE open' : 'NSE closed'; $('#mk-time').textContent = ist.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST' + (open ? ` · closes in ${Math.floor((930 - m) / 60)}h ${(930 - m) % 60}m` : ''); }; tick(); setInterval(tick, 30000); }

  /* ---------- live crypto ---------- */
  const liveEls = $$('[data-live]');
  if (liveEls.length) { const pull = () => J('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true').then(d => {
      const set = (k, v) => $$(`[data-live="${k}"]`).forEach(e => e.textContent = v);
      const ch = c => `${c >= 0 ? '+' : '−'}${Math.abs(c).toFixed(2)}% 24h`;
      set('btc', nf(d.bitcoin.usd, 0)); set('btc-c', ch(d.bitcoin.usd_24h_change)); set('btc-t', 'Live · CoinGecko');
      set('btc2', '$' + nf(d.bitcoin.usd, 0)); set('btc2-c', ch(d.bitcoin.usd_24h_change)); set('eth', '$' + nf(d.ethereum.usd, 2)); set('eth-c', ch(d.ethereum.usd_24h_change));
      $$('[data-live$="-c"]').forEach(e => { e.classList.toggle('up', /^\+/.test(e.textContent)); e.classList.toggle('dn', /^−/.test(e.textContent)); });
    }).catch(() => {}); pull(); setInterval(pull, 60000); }

  /* ---------- MARKETS ---------- */
  if ($('#mk-chart')) waitE(async () => {
    const [I, S, F, X, C] = await Promise.all(['indices', 'stocks', 'fred', 'fx', 'crypto'].map(n => J(`/api/markets/${n}.json`)));
    // main chart
    const ch = mk($('#mk-chart')); let range = '1Y';
    const draw = () => {
      const a = $('#mk-idx').value, b = $('#mk-cmp').value, s0 = startFor(I.dates, range), d = I.dates.slice(s0), log = $('#mk-log').checked;
      const pick = n => I.series[n].slice(s0);
      const rb = arr => { const f = arr.find(v => v != null); return arr.map(v => v == null ? null : +(v / f * 100).toFixed(2)); };
      const ser = [a, b].filter(Boolean).map((n, k) => ({ name: n, type: 'line', showSymbol: false, smooth: false, data: b ? rb(pick(n)) : pick(n), lineStyle: { width: k ? 1.8 : 2.2, color: PAL[k ? 1 : 0] }, itemStyle: { color: PAL[k ? 1 : 0] },
        areaStyle: !b && !log ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(21,23,26,.18)' }, { offset: 1, color: 'rgba(21,23,26,0)' }]) } : undefined }));
      ch.setOption({ ...base(), legend: b ? { top: 0, textStyle: { fontFamily: FONT } } : { show: false }, xAxis: { type: 'category', data: d, boundaryGap: false, ...axis() }, yAxis: { type: log ? 'log' : 'value', scale: true, ...axis() },
        dataZoom: [{ type: 'inside' }, { type: 'slider', height: 22, bottom: 8, borderColor: RULE, fillerColor: 'rgba(180,35,24,.08)', handleStyle: { color: DN }, textStyle: { fontFamily: MONO, fontSize: 10 } }], series: ser }, true);
      const v = I.series[a], L = v.length - 1, chg = (v[L] / v[s0] - 1) * 100;
      $('#mk-chart-note').textContent = `${a}: ${nf(v[L])} on ${I.dates[L]}, ${chg >= 0 ? 'up' : 'down'} ${Math.abs(chg).toFixed(1)}% over the range.${b ? ' Both series rebased to 100 at the start of the range.' : ''} Drag the slider or scroll to zoom.`;
    };
    ['#mk-idx', '#mk-cmp', '#mk-log'].forEach(s => $(s).addEventListener('change', draw));
    seg($('#mk-range'), r => { range = r; draw(); });
    $$('[data-idx]').forEach(a => a.addEventListener('click', () => { $('#mk-idx').value = a.dataset.idx; draw(); }));
    draw();

    // heatmap
    const groups = {}; S.nifty50.forEach(s => (groups[s.ind] ||= []).push(s));
    const mix = (a, b, t) => '#' + [0, 2, 4].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
    const col = c => { const t = Math.min(Math.abs(c) / 3, 1) ** 0.8; return c >= 0 ? mix('E6EFE9', '0B5A30', t) : mix('F5E3E1', '9E1D14', t); };
    const txt = c => Math.abs(c) >= 0.9 ? '#fff' : INK;
    mk($('#mk-heat')).setOption({ tooltip: { formatter: p => p.data.s ? `<b>${p.data.name}</b><br>${p.data.ind}<br>₹${nf(p.data.c)} (${p.data.chg >= 0 ? '+' : ''}${p.data.chg}%)<br>Market cap ₹${nf(p.data.value / 1e5, 2)} lakh cr` : `<b>${p.name}</b>` },
      series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, width: '100%', height: '100%', top: 0, left: 0,
        upperLabel: { show: true, height: 20, color: '#fff', fontFamily: MONO, fontSize: 11, formatter: p => p.name },
        levels: [{ itemStyle: { borderColor: '#fff', borderWidth: 0, gapWidth: 3 }, upperLabel: { show: false } }, { itemStyle: { borderColor: INK, borderWidth: 2, gapWidth: 1 }, upperLabel: { show: true, height: 20, color: '#fff', backgroundColor: INK, fontFamily: MONO, fontSize: 11, formatter: p => p.name } }, { itemStyle: { gapWidth: 1, borderColor: '#fff' } }],
        label: { show: true, formatter: p => p.data.s ? `${p.data.s}\n${p.data.chg >= 0 ? '+' : ''}${p.data.chg}%` : p.name, fontFamily: MONO, fontSize: 11.5, fontWeight: 600, lineHeight: 15 },
        data: Object.entries(groups).map(([g, arr]) => ({ name: g, children: arr.map(s => ({ name: s.n, s: s.s, ind: s.ind, c: s.c, chg: s.chg, value: s.mcap, itemStyle: { color: col(s.chg) }, label: { color: txt(s.chg) } })) })) }] });

    // P/E with bands
    const pe = I.pe, vals = pe.filter(v => v != null), m = vals.reduce((a, b) => a + b, 0) / vals.length, sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
    mk($('#mk-pe')).setOption({ ...base(), grid: { left: 48, right: 90, top: 16, bottom: 28 }, xAxis: { type: 'category', data: I.dates, boundaryGap: false, ...axis() }, yAxis: { type: 'value', scale: true, ...axis() },
      series: [{ type: 'line', name: 'P/E', data: pe, showSymbol: false, lineStyle: { color: INK, width: 1.8 }, itemStyle: { color: INK },
        markLine: { symbol: 'none', label: { fontFamily: MONO, fontSize: 10, formatter: p => p.name }, data: [{ yAxis: +m.toFixed(2), name: `Avg ${m.toFixed(1)}`, lineStyle: { color: MUTE } }, { yAxis: +(m + sd).toFixed(2), name: `+1σ ${(m + sd).toFixed(1)}`, lineStyle: { color: DN, type: 'dashed' } }, { yAxis: +(m - sd).toFixed(2), name: `−1σ ${(m - sd).toFixed(1)}`, lineStyle: { color: UP, type: 'dashed' } }] } }] });

    // yield curve
    const tenors = [['3M', 'DGS3MO'], ['2Y', 'DGS2'], ['10Y', 'DGS10'], ['30Y', 'DGS30']];
    const lastOf = id => F[id].pts.at(-1)[1], yAgo = id => { const p = F[id].pts, t = new Date(p.at(-1)[0]); t.setFullYear(t.getFullYear() - 1); const iso = t.toISOString().slice(0, 10); return (p.find(x => x[0] >= iso) || p[0])[1]; };
    mk($('#mk-curve')).setOption({ ...base(), grid: { left: 44, right: 16, top: 30, bottom: 28 }, legend: { top: 0, textStyle: { fontFamily: FONT } }, xAxis: { type: 'category', data: tenors.map(t => t[0]), ...axis() }, yAxis: { type: 'value', scale: true, axisLabel: { formatter: '{value}%', color: MUTE, fontFamily: MONO }, splitLine: { lineStyle: { color: '#E6EAE2' } } },
      series: [{ name: 'Latest (' + F.DGS10.pts.at(-1)[0] + ')', type: 'line', data: tenors.map(t => lastOf(t[1])), lineStyle: { color: DN, width: 2.4 }, itemStyle: { color: DN }, symbolSize: 7, label: { show: true, position: 'top', formatter: '{c}%', fontFamily: MONO, fontSize: 11 } },
        { name: 'A year earlier', type: 'line', data: tenors.map(t => yAgo(t[1])), lineStyle: { color: MUTE, type: 'dashed' }, itemStyle: { color: MUTE }, symbolSize: 5 }] });

    // INR
    mk($('#mk-inr')).setOption({ ...base(), grid: { left: 48, right: 16, top: 16, bottom: 48 }, xAxis: { type: 'category', data: X.dates, boundaryGap: false, ...axis() }, yAxis: { type: 'value', scale: true, ...axis() }, dataZoom: [{ type: 'inside', start: 60 }, { type: 'slider', height: 18, bottom: 6, start: 60 }],
      series: [{ type: 'line', name: '₹ per $', data: X.rates.INR, showSymbol: false, lineStyle: { color: '#1C7C99', width: 1.8 }, itemStyle: { color: '#1C7C99' } }] });

    // FX race (dollar price of each currency, rebased)
    const race = mk($('#mk-race')); const CUR = ['INR', 'CNY', 'KRW', 'IDR', 'MYR', 'PHP', 'THB', 'BRL', 'MXN', 'ZAR', 'TRY'];
    const drawRace = r => { const s0 = startFor(X.dates, r); race.setOption({ ...base(), grid: { left: 44, right: 70, top: 16, bottom: 28 }, tooltip: { ...base().tooltip, order: 'valueDesc' }, xAxis: { type: 'category', data: X.dates.slice(s0), boundaryGap: false, ...axis() }, yAxis: { type: 'value', scale: true, ...axis() },
      series: CUR.map((c, k) => { const a = X.rates[c].slice(s0), f = a.find(v => v); return { name: c, type: 'line', showSymbol: false, data: a.map(v => v ? +(f / v * 100).toFixed(2) : null), lineStyle: { width: c === 'INR' ? 3 : 1.2, color: c === 'INR' ? DN : ['#17202C', '#1C7C99', '#5F7F14', '#B87708', '#6D5BA8', '#5E6B4E', '#555A61', '#7B4B2A', '#4B5563', '#C9CFC3'][k % 10] }, itemStyle: { color: c === 'INR' ? DN : undefined }, endLabel: { show: true, formatter: '{a}', fontFamily: MONO, fontSize: 10 }, emphasis: { focus: 'series' } }; }) }, true); };
    seg($('#fx-range'), drawRace); drawRace('1Y');

    // BTC
    mk($('#mk-btc')).setOption({ ...base(), grid: { left: 64, right: 16, top: 16, bottom: 28 }, xAxis: { type: 'category', data: C.bitcoin.map(p => p[0]), boundaryGap: false, ...axis() }, yAxis: { type: 'value', scale: true, ...axis() },
      series: [{ type: 'line', name: 'Bitcoin $', data: C.bitcoin.map(p => p[1]), showSymbol: false, lineStyle: { color: '#B87708', width: 1.8 }, itemStyle: { color: '#B87708' }, areaStyle: { color: 'rgba(180,83,9,.08)' } }] });
  });

  /* ---------- COMMODITIES ---------- */
  if ($('#cm-chart')) waitE(async () => {
    const [W, X] = await Promise.all([J('/api/markets/worldbank.json'), J('/api/markets/fx.json')]);
    // Brent in rupees (monthly average of ECB INR)
    const monthAvg = {}; X.dates.forEach((d, i) => { const k = d.slice(0, 7); (monthAvg[k] ||= []).push(X.rates.INR[i]); });
    const lastM = W.months.at(-1), inr = monthAvg[lastM] ? monthAvg[lastM].reduce((a, b) => a + b, 0) / monthAvg[lastM].length : null, brent = W.series.brent.v.at(-1);
    if (inr && brent) $('#brent-inr').textContent = '₹' + nf(brent * inr, 0);
    let picked = ['brent', 'gold', 'copper', 'urea'], range = '5Y';
    const ch = mk($('#cm-chart'));
    const draw = () => {
      const s0 = range === 'All' ? 0 : Math.max(0, W.months.length - 12 * parseInt(range)), rb = $('#cm-rebase').checked;
      ch.setOption({ ...base(), legend: { top: 0, textStyle: { fontFamily: FONT } }, xAxis: { type: 'category', data: W.months.slice(s0), boundaryGap: false, ...axis() }, yAxis: { type: 'value', scale: true, ...axis() }, dataZoom: [{ type: 'inside' }, { type: 'slider', height: 22, bottom: 8 }],
        series: picked.map((id, k) => { const s = W.series[id], a = s.v.slice(s0), f = a.find(v => v != null); return { name: `${s.name} (${s.unit})`, type: 'line', showSymbol: false, data: rb ? a.map(v => v == null ? null : +(v / f * 100).toFixed(1)) : a, lineStyle: { width: 2, color: PAL[k % PAL.length] }, itemStyle: { color: PAL[k % PAL.length] } }; }) }, true);
      $('#cm-picked').innerHTML = picked.map(id => `<a href="/s/wb-${id}/" title="Full page">${W.series[id].name} ↗</a>`).join(' · ');
      $$('.cm-tile').forEach(t => t.classList.toggle('on', picked.includes(t.dataset.c)));
    };
    $$('.cm-tile').forEach(t => t.addEventListener('click', () => { const id = t.dataset.c; picked = picked.includes(id) ? picked.filter(x => x !== id) : [...picked, id].slice(-6); if (!picked.length) picked = [id]; draw(); $('#cm-chart-sec').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    seg($('#cm-range'), r => { range = r; draw(); }); $('#cm-rebase').addEventListener('change', draw); draw();
    // y/y heat table
    const GO = ['Energy', 'Precious metals', 'Base metals', 'Fertilisers', 'Grains', 'Edible oils', 'Softs'];
    const ids = Object.keys(W.series).sort((a, b) => GO.indexOf(W.series[a].group) - GO.indexOf(W.series[b].group)), M = W.months.length, cols = W.months.slice(M - 12), data = [];
    ids.forEach((id, yi) => cols.forEach((m, xi) => { const i = M - 12 + xi, v = W.series[id].v[i], p = W.series[id].v[i - 12]; data.push([xi, yi, v != null && p ? +((v / p - 1) * 100).toFixed(1) : '-']); }));
    mk($('#cm-heat')).setOption({ tooltip: { formatter: p => `${W.series[ids[p.value[1]]].name}, ${cols[p.value[0]]}: ${p.value[2]}% y/y` }, grid: { left: 150, right: 20, top: 10, bottom: 60 },
      xAxis: { type: 'category', data: cols, axisLabel: { fontFamily: MONO, fontSize: 10, color: MUTE }, splitArea: { show: false } }, yAxis: { type: 'category', data: ids.map(id => W.series[id].name), axisLabel: { fontFamily: FONT, fontSize: 11, color: INK }, inverse: true },
      visualMap: { min: -40, max: 40, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 220, text: ['+40%', '−40%'], textStyle: { fontFamily: MONO, fontSize: 10 }, inRange: { color: ['#5F7F14', '#7FB894', '#F2F4EF', '#E8968E', '#B5367A'] } },
      series: [{ type: 'heatmap', data, label: { show: true, fontSize: 9, fontFamily: MONO, formatter: p => p.value[2] === '-' ? '' : Math.round(p.value[2]) }, itemStyle: { borderColor: '#fff', borderWidth: 1 } }] });
  });
})();
