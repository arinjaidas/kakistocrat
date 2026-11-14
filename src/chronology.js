// Filters the build-time chronology without a network request.
(() => {
  const root = document.getElementById('ch-results');
  if (!root) return;
  const q = document.getElementById('ch-query');
  const series = document.getElementById('ch-series');
  const covered = document.getElementById('ch-covered');
  const priority = document.getElementById('ch-priority');
  const count = document.getElementById('ch-status');
  const empty = document.getElementById('ch-empty');
  const reset = document.getElementById('ch-reset');
  const cards = [...root.querySelectorAll('.ch-entry')];
  const params = new URLSearchParams(location.search);
  q.value = params.get('q') || '';
  if ([...series.options].some(o => o.value === params.get('series'))) series.value = params.get('series');
  if (['yes','no'].includes(params.get('covered'))) covered.value = params.get('covered');
  if (['core','context'].includes(params.get('priority'))) priority.value = params.get('priority');
  const run = () => {
    const term = q.value.trim().toLocaleLowerCase();
    const all = !term || term.split(/\s+/).every(word => true);
    let shown = 0;
    for (const card of cards) {
      const words = term.split(/\s+/).filter(Boolean);
      const matchText = all && words.every(word => card.dataset.search.includes(word));
      const matchSeries = series.value === 'all' || card.dataset.series.split(/\s+/).includes(series.value);
      const matchCovered = covered.value === 'all' || card.dataset.covered === covered.value;
      const matchPriority = priority.value === 'all' || card.dataset.priority === priority.value;
      const yes = matchText && matchSeries && matchCovered && matchPriority;
      card.hidden = !yes;
      if (yes) shown++;
    }
    count.textContent = 'Showing ' + shown + ' of ' + cards.length + ' events';
    empty.hidden = shown > 0;
    const next = new URLSearchParams();
    if (q.value.trim()) next.set('q', q.value.trim());
    if (series.value !== 'all') next.set('series', series.value);
    if (covered.value !== 'all') next.set('covered', covered.value);
    if (priority.value !== 'all') next.set('priority', priority.value);
    const suffix = next.toString();
    history.replaceState(null, '', location.pathname + (suffix ? '?' + suffix : '') + location.hash);
  };
  for (const control of [q, series, covered, priority]) control.addEventListener(control === q ? 'input' : 'change', run);
  reset.addEventListener('click', () => { q.value = ''; series.value = 'all'; covered.value = 'all'; priority.value = 'all'; run(); q.focus(); });
  run();
})();
