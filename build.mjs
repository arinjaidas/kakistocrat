// The Kakistocrat — static site builder.
// Pulls articles from the WordPress.com public API (thekakisto.wordpress.com),
// merges them with the data files in /data, and writes a static site to /dist.
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { budgetPage } from './lib/budget.mjs';
import { statesPage } from './lib/states.mjs';

const SITE = 'thekakisto.wordpress.com';
const API = `https://public-api.wordpress.com/wp/v2/sites/${SITE}`;
const BASE_URL = process.env.SITE_URL || 'https://kakistocrat.pages.dev';
const OUT = 'dist';
const BUILT = new Date();

const TOPICS = {
  'money-finance':        { name: 'Money & finance',          short: 'Money',           color: '#1D4ED8', blurb: 'Monetary policy, inflation, the rupee, banks and markets.' },
  'trade-external-sector':{ name: 'Trade & external sector',  short: 'Trade',           color: '#0F766E', blurb: 'Trade deals, tariffs, the current account and capital flows.' },
  'public-finance':       { name: 'Public finance',           short: 'Public finance',  color: '#7C3AED', blurb: 'Budgets, deficits, taxes and spending.' },
  'growth-jobs-industry': { name: 'Growth, jobs & industry',  short: 'Growth & jobs',   color: '#B45309', blurb: 'GDP, employment, investment and industrial policy.' },
  'rural-economy-welfare':{ name: 'Rural economy & welfare',  short: 'Rural & welfare', color: '#3F6212', blurb: 'Farm support, rural jobs, food security and local government.' },
  'energy-climate':       { name: 'Energy & climate',         short: 'Energy',          color: '#B42318', blurb: 'Oil, power, fuel subsidies and the energy transition.' },
  'world-geopolitics':    { name: 'World & geopolitics',      short: 'World',           color: '#334155', blurb: 'Economies, conflicts and export controls beyond India.' },
};
const TOPIC_ORDER = Object.keys(TOPICS);
const TOOLS = [
  { url: '/data/', kicker: 'India macro tape', title: 'Latest, previous, revised', blurb: 'CPI, repo, rupee, bond yields, Brent and the Nifty, each with its source and next release.' },
  { url: '/tools/budget-x-ray/', kicker: 'Budget X-Ray', title: 'Halfway through the Budget', blurb: 'Receipts, spending and the deficit against the full-year plan, with a year-end calculator.' },
  { url: '/tools/india-by-state/', kicker: 'India by State', title: 'Thirty-one states compared', blurb: 'Income, growth, inflation and state debt on a tile map, with any two measures plotted against each other.' },
  { url: '/tools/shock-lab/', kicker: 'Shock Lab', title: 'Oil and the rupee', blurb: 'Change crude and the exchange rate. See who pays: importer, pump or household.' },
  { url: '/ledger/', kicker: 'Policy Ledger', title: 'Announced to measured', blurb: 'Every scheme we cover, tracked from promise to outcome, with the date we check again.' },
  { url: '/forecasts/', kicker: 'Forecast Book', title: 'Calls on the record', blurb: 'Testable calls with probabilities, revisions and results, dated when made.' },
];

