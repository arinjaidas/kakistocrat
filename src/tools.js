// Calculators: personal inflation, rupee value, policy rule, debt path. Everything runs locally.
(function () {
  const T = window.__T; if (!T) return;
  const $ = s => document.querySelector(s), num = el => parseFloat(el.value);
  const fmt = (v, d = 2) => Number.isFinite(v) ? v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
  const C = ['#B5367A', '#1C7C99', '#c98a1b', '#5F7F14'];
  const chart = id => { const el = document.getElementById(id); if (!el || !window.echarts) return null; const c = echarts.init(el); addEventListener('resize', () => c.resize()); return c; };
  const ready = f => window.echarts ? f() : addEventListener('load', f);

  if (T.tool === 'my-inflation') ready(() => {
    const ins = [...document.querySelectorAll('.tl-in')], bars = chart('tl-bars');
    const run = () => {
      const sp = ins.map(i => Math.max(0, num(i) || 0)), tot = sp.reduce((a, b) => a + b, 0);
      document.querySelectorAll('.tl-sh').forEach((el, i) => el.textContent = tot ? fmt(sp[i] / tot * 100, 1) + '%' : '—');
      if (!tot) { $('#tl-you').textContent = '—'; $('#tl-cmp').textContent = `Enter your spending to compare with the official ${T.headline}%.`; bars && bars.clear(); return; }
      const you = T.divisions.reduce((s, d, i) => s + sp[i] / tot * d.inflation, 0), diff = you - T.headline;
      $('#tl-you').textContent = fmt(you) + '%';
      $('#tl-cmp').textContent = `${Math.abs(diff) < 0.005 ? 'The same as' : (diff > 0 ? fmt(diff) + ' points above' : fmt(-diff) + ' points below')} the official ${T.headline}% for ${T.month}.`;
      const c = T.divisions.map((d, i) => ({ n: d.short || d.name, v: sp[i] / tot * d.inflation, o: d.weight / 100 * d.inflation })).sort((a, b) => b.v - a.v);
      bars && bars.setOption({ grid: { left: 110, right: 20, top: 26, bottom: 20 }, legend: { top: 0, textStyle: { fontSize: 11 } }, tooltip: { trigger: 'axis', valueFormatter: v => fmt(v) + ' pts' },
        xAxis: { type: 'value', name: 'points of inflation', nameLocation: 'middle', nameGap: 22 }, yAxis: { type: 'category', inverse: true, data: c.map(x => x.n), axisLabel: { fontSize: 11 } },
        series: [{ name: 'You', type: 'bar', data: c.map(x => +x.v.toFixed(3)), color: C[0] }, { name: 'Official basket', type: 'bar', data: c.map(x => +x.o.toFixed(3)), color: '#C9CFC3' }] }, true);
    };
    ins.forEach(i => i.addEventListener('input', run));
    $('#tl-official').addEventListener('click', () => { ins.forEach((i, k) => i.value = Math.round(T.divisions[k].weight * 1000)); run(); });
    $('#tl-clear').addEventListener('click', () => { ins.forEach(i => i.value = ''); run(); });
  });

  if (T.tool === 'rupee-value') ready(() => {
    const M = new Map(T.cpi), G = new Map(T.gold || []), N = new Map(T.nifty || []), c = chart('rv-chart');
    const run = () => {
      const a = num($('#rv-amt')), f = $('#rv-from').value, t = $('#rv-to').value, i0 = M.get(f), i1 = M.get(t);
      if (!a || !i0 || !i1) return;
      const v = a * i1 / i0, yrs = (Date.parse(t + '-01') - Date.parse(f + '-01')) / (365.25 * 864e5);
      $('#rv-out').textContent = '₹' + fmt(v, 0);
      $('#rv-sub').textContent = `Prices ${i1 >= i0 ? 'rose' : 'fell'} ${fmt(Math.abs(i1 / i0 - 1) * 100, 1)}% from ${f} to ${t}` + (yrs > 1 ? `, ${fmt((Math.pow(i1 / i0, 1 / yrs) - 1) * 100, 1)}% a year.` : '.');
      const g0 = G.get(f), g1 = G.get(t);
      $('#rv-gold').textContent = g0 && g1 ? `₹${fmt(a, 0)} in gold in ${f} would have been worth ₹${fmt(a * g1 / g0, 0)} in ${t}, ${fmt((g1 / g0) / (i1 / i0) * 100 - 100, 0)}% more in real terms.` : '';
      const n0 = N.get(f), n1 = N.get(t);
      $('#rv-nifty').textContent = n0 && n1 ? `In the Nifty 50 (price index) it would have been worth ₹${fmt(a * n1 / n0, 0)}, ${fmt((n1 / n0) / (i1 / i0) * 100 - 100, 0)}% in real terms.` : (N.size ? `Nifty 50 comparison available from ${[...N.keys()][0]}.` : '');
      if (c) { const ds = T.cpi.map(x => x[0]).filter(d => d >= f && d <= t);
        c.setOption({ grid: { left: 50, right: 16, top: 30, bottom: 30 }, legend: { top: 0 }, tooltip: { trigger: 'axis', valueFormatter: v => '₹' + fmt(v, 0) },
          xAxis: { type: 'category', data: ds }, yAxis: { type: 'value', scale: true },
          series: [{ name: 'Same purchasing power', type: 'line', showSymbol: false, color: C[0], data: ds.map(d => +(a * M.get(d) / i0).toFixed(0)) },
                   ...(g0 ? [{ name: 'Held in gold', type: 'line', showSymbol: false, color: C[2], data: ds.map(d => G.get(d) ? +(a * G.get(d) / g0).toFixed(0) : null) }] : []), ...(n0 ? [{ name: 'Held in the Nifty 50', type: 'line', showSymbol: false, color: C[1], data: ds.map(d => N.get(d) ? +(a * N.get(d) / n0).toFixed(0) : null) }] : [])] }, true); }
    };
    ['#rv-amt', '#rv-from', '#rv-to'].forEach(s => $(s).addEventListener('input', run)); run();
  });

  if (T.tool === 'policy-rule') ready(() => {
    const c = chart('pr-chart'), R = new Map(T.repo);
    const run = () => {
      const r = num($('#pr-r')), t = num($('#pr-t')), a = num($('#pr-a')), g = num($('#pr-g')), b = num($('#pr-b'));
      const rule = T.cpi.map(([d, p]) => [d, +(r + p + a * (p - t) + b * g).toFixed(2)]), last = rule.at(-1), rp = T.repo.at(-1);
      $('#pr-out').textContent = fmt(last[1]) + '%';
      $('#pr-sub').textContent = `Using ${last[0]} inflation. The repo rate is ${fmt(rp[1])}%, so policy is ${rp[1] < last[1] ? fmt(last[1] - rp[1]) + ' points looser' : fmt(rp[1] - last[1]) + ' points tighter'} than this rule.`;
      const ds = rule.map(x => x[0]).filter(d => d >= T.repo[0][0]);
      c && c.setOption({ grid: { left: 44, right: 16, top: 30, bottom: 30 }, legend: { top: 0 }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : fmt(v) + '%' },
        xAxis: { type: 'category', data: ds }, yAxis: { type: 'value', scale: true },
        series: [{ name: 'Rule-implied rate', type: 'line', showSymbol: false, color: C[1], data: ds.map(d => rule.find(x => x[0] === d)[1]) }, { name: 'Repo rate', type: 'line', step: 'end', showSymbol: false, color: C[0], data: ds.map(d => R.get(d) ?? null) }] }, true);
    };
    document.querySelectorAll('.tl-form input').forEach(i => i.addEventListener('input', run)); run();
  });

  if (T.tool === 'debt-path') ready(() => {
    const c = chart('dp-chart');
    const run = () => {
      let d = num($('#dp-d')); const r = num($('#dp-r')) / 100, g = num($('#dp-g')) / 100, p = num($('#dp-p')), n = Math.min(40, Math.max(3, num($('#dp-n')) || 15));
      const y0 = +T.start.year, path = [[String(y0), d]];
      for (let k = 1; k <= n; k++) { d = d * (1 + r) / (1 + g) - p; path.push([String(y0 + k), +d.toFixed(2)]); }
      const stab = path[0][1] * (r - g) / (1 + g);
      $('#dp-out').textContent = fmt(path.at(-1)[1], 1) + '% of GDP';
      $('#dp-sub').textContent = `in ${path.at(-1)[0]}. Debt stays at today’s ratio with a primary balance of ${fmt(stab, 2)}% of GDP${stab > p ? '; yours is weaker, so the ratio rises' : '; yours is stronger, so the ratio falls'}.`;
      const ys = path.map(x => x[0]), imf = new Map(T.imf);
      c && c.setOption({ grid: { left: 44, right: 16, top: 30, bottom: 30 }, legend: { top: 0 }, tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '—' : fmt(v, 1) + '%' },
        xAxis: { type: 'category', data: ys }, yAxis: { type: 'value', scale: true },
        series: [{ name: 'Your path', type: 'line', color: C[0], data: path.map(x => x[1]) }, { name: 'IMF projection', type: 'line', color: C[1], lineStyle: { type: 'dashed' }, data: ys.map(y => imf.get(y) ?? null) }] }, true);
    };
    document.querySelectorAll('.tl-form input').forEach(i => i.addEventListener('input', run)); run();
  });
})();
