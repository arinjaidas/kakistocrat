// The Kakistocrat — static site builder.
// Pulls articles from the WordPress.com public API (thekakisto.wordpress.com),
// merges them with the data files in /data, and writes a static site to /dist.
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { budgetPage } from './lib/budget.mjs';
import { statesPage } from './lib/states.mjs';
import { twoChartPage } from './lib/twochart.mjs';
import { exposurePage } from './lib/exposure.mjs';
import { loadMarkets } from './lib/marketsdata.mjs';
import { marketsPage, commoditiesPage } from './lib/markets.mjs';
import { workbenchPage } from './lib/workbench.mjs';
import { emiPage } from './lib/emi.mjs';
import { chartlePage } from './lib/chartle.mjs';
import { todayPage } from './lib/today.mjs';
import { infographicsPage } from './lib/infographics.mjs';
import { rupeePage, rupeeData } from './lib/rupee.mjs';
import { terminalPage } from './lib/terminal.mjs';
import { pumpPage } from './lib/pump.mjs';
import { hormuzPage } from './lib/hormuz.mjs';
import { worldPage } from './lib/world.mjs';
import { mapsPage, mapPosters } from './lib/maps.mjs';
import { scenarioPage } from './lib/scenario.mjs';
import { slugify, cleanCountry, mentions, correlations, seriesPage as entitySeriesPage, statePage, countryPage, explorePage, STATE_ALIAS, COUNTRY_ALIAS, SKIP_COUNTRY, SERIES_KW, rx, unusualMoves, movesHTML, autolink, storyCards } from './lib/entities.mjs';
let MK = null;

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
const MARKET_PATHS = ['/markets/', '/commodities/', '/rupee/', '/hormuz/', '/world/', '/terminal/', '/charts/'];
export const TAPE_S = { cpi: 'india-cpi', repo: 'india-repo', inr: 'fx-usdinr', g10: 'nse-nifty-10-yr-benchmark-g-sec', brent: 'fred-dcoilbrenteu', nifty: 'nse-nifty-50' };
const TOOLS = [
  { url: '/tools/shock-lab/', kicker: 'Scenario engine', title: 'What if? One shock, every consequence', blurb: 'Move oil, the rupee and the repo rate; see the pump price, your fuel bill, the import bill, the current account and your EMI change together.' },
  { url: '/today/', kicker: 'India Today', title: 'The economy on one screen', blurb: 'Rule-based readings, from inflation and rates to the rupee, oil, Hormuz shipping, the Budget and growth.' },
  { url: '/terminal/', kicker: 'Terminal', title: 'Everything on one screen', blurb: 'Indices, rates, currencies, commodities, movers, crypto and the data calendar in one dense dark screen, with a command bar that charts any series.' },
  { url: '/maps/', kicker: 'India in maps', title: 'One idea per map', blurb: 'Poster-style state maps: inflation, income, growth, debt, and every state as a country. Save any as an image.' },
  { url: '/world/', kicker: 'India against the world', title: 'Where India ranks', blurb: 'Every economy in the IMF’s World Economic Outlook ranked on size, income, growth, inflation and debt, any year from 1990.' },
  { url: '/hormuz/', kicker: 'Chokepoint watch', title: 'Ships through Hormuz and the shipping lanes', blurb: 'Daily ship counts through Hormuz, Bab el-Mandeb, Suez, the Cape and Malacca, with Brent alongside.' },
  { url: '/tools/pump-price/', kicker: 'Pump price', title: 'What’s in a litre of petrol', blurb: 'The Delhi pump price split into oil company price, excise, dealer commission and VAT, with a calculator.' },
  { url: '/rupee/', kicker: 'Rupee & external sector', title: 'The rupee, the rate gap and the external accounts', blurb: 'The rupee against 14 currencies, the India–US rate gap, and the current account, reserves and remittances against peers.' },
  { url: '/charts/', kicker: 'Chart workbench', title: 'Plot anything against anything', blurb: 'A library of Indian and global series: overlay up to six, transform, zoom, share and download.' },
  { url: '/markets/', kicker: 'Markets', title: 'Indices, heatmap, rates and currencies', blurb: 'NSE closes for 28 indices, a Nifty 50 heatmap, valuations, yield curves, currency race charts and live crypto.' },
  { url: '/commodities/', kicker: 'Commodities', title: 'Energy, metals, fertilisers and food', blurb: '35 world prices with five-year ranges, a comparison chart and a year-on-year heat table.' },
  { url: '/tools/budget-x-ray/', kicker: 'Budget X-Ray', title: 'Halfway through the Budget', blurb: 'Receipts, spending and the deficit against the full-year plan, with a year-end calculator.' },
  { url: '/tools/india-by-state/', kicker: 'India by State', title: 'Thirty-one states compared', blurb: 'Income, growth, inflation and state debt on a tile map, with any two measures plotted against each other.' },
  { url: '/infographics/', kicker: 'Infographics', title: 'India in pictures', blurb: 'The Budget rupee as a flow diagram, the inflation basket, a GDP race from 1990, and India against its peers.' },
  { url: '/chartle/', kicker: 'Chartle', title: 'The daily mystery chart', blurb: 'Guess the series behind today’s chart in six tries, then share your score.' },
  { url: '/tools/emi/', kicker: 'EMI shock', title: 'What a rate hike does to your EMI', blurb: 'Enter your home loan and see the new instalment, or how much longer you pay if the EMI is held.' },
  
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
  const MACRO = ['cpi', 'repo', 'g10'];
  const ticks = tape.indicators.filter(i => !MK || MACRO.includes(i.id)).map(i => {
    const d = i.latest.value - i.previous.value;
    const cls = Math.abs(d) < 1e-9 ? 'flat' : d > 0 ? 'up' : 'dn';
    const dTxt = i.unit === '%' ? `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d * 100).toFixed(0)}bp` : `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d / i.previous.value * 100).toFixed(1)}%`;
    return `<button class="tick" data-id="${i.id}" aria-expanded="false" aria-label="${esc(i.label)}: ${esc(tapeVal(i, i.latest.value))}, ${esc(i.latest.period)}"><span class="k">${esc(i.short)}</span><span class="v">${esc(tapeVal(i, i.latest.value))}</span><span class="d ${cls}">${dTxt}</span><span class="p">${esc(i.latest.period.replace(/^(Close|Around|Since), /, ''))}</span></button>`;
  }).join('');
  let mticks = '';
  if (MK) {
    const L = MK.dates.length - 1;
    const nseS = n => '/s/nse-' + n.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '/';
    const idx = (k, n, href = nseS(n)) => { const a = MK.series[n]; if (!a) return ''; const v = a[L], p = a[L - 1], c = p ? (v / p - 1) * 100 : 0; return `<a class="tick" href="${href}"><span class="k">${k}</span><span class="v">${v.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span><span class="d ${c > 0 ? 'up' : c < 0 ? 'dn' : 'flat'}">${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c).toFixed(2)}%</span></a>`; };
    const fr = (k, id, unit, dec = 2, href = `/s/fred-${id.toLowerCase()}/`) => { const x = MK.fredLast?.[id]; if (!x) return ''; const c = x.prev ? (x.last[1] / x.prev[1] - 1) * 100 : 0; return `<a class="tick" href="${href}"><span class="k">${k}</span><span class="v">${unit === '$' ? '$' : ''}${x.last[1].toFixed(dec)}${unit === '%' ? '%' : ''}</span><span class="d ${c > 0 ? 'up' : c < 0 ? 'dn' : 'flat'}">${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c).toFixed(2)}%</span></a>`; };
    const inr = MK.fxOut?.table.find(t => t.c === 'INR');
    const g = MK.comm?.items.find(i => i.id === 'gold');
    mticks = idx('Nifty 50', 'Nifty 50') + idx('Bank Nifty', 'Nifty Bank') + idx('Midcap 100', 'NIFTY Midcap 100') + idx('India VIX', 'India VIX') +
      (inr ? `<a class="tick" href="/s/fx-usdinr/"><span class="k">₹/$</span><span class="v">${inr.last.toFixed(2)}</span><span class="d ${inr.d1 > 0 ? 'dn' : inr.d1 < 0 ? 'up' : 'flat'}">${inr.d1 > 0 ? '+' : inr.d1 < 0 ? '−' : ''}${Math.abs(inr.d1 || 0).toFixed(2)}%</span></a>` : '') +
      fr('Brent', 'DCOILBRENTEU', '$', 2) + fr('WTI', 'DCOILWTICO', '$', 2) +
      (g ? `<a class="tick" href="/s/wb-gold/"><span class="k">Gold</span><span class="v">$${Math.round(g.cur).toLocaleString('en-IN')}</span><span class="d ${g.mm > 0 ? 'up' : 'dn'}">${g.mm > 0 ? '+' : '−'}${Math.abs(g.mm).toFixed(1)}% m/m</span></a>` : '') +
      fr('US 10Y', 'DGS10', '%') + fr('US 2Y', 'DGS2', '%') + fr('Dollar idx', 'DTWEXBGS', '', 1) +
      `<a class="tick" href="/s/crypto-bitcoin/"><span class="k">BTC</span><span class="v" data-live="btc">${(MK.crypto?.bitcoin?.at(-1)?.[1] || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span><span class="d" data-live="btc-c">live</span></a>`;
  }
  return `<div class="tape" role="region" aria-label="India markets and macro tape"><div class="wrap tape-wrap"><span class="tape-label">India tape</span><div class="tape-viewport"><div class="tape-track">${ticks}${mticks}<span class="tape-gap"></span><span class="tape-dup" aria-hidden="true" inert>${ticks}${mticks}</span><span class="tape-gap"></span></div></div><a class="tape-more" href="/markets/">Markets →</a></div></div>`;
}

