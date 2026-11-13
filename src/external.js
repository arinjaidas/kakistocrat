/* External sector lab charts. Data: /api/markets/rbi_fx.json, /api/markets/rbi_rates.json and window.__XT */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#17202C', MUTE = '#555A61', RULE = '#D9DED3';
  const X = window.__XT; if (!X) return;
  const axis = (x = {}) => ({ axisLine: { lineStyle: { color: RULE } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#E6EAE2' } }, ...x });
  const tip = { trigger: 'axis', backgroundColor: '#fff', borderColor: INK, borderWidth: 1, textStyle: { color: INK, fontFamily: FONT, fontSize: 12 } };
  const cut = (dates, r) => { if (r === 'All') return 0; const t = new Date(dates.at(-1)); t.setFullYear(t.getFullYear() - parseInt(r)); const iso = t.toISOString().slice(0, 10); return Math.max(0, dates.findIndex(d => d >= iso)); };
  const go = async () => { if (!window.echarts) return setTimeout(go, 60);
    const [F, R] = await Promise.all(['rbi_fx', 'rbi_rates'].map(n => fetch(`/api/markets/${n}.json`).then(r => r.json()).catch(() => ({ weeks: {} }))));
    const fd = Object.keys(F.weeks).sort(), rd = Object.keys(R.weeks).sort();
    const cs = ['xt-res', 'xt-ep-res', 'xt-ep-inr', 'xt-rates'].map(id => document.getElementById(id) ? echarts.init(document.getElementById(id)) : null);
    addEventListener('resize', () => cs.forEach(c => c && c.resize()));
    const windows = X.episodes.map(e => [{ xAxis: e.window[0], name: `FCNR(B) ${e.id}` }, { xAxis: e.window[1] }]);
    const res = r => { const i0 = cut(fd, r), d = fd.slice(i0), near = x => d.find(y => y >= x);
      const s = (k, n, col) => ({ name: n, type: 'line', stack: 'r', areaStyle: { color: col, opacity: 0.85 }, lineStyle: { width: 0 }, showSymbol: false, itemStyle: { color: col }, data: d.map(x => F.weeks[x][k] == null ? null : +(F.weeks[x][k] / 1000).toFixed(2)) });
      const ser = [s('fca', 'Foreign currency assets', '#1C7C99'), s('gold', 'Gold', '#D4A017'), s('sdr', 'SDRs', '#5F7F14'), s('rtp', 'Reserve position in the IMF', '#9AA0A8')];
      ser[0].markArea = { silent: true, itemStyle: { color: 'rgba(181,54,122,.08)' }, label: { color: '#B5367A', fontFamily: MONO, fontSize: 10 }, data: windows.map(([a, b]) => [{ ...a, xAxis: near(a.xAxis) }, { xAxis: near(b.xAxis) }]).filter(([a, b]) => a.xAxis && b.xAxis) };
      cs[0].setOption({ textStyle: { fontFamily: FONT }, grid: { left: 52, right: 20, top: 40, bottom: 40 }, tooltip: { ...tip, valueFormatter: v => v == null ? '—' : '$' + v.toFixed(1) + ' bn' }, legend: { top: 0, textStyle: { color: MUTE, fontSize: 11 } },
        xAxis: axis({ type: 'category', data: d, boundaryGap: false }), yAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '${value}bn' } }), series: ser }, true); };
    $$('#xt-range button').forEach(b => b.addEventListener('click', () => { $$('#xt-range button').forEach(x => x.removeAttribute('aria-pressed')); b.setAttribute('aria-pressed', 'true'); res(b.dataset.r); })); res('All');
    // episodes: weeks relative to the announcement
    const rel = (dates, get, anchor, idx) => { const k = dates.findIndex(d => d >= anchor); if (k < 0 || (new Date(dates[k]) - new Date(anchor)) / 864e5 > 14) return []; const b = idx ? get(dates[k]) : 1; return Array.from({ length: 53 }, (_, j) => { const i = k + j - 26; return i < 0 || i >= dates.length ? null : (get(dates[i]) == null ? null : +(idx ? get(dates[i]) / b * 100 : get(dates[i])).toFixed(2)); }); };
    const weeks = Array.from({ length: 53 }, (_, j) => j - 26), COL = { '2013': '#B5367A', '2026': '#1C7C99' };
    const ep = (c, get, idx, name) => c.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 48, right: 16, top: 30, bottom: 36 }, tooltip: { ...tip, valueFormatter: v => v == null ? '—' : v.toFixed(2) }, legend: { top: 0, textStyle: { color: MUTE } },
      xAxis: axis({ type: 'category', data: weeks, name: 'weeks from announcement', nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: MUTE, fontSize: 11 } }), yAxis: axis({ type: 'value', scale: true }),
      series: X.episodes.map(e => ({ name: e.id, type: 'line', showSymbol: false, lineStyle: { width: 2.4, color: COL[e.id] }, itemStyle: { color: COL[e.id] }, data: get(e.anchor),
        markLine: e.id === '2013' ? { symbol: 'none', silent: true, lineStyle: { color: MUTE, type: 'dotted' }, data: [{ xAxis: '0' }], label: { formatter: 'announced', color: MUTE, fontSize: 10 } } : undefined })) });
    ep(cs[1], a => rel(fd, d => F.weeks[d].total, a, true));
    const L = await fetch('/api/markets/inr_long.json').then(r => r.json()).catch(() => null);
    if (L?.pts) { const wk = {}; for (const [d, v] of L.pts) { const t = new Date(d + 'T00:00:00Z'), k = new Date(+t + ((5 - t.getUTCDay() + 7) % 7) * 864e5).toISOString().slice(0, 10); wk[k] = v; } // week ending Friday
      const wd = Object.keys(wk).sort(); ep(cs[2], a => rel(wd, d => wk[d], a, true)); }
    else ep(cs[2], a => rel(rd, d => R.weeks[d].inr, a, true));
    // rates
    const rates = r => { const i0 = cut(rd, r), d = rd.slice(i0);
      if (cs[3]) cs[3].setOption({ textStyle: { fontFamily: FONT }, grid: { left: 44, right: 20, top: 40, bottom: 60 }, tooltip: { ...tip, valueFormatter: v => v == null ? '—' : v.toFixed(2) + '%' }, legend: { top: 0, textStyle: { color: MUTE, fontSize: 11 } }, dataZoom: [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 8, borderColor: RULE }],
        xAxis: axis({ type: 'category', data: d, boundaryGap: false }), yAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: '{value}%' } }),
        series: [['call', 'Call money', '#17202C'], ['tb91', '91-day T-bill', '#5F7F14'], ['gsec10', '10-year G-Sec', '#1C7C99'], ['fwd3m', '3-month forward premium', '#B5367A']].map(([k, n, c]) => ({ name: n, type: 'line', connectNulls: true, showSymbol: false, lineStyle: { width: k === 'fwd3m' ? 2.2 : 1.5, color: c }, itemStyle: { color: c }, data: d.map(x => R.weeks[x][k]) })) }, true); };
    $$('#xt-r-range button').forEach(b => b.addEventListener('click', () => { $$('#xt-r-range button').forEach(x => x.removeAttribute('aria-pressed')); b.setAttribute('aria-pressed', 'true'); rates(b.dataset.r); })); rates('10Y');
    // annual small multiples
    const grid = $('#xt-annual'); const yr = new Date().getFullYear();
    if (grid) X.annual.forEach((a, i) => { const box = document.createElement('div'); box.className = 'xt-sm'; box.innerHTML = `<h4>${a.n}<small>${a.u}</small></h4><div class="ec" style="height:170px"></div>`; grid.appendChild(box);
      const c = echarts.init(box.querySelector('.ec')); cs.push(c); const ys = Object.keys(a.d).sort(), proj = ys.findIndex(y => +y > yr);
      c.setOption({ grid: { left: 40, right: 10, top: 10, bottom: 24 }, tooltip: { ...tip, valueFormatter: v => v == null ? '—' : v.toFixed(1) },
        xAxis: axis({ type: 'category', data: ys, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 10, interval: 9 } }), yAxis: axis({ type: 'value', scale: !a.u.startsWith('US$'), splitNumber: 3 }),
        series: [{ type: a.u.startsWith('US$') ? 'bar' : 'line', showSymbol: false, data: ys.map((y, k) => ({ value: a.d[y], itemStyle: { color: proj > 0 && k >= proj ? '#C9CFC3' : (a.d[y] < 0 ? '#B5367A' : '#1C7C99') } })), lineStyle: { color: '#1C7C99', width: 2 }, itemStyle: { color: '#1C7C99' },
          markLine: a.n.startsWith('Current') ? { symbol: 'none', silent: true, data: [{ yAxis: 0 }], lineStyle: { color: MUTE }, label: { show: false } } : a.n.startsWith('Reserves cover') ? { symbol: 'none', silent: true, data: [{ yAxis: 3 }], lineStyle: { color: '#B5367A', type: 'dotted' }, label: { show: false } } : undefined }] }); });
  };
  go();
})();
