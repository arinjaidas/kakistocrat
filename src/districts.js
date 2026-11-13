/* District explorer. Loads /geo/india-districts.json and /api/districts.json. */
(function () {
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#17202C', MUTE = '#555A61';
  const RAMP = ['#F5F0E9', '#E6D6C3', '#CDAE8C', '#A67D57', '#7B4B2A', '#4E2E18'], RAMP_BAD = ['#F7EFF3', '#EDCFDE', '#DB9CBD', '#C4689A', '#A23E76', '#6F1F4D'];
  const BAD = new Set(['stunt', 'anae', 'agri']);
  const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const go = async () => { if (!window.echarts) return setTimeout(go, 60);
    const [geo, D] = await Promise.all([fetch('/geo/india-districts.json').then(r => r.json()), fetch('/api/districts.json').then(r => r.json())]);
    geo.features.forEach(f => f.properties.name = f.properties.id); echarts.registerMap('IND', geo);
    const el = document.getElementById('ds-map'), ch = echarts.init(el); addEventListener('resize', () => ch.resize());
    const $ = id => document.getElementById(id), sel = $('ds-ind'), sst = $('ds-st');
    let K = (location.hash.match(/m=(\w+)/) || [])[1] || 'flit'; if (!D.indicators[K]) K = 'flit'; sel.value = K;
    const fmt = (k, v) => v == null ? '—' : D.indicators[k].unit === 'people' ? Math.round(v).toLocaleString('en-IN') : D.indicators[k].unit === 'ratio' ? Math.round(v) : v.toFixed(1) + '%';
    const draw = () => { const I = D.indicators[K], st = sst.value, vals = Object.entries(I.values).filter(([c]) => !st || D.districts[c]?.st === st).map(x => x[1]).sort((a, b) => a - b);
      const q = p => vals[Math.floor(p * (vals.length - 1))]; const pieces = [0, .2, .4, .6, .8].map((p, i, a) => ({ min: q(p), max: i === a.length - 1 ? q(1) + 1e-9 : q(a[i + 1]) }));
      const ramp = BAD.has(K) ? RAMP_BAD : RAMP;
      const mapName = st ? 'IND_' + st : 'IND'; if (st && !echarts.getMap(mapName)) echarts.registerMap(mapName, { type: 'FeatureCollection', features: geo.features.filter(f => f.properties.st === st) });
      ch.setOption({ textStyle: { fontFamily: FONT }, tooltip: { formatter: p => { const d = D.districts[p.name]; return d ? `<b>${d.n}</b>, ${d.st}<br>${I.label}: ${fmt(K, I.values[p.name])}` : ''; } },
        visualMap: { type: 'piecewise', pieces: pieces.map((p, i) => ({ ...p, color: ramp[i + 1], label: `${fmt(K, p.min)} – ${fmt(K, p.max)}` })), left: 6, bottom: 6, itemWidth: 14, itemHeight: 10, textStyle: { color: MUTE, fontFamily: MONO, fontSize: 10 }, outOfRange: { color: '#E6EAE2' } },
        series: [{ type: 'map', map: mapName, roam: true, scaleLimit: { min: 0.8, max: 20 }, selectedMode: 'single', itemStyle: { borderColor: '#fff', borderWidth: 0.4, areaColor: '#E6EAE2' }, emphasis: { label: { show: false }, itemStyle: { areaColor: '#D4A03A' } }, select: { label: { show: false }, itemStyle: { areaColor: '#D4A03A', borderColor: INK, borderWidth: 1 } },
          data: Object.keys(D.districts).filter(c => !st || D.districts[c].st === st).map(c => ({ name: c, value: I.values[c] ?? NaN })) }] }, true);
      $('ds-src').textContent = `${I.label}, ${I.unit}. Source: ${I.source}. Grey: no data. Darker = ${BAD.has(K) ? 'worse' : 'higher'}. Scroll to zoom, drag to pan.`;
      const ranked = Object.entries(I.values).filter(([c]) => !st || D.districts[c]?.st === st).sort((a, b) => b[1] - a[1]);
      const li = ([c, v]) => `<li><a href="#d=${c}" data-c="${c}">${D.districts[c].n}</a><small>${st ? '' : `<a href="/state/${slug(D.districts[c].st)}/" style="color:inherit">${D.districts[c].st}</a>`}</small><b>${fmt(K, v)}</b></li>`;
      $('ds-top').innerHTML = ranked.slice(0, 8).map(li).join(''); $('ds-bot').innerHTML = ranked.slice(-8).reverse().map(li).join('');
      history.replaceState(null, '', `#m=${K}${st ? '&s=' + encodeURIComponent(st) : ''}`); };
    const card = c => { const d = D.districts[c]; if (!d) return;
      const rows = Object.entries(D.indicators).map(([k, I]) => { const v = I.values[c]; if (v == null) return ''; const all = Object.values(I.values).sort((a, b) => b - a), inSt = Object.entries(I.values).filter(([x]) => D.districts[x]?.st === d.st).map(x => x[1]).sort((a, b) => b - a);
        return `<tr${k === K ? ' class="hl"' : ''}><th>${I.label}</th><td class="num">${fmt(k, v)}</td><td class="num">${inSt.indexOf(v) + 1}/${inSt.length}</td><td class="num">${all.indexOf(v) + 1}/${all.length}</td></tr>`; }).join('');
      $('ds-card').innerHTML = `<h3>${d.n}</h3><p class="meta"><a href="/state/${slug(d.st)}/">${d.st}</a> · rank 1 is the highest</p><table class="xr-table ds-t"><thead><tr><th></th><th class="num">Value</th><th class="num">In state</th><th class="num">In India</th></tr></thead><tbody>${rows}</tbody></table>`;
      ch.dispatchAction({ type: 'select', seriesIndex: 0, name: c }); };
    sel.addEventListener('change', () => { K = sel.value; draw(); }); sst.addEventListener('change', draw);
    ch.on('click', p => p.name && card(p.name));
    document.addEventListener('click', e => { const a = e.target.closest('[data-c]'); if (a) { e.preventDefault(); card(a.dataset.c); } });
    $('ds-q').addEventListener('change', e => { const v = e.target.value.toLowerCase(); const c = Object.keys(D.districts).find(c => `${D.districts[c].n}, ${D.districts[c].st}`.toLowerCase() === v || D.districts[c].n.toLowerCase() === v); if (c) { sst.value = D.districts[c].st; draw(); card(c); } });
    $('ds-png').addEventListener('click', () => { const a = document.createElement('a'); a.href = ch.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' }); a.download = `kakistocrat-districts-${K}.png`; a.click(); });
    const h = new URLSearchParams(location.hash.slice(1)); if (h.get('s')) sst.value = h.get('s');
    draw(); if (h.get('d')) card(h.get('d'));
  };
  go();
})();