function layout({ title, description = '', path = '/', body, canonical, tape, active = '', type = 'website' }) {
  const full = title ? `${title} · The Kakistocrat` : 'The Kakistocrat · A deeper look at economics and politics';
  const nav = TOPIC_ORDER.map(s => `<a href="/topic/${s}/"${active === s ? ' aria-current="page"' : ''}>${esc(TOPICS[s].short)}</a>`).join('');
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical || BASE_URL + path)}">
<meta property="og:title" content="${esc(title || 'The Kakistocrat')}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${esc(BASE_URL + path)}"><meta property="og:image" content="${BASE_URL}/og/${ogSlug(path)}.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${BASE_URL}/og/${ogSlug(path)}.png">
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
<nav class="toolsnav" aria-label="Tools">${[["/today/", "Today"], ["/terminal/", "Terminal"], ["/markets/", "Markets"], ["/maps/", "Maps"], ["/charts/", "Charts"], ["/explore/", "Explore"], ["/tools/", "Tools"]].map(([u, t]) => `<a href="${u}"${path.startsWith(u) || (u === "/markets/" && MARKET_PATHS.some(x => path.startsWith(x))) ? ' aria-current="page"' : ""}>${t}</a>`).join("")}<a href="/explore/" data-qs class="qs-btn" title="Search everything (/ or ⌘K)">Search <kbd>/</kbd></a><a class="cta" href="https://${SITE}/#subscribe">Subscribe</a></nav>
</div></header>
${tapeHTML(tape)}
${MARKET_PATHS.some(x => path.startsWith(x)) || path.startsWith('/s/') ? `<nav class="subnav" aria-label="Markets"><div class="wrap">${[['/terminal/', 'Terminal'], ['/markets/', 'Equities'], ['/commodities/', 'Commodities'], ['/rupee/', 'Rupee & rates'], ['/hormuz/', 'Shipping'], ['/world/', 'World'], ['/charts/', 'Workbench']].map(([u, t]) => `<a href="${u}"${path.startsWith(u) ? ' aria-current="page"' : ''}>${t}</a>`).join('')}<span class="sub-hint">Every name is a link · press / to search</span></div></nav>` : ''}
<main id="main">${body}</main>
<footer class="foot"><div class="wrap foot-grid">
<div><div class="brandline">The Kakistocrat</div><p>Independent analysis of India’s economy and the politics around it, by Arinjai Das. Articles are published on <a href="https://${SITE}/" style="text-decoration:underline">thekakisto.wordpress.com</a> and appear here automatically.</p><p class="meta" style="margin-top:12px">Site built ${esc(longDate(new Date(BUILT.getTime() + 330 * 60000).toISOString()))}</p></div>
<div><h4>Topics</h4><ul>${TOPIC_ORDER.map(s => `<li><a href="/topic/${s}/">${esc(TOPICS[s].name)}</a></li>`).join('')}</ul></div>
<div><h4>Read</h4><ul><li><a href="/series/">Series</a></li><li><a href="/explainers/">Explainers</a></li><li><a href="/archive/">Archive &amp; search</a></li><li><a href="/ledger/">Policy Ledger</a></li><li><a href="/forecasts/">Forecast Book</a></li><li><a href="https://${SITE}/about/">About</a></li><li><a href="https://${SITE}/contact/">Contact</a></li></ul></div>
<div><h4>Tools</h4><ul>${TOOLS.map(t => `<li><a href="${t.url}">${esc(t.kicker)}</a></li>`).join('')}<li><a href="https://${SITE}/feed/">RSS</a></li></ul></div>
</div></footer>
<script>window.__TAPE=${JSON.stringify(tape).replace(/</g, '\\u003c')};</script>
<script src="/app.js?v=${BUILT.getTime()}" defer></script><script src="/search.js?v=${BUILT.getTime()}" defer></script>
</body></html>`;
}

// ---------------------------------------------------------------- components
const kicker = a => `<span class="kicker desk" style="--desk:${TOPICS[a.topic].color}">${esc(TOPICS[a.topic].short)}</span>`;
const fmtBadge = a => a.format === 'Analysis' ? '' : ` <span class="fmt ${a.format.toLowerCase()}">${a.format}</span>`;
const metaLine = a => `<div class="meta">${esc(shortDate(a.date))} · ${a.minutes} min</div>`;
const card = (a, size = 'h-3', dek = true) => `<a class="story" href="${a.url}">${kicker(a)}${fmtBadge(a)}<h3 class="${size}">${esc(a.title)}</h3>${dek ? `<p class="dek sm">${esc(a.excerpt)}</p>` : ''}${metaLine(a)}</a>`;
const stagesDone = item => Object.values(item.stage).filter(Boolean).length;
const pips = item => `<div class="pips" aria-label="${stagesDone(item)} of 5 stages reached">${['Announced','Notified','Funded','Implemented','Measured'].map(s => `<i class="${item.stage[s] ? 'on' : ''}"></i>`).join('')}</div>`;
const OG = new Set(existsSync('static/og') ? readdirSync('static/og').filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)) : []);
const ogSlug = path => { const seg = (path || '/').split('/').filter(Boolean).pop() || 'default'; return OG.has(seg) ? seg : 'default'; };
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
  <div class="module dark"><span class="kicker" style="color:#F0A39B">Scenario engine</span><h3>What if oil hits $140?</h3><p>One shock, every consequence: the pump, the import bill, the current account and your EMI.</p><a class="btn" style="background:#fff;color:var(--ink)" href="/tools/shock-lab/">Open the calculator</a></div>
  ${MK?.unusual?.length ? `<div class="module"><span class="kicker">Unusual moves</span><h3>What just moved more than usual</h3><ul class="mini-moves">${MK.unusual.slice(0, 6).map(u => `<li><a href="/s/${u.id}/">${esc(u.name)}</a><span class="${u.ch > 0 ? 'up' : 'dn'}">${u.ch > 0 ? '+' : '−'}${Math.abs(u.ch).toFixed(u.rate ? 2 : 1)}${u.rate ? ' pts' : '%'}</span></li>`).join('')}</ul><a class="more" href="/explore/">Explore everything →</a></div>` : ''}
  <div class="module"><span class="kicker">Data</span><h3>India at a glance</h3>${tape.indicators.slice(0, 4).map(i => `<a href="/s/${TAPE_S[i.id]}/" style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--rule);font:500 13px var(--mono)"><span>${esc(i.label)}</span><b>${esc(tapeVal(i, i.latest.value))}</b></a>`).join('')}<p style="margin:8px 0 0"><a href="/data/" class="meta" style="color:var(--accent)">Data hub →</a></p></div>
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
 <div class="prose">${a.linkedHtml || a.html}</div>
 ${a.dataCards || (a.places || []).length ? `<section class="story-space"><div class="ss-head"><span class="kicker">The data behind this story</span><a href="/explore/">Explore everything →</a></div>
  ${a.dataCards ? `<div class="sd-cards">${a.dataCards}</div>` : ''}
  ${(a.places || []).length ? `<div class="ss-places"><span>Places in this story</span><div class="en-chips">${a.places.map(x => `<a href="${x.u}" class="sd-${x.type}">${esc(x.t)}</a>`).join('')}</div></div>` : ''}
  ${a.whatIf ? `<a class="ss-whatif" href="/tools/shock-lab/"><b>What if?</b> Push oil, the rupee or the repo rate further and see the pump price, the import bill and your EMI move →</a>` : ''}
 </section>` : ''}
 ${seriesBoxes}
 <p class="origin-note">First published on <a href="${esc(a.wpLink)}" style="text-decoration:underline">thekakisto.wordpress.com</a>. Figures are as cited at the time of publication; check the linked sources for later revisions.</p>
