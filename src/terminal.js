/* Kakistocrat Terminal: command bar over the series catalogue, click-to-chart rows, clock, live crypto. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';
  const nf = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  let CAT = [], byId = {}, cur = 'nse-nifty-50', range = '1Y', chart;
  const cache = {};
  const getS = id => cache[id] ? Promise.resolve(cache[id]) : fetch(`/api/series/${id}.json`).then(r => r.json()).then(d => (cache[id] = d));

  /* clock */
  const tick = () => { const ist = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60000); const m = ist.getHours() * 60 + ist.getMinutes(), wd = ist.getDay(); const open = wd > 0 && wd < 6 && m >= 555 && m < 930;
    $('#t-time').textContent = ist.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); const n = $('#t-nse'); n.textContent = open ? 'NSE OPEN' : 'NSE CLOSED'; n.className = open ? 't-up' : 't-dn'; };
  tick(); setInterval(tick, 1000);

  /* live crypto */
  const pull = () => fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true').then(r => r.json()).then(d => {
    const set = (k, v, c) => $$(`[data-live="${k}"]`).forEach(e => { e.textContent = v; if (c != null) e.className = c >= 0 ? 't-up' : 't-dn'; });
    const ch = c => `${c >= 0 ? '+' : '−'}${Math.abs(c).toFixed(2)}% 24h · live`;
    set('btc2', '$' + nf(d.bitcoin.usd, 0)); set('btc2-c', ch(d.bitcoin.usd_24h_change), d.bitcoin.usd_24h_change);
    set('eth', '$' + nf(d.ethereum.usd, 2)); set('eth-c', ch(d.ethereum.usd_24h_change), d.ethereum.usd_24h_change);
  }).catch(() => {});
  pull(); setInterval(pull, 60000);

  /* chart */
  const startFor = (d, r) => { if (r === 'All') return 0; const t = new Date(d.at(-1)); const n = parseInt(r); r.endsWith('M') ? t.setMonth(t.getMonth() - n) : t.setFullYear(t.getFullYear() - n); const iso = t.toISOString().slice(0, 10); return Math.max(0, d.findIndex(x => x >= iso)); };
  const draw = async () => {
    const s = await getS(cur), meta = byId[cur] || s;
    let d = s.d, v = s.v; if (meta.freq === 'annual') { range = range; } const today = new Date().toISOString().slice(0, 10);
    const i0 = meta.freq === 'annual' ? 0 : startFor(d, range); d = d.slice(i0); v = v.slice(i0);
    const proj = meta.freq === 'annual' ? d.findIndex(x => x > today) : -1;
    const first = v.find(x => x != null), last = v.filter(x => x != null).at(-1), chg = first ? (last / first - 1) * 100 : null;
    const col = chg == null || chg >= 0 ? '#22C55E' : '#EF4444';
    $('#t-ct').textContent = (meta.name || cur).toUpperCase();
    $('#t-cs').innerHTML = `${meta.unit || ''} · ${meta.freq || ''} · ${meta.source || ''} · last ${nf(last)}${chg != null && meta.freq !== 'annual' ? ` · <span class="${chg >= 0 ? 't-up' : 't-dn'}">${chg >= 0 ? '+' : '−'}${Math.abs(chg).toFixed(2)}% over ${range}</span>` : ''}${proj > 0 ? ' · dashed = projection' : ''} · <a href="/charts/#s=${cur}:lvl">open in workbench →</a>`;
    const lbl = meta.freq === 'annual' ? d.map(x => x.slice(0, 4)) : meta.freq === 'monthly' ? d.map(x => x.slice(0, 7)) : d;
    const split = proj > 0 ? [v.map((x, i) => i < proj ? x : null), v.map((x, i) => i >= proj - 1 ? x : null)] : [v];
    chart.setOption({ backgroundColor: 'transparent', animationDuration: 300, grid: { left: 58, right: 16, top: 12, bottom: 28 },
      tooltip: { trigger: 'axis', backgroundColor: '#0B0D10', borderColor: '#F59E0B', textStyle: { color: '#E5E7EB', fontFamily: MONO, fontSize: 12 }, valueFormatter: x => nf(x) },
      xAxis: { type: 'category', data: lbl, boundaryGap: false, axisLine: { lineStyle: { color: '#374151' } }, axisLabel: { color: '#9CA3AF', fontFamily: MONO, fontSize: 10 }, axisTick: { show: false } },
      yAxis: { type: 'value', scale: true, axisLabel: { color: '#9CA3AF', fontFamily: MONO, fontSize: 10 }, splitLine: { lineStyle: { color: '#1F2937' } } },
      series: split.map((data, k) => ({ type: 'line', data, showSymbol: false, connectNulls: false, lineStyle: { color: col, width: 1.8, type: k ? 'dashed' : 'solid' }, itemStyle: { color: col },
        areaStyle: k ? undefined : { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: col + '44' }, { offset: 1, color: col + '00' }] } } })) }, true);
    $$('tr[data-s]').forEach(r => r.classList.toggle('on', r.dataset.s === cur));
  };
  const show = id => { if (!id) return; cur = id; draw(); try { history.replaceState(null, '', '#' + id); } catch (e) {} };

  /* command bar */
  const q = $('#t-q'), sug = $('#t-sug'); let hits = [], sel = 0;
  const ALIAS = { usdinr: 'fx-usdinr', inr: 'fx-usdinr', rupee: 'fx-usdinr', nifty: 'nse-nifty-50', banknifty: 'nse-nifty-bank', vix: 'nse-india-vix', brent: 'fred-dcoilbrenteu', wti: 'fred-dcoilwtico', gold: 'wb-gold', silver: 'wb-silver', btc: 'crypto-bitcoin', bitcoin: 'crypto-bitcoin', eth: 'crypto-ethereum', dxy: 'fred-dtwexbgs', ust10: 'fred-dgs10', fedfunds: 'fred-dff', pe: 'nifty50-pe', hormuz: 'pw-strait-of-hormuz', suez: 'pw-suez-canal' };
  const search = s => { s = s.trim().toLowerCase(); if (!s) return []; const a = ALIAS[s.replace(/[\s/]/g, '')]; const words = s.split(/\s+/);
    const sc = c => { const h = (c.name + ' ' + c.group + ' ' + c.id).toLowerCase(); if (!words.every(w => h.includes(w))) return -1; return (c.name.toLowerCase().startsWith(words[0]) ? 3 : 0) + (/^(nse|fx|fred|wb)/.test(c.id) ? 1 : 0) + (c.name.includes('India') ? 1 : 0); };
    const r = CAT.map(c => [c, sc(c)]).filter(x => x[1] >= 0).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 8);
    if (a && byId[a]) return [byId[a], ...r.filter(c => c.id !== a)].slice(0, 8); return r; };
  const render = () => { sug.innerHTML = hits.map((c, i) => `<li role="option" data-id="${c.id}"${i === sel ? ' aria-selected="true"' : ''}><b>${c.name}</b><span>${c.group} · ${c.freq}</span></li>`).join(''); sug.hidden = !hits.length; };
  q.addEventListener('input', () => { hits = search(q.value); sel = 0; render(); });
  q.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, hits.length - 1); render(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); } else if (e.key === 'Escape') { hits = []; render(); q.blur(); } });
  $('#t-cmd').addEventListener('submit', e => { e.preventDefault(); if (hits[sel]) { show(hits[sel].id); q.value = ''; hits = []; render(); $('#t-ec').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
  sug.addEventListener('mousedown', e => { const li = e.target.closest('li'); if (li) { e.preventDefault(); show(li.dataset.id); q.value = ''; hits = []; render(); } });
  addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); } });
  $$('tr[data-s], [data-s]').forEach(r => { const go = () => { show(r.dataset.s); $('#t-ec').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; r.addEventListener('click', e => { if (!e.target.closest('a')) go(); }); r.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); });
  $$('#t-rg button').forEach(b => b.addEventListener('click', () => { $$('#t-rg button').forEach(x => x.removeAttribute('aria-pressed')); b.setAttribute('aria-pressed', 'true'); range = b.dataset.r; draw(); }));

  const boot = async () => { if (!window.echarts) return setTimeout(boot, 60);
    chart = echarts.init($('#t-ec')); addEventListener('resize', () => chart.resize());
    CAT = await fetch('/api/catalog.json').then(r => r.json()); byId = Object.fromEntries(CAT.map(c => [c.id, c]));
    const h = location.hash.slice(1); if (byId[h]) cur = h; draw(); };
  boot();
})();
