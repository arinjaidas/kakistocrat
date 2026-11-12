/* Entity pages: series chart with compare, state locator map, and the explore network. */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace', INK = '#15171A', MUTE = '#6B7078', RULE = '#E2DFD8', RED = '#B42318', BLUE = '#1D4ED8';
  const nf = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const axis = (x = {}) => ({ axisLine: { lineStyle: { color: RULE } }, axisTick: { show: false }, axisLabel: { color: MUTE, fontFamily: MONO, fontSize: 11 }, splitLine: { lineStyle: { color: '#EEECE7' } }, ...x });
  const slug = t => t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => navigator.clipboard?.writeText(b.dataset.copy).then(() => { const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => b.textContent = t, 1400); })));
  const ready = fn => { if (window.echarts) fn(); else setTimeout(() => ready(fn), 60); };

  /* ---- series page ---- */
  if (window.__EN) ready(async () => {
    const E = window.__EN, el = $('#en-chart'), c = echarts.init(el); addEventListener('resize', () => c.resize());
    const get = id => fetch(`/api/series/${id}.json`).then(r => r.json());
    const [main, EV] = await Promise.all([get(E.id), fetch('/api/events.json').then(r => r.json()).then(j => j.events.filter(e => !e.series.length || e.series.some(t => t.endsWith('*') ? E.id.startsWith(t.slice(0, -1)) : t === E.id))).catch(() => [])]); let cmp = null, range = E.annual ? 'All' : '3Y';
    const evLine = dates => { const xs = EV.map(e => [e, dates.find(d => d >= e.date.slice(0, dates[0].length))]).filter(x => x[1] && x[1] !== dates[0]); return xs.length ? { symbol: 'none', silent: false, lineStyle: { color: INK, type: 'dashed', opacity: 0.35 }, label: { formatter: p => p.name, position: 'insideEndTop', color: INK, fontFamily: MONO, fontSize: 10 }, tooltip: { formatter: p => p.data.full }, data: xs.map(([e, d]) => ({ xAxis: d, name: e.short, full: `${e.date}: ${e.label}` })) } : undefined; };
    const start = (d, r) => { if (r === 'All') return d[0]; const t = new Date(d.at(-1)); t.setFullYear(t.getFullYear() - parseInt(r)); return t.toISOString().slice(0, 10); };
    const draw = () => {
      const s0 = start(main.d, range), idx = main.d.map((x, i) => x >= s0 ? i : -1).filter(i => i >= 0);
      const dates = idx.map(i => main.d[i]), vals = idx.map(i => main.v[i]);
      if (!cmp) {
        const proj = E.projectionFrom ? dates.findIndex(x => x.slice(0, 4) >= E.projectionFrom) : -1;
        c.setOption({ textStyle: { fontFamily: FONT }, animationDuration: 300, grid: { left: 60, right: 20, top: 20, bottom: 40 }, tooltip: { trigger: 'axis', valueFormatter: v => nf(v) },
          xAxis: axis({ type: 'category', data: dates, boundaryGap: false }), yAxis: axis({ type: 'value', scale: true, name: E.unit, nameTextStyle: { color: MUTE } }),
          series: (proj > 0 ? [vals.map((v, i) => i < proj ? v : null), vals.map((v, i) => i >= proj - 1 ? v : null)] : [vals]).map((data, k) => ({ type: 'line', data, showSymbol: E.annual, symbolSize: 4, markLine: k ? undefined : evLine(dates), step: E.id === 'india-repo' ? 'end' : false, lineStyle: { color: RED, width: 2.2, type: k ? 'dashed' : 'solid' }, itemStyle: { color: RED },
            areaStyle: k ? undefined : { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(180,35,24,.16)' }, { offset: 1, color: 'rgba(180,35,24,0)' }] } } })) }, true);
        $('#en-ct').textContent = E.name; return;
      }
      // compare: rebase both to 100 at the first common date in range (monthly for mixed frequencies)
      const toM = s => { const m = new Map(); s.d.forEach((x, i) => m.set(x.slice(0, 7), s.v[i])); return m; };
      const daily = !E.annual && !cmp.d[0].match(/^\d{4}$/);
      const A = daily ? toM(main) : new Map(main.d.map((x, i) => [x, main.v[i]])), B = daily ? toM(cmp) : new Map(cmp.d.map((x, i) => [x, cmp.v[i]]));
      const ks = [...A.keys()].filter(k => B.has(k) && k >= s0.slice(0, daily ? 7 : 4)).sort(); if (!ks.length) return;
      const a0 = A.get(ks[0]), b0 = B.get(ks[0]);
      c.setOption({ textStyle: { fontFamily: FONT }, grid: { left: 60, right: 20, top: 40, bottom: 40 }, tooltip: { trigger: 'axis', valueFormatter: v => nf(v, 1) }, legend: { top: 0, textStyle: { color: MUTE } },
        xAxis: axis({ type: 'category', data: ks, boundaryGap: false }), yAxis: axis({ type: 'value', scale: true }),
        series: [{ name: E.name, type: 'line', data: ks.map(k => +(A.get(k) / a0 * 100).toFixed(2)), showSymbol: false, lineStyle: { color: RED, width: 2.2 }, itemStyle: { color: RED } },
          { name: cmp.name, type: 'line', data: ks.map(k => +(B.get(k) / b0 * 100).toFixed(2)), showSymbol: false, lineStyle: { color: BLUE, width: 2 }, itemStyle: { color: BLUE } }] }, true);
      $('#en-ct').textContent = `${E.name} vs ${cmp.name} (rebased to 100)`;
    };
    $$('#en-range button').forEach(b => b.addEventListener('click', () => { $$('#en-range button').forEach(x => x.removeAttribute('aria-pressed')); b.setAttribute('aria-pressed', 'true'); range = b.dataset.r; draw(); }));
    const add = async id => { cmp = id ? await get(id) : null; $('#en-add').value = id || ''; draw(); };
    $('#en-add').addEventListener('change', e => add(e.target.value));
    $$('.en-cmp').forEach(b => b.addEventListener('click', () => { add(b.dataset.id); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }));
    draw();
  });

  /* ---- state page: locator map ---- */
  if (window.__ST) ready(async () => {
    const S = window.__ST, geo = await fetch('/geo/india-states.json').then(r => r.json()); echarts.registerMap('IN', geo);
    const c = echarts.init($('#st-map')); addEventListener('resize', () => c.resize());
    c.setOption({ tooltip: { formatter: p => p.name }, series: [{ type: 'map', map: 'IN', nameProperty: 'ST_NM', roam: false, selectedMode: false, aspectScale: 0.9,
      itemStyle: { areaColor: '#E8E3D6', borderColor: '#fff', borderWidth: 1 }, emphasis: { itemStyle: { areaColor: '#B9B3DA' }, label: { show: false } },
      data: S.states.map(n => ({ name: n, itemStyle: { areaColor: n === S.name ? RED : '#D6CFBE' } })) }] });
    c.on('click', p => { if (S.states.includes(p.name)) location.href = `/state/${slug(p.name)}/`; });
  });

  /* ---- explore: network of co-mentions ---- */
  if (window.__NET) ready(() => {
    const N = window.__NET, c = echarts.init($('#ex-net')); addEventListener('resize', () => c.resize());
    const COL = { state: '#F59E0B', country: '#60A5FA', series: '#F87171' };
    c.setOption({ tooltip: { formatter: p => p.dataType === 'node' ? `<b>${p.data.name}</b><br>${p.data.value} articles` : `${p.data.source} — ${p.data.target}: ${p.data.value} articles together` },
      legend: { data: ['state', 'country', 'series'].map(n => ({ name: n })), formatter: n => ({ state: 'States', country: 'Countries', series: 'Commodities and indicators' }[n]), textStyle: { color: '#D1D5DB' }, top: 10 },
      series: [{ type: 'graph', layout: 'force', roam: true, draggable: true, categories: ['state', 'country', 'series'].map(n => ({ name: n, itemStyle: { color: COL[n] } })),
        force: { repulsion: 140, edgeLength: [40, 180], gravity: 0.08 }, label: { show: true, color: '#E5E7EB', fontFamily: FONT, fontSize: 11, position: 'right' }, labelLayout: { hideOverlap: true },
        lineStyle: { color: 'source', opacity: 0.25, curveness: 0.1 }, emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.9 } },
        data: N.nodes.map(n => ({ ...n, category: ['state', 'country', 'series'].indexOf(n.t), symbolSize: 6 + Math.sqrt(n.value) * 5 })),
        links: N.links.map(l => ({ ...l, lineStyle: { width: Math.min(6, 0.5 + l.value * 0.6) } })) }] });
    c.on('click', p => { if (p.dataType === 'node' && p.data.url) location.href = p.data.url; });
  });
})();