</div>
<aside class="rail"><div class="sticky">
 ${(a.connected || []).length ? `<div class="module"><span class="kicker">Connected stories</span><p class="meta" style="margin:4px 0 6px">Other pieces about the same things.</p><div class="rule-list">${a.connected.map(c => `<a class="story" href="${c.b.url}"><h3 class="h-4">${esc(c.b.title)}</h3><div class="meta">${esc(c.shared.join(' · '))}</div></a>`).join('')}</div></div>` : ''}
 ${(a.storyItems || []).length ? `<div class="module story-data"><span class="kicker">Data in this story</span><p class="meta" style="margin:4px 0 8px">Live pages for what this piece discusses.</p><div class="en-chips">${a.storyItems.map(x => `<a href="${x.u}" class="sd-${x.type}">${esc(x.t)}</a>`).join('')}</div></div>` : ''}
 <div class="module"><span class="kicker desk" style="--desk:${t.color}">More in ${esc(t.short)}</span><div class="rule-list" style="margin-top:8px">${sameTopic.map(x => `<a class="story" href="${x.url}"><h3 class="h-4">${esc(x.title)}</h3><div class="meta">${esc(shortDate(x.date))}</div></a>`).join('')}</div></div>
 <div class="module dark"><span class="kicker" style="color:#F0A39B">Scenario engine</span><h3>What if oil hits $140?</h3><p>One shock through the pump, the import bill and your EMI.</p><a class="btn" style="background:#fff;color:var(--ink)" href="/tools/shock-lab/">Open</a></div>
</div></aside>
</article></div>`;
}

function listPage(items) { return items.map(a => `<a class="row-story story" href="${a.url}"><div class="when">${esc(shortDate(a.date))}<br><span style="color:${TOPICS[a.topic].color}">${esc(TOPICS[a.topic].short)}</span></div><div>${fmtBadge(a).trim()}${a.series[0] ? ` <span class="meta">${esc(a.series[0].name)}</span>` : ''}<h3 class="h-3">${esc(a.title)}</h3><p class="dek sm">${esc(a.excerpt)}</p></div></a>`).join(''); }

function topicPage(slug, m) {
  const t = TOPICS[slug], items = m.articles.filter(a => a.topic === slug);
  const series = m.series.filter(s => s.items.some(a => a.topic === slug));
  const TD = m.topicData?.[slug];
  return pageHead(`<span style="color:${t.color}">Topic</span>`, t.name, esc(m.topicDesc[slug] || t.blurb)) +
  (TD ? `<div class="wrap"><section class="topic-space" style="--desk:${t.color}"><div class="ss-head"><span class="kicker" style="color:${t.color}">The numbers behind ${esc(t.short.toLowerCase())}</span><span>${TD.tools.map(([u, n]) => `<a href="${u}">${esc(n)} →</a>`).join(' ')}</span></div><div class="sd-cards tp">${TD.cards}</div>
   ${TD.subjects.length ? `<div class="ss-places"><span>Most discussed here</span><div class="en-chips">${TD.subjects.map(x => `<a href="${x.u}" class="sd-${x.type}">${esc(x.t)} <small>${x.n}</small></a>`).join('')}</div></div>` : ''}</section></div>` : '') +
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
  `<div class="wrap"><div class="data-grid">${tape.indicators.map(i => { const d = i.latest.value - i.previous.value; return `<a class="ind-card" href="/s/${TAPE_S[i.id]}/"><span class="kicker">${esc(i.label)}</span><span class="v">${esc(tapeVal(i, i.latest.value))}</span><span class="chg" style="color:${d > 0 ? 'var(--up)' : d < 0 ? 'var(--down)' : 'var(--mute)'}">${d > 0 ? '▲' : d < 0 ? '▼' : '■'} from ${esc(tapeVal(i, i.previous.value))} · ${esc(i.previous.period)}</span><div class="spark" data-chart='${esc(JSON.stringify({ pts: i.history, spark: true, decimals: i.decimals, label: i.label }))}'></div><span class="meta">${esc(i.latest.period)} · next: ${esc(isoOrMonth(i.next.date))}</span></a>`; }).join('')}</div>
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
let __tapeRef = null; function window_tape_others(i) { return __tapeRef.indicators.filter(x => x.id !== i.id).map(x => `<a class="story" href="/s/${TAPE_S[x.id]}/" style="display:flex;justify-content:space-between"><span>${esc(x.label)}</span><b class="meta" style="color:var(--ink)">${esc(tapeVal(x, x.latest.value))}</b></a>`).join(''); }

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

function toolsHub(stats) {
  const by = Object.fromEntries(TOOLS.map(t => [t.url, t]));
  const G = [['Watch', 'What is happening now', ['/today/', '/terminal/', '/markets/', '/commodities/', '/rupee/', '/hormuz/']],
    ['Ask', 'What would happen if', ['/tools/shock-lab/', '/tools/emi/', '/tools/pump-price/', '/tools/budget-x-ray/']],
    ['See', 'India in pictures', ['/maps/', '/infographics/', '/world/', '/tools/india-by-state/']],
    ['Dig', 'Everything, connected', ['/explore/', '/charts/', '/api/', '/chartle/']]];
  const extra = { '/explore/': { kicker: 'Explore', title: 'Everything, connected', blurb: 'Every series, state, country and article with its own page, linked by what moves together and what the articles discuss.' }, '/api/': { kicker: 'Data API', title: 'Download it all', blurb: 'Every dataset as JSON, free to use, with cross-origin access.' } };
  return pageHead('The data space', 'One connected data space', `${stats.series} data series, ${stats.states} states, ${stats.countries} countries and ${stats.articles} articles, joined by ${stats.links.toLocaleString('en-IN')} links. Every name on every page opens the page for that thing; every page leads back to the tools and stories that use it. Press / anywhere to search.`) +
  `<div class="wrap">${G.map(([h, sub, urls]) => `<section class="hub-g"><div class="hub-h"><h2>${h}</h2><span>${sub}</span></div><div class="hub">${urls.map(u => [u, by[u] || extra[u]]).filter(x => x[1]).map(([u, t]) => `<a href="${u}"><span class="kicker">${esc(t.kicker)}</span><h3>${esc(t.title)}</h3><p>${esc(t.blurb)}</p></a>`).join('')}</div></section>`).join('')}
  <p class="meta" style="margin:10px 0 40px">Also: the <a href="/ledger/" style="text-decoration:underline">Policy Ledger</a> and the <a href="/forecasts/" style="text-decoration:underline">Forecast Book</a>.</p></div>`;
}

