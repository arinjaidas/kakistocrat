// India in maps: poster-style state maps (one idea per map, bold title, stepped colours, values on the map),
// each saveable as a 1080x1350 image. Boundaries: DataMeet maps (MIT), as per the Survey of India.
import { esc } from './charts.mjs';

const L = v => v >= 1e5 ? `₹${(v / 1e5).toFixed(v >= 1e6 ? 0 : 1)}L` : `₹${Math.round(v / 1000)}k`;
const P1 = v => `${v.toFixed(1)}%`, P2 = v => `${v.toFixed(1)}%`;

// Palettes: flat, bold, print-like. Index 0 = lowest bucket.
const HEAT = ['#2E6F73', '#8FBFB4', '#F3E6C8', '#EBA25C', '#B5401E'];
const GOODLOW = ['#B5401E', '#EBA25C', '#F3E6C8', '#8FBFB4', '#2E6F73'];
const GOLD = ['#F6EBD2', '#EFCB86', '#DE9A3E', '#B4611C', '#6E2E0E'];
const INDIGO = ['#E8E6F2', '#B9B3DA', '#8378BF', '#4F3F98', '#271C5E'];

function bucketsFrom(breaks, fmt, unit = '') {
  return breaks.length + 1 === 5 ? [`below ${fmt(breaks[0])}${unit}`, ...breaks.slice(0, -1).map((b, i) => `${fmt(b)}–${fmt(breaks[i + 1])}${unit}`), `${fmt(breaks.at(-1))}${unit} or more`] : [];
}

export function mapPosters(S, SC, cpiMonth) {
  const st = S.states, by = k => st.filter(s => s[k] != null).sort((a, b) => b[k] - a[k]);
  const vals = k => Object.fromEntries(st.filter(s => s[k] != null).map(s => [s.name, s[k]]));
  const ind = id => S.indicators.find(i => i.id === id);
  const posters = [];

  // 1. States as countries
  if (SC) {
    const v = Object.fromEntries(SC.states.map(s => [s.name, s.usd])), lab = Object.fromEntries(SC.states.map(s => [s.name, s.country]));
    posters.push({ id: 'countries', kicker: 'States as countries', title: 'If India’s states were countries', sub: `Each state’s economy matched to the country closest to it in size (GDP in US dollars, ${SC.states[0].year}). ${SC.states[0].name} is ${SC.states[0].country}.`,
      values: v, labels: lab, fmt: 'usd', breaks: [25, 75, 150, 300], colors: INDIGO, legend: ['under $25bn', '$25–75bn', '$75–150bn', '$150–300bn', '$300bn+'],
      source: 'RBI Handbook of Statistics on Indian States (GSDP); IMF WEO (country GDP). Gujarat 2022-23; Goa and some NE states 2023-24.' });
  }
  // 2. Inflation
  { const r = by('cpi'), i = ind('cpi');
    posters.push({ id: 'inflation', kicker: 'Inflation', title: `Prices are rising fastest in ${r[0].name}`, sub: `Consumer price inflation by state, ${i.year}, year on year. ${r[0].name} ${P2(r[0].cpi)}, ${r.at(-1).name} ${P2(r.at(-1).cpi)}; all-India ${P2(S.allIndia.cpi)}.`,
      values: vals('cpi'), fmt: 'pct', breaks: [4, 5, 6, 7], colors: HEAT, legend: bucketsFrom([4, 5, 6, 7], v => v, '%'), source: `MoSPI CPI press release, ${esc(i.year)} (provisional), base 2024=100.` }); }
  // 3. Income per person
  { const r = by('pcIncome'), i = ind('pcIncome'), x = r[0].pcIncome / r.at(-1).pcIncome;
    posters.push({ id: 'income', kicker: 'Income per person', title: `Someone in ${r[0].name} earns ${x.toFixed(0)}× as much as someone in ${r.at(-1).name}`, sub: `Per capita net state domestic product at current prices, ${i.year}. All-India: ${L(S.allIndia.pcIncome)} a year.`,
      values: vals('pcIncome'), fmt: 'inr', breaks: [150000, 250000, 350000, 500000], colors: GOLD, legend: ['under ₹1.5L', '₹1.5–2.5L', '₹2.5–3.5L', '₹3.5–5L', '₹5L or more'], source: 'RBI Handbook of Statistics on the Indian Economy, per capita NSDP, current prices.' }); }
  // 4. Growth
  { const r = by('growth'), i = ind('growth');
    posters.push({ id: 'growth', kicker: 'Growth', title: `${r[0].name} grew fastest; ${r.at(-1).name} slowest`, sub: `Real growth in net state domestic product, ${i.year}. ${r[0].name} ${P1(r[0].growth)}, ${r.at(-1).name} ${P1(r.at(-1).growth)}.`,
      values: vals('growth'), fmt: 'pct1', breaks: [6.5, 7.5, 8.5, 10], colors: GOODLOW, legend: ['under 6.5%', '6.5–7.5%', '7.5–8.5%', '8.5–10%', '10% or more'], source: 'RBI Handbook of Statistics on the Indian Economy, NSDP at constant prices.' }); }
  // 5. Debt
  { const r = by('debt'), i = ind('debt');
    posters.push({ id: 'debt', kicker: 'State debt', title: `${r[0].name} owes the most for the size of its economy`, sub: `Outstanding liabilities as a share of GSDP, ${i.year}. ${r[0].name} ${P1(r[0].debt)}, ${r.at(-1).name} ${P1(r.at(-1).debt)}; all states ${P1(S.allIndia.debt)}.`,
      values: vals('debt'), fmt: 'pct1', breaks: [25, 30, 35, 40], colors: HEAT, legend: ['under 25%', '25–30%', '30–35%', '35–40%', '40% or more'], source: 'RBI, State Finances: A Study of Budgets.' }); }
  // 6. Interest
  { const r = by('interest'), i = ind('interest');
    posters.push({ id: 'interest', kicker: 'Interest burden', title: `${r[0].name} spends ${Math.round(r[0].interest)}% of its budget on interest`, sub: `Interest payments as a share of revenue spending, ${i.year}. All states: ${P1(S.allIndia.interest)}.`,
      values: vals('interest'), fmt: 'pct1', breaks: [8, 11, 14, 17], colors: HEAT, legend: ['under 8%', '8–11%', '11–14%', '14–17%', '17% or more'], source: 'RBI, State Finances: A Study of Budgets.' }); }
  // 7. Self-reliance
  { const r = by('ownRev'), i = ind('ownRev');
    posters.push({ id: 'self-reliance', kicker: 'Self-reliance', title: `${r.at(-1).name} raises only ${Math.round(r.at(-1).ownRev)}% of what it spends`, sub: `Own tax and non-tax revenue as a share of revenue spending, ${i.year}. The rest comes from the Centre or borrowing. All states: ${P1(S.allIndia.ownRev)}.`,
      values: vals('ownRev'), fmt: 'pct1', breaks: [30, 45, 60, 75], colors: GOODLOW, legend: ['under 30%', '30–45%', '45–60%', '60–75%', '75% or more'], source: 'RBI, State Finances: A Study of Budgets.' }); }
  return posters;
}