// ---------------------------------------------------------------- helpers
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const strip = h => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
const decode = s => String(s ?? '').replace(/&#8217;/g, '’').replace(/&#8216;/g, '‘').replace(/&#8220;/g, '“').replace(/&#8221;/g, '”').replace(/&#8211;/g, '–').replace(/&#8212;/g, '—').replace(/&#038;|&amp;/g, '&').replace(/&#8230;/g, '…').replace(/&nbsp;|&#160;/g, ' ').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const longDate = iso => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const shortDate = iso => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0,3)} ${d.getUTCFullYear()}`; };
const isoOrMonth = s => { if (!s) return '—'; const p = s.split('-'); return p.length === 2 ? `${MONTHS[+p[1]-1]} ${p[0]}` : longDate(s + 'T00:00:00Z'); };
const words = h => strip(h).split(' ').filter(Boolean).length;
const mins = h => Math.max(1, Math.round(words(h) / 230));
async function write(path, html) { const f = join(OUT, path); await mkdir(dirname(f), { recursive: true }); await writeFile(f, html); }

async function getAll(path) {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const url = `${API}/${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'kakistocrat-site-builder' } });
    if (r.status === 400) break; // past last page
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    const d = await r.json(); out.push(...d);
    if (d.length < 100) break;
  }
  return out;
}

async function loadWordPress() {
  const cacheFile = 'data/wp-cache.json';
  try {
    const [posts, cats, tags] = await Promise.all([
      getAll('posts?_fields=id,date,modified,slug,link,title,excerpt,content,categories,tags,author'),
      getAll('categories?_fields=id,name,slug,description,count'),
      getAll('tags?_fields=id,name,slug,description,count&hide_empty=true'),
    ]);
    const data = { posts, cats, tags };
    const next = JSON.stringify(data);
    const prev = existsSync(cacheFile) ? await readFile(cacheFile, 'utf8') : '';
    if (prev !== next) { await writeFile(cacheFile, next); console.log('Cache updated'); }
    console.log(`WordPress: ${posts.length} posts, ${cats.length} categories, ${tags.length} tags (live)`);
    return data;
  } catch (e) {
    if (!existsSync(cacheFile)) throw e;
    console.warn('WordPress fetch failed, using cache:', e.message);
    return JSON.parse(await readFile(cacheFile, 'utf8'));
  }
}

// ---------------------------------------------------------------- model
function model(wp) {
  const catById = Object.fromEntries(wp.cats.map(c => [c.id, c]));
  const tagById = Object.fromEntries(wp.tags.map(t => [t.id, t]));
  const seriesMap = {};
  const articles = wp.posts.map(p => {
    const cat = p.categories.map(id => catById[id]).find(c => c && TOPICS[c.slug]);
    const tagObjs = p.tags.map(id => tagById[id]).filter(Boolean);
    const fmtTag = tagObjs.find(t => ['analysis', 'explainer', 'brief'].includes(t.slug));
    const seriesTags = tagObjs.filter(t => decode(t.name).startsWith('Series:'));
    let html = p.content.rendered;
    const cut = html.indexOf('kak-series-box');
    if (cut > -1) html = html.slice(0, html.lastIndexOf('<div', cut));
    html = html.replace(/\sstyle="[^"]*"/g, '').replace(/<p>\s*<\/p>/g, '');
    const a = {
      id: p.id, slug: p.slug, date: p.date, modified: p.modified, wpLink: p.link,
      url: `/a/${p.slug}/`,
      title: decode(strip(p.title.rendered)),
      excerpt: decode(strip(p.excerpt.rendered)).replace(/\s*Continue reading.*$/i, ''),
      html, topic: cat ? cat.slug : 'world-geopolitics',
      format: fmtTag ? (fmtTag.slug === 'analysis' ? 'Analysis' : fmtTag.slug === 'explainer' ? 'Explainer' : 'Brief') : 'Analysis',
      series: seriesTags.map(t => ({ slug: t.slug.replace(/^series-/, ''), name: decode(t.name).replace(/^Series:\s*/, ''), description: decode(strip(t.description)) })),
      minutes: mins(p.content.rendered),
    };
    for (const s of a.series) (seriesMap[s.slug] ||= { ...s, items: [] }).items.push(a);
    return a;
  }).sort((x, y) => y.date.localeCompare(x.date));
  for (const s of Object.values(seriesMap)) s.items.sort((x, y) => x.date.localeCompare(y.date));
  const series = Object.values(seriesMap).sort((x, y) => y.items.at(-1).date.localeCompare(x.items.at(-1).date));
  const topicDesc = Object.fromEntries(wp.cats.filter(c => TOPICS[c.slug]).map(c => [c.slug, decode(strip(c.description))]));
  return { articles, series, topicDesc };
}

function findRelated(articles, keys, n = 3) {
  const out = [];
  for (const k of keys || []) {
    const toks = k.toLowerCase().split('-').filter(t => t.length > 2);
    const hit = articles.find(a => !out.includes(a) && toks.every(t => (a.slug + ' ' + a.title.toLowerCase()).includes(t)))
      || articles.find(a => !out.includes(a) && a.slug === k);
    if (hit) out.push(hit);
    if (out.length >= n) break;
  }
  return out;
}

// ---------------------------------------------------------------- layout
const tapeVal = (ind, v) => `${ind.prefix || ''}${Number(v).toLocaleString('en-IN', { minimumFractionDigits: ind.decimals, maximumFractionDigits: ind.decimals })}${ind.unit === '%' ? '%' : ''}`;
function tapeHTML(tape) {
  const ticks = tape.indicators.map(i => {
    const d = i.latest.value - i.previous.value;
    const cls = Math.abs(d) < 1e-9 ? 'flat' : d > 0 ? 'up' : 'dn';
    const dTxt = i.unit === '%' ? `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d * 100).toFixed(0)}bp` : `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d / i.previous.value * 100).toFixed(1)}%`;
    return `<button class="tick" data-id="${i.id}" aria-expanded="false" aria-label="${esc(i.label)}: ${esc(tapeVal(i, i.latest.value))}, ${esc(i.latest.period)}"><span class="k">${esc(i.short)}</span><span class="v">${esc(tapeVal(i, i.latest.value))}</span><span class="d ${cls}">${dTxt}</span><span class="p">${esc(i.latest.period.replace(/^(Close|Around|Since), /, ''))}</span></button>`;
  }).join('');
  return `<div class="tape" role="region" aria-label="India macro tape"><div class="wrap"><span class="tape-label">India tape</span>${ticks}<a class="tape-more" href="/data/">All data →</a></div></div>`;
}

function layout({ title, description = '', path = '/', body, canonical, tape, active = '', type = 'website' }) {
  const full = title ? `${title} · The Kakistocrat` : 'The Kakistocrat · A deeper look at economics and politics';
  const nav = TOPIC_ORDER.map(s => `<a href="/topic/${s}/"${active === s ? ' aria-current="page"' : ''}>${esc(TOPICS[s].short)}</a>`).join('');
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical || BASE_URL + path)}">
<meta property="og:title" content="${esc(title || 'The Kakistocrat')}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${esc(BASE_URL + path)}"><meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css?v=${BUILT.getTime()}"><link rel="alternate" type="application/rss+xml" title="The Kakistocrat" href="https://${SITE}/feed/">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2315171A'/%3E%3Ctext x='16' y='23' font-family='Georgia' font-size='20' fill='%23fff' text-anchor='middle'%3EK%3C/text%3E%3C/svg%3E">
</head><body>
<a class="sr" href="#main">Skip to content</a>
<header class="topbar"><div class="wrap">
<a class="brand" href="/">The Kakistocrat<small>Economics · Politics · Policy</small></a>
<button class="menu-btn" aria-expanded="false" aria-controls="nav">Sections</button>
<nav class="nav" id="nav" aria-label="Topics">${nav}</nav>
<nav class="toolsnav" aria-label="Tools"><a href="/data/">Data</a><a href="/tools/">Tools</a><a href="/ledger/">Ledger</a><a href="/forecasts/">Forecasts</a><a href="/archive/">Search</a><a class="cta" href="https://${SITE}/#subscribe">Subscribe</a></nav>
</div></header>
${tapeHTML(tape)}
<main id="main">${body}</main>
<footer class="foot"><div class="wrap foot-grid">
<div><div class="brandline">The Kakistocrat</div><p>Independent analysis of India’s economy and the politics around it, by Arinjai Das. Articles are published on <a href="https://${SITE}/" style="text-decoration:underline">thekakisto.wordpress.com</a> and appear here automatically.</p><p class="meta" style="margin-top:12px">Site built ${esc(longDate(BUILT.toISOString()))}</p></div>
<div><h4>Topics</h4><ul>${TOPIC_ORDER.map(s => `<li><a href="/topic/${s}/">${esc(TOPICS[s].name)}</a></li>`).join('')}</ul></div>
<div><h4>Read</h4><ul><li><a href="/series/">Series</a></li><li><a href="/explainers/">Explainers</a></li><li><a href="/archive/">Archive &amp; search</a></li><li><a href="https://${SITE}/about/">About</a></li><li><a href="https://${SITE}/contact/">Contact</a></li></ul></div>
<div><h4>Tools</h4><ul>${TOOLS.map(t => `<li><a href="${t.url}">${esc(t.kicker)}</a></li>`).join('')}<li><a href="https://${SITE}/feed/">RSS</a></li></ul></div>
</div></footer>
<script>window.__TAPE=${JSON.stringify(tape).replace(/</g, '\\u003c')};</script>
<script src="/app.js?v=${BUILT.getTime()}" defer></script>
</body></html>`;
}