function apiPage(api) {
  return pageHead('Data API', 'Data API', 'Every dataset on this site as plain JSON. Free to use with attribution to the original source named in each file and on the page that uses it. Cross-origin requests are allowed, so you can call these from your own pages and notebooks.') +
  `<div class="wrap" style="max-width:980px"><div class="tbl-wrap"><table class="xr-table"><thead><tr><th>Endpoint</th><th>What it holds</th></tr></thead><tbody>${Object.entries(api).map(([k, v]) => `<tr><th scope="row" style="font:500 13px var(--mono)"><a href="/api/${k}.json" style="text-decoration:underline">/api/${k}.json</a></th><td style="text-align:left">${esc(v)}</td></tr>`).join('')}</tbody></table></div>
  <h2 class="col-title" style="margin-top:28px">Example</h2><pre class="code">fetch('${BASE_URL}/api/markets/indices.json')
  .then(r => r.json())
  .then(d => console.log(d.dates.at(-1), d.series['Nifty 50'].at(-1)));</pre>
  <pre class="code">import pandas as pd, requests
d = requests.get('${BASE_URL}/api/markets/fx.json').json()
inr = pd.Series(d['rates']['INR'], index=pd.to_datetime(d['dates']))</pre>
  <p class="meta">Market data refreshes every weekday evening after NSE publishes its closing files; commodity prices monthly. Index: <a href="/api/index.json" style="text-decoration:underline">/api/index.json</a>.</p></div>`;
}

function notFound() { return pageHead('404', 'Page not found', 'It may have moved. Try the <a href="/archive/" style="text-decoration:underline">archive search</a> or the <a href="/" style="text-decoration:underline">homepage</a>.'); }

