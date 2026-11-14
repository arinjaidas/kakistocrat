// The Kakistocrat — static site builder.
// Pulls articles from the WordPress.com public API (thekakisto.wordpress.com),
// merges them with the data files in /data, and writes a static site to /dist.
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { budgetPage } from './lib/budget.mjs';
import { mpcPage, mpcData } from './lib/mpc.mjs';
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
import { rupeeStress, rupeeStressPath } from './lib/rupee-stress.mjs';
import { externalPage } from './lib/external.mjs';
import { tradePage, tradeBlock } from './lib/trade.mjs';
import { economyPage, IIP_ORDER, iipId } from './lib/economy.mjs';
import { loadCompanies, companyPage, companiesHub } from './lib/companies.mjs';
import { districtsPage } from './lib/districts.mjs';
import { hormuzStory } from './lib/story.mjs';
import { indicatorPage as conceptPage, heatTable, dashboardPage, readings, actuals, period } from './lib/indicators.mjs';
import { appendixFiles, appendixPage } from './lib/appendix.mjs';
import { rosette, ribbon } from './lib/guilloche.mjs';
import { myInflationPage, rupeeValuePage, policyRulePage, debtPathPage, calendarEvents, calendarPage } from './lib/tools.mjs';
import { scoreCalls, forecastsPage as fcPage } from './lib/forecasts.mjs';
import { seriesUpdate, writeYearReview } from './lib/year-review.mjs';
import { chronologyPage } from './lib/chronology.mjs';
import { capexAuditPage, capexAuditCsv } from './lib/capex-audit.mjs';
import { commissioningPage } from './lib/commissioning.mjs';
import { gettingToWorkPage } from './lib/getting-to-work.mjs';
import { chinaInputsData, chinaInputsCsv, chinaInputsPage } from './lib/china-inputs.mjs';
import { thaliData, thaliCsv, thaliPage } from './lib/thali.mjs';
import { dollarCushionCsv, dollarCushionPage } from './lib/dollar-cushion.mjs';
import { fcnrFinancingPage, fcnrCsv, financingCsv } from './lib/fcnr-financing.mjs';
import { outcomesPage } from './lib/outcome-scorecard.mjs';
import { writeOilWeekArchive } from './lib/oil-rupee-archive.mjs';
import { gstPassThroughPage } from './lib/gst-pass-through.mjs';
import { deskSnapshot, deskPage, deskArchive } from './lib/desk.mjs';
import { slugify, cleanCountry, mentions, correlations, seriesPage as entitySeriesPage, statePage, countryPage, explorePage, STATE_ALIAS, COUNTRY_ALIAS, SKIP_COUNTRY, SERIES_KW, rx, unusualMoves, movesHTML, autolink, storyCards } from './lib/entities.mjs';
let MK = null;

const SITE = 'thekakisto.wordpress.com';
const API = `https://public-api.wordpress.com/wp/v2/sites/${SITE}`;
const BASE_URL = process.env.SITE_URL || 'https://kakistocrat.pages.dev';
const OUT = 'dist';
const BUILT = new Date();

