/* Rupee & external sector page: interactive charts (Apache ECharts). Data from /api/rupee.json. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace';
  const INK = '#17202C', RULE = '#D9DED3', MUTE = '#555A61', UP = '#5F7F14', DN = '#B5367A', BLUE = '#1C7C99', SAFF = '#E8730C';
  const PAL = ['#1C7C99', '#B5367A', '#5F7F14', '#B87708', '#6D5BA8', '#5E6B4E', '#1C7C99', '#8A2457', '#57534E', '#B87708', '#6D5BA8', '#5F7F14', '#BE123C', '#64748B'];
  const nf = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const NAME = { INR: 'Indian rupee', EUR: 'Euro', GBP: 'British pound', JPY: 'Japanese yen', CNY: 'Chinese yuan', KRW: 'Korean won', IDR: 'Indonesian rupiah', MYR: 'Malaysian ringgit', PHP: 'Philippine peso', THB: 'Thai baht', SGD: 'Singapore dollar', BRL: 'Brazilian real', MXN: 'Mexican peso', ZAR: 'South African rand', TRY: 'Turkish lira' };
  const charts = [];
  const mk = id => { const el = document.getElementById(id); if (!el) return null; const c = echarts.init(el, null, { renderer: 'canvas' }); charts.push(c); return c; };
  addEventListener('resize', () => charts.forEach(c => c.resize()));
  const axis = (extra = {}) => ({ axisLine: { lineStyle: { color: RULE } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#E6EAE2' } }, ...extra });
  const tip = (extra = {}) => ({ trigger: 'axis', backgroundColor: '#fff', borderColor: INK, borderWidth: 1, textStyle: { color: INK, fontFamily: FONT, fontSize: 12 }, ...extra });
  const base = () => ({ textStyle: { fontFamily: FONT }, grid: { left: 56, right: 24, top: 28, bottom: 40 }, animationDuration: 500 });
  const seg = (root, cb) => root && $$('button', root).forEach(b => b.addEventListener('click', () => { $$('button', root).forEach(x => x.removeAttribute('aria-pressed')); b.setAttribute('aria-pressed', 'true'); cb(b.dataset.r || b.dataset.x); }));
  const startIdx = (dates, r) => { const t = new Date(dates.at(-1)); const n = parseInt(r); r.endsWith('M') ? t.setMonth(t.getMonth() - n) : t.setFullYear(t.getFullYear() - n); const iso = t.toISOString().slice(0, 10); const i = dates.findIndex(d => d >= iso); return Math.max(0, i); };
  const waitE = fn => { if (window.echarts) fn(); else setTimeout(() => waitE(fn), 60); };

  waitE(async () => {
    const D = await fetch('/api/rupee.json').then(r => r.json());
    const F = D.fx, dates = F.dates, R = F.rates;

    /* ---------- rupees per dollar, optional dollar-index overlay ---------- */
    const main = mk('rp-chart'); let rng = '1Y';
    const dxy = D.fred.DTWEXBGS ? new Map(D.fred.DTWEXBGS.pts) : null;
    const drawMain = () => {
      const s = startIdx(dates, rng), ds = dates.slice(s), inr = R.INR.slice(s), withD = $('#rp-dxy')?.checked && dxy;
      let last = null; const dv = withD ? ds.map(d => { const v = dxy.get(d); if (v != null) last = v; return v ?? last; }) : [];
      const lo = Math.min(...inr.filter(Boolean)), hi = Math.max(...inr.filter(Boolean));
      main.setOption({ ...base(), grid: { left: 56, right: withD ? 56 : 24, top: 28, bottom: 40 }, tooltip: tip({ valueFormatter: v => nf(v) }), legend: withD ? { top: 0, right: 0, textStyle: { color: MUTE } } : { show: false },
        xAxis: axis({ type: 'category', data: ds, boundaryGap: false }),
        yAxis: [axis({ type: 'value', scale: true, name: '₹ per $', nameTextStyle: { color: MUTE } }), axis({ type: 'value', scale: true, show: !!withD, splitLine: { show: false } })],
        series: [{ name: 'Rupees per dollar', type: 'line', data: inr, showSymbol: false, lineStyle: { color: BLUE, width: 2 }, itemStyle: { color: BLUE }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(28,124,153,.18)' }, { offset: 1, color: 'rgba(28,124,153,0)' }] } },
          markPoint: { symbolSize: 48, label: { fontFamily: MONO, fontSize: 10, formatter: p => nf(p.value, 1) }, data: [{ type: 'max', name: 'Weakest', itemStyle: { color: DN } }, { type: 'min', name: 'Strongest', itemStyle: { color: UP } }] } },
          ...(withD ? [{ name: 'Broad dollar index', type: 'line', yAxisIndex: 1, data: dv, showSymbol: false, lineStyle: { color: INK, width: 1.4, type: 'dashed' }, itemStyle: { color: INK } }] : [])] }, true);
    };
    seg($('#rp-range'), r => { rng = r; drawMain(); }); $('#rp-dxy')?.addEventListener('change', drawMain); drawMain();

    /* ---------- currency race and bars ---------- */
    const race = mk('rc-chart'), bars = mk('rc-bars'); let rr = '1Y';
    const codes = Object.keys(R);
    const drawRace = () => {
      const s = startIdx(dates, rr), ds = dates.slice(s);
      const val = c => { const a = R[c].slice(s); const b = a.find(Boolean); return a.map(x => x ? +(b / x * 100).toFixed(2) : null); };
      const series = codes.map((c, i) => { const isI = c === 'INR'; return { name: NAME[c] || c, type: 'line', data: val(c), showSymbol: false, z: isI ? 10 : 2, lineStyle: { width: isI ? 3.2 : 1.2, color: isI ? SAFF : PAL[i % PAL.length], opacity: isI ? 1 : 0.7 }, itemStyle: { color: isI ? SAFF : PAL[i % PAL.length] },
        endLabel: isI ? { show: true, formatter: '₹ {c}', color: SAFF, fontWeight: 700, fontFamily: MONO } : { show: false } }; });
      race.setOption({ ...base(), grid: { left: 48, right: 64, top: 96, bottom: 40 }, tooltip: tip({ order: 'valueDesc', valueFormatter: v => nf(v, 1) }),
        legend: { top: 0, left: 0, right: 0, textStyle: { color: MUTE, fontSize: 11 }, itemWidth: 12, itemGap: 8 },
        xAxis: axis({ type: 'category', data: ds, boundaryGap: false }), yAxis: axis({ type: 'value', scale: true }),
        series: [...series, { type: 'line', data: [], markLine: { silent: true, symbol: 'none', lineStyle: { color: MUTE, type: 'dotted' }, data: [{ yAxis: 100 }], label: { show: false } } }] }, true);
      const ch = codes.map(c => { const a = R[c], b = a.slice(s).find(Boolean), e = a.at(-1); return { c, v: +((b / e - 1) * 100).toFixed(2) }; }).sort((a, b) => a.v - b.v);
      bars.setOption({ ...base(), grid: { left: 130, right: 56, top: 20, bottom: 30 }, tooltip: tip({ trigger: 'item', formatter: p => `${p.name}: ${p.value > 0 ? '+' : ''}${nf(p.value, 1)}% against the dollar` }),
        xAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: v => v + '%' } }),
        yAxis: axis({ type: 'category', data: ch.map(x => NAME[x.c] || x.c), axisLabel: { color: INK, fontSize: 11, fontFamily: FONT, formatter: n => n === 'Indian rupee' ? `{b|${n}}` : n, rich: { b: { fontWeight: 700, color: SAFF } } } }),
        series: [{ type: 'bar', data: ch.map(x => ({ value: x.v, itemStyle: { color: x.c === 'INR' ? SAFF : x.v >= 0 ? UP : DN, borderRadius: 2 } })), barWidth: '62%', label: { show: true, position: 'right', fontFamily: MONO, fontSize: 10, color: MUTE, formatter: p => (p.value > 0 ? '+' : '') + nf(p.value, 1) + '%' } }] }, true);
    };
    seg($('#rc-range'), r => { rr = r; drawRace(); }); drawRace();

    /* ---------- rate gap: yield curve now vs a year ago, with India ---------- */
    const yc = mk('yc-chart'), us = mk('us-chart'), Fr = D.fred;
    if (yc && Fr.DGS10) {
      const tenors = [['DGS3MO', '3 months', 0.25], ['DGS2', '2 years', 2], ['DGS10', '10 years', 10], ['DGS30', '30 years', 30]].filter(t => Fr[t[0]]);
      const lastDate = Fr.DGS10.pts.at(-1)[0], yAgo = new Date(lastDate); yAgo.setFullYear(yAgo.getFullYear() - 1); const ya = yAgo.toISOString().slice(0, 10);
      const val = (id, when) => { const p = Fr[id].pts; if (!when) return p.at(-1)[1]; const q = p.find(x => x[0] >= when); return q ? q[1] : null; };
      const cats = tenors.map(t => t[1]);
      const repo = D.india.repo?.latest?.value, g10 = D.india.g10?.latest?.value;
      yc.setOption({ ...base(), tooltip: tip({ valueFormatter: v => v == null ? '—' : nf(v) + '%' }), legend: { top: 0, textStyle: { color: MUTE } }, grid: { left: 48, right: 24, top: 40, bottom: 40 },
        xAxis: axis({ type: 'category', data: cats }), yAxis: axis({ type: 'value', scale: true, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: v => v + '%' } }),
        series: [
          { name: `US, ${lastDate}`, type: 'line', data: tenors.map(t => val(t[0])), symbolSize: 8, lineStyle: { color: INK, width: 2.4 }, itemStyle: { color: INK } },
          { name: `US, a year earlier`, type: 'line', data: tenors.map(t => val(t[0], ya)), symbolSize: 6, lineStyle: { color: MUTE, width: 1.4, type: 'dashed' }, itemStyle: { color: MUTE } },
          { name: 'India', type: 'scatter', symbolSize: 16, itemStyle: { color: SAFF }, data: [repo != null ? { value: [0, repo], name: 'RBI repo rate' } : null, g10 != null ? { value: [2, g10], name: '10-year G-Sec' } : null].filter(Boolean),
            label: { show: true, position: 'top', formatter: p => `${p.name} ${nf(p.value[1])}%`, color: SAFF, fontWeight: 700, fontSize: 11 } }] });
    }
    if (us && Fr.DGS10) {
      const ids = [['DFF', 'Fed funds', SAFF], ['DGS2', '2-year', BLUE], ['DGS10', '10-year', INK], ['T10YIE', '10-year breakeven inflation', '#5F7F14']].filter(t => Fr[t[0]]);
      const all = [...new Set(ids.flatMap(t => Fr[t[0]].pts.map(p => p[0])))].sort();
      us.setOption({ ...base(), tooltip: tip({ valueFormatter: v => v == null ? '—' : nf(v) + '%' }), legend: { top: 0, textStyle: { color: MUTE, fontSize: 11 } }, grid: { left: 48, right: 24, top: 40, bottom: 70 },
        dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8, borderColor: RULE }],
        xAxis: axis({ type: 'category', data: all, boundaryGap: false }), yAxis: axis({ type: 'value', axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: v => v + '%' } }),
        series: ids.map(([id, n, c]) => { const m = new Map(Fr[id].pts); return { name: n, type: 'line', data: all.map(d => m.get(d) ?? null), connectNulls: true, showSymbol: false, lineStyle: { color: c, width: id === 'T10YIE' ? 1.2 : 1.8 }, itemStyle: { color: c } }; }) });
    }

    /* ---------- external accounts: India over time + peer bars ---------- */
    const exL = mk('ex-line'), exB = mk('ex-bars'), C = D.countries, X = D.ext;
    const drawExt = id => {
      const e = X[id]; if (!e) return; const ind = e.data.IND || {}; const yrs = Object.keys(ind).map(Number).sort((a, b) => a - b).filter(y => y >= 1995);
      const proj = e.src === 'imf' ? 2026 : 9999;
      $('#ex-note').textContent = `${e.label} (${e.unit}). ${e.note}`; $('#ex-h1').textContent = `India: ${e.short.toLowerCase()}, ${e.unit}`;
      const act = yrs.map(y => y < proj ? ind[y] : null), pr = yrs.map(y => y >= proj - 1 ? ind[y] : null);
      exL.setOption({ ...base(), tooltip: tip({ valueFormatter: v => v == null ? '—' : nf(v, 1) }), grid: { left: 52, right: 24, top: 24, bottom: 40 },
        xAxis: axis({ type: 'category', data: yrs, boundaryGap: e.unit.includes('billion') }), yAxis: axis({ type: 'value', scale: !e.unit.includes('billion') }),
        series: e.unit.includes('billion')
          ? [{ name: 'India', type: 'bar', data: act, itemStyle: { color: SAFF, borderRadius: [2, 2, 0, 0] } }]
          : [{ name: 'India', type: 'line', data: act, showSymbol: false, lineStyle: { color: SAFF, width: 2.6 }, itemStyle: { color: SAFF }, areaStyle: id === 'BCA_NGDPD' ? { color: 'rgba(184,119,8,.12)' } : undefined,
              markLine: id === 'BCA_NGDPD' ? { silent: true, symbol: 'none', data: [{ yAxis: 0 }], lineStyle: { color: MUTE }, label: { show: false } } : id === 'FI.RES.TOTL.MO' ? { silent: true, symbol: 'none', data: [{ yAxis: 3 }], lineStyle: { color: DN, type: 'dotted' }, label: { formatter: '3-month floor', color: DN, fontSize: 10 } } : undefined },
             ...(proj < 9999 ? [{ name: 'IMF projection', type: 'line', data: pr, showSymbol: false, lineStyle: { color: SAFF, width: 2, type: 'dashed' }, itemStyle: { color: SAFF } }] : [])] }, true);
      // peers: latest actual year with India data
      const lastY = Math.max(...yrs.filter(y => y < proj && ind[y] != null));
      const rows = Object.entries(e.data).map(([c, o]) => ({ c, v: o[lastY] ?? null })).filter(r => r.v != null).sort((a, b) => a.v - b.v);
      $('#ex-h2').textContent = `All 14 economies, ${lastY}${id === 'BCA_NGDPD' || id === 'GGXWDG_NGDP' ? ' (India: FY' + lastY + '-' + String(lastY + 1).slice(2) + ')' : ''}`;
      exB.setOption({ ...base(), grid: { left: 110, right: 56, top: 10, bottom: 30 }, tooltip: tip({ trigger: 'item', formatter: p => `${p.name}: ${nf(p.value, 1)} ${e.unit}` }),
        xAxis: axis({ type: 'value' }),
        yAxis: axis({ type: 'category', data: rows.map(r => C[r.c] || r.c), axisLabel: { color: INK, fontSize: 11, formatter: n => n === 'India' ? `{b|${n}}` : n, rich: { b: { fontWeight: 700, color: SAFF } } } }),
        series: [{ type: 'bar', barWidth: '62%', data: rows.map(r => ({ value: r.v, itemStyle: { color: r.c === 'IND' ? SAFF : (id === 'BCA_NGDPD' ? (r.v >= 0 ? UP : DN) : '#9AA0A8'), borderRadius: 2 } })), label: { show: true, position: 'right', fontFamily: MONO, fontSize: 10, color: MUTE, formatter: p => nf(p.value, 1) } }] }, true);
    };
    const first = $('#ex-tabs button'); seg($('#ex-tabs'), drawExt); if (first) drawExt(first.dataset.x);
  });
})();