export function mapsPage(S, SC, { pageHead }) {
  const posters = mapPosters(S, SC);
  const cards = posters.map(p => `<figure class="mp-card" id="${p.id}"><div class="mp-map" data-id="${p.id}" role="img" aria-label="${esc(p.title)}"></div>
   <figcaption><button type="button" class="btn ghost mp-save" data-id="${p.id}">Save image</button><a class="mp-link" href="#${p.id}">Link</a></figcaption></figure>`).join('');
  return pageHead('India in maps', 'India in maps', 'One idea per map: where prices are rising fastest, who earns the most, which states owe the most, and what each state’s economy would be as a country. Hover for values; save any map as an image sized for Instagram.') + `<div class="wrap">
  <nav class="mp-nav">${posters.map(p => `<a href="#${p.id}">${esc(p.kicker)}</a>`).join('')}</nav>
  <div class="mp-grid">${cards}</div>
  <section class="xr-sec"><h2 class="col-title">About these maps</h2><ul class="src">
   <li>State boundaries: <a href="https://github.com/datameet/maps">DataMeet maps</a> (MIT licence), as per the official boundary of India from the Survey of India, simplified for the web.</li>
   <li>Data: as listed on each map. Grey means no data for that state or union territory. All figures and definitions are on <a href="/tools/india-by-state/">India by State</a>, and downloadable from <a href="/api/states.json">/api/states.json</a>.</li>
  </ul></section></div>
  <script>window.__MAPS=${JSON.stringify(posters)};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/maps.js?v=${Date.now()}" defer></script>`;
}
