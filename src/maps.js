/* India in maps: poster-style choropleths rendered entirely inside ECharts so "Save image" captures the whole poster. */
(function () {
  const POSTERS = window.__MAPS || [], W = 1080, H = 1350;
  const SERIF = 'Newsreader, Georgia, serif', SANS = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace';
  const BG = '#FAF6EE', INK = '#15171A', MUTE = '#6B7078', NODATA = '#DCD6CA';
  const POS = { 'Jammu & Kashmir': [74.9, 33.5], 'Himachal Pradesh': [77.3, 31.9], 'Punjab': [75.3, 30.8], 'Haryana': [76.1, 29.2], 'Uttarakhand': [79.3, 30.1], 'Rajasthan': [73.6, 26.7],
    'Uttar Pradesh': [80.4, 27.1], 'Bihar': [85.7, 25.8], 'Gujarat': [71.5, 22.8], 'Madhya Pradesh': [77.9, 23.6], 'Jharkhand': [85.4, 23.6], 'West Bengal': [88.2, 23.3], 'Chhattisgarh': [81.9, 21.6],
    'Odisha': [84.4, 20.4], 'Maharashtra': [75.8, 19.4], 'Telangana': [79.1, 17.9], 'Andhra Pradesh': [79.4, 15.4], 'Karnataka': [76.0, 14.7], 'Tamil Nadu': [78.4, 11.0],
    'Assam': [92.7, 26.2], 'Arunachal Pradesh': [94.4, 28.0] };
  const BIG = ['Rajasthan', 'Madhya Pradesh', 'Maharashtra', 'Uttar Pradesh', 'Gujarat', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Odisha', 'Chhattisgarh', 'Bihar', 'Jharkhand', 'West Bengal', 'Assam', 'Arunachal Pradesh', 'Jammu & Kashmir', 'Kerala', 'Punjab', 'Haryana', 'Uttarakhand', 'Himachal Pradesh'];
  const SMALL = ['Kerala', 'Delhi', 'Goa', 'Sikkim', 'Meghalaya', 'Tripura', 'Manipur', 'Mizoram', 'Nagaland', 'Puducherry'];
  const SHORT = { 'Jammu & Kashmir': 'J&K', 'Arunachal Pradesh': 'Arunachal', 'Himachal Pradesh': 'Himachal', 'Madhya Pradesh': 'MP', 'Uttar Pradesh': 'UP', 'Andhra Pradesh': 'Andhra', 'West Bengal': 'WB', 'Chhattisgarh': 'Chhattisgarh', 'Uttarakhand': 'Uttarakhand' };
  const fmt = (v, f) => v == null ? '—' : f === 'pct' ? v.toFixed(2) + '%' : f === 'pct1' ? v.toFixed(1) + '%' : f === 'inr' ? (v >= 1e5 ? '₹' + (v / 1e5).toFixed(1) + 'L' : '₹' + Math.round(v / 1000) + 'k') : f === 'usd' ? '$' + (v >= 100 ? Math.round(v) : v.toFixed(v < 10 ? 1 : 0)) + 'bn' : String(v);
  const bucket = (v, br) => { let i = 0; while (i < br.length && v >= br[i]) i++; return i; };
  const lum = hex => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const charts = {};
  const ctx = document.createElement('canvas').getContext('2d');
  const lines = (text, font, width) => { ctx.font = font; let n = 1, cur = ''; for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > width && cur) { n++; cur = w; } else cur = t; } return n; };

  function option(p, s) { // s = scale factor (container px per poster unit)
    const u = x => x * s;
    const regions = Object.entries(p.values).map(([name, v]) => ({ name, itemStyle: { areaColor: p.colors[bucket(v, p.breaks)] } }));
    const data = Object.entries(p.values).map(([name, v]) => ({ name, value: v, lab: p.labels ? p.labels[name] : fmt(v, p.fmt) }));
    const labels = Object.entries(POS).filter(([n]) => p.values[n] != null).map(([name, xy]) => { const v = p.values[name], c = p.colors[bucket(v, p.breaks)], dark = name !== 'Kerala' && lum(c) < 0.55, lab = p.labels ? p.labels[name] : fmt(v, p.fmt), sm = name === 'West Bengal' || name === 'Haryana' || name === 'Punjab' || name === 'Himachal Pradesh';
      return { name, value: [...xy, v], label: { show: true, color: dark ? '#fff' : INK, formatter: `{s|${SHORT[name] || name}}\n{b|${lab}}`,
        rich: { s: { fontFamily: SANS, fontSize: u(sm ? 12 : 14), lineHeight: u(sm ? 15 : 18), color: dark ? 'rgba(255,255,255,.82)' : MUTE, align: 'center' }, b: { fontFamily: p.labels ? SERIF : MONO, fontWeight: 700, fontSize: u(p.labels ? (sm ? 14 : 18) : (sm ? 15 : 20)), lineHeight: u(sm ? 18 : 23), color: dark ? '#fff' : INK, align: 'center', textShadowColor: dark ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.6)', textShadowBlur: u(3) } } } };
    });
    const small = SMALL.filter(n => p.values[n] != null).map(n => `${n}  ${p.labels ? p.labels[n] : fmt(p.values[n], p.fmt)}`);
    const legend = p.legend.map((t, i) => [
      { type: 'rect', left: u(64 + i * 196), top: u(1188), shape: { width: u(28), height: u(28) }, style: { fill: p.colors[i] } },
      { type: 'text', left: u(64 + i * 196 + 36), top: u(1192), style: { text: t, fill: INK, font: `500 ${u(17)}px ${SANS}` } }]).flat();
    const tl = lines(p.title, `600 54px ${SERIF}`, 950), subTop = 96 + tl * 60 + 14, sl = lines(p.sub, `400 23px ${SERIF}`, 950), mapTop = subTop + sl * 31 + 20;
    const mapSize = Math.min(900, 1170 - mapTop), mapCy = mapTop + mapSize / 2;
    return {
      backgroundColor: BG, animation: false,
      tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: INK, textStyle: { fontFamily: SANS, color: INK }, formatter: q => q.data ? `<b>${q.name}</b><br>${p.labels ? `≈ ${q.data.lab} (${fmt(q.value, p.fmt)})` : fmt(q.value, p.fmt)}` : `<b>${q.name}</b><br>No data` },
      graphic: [
        { type: 'rect', left: 0, top: 0, shape: { width: u(W), height: u(10) }, style: { fill: p.colors[p.colors.length - 1] } },
        { type: 'text', left: u(64), top: u(56), style: { text: p.kicker.toUpperCase(), fill: p.colors[p.colors.length - 1], font: `700 ${u(22)}px ${MONO}`, letterSpacing: u(3) } },
        { type: 'text', left: u(64), top: u(96), style: { text: p.title, width: u(950), overflow: 'break', fill: INK, font: `600 ${u(54)}px ${SERIF}`, lineHeight: u(60) } },
        { type: 'text', left: u(64), top: u(subTop), style: { text: p.sub, width: u(950), overflow: 'break', fill: '#3A3E44', font: `400 ${u(23)}px ${SERIF}`, lineHeight: u(31) } },
        ...(small.length ? [{ type: 'text', left: u(64), top: u(Math.max(mapCy + 60, 880)), style: { text: 'Not labelled on the map\n' + small.join('\n'), fill: INK, font: `500 ${u(16)}px ${MONO}`, lineHeight: u(23), rich: {} } }] : []),
        ...legend,
        { type: 'text', left: u(64), top: u(1248), style: { text: 'Source: ' + p.source, width: u(950), overflow: 'break', fill: MUTE, font: `400 ${u(16)}px ${SANS}`, lineHeight: u(21) } },
        { type: 'text', left: u(64), top: u(1300), style: { text: 'THE KAKISTOCRAT', fill: INK, font: `700 ${u(18)}px ${MONO}`, letterSpacing: u(2) } },
        { type: 'text', right: u(64), top: u(1300), style: { text: 'kakistocrat.pages.dev/maps', fill: MUTE, font: `500 ${u(18)}px ${MONO}` } },
      ],
      geo: { map: 'IN', nameProperty: 'ST_NM', roam: false, silent: false, layoutCenter: [u(610), u(mapCy)], layoutSize: u(mapSize), aspectScale: 0.9, regions,
        itemStyle: { areaColor: NODATA, borderColor: BG, borderWidth: u(1.6) }, emphasis: { itemStyle: { borderColor: INK, borderWidth: u(2.4) }, label: { show: false } }, label: { show: false }, select: { disabled: true } },
      series: [{ type: 'map', geoIndex: 0, data }, { type: 'scatter', coordinateSystem: 'geo', symbolSize: 0, silent: true, tooltip: { show: false }, data: labels, z: 5 }],
    };
  }

  function render(p) {
    const el = document.querySelector(`.mp-map[data-id="${p.id}"]`); if (!el) return;
    const w = el.clientWidth || 540; el.style.height = (w * H / W) + 'px';
    const c = charts[p.id] || (charts[p.id] = echarts.init(el, null, { renderer: 'canvas' }));
    c.resize(); c.setOption(option(p, w / W), true);
  }
  const boot = async () => {
    if (!window.echarts) return setTimeout(boot, 60);
    const geo = await fetch('/geo/india-states.json').then(r => r.json()); echarts.registerMap('IN', geo);
    try { await document.fonts.ready; } catch (e) {}
    POSTERS.forEach(render);
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => POSTERS.forEach(render), 150); });
    document.querySelectorAll('.mp-save').forEach(b => b.addEventListener('click', () => {
      const p = POSTERS.find(x => x.id === b.dataset.id), el = document.querySelector(`.mp-map[data-id="${p.id}"]`), c = charts[p.id];
      const a = document.createElement('a'); a.href = c.getDataURL({ type: 'png', pixelRatio: W / el.clientWidth, backgroundColor: BG }); a.download = `kakistocrat-india-${p.id}.png`; a.click(); }));
  };
  boot();
})();
