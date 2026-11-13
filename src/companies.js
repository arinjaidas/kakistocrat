/* Company pages (window.__CO) and the companies hub (window.__CM). */
(function () {
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#17202C', MUTE = '#555A61', RULE = '#D9DED3';
  const axis = (x = {}) => ({ axisLine: { lineStyle: { color: RULE } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#E6EAE2' } }, ...x });
  // sortable, filterable table (no charts needed)
  const t = document.getElementById('cm-t');
  if (t) { const tb = t.tBodies[0]; let dir = {};
    t.tHead.addEventListener('click', e => { const th = e.target.closest('th'); if (!th) return; const k = +th.dataset.k; dir[k] = -(dir[k] || (k > 1 ? 1 : -1));
      const rows = [...tb.rows].sort((a, b) => { const A = a.cells[k], B = b.cells[k]; const x = A.dataset.v != null ? +A.dataset.v : A.textContent, y = B.dataset.v != null ? +B.dataset.v : B.textContent; return (x > y ? 1 : x < y ? -1 : 0) * dir[k]; });
      rows.forEach(r => tb.appendChild(r)); });
    const q = document.getElementById('cm-q');
    const byHash = () => { const a = location.hash && document.querySelector(`[data-ind][href="${location.hash}"]`); if (a && q) { q.value = a.dataset.ind; q.dispatchEvent(new Event('input')); document.getElementById('list').scrollIntoView(); } };
    addEventListener('hashchange', byHash); setTimeout(byHash, 50);
    q && q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); for (const r of tb.rows) r.hidden = v && !(r.dataset.n.includes(v) || r.dataset.i.toLowerCase().includes(v)); }); }
  const go = () => { if (!window.echarts) return setTimeout(go, 60);
    const C = window.__CO;
    if (C) { const el = document.getElementById('co-chart'), ch = echarts.init(el); addEventListener('resize', () => ch.resize());
      const rebase = v => { const b = v.find(x => x != null); return v.map(x => x == null || !b ? null : +(x / b * 100).toFixed(2)); };
      const draw = m => ch.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 56, right: 20, top: 30, bottom: 56 }, legend: { top: 0, textStyle: { color: MUTE } },
        tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: INK, borderWidth: 1, textStyle: { color: INK, fontSize: 12 } }, dataZoom: [{ type: 'slider', height: 18, bottom: 8 }],
        xAxis: axis({ type: 'category', data: C.d, boundaryGap: false }), yAxis: axis({ type: 'value', scale: true, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11, formatter: m === 'price' ? '₹{value}' : '{value}' } }),
        series: m === 'price' ? [{ name: C.n, type: 'line', showSymbol: false, connectNulls: true, data: C.c, lineStyle: { color: INK, width: 2 }, itemStyle: { color: INK }, areaStyle: { color: 'rgba(21,23,26,.05)' } }]
          : [{ name: C.n, data: rebase(C.c), c: INK, w: 2.4 }, { name: 'Nifty 50', data: C.nifty && rebase(C.nifty), c: '#1C7C99', w: 1.6 }, ...(C.ind ? [{ name: C.ind.n, data: rebase(C.ind.v), c: '#B87708', w: 1.6 }] : [])].filter(s => s.data)
            .map(s => ({ name: s.name, type: 'line', showSymbol: false, connectNulls: true, data: s.data, lineStyle: { color: s.c, width: s.w }, itemStyle: { color: s.c } })) }, true);
      draw('price');
      document.getElementById('co-mode')?.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; [...b.parentNode.children].forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.m); }); }
    const M = window.__CM;
    if (M) { const el = document.getElementById('cm-tree'), ch = echarts.init(el); addEventListener('resize', () => ch.resize());
      const col = v => v == null ? '#D9D6CF' : v >= 0 ? `rgba(15,107,58,${Math.min(1, 0.25 + Math.abs(v) / (W === 'd1' ? 4 : W === 'm1' ? 12 : 40))})` : `rgba(180,35,24,${Math.min(1, 0.25 + Math.abs(v) / (W === 'd1' ? 4 : W === 'm1' ? 12 : 40))})`;
      let W = 'd1';
      const draw = () => ch.setOption({ tooltip: { formatter: p => p.data.r ? `<b>${p.name}</b><br>₹${(p.value / 1e5).toFixed(2)} lakh cr<br>${p.data.r[W] == null ? '—' : (p.data.r[W] > 0 ? '+' : '') + p.data.r[W].toFixed(1) + '%'}` : p.name },
        series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, top: 0, left: 0, right: 0, bottom: 0, leafDepth: 2,
          upperLabel: { show: true, height: 18, color: '#fff', fontFamily: MONO, fontSize: 11, backgroundColor: INK },
          levels: [{ itemStyle: { borderColor: INK, borderWidth: 2, gapWidth: 2 } }, { itemStyle: { borderColor: '#fff', borderWidth: 1, gapWidth: 1 } }],
          label: { formatter: p => p.data.r ? `${p.name}\n${p.data.r[W] == null ? '' : (p.data.r[W] > 0 ? '+' : '') + p.data.r[W].toFixed(1) + '%'}` : p.name, fontFamily: FONT, fontSize: 11, color: '#fff', overflow: 'truncate' },
          data: M.map(g => ({ ...g, children: g.children.map(c => ({ ...c, itemStyle: { color: col(c.r[W]) } })) })) }] }, true);
      draw(); ch.on('click', p => { if (p.data?.s) location.href = `/company/${p.data.s}/`; });
      document.getElementById('cm-win')?.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; [...b.parentNode.children].forEach(x => x.classList.toggle('on', x === b)); W = b.dataset.w; draw(); }); }
  };
  if (window.__CO || window.__CM) go();
})();
