// Validate the source chronology and unlinked-coverage commissions before building.
// Run: node scripts/check_chronology.mjs
import { readFileSync } from 'node:fs';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const review = load('data/year-review.json');
const editorial = load('data/editorial-commissions.json');
const fail = [];
const events = new Map();
const seriesIds = new Set();
const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z'));
for (const e of review.events) {
  if (!e.id || events.has(e.id)) fail.push('Duplicate or missing event id: ' + e.id);
  if (e.date && !validDate(e.date)) fail.push('Invalid event date: ' + e.id);
  if (!e.date && !e.when) fail.push('Missing date description: ' + e.id);
  if (!e.detail || e.detail.length < 20) fail.push('Empty event context: ' + e.id);
  if (!e.source || !/^https:\/\//.test(e.source)) fail.push('Missing HTTPS documentary source: ' + e.id);
  if (!Array.isArray(e.articles)) fail.push('Missing article array: ' + e.id);
  events.set(e.id, e);
}
for (const s of review.series) {
  if (!s.id || seriesIds.has(s.id)) fail.push('Duplicate or missing series: ' + s.id);
  seriesIds.add(s.id);
  if (!s.events.length) fail.push('Empty storyline: ' + s.id);
  for (const id of s.events) if (!events.has(id)) fail.push('Unknown milestone ' + id + ' in ' + s.id);
}
const commissioned = new Set();
for (const c of editorial.commissions) {
  if (!events.has(c.event)) fail.push('Commission references unknown event: ' + c.event);
  else if ((events.get(c.event).articles || []).length) {
    if (!c.status?.startsWith('published') || !events.get(c.event).articles.some(a => a.id === c.article_id && a.url === c.article_url))
      fail.push('Completed commission must match its published milestone: ' + c.event);
  } else if (c.status?.startsWith('published')) fail.push('Published commission has no linked article: ' + c.event);
  if (!['P0','P1','P2'].includes(c.priority)) fail.push('Unknown priority for commission: ' + c.id);
  if (!c.question || !c.methods || !c.primary?.length || !c.artifact) fail.push('Incomplete commission: ' + c.id);
  if (commissioned.has(c.event)) fail.push('Duplicate commission: ' + c.event);
  commissioned.add(c.event);
}
const actual = [...events.values()].filter(e => !(e.articles || []).length).map(e => e.id);
for (const id of actual) if (!commissioned.has(id)) fail.push('Uncommissioned linked-analysis gap: ' + id);
if (fail.length) {
  console.error('Chronology validation failed:\n' + fail.map(x=>' - '+x).join('\n'));
  process.exit(1);
}
console.log('Chronology OK: ' + review.series.length + ' series, ' + events.size +
  ' milestones, ' + actual.length + ' coverage gaps, ' + editorial.commissions.length + ' commissions.');