// ---------------------------------------------------------------- components
const kicker = a => `<span class="kicker desk" style="--desk:${TOPICS[a.topic].color}">${esc(TOPICS[a.topic].short)}</span>`;
const fmtBadge = a => a.format === 'Analysis' ? '' : ` <span class="fmt ${a.format.toLowerCase()}">${a.format}</span>`;
const metaLine = a => `<div class="meta">${esc(shortDate(a.date))} · ${a.minutes} min</div>`;
const card = (a, size = 'h-3', dek = true) => `<a class="story" href="${a.url}">${kicker(a)}${fmtBadge(a)}<h3 class="${size}">${esc(a.title)}</h3>${dek ? `<p class="dek sm">${esc(a.excerpt)}</p>` : ''}${metaLine(a)}</a>`;
const stagesDone = item => Object.values(item.stage).filter(Boolean).length;
const pips = item => `<div class="pips" aria-label="${stagesDone(item)} of 5 stages reached">${['Announced','Notified','Funded','Implemented','Measured'].map(s => `<i class="${item.stage[s] ? 'on' : ''}"></i>`).join('')}</div>`;
const pageHead = (kick, title, p) => `<div class="wrap"><header class="page-head"><span class="kicker">${kick}</span><h1>${esc(title)}</h1>${p ? `<p>${p}</p>` : ''}</header></div>`;

// ---------------------------------------------------------------- pages
function home(m, tape, ledger) {
  const A = m.articles; const lead = A[0], sub = A.slice(1, 3), latest = A.slice(3, 11);
  const byTopic = Object.fromEntries(TOPIC_ORDER.map(t => [t, A.filter(a => a.topic === t)]));
  const used = new Set([lead, ...sub, ...latest].map(a => a.id));
  const deskBlock = t => { const items = byTopic[t].filter(a => !used.has(a.id)).slice(0, 5); if (!items.length) return ''; return `<section><div class="sec-head" style="--desk:${TOPICS[t].color}"><h2><span class="dot"></span>${esc(TOPICS[t].name)}</h2><a href="/topic/${t}/">More →</a></div><div class="desk-grid">${items.map((a, i) => i === 0 ? `<div class="first">${card(a, 'h-2', true)}</div>` : `<div>${card(a, 'h-4', i < 3)}</div>`).join('')}</div></section>`; };
  const explainers = A.filter(a => a.format === 'Explainer').slice(0, 4);
  return `<div class="wrap">
<div class="front">
 <div class="col">
  <a class="story" href="${lead.url}">${kicker(lead)}${fmtBadge(lead)}<h2 class="h-lead">${esc(lead.title)}</h2><p class="dek">${esc(lead.excerpt)}</p><div class="meta" style="margin-top:10px">Arinjai Das · ${esc(longDate(lead.date))} · ${lead.minutes} min read</div></a>
  <div class="lead-sub">${sub.map(a => card(a, 'h-2', true)).join('')}</div>
 </div>
 <div class="col"><h2 class="col-title">Latest</h2><div class="latest-list">${latest.map(a => `<a class="story" href="${a.url}">${kicker(a)}${fmtBadge(a)}<h3 class="h-4">${esc(a.title)}</h3><div class="meta">${esc(shortDate(a.date))}</div></a>`).join('')}</div><p style="margin-top:12px"><a href="/archive/" class="meta" style="color:var(--accent)">Full archive →</a></p></div>
 <div class="col rail-col">
  <div class="module dark"><span class="kicker" style="color:#F0A39B">Shock Lab</span><h3>What does a $10 oil spike cost?</h3><p>Move oil and the rupee, see the bill for an importer, the pump and a household.</p><a class="btn" style="background:#fff;color:var(--ink)" href="/tools/shock-lab/">Open the calculator</a></div>
  <div class="module"><span class="kicker">Policy Ledger</span><h3>From promise to proof</h3><ul class="mini-ledger">${ledger.items.slice(0, 4).map(i => `<li><a href="/ledger/#${i.id}"><b style="font:500 14.5px/1.3 var(--serif)">${esc(i.title)}</b></a>${pips(i)}<div class="meta" style="margin-top:4px">${stagesDone(i)}/5 · next check ${esc(isoOrMonth(i.nextCheck))}</div></li>`).join('')}</ul><p style="margin:8px 0 0"><a href="/ledger/" class="meta" style="color:var(--accent)">All tracked policies →</a></p></div>
  <div class="module"><span class="kicker">Data</span><h3>India at a glance</h3>${tape.indicators.slice(0, 4).map(i => `<a href="/data/${i.id}/" style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--rule);font:500 13px var(--mono)"><span>${esc(i.label)}</span><b>${esc(tapeVal(i, i.latest.value))}</b></a>`).join('')}<p style="margin:8px 0 0"><a href="/data/" class="meta" style="color:var(--accent)">Data hub →</a></p></div>
 </div>
