(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const wait = fn => window.echarts ? fn() : setTimeout(() => wait(fn), 60);
  const ist = new Date(Date.now() + 330 * 60000), day = ist.toISOString().slice(0, 10);
  const num = Math.floor((Date.parse(day) - Date.parse('2026-11-12')) / 864e5) + 1;
  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  wait(async () => {
    const cat = await fetch('/api/catalog.json').then(r => r.json());
    const pool = cat.filter(c => c.n >= 30 && !/: (Germany|Japan|United Kingdom|Bangladesh|Philippines)$/.test(c.name) && !/^fx-usd(eur|gbp|jpy|sgd)$/.test(c.id) && !/^pw-/.test(c.id)).sort((a, b) => a.id.localeCompare(b.id));
    const ans = pool[hash('kakistocrat-' + day) % pool.length];
    const s = await fetch(`/api/series/${ans.id}.json`).then(r => r.json());
    const KEY = 'chartle-' + day; let st = store.get(KEY) || { tries: [], done: false, won: false };
    $('#ct-list').innerHTML = cat.map(c => `<option value="${c.name.replace(/"/g, '&quot;')}">`).join('');
    const chart = echarts.init($('#ct-chart')); addEventListener('resize', () => chart.resize());
    const pts = s.d.map((d, i) => [d, s.v[i]]).slice(-Math.min(s.d.length, ans.freq === 'daily' ? 750 : ans.freq === 'monthly' ? 72 : 40));
    const clues = () => { const k = st.done ? 6 : st.tries.length; return [
      ['Frequency and period', `${ans.freq}, ${pts[0][0].slice(0, 7)} to ${pts.at(-1)[0].slice(0, 7)}`],
      ['Category', ans.group.replace(/:.*$/, '')],
      ['Unit', ans.unit], ['Values', 'Axis numbers now shown'], ['Source', ans.source], ['First letter', ans.name[0]]].slice(0, k); };
    const draw = () => {
      const show = st.done || st.tries.length >= 4;
      chart.setOption({ animationDuration: 600, grid: { left: show ? 56 : 16, right: 16, top: 16, bottom: 30 }, xAxis: { type: 'time', axisLabel: { show: st.done || st.tries.length >= 1, fontFamily: '"IBM Plex Mono"', color: '#6B7078' } }, yAxis: { type: 'value', scale: true, axisLabel: { show, fontFamily: '"IBM Plex Mono"', color: '#6B7078' }, splitLine: { lineStyle: { color: '#EEECE7' } } },
        tooltip: { show }, series: [{ type: 'line', showSymbol: false, data: pts, lineStyle: { width: 2.4, color: st.done ? (st.won ? '#0F6B3A' : '#B42318') : '#15171A' }, areaStyle: { color: 'rgba(21,23,26,.06)' } }] });
      $('#ct-clues').innerHTML = clues().map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('') || '<div><span>Clues</span><b>Each wrong guess reveals one.</b></div>';
      $('#ct-tries').innerHTML = st.tries.map(t => `<li class="${t === ans.name ? 'ok' : 'no'}">${t}</li>`).join('');
      $('#ct-in').disabled = $('#ct-go').disabled = st.done;
      if (st.done) {
        const grid = st.tries.map(t => t === ans.name ? '🟩' : '🟥').join('');
        const text = `Chartle #${num} ${st.won ? st.tries.length : 'X'}/6\n${grid}\nkakistocrat.pages.dev/chartle/`;
        $('#ct-end').hidden = false;
        $('#ct-end').innerHTML = `<h2>${st.won ? 'Got it.' : 'Not today.'}</h2><p>The answer was <b>${ans.name}</b> (${ans.unit}, ${ans.source}).</p><pre class="code">${text}</pre><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="ct-share" type="button">Copy result</button><a class="btn ghost" href="/charts/#s=${ans.id}:lvl&r=Max">Explore this series</a></div>`;
        $('#ct-share').onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => $('#ct-share').textContent = 'Copied').catch(() => prompt('Copy your result', text));
      }
    };
    const guess = () => { const g = $('#ct-in').value.trim(); if (!g || st.done) return; if (!cat.some(c => c.name === g)) { $('#ct-in').setCustomValidity('Pick a series from the list'); $('#ct-in').reportValidity(); return; }
      $('#ct-in').setCustomValidity(''); st.tries.push(g); if (g === ans.name) { st.done = true; st.won = true; } else if (st.tries.length >= 6) st.done = true; store.set(KEY, st); $('#ct-in').value = ''; draw(); };
    $('#ct-go').addEventListener('click', guess); $('#ct-in').addEventListener('keydown', e => { if (e.key === 'Enter') guess(); });
    draw();
  });
})();
