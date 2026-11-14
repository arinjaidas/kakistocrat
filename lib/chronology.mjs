// Searchable chronology built from the existing, source-linked year-review register.
// This page does not substitute a current article for a dated primary document.
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const safeUrl = value => /^https:\/\/[^"<>]+$/i.test(String(value || '')) ? String(value) : '';
const when = e => e.when || e.date || 'Date under review';
const titleFrom = e => {
  const s = String(e.detail || '').trim();
  const stop = s.indexOf('. ');
  return (stop >= 0 ? s.slice(0, stop) : s).slice(0, 160);
};
const dateKey = e => e.date || (String(e.when || '').match(/\d{4}-\d{2}(?:-\d{2})?/) || [''])[0] || '';
const displayDate = value => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(value + 'T00:00:00Z'));
};
const same = (a,b) => String(a).toLowerCase() === String(b).toLowerCase();

export function chronologyPage({ review, articles, pageHead }) {
  const articlesById = new Map(articles.map(a => [a.id, a]));
  const series = review.series || [];
  const events = (review.events || []).slice().sort((a,b) => dateKey(a).localeCompare(dateKey(b)));
  const withoutArticle = events.filter(e => !(e.articles || []).length).length;
  const choices = series.map(s => '<option value="' + esc(s.id) + '">' + esc(s.title) + '</option>').join('');
  const cards = events.map(event => {
    const linkedSeries = series.filter(s => s.events.includes(event.id));
    const eventArticleLinks = (event.articles || []).map(a => {
      const item = articlesById.get(a.id);
      const url = item?.url || a.url;
      if (!url) return '';
      const label = item?.title || a.title || 'Read the analysis';
      return '<a class="ch-article" href="' + esc(url) + '">' + esc(label) + '</a>';
    }).join('');
    const eventSeriesLinks = linkedSeries.map(s =>
      '<a href="/desk/india-year-in-review/' + encodeURIComponent(s.id) + '/">' + esc(s.title) + '</a>'
    ).join(' · ');
    const linked = (event.articles || []).length > 0;
    const priority = Number(event.priority) === 1 ? 'core' : 'context';
    const search = [event.id, when(event), event.detail || '', ...linkedSeries.map(s => s.title)].join(' ').toLowerCase();
    return '<article class="ch-entry" id="milestone-' + esc(event.id) +
      '" data-search="' + esc(search) + '" data-series="' +
      esc(linkedSeries.map(s=>s.id).join(' ')) + '" data-covered="' +
      (linked ? 'yes' : 'no') + '" data-priority="' + priority + '">' +
      '<div class="ch-marker" aria-hidden="true"></div>' +
      '<div class="ch-content"><p class="ch-date"><time' + (event.date ? ' datetime="' + esc(event.date) + '"' : '') +
      '>' + esc(displayDate(event.date) || when(event)) + '</time><span>' +
      (priority === 'core' ? 'Core milestone' : 'Context milestone') + '</span></p>' +
      '<h2>' + esc(titleFrom(event)) + '</h2>' +
      '<p>' + esc(event.detail || '') + '</p>' +
      '<p class="ch-series">' + (eventSeriesLinks || 'Cross-cutting') + '</p>' +
      '<div class="ch-evidence">' +
      (safeUrl(event.source) ? '<a href="' + esc(safeUrl(event.source)) + '" target="_blank" rel="noopener noreferrer">Original source</a>' : '<span>Primary source URL needs review</span>') +
      '<span class="ch-sep">|</span>' + (linked ? eventArticleLinks : '<span>Editorial coverage gap</span>') +
      '</div></div></article>';
  }).join('');
  const css = '<link rel="stylesheet" href="/chronology.css">';
  const js = '<script src="/chronology.js" defer></script>';
  return css + pageHead(
    'Research index',
    'India, decision by decision',
    'Follow dated economic and policy developments across the eight research timelines. Each entry links to its source and any related Kakistocrat analysis.'
  ) +
    '<div class="wrap ch-wrap"><p class="ch-summary"><strong>' + events.length +
    ' milestones</strong> · <strong>' + series.length +
    ' storylines</strong> · <strong>' + withoutArticle +
    ' coverage gaps</strong> · Register checked through ' + esc(review.asOf) + '</p>' +
    '<div class="ch-intro"><h2>What this chronology is</h2>' +
    '<p>Milestone dates describe events, not the publication date of an article. A link to published analysis means that a related article exists; it is not a certification that the underlying claim has been independently reverified today. Sources, dates and policy status can change after an entry was recorded.</p>' +
    '<p>Start with a policy decision, follow its associated reading path, and then check what later evidence would establish whether the intended outcome occurred.</p></div>' +
    '<div class="ch-tools" role="search" aria-label="Filter the economic chronology">' +
    '<label>Search events and sources<input id="ch-query" type="search" placeholder="e.g. tariffs, inflation, rural work"></label>' +
    '<label>Storyline<select id="ch-series"><option value="all">All storylines</option>' + choices + '</select></label>' +
    '<label>Coverage<select id="ch-covered"><option value="all">All events</option><option value="no">Without linked analysis</option><option value="yes">With linked analysis</option></select></label>' +
    '<label>Importance<select id="ch-priority"><option value="all">All milestones</option><option value="core">Core milestones</option><option value="context">Context milestones</option></select></label>' +
    '<button class="ch-reset" id="ch-reset" type="button">Clear filters</button></div>' +
    '<p class="ch-status" role="status" aria-live="polite" id="ch-status">Showing all ' + events.length + ' events</p>' +
    '<div class="ch-entries" id="ch-results">' + cards + '</div>' +
    '<p class="ch-empty" id="ch-empty" hidden>No milestone matches those filters. Try another storyline or clear your search.</p>' +
    '<section class="ch-method"><h2>How to use and reproduce this index</h2>' +
    '<p>The source-of-record is the date-specific event register that powers the eight year-in-review timelines. Download its JSON, inspect the documentary links, and keep policy announcement dates distinct from implementation and measurement dates. No statistical attribution is implied by placing two events near each other in time.</p>' +
    '<div class="ch-links"><a href="/api/india-year-in-review.json">Download chronology JSON</a><a href="/desk/india-year-in-review/">Eight series and reading paths</a><a href="/ledger/">Policy Ledger</a><a href="/research/repo-transmission/">Research Notebook</a></div></section></div>' + js;
}