</div>
${TOPIC_ORDER.slice(0, 2).map(deskBlock).join('')}
<div class="sec-head"><h2>Series</h2><a href="/series/">All series →</a></div>
<div class="series-strip">${m.series.slice(0, 4).map(s => `<a class="series-card" href="/series/${s.slug}/"><span class="n">${s.items.length} parts · latest ${esc(shortDate(s.items.at(-1).date))}</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p></a>`).join('')}</div>
${TOPIC_ORDER.slice(2).map(deskBlock).join('')}
${explainers.length ? `<div class="sec-head"><h2>Explainers</h2><a href="/explainers/">All explainers →</a></div><div class="desk-grid">${explainers.map(a => `<div>${card(a, 'h-3', true)}</div>`).join('')}</div>` : ''}
</div>
<section class="tools-band"><div class="wrap"><span class="kicker" style="color:#F0A39B">Tools</span><h2 style="margin:6px 0 18px;font:500 30px/1.1 var(--serif)">Test the numbers yourself</h2><div class="tools-grid">${TOOLS.slice(0, 4).map(t => `<a class="tool-card" href="${t.url}"><span class="kicker">${esc(t.kicker)}</span><h3>${esc(t.title)}</h3><p>${esc(t.blurb)}</p></a>`).join('')}</div><p style="margin:16px 0 0"><a href="/tools/" style="color:#fff;text-decoration:underline;font-weight:600">All tools →</a></p></div></section>`;
}

function articlePage(a, m) {
  const t = TOPICS[a.topic];
  const sameTopic = m.articles.filter(x => x.topic === a.topic && x.id !== a.id).slice(0, 5);
  const seriesBoxes = a.series.map(s => { const S = m.series.find(x => x.slug === s.slug); if (!S) return ''; return `<aside class="series-box"><span class="kicker">Part of a series</span><h2 style="margin:6px 0 4px;font:500 24px/1.2 var(--serif)"><a href="/series/${S.slug}/">${esc(S.name)}</a></h2><p class="dek sm">${esc(S.description)}</p><ol>${S.items.map(x => `<li class="${x.id === a.id ? 'here' : ''}"><a href="${x.url}">${esc(x.title)}</a></li>`).join('')}</ol></aside>`; }).join('');
  return `<div class="wrap"><article class="art">
<div>
 <header class="art-head"><a href="/topic/${a.topic}/" class="kicker desk" style="--desk:${t.color}">${esc(t.name)}</a>${fmtBadge(a)}
 <h1>${esc(a.title)}</h1><p class="dek">${esc(a.excerpt)}</p>
 <div class="byline"><span>By <b>Arinjai Das</b></span><span>${esc(longDate(a.date))}</span><span>${a.minutes} min read</span><a href="${esc(a.wpLink)}">Comment or subscribe on WordPress →</a></div></header>
 <div class="prose">${a.html}</div>
 ${seriesBoxes}
 <p class="origin-note">First published on <a href="${esc(a.wpLink)}" style="text-decoration:underline">thekakisto.wordpress.com</a>. Figures are as cited at the time of publication; check the linked sources for later revisions.</p>
</div>
<aside class="rail"><div class="sticky">
 <div class="module"><span class="kicker desk" style="--desk:${t.color}">More in ${esc(t.short)}</span><div class="rule-list" style="margin-top:8px">${sameTopic.map(x => `<a class="story" href="${x.url}"><h3 class="h-4">${esc(x.title)}</h3><div class="meta">${esc(shortDate(x.date))}</div></a>`).join('')}</div></div>
 <div class="module dark"><span class="kicker" style="color:#F0A39B">Shock Lab</span><h3>Run your own scenario</h3><p>Oil, the rupee and who pays.</p><a class="btn" style="background:#fff;color:var(--ink)" href="/tools/shock-lab/">Open</a></div>