const TOPICS = {
  'money-finance':        { name: 'Money & finance',          short: 'Money',           color: '#1C7C99', blurb: 'Monetary policy, inflation, the rupee, banks and markets.' },
  'trade-external-sector':{ name: 'Trade & external sector',  short: 'Trade',           color: '#5F7F14', blurb: 'Trade deals, tariffs, the current account and capital flows.' },
  'public-finance':       { name: 'Public finance',           short: 'Public finance',  color: '#6D5BA8', blurb: 'Budgets, deficits, taxes and spending.' },
  'growth-jobs-industry': { name: 'Growth, jobs & industry',  short: 'Growth & jobs',   color: '#B87708', blurb: 'GDP, employment, investment and industrial policy.' },
  'rural-economy-welfare':{ name: 'Rural economy & welfare',  short: 'Rural & welfare', color: '#5E6B4E', blurb: 'Farm support, rural jobs, food security and local government.' },
  'energy-climate':       { name: 'Energy & climate',         short: 'Energy',          color: '#B5367A', blurb: 'Oil, power, fuel subsidies and the energy transition.' },
  'world-geopolitics':    { name: 'World & geopolitics',      short: 'World',           color: '#4B5563', blurb: 'Economies, conflicts and export controls beyond India.' },
};
const TOPIC_ORDER = Object.keys(TOPICS);
const FEATURED_SERIES = ['the-2026-oil-shock', 'the-politics-of-public-money', 'americas-tariff-reset'];
// Editorially selected companions only. These links do not retroactively change the canonical WordPress article.
const ARTICLE_RESEARCH = {
  1814: [['/research/fcnr-2026/', 'NRI deposit financing and RBI swap facility'], ['/desk/outcomes/', 'Five measured economic outcomes'], ['/desk/chronology/', 'Historical chronology'], ['/research/oil-rupee-weekly/', '52-week oil and rupee archive'], ['/desk/commissions/', 'Research pipeline']],
  1797: [['/what-if/gst-pass-through/', 'GST statutory rate pass-through'], ['/desk/india-year-in-review/public-money/', 'Historical public money timeline']],
  1799: [['/research/repo-transmission/', 'Reproduce RBI loan-rate transmission']],
  1803: [['/what-if/landed-cost/', 'Tariff landed-cost scenario'], ['/desk/india-year-in-review/tariffs/', 'Tariff policy timeline']],
  1804: [['/economy/divergence/', 'GDP contribution analysis']],
  1808: [['/desk/chronology/', 'Dated labour-rule milestones']],
  1809: [['/research/fy26-capex/', 'FY26 public capital spending audit']],
  1079: [['/research/fy26-capex/', 'Budget commitments versus outturn']],
  1097: [['/research/dollar-cushion/', 'RBI current account and financing ledger'], ['/research/fcnr-2026/', 'FCNR(B) deposit finance bridge']],
  1109: [['/research/dollar-cushion/', 'External account financing ledger']],
  1410: [['/what-if/landed-cost/', 'Product tariff cost calculator']],
  1081: [['/research/thali/', 'Ingredient-price model (wholesale, illustrative)']],
  1613: [['/research/china-inputs/', 'China-origin imports and supplier exposure']],
};
let HAS_CALLS = false, DESK = null;
export const TAPE_S = { cpi: 'india-cpi', repo: 'india-repo', inr: 'fx-usdinr', g10: 'nse-nifty-10-yr-benchmark-g-sec', brent: 'fred-dcoilbrenteu', nifty: 'nse-nifty-50' };
const TOOLS = [
  { url: '/desk/', kicker: 'The Daily Desk', title: 'What moved today', blurb: 'The day in numbers, written from the data: markets, releases, unusual moves, what is coming up, and the big picture on one page.' },
  { url: '/markets/', kicker: 'Markets', title: 'Indices, heatmap, rates and currencies', blurb: 'NSE closes for 28 indices, a Nifty 50 heatmap, valuations, yield curves, currencies and crypto.' },
  { url: '/companies/', kicker: 'Companies', title: 'The Nifty 500, company by company', blurb: 'A market map of India’s 500 largest listed companies and a page for each.' },
  { url: '/commodities/', kicker: 'Commodities', title: 'Energy, metals, fertilisers and food', blurb: '35 world prices with five-year ranges and comparisons.' },
  { url: '/terminal/', kicker: 'Terminal', title: 'Everything on one screen', blurb: 'Every market and macro number on one dense screen, with a command bar that charts any series.' },
  { url: '/economy/', kicker: 'Economy', title: 'India macro dashboard', blurb: 'Every headline indicator in one table: growth, industry, inflation, rates, credit, the budget and the external accounts.' },
  { url: '/economy/prices/', kicker: 'Prices', title: 'What’s in the inflation basket', blurb: 'The CPI basket by group, what is driving inflation, and the month’s biggest movers.' },
  { url: '/economy/budget/', kicker: 'Budget', title: 'The Union Budget, line by line', blurb: 'Receipts, spending and the deficit against the full-year plan, and where the Budget rupee comes from and goes.' },
  { url: '/external/', kicker: 'External', title: 'The rupee, the reserves and the price of dollars', blurb: 'The rupee against 14 currencies, weekly reserves, money-market rates, the rate gap, and the 2013 and 2026 FCNR(B) episodes.' },
  { url: '/trade/', kicker: 'Trade', title: 'Who India trades with, and what', blurb: 'Every partner and product since 2015 from UN Comtrade.' },
  { url: '/hormuz/', kicker: 'Shipping & oil', title: 'Hormuz and the shipping lanes', blurb: 'Daily ship counts through Hormuz, Bab el-Mandeb, Suez, the Cape and Malacca.' },
  { url: '/states/', kicker: 'States', title: 'India’s states compared', blurb: 'Income, growth, inflation and debt for every state, any two measures plotted together, and each state’s economy as a country.' },
  { url: '/districts/', kicker: 'Districts', title: 'India, district by district', blurb: '640 districts on one map: literacy, women at work, toilets, tap water, gas, the internet, stunting and anaemia.' },
  { url: '/world/', kicker: 'World', title: 'Where India ranks', blurb: 'Every economy ranked on size, income, growth, inflation and debt, the GDP race since 1990, and India among its peers.' },
  { url: '/what-if/', kicker: 'What if?', title: 'One shock, every consequence', blurb: 'Move oil, the rupee and the repo rate; see the pump price, your fuel bill, the import bill, the current account and your EMI change together.' },
  { url: '/research/fy26-capex/', kicker: 'Research', title: 'The FY26 capital spending audit', blurb: 'Original Budget, Revised Estimate and provisional accounts, source by source, in one reproducible comparison.' },
  { url: '/research/oil-rupee-weekly/', kicker: 'Historical archive', title: '52 weeks of oil, the rupee and trade', blurb: 'The original complete weekly retrospective, source dated and searchable, with EIA and Fed benchmark accounting.' },
  { url: 'https://thekakisto.wordpress.com/2026/11/14/india-economic-year-in-review-2025-2026-growth-jobs-inflation-capital-flows/', kicker: 'Annual investigation', title: 'India grew through a year of shocks. Who paid the bill?', blurb: 'A long-form annual investigation tying together prices, work, investment, public finances, oil, tariffs and the external account.' },
  { url: '/desk/outcomes/', kicker: 'Year-in-review', title: 'Five outcomes: evidence scorecard', blurb: 'Household prices, jobs, investment, fiscal execution and external resilience, each with a source date and a falsifiable next test.' },
  { url: '/research/china-inputs/', kicker: 'Trade research', title: 'India’s China-origin import exposure', blurb: 'The 2025 China share of India’s goods imports, HS chapter by chapter, from UN Comtrade.' },
  { url: '/research/thali/', kicker: 'Food research', title: 'Price of a thali: wholesale ingredients', blurb: 'Agmarknet modal-price snapshot turned into a transparent illustrative ingredient budget.' },
  { url: '/research/fcnr-2026/', kicker: 'External financing', title: 'The 2026 NRI dollar deposit bridge', blurb: 'Compare the RBI FCNR(B) swap facility with the half-year balance-of-payments financing table, without double counting bank deposits.' },
  { url: '/research/dollar-cushion/', kicker: 'External accounts', title: 'India’s dollar cushion', blurb: 'RBI September 2026 goods, services, income, transfers and financing in one reproducible ledger.' },
  { url: '/research/getting-to-work/', kicker: 'Field lab', title: 'The economics of getting to work', blurb: 'Compare job access after rent, commuting cash, travel time and care costs, with a reproducible survey framework.' },
  { url: '/desk/commissions/', kicker: 'Research queue', title: 'Nineteen investigations, tracked', blurb: 'Every commission from the historical blueprint, its published coverage and the empirical work outstanding.' },
  { url: '/what-if/pump-price/', kicker: 'Pump price', title: 'What’s in a litre of petrol', blurb: 'The Delhi pump price split into oil company price, excise, dealer commission and VAT.' },
  { url: '/charts/', kicker: 'Charts', title: 'Plot anything against anything', blurb: 'Overlay up to six series, transform, zoom, share and download.' },
  { url: '/explore/', kicker: 'Explore', title: 'Everything on the site, connected', blurb: 'Search, the directory of every series, state, country and company, and the data API.' },
  { url: '/stories/hormuz/', kicker: 'Data story', title: 'Hormuz, in numbers', blurb: 'The closure of the Strait of Hormuz told with live data.' },
];
// The site's eight front doors. Each section owns its tabs; the menu, sub-menu, footer and Explore are all drawn from this list.
const SECTIONS = [
  { name: 'Desk', url: '/desk/', blurb: 'What moved today, and the state of the economy', tabs: [['/desk/', 'Today'], ['/desk/calendar/', 'Calendar'], ['/desk/archive/', 'Every day'], ['/desk/india-year-in-review/', 'Year in review'], ['/desk/chronology/', 'Chronology'], ['/desk/commissions/', 'Research queue'], ['/desk/outcomes/', 'Five outcomes'], ['/research/oil-rupee-weekly/', '52-week archive']], match: ['/desk/', '/research/oil-rupee-weekly/'] },
  { name: 'Markets', url: '/markets/', blurb: 'Prices, valuations and India’s 500 largest companies', tabs: [['/markets/', 'Equities'], ['/markets/flows/', 'Flows'], ['/companies/', 'Companies'], ['/commodities/', 'Commodities'], ['/terminal/', 'Terminal']], match: ['/markets/', '/companies/', '/company/', '/commodities/', '/terminal/'] },
  { name: 'Economy', url: '/economy/', blurb: 'How fast factories, credit and prices are growing', tabs: [['/economy/', 'Dashboard'], ['/economy/activity/', 'Activity'], ['/economy/growth/', 'Growth'], ['/economy/industry/', 'Industry'], ['/economy/prices/', 'Inflation'], ['/economy/money/', 'Money & credit'], ['/economy/rates/', 'Rates'], ['/economy/mpc/', 'MPC'], ['/economy/budget/', 'Budget & debt'], ['/economy/divergence/', 'Growth & jobs'], ['/research/fy26-capex/', 'FY26 capex'], ['/research/thali/', 'Thali prices']], match: ['/economy/', '/research/fy26-capex/', '/research/thali/'] },
  { name: 'External', url: '/external/', blurb: 'India’s money and goods dealings with the world', tabs: [['/external/', 'Rupee & reserves'], ['/external/balance-of-payments/', 'Balance of payments'], ['/trade/', 'Trade'], ['/hormuz/', 'Shipping & oil'], ['/external/data/', 'Data appendix'], ['/research/china-inputs/', 'China imports'], ['/research/dollar-cushion/', 'Dollar cushion'], ['/research/fcnr-2026/', 'NRI deposit bridge']], match: ['/external/', '/trade/', '/hormuz/', '/research/china-inputs/', '/research/dollar-cushion/', '/research/fcnr-2026/'] },
  { name: 'Places', url: '/states/', blurb: 'Every state, district and country, compared', tabs: [['/states/', 'States'], ['/states/fiscal-room/', 'State budgets'], ['/districts/', 'Districts'], ['/world/', 'World']], match: ['/states/', '/state/', '/districts/', '/world/', '/country/'] },
  { name: 'What if?', url: '/what-if/', blurb: 'Shock oil, the rupee or interest rates and follow the effects', tabs: [['/what-if/', 'Scenario'], ['/what-if/my-inflation/', 'Your inflation'], ['/what-if/rupee-value/', 'Rupee value'], ['/what-if/policy-rule/', 'Policy rule'], ['/what-if/debt-path/', 'Debt path'], ['/what-if/pump-price/', 'Pump price'], ['/what-if/landed-cost/', 'Landed cost'], ['/what-if/gst-pass-through/', 'GST pass-through'], ['/research/getting-to-work/', 'Commute economics']], match: ['/what-if/', '/research/getting-to-work/'] },
  { name: 'Charts', url: '/charts/', blurb: 'Plot any series against any other', tabs: [], match: ['/charts/', '/s/'] },
  { name: 'Explore', url: '/explore/', blurb: 'Search everything, browse the directory, download the data', tabs: [['/explore/', 'Directory'], ['/api/', 'Data API']], match: ['/explore/', '/api/'] },
];
const sectionOf = path => SECTIONS.find(S => S.match.some(x => path.startsWith(x)));

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
async function write(path, html) { const CO = globalThis.__CONCEPT_OF; if (CO && typeof html === 'string' && !path.startsWith('api/series/') && path !== '_redirects') html = html.replace(/\/s\/([a-z0-9-]+)\//g, (m, id) => CO[id] || m); const f = join(OUT, path); await mkdir(dirname(f), { recursive: true }); await writeFile(f, html); }

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
const tickPeriod = (iso, label = '') => `<span class="p">${esc(isoOrMonth(iso))}${label ? ' · ' + esc(label) : ''}</span>`;
function tapeHTML(tape) {
  const MACRO = ['cpi', 'repo', 'g10'];
  const ticks = tape.indicators.filter(i => !MK || MACRO.includes(i.id)).map(i => {
    const d = i.latest.value - i.previous.value;
    const cls = Math.abs(d) < 1e-9 ? 'flat' : d > 0 ? 'up' : 'dn';
    const dTxt = i.unit === '%' ? `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d * 100).toFixed(0)}bp` : `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d / i.previous.value * 100).toFixed(1)}%`;
    const period = [i.latest.period, i.latest.status].filter(Boolean).join(' · ');
    return `<button class="tick" data-id="${i.id}" aria-expanded="false" aria-label="${esc(i.label)}: ${esc(tapeVal(i, i.latest.value))}, ${esc(period)}"><span class="k">${esc(i.short)}</span><span class="v">${esc(tapeVal(i, i.latest.value))}</span><span class="d ${cls}">${dTxt}</span><span class="p">${esc(period)}</span></button>`;
  }).join('');
  let mticks = '';
  if (MK) {
    const L = MK.dates.length - 1;
    const nseS = n => '/s/nse-' + n.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '/';
    const idx = (k, n, href = nseS(n)) => { const a = MK.series[n]; if (a?.[L] == null) return ''; const v = a[L], p = a[L - 1], c = p ? (v / p - 1) * 100 : 0; return `<a class="tick" href="${href}"><span class="k">${k}</span><span class="v">${v.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span><span class="d ${c > 0 ? 'up' : c < 0 ? 'dn' : 'flat'}">${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c).toFixed(2)}%</span>${tickPeriod(MK.dates[L], 'Close')}</a>`; };
    const fr = (k, id, unit, dec = 2, href = `/s/fred-${id.toLowerCase()}/`) => { const x = MK.fredLast?.[id]; if (!x) return ''; const c = x.prev ? unit === '%' ? (x.last[1] - x.prev[1]) * 100 : (x.last[1] / x.prev[1] - 1) * 100 : 0; return `<a class="tick" href="${href}"><span class="k">${k}</span><span class="v">${unit === '$' ? '$' : ''}${x.last[1].toFixed(dec)}${unit === '%' ? '%' : ''}</span><span class="d ${c > 0 ? 'up' : c < 0 ? 'dn' : 'flat'}">${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c).toFixed(unit === '%' ? 0 : 2)}${unit === '%' ? 'bp' : '%'}</span>${tickPeriod(x.last[0])}</a>`; };
    const inr = MK.fxOut?.table.find(t => t.c === 'INR');
    const g = MK.comm?.items.find(i => i.id === 'gold');
    const btc = MK.crypto?.bitcoin?.at(-1);
    mticks = idx('Nifty 50', 'Nifty 50') + idx('Bank Nifty', 'Nifty Bank') + idx('Midcap 100', 'NIFTY Midcap 100') + idx('India VIX', 'India VIX') +
      (inr?.last != null ? `<a class="tick" href="/s/fx-usdinr/"><span class="k">₹/$</span><span class="v">${inr.last.toFixed(2)}</span><span class="d ${inr.d1 > 0 ? 'dn' : inr.d1 < 0 ? 'up' : 'flat'}">${inr.d1 > 0 ? '+' : inr.d1 < 0 ? '−' : ''}${Math.abs(inr.d1 || 0).toFixed(2)}%</span>${tickPeriod(MK.fxOut.date, 'Reference')}</a>` : '') +
      fr('Brent', 'DCOILBRENTEU', '$', 2) + fr('WTI', 'DCOILWTICO', '$', 2) +
      (g?.cur != null ? `<a class="tick" href="/s/wb-gold/"><span class="k">Gold</span><span class="v">$${Math.round(g.cur).toLocaleString('en-IN')}</span><span class="d ${g.mm > 0 ? 'up' : 'dn'}">${g.mm > 0 ? '+' : '−'}${Math.abs(g.mm).toFixed(1)}% m/m</span>${tickPeriod(MK.comm.month, 'Monthly average')}</a>` : '') +
      fr('US 10Y', 'DGS10', '%') + fr('US 2Y', 'DGS2', '%') + fr('Dollar idx', 'DTWEXBGS', '', 1) +
      (btc ? `<a class="tick" href="/s/crypto-bitcoin/"><span class="k">BTC</span><span class="v">$${btc[1].toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>${tickPeriod(btc[0], 'Daily snapshot')}</a>` : '');
  }
  return `<div class="tape" role="region" aria-label="India markets and macro tape"><div class="wrap tape-wrap"><span class="tape-label">India tape</span><div class="tape-viewport"><div class="tape-track">${ticks}${mticks}<span class="tape-gap"></span><span class="tape-dup" aria-hidden="true" inert>${ticks}${mticks}</span><span class="tape-gap"></span></div></div><a class="tape-more" href="/markets/">Markets →</a></div></div>`;
}

function layout({ title, description = '', path = '/', body, canonical, tape, active = '', type = 'website', ogImage, jsonld }) {
  // Older pages (pageHead) get the same 'Section · Tab' label as the indicator pages, from the page's place in SECTIONS.
  if (body && body.includes('<div class="mk-top"><div class="wrap">')) body = body.replace('<div class="mk-top"><div class="wrap">', `<div class="mk-top ip-top ph-top">${ribbon({ cls: 'ip-rib' })}<div class="wrap">`);
  if (body && body.includes('ph-top')) { const S = sectionOf(path), tab = S && S.tabs.filter(([h]) => path === h || (h !== S.url && path.startsWith(h))).sort((a, b) => b[0].length - a[0].length)[0];
    if (S && tab) body = body.replace(/(<div class="mk-top ip-top ph-top">[\s\S]*?<span class="kicker">)[\s\S]*?(<\/span>)/, `$1${S.name} · ${tab[1].replace(/&/g, '&amp;')}$2`); }
  const full = title ? `${title} · The Kakistocrat` : 'The Kakistocrat · A deeper look at economics and politics';
  const nav = TOPIC_ORDER.map(s => `<a href="/topic/${s}/"${active === s ? ' aria-current="page"' : ''}>${esc(TOPICS[s].short)}</a>`).join('');
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical || BASE_URL + path)}">
<meta property="og:title" content="${esc(title || 'The Kakistocrat')}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${esc(BASE_URL + path)}"><meta property="og:image" content="${ogImage ? BASE_URL + ogImage : `${BASE_URL}/og/${ogSlug(path)}.png`}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${ogImage ? BASE_URL + ogImage : `${BASE_URL}/og/${ogSlug(path)}.png`}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css?v=${BUILT.getTime()}"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#17202C">${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}<script>(function(){var M=null;function load(){return M||(M=fetch('/api/search.json').then(function(r){return r.json()}).then(function(s){var m={};s.forEach(function(x){if(/^(co|st|c|s)$/.test(x[0])){m[x[1].toLowerCase()]=x[2];if(x[0]==='co')m[x[1].replace(/ \([^)]*\)$/,'').toLowerCase()]=x[2];}});return m;}));}
function wrap(e){var o=e.init;try{var sc=getComputedStyle(document.body).getPropertyValue('--sec').trim()||'#17202C';e.registerTheme('kk',{color:[sc,'#17202C','#B5367A','#1C7C99','#B87708','#6D5BA8','#5E6B4E','#7B4B2A'],textStyle:{fontFamily:'IBM Plex Sans, system-ui, sans-serif'},tooltip:{backgroundColor:'#17202C',borderWidth:0,textStyle:{color:'#fff',fontSize:12}},legend:{textStyle:{color:'#3A3E44'}},categoryAxis:{axisLine:{lineStyle:{color:'#C9CFC3'}},axisLabel:{color:'#555A61'}},valueAxis:{splitLine:{lineStyle:{color:'#E6EAE2'}},axisLabel:{color:'#555A61'}},timeAxis:{splitLine:{show:false},axisLabel:{color:'#555A61'}}});}catch(x){}e.init=function(el,th,op){var c=o.call(this,el,th||'kk',op);try{if(!(el&&el.closest&&el.closest('.term'))){var so=c.setOption,SC=getComputedStyle(document.body).getPropertyValue('--sec').trim();if(SC){var hex=SC.replace('#',''),rgb=[0,2,4].map(function(i){return parseInt(hex.substr(i,2),16)}).join(',');c.setOption=function(op2){try{var ss=op2&&op2.series;ss=Array.isArray(ss)?ss:ss?[ss]:[];var f=ss[0];if(f&&(f.type==='line'||f.type==='bar'||!f.type)){['lineStyle','itemStyle'].forEach(function(k){if(f[k]&&typeof f[k].color==='string'&&/^#17202c$/i.test(f[k].color))f[k].color=SC;});if(f.areaStyle&&typeof f.areaStyle.color==='string'&&f.areaStyle.color.indexOf('rgba(23,32,44,')===0)f.areaStyle.color=f.areaStyle.color.replace('23,32,44',rgb);if(f.areaStyle&&f.areaStyle.color&&f.areaStyle.color.colorStops)f.areaStyle.color.colorStops.forEach(function(q){if(typeof q.color==='string')q.color=q.color.replace('23,32,44',rgb);});}}catch(z){}return so.apply(this,arguments);};}}}catch(y){}try{if(el&&el.closest&&el.closest('.wb,.term,#en-chart,#co-chart,#ds-map,#ex-net,[data-noclick]'))return c;c.on('click',function(p){if(p.componentType!=='series')return;if(p.data&&p.data.s&&/^[A-Z0-9&-]+$/.test(p.data.s)){location.href='/company/'+p.data.s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-')+'/';return;}var keys=[p.data&&p.data.name,p.name,p.seriesName];if(p.seriesType==='heatmap'){var y=(c.getOption().yAxis||[])[0];if(y&&y.data&&p.value)keys.unshift(y.data[p.value[1]]);}load().then(function(m){for(var i=0;i<keys.length;i++){var k=keys[i];if(k&&m[String(k).toLowerCase()]){location.href=m[String(k).toLowerCase()];return;}}});});}catch(err){}return c;};}
var _e;Object.defineProperty(window,'echarts',{configurable:true,get:function(){return _e},set:function(v){_e=v;Promise.resolve().then(function(){if(v&&v.init&&!v.__k){v.__k=1;wrap(v);}});}});
var CARDS={'Rupees per dollar':'/s/fx-usdinr/','Brent crude':'/s/fred-dcoilbrenteu/','US 10-year':'/s/fred-dgs10/','Bitcoin':'/s/crypto-bitcoin/','Foreign exchange reserves':'/s/rbi-fx-total/','Record high':'/s/rbi-fx-total/','Gold in reserves':'/s/rbi-fx-gold/','Current account':'/s/imf-bca-ngdpd-ind/','3-month forward':'/s/rbi-fwd3m/','10-year G-Sec':'/s/rbi-gsec10/','Hormuz':'/s/pw-strait-of-hormuz/','Bab el-Mandeb':'/s/pw-bab-el-mandeb-strait/','Suez':'/s/pw-suez-canal/','Cape of Good Hope':'/s/pw-cape-of-good-hope/','Malacca':'/s/pw-malacca-strait/','Brent, daily':'/s/fred-dcoilbrenteu/','WTI, daily':'/s/fred-dcoilwtico/','Henry Hub':'/s/fred-dhhngsp/','India’s exports to':'/trade/','India’s imports from':'/trade/','Balance':'/trade/','Pump price':'/what-if/pump-price/'};
addEventListener('DOMContentLoaded',function(){document.querySelectorAll('div.mk-card').forEach(function(c){if(c.querySelector('a'))return;var l=(c.querySelector('.lbl')||{}).textContent||'';for(var k in CARDS){if(l.indexOf(k)===0&&CARDS[k]!==location.pathname){c.setAttribute('data-href',CARDS[k]);c.style.cursor='pointer';c.title='Open the data page';break;}}});});
if('serviceWorker' in navigator)addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});addEventListener('load',function(){try{var t=+localStorage.getItem('ogdPing')||0;if(Date.now()-t<18e5)return;localStorage.setItem('ogdPing',Date.now());}catch(e){}setTimeout(function(){fetch('/api/ogd/refresh',{keepalive:true}).catch(function(){});},4000);});
document.addEventListener('click',function(ev){var t=ev.target.closest&&ev.target.closest('[data-href]');if(!t)return;var a=ev.target.closest('a,button,select,input');if(a&&t.contains(a))return;ev.preventDefault();location.href=t.getAttribute('data-href');});})();</script><link rel="alternate" type="application/rss+xml" title="The Kakistocrat" href="https://${SITE}/feed/">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2315171A'/%3E%3Ctext x='16' y='23' font-family='Georgia' font-size='20' fill='%23fff' text-anchor='middle'%3EK%3C/text%3E%3C/svg%3E">
</head><body class="sec-${(sectionOf(path)?.name || 'read').toLowerCase().replace(/[^a-z]+/g, '')}"${TOPICS[active] ? ` style="--sec:${TOPICS[active].color};--sec-wash:color-mix(in srgb, ${TOPICS[active].color} 7%, #fff)"` : ''}>
<a class="sr" href="#main">Skip to content</a>
<header class="topbar"><div class="wrap">
<a class="brand" href="/">The Kakistocrat<small>Economics · Politics · Policy</small></a>
<button class="menu-btn" aria-expanded="false" aria-controls="nav">Sections</button>
<nav class="nav" id="nav" aria-label="Topics">${nav}</nav>
<nav class="toolsnav" aria-label="Data">${SECTIONS.map(S => `<a href="${S.url}"${sectionOf(path) === S ? ' aria-current="page"' : ''}>${esc(S.name)}</a>`).join("")}<a href="/explore/" data-qs class="qs-btn" title="Search everything (/ or ⌘K)">Search <kbd>/</kbd></a><a class="cta" href="https://${SITE}/#subscribe">Subscribe</a></nav>
</div></header>
${tapeHTML(tape)}
${(() => { const S = sectionOf(path); if (!S || S.tabs.length < 2) return ''; const cur = [...S.tabs].sort((a, b) => b[0].length - a[0].length).find(([u]) => path.startsWith(u) || (u === '/companies/' && path.startsWith('/company/'))); return `<nav class="subnav" aria-label="${esc(S.name)}"><div class="wrap"><span class="sub-sec">${esc(S.name)}</span>${S.tabs.map(([u, t]) => `<a href="${u}"${cur && cur[0] === u ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('')}<span class="sub-hint">Press / to search everything</span></div></nav>`; })()}
<main id="main">${body}</main>
<footer class="foot"><div class="wrap foot-grid">
<div><div class="brandline">The Kakistocrat</div><p>Independent analysis of India’s economy and the politics around it, by Arinjai Das. Articles are published on <a href="https://${SITE}/" style="text-decoration:underline">thekakisto.wordpress.com</a> and appear here automatically.</p><p class="meta" style="margin-top:12px">Site built ${esc(longDate(new Date(BUILT.getTime() + 330 * 60000).toISOString()))}</p></div>
<div><h4>Topics</h4><ul>${TOPIC_ORDER.map(s => `<li><a href="/topic/${s}/">${esc(TOPICS[s].name)}</a></li>`).join('')}</ul></div>
<div><h4>Read</h4><ul><li><a href="/series/">Series</a></li><li><a href="/desk/india-year-in-review/">Year in review</a></li><li><a href="/archive/">Archive</a></li><li><a href="/archive/#explainers">Explainers</a></li><li><a href="/stories/hormuz/">Data stories</a></li><li><a href="/ledger/">Policy Ledger</a></li><li><a href="/desk/chronology/">Chronology</a></li><li><a href="/desk/commissions/">Research queue</a></li><li><a href="/research/fy26-capex/">Capex audit</a></li><li><a href="/research/getting-to-work/">Commute research lab</a></li><li><a href="/research/china-inputs/">China import map</a></li><li><a href="/research/thali/">Thali research</a></li><li><a href="/research/dollar-cushion/">Dollar cushion</a></li><li><a href="/research/fcnr-2026/">NRI dollar deposit bridge</a></li><li><a href="/desk/outcomes/">Annual outcome scorecard</a></li><li><a href="https://thekakisto.wordpress.com/2026/11/14/india-economic-year-in-review-2025-2026-growth-jobs-inflation-capital-flows/">Annual economic investigation</a></li><li><a href="/research/oil-rupee-weekly/">52-week historical archive</a></li><li><a href="https://${SITE}/corrections-and-methodology/">Corrections policy</a></li>${HAS_CALLS ? '<li><a href="/forecasts/">Forecast Book</a></li>' : ''}<li><a href="https://${SITE}/about/">About</a></li><li><a href="https://${SITE}/contact/">Contact</a></li></ul></div>
<div><h4>Data</h4><ul>${SECTIONS.map(S => `<li><a href="${S.url}">${esc(S.name)}</a></li>`).join('')}<li><a href="https://${SITE}/feed/">RSS</a></li></ul></div>
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
const pageHead = (kick, title, p, cards = '') => `<div class="mk-top ip-top ph-top">${ribbon({ cls: 'ip-rib' })}<div class="wrap"><header class="mk-head"><div><span class="kicker">${kick}</span><h1>${esc(title)}</h1>${p ? `<p class="dek sm">${p}</p>` : ''}</div></header>${cards ? `<div class="mk-cards">${cards}</div>` : ''}</div></div>`;

// ---------------------------------------------------------------- pages
function home(m, tape, ledger, X = {}) {
  const { SD = {}, byId = {} } = X, CO = globalThis.__CONCEPT_OF || {}, url = id => CO[id] || `/s/${id}/`;
  const A = m.articles, lead = A[0], latest = A.slice(1, 7);
  const byTopic = Object.fromEntries(TOPIC_ORDER.map(t => [t, A.filter(a => a.topic === t)]));
  const spark = (v, up) => { const s = v.slice(-60), lo = Math.min(...s), hi = Math.max(...s), W = 100, H = 28; return `<svg class="hn-sp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${s.map((x, i) => `${i ? 'L' : 'M'}${(i / Math.max(1, s.length - 1) * W).toFixed(1)},${(H - 2 - (hi === lo ? .5 : (x - lo) / (hi - lo)) * (H - 4)).toFixed(1)}`).join('')}" fill="none" stroke="#17202C" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`; };
  const NUMS = [['india-cpi', 'Inflation (CPI)', '%', '/economy/prices/'], ['india-repo', 'Repo rate', '%', '/economy/rates/'], ['rbi-gsec10', '10-year G-Sec', '%', '/economy/rates/#gsec'], ['fx-usdinr', 'Rupee per dollar', '', '/external/', -1],
    ['nse-nifty-50', 'Nifty 50', '', '/markets/', 1], ['rbi-fx-total', 'FX reserves', 'bn', '/external/#xt-res', 1], ['iip-general', 'Industrial output', '%', '/economy/industry/'], ['fred-dcoilbrenteu', 'Brent crude', '$', url('fred-dcoilbrenteu'), -1]];
  const nums = NUMS.filter(([id]) => SD[id] && byId[id]).map(([id, label, u, href, inverse]) => {
    const meta = byId[id], r = readings(meta, SD[id]); if (!r) return ''; const A_ = actuals(meta, SD[id]);
    const v = u === 'bn' ? `$${(r.last / 1000).toFixed(1)}bn` : u === '$' ? `$${r.last.toFixed(2)}` : r.last >= 1000 ? Math.round(r.last).toLocaleString('en-IN') : r.last.toFixed(2) + (u === '%' ? '%' : '');
    const ch = r.dPrev == null ? '' : r.rate ? `${r.dPrev > 0 ? '+' : r.dPrev < 0 ? '−' : '±'}${Math.round(Math.abs(r.dPrev) * 100)}bp` : `${r.dPrev > 0 ? '+' : r.dPrev < 0 ? '−' : '±'}${Math.abs(r.dPrev).toFixed(1)}%`;
    const good = (r.dPrev ?? 0) * (inverse || 0) > 0, bad = (r.dPrev ?? 0) * (inverse || 0) < 0;
    const tint = href.startsWith('/external') ? '#4FB3CF' : href.startsWith('/markets') || href.startsWith('/s/') ? '#A8B68C' : '#F0B23E';
    return `<a class="hn" href="${href}" style="--c:${tint}"><span class="hn-l">${esc(label)}</span><span class="hn-v">${v}</span><span class="hn-c ${good ? 'up' : bad ? 'dn' : ''}">${ch}<em>${esc(period(r.at, meta.freq))}</em></span>${spark(A_.v, A_.v.at(-1) >= A_.v.at(-Math.min(A_.v.length, 60)))}</a>`; }).join('');
  const REL = ['india-cpi', 'wpi', 'iip-general', 'rbi-credit-yoy', 'rbi-m3-yoy', 'in-exports', 'in-imports', 'oil-crude-bill', 'oil-consumption-yoy', 'rbi-cd-ratio', 'rbi-call'].filter(id => SD[id] && byId[id])
    .map(id => ({ id, m: byId[id], r: readings(byId[id], SD[id]) })).filter(x => x.r).sort((a, b) => b.r.at.localeCompare(a.r.at)).slice(0, 8);
  const fv = (x, mm) => x == null ? '—' : mm.unit === 'US$ mn' ? `$${(x / 1000).toFixed(1)}bn` : /^US\$ bn/.test(mm.unit) ? `$${x.toFixed(1)}bn` : (Math.abs(x) >= 1000 ? Math.round(x).toLocaleString('en-IN') : x.toFixed(2)) + (/%/.test(mm.unit) ? '%' : '');
  const rel = REL.map(({ id, m: mm, r }) => `<a class="hr" href="${url(id)}"><span class="hr-n">${esc(mm.short || mm.name)}</span><span class="hr-p">${esc(period(r.at, mm.freq))}</span><span class="hr-v">${fv(r.last, mm)}</span><span class="hr-o">${fv(r.prev, mm)}</span></a>`).join('');
  const topics = TOPIC_ORDER.map(t => { const it = byTopic[t].filter(a => a !== lead && !latest.includes(a)).slice(0, 3); if (!it.length) return ''; return `<div class="ht" style="--desk:${TOPICS[t].color}"><a class="ht-h" href="/topic/${t}/"><span class="dot"></span>${esc(TOPICS[t].name)}<b>→</b></a>${it.map(a => `<a class="ht-a" href="${a.url}">${esc(a.title)}<span>${esc(shortDate(a.date))}</span></a>`).join('')}</div>`; }).join('');
  const featured = FEATURED_SERIES.map(slug => m.series.find(s => s.slug === slug)).filter(Boolean);
  const upd = BUILT.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  return `<div class="hp">
<section class="hp-top">${rosette({ cls: "hp-ros" })}<div class="wrap"><div class="hp-head"><h1>India’s economy, in data</h1><p>Every headline number, updated from the RBI, MoSPI, NSE and the government’s open-data platform as it is released, with analysis of what it means. <span class="meta">Updated ${esc(upd)} IST</span></p></div>
  <div class="hn-grid">${nums}</div>
  <p class="hp-more"><a href="/economy/">All indicators on the macro dashboard</a></p><script>(function(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.querySelectorAll('.hn-v').forEach(function(el,i){var t=el.textContent,m=t.match(/[\d,]+(\.\d+)?/);if(!m)return;var end=parseFloat(m[0].replace(/,/g,'')),dec=(m[1]||'').length-1,pre=t.slice(0,m.index),post=t.slice(m.index+m[0].length),t0=null,D=1100+i*60;function f(v){return pre+v.toLocaleString('en-IN',{minimumFractionDigits:Math.max(0,dec),maximumFractionDigits:Math.max(0,dec)})+post}function step(ts){t0=t0||ts;var k=Math.min(1,(ts-t0)/D),e=1-Math.pow(1-k,3);el.textContent=f(end*e);if(k<1)requestAnimationFrame(step);else el.textContent=t}requestAnimationFrame(step)})})();</script><div class="live"><span><span class="dot"></span>Live</span><span>Bitcoin <b data-live="BTC-USD">…</b></span><span>Ether <b data-live="ETH-USD">…</b></span><small>Coinbase, in US$; change over 24 hours. Indian market data are end of day.</small></div><script src="/live.js" defer></script></div></section>
<div class="wrap hp-main">
 <section class="hp-col hp-analysis"><h2 class="hp-h">Analysis</h2>
  <a class="hp-lead" href="${lead.url}">${kicker(lead)}${fmtBadge(lead)}<h3>${esc(lead.title)}</h3><p>${esc(lead.excerpt)}</p><span class="meta">Arinjai Das · ${esc(longDate(lead.date))} · ${lead.minutes} min read</span></a>
  <div class="hp-list">${latest.map(a => `<a class="hp-li" href="${a.url}">${kicker(a)}${fmtBadge(a)}<h4>${esc(a.title)}</h4><span class="meta">${esc(shortDate(a.date))} · ${a.minutes} min</span></a>`).join('')}</div>
  <p class="hp-more"><a href="/archive/">Every article →</a></p></section>
 <aside class="hp-col hp-rail">
  <section><h2 class="hp-h">Coming up <a href="/desk/calendar/">Calendar →</a></h2>${(() => { const nx = (globalThis.__EVENTS || []).find(e => e.kind === 'official' || /CPI|GDP|IIP|WPI/.test(e.name)); return nx ? `<p class="hp-cd" data-at="${nx.date}T${nx.time || '16:00'}:00+05:30">${esc(nx.name)}${nx.ref ? ' for ' + esc(nx.ref) : ''} in <b>…</b></p><script>(function(){var el=document.querySelector('.hp-cd');if(!el)return;var t=Date.parse(el.dataset.at),b=el.querySelector('b');function f(){var d=t-Date.now();if(d<=0){b.textContent='now';return}var D=Math.floor(d/864e5),H=Math.floor(d%864e5/36e5),M=Math.floor(d%36e5/6e4);b.textContent=(D?D+'d ':'')+H+'h '+M+'m';}f();setInterval(f,30000)})();</script>` : ''; })()}<div class="hr-t">${(globalThis.__EVENTS || []).filter(e => e.rule !== 'weekday' && !/Weekly Statistical/.test(e.name)).slice(0, 6).map(e => `<a class="hr hc" href="${e.url}"><span class="hr-n">${esc(e.name)}${e.ref ? ` <em>${esc(e.ref)}</em>` : ''}</span><span class="hr-p">${esc(new Date(e.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }))}</span><span class="hr-v">${esc(e.time || '')}</span></a>`).join('')}</div></section>
  <section><h2 class="hp-h">Latest data</h2><div class="hr-t"><div class="hr hr-hd"><span class="hr-n">Indicator</span><span class="hr-p">Period</span><span class="hr-v">Latest</span><span class="hr-o">Prior</span></div>${rel}</div></section>
  <a class="hp-desk" href="/desk/india-year-in-review/"><span class="kicker" style="color:#E3A9C6">India’s year in review</span><b>What shaped India’s economy</b><span>Eight timelines, from tariffs and oil to jobs and household bills →</span></a>
  <a class="hp-desk" href="https://thekakisto.wordpress.com/2026/11/14/india-economic-year-in-review-2025-2026-growth-jobs-inflation-capital-flows/"><span class="kicker" style="color:#E3A9C6">Annual economic investigation</span><b>India grew through a year of shocks. Who paid the bill?</b><span>Evidence across eight series and five economic outcomes →</span></a>
  <a class="hp-desk" href="/desk/"><span class="kicker" style="color:#E3A9C6">The Daily Desk${DESK ? ' · ' + esc(longDate(DESK.date + 'T00:00:00Z')) : ''}</span><b>What moved today, and why</b><span>Markets, rates and the releases of the day, written up every evening →</span></a>
  ${MK?.unusual?.length ? `<div class="module"><span class="kicker">Unusual moves</span><h3>What just moved more than usual</h3><ul class="mini-moves">${MK.unusual.slice(0, 6).map(u => `<li><a href="/s/${u.id}/">${esc(u.name)}</a><span class="${u.ch > 0 ? 'up' : 'dn'}">${u.ch > 0 ? '+' : '−'}${Math.abs(u.ch).toFixed(u.rate ? 2 : 1)}${u.rate ? ' pts' : '%'}</span></li>`).join('')}</ul><a class="more" href="/explore/">Explore everything →</a></div>` : ''}
 </aside>
</div>
<div class="wrap"><section class="hp-sec"><h2 class="hp-h">By topic</h2><div class="ht-grid">${topics}</div></section>
 <section class="hp-sec"><h2 class="hp-h">Series <a href="/series/">All series →</a></h2><div class="series-strip hp-strip">${featured.map(s => `<a class="series-card" href="/series/${s.slug}/"><span class="n">${s.items.length} parts · latest ${esc(shortDate(s.items.at(-1).date))}</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p></a>`).join('')}</div></section></div>
<section class="tools-band"><div class="wrap"><h2 class="hp-h" style="color:#fff">Find your way into the data</h2><div class="hp-secs">${SECTIONS.map(S => `<a href="${S.url}"><b>${esc(S.name)}</b><span>${esc(S.blurb)}</span></a>`).join('')}</div></div></section>
</div>`;
}

function articlePage(a, m) {
  const t = TOPICS[a.topic];
  const sameTopic = m.articles.filter(x => x.topic === a.topic && x.id !== a.id).slice(0, 5);
  const researchCompanions = ARTICLE_RESEARCH[a.id] || [];
  const seriesBoxes = a.series.map(s => { const S = m.series.find(x => x.slug === s.slug); if (!S) return ''; return `<aside class="series-box"><span class="kicker">Part of a series</span><h2 style="margin:6px 0 4px;font:500 24px/1.2 var(--serif)"><a href="/series/${S.slug}/">${esc(S.name)}</a></h2><p class="dek sm">${esc(S.description)}</p><ol>${S.items.map(x => `${x.id === a.id ? `<li class="here"><span>${esc(x.title)}</span> <small>(you are reading this)</small></li>` : `<li><a href="${x.url}">${esc(x.title)}</a></li>`}`).join('')}</ol></aside>`; }).join('');
  return `<div class="wrap"><article class="art">
<div>
 <header class="art-head"><a href="/topic/${a.topic}/" class="kicker desk" style="--desk:${t.color}">${esc(t.name)}</a>${fmtBadge(a)}
 <h1>${esc(a.title)}</h1><p class="dek">${esc(a.excerpt)}</p>
 <div class="byline"><span>By <b>Arinjai Das</b></span><span>${esc(longDate(a.date))}</span><span>${a.minutes} min read</span><a href="${esc(a.wpLink)}">Comment or subscribe on WordPress →</a></div></header>
 <div class="prose">${a.linkedHtml || a.html}</div>
 ${researchCompanions.length ? `<section class="story-space"><div class="ss-head"><span class="kicker">Explore the evidence</span><a href="/desk/chronology/">Full chronology</a></div><div class="ss-places"><span>Research companions</span><div class="en-chips">${researchCompanions.map(([u, label]) => `<a href="${esc(u)}">${esc(label)}</a>`).join('')}</div></div><p class="meta">The research tools have their own observation periods and assumptions. Check the source vintage before comparing them with this article.</p></section>` : ''}
 ${a.dataCards || (a.places || []).length ? `<section class="story-space"><div class="ss-head"><span class="kicker">${a.dataFallback ? `Data on ${esc(TOPICS[a.topic].short.toLowerCase())}` : 'The data behind this story'}</span><a href="/explore/">Explore everything →</a></div>
  ${a.dataCards ? `<div class="sd-cards">${a.dataCards}</div>` : ''}
  ${(a.places || []).length ? `<div class="ss-places"><span>Places in this story</span><div class="en-chips">${a.places.map(x => `<a href="${x.u}" class="sd-${x.type}">${esc(x.t)}</a>`).join('')}</div></div>` : ''}
  ${(a.topicTools || []).length ? `<div class="ss-places"><span>Dashboards</span><div class="en-chips">${a.topicTools.map(([u, n]) => `<a href="${u}">${esc(n)}</a>`).join('')}</div></div>` : ''}
  ${a.whatIf ? `<a class="ss-whatif" href="/what-if/"><b>What if?</b> Push oil, the rupee or the repo rate further and see the pump price, the import bill and your EMI move →</a>` : ''}
 </section>` : ''}
 ${seriesBoxes}
 <p class="origin-note">First published on <a href="${esc(a.wpLink)}" style="text-decoration:underline">thekakisto.wordpress.com</a>. Figures are as cited at the time of publication; check the linked sources for later revisions.</p>
</div>
<aside class="rail"><div class="sticky">
 ${(a.connected || []).length ? `<div class="module"><span class="kicker">Connected stories</span><p class="meta" style="margin:4px 0 6px">Other pieces about the same things.</p><div class="rule-list">${a.connected.map(c => `<a class="story" href="${c.b.url}"><h3 class="h-4">${esc(c.b.title)}</h3><div class="meta">${esc(c.shared.join(' · '))}</div></a>`).join('')}</div></div>` : ''}
 ${(a.storyItems || []).length ? `<div class="module story-data"><span class="kicker">Data in this story</span><p class="meta" style="margin:4px 0 8px">Live pages for what this piece discusses.</p><div class="en-chips">${a.storyItems.map(x => `<a href="${x.u}" class="sd-${x.type}">${esc(x.t)}</a>`).join('')}</div></div>` : ''}
 <div class="module"><span class="kicker desk" style="--desk:${t.color}">More in ${esc(t.short)}</span><div class="rule-list" style="margin-top:8px">${sameTopic.map(x => `<a class="story" href="${x.url}"><h3 class="h-4">${esc(x.title)}</h3><div class="meta">${esc(shortDate(x.date))}</div></a>`).join('')}</div></div>
 <div class="module dark"><span class="kicker" style="color:#E3A9C6">Scenario engine</span><h3>What if oil hits $140?</h3><p>One shock through the pump, the import bill and your EMI.</p><a class="btn" style="background:#fff;color:var(--ink)" href="/what-if/">Open</a></div>
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
  `<div class="wrap"><p class="yr-links"><a href="/desk/india-year-in-review/">Explore India’s year in review and its reading paths →</a></p><div class="series-strip" style="margin-top:24px">${m.series.map(s => `<a class="series-card" href="/series/${s.slug}/"><span class="n">${s.items.length} parts · ${esc(shortDate(s.items[0].date))} – ${esc(shortDate(s.items.at(-1).date))}</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p></a>`).join('')}</div></div>`;
}
function seriesPage(s, review) {
  return pageHead('Series', s.name, esc(s.description)) + seriesUpdate(s.slug, review) + `<div class="wrap" style="max-width:900px;margin-top:20px">${s.items.map((a, i) => `<a class="row-story story" href="${a.url}"><div class="when">Part ${i + 1}<br>${esc(shortDate(a.date))}</div><div>${kicker(a)}${fmtBadge(a)}<h3 class="h-3">${esc(a.title)}</h3><p class="dek sm">${esc(a.excerpt)}</p></div></a>`).join('')}</div>`;
}

function archivePage(m) {
  const years = [...new Set(m.articles.map(a => a.date.slice(0, 4)))];
  const chips = (k, vals) => vals.map(([v, l]) => `<button class="chip" data-filter="${k}" data-value="${esc(v)}" aria-pressed="false">${esc(l)}</button>`).join('');
  return pageHead('Archive', 'Archive and search', `All ${m.articles.length} pieces. Search by word, or filter by topic, format and year.`) +
  `<div class="wrap" id="archive"><div class="search-box"><label class="sr" for="q">Search the archive</label><input id="q" type="search" placeholder="Search: inflation, tariff, rupee, Greece…" autocomplete="off"></div>
  <div class="filters"><span class="lbl">Topic</span>${chips('topic', TOPIC_ORDER.map(t => [t, TOPICS[t].short]))}</div>
  <div class="filters"><span class="lbl">Format</span>${chips('format', [['Analysis','Analysis'],['Explainer','Explainer'],['Brief','Brief']])}<span class="lbl" style="margin-left:14px">Year</span>${chips('year', years.map(y => [y, y]))}</div>
  <p class="meta" id="count" aria-live="polite"></p><div id="results"></div></div><script>addEventListener('load', () => { if (location.hash === '#explainers') { const b = document.querySelector('[data-filter="format"][data-value="Explainer"]'); b && b.click(); } });</script>`;
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
  return pageHead('Policy Ledger', 'The Policy Ledger', 'Selected policies tracked from <b>announced → notified → funded → implemented → measured</b>. Each card shows the promise, the document that established it, the outcome we are tracking and the date we will check again.') +
  `<div class="wrap"><div class="ledger-grid">${ledger.items.map(i => { const a = arts[i.article]; return `<article class="lcard" id="${i.id}"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span class="kicker desk" style="--desk:${TOPICS[i.topic].color}">${esc(TOPICS[i.topic].short)}</span><span class="status ${esc(i.status)}">${esc(i.status)}</span></div>
  <h3>${esc(i.title)}</h3><p class="promise">${esc(i.promise)}</p>
  <div class="stages">${ledger.stages.map(s => `<div class="stage ${i.stage[s] ? 'done' : ''}" title="${esc(i.stageNotes?.[s] || '')}">${s}<span class="dt">${i.stage[s] ? esc(isoOrMonth(i.stage[s])) : 'Not yet'}</span></div>`).join('')}</div>
  <dl>${Object.entries(i.stageNotes || {}).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
  <dt>Tracking</dt><dd>${esc(i.tracking)}</dd>
  <dt>Next check</dt><dd>${i.nextCheck ? esc(isoOrMonth(i.nextCheck)) + " · " : ""}${esc(i.nextCheckWhat)}</dd>
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
    try { execSync('python3 -m pip install --quiet --user openpyxl matplotlib', { stdio: 'inherit', timeout: 180000 }); execSync('python3 scripts/fetch_markets.py --years 3 --quick', { stdio: 'inherit', timeout: 480000 }); }
    catch (e) { console.warn('Market data refresh skipped:', e.message); }
  }
  const [wp, tape, ledger, fc, budget, states, twocharts, exposure] = await Promise.all([loadWordPress(), ...['tape', 'ledger', 'forecasts', 'budget', 'states', 'twocharts', 'exposure'].map(f => readFile(`data/${f}.json`, 'utf8').then(JSON.parse))]);
  __tapeRef = tape; HAS_CALLS = (fc.calls || []).length > 0;
  const m = model(wp);
  const [review, fiscal, gdp, repoCsv, repoScript] = await Promise.all([
    ...['year-review', 'fiscal-room', 'gdp-contributions'].map(name => readFile(`data/${name}.json`, 'utf8').then(JSON.parse)),
    readFile('data/repo-transmission.csv', 'utf8'),
    readFile('scripts/repo_transmission.py', 'utf8'),
  ]);
  if (existsSync(OUT)) await rm(OUT, { recursive: true });
  await mkdir(OUT, { recursive: true });
  await cp('src/styles.css', join(OUT, 'styles.css'));
  await cp('src/app.js', join(OUT, 'app.js'));
  await cp('src/landed-cost.js', join(OUT, 'landed-cost.js'));
  await cp('src/chronology.js', join(OUT, 'chronology.js'));
  await cp('src/chronology.css', join(OUT, 'chronology.css'));
  await cp('src/capex-audit.css', join(OUT, 'capex-audit.css'));
  await cp('src/capex-audit.js', join(OUT, 'capex-audit.js'));
  await cp('src/commissioning.css', join(OUT, 'commissioning.css'));
  await cp('src/commissioning.js', join(OUT, 'commissioning.js'));
  await cp('src/getting-to-work.js', join(OUT, 'getting-to-work.js'));
  await cp('src/getting-to-work.css', join(OUT, 'getting-to-work.css'));
  await cp('src/china-inputs.js', join(OUT, 'china-inputs.js'));
  await cp('src/china-inputs.css', join(OUT, 'china-inputs.css'));
  await cp('src/thali.js', join(OUT, 'thali.js'));
  await cp('src/thali.css', join(OUT, 'thali.css'));
  await cp('src/dollar-cushion.js', join(OUT, 'dollar-cushion.js'));
  await cp('src/dollar-cushion.css', join(OUT, 'dollar-cushion.css'));
  await cp('src/fcnr-2026.js', join(OUT, 'fcnr-2026.js'));
  await cp('src/fcnr-2026.css', join(OUT, 'fcnr-2026.css'));
  await cp('src/outcomes.js', join(OUT, 'outcomes.js'));
  await cp('src/outcomes.css', join(OUT, 'outcomes.css'));
  await cp('src/oil-weekly.js', join(OUT, 'oil-weekly.js'));
  await cp('src/oil-weekly.css', join(OUT, 'oil-weekly.css'));
  await cp('src/gst-pass-through.js', join(OUT, 'gst-pass-through.js'));
  await cp('src/gst-pass-through.css', join(OUT, 'gst-pass-through.css'));
  await cp('src/markets.js', join(OUT, 'markets.js'));
  await cp('src/workbench.js', join(OUT, 'workbench.js'));
  await cp('src/chartle.js', join(OUT, 'chartle.js'));
  await cp('src/infographics.js', join(OUT, 'infographics.js'));
  await cp('src/rupee.js', join(OUT, 'rupee.js'));
  await cp('src/terminal.js', join(OUT, 'terminal.js'));
  await cp('src/indicator.js', join(OUT, 'indicator.js'));
  await cp('src/tools.js', join(OUT, 'tools.js'));
  await cp('src/live.js', join(OUT, 'live.js'));
  await writeFile(join(OUT, 'ribbon.svg'), ribbon({ stroke: '#000', opacity: 1 }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  await writeFile(join(OUT, 'rosette.svg'), rosette({ stroke: '#000', opacity: 1, width: 0.8 }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  await cp('src/hormuz.js', join(OUT, 'hormuz.js'));
  await cp('src/world.js', join(OUT, 'world.js'));
  await cp('src/maps.js', join(OUT, 'maps.js'));
  await cp('src/entity.js', join(OUT, 'entity.js'));
  await cp('src/search.js', join(OUT, 'search.js'));
  await cp('src/scenario.js', join(OUT, 'scenario.js'));
  await cp('src/external.js', join(OUT, 'external.js'));
  await cp('src/trade.js', join(OUT, 'trade.js'));
  await cp('src/economy.js', join(OUT, 'economy.js'));
  await cp('src/companies.js', join(OUT, 'companies.js'));
  await cp('src/districts.js', join(OUT, 'districts.js'));
  await cp('src/story.js', join(OUT, 'story.js'));
  if (existsSync('static')) await cp('static', OUT, { recursive: true });
  MK = await loadMarkets();
  const P = (o) => layout({ tape, ...o });
  // ---- public data API (static JSON, CORS open)
  const api = { 'india-year-in-review': 'Dated India policy milestones, primary documents and related coverage', 'research/getting-to-work-schema': 'Anonymised commute research field definitions, output formulas and privacy limitations', 'research/china-inputs': '2025 HS2 merchandise import exposure from India-reported UN Comtrade', 'research/thali-snapshot': 'Agmarknet wholesale modal average snapshot, not retail CPI', 'research/dollar-cushion': 'RBI September and April-September 2026 BoP components and source vintages', 'research/fcnr-2026': 'RBI FCNR(B) facility snapshot dates versus balance-of-payments financing and a nonforecast net-deposit counterfactual', 'research/year-outcome-scorecard': 'Five original-source economic indicators with time windows and attribution limits', 'research/oil-rupee-weekly': 'Fifty-two historical weekly oil, rupee and trade essays, complete source-vintage manuscript and EIA/Fed benchmark CSV' };
  if (MK) {
    const I = { dates: MK.dates, series: MK.series, pe: MK.pe, pb: MK.pb, dy: MK.dy };
    await write('api/markets/indices.json', JSON.stringify(I));
    if (MK.imfWorld) { for (const [ind, d] of Object.entries(MK.imfWorld.data)) await write(`api/world/${ind}.json`, JSON.stringify(d)); await write('api/world/meta.json', JSON.stringify({ indicators: MK.imfWorld.indicators, countries: MK.imfWorld.countries })); api['world/meta'] = 'IMF WEO for every country: indicator and country lists; one file per indicator at /api/world/<id>.json (1990–2031)'; }
    if (MK.portwatch) { await write('api/markets/portwatch.json', JSON.stringify(MK.portwatch)); api['markets/portwatch'] = 'Daily ship transits through Hormuz, Bab el-Mandeb, Suez, the Cape of Good Hope and Malacca by ship type, from 2023 (IMF PortWatch)'; } api['markets/indices'] = 'NSE index closes (28 indices) and Nifty 50 P/E, P/B, dividend yield, daily';
    for (const [f, d] of [['stocks', 'nse_stocks'], ['fred', 'fred'], ['fx', 'fx'], ['worldbank', 'worldbank'], ['crypto', 'crypto'], ['world', 'macro_world'], ['trade', 'trade'], ['iip', 'iip'], ['rbi_money', 'rbi_money'], ['india_monthly', 'india_monthly'], ['inr_long', 'inr_long']]) { if (existsSync(`data/markets/${d}.json`)) await write(`api/markets/${f}.json`, await readFile(`data/markets/${d}.json`, 'utf8')); }
    if (MK.rbiFx) await write('api/markets/rbi_fx.json', JSON.stringify(MK.rbiFx)); if (MK.rbiRates) await write('api/markets/rbi_rates.json', JSON.stringify(MK.rbiRates));
    Object.assign(api, { 'markets/rbi_fx': 'India’s foreign exchange reserves every week from the RBI Weekly Statistical Supplement: total, foreign currency assets, gold, SDRs and IMF reserve position, US$ million', 'markets/rbi_rates': 'Weekly money-market rates from the RBI Weekly Statistical Supplement: call money, 91- and 364-day T-bills, 10-year G-Sec, the RBI reference rupee rate, 1/3/6-month forward premia, CRR', 'markets/iip': 'Index of Industrial Production, monthly: general, sectors and use-based groups, index and year-on-year growth (MoSPI eSankhyiki API)', 'markets/rbi_money': 'Fortnightly bank deposits, credit, non-food credit and money supply (M3), outstanding in ₹ crore and growth year on year (RBI Weekly Statistical Supplement, Tables 3 and 7)', 'markets/inr_long': 'Rupees per US dollar, daily since 2005 (Federal Reserve H.10 via FRED)', 'markets/india_monthly': 'India’s monthly merchandise exports and imports, seasonally adjusted, US$ (OECD MEI via FRED)', 'markets/trade': 'India’s goods exports (X) and imports (M) by partner country, yearly from 2015, and by HS2 chapter for the latest year, US$ (UN Comtrade, reported by India)' });
    Object.assign(api, { 'markets/stocks': 'Nifty 50 constituents: close, change, market cap; NSE breadth', 'markets/fred': 'US Treasury yields, fed funds, breakeven inflation, broad dollar index, EIA oil and gas spot prices (FRED)', 'markets/fx': '15 currencies per US dollar, ECB reference rates, daily', 'markets/worldbank': '35 commodity prices, monthly, World Bank Pink Sheet', 'markets/crypto': 'Bitcoin and ether, daily USD, CoinGecko', 'markets/world': 'IMF World Economic Outlook and World Bank indicators for India and 13 peers, annual' });
  }
  for (const f of ['tape', 'ledger', 'budget', 'states', 'exposure', 'twocharts', 'forecasts', 'infographics', 'cpi_basket', 'pump', 'states_countries', 'events', 'repo_history']) { await write(`api/${f}.json`, await readFile(`data/${f}.json`, 'utf8')); }
  Object.assign(api, { tape: 'India macro tape: CPI, repo, rupee, 10-year yield, Brent, Nifty, with sources', ledger: 'Policy Ledger items and stages', budget: 'Union Budget 2026-27: estimates and April–September actuals', states: 'State indicators: income, growth, inflation, debt, interest burden', exposure: 'Import exposure: crude suppliers, DAP, China shares', twocharts: 'Two-Chart Test data', forecasts: 'Forecast Book calls' });
  // ---- series catalogue for the chart workbench
  const catalog = [], SD = {};
  const addSeries = async (id, name, group, unit, freq, source, dates, values, extra = {}) => {
    const pts = dates.map((d, i) => [d, values[i]]).filter(p => p[1] != null && Number.isFinite(p[1]));
    if (pts.length < 3) return;
    catalog.push({ id, name, group, unit, freq, source, first: pts[0][0], last: pts.at(-1)[0], n: pts.length, ...extra }); SD[id] = { d: pts.map(p => p[0]), v: pts.map(p => p[1]) };
    await write(`api/series/${id}.json`, JSON.stringify({ id, name, unit, freq, source, ...extra, ...SD[id] }));
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
    // RBI Weekly Statistical Supplement: reserves since 1998 and money-market rates, the reference rate and forward premia
    if (MK.rbiFx?.weeks) { const W8 = Object.entries(MK.rbiFx.weeks); const d = W8.map(x => x[0]);
      for (const [k, n] of [['total', 'Foreign exchange reserves, total'], ['fca', 'Foreign currency assets'], ['gold', 'Gold reserves'], ['sdr', 'SDR holdings']]) await addSeries(`rbi-fx-${k}`, `${n} (RBI, weekly)`, 'India: external sector', 'US$ million', 'weekly', 'RBI Weekly Statistical Supplement', d, W8.map(x => x[1][k] ?? null)); }
    if (MK.rbiRates?.weeks) { const R8 = Object.entries(MK.rbiRates.weeks); const d = R8.map(x => x[0]);
      for (const [k, n, u] of [['call', 'Call money rate, weighted average', '%'], ['tb91', '91-day Treasury bill yield', '%'], ['tb364', '364-day Treasury bill yield', '%'], ['gsec10', '10-year G-Sec par yield (FBIL)', '%'], ['inr', 'Rupees per US dollar, RBI/FBIL reference', '₹ per $'], ['fwd1m', 'Forward premium on the dollar, 1 month', '% a year'], ['fwd3m', 'Forward premium on the dollar, 3 months', '% a year'], ['fwd6m', 'Forward premium on the dollar, 6 months', '% a year'], ['crr', 'Cash reserve ratio', '%']])
        await addSeries(`rbi-${k}`, n, 'India: money markets (RBI, weekly)', u, 'weekly', 'RBI Weekly Statistical Supplement', d, R8.map(x => x[1][k] ?? null)); }
    // real economy: IIP (MoSPI), bank credit, deposits and money (RBI fortnightly), monthly trade (OECD via FRED)
    for (const n of IIP_ORDER) { const sr = MK.iip?.series?.[n]; if (!sr) continue; const P8 = Object.entries(sr.pts);
      await addSeries(iipId(n), `IIP: ${n.replace('Infrastructure/construction Goods', 'Infrastructure & construction goods')}, growth`, 'India: industry (IIP, monthly)', '% y/y', 'monthly', 'MoSPI', P8.map(x => x[0]), P8.map(x => x[1].growth)); }
    if (existsSync('data/markets/fbil.json')) { const FB = JSON.parse(await readFile('data/markets/fbil.json', 'utf8')), ds = Object.keys(FB.days).sort();
      for (const [t, nm] of [['0.25', '3-month'], ['1', '1-year'], ['2', '2-year'], ['5', '5-year'], ['10', '10-year'], ['30', '30-year']]) {
        const dd = ds.filter(d => FB.days[d][t] != null); if (dd.length < 20) continue;
        await addSeries(`fbil-par-${t === '0.25' ? '3m' : t}`, `G-Sec par yield, ${nm} (FBIL, daily)`, 'India: rates', '%', 'daily', 'FBIL G-Sec Base/Par Yield', dd, dd.map(d => FB.days[d][t]), { short: `${nm[0].toUpperCase() + nm.slice(1)} G-Sec par yield` }); }
      if (SD['fbil-par-10'] && SD['fbil-par-1']) { const B = new Map(SD['fbil-par-1'].d.map((d, k) => [d, SD['fbil-par-1'].v[k]])), pts = SD['fbil-par-10'].d.map((d, k) => B.has(d) ? [d, +(SD['fbil-par-10'].v[k] - B.get(d)).toFixed(2)] : null).filter(Boolean);
        await addSeries('fbil-slope-10-1', 'Yield-curve slope: 10-year minus 1-year par yield (FBIL, daily)', 'India: rates', 'pts', 'daily', 'Derived from FBIL par yields', pts.map(x => x[0]), pts.map(x => x[1]), { short: '10-year minus 1-year' }); } }
    if (MK.rbiMoney?.fortnights) { const F8 = Object.entries(MK.rbiMoney.fortnights), d = F8.map(x => x[0]);
      // Validate parsed RBI tables. Levels: drop a point more than 8% from the median of its neighbours.
      // Growth rates: keep a published y/y only where it matches the change in that item's own published level over a year (±1.5 pts).
      const T = s => Date.parse(s) / 864e5, lv = {}, LV = ['credit', 'deposits', 'm3', 'cic', 'bccs'];
      for (const k of LV) { const a = F8.map(x => x[1][k] ?? null); lv[k] = a.map((v, i) => { if (v == null) return null; const nb = [...a.slice(Math.max(0, i - 3), i), ...a.slice(i + 1, i + 4)].filter(x => x != null).sort((x, y) => x - y); if (nb.length < 2) return v; const md = nb[nb.length >> 1]; return Math.abs(v / md - 1) > 0.08 ? null : v; }); }
      const yAgo = i => { const t = T(d[i]) - 364; let b = -1; for (let j = i - 1; j >= 0 && T(d[j]) > t - 9; j--) if (Math.abs(T(d[j]) - t) <= 8) b = j; return b; };
      const pass = (k, i) => { const v = F8[i][1][k + '_yoy'], j = yAgo(i); if (v == null || j < 0 || lv[k][i] == null || lv[k][j] == null) return false; return Math.abs((lv[k][i] / lv[k][j] - 1) * 100 - v) <= 1.5; };
      const checked = k => F8.map((x, i) => pass(k.replace('_yoy', ''), i) ? x[1][k] : null);
      for (const [k, n, u] of [['credit_yoy', 'Bank credit, year on year', '% y/y'], ['deposits_yoy', 'Bank deposits, year on year', '% y/y'], ['m3_yoy', 'Money supply (M3), year on year', '% y/y'], ['cic_yoy', 'Currency with the public, year on year', '% y/y'], ['bccs_yoy', 'Bank credit to the commercial sector, year on year', '% y/y']])
        await addSeries(`rbi-${k.replace('_yoy', '')}-yoy`, n, 'India: money and credit (RBI, fortnightly)', u, 'fortnightly', 'RBI Weekly Statistical Supplement', d, checked(k));
      for (const [k, n] of [['credit', 'Bank credit outstanding'], ['deposits', 'Bank deposits outstanding']]) await addSeries(`rbi-${k}`, n, 'India: money and credit (RBI, fortnightly)', '₹ lakh crore', 'fortnightly', 'RBI Weekly Statistical Supplement', d, lv[k].map(v => v == null ? null : +(v / 1e5).toFixed(2))); }
    for (const [k, id] of [['XTEXVA01INM667S', 'in-exports'], ['XTIMVA01INM667S', 'in-imports']]) { const sr = MK.inMonthly?.[k]; if (sr) await addSeries(id, sr.label, 'India: trade (monthly)', 'US$ bn', 'monthly', 'OECD MEI via FRED', sr.pts.map(p => p[0]), sr.pts.map(p => +(p[1] / 1e9).toFixed(2))); }
    for (const [n, c] of Object.entries(MK.portwatch?.chokepoints || {})) { const sl = n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '');
      await addSeries('pw-' + sl, `Ships through the ${n.replace(/ Strait$/, ' Strait')}, a day`, 'Shipping chokepoints', 'ships a day', 'daily', 'IMF PortWatch', c.d, c.total);
      await addSeries('pw-' + sl + '-tankers', `Tankers through the ${n}, a day`, 'Shipping chokepoints', 'tankers a day', 'daily', 'IMF PortWatch', c.d, c.tanker); }
    for (const [c, pts] of Object.entries(MK.crypto || {})) await addSeries('crypto-' + c, c[0].toUpperCase() + c.slice(1) + ', US$', 'Crypto', '$', 'daily', 'CoinGecko', pts.map(p => p[0]), pts.map(p => p[1]));
    if (MK.world) {
      const W = MK.world, projectionFrom = String(W.imfVintageYear ?? 2026);
      for (const [src, block, tag] of [['IMF World Economic Outlook', W.imf, 'imf'], ['World Bank WDI', W.wdi, 'wdi']]) for (const [code, ind] of Object.entries(block)) for (const [iso, cname] of Object.entries(W.countries)) {
        const data = ind.data[iso]; if (!data) continue; const ys = Object.keys(data).sort();
        await addSeries(`${tag}-${slug(code)}-${iso.toLowerCase()}`, `${ind.label}: ${cname}`, iso === 'IND' ? 'India: annual macro' : 'World economy: annual', ind.unit, 'annual', src + (tag === 'imf' ? ` (from ${projectionFrom}: IMF projections)` : ''), ys.map(y => y + '-12-31'), ys.map(y => data[y]), tag === 'imf' ? { projectionFrom } : {});
      }
    }
  }
  // India macro releases from the tape (CPI, repo) join the catalogue, so they chart, correlate and link like everything else
  const MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  // the repo rate as a full monthly step series since 2019 from the decision history
  { const RHf = JSON.parse(await readFile('data/repo_history.json', 'utf8'));
    if (existsSync('data/markets/rbi_rates.json')) { const W = JSON.parse(await readFile('data/markets/rbi_rates.json', 'utf8')).weeks, wk = Object.keys(W).sort().filter(d => W[d].repo != null);
      let cur = RHf.changes.at(-1)?.[1] ?? RHf.start.rate; const lastChange = RHf.changes.at(-1)?.[0] || RHf.start.date;
      for (const d of wk) if (d > lastChange && W[d].repo !== cur) { RHf.changes.push([d, W[d].repo]); cur = W[d].repo; RHf.autoDetected = [...(RHf.autoDetected || []), d]; }
      if (RHf.autoDetected?.length) await writeFile('data/repo_history.json', JSON.stringify(RHf, null, 1));
      const ri = tape.indicators.find(x => x.id === 'repo'), lc = RHf.changes.at(-1);
      if (ri && lc && lc[0] > (ri.latest.released || '')) { ri.previous = { value: ri.latest.value, period: ri.latest.period, status: 'Policy rate' }; ri.latest = { value: lc[1], period: `Since ${new Date(lc[0] + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`, released: lc[0], status: 'Policy rate (from the RBI weekly statistical supplement)' }; } }
    const RH = RHf; const ds = [], vs = []; let r = RH.start.rate;
    for (let t = new Date(RH.start.date + 'T00:00:00Z'); t <= BUILT; t.setUTCMonth(t.getUTCMonth() + 1)) { const me = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).toISOString().slice(0, 10); for (const [d, x] of RH.changes) if (d <= me) r = x; ds.push(me.slice(0, 7)); vs.push(r); }
    await addSeries('india-repo', 'RBI repo rate', 'India: macro releases', '%', 'monthly', 'RBI monetary policy decisions', ds, vs); }
  // CPI: the 2012-base history from MoSPI's API (to Dec 2025) linked to the 2024-base releases from Jan 2026
  { const i = tape.indicators.find(x => x.id === 'cpi');
    const tp = i ? [...(i.history || []), { t: i.latest.period, v: i.latest.value }].map(h => { const [mo, y] = h.t.split(' '); return MON[mo] ? [`${y}-${MON[mo]}`, h.v] : null; }).filter(Boolean) : [];
    const CH = existsSync('data/markets/cpi_hist.json') ? JSON.parse(await readFile('data/markets/cpi_hist.json', 'utf8')).series : {};
    const key = (sector, re) => Object.keys(CH).find(k => { const [sc, g, sg] = k.split('|'); return sc === sector && re.test(g + '|' + sg); });
    const get = (sector, re) => { const k = key(sector, re); return k ? CH[k] : null; };
    const GEN = /^General( Index)?\|/i, uniq = pts => [...new Map(pts.map(p => [p[0], p])).values()].sort((a, b) => a[0].localeCompare(b[0]));
    const head = get('Combined', GEN), old = (head || []).filter(r => r[2] != null && r[0] >= '2012-01').map(r => [r[0], r[2]]);
    const linked = uniq([...old, ...tp]);
    const brk = { breaks: [{ at: '2026-01', label: 'New base 2024=100' }] };
    await addSeries('india-cpi', 'CPI inflation, India (headline, combined)', 'India: prices', '% y/y', 'monthly', 'MoSPI: base 2012=100 to Dec 2025, base 2024=100 from Jan 2026', linked.map(p => p[0]), linked.map(p => p[1]), { latestStatus: i?.latest.status, short: 'Headline CPI', ...brk });
    const add12 = async (id, name, short, sector, re) => { const r = (get(sector, re) || []).filter(x => x[2] != null && x[0] >= '2012-01'); if (r.length) await addSeries(id, name, 'India: prices', '% y/y', 'monthly', 'MoSPI CPI, base 2012=100 (series ended Dec 2025)', r.map(x => x[0]), r.map(x => x[2]), { short, ended: '2025-12' }); };
    await add12('cpi-rural', 'CPI inflation, rural (2012 base)', 'Rural', 'Rural', GEN);
    await add12('cpi-urban', 'CPI inflation, urban (2012 base)', 'Urban', 'Urban', GEN);
    await add12('cpi-food', 'Consumer food price inflation, CFPI (2012 base)', 'Food (CFPI)', 'Combined', /Consumer Food Price/i);
    for (const [id, short, re] of [['cpi-g-food', 'Food and beverages', /^Food and Beverages\|.*Overall/i], ['cpi-g-fuel', 'Fuel and light', /^Fuel and Light\|/i], ['cpi-g-housing', 'Housing', /^Housing\|/i], ['cpi-g-clothing', 'Clothing and footwear', /^Clothing and Footwear\|.*Overall/i], ['cpi-g-misc', 'Miscellaneous (services and goods)', /^Miscellaneous\|.*Overall/i], ['cpi-g-pan', 'Pan, tobacco and intoxicants', /^Pan, Tobacco/i]])
      await add12(id, `CPI inflation: ${short} (2012 base)`, short, 'Combined', re);
    // core: CPI excluding food and beverages and fuel and light, from the 2012-base indices and their combined weights (45.86 and 6.84)
    const gi = get('Combined', GEN), fi = get('Combined', /^Food and Beverages\|.*Overall/i), ui = get('Combined', /^Fuel and Light\|/i);
    if (gi && fi && ui) { const F = new Map(fi.map(r => [r[0], r[1]])), U = new Map(ui.map(r => [r[0], r[1]]));
      const core = gi.filter(r => F.has(r[0]) && U.has(r[0]) && r[1] != null).map(r => [r[0], (r[1] - 0.4586 * F.get(r[0]) - 0.0684 * U.get(r[0])) / (1 - 0.4586 - 0.0684)]);
      const cm = new Map(core), yoy = core.map(([d, v]) => { const pd = `${+d.slice(0, 4) - 1}${d.slice(4)}`; return cm.has(pd) ? [d, (v / cm.get(pd) - 1) * 100] : null; }).filter(Boolean).filter(x => x[0] >= '2012-01');
      if (yoy.length) await addSeries('cpi-core', 'Core CPI inflation, excluding food and fuel (derived, 2012 base)', 'India: prices', '% y/y', 'monthly', 'Derived from MoSPI 2012-base CPI indices using combined weights', yoy.map(x => x[0]), yoy.map(x => +x[1].toFixed(2)), { short: 'Core (ex food and fuel)', ended: '2025-12' }); }
  }
  // energy from PPAC via data.gov.in (monthly): crude imports and the oil bill, fuel demand, refinery output
  { const ogd = async n => existsSync(`data/ogd/${n}.json`) ? JSON.parse(await readFile(`data/ogd/${n}.json`, 'utf8')) : null;
    const MI = Object.fromEntries(MONTHS.map((m, i) => [m, String(i + 1).padStart(2, '0')]));
    const num = x => { const v = parseFloat(String(x ?? '').replace(/,/g, '')); return Number.isFinite(v) ? v : null; };
    const T = await ogd('pettrade');
    if (T) { const by = {};
      for (const r of T.rows) { const m = MI[r.Month], k = r.PRODUCTS && r.PRODUCTS.trim(); if (!m || !k) continue; const d = `${r.Year}-${m}`, o = (by[k] ||= {})[d] ||= {};
        const q = num(r['Quantity (000 Metric Tonnes)']), u = num(r['Value in Dollars (Million US dollar)']); if (q != null && o.q == null) o.q = q; if (u != null && o.u == null) o.u = u; }
      const ser = async (k, f, id, name, unit, short) => { const o = by[k]; if (!o) return; const ds = Object.keys(o).sort().filter(d => o[d][f] != null); await addSeries(id, name, 'India: energy', unit, 'monthly', 'PPAC, Ministry of Petroleum and Natural Gas, via data.gov.in', ds, ds.map(d => o[d][f]), { short }); };
      await ser('CRUDE OIL', 'q', 'oil-crude-imports', 'Crude oil imports, volume', '000 tonnes', 'Crude imports, volume');
      await ser('CRUDE OIL', 'u', 'oil-crude-bill', 'Crude oil import bill', 'US$ mn', 'Crude import bill');
      await ser('NET IMPORT', 'u', 'oil-net-imports-usd', 'Net imports of crude and petroleum products', 'US$ mn', 'Net oil imports'); }
    const C = await ogd('petcons');
    if (C) { const tot = {}; for (const r of C.rows) { const m = MI[r._month_], v = num(r.quantity_000_metric_tonnes_); if (m && v != null) tot[`${r.year}-${m}`] = (tot[`${r.year}-${m}`] || 0) + v; }
      const ds = Object.keys(tot).sort(); await addSeries('oil-consumption', 'Consumption of petroleum products, total', 'India: energy', '000 tonnes', 'monthly', 'PPAC via data.gov.in', ds, ds.map(d => +tot[d].toFixed(1)), { short: 'Fuel consumption' });
      const yoy = ds.map(d => { const p = `${+d.slice(0, 4) - 1}${d.slice(4)}`; return tot[p] ? [d, +((tot[d] / tot[p] - 1) * 100).toFixed(2)] : null; }).filter(Boolean);
      await addSeries('oil-consumption-yoy', 'Consumption of petroleum products, year on year', 'India: energy', '% y/y', 'monthly', 'Derived from PPAC data via data.gov.in', yoy.map(x => x[0]), yoy.map(x => x[1]), { short: 'Fuel demand growth' }); }
  }
  if (existsSync('data/gdp_q.json')) { const G = JSON.parse(await readFile('data/gdp_q.json', 'utf8')); await addSeries('gdp-q', 'Real GDP growth, quarterly (2022-23 base)', 'India: national accounts', '% y/y', 'quarterly', 'MoSPI quarterly estimates', G.quarters.map(q => q[0]), G.quarters.map(q => q[1]), { short: 'Real GDP growth, quarterly' }); }
  // UPI (NPCI) and FPI flows (NSDL)
  { const yoyOf = (ds, vs) => { const m = new Map(ds.map((d, k) => [d, vs[k]])); return ds.map((d, k) => { const p = `${+d.slice(0, 4) - 1}${d.slice(4)}`; return m.get(p) ? [d, +((vs[k] / m.get(p) - 1) * 100).toFixed(2)] : null; }).filter(Boolean); };
    if (existsSync('data/markets/upi.json')) { const U = JSON.parse(await readFile('data/markets/upi.json', 'utf8')).months, ds = Object.keys(U).sort();
      const vol = ds.map(d => U[d].volume_mn), val = ds.map(d => U[d].value_cr / 1e5);
      await addSeries('upi-volume', 'UPI transactions, volume', 'India: payments', 'million', 'monthly', 'NPCI UPI product statistics', ds, vol, { short: 'UPI transactions' });
      await addSeries('upi-value', 'UPI transactions, value', 'India: payments', '₹ lakh crore', 'monthly', 'NPCI UPI product statistics', ds, val.map(v => +v.toFixed(2)), { short: 'UPI value' });
      for (const [id, name, short, arr] of [['upi-volume-yoy', 'UPI volume, year on year', 'UPI volume growth', vol], ['upi-value-yoy', 'UPI value, year on year', 'UPI value growth', val]]) { const y = yoyOf(ds, arr); await addSeries(id, name, 'India: payments', '% y/y', 'monthly', 'Derived from NPCI data', y.map(x => x[0]), y.map(x => x[1]), { short }); } }
    if (existsSync('data/markets/fpi.json')) { const F = JSON.parse(await readFile('data/markets/fpi.json', 'utf8')), ms = Object.keys(F.months || {}).sort(), ds = Object.keys(F.days || {}).sort();
      await addSeries('fpi-equity', 'Net FPI investment in equity, monthly', 'India: capital flows', '₹ crore', 'monthly', 'NSDL FPI Monitor', ms, ms.map(m => F.months[m].equity), { short: 'FPI equity flows' });
      await addSeries('fpi-total', 'Net FPI investment, all instruments, monthly', 'India: capital flows', '₹ crore', 'monthly', 'NSDL FPI Monitor', ms, ms.map(m => F.months[m].total), { short: 'FPI flows, total' });
      const roll = ms.map((m, k) => k >= 11 ? [m, ms.slice(k - 11, k + 1).reduce((a, x) => a + F.months[x].equity, 0)] : null).filter(Boolean);
      await addSeries('fpi-equity-12m', 'Net FPI investment in equity, rolling 12 months', 'India: capital flows', '₹ crore', 'monthly', 'Derived from NSDL data', roll.map(x => x[0]), roll.map(x => +x[1].toFixed(0)), { short: 'FPI equity, last 12 months' });
      await addSeries('fpi-equity-daily', 'Net FPI investment in equity, daily (provisional)', 'India: capital flows', '₹ crore', 'daily', 'NSDL FPI Monitor (stock-exchange data)', ds, ds.map(d => F.days[d].Equity?.net_cr ?? null), { short: 'FPI equity, daily' }); }
    if (existsSync('data/markets/amfi.json')) { const A = JSON.parse(await readFile('data/markets/amfi.json', 'utf8')), ms = Object.keys(A.months).sort(), v = k => ms.map(m => A.months[m][k] ?? null), src = 'AMFI monthly report';
      await addSeries('mf-equity', 'Net inflows into equity-oriented mutual funds', 'India: mutual funds', '₹ crore', 'monthly', src, ms, v('equity'), { short: 'Mutual fund equity inflows' });
      await addSeries('mf-debt', 'Net inflows into debt mutual funds', 'India: mutual funds', '₹ crore', 'monthly', src, ms, v('debt'), { short: 'Debt fund inflows' });
      await addSeries('mf-hybrid', 'Net inflows into hybrid mutual funds', 'India: mutual funds', '₹ crore', 'monthly', src, ms, v('hybrid'), { short: 'Hybrid fund inflows' });
      await addSeries('mf-total', 'Net inflows into all mutual fund schemes', 'India: mutual funds', '₹ crore', 'monthly', src, ms, v('total'), { short: 'All mutual fund inflows' });
      await addSeries('mf-etf-equity', 'Net inflows into equity ETFs', 'India: mutual funds', '₹ crore', 'monthly', src, ms, v('etf_equity'), { short: 'Equity ETF inflows' });
      await addSeries('mf-etf-gold', 'Net inflows into gold ETFs', 'India: mutual funds', '₹ crore', 'monthly', src, ms, v('etf_gold'), { short: 'Gold ETF inflows' });
      await addSeries('mf-aum', 'Mutual fund assets under management, all schemes', 'India: mutual funds', '₹ lakh crore', 'monthly', src, ms, v('total_aum').map(x => x == null ? null : +(x / 1e5).toFixed(2)), { short: 'Mutual fund AUM' });
      await addSeries('mf-equity-aum', 'Equity-oriented mutual fund assets', 'India: mutual funds', '₹ lakh crore', 'monthly', src, ms, v('equity_aum').map(x => x == null ? null : +(x / 1e5).toFixed(2)), { short: 'Equity fund AUM' });
      if (SD['fpi-equity']) { const f = Object.fromEntries(SD['fpi-equity'].d.map((d, i) => [d.slice(0, 7), SD['fpi-equity'].v[i]])), both = ms.filter(m => f[m] != null);
        await addSeries('mf-vs-fpi', 'Domestic mutual fund equity inflows minus FPI equity outflows', 'India: mutual funds', '₹ crore', 'monthly', 'Derived from AMFI and NSDL', both, both.map(m => +(A.months[m].equity + f[m]).toFixed(0)), { short: 'MF plus FPI equity flows' }); } }
    // a composite of monthly activity: the equal-weight average of standardised year-on-year growth rates
    const comp = ['upi-value-yoy', 'oil-consumption-yoy', 'iip-general', 'rbi-credit-yoy'].filter(id => SD[id]);
    if (comp.length >= 3) { const mon = id => { const o = {}; SD[id].d.forEach((d, k) => { o[d.slice(0, 7)] = SD[id].v[k]; }); return o; };
      const Z = comp.map(id => { const o = mon(id), v = Object.values(o).filter(x => x != null), mu = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length); return Object.fromEntries(Object.entries(o).map(([m, x]) => [m, (x - mu) / sd])); });
      const months = [...new Set(Z.flatMap(z => Object.keys(z)))].sort().filter(m => m >= '2018-01');
      const pts = months.map(m => { const xs = Z.map(z => z[m]).filter(x => x != null && Number.isFinite(x)); return xs.length >= 3 ? [m, +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)] : null; }).filter(Boolean);
      await addSeries('activity-index', 'Kakistocrat activity index (composite)', 'India: activity', 'standard deviations', 'monthly', 'Derived: average of standardised UPI value, fuel demand, IIP and bank credit growth', pts.map(p => p[0]), pts.map(p => p[1]), { short: 'Activity index' }); }
  }
  // WPI from MoSPI (2011-12=100): year-on-year inflation for the headline and major groups
  // WPI: the 2011-12 base to March 2024, the 2022-23 base (introduced June 2026, back-filled from April 2023) from April 2024, the first month with a year-on-year rate on the new base.
  if (existsSync('data/markets/wpi_hist.json')) { const W = JSON.parse(await readFile('data/markets/wpi_hist.json', 'utf8')).series, W2 = existsSync('data/markets/wpi22_hist.json') ? JSON.parse(await readFile('data/markets/wpi22_hist.json', 'utf8')).series : {};
    const pick = (S, re) => Object.keys(S).find(k => re.test(k)), CUT = '2024-04';
    const rates = k => { if (!k) return []; const m = new Map(k); return k.map(([d, v]) => { const p = `${+d.slice(0, 4) - 1}${d.slice(4)}`; return m.has(p) ? [d, +((v / m.get(p) - 1) * 100).toFixed(2)] : null; }).filter(Boolean); };
    const yoy = async (re, id, name, short) => { const k1 = pick(W, re), k2 = pick(W2, re); if (!k1 && !k2) return;
      const old = rates(W[k1]).filter(p => !k2 || p[0] < CUT), nw = k2 ? rates(W2[k2]).filter(p => p[0] >= CUT) : [], pts = [...old, ...nw];
      await addSeries(id, name, 'India: prices', '% y/y', 'monthly', k2 ? 'Office of the Economic Adviser via MoSPI: WPI base 2011-12 to March 2024, base 2022-23 from April 2024' : 'MoSPI/Office of the Economic Adviser, WPI base 2011-12=100', pts.map(p => p[0]), pts.map(p => p[1]), { short, ...(k2 ? { breaks: [{ at: CUT, label: 'New base 2022-23' }] } : {}) }); };
    await yoy(/^(Wholesale price index|all commodities)\|$/i, 'wpi', 'WPI inflation, all commodities', 'WPI, all commodities');
    await yoy(/^Primary articles\|$/i, 'wpi-primary', 'WPI inflation: primary articles', 'Primary articles');
    await yoy(/^Fuel (&|and) power\|$/i, 'wpi-fuel', 'WPI inflation: fuel and power', 'Fuel and power');
    await yoy(/^Manufactured products\|$/i, 'wpi-manufactured', 'WPI inflation: manufactured products', 'Manufactured products');
    await yoy(/food index/i, 'wpi-food', 'WPI food index inflation', 'WPI food index');
  }
  // derived rate spreads, in percentage points
  { const spread = async (id, name, short, a, b) => { if (!SD[a] || !SD[b]) return; const B = new Map(SD[b].d.map((d, k) => [d, SD[b].v[k]])); const pts = SD[a].d.map((d, k) => B.has(d) && SD[a].v[k] != null && B.get(d) != null ? [d, +(SD[a].v[k] - B.get(d)).toFixed(3)] : null).filter(Boolean); if (pts.length > 20) await addSeries(id, name, 'India: rates', 'pts', catalog.find(c => c.id === a)?.freq || 'daily', 'Derived from the two series named', pts.map(p => p[0]), pts.map(p => p[1]), { short }); };
    await spread('spread-in-us-10y', 'India 10-year G-Sec yield minus US 10-year Treasury yield (weekly)', 'India minus US 10-year', 'rbi-gsec10', 'fred-dgs10');
    if (SD['rbi-credit'] && SD['rbi-deposits']) { const D = new Map(SD['rbi-deposits'].d.map((d, k) => [d, SD['rbi-deposits'].v[k]])); const pts = SD['rbi-credit'].d.map((d, k) => D.get(d) ? [d, +(SD['rbi-credit'].v[k] / D.get(d) * 100).toFixed(2)] : null).filter(Boolean); await addSeries('rbi-cd-ratio', 'Credit-deposit ratio, scheduled commercial banks', 'India: money and credit (RBI, fortnightly)', '%', 'fortnightly', 'Derived from RBI bank credit and deposits outstanding', pts.map(p => p[0]), pts.map(p => p[1]), { short: 'Credit-deposit ratio' }); }
    await spread('spread-10y-tb91', 'Term spread: 10-year G-Sec minus 91-day T-bill (RBI, weekly)', '10-year minus 91-day', 'rbi-gsec10', 'rbi-tb91'); }
  // ---- the connected layer
  // World annual series for other countries live on the country pages and in the API, not as pages of their own
  // the tape updates itself from the data feeds: Nifty (NSE close), rupee (reference rate), Brent (FRED), 10-year G-Sec (FBIL, weekly)
  { const fmt = d => new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const auto = (tid, sid, label, status, note, dec = 2) => { const N = SD[sid], i = tape.indicators.find(x => x.id === tid); if (!N || !i) return; const L = N.d.length - 1; if (N.d[L] < (i.latest.released || '')) return;
      i.previous = { value: +N.v[L - 1].toFixed(dec), period: `${label} ${fmt(N.d[L - 1])}`, status }; i.latest = { value: +N.v[L].toFixed(dec), period: `${label} ${fmt(N.d[L])}`, released: N.d[L].slice(0, 10), status }; i.checked = N.d[L].slice(0, 10); i.auto = note; };
    auto('nifty', 'nse-nifty-50', 'Close,', 'Close', 'Updated automatically from the NSE closing file');
    auto('inr', 'fx-usdinr', 'Reference,', 'Reference rate', 'Updated automatically from the daily reference rate');
    auto('brent', 'fred-dcoilbrenteu', 'Close,', 'Spot', 'Updated automatically from FRED (EIA Brent spot)');
    auto('g10', 'rbi-gsec10', 'Week to', 'FBIL par yield', 'Updated automatically from the RBI Weekly Statistical Supplement');
    auto('g10', 'fbil-par-10', 'Par yield,', 'FBIL par yield', 'Updated automatically from FBIL’s daily G-Sec par yields');
    await write('api/tape.json', JSON.stringify(tape)); }
  const HIDDEN = catalog.filter(c => c.group === 'World economy: annual'); for (let i = catalog.length - 1; i >= 0; i--) if (catalog[i].group === 'World economy: annual') catalog.splice(i, 1);
  const byId = Object.fromEntries(catalog.map(c => [c.id, c]));
  const corr = correlations(SD, catalog);
  const UNUSUAL = unusualMoves(SD, catalog); MK && (MK.unusual = UNUSUAL, MK.movesHTML = movesHTML);
  await write('api/unusual.json', JSON.stringify(UNUSUAL)); api['unusual'] = 'The biggest recent moves across every daily and monthly series, measured against each series’ own usual change';
  // ---- the Daily Desk: today's snapshot is saved to data/desk/ (committed by the markets workflow) so every day keeps its page
  if (MK && SD['nse-nifty-50']) {
    if (!existsSync('data/desk')) await mkdir('data/desk', { recursive: true });
    const deskDay = SD['nse-nifty-50'].d.at(-1); let saved;
    saved = readdirSync('data/desk').filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f => f.slice(0, 10)).filter(d => d !== deskDay).sort();
    const evs = JSON.parse(await readFile('data/events.json', 'utf8'));
    const snap = deskSnapshot({ SD, byId, unusual: UNUSUAL, tape, articles: m.articles, events: evs.events || evs, date: deskDay, prevDate: saved.filter(d => d < deskDay).at(-1) || SD['nse-nifty-50'].d.at(-2) });
    await writeFile(`data/desk/${deskDay}.json`, JSON.stringify(snap)); DESK = snap;
    if (process.env.DESK_BACKFILL) { const ds = SD['nse-nifty-50'].d, n = +process.env.DESK_BACKFILL; for (let k = ds.length - 1 - n; k < ds.length - 1; k++) if (!existsSync(`data/desk/${ds[k]}.json`)) { await writeFile(`data/desk/${ds[k]}.json`, JSON.stringify(deskSnapshot({ SD, byId, unusual: [], tape: { indicators: [] }, articles: m.articles, events: evs.events || evs, date: ds[k], prevDate: ds[k - 1] }))); saved.push(ds[k]); } saved.sort(); }
    const snaps = [...await Promise.all(saved.map(async d => JSON.parse(await readFile(`data/desk/${d}.json`, 'utf8')))), snap].sort((a, b) => b.date.localeCompare(a.date));
    const days = snaps.map(x => x.date);
    for (const x of snaps) await write(`desk/${x.date}/index.html`, P({ title: `The Daily Desk, ${x.date}`, path: `/desk/${x.date}/`, ogImage: `/img/desk/${x.date}.png`, description: `What moved in India’s markets and economy on ${x.date}: the Nifty, the rupee, oil, yields, reserves and the day’s data releases.`, body: deskPage(x, { pageHead, archive: days, movesHTML }) }));
    await write('desk/index.html', P({ title: 'The Daily Desk', path: '/desk/', ogImage: `/img/desk/${snap.date}.png`, description: 'What moved in India’s markets and economy today, written from the numbers: the Nifty, the rupee, oil, yields, reserves and the day’s releases.', body: deskPage(snap, { pageHead, archive: days, movesHTML, extra: (() => { const T = todayPage({ pageHead, tape, budget, MK, BUILT, embed: true }); return '<div class="yr-desk-link"><a href="/desk/india-year-in-review/">What shaped India’s economy →</a><p>Eight timelines connect today’s releases to the decisions that preceded them.</p></div>' + T.tiles + T.heat; })() }) }));
    await write('desk/archive/index.html', P({ title: 'The Daily Desk: every day', path: '/desk/archive/', description: 'Every Daily Desk page, by month.', body: deskArchive(snaps, { pageHead }) }));
    await write('api/desk.json', JSON.stringify(snap)); api['desk'] = 'Today’s Daily Desk as data: closing levels and changes for the main Indian and world markets, releases, events and what is coming up';
  }
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
  REOF['india-cpi'] = SERIES_KW['imf-pcpipch-ind'];
  const ALIASK = { 'imf-pcpipch-ind': 'india-cpi', 'fred-dexinus': 'fx-usdinr', 'wb-brent': 'fred-dcoilbrenteu' };
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
  const TOPIC_TOOLS = { 'money-finance': [['/external/', 'Rupee & reserves'], ['/economy/money/', 'Credit & money'], ['/what-if/', 'What if?']], 'trade-external-sector': [['/external/', 'Rupee & reserves'], ['/trade/', 'Trade'], ['/hormuz/', 'Shipping & oil']], 'public-finance': [['/economy/budget/', 'Budget'], ['/states/', 'State finances']],
    'growth-jobs-industry': [['/economy/industry/', 'Industry'], ['/world/', 'World rankings'], ['/companies/', 'Companies']], 'rural-economy-welfare': [['/economy/prices/', 'Prices'], ['/commodities/', 'Fertiliser & food'], ['/districts/', 'Districts']], 'energy-climate': [['/what-if/pump-price/', 'Pump price'], ['/what-if/', 'What if?'], ['/hormuz/', 'Shipping & oil']], 'world-geopolitics': [['/world/', 'World rankings'], ['/hormuz/', 'Shipping & oil'], ['/trade/', 'Trade']] };
  // every article reaches the data: articles that name no series get their topic's main series and dashboards
  for (const a of m.articles) {
    a.topicTools = TOPIC_TOOLS[a.topic] || [];
    if (!a.dataCards) { const ids = (TOPIC_SERIES[a.topic] || []).filter(id => SD[id] && byId[id]).slice(0, 3); if (ids.length) { a.dataCards = storyCards(ids.map(k => ({ k, type: 'series' })), SD, byId, 3); a.dataFallback = true; } }
  }
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
  const TAPE_INV = Object.fromEntries(Object.entries(TAPE_S).map(([k, v]) => [v, k]));
  // ---- concept pages: one page per economic question; series pages for India macro data redirect into them
  const SHORT = { 'fx-usdinr': 'Rupee per US dollar', 'fred-dexinus': 'Rupee per US dollar, long history (FRED)', 'rbi-fx-total': 'Foreign exchange reserves', 'rbi-fx-fca': 'Foreign currency assets', 'rbi-fx-gold': 'Gold', 'rbi-fx-sdr': 'SDRs', 'rbi-fwd1m': 'Forward premium, 1 month', 'rbi-fwd3m': 'Forward premium, 3 months', 'rbi-fwd6m': 'Forward premium, 6 months', 'imf-ngdp-rpch-ind': 'Real GDP growth', 'imf-pcpipch-ind': 'CPI inflation, annual average (IMF)', 'imf-bca-ngdpd-ind': 'Current account balance (IMF)', 'wdi-bn-cab-xoka-gd-zs-ind': 'Current account balance (World Bank)',
    'imf-ggxwdg-ngdp-ind': 'General government debt', 'imf-ggxcnl-ngdp-ind': 'General government net lending', 'imf-ngdpd-ind': 'Nominal GDP, US$', 'imf-pppgdp-ind': 'GDP at PPP', 'imf-ngdpdpc-ind': 'GDP per person, US$',
    'wdi-ne-gdi-totl-zs-ind': 'Gross capital formation', 'iip-general': 'Industrial production (IIP)', 'india-repo': 'Repo rate', 'rbi-call': 'Call money rate', 'rbi-tb91': '91-day T-bill', 'rbi-tb364': '364-day T-bill',
    'rbi-gsec10': '10-year G-Sec yield', 'rbi-crr': 'Cash reserve ratio', 'fred-dgs10': 'US 10-year Treasury', 'in-exports': 'Merchandise exports', 'in-imports': 'Merchandise imports', 'wdi-bx-gsr-nfsv-cd-ind': 'Service exports',
    'wdi-bx-trf-pwkr-cd-dt-ind': 'Remittances received', 'wdi-bx-klt-dinv-cd-wd-ind': 'FDI, net inflows', 'wdi-bx-pef-totl-cd-wd-ind': 'Portfolio equity, net inflows', 'wdi-dt-dod-dect-gn-zs-ind': 'External debt',
    'wdi-dt-dod-dstc-ir-zs-ind': 'Short-term debt', 'wdi-dt-tds-dect-ex-zs-ind': 'External debt service', 'wdi-ne-exp-gnfs-zs-ind': 'Exports of goods and services', 'wdi-ne-imp-gnfs-zs-ind': 'Imports of goods and services',
    'wdi-fi-res-totl-mo-ind': 'Reserves, months of imports', 'wdi-fi-res-totl-cd-ind': 'Total reserves (annual)' };
  for (const c of catalog) if (/^iip-/.test(c.id) && c.id !== 'iip-general' && !SHORT[c.id]) SHORT[c.id] = c.name.replace(/^IIP: /, '').replace(/, growth$/, '').replace(/ Goods$/, ' goods').replace('Infrastructure & construction goods', 'Infrastructure and construction');
  for (const id of ['rbi-credit-yoy', 'rbi-deposits-yoy', 'rbi-m3-yoy', 'rbi-cic-yoy', 'rbi-bccs-yoy']) if (byId[id]) SHORT[id] = byId[id].name.replace(/, year on year$/, '');
  for (const [id, sh] of Object.entries(SHORT)) if (byId[id]) byId[id].short = sh;
  const T = id => byId[id] ? id : null;
  const CONCEPTS = [
    { path: '/economy/prices/', title: 'Inflation', kicker: 'Economy · Prices', desc: 'India’s consumer price inflation since 2012: headline, food, core, rural and urban, every CPI group, the basket and its movers, and the IMF’s annual view and projections.',
      dek: `Headline CPI was ${tape.indicators.find(i => i.id === 'cpi')?.latest.value}% in ${tape.indicators.find(i => i.id === 'cpi')?.latest.period}, against the RBI’s 4% target and its 2–6% band. The history runs on the 2012-base index to December 2025 and the 2024-base index from January 2026.`,
      key: ['india-cpi', 'cpi-core', 'cpi-food', 'wpi', 'imf-pcpipch-ind'],
      panels: [
        { anchor: 'headline', title: 'Headline, food and core inflation', ids: ['india-cpi', 'cpi-food', 'cpi-core'], band: [2, 6], line: 4, breaks: [{ at: '2026-01', label: 'Base 2024' }], range: 'All', note: 'Year-on-year change. Shaded: the RBI’s 2–6% tolerance band around the 4% target (a statutory target since 2016). Food (CFPI) and core are on the 2012 base and end in December 2025; MoSPI does not yet publish either on the 2024 base.' },
        { anchor: 'wpi', title: 'Wholesale prices', ids: ['wpi', 'wpi-primary', 'wpi-fuel', 'wpi-manufactured', 'wpi-food'], range: '10Y', line: 0, breaks: [{ at: '2024-04', label: 'Base 2022-23' }], note: 'Year-on-year change in the Wholesale Price Index, computed from the index: base 2011-12 to March 2024, and the new base 2022-23 (introduced in June 2026, with indices back to April 2023) from April 2024. WPI leads CPI goods inflation by a few months and has no services.' },
        { anchor: 'groups', title: 'Inflation by CPI group', ids: ['cpi-g-food', 'cpi-g-fuel', 'cpi-g-housing', 'cpi-g-clothing', 'cpi-g-misc', 'cpi-g-pan'], range: '5Y', note: 'Combined (rural plus urban) CPI, 2012 base. Click a group in the legend to hide or show it.' },
        { anchor: 'rural-urban', title: 'Rural and urban', ids: ['cpi-rural', 'cpi-urban'], band: [2, 6], line: 4, range: '10Y' },
        { anchor: 'annual', title: 'Annual average, with IMF projections', ids: ['imf-pcpipch-ind'], line: 4, note: 'IMF World Economic Outlook, fiscal-year basis. Dashed: projections, which are excluded from every statistic on this page.' },
      ],
      method: `<ul><li><b>Headline.</b> CPI-Combined, all-India, year-on-year. MoSPI moved the base from 2012=100 to 2024=100 with the January 2026 index (released 12 February 2026), reweighted with the 2023-24 Household Consumption Expenditure Survey. Year-on-year rates on the new base start in January 2026; earlier months here are the 2012-base rates. The two are not strictly comparable: food and beverages fell from 45.9% of the basket to about 36.8%.</li>
        <li><b>Core.</b> Not an official series. Derived from the 2012-base indices by removing food and beverages (weight 45.86) and fuel and light (6.84) from the general index, then taking the year-on-year change. Analysts’ definitions differ (some also exclude petrol, diesel and gold), so levels will not match every published estimate.</li>
        <li><b>Food.</b> The Consumer Food Price Index (CFPI), which differs from the CPI “food and beverages” group: it excludes prepared meals and non-alcoholic beverages.</li>
        <li><b>Revisions.</b> Each month’s print is provisional and is revised with the next release; the latest month is marked provisional in the table.</li></ul>`,
      related: [['/states/', 'Inflation by state'], ['/commodities/', 'Food, fuel and fertiliser prices'], ['/economy/rates/', 'Policy rate and yields'], ['/what-if/', 'Oil and rupee shocks']] },
    { path: '/economy/growth/', title: 'Growth and output', kicker: 'Economy · Growth', desc: 'India’s real GDP growth since 1990 with IMF projections, the size of the economy in dollars and at PPP, income per person, investment, and monthly industrial output.',
      dek: 'The latest quarterly GDP estimate, annual national accounts with the IMF’s projections, and the monthly signals that arrive before GDP does.',
      key: ['gdp-q', 'imf-ngdp-rpch-ind', 'imf-ngdpd-ind', 'iip-general'],
      panels: [
        { anchor: 'real', title: 'Real GDP growth', ids: ['imf-ngdp-rpch-ind'], note: 'Per cent, fiscal year. Dashed: IMF projections.', bar: true },
        { anchor: 'size', title: 'Size of the economy', ids: ['imf-ngdpd-ind', 'imf-pppgdp-ind'], note: 'Current US$ billions at market exchange rates, and international dollars at purchasing power parity.' },
        { anchor: 'per-person', title: 'GDP per person', ids: ['imf-ngdpdpc-ind'] },
        { anchor: 'investment', title: 'Investment', ids: ['wdi-ne-gdi-totl-zs-ind'], note: 'Gross capital formation, per cent of GDP (World Bank).' },
        { anchor: 'fuel', title: 'Monthly activity: fuel demand', ids: ['oil-consumption-yoy'], line: 0, range: 'All', note: 'Year-on-year growth in total consumption of petroleum products (PPAC). Diesel and petrol demand is among the earliest monthly signals of activity.' },
        { anchor: 'iip', title: 'Monthly activity: industrial production', ids: ['iip-general', 'iip-manufacturing'], range: '10Y', note: 'Year-on-year growth of the Index of Industrial Production. Sector and use-based detail is on <a href="/economy/industry/">Industrial production</a>.' },
      ],
      method: '<ul><li>IMF figures are on India’s fiscal year (April to March) and come from the latest World Economic Outlook database; each vintage revises history.</li><li>The IIP has a 2011-12 base; growth before 2012 is spliced by MoSPI from the 2004-05 base.</li></ul>',
      related: [['/economy/industry/', 'Industrial production'], ['/world/', 'India against other economies'], ['/states/', 'Growth by state']] },
    { path: '/economy/rates/', title: 'Interest rates and yields', kicker: 'Economy · Rates', desc: 'India’s repo rate, money-market rates, Treasury bill and 10-year G-Sec yields, the term spread and the gap over US Treasuries.',
      dek: 'The policy rate, where overnight and short-term money trades against it, the 10-year sovereign yield, and the two spreads that matter for the curve and for capital flows.',
      key: ['india-repo', 'rbi-call', 'fbil-par-10', 'spread-in-us-10y'],
      panels: [
        { anchor: 'policy', title: 'Policy rate and the money market', ids: ['india-repo', 'rbi-call', 'rbi-tb91', 'rbi-tb364'], range: '5Y', note: 'Repo rate from MPC decisions; call money (weighted average) and Treasury bill yields from the RBI Weekly Statistical Supplement.' },
        { anchor: 'gsec', title: 'The 10-year G-Sec', ids: ['rbi-gsec10', 'fred-dgs10'], range: '5Y', note: 'FBIL 10-year par yield (weekly, from the RBI supplement) against the US 10-year Treasury (daily).' },
        { anchor: 'curve', title: 'The sovereign curve, daily', ids: ['fbil-par-3m', 'fbil-par-1', 'fbil-par-5', 'fbil-par-10', 'fbil-par-30'], range: '1Y', note: 'FBIL par yields, semi-annual, for each business day. FBIL’s free public files appear about a week after the date they value.' },
        { anchor: 'slope', title: 'Curve slope', ids: ['fbil-slope-10-1'], range: 'All', line: 0, note: 'Percentage points. A falling slope means short yields are rising towards long ones, typically when policy tightens.' },
        { anchor: 'spreads', title: 'Spreads', ids: ['spread-10y-tb91', 'spread-in-us-10y'], range: '5Y', note: 'Percentage points. Term spread: 10-year minus 91-day. Cross-border: India 10-year minus US 10-year, on matching weekly dates.' },
        { anchor: 'crr', title: 'Cash reserve ratio', ids: ['rbi-crr'] },
      ],
      method: '<ul><li>The repo rate is shown as a month-end step series built from each MPC decision.</li><li>Spreads are computed on dates where both series have an observation; no interpolation.</li></ul>',
      related: [['/economy/mpc/', 'How the MPC voted'], ['/economy/prices/', 'Inflation'], ['/external/', 'Rupee, reserves and forward premia'], ['/markets/', 'Bond and equity markets']] },
    { path: '/economy/activity/', title: 'Activity tracker', kicker: 'Economy · Activity', desc: 'India’s economy month by month before GDP arrives: UPI payments, fuel demand, industrial production, bank credit and trade, with a composite activity index.',
      dek: 'GDP arrives two months after a quarter ends. These monthly signals arrive sooner: digital payments, fuel use, factory output, lending and trade. The composite puts them on one scale.',
      key: ['activity-index', 'upi-value-yoy', 'oil-consumption-yoy', 'iip-general'],
      panels: [
        { anchor: 'composite', title: 'Activity index', ids: ['activity-index'], line: 0, range: 'All', bar: true, note: 'Equal-weight average of four year-on-year growth rates, each standardised over its own history: UPI value, petroleum product consumption, the IIP and bank credit. Zero is average growth; +1 is one standard deviation above it. A month needs at least three of the four. This is the site’s own composite, not an official statistic.' },
        { anchor: 'upi', title: 'Digital payments (UPI)', ids: ['upi-value-yoy', 'upi-volume-yoy'], range: '5Y', note: 'Year-on-year growth in UPI transaction value and count (NPCI). Growth has slowed as adoption matured; value growth now tracks nominal spending more closely.' },
        { anchor: 'upi-level', title: 'UPI value', ids: ['upi-value'], range: 'All', note: '₹ lakh crore a month.' },
        { anchor: 'upi-count', title: 'UPI transactions', ids: ['upi-volume'], range: 'All', note: 'Million transactions a month.' },
        { anchor: 'fuel', title: 'Fuel demand', ids: ['oil-consumption-yoy'], line: 0, range: 'All' },
        { anchor: 'credit', title: 'Bank credit and industrial output', ids: ['rbi-credit-yoy', 'iip-general'], range: '5Y' },
      ],
      method: '<ul><li>UPI figures are NPCI’s monthly product statistics, fetched through the site’s Mumbai relay because NPCI refuses non-Indian addresses.</li><li>The composite is recomputed on every build, so adding a month can shift earlier values slightly as the standardisation updates.</li></ul>',
      related: [['/economy/growth/', 'Growth and output'], ['/economy/industry/', 'Industrial production'], ['/economy/money/', 'Money and credit']] },
    { path: '/markets/flows/', title: 'Money flows', kicker: 'Markets · Flows', desc: 'Who buys Indian equities: foreign portfolio investors from NSDL since 2002, daily, and domestic mutual funds from AMFI since 2020.',
      dek: 'Foreign portfolio investors used to set the direction of Indian markets. Since 2021 domestic mutual funds, fed by monthly SIPs, have absorbed much of what foreigners sell. Both sides, from NSDL’s FPI Monitor and AMFI’s monthly report.',
      key: ['fpi-equity', 'mf-equity', 'fpi-equity-12m', 'mf-aum'],
      panels: [
        { anchor: 'monthly', title: 'Net FPI investment in equity, monthly', ids: ['fpi-equity'], bar: true, line: 0, range: '10Y', note: '₹ crore, calendar months. Positive: net buying.' },
        { anchor: 'rolling', title: 'Rolling 12-month equity flows', ids: ['fpi-equity-12m'], line: 0, range: 'All' },
        { anchor: 'total', title: 'All instruments', ids: ['fpi-total', 'fpi-equity'], line: 0, range: '5Y', note: 'Total includes debt (general limit, VRR and FAR), hybrids, mutual funds and AIFs.' },
        { anchor: 'daily', title: 'Daily equity flows', ids: ['fpi-equity-daily'], bar: true, line: 0, range: 'All', note: 'Provisional stock-exchange data for each trading day, collected from the day this page started.' },
        { anchor: 'domestic', title: 'Foreign and domestic: who buys when the other sells', ids: ['mf-equity', 'fpi-equity'], line: 0, range: '5Y', note: '₹ crore a month. Mutual fund figure: net inflows into equity-oriented schemes (AMFI Sub Total II), which funds then invest; it is not the funds’ net purchases on the exchange.' },
        { anchor: 'net', title: 'Mutual fund inflows plus FPI flows', ids: ['mf-vs-fpi'], bar: true, line: 0, range: '5Y', note: 'Sum of the two monthly series above. Positive: domestic fund inflows more than offset foreign selling.' },
        { anchor: 'funds', title: 'Mutual fund flows by category', ids: ['mf-equity', 'mf-hybrid', 'mf-debt'], line: 0, range: '3Y', note: 'Debt flows swing with quarter-end corporate treasury withdrawals from liquid funds.' },
        { anchor: 'etf', title: 'Exchange-traded funds', ids: ['mf-etf-equity', 'mf-etf-gold'], line: 0, range: '5Y' },
        { anchor: 'aum', title: 'Assets under management', ids: ['mf-aum', 'mf-equity-aum'], range: 'All', note: '₹ lakh crore, month-end.' },
      ],
      method: '<ul><li>NSDL compiles daily figures from stock-exchange data on trade day and confirms them from custodians’ reports later; the monthly table is the confirmed series.</li><li>AMFI’s monthly report gives net inflows (sales minus redemptions) and month-end assets by scheme category. Equity: Sub Total II (equity-oriented open-ended schemes); debt: Sub Total I; hybrid: Sub Total III. ETFs and index funds are reported under other schemes and are not in those subtotals. The series here starts in March 2020, the earliest month whose report the fetcher reads cleanly.</li></ul>',
      related: [['/markets/', 'Equities'], ['/external/', 'Rupee and reserves'], ['/external/balance-of-payments/', 'Balance of payments']] },
    { path: '/economy/industry/', title: 'Industrial production', kicker: 'Economy · Industry', desc: 'India’s Index of Industrial Production by sector and by use since 1994: mining, manufacturing, electricity, capital, intermediate, infrastructure and consumer goods.',
      dek: 'The Index of Industrial Production by sector and by end use, year on year, with the last thirteen months side by side. Released by MoSPI around the 28th of each month, about six weeks after the month ends.',
      key: ['iip-general', 'iip-manufacturing', 'iip-capital', 'iip-consumer-durables'],
      extraTop: `<section class="xr-sec"><h2 class="col-title">The last thirteen months</h2>${heatTable([['iip-general', 'General index'], ['iip-mining', 'Mining'], ['iip-manufacturing', 'Manufacturing'], ['iip-electricity', 'Electricity'], ['iip-primary', 'Primary goods'], ['iip-capital', 'Capital goods'], ['iip-intermediate', 'Intermediate goods'], ['iip-infrastructure-construction', 'Infrastructure and construction'], ['iip-consumer-durables', 'Consumer durables'], ['iip-consumer-non-durables', 'Consumer non-durables']].map(([id, n]) => [Object.keys(SD).find(k => k === id || k.startsWith(id)) || id, n]), SD)}<p class="meta">Green: growth; red: contraction. The latest month is a quick estimate and is revised in the next two releases.</p></section>`,
      panels: [
        { anchor: 'sectors', title: 'By sector', ids: ['iip-general', 'iip-mining', 'iip-manufacturing', 'iip-electricity'], range: '10Y', line: 0 },
        { anchor: 'use', title: 'By use', ids: ['iip-primary', 'iip-capital', 'iip-intermediate', Object.keys(SD).find(k => k.startsWith('iip-infrastructure')), 'iip-consumer-durables', 'iip-consumer-non-durables'].filter(Boolean), range: '5Y', line: 0, note: 'Capital goods and consumer durables are the swing components: the first tracks investment, the second discretionary spending.' },
      ],
      method: '<ul><li>Base 2011-12=100. Growth rates before 2012 are MoSPI’s spliced series on the 2004-05 base; the use-based groups for primary and infrastructure goods start in 2012.</li><li>2020-21 growth rates are distorted by the lockdown base; 2021-22 by its rebound.</li></ul>',
      related: [['/economy/growth/', 'Growth and output'], ['/economy/money/', 'Money and credit'], ['/companies/', 'Listed companies']] },
    { path: '/economy/money/', title: 'Money and credit', kicker: 'Economy · Money and credit', desc: 'India’s bank credit, deposits, money supply (M3), currency with the public and credit to the commercial sector, fortnightly from the RBI, with the credit-deposit ratio.',
      dek: 'How fast banks are lending and raising deposits, how much money is in the system, and how stretched balance sheets are. Fortnightly, from the RBI Weekly Statistical Supplement.',
      key: ['rbi-credit-yoy', 'rbi-deposits-yoy', 'rbi-m3-yoy', 'rbi-cd-ratio'],
      panels: [
        { anchor: 'growth', title: 'Credit and deposit growth', ids: ['rbi-credit-yoy', 'rbi-deposits-yoy', 'rbi-bccs-yoy'], range: '10Y' },
        { anchor: 'money', title: 'Money supply and currency', ids: ['rbi-m3-yoy', 'rbi-cic-yoy'], range: '10Y', note: 'The swing around 2017 is the November 2016 demonetisation: currency fell sharply that winter, so growth a year later was measured against the depleted base.' },
        { anchor: 'cd-ratio', title: 'Credit-deposit ratio', ids: ['rbi-cd-ratio'], range: 'All', note: 'Bank credit as a share of deposits. A rising ratio means lending is outrunning deposit growth, which pushes banks towards certificates of deposit and higher deposit rates.' },
        { anchor: 'levels', title: 'Outstanding credit and deposits', ids: ['rbi-credit', 'rbi-deposits'], range: 'All' },
      ],
      method: '<ul><li>The July 2023 merger of HDFC with HDFC Bank added about ₹6 lakh crore of loans to bank credit; year-on-year rates from July 2023 to June 2024 are inflated by it. RBI publishes ex-merger growth separately; these series do not adjust for it.</li><li>Growth rates are read from the RBI supplement’s tables. Each growth rate shown is the RBI’s published figure, kept only where it is within 1.5 points of the change in the RBI’s own outstanding amount over the year (in some periods, such as 2022, the two differ by about a point); a fortnight that fails the check is left blank rather than estimated.</li></ul>',
      related: [['/economy/rates/', 'Interest rates and yields'], ['/economy/prices/', 'Inflation'], ['/markets/', 'Bank shares']] },
    { path: '/external/', defer: true, title: 'Rupee and reserves', kicker: 'External · Rupee and reserves', desc: 'The rupee against the dollar since 2005, India’s foreign exchange reserves every week since 1998, the cost of hedging dollars, reserve cover, and the 2013 and 2026 FCNR(B) episodes side by side.',
      dek: 'The exchange rate, the reserves the RBI holds to defend it, and the forward premium that prices the cost of hedging. The episode comparison sets the 2026 defence against the 2013 one.',
      key: ['fx-usdinr', 'rbi-fx-total', 'rbi-fwd3m', 'wdi-fi-res-totl-mo-ind'], alsoTable: ['fred-dexinus', 'rbi-fx-fca', 'rbi-fx-gold', 'rbi-fx-sdr'],
      panels: [
        { anchor: 'forwards', title: 'Forward premium on the dollar', ids: ['rbi-fwd1m', 'rbi-fwd3m', 'rbi-fwd6m'], range: '5Y', note: 'Annualised, per cent (FBIL). Roughly the interest-rate gap between India and the US; spikes mark hedging stress.' },
        { anchor: 'cover', title: 'Reserve cover', ids: ['wdi-fi-res-totl-mo-ind'], note: 'Months of imports covered by reserves (World Bank, annual).' },
      ],
      method: '<ul><li>The weekly reserves figure includes foreign currency assets, gold, SDRs and the reserve tranche position at the IMF; it is gross and does not net off the RBI’s forward book.</li></ul>',
      related: [['/external/balance-of-payments/', 'Balance of payments'], ['/economy/rates/', 'Interest rates and yields'], ['/what-if/', 'Rupee shock scenarios'], ['/external/data/', 'Data appendix']] },
    { path: '/external/balance-of-payments/', title: 'Balance of payments', kicker: 'External · Balance of payments', desc: 'India’s current account from the IMF and the World Bank, monthly merchandise trade, services, remittances, FDI and portfolio flows, and external debt.',
      dek: 'How India pays its way: the current account, the trade in goods and services that drives it, the capital that finances it, and the debt it leaves behind.',
      key: ['imf-bca-ngdpd-ind', 'in-exports', 'wdi-bx-trf-pwkr-cd-dt-ind', 'wdi-dt-dod-dect-gn-zs-ind'],
      panels: [
        { anchor: 'current-account', title: 'Current account balance, per cent of GDP', ids: ['imf-bca-ngdpd-ind', 'wdi-bn-cab-xoka-gd-zs-ind'], line: 0, note: 'Two estimates of the same thing: the IMF’s (fiscal year, with projections dashed) and the World Bank’s (calendar year). Differences come from the year basis and GDP denominators.' },
        { anchor: 'trade', title: 'Monthly merchandise trade', ids: ['in-exports', 'in-imports'], range: '10Y', note: 'US$, seasonally adjusted (OECD via FRED). Partner and product detail is on <a href="/trade/">Trade</a>.' },
        { anchor: 'oil', title: 'The oil bill', ids: ['oil-crude-bill', 'oil-net-imports-usd'], range: 'All', note: 'US$ million a month (PPAC). Crude is roughly a quarter of India’s merchandise imports; the net figure subtracts petroleum product exports. PPAC prorates the latest months until DGCI&S data arrive.' },
        { anchor: 'oil-volume', title: 'Crude oil imports, volume', ids: ['oil-crude-imports'], range: 'All' },
        { anchor: 'openness', title: 'Trade in goods and services, per cent of GDP', ids: ['wdi-ne-exp-gnfs-zs-ind', 'wdi-ne-imp-gnfs-zs-ind'] },
        { anchor: 'invisibles', title: 'Services and remittances', ids: ['wdi-bx-gsr-nfsv-cd-ind', 'wdi-bx-trf-pwkr-cd-dt-ind'], note: 'US$, annual (World Bank).' },
        { anchor: 'capital', title: 'Capital flows', ids: ['wdi-bx-klt-dinv-cd-wd-ind', 'wdi-bx-pef-totl-cd-wd-ind'], line: 0, note: 'Net inflows, US$ (World Bank).' },
        { anchor: 'debt', title: 'External debt', ids: ['wdi-dt-dod-dect-gn-zs-ind', 'wdi-dt-dod-dstc-ir-zs-ind', 'wdi-dt-tds-dect-ex-zs-ind'], note: 'Total external debt (% of GNI), short-term debt (% of reserves) and debt service (% of exports of goods, services and primary income).' },
      ],
      method: '<ul><li>Quarterly balance-of-payments data from the RBI are not yet on the site; annual figures here come from the IMF and the World Bank, monthly trade from the OECD via FRED.</li></ul>',
      related: [['/external/', 'Rupee and reserves'], ['/trade/', 'Trade by partner'], ['/hormuz/', 'Shipping and oil']] },
  ];
  const CONCEPT_OF = {};
  for (const C of CONCEPTS) for (const p of C.panels) for (const id of p.ids) if (byId[id] && !CONCEPT_OF[id]) CONCEPT_OF[id] = `${C.path}#${p.anchor}`;
  for (const id of ['imf-ggxwdg-ngdp-ind', 'imf-ggxcnl-ngdp-ind']) if (byId[id]) CONCEPT_OF[id] = '/economy/budget/#fiscal';
  for (const id of ['iip-general', 'iip-manufacturing']) if (byId[id]) CONCEPT_OF[id] = '/economy/industry/#sectors';
  for (const c of catalog) { if (CONCEPT_OF[c.id]) continue;
    if (/^(rbi-fx-|rbi-inr|rbi-fwd)/.test(c.id)) CONCEPT_OF[c.id] = '/external/';
    else if (/^wdi-fi-res/.test(c.id)) CONCEPT_OF[c.id] = '/external/#cover';
    else if (/^(fx-usdinr|fred-dexinus)$/.test(c.id)) CONCEPT_OF[c.id] = '/external/#rp-main'; }
  const conceptUrl = id => CONCEPT_OF[id] || `/s/${id}/`;
  globalThis.__CONCEPT_OF = CONCEPT_OF;
  // release calendar
  const CAL = JSON.parse(await readFile('data/calendar.json', 'utf8')), EVENTS = calendarEvents(CAL, new Date(Date.UTC(BUILT.getUTCFullYear(), BUILT.getUTCMonth(), BUILT.getUTCDate())));
  globalThis.__EVENTS = EVENTS;
  await write('desk/calendar/index.html', P({ title: 'Release calendar', path: '/desk/calendar/', description: 'When India’s CPI, WPI, IIP, GDP, trade data, RBI policy decisions and reserves are released over the next ten weeks.', body: calendarPage(EVENTS, CAL.note) }));
  // feeds: latest readings as RSS, the release calendar as iCalendar, and embeddable charts for every series
  { const xe = t => String(t).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
    const ids = ['india-cpi', 'wpi', 'iip-general', 'india-repo', 'rbi-gsec10', 'rbi-credit-yoy', 'rbi-fx-total', 'in-exports', 'in-imports', 'oil-crude-bill', 'upi-value', 'fpi-equity', 'mf-equity', 'activity-index', 'cpi-core', 'imf-ngdp-rpch-ind'].filter(id => SD[id] && byId[id]);
    const items = ids.map(id => { const mm = byId[id], r = readings(mm, SD[id]); const u = BASE_URL + ((globalThis.__CONCEPT_OF || {})[id] || `/s/${id}/`);
      return `<item><title>${xe(`${mm.short || mm.name}: ${r.last.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${/%/.test(mm.unit) ? '%' : ' ' + mm.unit} (${period(r.at, mm.freq)})`)}</title><link>${xe(u)}</link><guid isPermaLink="false">${id}-${r.at}</guid><description>${xe(`Previous ${r.prev ?? '—'}; a year earlier ${r.yAgo ?? '—'}. Source: ${mm.source}.`)}</description></item>`; }).join('');
    for (const c of catalog) { const S0 = SD[c.id]; if (!S0) continue; const u0 = BASE_URL + ((globalThis.__CONCEPT_OF || {})[c.id] || `/s/${c.id}/`);
      const its = S0.d.map((d, k) => [d, S0.v[k]]).slice(-12).reverse().map(([d, v]) => `<item><title>${xe(`${c.short || c.name}: ${(+v).toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${period(d, c.freq)})`)}</title><link>${xe(u0)}</link><guid isPermaLink="false">${c.id}-${d}</guid></item>`).join('');
      await write(`feeds/${c.id}.xml`, `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xe((c.short || c.name) + ' · The Kakistocrat')}</title><link>${xe(u0)}</link><description>${xe(`${c.name}, ${c.unit}, ${c.freq}. Source: ${c.source}.`)}</description>${its}</channel></rss>`); }
    await write('feeds/data.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>The Kakistocrat: latest Indian data</title><link>${BASE_URL}/economy/</link><description>The latest reading of each headline Indian indicator. A new item appears when a new month or week is published.</description>${items}</channel></rss>`);
    const ics = (globalThis.__EVENTS || []).map(e => { const d = e.date.replace(/-/g, ''); return ['BEGIN:VEVENT', `UID:${d}-${e.name.replace(/\W+/g, '-')}@kakistocrat.pages.dev`, `DTSTAMP:${BUILT.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${e.name}${e.ref ? ' (' + e.ref + ')' : ''}${e.time ? ' ' + e.time + ' IST' : ''}`, `DESCRIPTION:${e.body}. ${e.kind === 'official' ? 'Official date.' : 'Usual release day; may move for holidays.'}`, `URL:${BASE_URL}${e.url}`, 'END:VEVENT'].join('\r\n'); }).join('\r\n');
    await write('feeds/calendar.ics', `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//The Kakistocrat//Release calendar//EN\r\nX-WR-CALNAME:Indian data releases (The Kakistocrat)\r\nX-WR-TIMEZONE:Asia/Kolkata\r\n${ics}\r\nEND:VCALENDAR\r\n`);
    for (const c of catalog) { const nm = c.short || c.name;
      await write(`embed/${c.id}/index.html`, `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(nm)} · The Kakistocrat</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/styles.css"></head><body class="embed-body">
        <div class="ip-panel" id="e"><div class="mk-chart-head"><b style="font:600 14px var(--sans)">${esc(nm)}</b><div class="mk-ctrl"><span class="seg ip-range">${['1Y', '5Y', 'All'].map(r => `<button type="button" data-r="${r}"${r === 'All' ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span><button type="button" class="btn ghost ip-csv">CSV</button></div></div>
        <div class="ec ip-chart" data-noclick style="height:300px" data-cfg='${esc(JSON.stringify({ ids: [c.id], range: 'All', names: { [c.id]: nm } }))}'></div>
        <p class="meta" style="margin:4px 0 0">${esc(c.unit)}, ${esc(c.freq)}. Source: ${esc(c.source)}. <a href="${BASE_URL}${(globalThis.__CONCEPT_OF || {})[c.id] || '/s/' + c.id + '/'}" target="_blank" rel="noopener">The Kakistocrat →</a></p></div>
        <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script><script src="/indicator.js" defer></script></body></html>`); }
  }
  // calculators
  { const basket = JSON.parse(await readFile('data/cpi_basket.json', 'utf8'));
    await write('what-if/my-inflation/index.html', P({ title: 'Your own inflation rate', path: '/what-if/my-inflation/', description: 'Reweight India’s official CPI group inflation rates to your household’s spending and compare your inflation rate with the headline.', body: myInflationPage(basket) }));
    const CH = existsSync('data/markets/cpi_hist.json') ? JSON.parse(await readFile('data/markets/cpi_hist.json', 'utf8')).series : {};
    const gen = (CH['Combined|General|General-Overall'] || []).filter(r => r[1] != null).map(r => [r[0], r[1]]), idx = new Map(gen);
    const tp = tape.indicators.find(x => x.id === 'cpi'); const MO = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
    for (const h of [...(tp?.history || []), { t: tp?.latest.period, v: tp?.latest.value }]) { if (!h.t) continue; const [mo, y] = h.t.split(' '), d = `${y}-${MO[mo]}`, p = `${+y - 1}-${MO[mo]}`; if (!idx.has(d) && idx.has(p)) { idx.set(d, +(idx.get(p) * (1 + h.v / 100)).toFixed(2)); gen.push([d, idx.get(d)]); } }
    gen.sort((a, b) => a[0].localeCompare(b[0]));
    const mAvg = id => { const o = {}; if (!SD[id]) return o; SD[id].d.forEach((d, k) => { const m = d.slice(0, 7); (o[m] ||= []).push(SD[id].v[k]); }); return Object.fromEntries(Object.entries(o).map(([m, v]) => [m, v.reduce((a, b) => a + b, 0) / v.length])); };
    const LONG = existsSync('data/markets/inr_long.json') ? JSON.parse(await readFile('data/markets/inr_long.json', 'utf8')).pts : [], lo = {}; for (const [d, v] of LONG) (lo[d.slice(0, 7)] ||= []).push(v);
    const fx = { ...Object.fromEntries(Object.entries(lo).map(([m, v]) => [m, v.reduce((a, b) => a + b, 0) / v.length])), ...mAvg('fx-usdinr') }, gold = (SD['wb-gold'] ? SD['wb-gold'].d.map((d, k) => [d.slice(0, 7), fx[d.slice(0, 7)] ? +(SD['wb-gold'].v[k] * fx[d.slice(0, 7)]).toFixed(0) : null]) : []).filter(x => x[1]);
    if (gen.length) await write('what-if/rupee-value/index.html', P({ title: 'What a rupee from then is worth now', path: '/what-if/rupee-value/', description: 'Carry any sum of rupees between two months since 2011 with the consumer price index, and compare with holding gold.', body: rupeeValuePage(gen, gold, SD['nse-nifty-50'] ? Object.entries(mAvg('nse-nifty-50')).map(([m, v]) => [m, +v.toFixed(1)]) : []) }));
    if (SD['india-cpi'] && SD['india-repo']) await write('what-if/policy-rule/index.html', P({ title: 'Is the RBI tight or loose? A Taylor rule for India', path: '/what-if/policy-rule/', description: 'A Taylor rule for India: the repo rate implied by inflation and the output gap, against the actual repo rate, with your own assumptions.', body: policyRulePage(SD['india-cpi'].d.map((d, k) => [d, SD['india-cpi'].v[k]]), SD['india-repo'].d.map((d, k) => [d, SD['india-repo'].v[k]]), { repo: SD['india-repo'].v.at(-1) }) }));
    const D = SD['imf-ggxwdg-ngdp-ind'], pf = byId['imf-ggxwdg-ngdp-ind']?.projectionFrom;
    if (D) { const act = D.d.map((d, k) => [d.slice(0, 4), D.v[k]]).filter(([y]) => !pf || y < pf); const last = act.at(-1);
      await write('what-if/debt-path/index.html', P({ title: 'Where is India’s public debt heading?', path: '/what-if/debt-path/', description: 'Project India’s general government debt with your own interest rate, growth and primary balance, against the IMF’s projection.', body: debtPathPage({ year: last[0], value: last[1] }, D.d.map((d, k) => [d.slice(0, 4), D.v[k]])) })); }
  }
  globalThis.__CONCEPTS = CONCEPTS;
  for (const C of CONCEPTS) { if (C.defer) continue;
    const mandiHTML = await (async () => { if (C.path !== '/economy/prices/' || !existsSync('data/markets/mandi.json')) return '';
      const M = JSON.parse(await readFile('data/markets/mandi.json', 'utf8')), days = Object.keys(M.days).sort(), d = days.at(-1), p = days.at(-2); if (!d) return '';
      const nice = c => c.replace(/\(.*?\)/g, m => ' ' + m).replace(/\s+/g, ' ').replace(/^./, x => x.toUpperCase());
      const rows = Object.entries(M.days[d]).filter(([, x]) => x.markets >= 40).sort((a, b) => b[1].markets - a[1].markets).slice(0, 36);
      const st = ['onion', 'tomato', 'potato'].map(c => [c, Object.values(M.states?.[c] || {})[0] || {}]);
      const states = [...new Set(st.flatMap(([, o]) => Object.keys(o)))].sort();
      return `<section class="xr-sec" id="mandi"><h2 class="col-title">Mandi prices today</h2><p class="meta">Wholesale modal prices reported to Agmarknet on ${esc(new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }))}, averaged across the markets that reported. ₹ per quintal (100 kg), so ₹2,500 a quintal is ₹25 a kg wholesale. Commodities reported by at least 40 markets.${p ? '' : ' Day-on-day changes appear from the next trading day, and a price history builds from here.'}</p>
        <div class="ip-tw"><table class="ip-t"><thead><tr><th>Commodity</th><th>₹/quintal</th><th>₹/kg</th><th>Markets</th>${p ? '<th>Previous day</th>' : ''}</tr></thead><tbody>${rows.map(([c, x]) => { const q = p && M.days[p][c]; return `<tr><th>${esc(nice(c))}</th><td><b>${x.price.toLocaleString('en-IN')}</b></td><td>${(x.price / 100).toFixed(1)}</td><td>${x.markets}</td>${p ? `<td>${q ? `${q.price.toLocaleString('en-IN')}<span>${x.price >= q.price ? '+' : '−'}${Math.abs((x.price / q.price - 1) * 100).toFixed(1)}%</span>` : '—'}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>
        ${states.length ? `<h3 class="sub-h" style="margin-top:18px">Onion, tomato and potato by state, ₹/quintal</h3><div class="ip-tw"><table class="ip-t"><thead><tr><th>State</th>${st.map(([c]) => `<th>${nice(c)}</th>`).join('')}</tr></thead><tbody>${states.map(sn => `<tr><th>${esc(sn)}</th>${st.map(([, o]) => `<td>${o[sn] != null ? o[sn].toLocaleString('en-IN') : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
        <p class="meta">Source: Agmarknet, Department of Agriculture and Farmers Welfare, via data.gov.in. Modal price: the price at which most of the day’s trade in that market happened. Unweighted by arrivals.</p></section>`; })();
    const gdpHTML = C.path === '/economy/growth/' && existsSync('data/gdp_q.json') ? (() => { const G = JSON.parse(readFileSync('data/gdp_q.json', 'utf8')), L = G.latest;
      return `<section class="xr-sec" id="quarterly"><h2 class="col-title">Quarterly GDP: ${esc(L.quarter)}</h2><p class="meta">Released ${esc(L.released)} by MoSPI; the next estimate (${esc('the following quarter')}) is due ${esc(L.next)}. ${esc(G.note)}</p>
        <div class="ip-tw"><table class="ip-t"><thead><tr><th>Year-on-year growth, %</th>${L.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${L.rows.map(r => `<tr><th>${esc(r[0])}</th>${r.slice(1).map(v => `<td>${v == null ? '—' : `<b>${v.toFixed(1)}</b>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="meta">Sources: ${G.sources.map(x => `<a href="${esc(x.url)}">${esc(x.name)}</a>`).join('; ')}. A dash: not stated in the sources used. Updated by a scheduled task after each release.</p></section>`; })() : '';
    const extra = gdpHTML + mandiHTML + (C.path === '/economy/prices/' ? infographicsPage({ pageHead, year: BUILT.getUTCFullYear(), basket: JSON.parse(await readFile('data/cpi_basket.json', 'utf8')), only: ['cpi'], head: false }) : '');
    await write(C.path.slice(1) + 'index.html', P({ title: C.title, path: C.path, description: C.desc, body: conceptPage({ ...C, extraBottom: extra }, { SD, byId }) }));
  }
  for (const c of catalog) if (!CONCEPT_OF[c.id]) await write(`s/${c.id}/index.html`, P({ jsonld: { '@context': 'https://schema.org', '@type': 'Dataset', name: c.name, description: `${c.name}${c.unit ? ', ' + c.unit : ''}, ${c.freq}. Source: ${c.source}. Updated automatically.`, url: `${BASE_URL}/s/${c.id}/`, creator: { '@type': 'Person', name: 'Arinjai Das' }, isAccessibleForFree: true, temporalCoverage: c.first && c.last ? `${c.first}/${c.last}` : undefined, distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${BASE_URL}/api/series/${c.id}.json` }] }, title: c.name, path: `/s/${c.id}/`, ogImage: TAPE_INV[c.id] ? `/img/release/${TAPE_INV[c.id]}.png` : undefined, description: `${c.name}: ${c.unit}, ${c.freq}, ${c.first} to ${c.last}. Chart, history, what moves with it, and the articles that mention it.`, body: entitySeriesPage(c, SD[c.id], { catalog, corr, ment, byId, crumbsFor, tapeBy }) }));
  for (const st of states.states) await write(`state/${slugify(st.name)}/index.html`, P({ title: st.name, path: `/state/${slugify(st.name)}/`, description: `${st.name}: income, growth, inflation, debt and finances, ranked against every state, with similar states and related articles.`, body: statePage(st, { S: states, SC, ment, posters }) }));
  if (W) { const fxCodes = new Set(Object.keys(MK.fx?.rates || {}));
    for (const iso of Object.keys(W.countries)) { const n = cleanCountry(W.countries[iso]); await write(`country/${slugify(n)}/index.html`, P({ title: n, path: `/country/${slugify(n)}/`, description: `${n}: GDP, income per person, growth, inflation and debt, ranked among every economy, with India alongside.`, body: countryPage(iso, { W, SC, ment, year: BUILT.getUTCFullYear(), catalog, fxCodes, tradeHTML: MK?.trade ? tradeBlock(MK.trade, iso, n) : '' }) })); }
    await write('explore/index.html', P({ title: 'Explore', path: '/explore/', description: 'Every series, state, country and article on the site, connected.', body: explorePage({ sections: SECTIONS, catalog, S: states, W, ment, articles: m.articles, net, unusual: UNUSUAL }) })); }
  // site-wide search index: [type, name, url, extra]
  const searchIdx = [
    ...TOOLS.map(t => ['t', t.kicker, t.url, t.title]),
    ...posters.map(p => ['m', `Map: ${p.kicker}`, `/states/#${p.id}`, p.title]),
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
  await write('api/catalog.json', JSON.stringify([...catalog, ...HIDDEN.map(c => ({ ...c, hidden: true }))]));
  // chart images at fixed URLs for embedding in WordPress posts (redrawn on every build)
  try { execSync(`python3 scripts/render_cards.py ${OUT}`, { stdio: 'inherit', timeout: 300000 }); } catch (e) { console.warn('Social cards skipped:', e.message); }
  if (!process.env.SKIP_IMG) { try { execSync(`python3 scripts/render_charts.py ${OUT}`, { stdio: 'inherit', timeout: 900000 }); } catch (e) { console.warn('Chart images skipped:', e.message); } }
  await write('charts/index.html', P({ title: 'Chart workbench', path: '/charts/', description: `Plot any of ${catalog.length} series on Indian markets, currencies, commodities, rates and the world economy.`, body: workbenchPage([...catalog, ...HIDDEN.map(c => ({ ...c, group: 'World: other countries (annual)' }))], { pageHead }) }));
  api['health'] = 'Site health from the last build: broken internal links, data series that have gone stale, pages missing a title or description';
  api['catalog'] = `Catalogue of ${catalog.length + HIDDEN.length} series (${HIDDEN.length} world series marked hidden have no page but can be charted); each is at /api/series/{id}.json`;
  if (MK) { await write('api/rupee.json', JSON.stringify(rupeeData(MK, tape))); api['rupee'] = 'Rupee page bundle: 15 currencies per US dollar (daily), US rates and dollar index, India repo and 10-year yield, external-sector indicators for India and 13 peers'; }
  await write('api/index.json', JSON.stringify({ site: BASE_URL, updated: BUILT.toISOString(), endpoints: Object.fromEntries(Object.entries(api).map(([k, v]) => [`${BASE_URL}/api/${k}.json`, v])) }, null, 1));


  const reviewPaths = await writeYearReview({
    review, wp: m.articles, fiscal, gdp, repoCsv, repoScript,
    repoResults: execSync('python3 scripts/repo_transmission.py data/repo-transmission.csv', { encoding: 'utf8' }),
    pageHead, publish: P, write,
  });
  await write('what-if/gst-pass-through/index.html', P({ title: 'GST rate-cut pass-through calculator', path: '/what-if/gst-pass-through/', description: 'Model how a statutory GST rate cut is split between the consumer, seller and gross GST tax on an illustrative transaction.', body: gstPassThroughPage({ pageHead }) }));
  const capexAudit = JSON.parse(await readFile('data/fy26-capex-audit.json','utf8'));
  const blueprintCommissions = JSON.parse(await readFile('data/blueprint-commissions.json','utf8'));
  await write('api/research/fy26-capex.json', JSON.stringify(capexAudit));
  await write('research/fy26-capex/data.csv', capexAuditCsv(capexAudit));
  await write('api/blueprint-commissions.json', JSON.stringify(blueprintCommissions));
  await write('research/fy26-capex/index.html', P({ title: 'FY2025–26 Union capex execution audit', path: '/research/fy26-capex/', description: 'Source-linked Union capital expenditure, from original Budget to provisional FY26 accounts, with interactive variance comparisons and downloadable data.', body: capexAuditPage({ data: capexAudit, pageHead }) }));
  await write('desk/commissions/index.html', P({ title: 'The Kakistocrat research queue', path: '/desk/commissions/', description: 'The original 19 economic-history investigations, their available published coverage and remaining empirical tests.', body: commissioningPage({ data: blueprintCommissions, articles: m.articles, pageHead }) }));
  await write('api/research/getting-to-work-schema.json', await readFile('data/getting-to-work-survey-schema.json', 'utf8'));
  await write('research/getting-to-work/research-design.md', await readFile('docs/getting-to-work-research-design.md','utf8'));
  await write('research/getting-to-work/analysis.py', await readFile('scripts/getting_to_work_analysis.py','utf8'));
  await write('research/getting-to-work/index.html', P({ title: 'The economics of getting to work', path: '/research/getting-to-work/', description: 'A transparent wage, housing and commute-cost scenario comparison and downloadable anonymised research instrument.', body: gettingToWorkPage({pageHead}) }));
  const chinaExposure = chinaInputsData(JSON.parse(await readFile('data/markets/trade.json','utf8')));
  const thaliInputs = thaliData(JSON.parse(await readFile('data/markets/mandi.json','utf8')));
  const dollarBoP = JSON.parse(await readFile('data/dollar-cushion-bop.json','utf8'));
  await write('api/research/china-inputs.json', JSON.stringify(chinaExposure));
  await write('api/research/thali-snapshot.json', JSON.stringify(thaliInputs));
  await write('api/research/dollar-cushion.json', JSON.stringify(dollarBoP));
  await write('research/china-inputs/data.csv', chinaInputsCsv(chinaExposure));
  await write('research/thali/data.csv', thaliCsv(thaliInputs));
  await write('research/dollar-cushion/data.csv', dollarCushionCsv(dollarBoP));
  await write('research/china-inputs/index.html', P({ title: 'India’s China-origin inputs by HS chapter', path: '/research/china-inputs/', description: 'Source-linked India-reported UN Comtrade 2025 merchandise imports from China at HS2, with distinct hypothetical supplier cost calculations.', body: chinaInputsPage({ data: chinaExposure, pageHead }) }));
  await write('research/thali/index.html', P({ title: 'The price of a thali: ingredient accounting', path: '/research/thali/', description: 'Dated Agmarknet wholesale-market averages and a transparent, illustrative cost calculation for selected rice, dal and vegetables.', body: thaliPage({ data: thaliInputs, pageHead }) }));
  await write('research/dollar-cushion/index.html', P({ title: 'India’s dollar cushion: RBI balance of payments', path: '/research/dollar-cushion/', description: 'RBI September and April–September 2026 balance-of-payments ledger for goods, services, transfers and financing with hypothetical scenario controls.', body: dollarCushionPage({ data: dollarBoP, pageHead }) }));
  const yearOutcomes = JSON.parse(await readFile('data/year-outcome-scorecard.json','utf8'));
  await write('api/research/year-outcome-scorecard.json', JSON.stringify(yearOutcomes));
  await write('desk/outcomes/index.html', P({ title: 'Five outcomes that shaped India’s year', path: '/desk/outcomes/', description: 'Five outcome dimensions with dated MoSPI, RBI and CGA evidence and their interpretation limits, without an invented composite score.', body: outcomesPage({data: yearOutcomes, pageHead}) }));
  const fcnrFinancing = JSON.parse(await readFile('data/fcnr-financing-2026.json','utf8'));
  await write('api/research/fcnr-2026.json', JSON.stringify(fcnrFinancing));
  await write('research/fcnr-2026/facility.csv', fcnrCsv(fcnrFinancing));
  await write('research/fcnr-2026/bop-financing.csv', financingCsv(fcnrFinancing));
  await write('research/fcnr-2026/index.html', P({ title: '2026 NRI deposit financing: RBI facility and balance-of-payments bridge', path: '/research/fcnr-2026/', description: 'Original-source RBI FCNR(B) facility mobilisation snapshots versus distinct net balance-of-payments NRI deposits, with an accounting stress test.', body: fcnrFinancingPage({data:fcnrFinancing,pageHead}) }));
  await write('desk/chronology/index.html', P({ title: 'Economic chronology: 2025–26', path: '/desk/chronology/', description: 'Search source-linked milestones across eight Indian economic storylines, with dated policy decisions and analysis.', body: chronologyPage({ review, articles: m.articles, pageHead }) }));
  reviewPaths.push('/desk/chronology/', '/desk/commissions/', '/desk/outcomes/', '/research/fy26-capex/', '/research/getting-to-work/', '/research/china-inputs/', '/research/thali/', '/research/dollar-cushion/', '/research/fcnr-2026/');
  const oilWeekPaths = await writeOilWeekArchive({ source: await readFile('docs/oil-rupee-52-week-retrospective.md','utf8'), pageHead, publish: P, write });
  reviewPaths.push(...oilWeekPaths);
  await write('index.html', P({ title: 'India’s economy, in data', path: '/', description: 'Source-linked Indian economic data, market snapshots, policy research and interactive scenario tools from The Kakistocrat.', body: home(m, tape, ledger, { SD, byId }) }));
  const stressInputs = await readFile('data/rupee-stress.json', 'utf8');
  const stress = rupeeStress({ data: JSON.parse(stressInputs), pageHead });
  await write('research/oil-rupee/index.html', P({ title: 'Who pays when the rupee falls?', path: rupeeStressPath, description: 'A reproducible stress test of the rupee, India’s crude imports and household petrol bills.', ogImage: '/research/oil-rupee/pass-through.png', body: stress.body }));
  await write('research/oil-rupee/inputs.json', stressInputs);
  await write('research/oil-rupee/results.csv', stress.csv);
  for (const a of m.articles) await write(`a/${a.slug}/index.html`, P({ title: a.title, description: a.excerpt, path: a.url, canonical: a.wpLink, active: a.topic, type: 'article', body: articlePage(a, m) }));
  for (const t of TOPIC_ORDER) await write(`topic/${t}/index.html`, P({ title: TOPICS[t].name, description: TOPICS[t].blurb, path: `/topic/${t}/`, active: t, body: topicPage(t, m) }));
  await write('series/index.html', P({ title: 'Series', path: '/series/', description: 'Questions followed across several articles.', body: seriesIndex(m) }));
  for (const s of m.series) await write(`series/${s.slug}/index.html`, P({ title: s.name, path: `/series/${s.slug}/`, description: s.description, body: seriesPage(s, review) }));
  await write('archive/index.html', P({ title: 'Archive and search', path: '/archive/', description: 'Search every article.', body: archivePage(m) }));
  if (false) await write('data/index.html', P({ title: 'India macro data', path: '/data/', description: 'CPI, repo rate, rupee, bond yields, Brent and the Nifty with sources.', body: dataHub(tape, m) }));
  if (false) for (const i of tape.indicators) await write(`data/${i.id}/index.html`, P({ title: i.label, path: `/data/${i.id}/`, description: i.definition, body: indicatorPage(i, m) }));
  await write('ledger/index.html', P({ title: 'Policy Ledger', path: '/ledger/', description: 'Policies tracked from announcement to measured outcome.', body: ledgerPage(ledger, m) }));
  const FCS = scoreCalls(fc, SD, BUILT.toISOString().slice(0, 10)); await write('api/forecasts.json', JSON.stringify({ method: fc.method, calls: FCS.map(({ spark, ...c }) => c) }));
  if (HAS_CALLS) await write('forecasts/index.html', P({ title: 'Forecast Book', path: '/forecasts/', description: 'Testable calls with probabilities, revisions and results.', body: fcPage(fc, FCS, { pageHead }) }));
  await write('what-if/index.html', P({ title: 'What if? The scenario engine', path: '/what-if/', description: 'Move oil, the rupee and the repo rate; see the pump price, your fuel bill, India’s import bill, the current account and your EMI change together.', body: scenarioPage({ MK, tape, pump: JSON.parse(await readFile('data/pump.json', 'utf8')), sc: JSON.parse(await readFile('data/scenario.json', 'utf8')), pageHead }) }));
  if (existsSync('data/markets/mpc.json')) { const MR = JSON.parse(await readFile('data/markets/mpc.json', 'utf8')), MD = mpcData(MR);
    await write('economy/mpc/index.html', P({ title: 'How the RBI’s Monetary Policy Committee voted, meeting by meeting', path: '/economy/mpc/', description: `Every vote by every MPC member since October 2016, from the RBI’s minutes: ${MD.meetings.length} meetings, split decisions and each member’s dissents.`, body: mpcPage(MR, { pageHead }) }));
    await write('api/mpc.json', JSON.stringify({ source: MR.source, meetings: MD.meetings.map(m => ({ meeting: m.date, minutes_released: m.released, minutes: m.url, resolution: m.rate, decision: m.move, votes: m.votes.map(x => [x.name, x.v]), other_resolutions: m.other })) })); }
  await write('economy/budget/index.html', P({ title: 'The Union Budget 2026-27, line by line', path: '/economy/budget/', description: 'How far the Centre has got through its 2026-27 Budget: receipts, spending and the fiscal deficit against the full-year plan.', body: budgetPage(budget, { pageHead, findRelated, articles: m.articles }) + infographicsPage({ pageHead, year: BUILT.getUTCFullYear(), only: ['rupee'], head: false }) + conceptPage({ bare: true, panels: [{ anchor: 'fiscal', title: 'General government debt and deficit, per cent of GDP', ids: ['imf-ggxwdg-ngdp-ind', 'imf-ggxcnl-ngdp-ind'], line: 0, note: 'Centre plus states, IMF World Economic Outlook, fiscal year. Net lending is the overall balance (negative: deficit). Dashed: IMF projections.' }] }, { SD, byId }) }));
  const msmeHTML = await (async () => { if (!existsSync('data/ogd/msme.json')) return ''; const M = JSON.parse(await readFile('data/ogd/msme.json', 'utf8')); const st = {};
    for (const r of M.rows) { const k = r.state_name.replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase()).replace(/\bAnd\b/g, 'and'); const a = st[k] ||= { micro: 0, small: 0, medium: 0, total: 0, districts: 0 }; for (const f of ['micro', 'small', 'medium', 'total']) a[f] += +r[f] || 0; a.districts++; }
    const rows = Object.entries(st).sort((a, b) => b[1].total - a[1].total), all = rows.reduce((s, [, a]) => s + a.total, 0);
    const top = M.rows.slice().sort((a, b) => b.total - a.total).slice(0, 10);
    return `<div class="wrap"><section class="xr-sec" id="msme"><h2 class="col-title">Small business registrations (Udyam)</h2><p class="meta">Enterprises registered on the Udyam portal, cumulative, by state, from the Ministry of MSME via data.gov.in (fetched ${esc(M.fetched.slice(0, 10))}). ${all.toLocaleString('en-IN')} enterprises in all. Registration is voluntary and counts firms, not jobs or output, so it measures formalisation as much as activity.</p>
      <div class="ip-tw"><table class="ip-t"><thead><tr><th>State</th><th>Total</th><th>Share of India</th><th>Micro</th><th>Small</th><th>Medium</th><th>Districts</th></tr></thead><tbody>${rows.map(([k, a]) => `<tr><th>${esc(k)}</th><td><b>${a.total.toLocaleString('en-IN')}</b></td><td>${(a.total / all * 100).toFixed(1)}%</td><td>${a.micro.toLocaleString('en-IN')}</td><td>${a.small.toLocaleString('en-IN')}</td><td>${a.medium.toLocaleString('en-IN')}</td><td>${a.districts}</td></tr>`).join('')}</tbody></table></div>
      <h3 class="sub-h" style="margin-top:16px">The ten districts with the most registrations</h3><p class="chips">${top.map(r => `<span class="chip">${esc(r.district_name)}, ${esc(r.state_name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))}: ${(+r.total).toLocaleString('en-IN')}</span>`).join('')}</p></section></div>`; })();
  await write('states/index.html', P({ title: 'India’s states compared', path: '/states/', description: 'Indian states compared on income per person, growth, inflation, debt and interest burden, and each state’s economy set beside a country of the same size.', body: statesPage(states, { pageHead }) + infographicsPage({ pageHead, year: BUILT.getUTCFullYear(), sc: JSON.parse(await readFile('data/states_countries.json', 'utf8')), statePos: states.states, only: ['sc'], head: false }) + msmeHTML }));
  if (false) await write('tools/two-chart-test/index.html', P({ title: 'The Two-Chart Test', path: '/tools/two-chart-test/', description: 'Common claims about India’s economy tested against two charts side by side.', body: twoChartPage(twocharts, { pageHead }) }));
  if (false) await write('tools/exposure/index.html', P({ title: 'Geoeconomics Exposure Map', path: '/tools/exposure/', description: 'India’s dependence on foreign suppliers for oil, fertiliser and China-sourced electronics, with a disruption calculator.', body: exposurePage(exposure, { pageHead, inrRate: tape.indicators.find(i => i.id === 'inr').latest.value }) }));
  if (MK) {
    await write('markets/index.html', P({ title: 'Markets', path: '/markets/', description: 'NSE indices, Nifty 50 heatmap, valuations, yield curves, currencies and live crypto.', body: marketsPage(MK, { pageHead }) + `<div class="wrap"><div class="live"><span><span class="dot"></span>Live</span><span>Bitcoin <b data-live="BTC-USD">…</b></span><span>Ether <b data-live="ETH-USD">…</b></span><small>Coinbase, in US$; change over 24 hours. Indian market data are end of day.</small></div><script src="/live.js" defer></script></div>` }));
    await write('commodities/index.html', P({ title: 'Commodities', path: '/commodities/', description: 'Energy, metals, fertiliser and food prices with five-year ranges and comparison charts.', body: commoditiesPage(MK, { pageHead }) }));
  }
  { const pump = JSON.parse(await readFile('data/pump.json', 'utf8')); const b = MK?.fredLast?.DCOILBRENTEU, ir = MK?.fxOut?.table.find(t => t.c === 'INR');
    await write('what-if/pump-price/index.html', P({ title: 'What’s in a litre of petrol', path: '/what-if/pump-price/', description: 'The Delhi petrol price broken into oil company price, central excise, dealer commission and VAT, with a calculator.', body: pumpPage(pump, { pageHead, brent: b ? { v: b.last[1], d: b.last[0] } : null, inr: ir?.last }) })); }
  if (existsSync('data/districts.json')) { const DD = JSON.parse(await readFile('data/districts.json', 'utf8')); await write('api/districts.json', JSON.stringify(DD)); api['districts'] = 'District indicators keyed by Census 2011 district code (Census 2011 and NFHS-5 phase 1), with names; boundaries at /geo/india-districts.json';
    await write('districts/index.html', P({ title: 'India, district by district', path: '/districts/', description: 'An interactive map of India’s 640 districts: literacy, women at work, toilets, tap water, cooking gas, phones, the internet, child stunting and anaemia.', body: districtsPage(DD, { pageHead }) })); }
  // ---- Nifty 500 companies
  const CO = loadCompanies();
  if (CO) {
    const coRx = x => x.n.length >= 6 ? new RegExp('\\b' + x.n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i') : null;
    const plain = m.articles.map(a => ({ a, t: (a.title + ' ' + a.html).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&') }));
    for (const x of Object.values(CO.C)) { const re = coRx(x); const arts = re ? plain.filter(p => re.test(p.t)).map(p => p.a) : [];
      await write(`company/${x.slug}/index.html`, P({ title: `${x.n} (${x.s}): share price, peers and performance`, path: `/company/${x.slug}/`, description: `${x.n} on the NSE: closing price, market value, returns against the Nifty, 52-week range, trading and delivery, and the biggest ${x.ind} peers.`, body: companyPage(x, { CO, SD, byId, articles: arts }) })); }
    searchIdx.push(...Object.values(CO.C).map(x => ['co', `${x.n} (${x.s})`, `/company/${x.slug}/`, x.ind]), ['p', 'Companies: the Nifty 500', '/companies/', 'Market map']); await write('api/search.json', JSON.stringify(searchIdx));
    await write('companies/index.html', P({ title: 'The Nifty 500, company by company', path: '/companies/', description: 'India’s 500 largest listed companies on one map: market value, returns over a day, a month and a year, by industry, each with its own page.', body: companiesHub(CO, { pageHead }) }));
    await write('api/companies.json', JSON.stringify({ date: CO.date, companies: Object.values(CO.C).map(({ c, t, dp, ...x }) => x) })); api['companies'] = 'Nifty 500 companies: name, industry, ISIN, market value (₹ crore), last close, returns over a day, week, month, quarter, six months, a year and the year to date, 52-week range, turnover and delivery share (NSE)';
  }
  { const L = id => (globalThis.__CONCEPT_OF || {})[id] || `/s/${id}/`;
    const G = [['Activity', [['activity-index'], ['upi-value-yoy'], ['imf-ngdp-rpch-ind'], ['iip-general'], ['iip-manufacturing'], ['iip-capital'], ['oil-consumption-yoy']]], ['Prices', [['india-cpi'], ['cpi-core'], ['cpi-food'], ['wpi'], ['imf-pcpipch-ind']]],
      ['Money, credit and rates', [['india-repo'], ['rbi-call'], ['rbi-gsec10'], ['spread-in-us-10y'], ['rbi-credit-yoy'], ['rbi-deposits-yoy'], ['rbi-m3-yoy'], ['rbi-cd-ratio']]],
      ['Public finance', [['imf-ggxcnl-ngdp-ind'], ['imf-ggxwdg-ngdp-ind']]],
      ['External', [['imf-bca-ngdpd-ind'], ['in-exports'], ['in-imports'], ['oil-crude-bill'], ['rbi-fx-total', null, 'Foreign exchange reserves'], ['fx-usdinr', null, 'Rupee per US dollar'], ['wdi-dt-dod-dect-gn-zs-ind']]],
      ['Markets', [['fpi-equity'], ['mf-equity'], ['nse-nifty-50', null, 'Nifty 50'], ['nifty50-pe', null, 'Nifty 50 P/E'], ['nse-india-vix', null, 'India VIX'], ['fred-dcoilbrenteu', null, 'Brent crude']]]].map(([g, xs]) => [g, xs.map(([id, u, l]) => [id, u || L(id), l])]);
    await write('economy/index.html', P({ title: 'India macro dashboard', path: '/economy/', description: 'Every headline Indian macro indicator in one table: growth, industry, inflation, rates, credit, the budget, the external accounts and markets, each against its history and linked to its full page.',
      body: `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">Economy</span><h1>India macro dashboard</h1><p class="dek sm">Every headline indicator in one table, each against its own history: the previous reading, a year earlier, the five-year average and where it sits in the last ten years. Click an indicator for its full page. Statistics use published figures only; IMF projections are listed separately.</p></div></div></div></div>
      <div class="wrap"><section class="xr-sec">${dashboardPage(G, { SD, byId })}</section><section class="xr-sec"><h2 class="col-title">Pages</h2><p class="chips">${[['/economy/growth/', 'Growth and output'], ['/economy/industry/', 'Industrial production'], ['/economy/prices/', 'Inflation'], ['/economy/money/', 'Money and credit'], ['/economy/rates/', 'Interest rates and yields'], ['/economy/budget/', 'Budget and debt'], ['/external/balance-of-payments/', 'Balance of payments'], ['/external/', 'Rupee and reserves']].map(([u, t]) => `<a class="chip" href="${u}">${t}</a>`).join('')}</p></section></div>` })); }
  if (MK?.trade) { const cs = {}, cn = {}; for (const iso of Object.keys(W.countries)) { cn[iso] = cleanCountry(W.countries[iso]); cs[iso] = slugify(cn[iso]); } await write('trade/index.html', P({ title: 'India’s trade: who buys, who sells, and what', path: '/trade/', description: 'India’s goods exports and imports by partner and product since 2015, from UN Comtrade, with surpluses, deficits and every partner linked to its country page.', body: tradePage(MK.trade, { pageHead, countrySlug: cs, countryName: cn }) })); }
  if (MK?.rbiFx) { const C = globalThis.__CONCEPTS.find(c => c.path === '/external/');
    const full = externalPage(MK, { pageHead, episodes: JSON.parse(await readFile('data/episodes.json', 'utf8')), rupee: rupeePage(MK, tape, { pageHead, embed: true }) });
    // keep the rupee lab, the stacked reserves with the FCNR(B) windows and the episode comparison; drop the money-market and annual sections (now on Rates and Balance of payments)
    const w1 = full.indexOf('<div class="wrap">'), w2 = full.indexOf('<div class="wrap">', w1 + 5), body = full.slice(w2 + '<div class="wrap">'.length);
    const parts = body.split('<section '), keep = [parts[0]];
    for (const pc of parts.slice(1)) { if (/id="xt-rates"|id="xt-annual"|>Use the data</.test(pc)) { const k = pc.lastIndexOf('</section>'); keep.push('<!--x-->' + pc.slice(k + 10)); } else keep.push('<section ' + pc); }
    const lab = keep.join('').replace(/<!--x-->/g, '').replace(/<\/div>\s*(<script>window.__XT)/, '$1');
    await write('external/index.html', P({ title: C.title, path: '/external/', description: C.desc, body: conceptPage({ ...C, extraTop: `<div class="xt-lab">${lab}</div>` }, { SD, byId }) })); }
  if (MK?.imfWorld) await write('world/index.html', P({ title: 'India against the world', path: '/world/', description: 'Where India ranks among every economy in the IMF World Economic Outlook: GDP, income per person, growth, inflation, debt and the current account.', body: worldPage(MK.imfWorld, { pageHead, year: BUILT.getUTCFullYear() }) + infographicsPage({ pageHead, year: BUILT.getUTCFullYear(), only: ['race', 'bub', 'debt'], head: false }) }));
  if (MK) { const AF = appendixFiles(MK, SD, byId); for (const [n, f] of Object.entries(AF)) await write(`api/csv/${n}`, f.csv);
    await write('external/data/index.html', P({ title: 'External sector data appendix', path: '/external/data/', description: 'India’s weekly reserves, money-market rates, fortnightly money and credit, the daily rupee, annual external accounts and trade by partner, as CSV files with sources.', body: appendixPage(AF, JSON.parse(await readFile('data/episodes.json', 'utf8')), { pageHead }) })); }
  if (MK?.portwatch) { const st = hormuzStory(MK, SD, { pageHead, trade: MK.trade }); if (st) await write('stories/hormuz/index.html', P({ title: 'Hormuz, in numbers: the closure and India', path: '/stories/hormuz/', description: 'A scrolling data story: ship counts through the Strait of Hormuz before and after the March 2026 closure, oil, the rupee, India’s oil bill and its Gulf trade, all from live data.', body: st })); }
  if (MK?.portwatch) await write('hormuz/index.html', P({ title: 'Chokepoint watch: Hormuz and the shipping lanes', path: '/hormuz/', description: 'Daily ship transits through the Strait of Hormuz, Bab el-Mandeb, Suez, the Cape of Good Hope and Malacca, from IMF PortWatch.', body: hormuzPage(MK, { pageHead }) }));
  if (MK) await write('terminal/index.html', P({ title: 'The Kakistocrat Terminal', path: '/terminal/', description: 'Every Indian and global market and macro number on one dense screen, with a command bar to chart any of 300 series.', body: terminalPage({ MK, tape, articles: m.articles, BUILT }) }));
  await write('api/index.html', P({ title: 'Data API', path: '/api/', description: 'Free JSON endpoints for every dataset on the site.', body: apiPage(api) }));
  await write('404.html', P({ title: 'Page not found', path: '/404', body: notFound() }));

  const idx = m.articles.map(a => ({ title: a.title, excerpt: a.excerpt, url: a.url, date: a.date.slice(0, 10), topic: a.topic, topicName: TOPICS[a.topic].short, color: TOPICS[a.topic].color, format: a.format, series: a.series[0]?.name || '' }));
  await write('search.json', JSON.stringify(idx));
  const urls = ['/', ...reviewPaths, '/series/', '/archive/', '/explore/', '/ledger/', ...(HAS_CALLS ? ['/forecasts/'] : []), '/desk/', '/desk/calendar/', '/desk/archive/', '/markets/', '/companies/', '/commodities/', '/terminal/', '/economy/', '/economy/activity/', '/markets/flows/', '/economy/growth/', '/economy/industry/', '/economy/money/', '/economy/prices/', '/economy/rates/', '/economy/budget/', '/external/balance-of-payments/', '/external/', '/external/data/', '/trade/', '/hormuz/', '/states/', '/districts/', '/world/', '/what-if/', '/what-if/my-inflation/', '/what-if/rupee-value/', '/what-if/policy-rule/', '/what-if/debt-path/', '/what-if/pump-price/', '/what-if/gst-pass-through/', '/charts/', '/stories/hormuz/', '/api/', ...TOPIC_ORDER.map(t => `/topic/${t}/`), ...m.series.map(s => `/series/${s.slug}/`), ...catalog.map(c => `/s/${c.id}/`), ...(existsSync('data/markets/nse500_meta.json') ? Object.keys(JSON.parse(readFileSync('data/markets/nse500_meta.json', 'utf8')).companies).map(s => `/company/${s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-')}/`).filter(u => existsSync(join(OUT, u, 'index.html'))) : []), ...states.states.map(st => `/state/${slugify(st.name)}/`)];
  await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${BASE_URL}${u}</loc></url>`).join('')}</urlset>`);
  await write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /wp-kit/\nSitemap: ${BASE_URL}/sitemap.xml\n`);
  const MOVED = [['/today/', '/desk/'], ['/rupee/', '/external/'], ['/maps/', '/states/'], ['/maps/districts/', '/districts/'], ['/infographics/', '/states/'], ['/tools/', '/explore/'], ['/tools/shock-lab/', '/what-if/'], ['/tools/pump-price/', '/what-if/pump-price/'], ['/tools/emi/', '/what-if/'], ['/tools/budget-x-ray/', '/economy/budget/'], ['/tools/india-by-state/', '/states/'], ['/tools/two-chart-test/', '/charts/'], ['/tools/exposure/', '/what-if/'], ['/chartle/', '/charts/'], ['/explainers/', '/archive/'], ['/data/', '/desk/'], ...(HAS_CALLS ? [] : [['/forecasts/', '/ledger/']]), ...HIDDEN.map(c => { const iso = c.id.split('-').pop().toUpperCase(), n = W?.countries?.[iso]; return n ? [`/s/${c.id}/`, `/country/${slugify(cleanCountry(n))}/`] : null; }).filter(Boolean), ...Object.entries(TAPE_S).map(([k, v]) => [`/data/${k}/`, `/s/${v}/`])];
  for (const [id, u] of Object.entries(globalThis.__CONCEPT_OF || {})) MOVED.push([`/s/${id}/`, u]);
  await write('_redirects', MOVED.flatMap(([a, b]) => [`${a} ${b} 301`, `${a.replace(/\/$/, '')} ${b} 301`]).join('\n') + '\n');
  await write('_headers', `/api/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=900\n/wp-kit/*\n  Access-Control-Allow-Origin: https://thekakisto.wordpress.com\n  Cache-Control: no-store\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/styles.css\n  Cache-Control: public, max-age=3600\n/app.js\n  Cache-Control: public, max-age=3600\n`);
  { const CO = globalThis.__CONCEPT_OF || {}, { readdir } = await import('node:fs/promises');
    for (const f of (await readdir(OUT, { recursive: true })).filter(f => f.endsWith('.html') || f === 'search.json' || f.endsWith('.json') && f.startsWith('api/') && !f.startsWith('api/series/'))) {
      const fp = join(OUT, f), h = await readFile(fp, 'utf8'), h2 = h.replace(/\/s\/([a-z0-9-]+)\//g, (m, id) => CO[id] || m); if (h2 !== h) await writeFile(fp, h2); } }
  console.log(`Built ${m.articles.length} articles, ${m.series.length} series → ${OUT}/`);
  try { execSync(`node scripts/check_site.mjs ${OUT}`, { stdio: 'inherit' }); } catch (e) { console.warn('Site checks failed to run:', e.message); }
}
main().catch(e => { console.error(e); process.exit(1); });