// ---------------------------------------------------------------- main
async function main() {
  // On Cloudflare Pages, refresh market data before building (incremental; falls back to the committed cache on any failure).
  if (process.env.CF_PAGES && !process.env.SKIP_FETCH) {
    try { execSync('python3 -m pip install --quiet --user openpyxl matplotlib', { stdio: 'inherit', timeout: 180000 }); execSync('python3 scripts/fetch_markets.py --years 3', { stdio: 'inherit', timeout: 900000 }); }
    catch (e) { console.warn('Market data refresh skipped:', e.message); }
  }
  const [wp, tape, ledger, fc, budget, states, twocharts, exposure] = await Promise.all([loadWordPress(), ...['tape', 'ledger', 'forecasts', 'budget', 'states', 'twocharts', 'exposure'].map(f => readFile(`data/${f}.json`, 'utf8').then(JSON.parse))]);
  __tapeRef = tape;
  const m = model(wp);
  if (existsSync(OUT)) await rm(OUT, { recursive: true });
  await mkdir(OUT, { recursive: true });
  await cp('src/styles.css', join(OUT, 'styles.css'));
  await cp('src/app.js', join(OUT, 'app.js'));
  await cp('src/markets.js', join(OUT, 'markets.js'));
  await cp('src/workbench.js', join(OUT, 'workbench.js'));
  await cp('src/chartle.js', join(OUT, 'chartle.js'));
  await cp('src/infographics.js', join(OUT, 'infographics.js'));
  await cp('src/rupee.js', join(OUT, 'rupee.js'));
  await cp('src/terminal.js', join(OUT, 'terminal.js'));
  await cp('src/hormuz.js', join(OUT, 'hormuz.js'));
  await cp('src/world.js', join(OUT, 'world.js'));
  await cp('src/maps.js', join(OUT, 'maps.js'));
  await cp('src/entity.js', join(OUT, 'entity.js'));
  await cp('src/search.js', join(OUT, 'search.js'));
  await cp('src/scenario.js', join(OUT, 'scenario.js'));
  if (existsSync('static')) await cp('static', OUT, { recursive: true });
  MK = await loadMarkets();
  const P = (o) => layout({ tape, ...o });
  // ---- public data API (static JSON, CORS open)
  const api = {};
  if (MK) {
    const I = { dates: MK.dates, series: MK.series, pe: MK.pe, pb: MK.pb, dy: MK.dy };
    await write('api/markets/indices.json', JSON.stringify(I));
    if (MK.imfWorld) { for (const [ind, d] of Object.entries(MK.imfWorld.data)) await write(`api/world/${ind}.json`, JSON.stringify(d)); await write('api/world/meta.json', JSON.stringify({ indicators: MK.imfWorld.indicators, countries: MK.imfWorld.countries })); api['world/meta'] = 'IMF WEO for every country: indicator and country lists; one file per indicator at /api/world/<id>.json (1990–2031)'; }
    if (MK.portwatch) { await write('api/markets/portwatch.json', JSON.stringify(MK.portwatch)); api['markets/portwatch'] = 'Daily ship transits through Hormuz, Bab el-Mandeb, Suez, the Cape of Good Hope and Malacca by ship type, from 2023 (IMF PortWatch)'; } api['markets/indices'] = 'NSE index closes (28 indices) and Nifty 50 P/E, P/B, dividend yield, daily';
    for (const [f, d] of [['stocks', 'nse_stocks'], ['fred', 'fred'], ['fx', 'fx'], ['worldbank', 'worldbank'], ['crypto', 'crypto'], ['world', 'macro_world']]) { await write(`api/markets/${f}.json`, await readFile(`data/markets/${d}.json`, 'utf8')); }
    Object.assign(api, { 'markets/stocks': 'Nifty 50 constituents: close, change, market cap; NSE breadth', 'markets/fred': 'US Treasury yields, fed funds, breakeven inflation, broad dollar index, EIA oil and gas spot prices (FRED)', 'markets/fx': '15 currencies per US dollar, ECB reference rates, daily', 'markets/worldbank': '35 commodity prices, monthly, World Bank Pink Sheet', 'markets/crypto': 'Bitcoin and ether, daily USD, CoinGecko', 'markets/world': 'IMF World Economic Outlook and World Bank indicators for India and 13 peers, annual' });
  }
  for (const f of ['tape', 'ledger', 'budget', 'states', 'exposure', 'twocharts', 'forecasts', 'infographics', 'cpi_basket', 'pump', 'states_countries']) { await write(`api/${f}.json`, await readFile(`data/${f}.json`, 'utf8')); }
  Object.assign(api, { tape: 'India macro tape: CPI, repo, rupee, 10-year yield, Brent, Nifty, with sources', ledger: 'Policy Ledger items and stages', budget: 'Union Budget 2026-27: estimates and April–September actuals', states: 'State indicators: income, growth, inflation, debt, interest burden', exposure: 'Import exposure: crude suppliers, DAP, China shares', twocharts: 'Two-Chart Test data', forecasts: 'Forecast Book calls' });
  // ---- series catalogue for the chart workbench
  const catalog = [], SD = {};
  const addSeries = async (id, name, group, unit, freq, source, dates, values) => {
    const pts = dates.map((d, i) => [d, values[i]]).filter(p => p[1] != null && Number.isFinite(p[1]));
    if (pts.length < 3) return;
    catalog.push({ id, name, group, unit, freq, source, first: pts[0][0], last: pts.at(-1)[0], n: pts.length }); SD[id] = { d: pts.map(p => p[0]), v: pts.map(p => p[1]) };
    await write(`api/series/${id}.json`, JSON.stringify({ id, name, unit, freq, source, d: pts.map(p => p[0]), v: pts.map(p => p[1]) }));
  };
  const slug = t => t.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (MK) {
    for (const n of MK.names) await addSeries('nse-' + slug(n), n, n === 'India VIX' ? 'Indian markets' : /G-Sec/.test(n) ? 'Indian markets' : 'Indian equity indices', n === 'India VIX' ? 'index' : 'index points', 'daily', 'NSE', MK.dates, MK.series[n]);
    await addSeries('nifty50-pe', 'Nifty 50 price-to-earnings', 'Indian markets', 'ratio', 'daily', 'NSE', MK.dates, MK.pe);
    await addSeries('nifty50-pb', 'Nifty 50 price-to-book', 'Indian markets', 'ratio', 'daily', 'NSE', MK.dates, MK.pb);
    await addSeries('nifty50-dy', 'Nifty 50 dividend yield', 'Indian markets', '%', 'daily', 'NSE', MK.dates, MK.dy);
    for (const [k, sr] of Object.entries(MK.fred)) { const unit = /DGS|DFF|T10YIE/.test(k) ? '%' : k === 'DTWEXBGS' ? 'index' : k === 'DEXINUS' ? '₹ per $' : k === 'DHHNGSP' ? '$/mmbtu' : '$/bbl'; await addSeries('fred-' + k.toLowerCase(), sr.label, /COIL|HHNG/.test(k) ? 'Commodities (daily)' : k === 'DEXINUS' ? 'Currencies' : 'Global rates and dollar', unit, 'daily', 'FRED' + (/COIL|HHNG/.test(k) ? ' (EIA)' : ''), sr.pts.map(p => p[0]), sr.pts.map(p => p[1])); }
    const fxn = { INR: 'Indian rupee', EUR: 'Euro', GBP: 'British pound', JPY: 'Japanese yen', CNY: 'Chinese yuan', KRW: 'Korean won', IDR: 'Indonesian rupiah', MYR: 'Malaysian ringgit', PHP: 'Philippine peso', THB: 'Thai baht', SGD: 'Singapore dollar', BRL: 'Brazilian real', MXN: 'Mexican peso', ZAR: 'South African rand', TRY: 'Turkish lira' };
    for (const c of Object.keys(MK.fx.rates)) await addSeries('fx-usd' + c.toLowerCase(), `${fxn[c]} per US dollar`, 'Currencies', `${c} per $`, 'daily', 'ECB via Frankfurter', MK.fx.dates, MK.fx.rates[c]);
    for (const [id, sr] of Object.entries(MK.wb.series)) await addSeries('wb-' + id, sr.name, 'Commodities (monthly): ' + sr.group, sr.unit, 'monthly', 'World Bank Pink Sheet', MK.wb.months.map(m => m + '-01'), sr.v);
    for (const [n, c] of Object.entries(MK.portwatch?.chokepoints || {})) { const sl = n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '');
      await addSeries('pw-' + sl, `Ships through the ${n.replace(/ Strait$/, ' Strait')}, a day`, 'Shipping chokepoints', 'ships a day', 'daily', 'IMF PortWatch', c.d, c.total);
      await addSeries('pw-' + sl + '-tankers', `Tankers through the ${n}, a day`, 'Shipping chokepoints', 'tankers a day', 'daily', 'IMF PortWatch', c.d, c.tanker); }
    for (const [c, pts] of Object.entries(MK.crypto || {})) await addSeries('crypto-' + c, c[0].toUpperCase() + c.slice(1) + ', US$', 'Crypto', '$', 'daily', 'CoinGecko', pts.map(p => p[0]), pts.map(p => p[1]));
    if (MK.world) {
      const W = MK.world, thisYear = BUILT.getUTCFullYear();
      for (const [src, block, tag] of [['IMF World Economic Outlook', W.imf, 'imf'], ['World Bank WDI', W.wdi, 'wdi']]) for (const [code, ind] of Object.entries(block)) for (const [iso, cname] of Object.entries(W.countries)) {
        const data = ind.data[iso]; if (!data) continue; const ys = Object.keys(data).sort();
        await addSeries(`${tag}-${slug(code)}-${iso.toLowerCase()}`, `${ind.label}: ${cname}`, iso === 'IND' ? 'India: annual macro' : 'World economy: annual', ind.unit, 'annual', src + (tag === 'imf' ? ` (from ${thisYear}: IMF projections)` : ''), ys.map(y => y + '-12-31'), ys.map(y => data[y]));
      }
    }
  }
  // India macro releases from the tape (CPI, repo) join the catalogue, so they chart, correlate and link like everything else
  const MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  for (const [tid, sid, name] of [['cpi', 'india-cpi', 'CPI inflation, India'], ['repo', 'india-repo', 'RBI repo rate']]) {
    const i = tape.indicators.find(x => x.id === tid); if (!i) continue;
    const pts = [...(i.history || []), { t: i.latest.period, v: i.latest.value }].map(h => { const [mo, y] = h.t.split(' '); return MON[mo] ? [`${y}-${MON[mo]}`, h.v] : null; }).filter(Boolean);
    const uniq = [...new Map(pts.map(p => [p[0], p])).values()].sort((a, b) => a[0].localeCompare(b[0]));
    await addSeries(sid, name, 'India: macro releases', i.unit === '%' ? '%' : i.unit, 'monthly', i.sources?.[0]?.name?.split(',')[0] || 'Official release', uniq.map(p => p[0]), uniq.map(p => p[1]));
  }
  // ---- the connected layer
  const byId = Object.fromEntries(catalog.map(c => [c.id, c]));
  const corr = correlations(SD, catalog);
  const UNUSUAL = unusualMoves(SD, catalog); MK && (MK.unusual = UNUSUAL, MK.movesHTML = movesHTML);
  await write('api/unusual.json', JSON.stringify(UNUSUAL)); api['unusual'] = 'The biggest recent moves across every daily and monthly series, measured against each series’ own usual change';
  const SC = JSON.parse(await readFile('data/states_countries.json', 'utf8'));
  const W = MK?.imfWorld;
  const ents = [
    ...Object.entries(SERIES_KW).filter(([id]) => byId[id]).map(([id, re]) => ({ key: id, re, min: /^(imf|fx-usdinr)/.test(id) ? 2 : 1 })),
    ...states.states.map(st => ({ key: 'state:' + st.name, re: rx(STATE_ALIAS[st.name] || [st.name]) })),
    ...(W ? Object.entries(W.countries).map(([iso, n]) => [iso, cleanCountry(n)]).filter(([, n]) => !SKIP_COUNTRY.has(n)).map(([iso, n]) => ({ key: 'country:' + iso, re: rx(COUNTRY_ALIAS[n] || [n]), min: (COUNTRY_ALIAS[n] || [n]).length > 1 ? 2 : 1 })) : []),
  ];
  const ment = mentions(m.articles, ents);
  ment['india-cpi'] = ment['imf-pcpipch-ind']; ment['fred-dexinus'] = ment['fx-usdinr']; ment['wb-brent'] = ment['fred-dcoilbrenteu']; ment['india-repo'] = mentions(m.articles, [{ key: 'r', re: /\brepo rate\b|\bMPC\b|\bmonetary policy\b/gi }]).r;
  const entUrl = k => k.startsWith('state:') ? `/state/${slugify(k.slice(6))}/` : k.startsWith('country:') ? `/country/${slugify(cleanCountry(W.countries[k.slice(8)]))}/` : `/s/${k}/`;
  const SHORTN = { 'imf-ngdp-rpch-ind': 'GDP growth', 'imf-pcpipch-ind': 'Inflation', 'imf-bca-ngdpd-ind': 'Current account', 'imf-ggxwdg-ngdp-ind': 'Government debt', 'imf-ggxcnl-ngdp-ind': 'Fiscal deficit', 'fx-usdinr': 'Rupee', 'fred-dcoilbrenteu': 'Brent crude', 'pw-strait-of-hormuz': 'Hormuz shipping', 'fred-dff': 'Fed funds rate', 'fx-usdcny': 'Yuan', 'fx-usdeur': 'Euro', 'india-repo': 'Repo rate', 'fred-dgs10': 'US 10-year yield' };
  const entName = k => k.startsWith('state:') ? k.slice(6) : k.startsWith('country:') ? cleanCountry(W.countries[k.slice(8)]) : SHORTN[k] || (byId[k]?.name || k).replace(/, US\$$|: India$/, '');
  // article -> data it mentions (for "Data in this story")
  m.storyData = {};
  for (const [k, hits] of Object.entries(ment)) for (const h of hits || []) (m.storyData[h.a.id] ||= []).push({ k, u: entUrl(k), t: entName(k), n: h.n, type: k.startsWith('state:') ? 'state' : k.startsWith('country:') ? 'country' : 'series' });
  for (const id in m.storyData) m.storyData[id] = [...new Map(m.storyData[id].map(x => [x.u, x])).values()].sort((a, b) => b.n - a.n).slice(0, 12);
  // articles join the data space: inline links to data pages, live cards for the series they discuss, and stories connected by shared subjects
  const REOF = Object.fromEntries(ents.map(e => [e.key, e.re]));
  const ALIASK = { 'india-cpi': 'imf-pcpipch-ind', 'fred-dexinus': 'fx-usdinr', 'wb-brent': 'fred-dcoilbrenteu' };
  for (const a of m.articles) {
    const indiaN = ((a.title + ' ' + a.html).match(/\bIndia(?:n|’s|'s)?\b/g) || []).length;
    const items = (m.storyData[a.id] || []).filter(x => !ALIASK[x.k] && (!/^imf-|^india-/.test(x.k) || indiaN >= 4));
    a.storyItems = items;
    a.linkedHtml = autolink(a.html, items.filter(x => !/^imf-/.test(x.k)).map(x => x.k), REOF, entUrl);
    a.dataCards = storyCards(items, SD, byId);
    a.places = items.filter(x => x.type !== 'series');
    const mine = new Set(items.map(x => x.k));
    a.connected = m.articles.filter(b => b.id !== a.id).map(b => [b, (m.storyData[b.id] || []).filter(x => mine.has(x.k))]).filter(([, sh]) => sh.length >= 2)
      .sort((x, y) => y[1].length - x[1].length || y[0].date.localeCompare(x[0].date)).slice(0, 5).map(([b, sh]) => ({ b, shared: sh.slice(0, 3).map(x => x.t) }));
    a.whatIf = items.some(x => /^(fred-dcoilbrenteu|fx-usdinr|india-repo|wb-dubai|wb-wti)$/.test(x.k));
  }
  const TOPIC_SERIES = {
    'money-finance': ['india-cpi', 'india-repo', 'fx-usdinr', 'nse-nifty-10-yr-benchmark-g-sec', 'nse-nifty-bank', 'fred-dff'],
    'trade-external-sector': ['fx-usdinr', 'imf-bca-ngdpd-ind', 'fred-dcoilbrenteu', 'pw-strait-of-hormuz', 'fx-usdcny', 'fred-dtwexbgs'],
    'public-finance': ['imf-ggxcnl-ngdp-ind', 'imf-ggxwdg-ngdp-ind', 'nse-nifty-10-yr-benchmark-g-sec', 'wb-urea', 'india-repo', 'fred-dcoilbrenteu'],
    'growth-jobs-industry': ['imf-ngdp-rpch-ind', 'nse-nifty-50', 'nse-nifty-infrastructure', 'wb-copper', 'wb-ironore', 'imf-ngdpdpc-ind'],
    'rural-economy-welfare': ['india-cpi', 'wb-urea', 'wb-dap', 'wb-rice', 'wb-wheat', 'wb-palm'],
    'energy-climate': ['fred-dcoilbrenteu', 'fred-dhhngsp', 'wb-coal', 'pw-strait-of-hormuz', 'wb-ngeu', 'nse-nifty-energy'],
    'world-geopolitics': ['pw-strait-of-hormuz', 'fred-dtwexbgs', 'fx-usdcny', 'wb-gold', 'fred-dgs10', 'pw-bab-el-mandeb-strait'],
  };
  const TOPIC_TOOLS = { 'money-finance': [['/rupee/', 'Rupee & rates'], ['/tools/emi/', 'EMI shock']], 'trade-external-sector': [['/rupee/', 'External sector'], ['/hormuz/', 'Shipping']], 'public-finance': [['/tools/budget-x-ray/', 'Budget X-Ray'], ['/maps/#debt', 'State debt map']],
    'growth-jobs-industry': [['/world/', 'World rankings'], ['/maps/#growth', 'Growth map']], 'rural-economy-welfare': [['/commodities/', 'Fertiliser & food prices'], ['/maps/#inflation', 'Inflation map']], 'energy-climate': [['/tools/pump-price/', 'Pump price'], ['/tools/shock-lab/', 'What if?']], 'world-geopolitics': [['/world/', 'World rankings'], ['/hormuz/', 'Chokepoints']] };
  m.topicData = {};
  for (const t of TOPIC_ORDER) {
    const ids = (TOPIC_SERIES[t] || []).filter(id => SD[id]);
    const cnt = {}; for (const a of m.articles.filter(a => a.topic === t)) for (const x of a.storyItems || []) { (cnt[x.k] ||= { ...x, n: 0 }).n++; }
    m.topicData[t] = { cards: storyCards(ids.map(k => ({ k, type: 'series' })), SD, byId, 6), tools: TOPIC_TOOLS[t] || [], subjects: Object.values(cnt).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 16) };
  }
  // network of co-mentions
  const nodeKeys = Object.entries(ment).filter(([k, h]) => h && h.length >= 2 && !/^(fred-dexinus|wb-brent|india-cpi)$/.test(k)).map(([k]) => k);
  const pair = {};
  for (const a of m.articles) { const ks = (m.storyData[a.id] || []).map(x => x.k).filter(k => nodeKeys.includes(k)); for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const key = [ks[i], ks[j]].sort().join('|'); pair[key] = (pair[key] || 0) + 1; } }
  const net = { nodes: nodeKeys.map(k => ({ id: k, name: entName(k), value: ment[k].length, url: entUrl(k), t: k.startsWith('state:') ? 'state' : k.startsWith('country:') ? 'country' : 'series' })),
    links: Object.entries(pair).filter(([, v]) => v >= 1).map(([k, v]) => { const [a, b] = k.split('|'); return { source: a, target: b, value: v }; }) };
  const posters = mapPosters(states, SC);
  const tapeBy = Object.fromEntries(tape.indicators.map(i => [TAPE_S[i.id], i]));
  const crumbsFor = c => `<a href="/explore/">Explore</a> › <a href="/explore/#series">${esc(c.group)}</a>`;
  for (const c of catalog) await write(`s/${c.id}/index.html`, P({ title: c.name, path: `/s/${c.id}/`, description: `${c.name}: ${c.unit}, ${c.freq}, ${c.first} to ${c.last}. Chart, history, what moves with it, and the articles that mention it.`, body: entitySeriesPage(c, SD[c.id], { catalog, corr, ment, byId, crumbsFor, tapeBy }) }));
  for (const st of states.states) await write(`state/${slugify(st.name)}/index.html`, P({ title: st.name, path: `/state/${slugify(st.name)}/`, description: `${st.name}: income, growth, inflation, debt and finances, ranked against every state, with similar states and related articles.`, body: statePage(st, { S: states, SC, ment, posters }) }));
  if (W) { const fxCodes = new Set(Object.keys(MK.fx?.rates || {}));
    for (const iso of Object.keys(W.countries)) { const n = cleanCountry(W.countries[iso]); await write(`country/${slugify(n)}/index.html`, P({ title: n, path: `/country/${slugify(n)}/`, description: `${n}: GDP, income per person, growth, inflation and debt, ranked among every economy, with India alongside.`, body: countryPage(iso, { W, SC, ment, year: BUILT.getUTCFullYear(), catalog, fxCodes }) })); }
    await write('explore/index.html', P({ title: 'Explore', path: '/explore/', description: 'Every series, state, country and article on the site, connected.', body: explorePage({ catalog, S: states, W, ment, articles: m.articles, net, unusual: UNUSUAL }) })); }
  // site-wide search index: [type, name, url, extra]
  const searchIdx = [
    ...TOOLS.map(t => ['t', t.kicker, t.url, t.title]),
    ...posters.map(p => ['m', `Map: ${p.kicker}`, `/maps/#${p.id}`, p.title]),
    ...catalog.map(c => ['s', c.name, `/s/${c.id}/`, c.group]),
    ...states.states.map(st => ['st', st.name, `/state/${slugify(st.name)}/`, 'State']),
    ...(W ? Object.values(W.countries).map(n => ['c', cleanCountry(n), `/country/${slugify(cleanCountry(n))}/`, 'Country']) : []),
    ...m.articles.map(a => ['a', a.title, a.url, `${TOPICS[a.topic].short} · ${a.date.slice(0, 10)}`]),
    ...TOPIC_ORDER.map(t => ['p', TOPICS[t].name, `/topic/${t}/`, 'Topic']), ['p', 'Explore everything', '/explore/', 'Directory and network'], ['p', 'Data API', '/api/', 'Download'],
  ];
  await write('api/search.json', JSON.stringify(searchIdx));
  const HUBSTATS = { series: catalog.length, states: states.states.length, countries: W ? Object.keys(W.countries).length : 0, articles: m.articles.length, links: Object.values(corr).reduce((a, b) => a + b.length, 0) / 2 + Object.values(ment).reduce((a, b) => a + (b ? b.length : 0), 0) + net.links.length };
  api['search'] = 'Site-wide search index: [type, name, url, detail]';
  await write('api/graph.json', JSON.stringify({ built: BUILT.toISOString(), nodes: { series: catalog.map(c => ({ id: c.id, name: c.name, group: c.group, url: `/s/${c.id}/` })), states: states.states.map(st => ({ name: st.name, url: `/state/${slugify(st.name)}/` })), countries: W ? Object.entries(W.countries).map(([iso, n]) => ({ iso, name: cleanCountry(n), url: `/country/${slugify(cleanCountry(n))}/` })) : [] }, articles: m.articles.map(a => ({ url: a.url, title: a.title, date: a.date.slice(0, 10), topic: a.topic, subjects: (a.storyItems || []).map(x => x.k), connected: (a.connected || []).map(c => c.b.url) })), correlations: corr, network: net }));
  api['graph'] = 'The whole data space as one graph: every series, state, country and article; which subjects each article discusses; correlations between all series; and the network of subjects discussed together';
  await write('api/catalog.json', JSON.stringify(catalog));
  // chart images at fixed URLs for embedding in WordPress posts (redrawn on every build)
  if (!process.env.SKIP_IMG) { try { execSync(`python3 scripts/render_charts.py ${OUT}`, { stdio: 'inherit', timeout: 900000 }); } catch (e) { console.warn('Chart images skipped:', e.message); } }
  await write('charts/index.html', P({ title: 'Chart workbench', path: '/charts/', description: `Plot any of ${catalog.length} series on Indian markets, currencies, commodities, rates and the world economy.`, body: workbenchPage(catalog, { pageHead }) }));
  api['catalog'] = `Catalogue of ${catalog.length} series; each is at /api/series/{id}.json`;
  if (MK) { await write('api/rupee.json', JSON.stringify(rupeeData(MK, tape))); api['rupee'] = 'Rupee page bundle: 15 currencies per US dollar (daily), US rates and dollar index, India repo and 10-year yield, external-sector indicators for India and 13 peers'; }
  await write('api/index.json', JSON.stringify({ site: BASE_URL, updated: BUILT.toISOString(), endpoints: Object.fromEntries(Object.entries(api).map(([k, v]) => [`${BASE_URL}/api/${k}.json`, v])) }, null, 1));


  await write('index.html', P({ path: '/', description: 'Independent analysis of India’s economy and the politics around it, with live macro data, policy tracking and tools.', body: home(m, tape, ledger) }));
  for (const a of m.articles) await write(`a/${a.slug}/index.html`, P({ title: a.title, description: a.excerpt, path: a.url, canonical: a.wpLink, active: a.topic, type: 'article', body: articlePage(a, m) }));
  for (const t of TOPIC_ORDER) await write(`topic/${t}/index.html`, P({ title: TOPICS[t].name, description: TOPICS[t].blurb, path: `/topic/${t}/`, active: t, body: topicPage(t, m) }));
  await write('series/index.html', P({ title: 'Series', path: '/series/', description: 'Questions followed across several articles.', body: seriesIndex(m) }));
  for (const s of m.series) await write(`series/${s.slug}/index.html`, P({ title: s.name, path: `/series/${s.slug}/`, description: s.description, body: seriesPage(s) }));
  await write('explainers/index.html', P({ title: 'Explainers', path: '/explainers/', description: 'Primers on Indian economics and policy.', body: explainersPage(m) }));
  await write('archive/index.html', P({ title: 'Archive and search', path: '/archive/', description: 'Search every article.', body: archivePage(m) }));
  if (false) await write('data/index.html', P({ title: 'India macro data', path: '/data/', description: 'CPI, repo rate, rupee, bond yields, Brent and the Nifty with sources.', body: dataHub(tape, m) }));
  if (false) for (const i of tape.indicators) await write(`data/${i.id}/index.html`, P({ title: i.label, path: `/data/${i.id}/`, description: i.definition, body: indicatorPage(i, m) }));
  await write('ledger/index.html', P({ title: 'Policy Ledger', path: '/ledger/', description: 'Policies tracked from announcement to measured outcome.', body: ledgerPage(ledger, m) }));
  await write('forecasts/index.html', P({ title: 'Forecast Book', path: '/forecasts/', description: 'Testable calls with probabilities, revisions and results.', body: forecastsPage(fc) }));
  await write('tools/shock-lab/index.html', P({ title: 'Scenario engine: what if?', path: '/tools/shock-lab/', description: 'Move oil, the rupee and the repo rate; see the pump price, your fuel bill, India’s import bill, the current account and your EMI change together.', body: scenarioPage({ MK, tape, pump: JSON.parse(await readFile('data/pump.json', 'utf8')), sc: JSON.parse(await readFile('data/scenario.json', 'utf8')), pageHead }) }));
  await write('tools/index.html', P({ title: 'Tools and data', path: '/tools/', description: 'Interactive tools on India’s economy built on official data.', body: toolsHub(HUBSTATS) }));
  await write('tools/budget-x-ray/index.html', P({ title: 'Budget X-Ray 2026-27', path: '/tools/budget-x-ray/', description: 'How far the Centre has got through its 2026-27 Budget: receipts, spending and the fiscal deficit against the full-year plan.', body: budgetPage(budget, { pageHead, findRelated, articles: m.articles }) }));
  await write('tools/india-by-state/index.html', P({ title: 'India by State', path: '/tools/india-by-state/', description: 'Indian states compared on income per person, growth, inflation, debt and interest burden, with sources.', body: statesPage(states, { pageHead }) }));
  if (false) await write('tools/two-chart-test/index.html', P({ title: 'The Two-Chart Test', path: '/tools/two-chart-test/', description: 'Common claims about India’s economy tested against two charts side by side.', body: twoChartPage(twocharts, { pageHead }) }));
  if (false) await write('tools/exposure/index.html', P({ title: 'Geoeconomics Exposure Map', path: '/tools/exposure/', description: 'India’s dependence on foreign suppliers for oil, fertiliser and China-sourced electronics, with a disruption calculator.', body: exposurePage(exposure, { pageHead, inrRate: tape.indicators.find(i => i.id === 'inr').latest.value }) }));
  if (MK) {
    await write('markets/index.html', P({ title: 'Markets', path: '/markets/', description: 'NSE indices, Nifty 50 heatmap, valuations, yield curves, currencies and live crypto.', body: marketsPage(MK, { pageHead }) }));
    await write('commodities/index.html', P({ title: 'Commodities', path: '/commodities/', description: 'Energy, metals, fertiliser and food prices with five-year ranges and comparison charts.', body: commoditiesPage(MK, { pageHead }) }));
    await write('rupee/index.html', P({ title: 'Rupee, rates and the external sector', path: '/rupee/', description: 'The rupee against the dollar and 14 currencies, the India–US interest-rate gap, and India’s current account, reserves, remittances and FDI against peers.', body: rupeePage(MK, tape, { pageHead }) }));
  }
  { const rp = tape.indicators.find(i => i.id === 'repo'); const ch = Math.round((rp.latest.value - rp.previous.value) * 100);
    await write('tools/emi/index.html', P({ title: 'EMI shock calculator', path: '/tools/emi/', description: 'What a repo rate change does to your home loan EMI or tenure.', body: emiPage({ pageHead, repo: { value: rp.latest.value.toFixed(2), change: `${ch > 0 ? '+' : ''}${ch} basis point`, date: longDate(rp.latest.released + 'T00:00:00Z') } }) })); }
  { const pump = JSON.parse(await readFile('data/pump.json', 'utf8')); const b = MK?.fredLast?.DCOILBRENTEU, ir = MK?.fxOut?.table.find(t => t.c === 'INR');
    await write('tools/pump-price/index.html', P({ title: 'What’s in a litre of petrol', path: '/tools/pump-price/', description: 'The Delhi petrol price broken into oil company price, central excise, dealer commission and VAT, with a calculator.', body: pumpPage(pump, { pageHead, brent: b ? { v: b.last[1], d: b.last[0] } : null, inr: ir?.last }) })); }
  await write('maps/index.html', P({ title: 'India in maps', path: '/maps/', description: 'Poster-style maps of India’s states: inflation, income, growth, debt, and each state’s economy as a country.', body: mapsPage(states, JSON.parse(await readFile('data/states_countries.json', 'utf8')), { pageHead }) }));
  if (MK?.imfWorld) await write('world/index.html', P({ title: 'India against the world', path: '/world/', description: 'Where India ranks among every economy in the IMF World Economic Outlook: GDP, income per person, growth, inflation, debt and the current account.', body: worldPage(MK.imfWorld, { pageHead, year: BUILT.getUTCFullYear() }) }));
  if (MK?.portwatch) await write('hormuz/index.html', P({ title: 'Chokepoint watch: Hormuz and the shipping lanes', path: '/hormuz/', description: 'Daily ship transits through the Strait of Hormuz, Bab el-Mandeb, Suez, the Cape of Good Hope and Malacca, from IMF PortWatch.', body: hormuzPage(MK, { pageHead }) }));
  if (MK) await write('terminal/index.html', P({ title: 'The Kakistocrat Terminal', path: '/terminal/', description: 'Every Indian and global market and macro number on one dense screen, with a command bar to chart any of 300 series.', body: terminalPage({ MK, tape, articles: m.articles, BUILT }) }));
  if (MK) await write('today/index.html', P({ title: 'India Today', path: '/today/', description: 'The Indian economy on one screen: inflation, rates, the rupee, markets, oil, the Budget, growth and the external balance.', body: todayPage({ pageHead, tape, budget, MK, BUILT }) }));
  await write('infographics/index.html', P({ title: 'India in pictures', path: '/infographics/', description: 'Interactive infographics: the Budget rupee, the GDP race, growth against inflation, debt and deficits.', body: infographicsPage({ pageHead, year: BUILT.getUTCFullYear(), basket: JSON.parse(await readFile('data/cpi_basket.json', 'utf8')), sc: JSON.parse(await readFile('data/states_countries.json', 'utf8')), statePos: states.states }) }));
  await write('chartle/index.html', P({ title: 'Chartle: the daily mystery chart', path: '/chartle/', description: 'Guess the economic series behind today’s chart in six tries.', body: chartlePage({ pageHead }) }));
  await write('api/index.html', P({ title: 'Data API', path: '/api/', description: 'Free JSON endpoints for every dataset on the site.', body: apiPage(api) }));
  await write('404.html', P({ title: 'Page not found', path: '/404', body: notFound() }));

  const idx = m.articles.map(a => ({ title: a.title, excerpt: a.excerpt, url: a.url, date: a.date.slice(0, 10), topic: a.topic, topicName: TOPICS[a.topic].short, color: TOPICS[a.topic].color, format: a.format, series: a.series[0]?.name || '' }));
  await write('search.json', JSON.stringify(idx));
  const urls = ['/', '/series/', '/explainers/', '/archive/', '/explore/', '/ledger/', '/forecasts/', '/tools/', '/today/', '/markets/', '/commodities/', '/rupee/', '/terminal/', '/hormuz/', '/world/', '/maps/', '/charts/', '/api/', '/tools/emi/', '/tools/pump-price/', '/chartle/', '/infographics/', '/tools/shock-lab/', '/tools/budget-x-ray/', '/tools/india-by-state/', ...TOPIC_ORDER.map(t => `/topic/${t}/`), ...m.series.map(s => `/series/${s.slug}/`), ...catalog.map(c => `/s/${c.id}/`), ...states.states.map(st => `/state/${slugify(st.name)}/`)];
  await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${BASE_URL}${u}</loc></url>`).join('')}</urlset>`);
  await write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`);
  await write('_redirects', ['/data/ /today/ 301', '/tools/two-chart-test/ /charts/ 301', '/tools/two-chart-test /charts/ 301', '/tools/exposure/ /tools/shock-lab/ 301', '/tools/exposure /tools/shock-lab/ 301', ...Object.entries(TAPE_S).map(([k, v]) => `/data/${k}/ /s/${v}/ 301`), ...Object.entries(TAPE_S).map(([k, v]) => `/data/${k} /s/${v}/ 301`)].join('\n') + '\n');
  await write('_headers', `/api/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=900\n/wp-kit/*\n  Access-Control-Allow-Origin: https://thekakisto.wordpress.com\n  Cache-Control: no-store\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/styles.css\n  Cache-Control: public, max-age=3600\n/app.js\n  Cache-Control: public, max-age=3600\n`);
  console.log(`Built ${m.articles.length} articles, ${m.series.length} series → ${OUT}/`);
}
main().catch(e => { console.error(e); process.exit(1); });