</div></aside>
</article></div>`;
}

function listPage(items) { return items.map(a => `<a class="row-story story" href="${a.url}"><div class="when">${esc(shortDate(a.date))}<br><span style="color:${TOPICS[a.topic].color}">${esc(TOPICS[a.topic].short)}</span></div><div>${fmtBadge(a).trim()}${a.series[0] ? ` <span class="meta">${esc(a.series[0].name)}</span>` : ''}<h3 class="h-3">${esc(a.title)}</h3><p class="dek sm">${esc(a.excerpt)}</p></div></a>`).join(''); }

function topicPage(slug, m) {
  const t = TOPICS[slug], items = m.articles.filter(a => a.topic === slug);
  const series = m.series.filter(s => s.items.some(a => a.topic === slug));
  return pageHead(`<span style="color:${t.color}">Topic</span>`, t.name, esc(m.topicDesc[slug] || t.blurb)) +
  `<div class="wrap listing"><div><p class="meta">${items.length} pieces</p>${listPage(items)}</div>
  <aside class="rail">${series.length ? `<div class="module"><span class="kicker">Series in this topic</span><div class="rule-list" style="margin-top:8px">${series.map(s => `<a class="story" href="/series/${s.slug}/"><h3 class="h-4">${esc(s.name)}</h3><div class="meta">${s.items.length} parts</div></a>`).join('')}</div></div>` : ''}
  <div class="module"><span class="kicker">Other topics</span><div class="rule-list" style="margin-top:8px">${TOPIC_ORDER.filter(x => x !== slug).map(x => `<a class="story" href="/topic/${x}/"><span class="h-4" style="font:500 15px var(--serif)">${esc(TOPICS[x].name)}</span></a>`).join('')}</div></div></aside></div>`;
}

function seriesIndex(m) {
  return pageHead('Series', 'Series', 'Some questions need more than one article. Each series follows a single question across several pieces, in the order they were published.') +
  `<div class="wrap"><div class="series-strip" style="margin-top:24px">${m.series.map(s => `<a class="series-card" href="/series/${s.slug}/"><span class="n">${s.items.length} parts · ${esc(shortDate(s.items[0].date))} – ${esc(shortDate(s.items.at(-1).date))}</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p></a>`).join('')}</div></div>`;
}
function seriesPage(s) {
  return pageHead('Series', s.name, esc(s.description)) + `<div class="wrap" style="max-width:900px;margin-top:20px">${s.items.map((a, i) => `<a class="row-story story" href="${a.url}"><div class="when">Part ${i + 1}<br>${esc(shortDate(a.date))}</div><div>${kicker(a)}${fmtBadge(a)}<h3 class="h-3">${esc(a.title)}</h3><p class="dek sm">${esc(a.excerpt)}</p></div></a>`).join('')}</div>`;
}

function archivePage(m) {
  const years = [...new Set(m.articles.map(a => a.date.slice(0, 4)))];
  const chips = (k, vals) => vals.map(([v, l]) => `<button class="chip" data-filter="${k}" data-value="${esc(v)}" aria-pressed="false">${esc(l)}</button>`).join('');
  return pageHead('Archive', 'Archive and search', `All ${m.articles.length} pieces. Search by word, or filter by topic, format and year.`) +
  `<div class="wrap" id="archive"><div class="search-box"><label class="sr" for="q">Search the archive</label><input id="q" type="search" placeholder="Search: inflation, tariff, rupee, Greece…" autocomplete="off"></div>
  <div class="filters"><span class="lbl">Topic</span>${chips('topic', TOPIC_ORDER.map(t => [t, TOPICS[t].short]))}</div>
  <div class="filters"><span class="lbl">Format</span>${chips('format', [['Analysis','Analysis'],['Explainer','Explainer'],['Brief','Brief']])}<span class="lbl" style="margin-left:14px">Year</span>${chips('year', years.map(y => [y, y]))}</div>
  <p class="meta" id="count" aria-live="polite"></p><div id="results"></div></div>`;
}

function explainersPage(m) {
  const items = m.articles.filter(a => a.format === 'Explainer');
  return pageHead('Explainers', 'Explainers', 'Primers that build a subject from first principles, written to stay useful after the news moves on.') + `<div class="wrap" style="max-width:960px;margin-top:20px">${listPage(items)}</div>`;
}

function dataHub(tape, m) {
  return pageHead('Data', 'India macro data', `The figures on the tape, each with its source, the date it was checked, what changed and when the next release is due. ${esc(tape.note)}`) +
  `<div class="wrap"><div class="data-grid">${tape.indicators.map(i => { const d = i.latest.value - i.previous.value; return `<a class="ind-card" href="/data/${i.id}/"><span class="kicker">${esc(i.label)}</span><span class="v">${esc(tapeVal(i, i.latest.value))}</span><span class="chg" style="color:${d > 0 ? 'var(--up)' : d < 0 ? 'var(--down)' : 'var(--mute)'}">${d > 0 ? '▲' : d < 0 ? '▼' : '■'} from ${esc(tapeVal(i, i.previous.value))} · ${esc(i.previous.period)}</span><div class="spark" data-chart='${esc(JSON.stringify({ pts: i.history, spark: true, decimals: i.decimals, label: i.label }))}'></div><span class="meta">${esc(i.latest.period)} · next: ${esc(isoOrMonth(i.next.date))}</span></a>`; }).join('')}</div>
  <p class="meta" style="margin-top:18px">Tape last updated ${esc(longDate(tape.updated + 'T00:00:00Z'))}. Market levels are closing values, not live prices.</p></div>`;
}

function indicatorPage(i, m) {
  const rel = findRelated(m.articles, i.related);
  return pageHead('Data', i.label, esc(i.definition)) + `<div class="wrap listing"><div>
  <div style="display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px"><div><div class="meta">${esc(i.latest.status)} · ${esc(i.latest.period)}</div><div style="font:600 46px/1.05 var(--mono)">${esc(tapeVal(i, i.latest.value))}</div></div><span class="stamp">Checked ${esc(longDate(i.checked + 'T00:00:00Z'))}</span></div>
  <div class="chart" data-chart='${esc(JSON.stringify({ pts: i.history, decimals: i.decimals, label: i.label + ' history' }))}'></div>
  <p class="meta" style="margin-top:6px">Chart shows the verified points listed in the sources below, not a continuous series.</p>
  <h2 class="col-title" style="margin-top:26px">Previous, latest, revised</h2>
  <table class="facts"><tr><th>Latest</th><td>${esc(tapeVal(i, i.latest.value))} · ${esc(i.latest.period)} (${esc(i.latest.status)})</td></tr>
  <tr><th>Previous</th><td>${esc(tapeVal(i, i.previous.value))} · ${esc(i.previous.period)}</td></tr>
  ${(i.revisions || []).map(r => `<tr><th>Revised · ${esc(r.period)}</th><td>${esc(tapeVal(i, r.first))} first estimate (${esc(longDate(r.firstDate + 'T00:00:00Z'))}) → ${esc(tapeVal(i, r.revised))} (${esc(longDate(r.revisedDate + 'T00:00:00Z'))})</td></tr>`).join('') || `<tr><th>Revisions</th><td>None recorded for this series</td></tr>`}
  <tr><th>Next release</th><td>${esc(isoOrMonth(i.next.date))} · ${esc(i.next.what)}</td></tr></table>
  <h2 class="col-title" style="margin-top:26px">What changed</h2><p class="dek">${esc(i.context)}</p>
  <h2 class="col-title" style="margin-top:26px">Sources</h2><ul>${i.sources.map(s => `<li><a href="${esc(s.url)}" style="text-decoration:underline">${esc(s.name)}</a></li>`).join('')}</ul>
  </div><aside class="rail">${rel.length ? `<div class="module"><span class="kicker">Our analysis</span><div class="rule-list" style="margin-top:8px">${rel.map(a => `<a class="story" href="${a.url}"><h3 class="h-4">${esc(a.title)}</h3><div class="meta">${esc(shortDate(a.date))}</div></a>`).join('')}</div></div>` : ''}
  <div class="module"><span class="kicker">Other indicators</span><div class="rule-list" style="margin-top:8px">${window_tape_others(i)}</div></div></aside></div>`;
}
let __tapeRef = null; function window_tape_others(i) { return __tapeRef.indicators.filter(x => x.id !== i.id).map(x => `<a class="story" href="/data/${x.id}/" style="display:flex;justify-content:space-between"><span>${esc(x.label)}</span><b class="meta" style="color:var(--ink)">${esc(tapeVal(x, x.latest.value))}</b></a>`).join(''); }

function ledgerPage(ledger, m) {
  const arts = Object.fromEntries(m.articles.map(a => [a.slug, a]));
  return pageHead('Policy Ledger', 'The Policy Ledger', 'Every policy we write about, tracked from <b>announced → notified → funded → implemented → measured</b>. Each card shows the promise, the document that established it, the outcome we are tracking and the date we will check again.') +
  `<div class="wrap"><div class="ledger-grid">${ledger.items.map(i => { const a = arts[i.article]; return `<article class="lcard" id="${i.id}"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span class="kicker desk" style="--desk:${TOPICS[i.topic].color}">${esc(TOPICS[i.topic].short)}</span><span class="status ${esc(i.status)}">${esc(i.status)}</span></div>
  <h3>${esc(i.title)}</h3><p class="promise">${esc(i.promise)}</p>
  <div class="stages">${ledger.stages.map(s => `<div class="stage ${i.stage[s] ? 'done' : ''}" title="${esc(i.stageNotes?.[s] || '')}">${s}<span class="dt">${i.stage[s] ? esc(isoOrMonth(i.stage[s])) : 'Not yet'}</span></div>`).join('')}</div>
  <dl>${Object.entries(i.stageNotes || {}).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
  <dt>Tracking</dt><dd>${esc(i.tracking)}</dd>
  <dt>Next check</dt><dd>${esc(isoOrMonth(i.nextCheck))}: ${esc(i.nextCheckWhat)}</dd>
  <dt>Documents</dt><dd>${i.documents.map(d => `<a href="${esc(d.url)}">${esc(d.name)}</a>`).join('<br>')}</dd>
  ${a ? `<dt>Our analysis</dt><dd><a href="${a.url}">${esc(a.title)}</a></dd>` : ''}</dl></article>`; }).join('')}</div>
  <p class="meta" style="margin-top:18px">A stage is marked only when a document shows it happened. “Measured” requires published outcome data, not an announcement.</p></div>`;
}

function forecastsPage(fc) {
  const rows = fc.calls.map(c => `<tr><td>${esc(c.made)}</td><td>${esc(c.call)}</td><td>${esc(c.probability)}</td><td>${esc(c.changeMind)}</td><td>${esc(c.resolves)}</td><td>${esc(c.result || 'Open')}</td></tr>`).join('');
  return pageHead('Forecast Book', 'The Forecast Book', esc(fc.method)) + `<div class="wrap" style="max-width:1000px">
  ${rows ? `<div class="prose" style="max-width:none"><table><thead><tr><th>Made</th><th>Call</th><th>Probability</th><th>What would change it</th><th>Resolves</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>` :
  `<div class="module" style="margin-top:24px;max-width:720px"><h3>No calls recorded yet</h3><p>The first calls will be entered on the day they are made. Each will name a clearly defined event, a probability, the evidence that would change the view and the date it resolves. Revisions will sit beside the original call, so the record shows how the judgement moved.</p><p>Until then, every analysis on the site ends with a section on what would change its judgement.</p></div>`}
  <h2 class="col-title" style="margin-top:30px">How calls are scored</h2><div class="prose" style="margin-top:8px;font-size:16.5px"><p>Each resolved call gets a Brier score: the squared difference between the stated probability and the outcome (1 if it happened, 0 if not). A perfect call scores 0; a coin-flip scores 0.25 on average. The running average across all resolved calls is the headline measure of judgement.</p></div></div>`;
}

function shockLab(tape) {
  const brent = tape.indicators.find(i => i.id === 'brent'), inr = tape.indicators.find(i => i.id === 'inr');
  const b = brent.latest.value, r = inr.latest.value;
  const ctrl = (id, label, min, max, step, val, hint) => `<div class="ctrl"><label for="${id}">${label}<output for="${id}"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
  return pageHead('Shock Lab', 'Oil and the rupee: who pays?', 'Set a starting point and a shock for crude prices and the exchange rate. The calculator shows the change in an importer’s rupee bill, how much of it comes from oil and how much from the rupee, and what happens at the pump depending on how much of the cost is passed on.') +
  `<div class="wrap lab" id="shocklab"><div class="controls">
  <h2 class="col-title">Starting point</h2>
  ${ctrl('brent0', 'Brent, $/bbl', 40, 160, 0.5, b, `Default: about $${b}, ${brent.latest.period.replace(/^Around, /, '')}`)}
  ${ctrl('inr0', 'Rupees per dollar', 70, 110, 0.01, r, `Default: ${r}, ${inr.latest.period.replace(/^Close, /, 'close on ')}`)}
  <h2 class="col-title" style="margin-top:22px">The shock</h2>
  ${ctrl('brent1', 'New Brent, $/bbl', 40, 160, 0.5, Math.round(b + 10))}
  ${ctrl('inr1', 'New rupees per dollar', 70, 110, 0.01, (r + 1).toFixed(2))}
  <h2 class="col-title" style="margin-top:22px">Who absorbs it</h2>
  ${ctrl('pass', 'Pass-through to the pump', 0, 100, 5, 100, 'Share of the change in crude cost per litre that reaches the retail price. The rest is absorbed by oil company margins or tax changes.')}
  ${ctrl('pump0', 'Starting pump price, ₹/litre', 60, 140, 1, 95, 'An assumption. Set it to your city’s price.')}
  ${ctrl('litres', 'Household fuel use, litres/month', 0, 200, 5, 40)}
  ${ctrl('barrels', 'Cargo size, barrels', 100000, 2000000, 50000, 1000000, 'A large tanker cargo is around 1–2 million barrels.')}
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn" id="share" type="button">Copy link to this scenario</button><button class="btn ghost" id="reset" type="button">Reset</button></div>
  </div><div>
  <div class="results">
   <div class="res"><div class="lbl">Importer’s bill for the cargo</div><div class="num" id="r-cost"></div><div class="sub" id="r-cost-sub"></div></div>
   <div class="res"><div class="lbl">Crude cost per litre</div><div class="num" id="r-litre"></div><div class="sub" id="r-litre-sub"></div></div>
   <div class="res"><div class="lbl">Pump price</div><div class="num" id="r-pump"></div><div class="sub" id="r-pump-sub"></div></div>
   <div class="res"><div class="lbl">Household fuel bill</div><div class="num" id="r-house"></div><div class="sub" id="r-house-sub"></div></div>
   <div class="res"><div class="lbl">Absorbed upstream</div><div class="num" id="r-absorb"></div><div class="sub" id="r-absorb-sub"></div></div>
  </div>
  <h2 class="col-title" style="margin-top:26px">Where the change in the bill comes from</h2>
  <div class="bar" id="bar"></div><div class="legend" id="r-split"></div>
  <div class="assume"><b>Assumptions and limits</b><ul>
   <li>The importer’s bill is barrels × Brent × rupees per dollar. Freight, insurance, refining margins, hedges and payment timing are left out.</li>
   <li>The change splits exactly into an oil effect (price change at the old exchange rate), a rupee effect (exchange-rate change at the old price) and the part that comes from both moving together.</li>
   <li>Crude cost per litre divides the cost of a barrel by 158.99 litres. It ignores refining yields and product cracks, so it is a guide to scale, not a pump-price forecast.</li>
   <li>Pass-through, starting pump price and household use are your choices. Retail fuel prices in India also depend on excise duty, state VAT and oil company pricing decisions.</li>
  </ul><p>For the argument behind these mechanics, read <a href="/archive/?q=oil" style="text-decoration:underline">our oil-shock coverage</a>.</p></div>
  </div></div>`;
}

