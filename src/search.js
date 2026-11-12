/* Site-wide search: press / or Ctrl/⌘-K anywhere. Index: /api/search.json [[type, name, url, extra]] */
(function () {
  let IDX = null, open = false, hits = [], sel = 0;
  const TYPE = { s: 'Series', st: 'State', c: 'Country', t: 'Tool', a: 'Article', p: 'Page', m: 'Map', co: 'Company' };
  const box = document.createElement('div'); box.className = 'qs'; box.hidden = true;
  box.innerHTML = '<div class="qs-in" role="dialog" aria-label="Search"><input type="search" placeholder="Search series, states, countries, tools, articles…" aria-label="Search" autocomplete="off" spellcheck="false"><ul role="listbox"></ul><p class="qs-foot"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</p></div>';
  document.body.appendChild(box);
  const q = box.querySelector('input'), ul = box.querySelector('ul');
  const norm = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const load = () => IDX ? Promise.resolve(IDX) : fetch('/api/search.json').then(r => r.json()).then(d => (IDX = d.map(x => [...x, norm(x[1] + ' ' + (x[3] || ''))])));
  const score = (e, ws) => { const h = e[4], n = norm(e[1]); if (!ws.every(w => h.includes(w))) return -1; let s = 0; if (n.startsWith(ws[0])) s += 6; if (n.split(/[^a-z0-9]+/).includes(ws[0])) s += 3; s += { t: 4, st: 3, c: 2, s: 2, m: 2, p: 2, co: 1, a: 0 }[e[0]] || 0; return s - n.length / 80; };
  const render = () => { ul.innerHTML = hits.map((e, i) => `<li role="option"${i === sel ? ' aria-selected="true"' : ''} data-u="${e[2]}"><span class="qs-t qs-${e[0]}">${TYPE[e[0]]}</span><b>${e[1].replace(/</g, '&lt;')}</b>${e[3] ? `<small>${String(e[3]).replace(/</g, '&lt;')}</small>` : ''}</li>`).join('') || (q.value ? '<li class="qs-none">Nothing found</li>' : ''); };
  const run = () => { const ws = norm(q.value).split(/\s+/).filter(Boolean); if (!ws.length) { hits = []; render(); return; } hits = IDX.map(e => [e, score(e, ws)]).filter(x => x[1] >= 0).sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x[0]); sel = 0; render(); };
  const show = async () => { open = true; box.hidden = false; q.value = ''; hits = []; render(); q.focus(); await load(); };
  const hide = () => { open = false; box.hidden = true; };
  q.addEventListener('input', () => IDX ? run() : load().then(run));
  q.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, hits.length - 1); render(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); } else if (e.key === 'Enter' && hits[sel]) location.href = hits[sel][2]; else if (e.key === 'Escape') hide(); });
  ul.addEventListener('click', e => { const li = e.target.closest('li[data-u]'); if (li) location.href = li.dataset.u; });
  box.addEventListener('click', e => { if (e.target === box) hide(); });
  addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !document.getElementById('t-q'))) { e.preventDefault(); open ? hide() : show(); }
  });
  document.querySelectorAll('[data-qs]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); show(); }));
})();