function toolsHub() {
  return pageHead('Tools', 'Tools and data', 'Interactive tools built on official data. Every figure links to its source and carries the date it was checked.') + `<div class="wrap"><div class="hub">${TOOLS.map(t => `<a href="${t.url}"><span class="kicker">${esc(t.kicker)}</span><h3>${esc(t.title)}</h3><p>${esc(t.blurb)}</p><span class="meta">Open →</span></a>`).join('')}</div></div>`;
}

function notFound() { return pageHead('404', 'Page not found', 'It may have moved. Try the <a href="/archive/" style="text-decoration:underline">archive search</a> or the <a href="/" style="text-decoration:underline">homepage</a>.'); }

// ---------------------------------------------------------------- main
async function main() {
  const [wp, tape, ledger, fc, budget, states] = await Promise.all([loadWordPress(), ...['tape', 'ledger', 'forecasts', 'budget', 'states'].map(f => readFile(`data/${f}.json`, 'utf8').then(JSON.parse))]);
  __tapeRef = tape;
  const m = model(wp);
  if (existsSync(OUT)) await rm(OUT, { recursive: true });
  await mkdir(OUT, { recursive: true });
  await cp('src/styles.css', join(OUT, 'styles.css'));
  await cp('src/app.js', join(OUT, 'app.js'));
  if (existsSync('static')) await cp('static', OUT, { recursive: true });
  const P = (o) => layout({ tape, ...o });

  await write('index.html', P({ path: '/', description: 'Independent analysis of India’s economy and the politics around it, with live macro data, policy tracking and tools.', body: home(m, tape, ledger) }));
  for (const a of m.articles) await write(`a/${a.slug}/index.html`, P({ title: a.title, description: a.excerpt, path: a.url, canonical: a.wpLink, active: a.topic, type: 'article', body: articlePage(a, m) }));
  for (const t of TOPIC_ORDER) await write(`topic/${t}/index.html`, P({ title: TOPICS[t].name, description: TOPICS[t].blurb, path: `/topic/${t}/`, active: t, body: topicPage(t, m) }));
  await write('series/index.html', P({ title: 'Series', path: '/series/', description: 'Questions followed across several articles.', body: seriesIndex(m) }));
  for (const s of m.series) await write(`series/${s.slug}/index.html`, P({ title: s.name, path: `/series/${s.slug}/`, description: s.description, body: seriesPage(s) }));
  await write('explainers/index.html', P({ title: 'Explainers', path: '/explainers/', description: 'Primers on Indian economics and policy.', body: explainersPage(m) }));
  await write('archive/index.html', P({ title: 'Archive and search', path: '/archive/', description: 'Search every article.', body: archivePage(m) }));
  await write('data/index.html', P({ title: 'India macro data', path: '/data/', description: 'CPI, repo rate, rupee, bond yields, Brent and the Nifty with sources.', body: dataHub(tape, m) }));
  for (const i of tape.indicators) await write(`data/${i.id}/index.html`, P({ title: i.label, path: `/data/${i.id}/`, description: i.definition, body: indicatorPage(i, m) }));
  await write('ledger/index.html', P({ title: 'Policy Ledger', path: '/ledger/', description: 'Policies tracked from announcement to measured outcome.', body: ledgerPage(ledger, m) }));
  await write('forecasts/index.html', P({ title: 'Forecast Book', path: '/forecasts/', description: 'Testable calls with probabilities, revisions and results.', body: forecastsPage(fc) }));
  await write('tools/shock-lab/index.html', P({ title: 'Shock Lab: oil and the rupee', path: '/tools/shock-lab/', description: 'Calculate what an oil or rupee shock does to an importer, the pump and a household.', body: shockLab(tape) }));
  await write('tools/index.html', P({ title: 'Tools and data', path: '/tools/', description: 'Interactive tools on India’s economy built on official data.', body: toolsHub() }));
  await write('tools/budget-x-ray/index.html', P({ title: 'Budget X-Ray 2026-27', path: '/tools/budget-x-ray/', description: 'How far the Centre has got through its 2026-27 Budget: receipts, spending and the fiscal deficit against the full-year plan.', body: budgetPage(budget, { pageHead, findRelated, articles: m.articles }) }));
  await write('tools/india-by-state/index.html', P({ title: 'India by State', path: '/tools/india-by-state/', description: 'Indian states compared on income per person, growth, inflation, debt and interest burden, with sources.', body: statesPage(states, { pageHead }) }));
  await write('404.html', P({ title: 'Page not found', path: '/404', body: notFound() }));

  const idx = m.articles.map(a => ({ title: a.title, excerpt: a.excerpt, url: a.url, date: a.date.slice(0, 10), topic: a.topic, topicName: TOPICS[a.topic].short, color: TOPICS[a.topic].color, format: a.format, series: a.series[0]?.name || '' }));
  await write('search.json', JSON.stringify(idx));
  const urls = ['/', '/series/', '/explainers/', '/archive/', '/data/', '/ledger/', '/forecasts/', '/tools/', '/tools/shock-lab/', '/tools/budget-x-ray/', '/tools/india-by-state/', ...TOPIC_ORDER.map(t => `/topic/${t}/`), ...m.series.map(s => `/series/${s.slug}/`), ...tape.indicators.map(i => `/data/${i.id}/`)];
  await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${BASE_URL}${u}</loc></url>`).join('')}</urlset>`);
  await write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`);
  await write('_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/styles.css\n  Cache-Control: public, max-age=3600\n/app.js\n  Cache-Control: public, max-age=3600\n`);
  console.log(`Built ${m.articles.length} articles, ${m.series.length} series → ${OUT}/`);
}
main().catch(e => { console.error(e); process.exit(1); });
