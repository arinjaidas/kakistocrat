const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const date = value => new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long', timeZone: 'UTC'
}).format(new Date(value + 'T00:00:00Z'));
const fmt = value => Number(value).toLocaleString('en-IN');
const reviewPath = '/desk/india-year-in-review/';
const seriesPath = id => reviewPath + id + '/';

const routes = [
  ['Households and jobs', 'Food, fuel, pay, benefits and borrowing costs.', ['work', 'oil', 'rates', 'measurement']],
  ['Firms and investment', 'Export orders, credit, factories and capacity.', ['tariffs', 'trade-deals', 'industry', 'rates']],
  ['Government and states', 'Taxes, transfers, spending and implementation.', ['public-money', 'work', 'industry']],
  ['India and the world', 'Trade rules, energy supply and the demand for dollars.', ['tariffs', 'oil', 'trade-deals']]
];
const tools = [
  ['/stories/five-bills/', 'One oil shock, five bills', 'LPG, fertiliser, freight, excise and the import bill.'],
  ['/economy/divergence/', 'Growth, work and earnings', 'Read GDP, jobs, prices and company results together.'],
  ['/states/fiscal-room/', 'Same policy, different states', 'Compare committed spending and capital outlay.'],
  ['/research/repo-transmission/', 'The Research Notebook', 'Reproduce the comparison of repo, loan and deposit rates.'],
  ['/what-if/landed-cost/', 'Landed-cost calculator', 'Compare two suppliers under your own duty and cost assumptions.'],
  ['/ledger/', 'Policy Ledger', 'Track the steps from a decision to a measured outcome.']
];
const essays = [
  ['price-of-a-thali', 'The Price of a Thali', 'How do the costs of a meal change between farm, mandi and shop?', [
    ['Begin at the farm', 'Use the same crop, grade and harvest window to compare procurement and prices. An MSP matters where farmers can sell to a procurement agency.', '/a/india-kharif-msp-2026-procurement-paddy-diversification/'],
    ['Follow supply to the mandi', 'Compare arrivals and modal prices across the same markets. A thin market can give misleading prices when few trades are recorded.', 'https://www.agmarknet.gov.in/DailyDataEntry/UserManual.pdf'],
    ['Put it back in a household budget', 'Use rural and urban CPI food groups to show who faces the steepest increases. Retail CPI and mandi prices cover different transactions.', '/a/india-july-2026-inflation-rural-urban-household-baskets/']
  ], 'The next comparison pairs district rainfall, crop arrivals and retail prices for two foods with comparable observations.'],
  ['indias-dollar-cushion', 'India’s Dollar Cushion', 'How does India pay for oil and gold when its goods trade is in deficit?', [
    ['Start with the goods bill', 'Crude, gold and other goods generate different demand for dollars. Compare categories and periods before assigning a driver.', '/a/india-gold-import-duty-15-percent-external-account/'],
    ['Add services and transfers', 'Receipts from services and remittances can offset a wider goods gap. Investment income and other payments also enter the current account.', '/a/india-current-account-deficit-q1-2026-services-remittances-capital-flows/'],
    ['Follow the financing', 'Separate direct and portfolio flows from reserves. The RBI’s oil-marketer window changes where companies obtain dollars.', '/a/rbi-oil-dollar-window-rupee-market-liquidity/']
  ], 'At the next RBI release, compare the latest four quarters and check revisions before interpreting the change.'],
  ['the-china-price-shock', 'The China Price Shock', 'When do cheaper inputs help Indian buyers, and when do they displace production?', [
    ['Separate import prices from import mix', 'A lower average customs value can reflect cheaper grades or a change in product mix. Use matched customs lines and physical units.', '/trade/'],
    ['Read the steel safeguard case', 'The investigation concerns covered flat products. Compare the injury findings and the rule that applies to each line.', 'https://www.dgtr.gov.in/sites/default/files/2025-08/NCV%20FINAL%20SGD%20Steel%2016.08.2025.pdf'],
    ['Count the downstream buyer', 'The producer and the firm using imported steel face different costs. Compare one covered product against domestic substitutes and other origins.', '/a/us-section-301-excess-capacity-investigation-economic-test/']
  ], 'The first quantitative follow-up needs matched steel grades, import volumes, prices and the applicable safeguard notification.'],
  ['getting-to-work', 'The Economics of Getting to Work', 'Which jobs can a household afford to reach?', [
    ['Start with a fare and a clock', 'Compare door-to-door travel time and monthly fares for competing routes, including transfers and waiting time.', '/a/india-metro-ridership-feeder-time-fare-integration/'],
    ['Put rent and wages on the same map', 'A cheaper home can leave a worker with a higher total cost if reaching the job takes longer or is less reliable.', '/a/india-pmay-urban-rental-housing-commute-job-access/'],
    ['Include childcare hours', 'A transport improvement is usable only if the work and travel schedule fits the hours of care available to the household.', '/a/palna-anganwadi-creches-india-hours-reliability-working-families/']
  ], 'Start the next comparison in Pune with documented fares and travel times across two commutes and a stated hourly value of time.']
];

const essayLabs = {
  'price-of-a-thali': ['/research/thali/', 'Thali ingredient-price workbench', 'Use a dated Agmarknet wholesale snapshot and choose your own meal quantities and retail assumptions.'],
  'indias-dollar-cushion': ['/research/dollar-cushion/', 'RBI dollar-cushion accounts', 'Reconcile RBI merchandise, services, transfers, income and financing across consistent time periods.'],
  'the-china-price-shock': ['/research/china-inputs/', 'China-origin import exposure map', 'Explore 2025 UN Comtrade product chapters and an independently specified supplier-cost scenario.'],
  'getting-to-work': ['/research/getting-to-work/', 'Urban job-access research lab', 'Compare rent, take-home wages, commuting time, fares and childcare in a transparent hypothetical model.']
};
const card = ([url, title, detail]) => `<a class="yr-card" href="${esc(url)}"><h3>${esc(title)}</h3><p>${esc(detail)}</p></a>`;
const cards = entries => `<div class="yr-cards">${entries.map(card).join('')}</div>`;
const section = (title, body) => `<section class="yr-section"><h2>${esc(title)}</h2>${body}</section>`;
const table = (head, rows) => `<div class="tbl-wrap"><table class="xr-table yr-table"><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(([first, ...rest]) => `<tr><th scope="row">${first}</th>${rest.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const source = (url, label = 'Source document') => `<a href="${esc(url)}">${esc(label)}</a>`;
const page = (head, kicker, title, intro, body) => head(kicker, title, intro) + `<div class="wrap yr-page">${body}</div>`;

function eventsFor(series, events) {
  const order = entry => entry.date || entry.when.slice(0, 7);
  return series.events.map(id => events.get(id)).sort((a, b) => order(a).localeCompare(order(b)));
}

function latestFor(series, events, cutoff) {
  return eventsFor(series, events).filter(event => event.date && event.date <= cutoff).at(-1);
}

function latestBlock(entry, next, href) {
  if (!entry) return '';
  return `<section class="yr-latest"><p class="kicker">Latest verified development</p><h3>${esc(entry.when)}</h3><p>${esc(entry.detail)}</p><p><strong>Next check.</strong> ${esc(next)}</p><div class="yr-links">${source(entry.source)} ${href ? source(href, 'Read the timeline →') : ''}</div></section>`;
}

export function seriesUpdate(slug, review) {
  const series = review.series.find(s => s.slug === slug);
  if (!series) return '';
  const events = new Map(review.events.map(e => [e.id, e]));
  return `<div class="wrap yr-series-update">${latestBlock(latestFor(series, events, review.asOf), series.next, seriesPath(series.id))}</div>`;
}

function renderTimeline(series, review, events, articles, head) {
  const milestones = eventsFor(series, events);
  return page(head, 'India’s year in review', series.title, series.question,
    `<p class="yr-links"><a href="${reviewPath}">All timelines</a><a href="${series.tool}">Explore the data and tools</a>${series.slug ? `<a href="/series/${series.slug}/">Related article series</a>` : ''}</p>` +
    latestBlock(latestFor(series, events, review.asOf), series.next) +
    section('Timeline', `<ol class="yr-timeline">${milestones.map(e => `<li><strong>${esc(e.when)}</strong><p>${esc(e.detail)}</p><div class="yr-links">${source(e.source)}${e.articles.map(a => {
      const current = articles.get(a.id);
      return source(current?.url || a.url, current?.title || a.title || 'Read analysis');
    }).join('')}</div></li>`).join('')}</ol>`));
}

function fiveBills(head) {
  const cases = [
    ['A restaurant’s cooking gas', 'The government reported a commercial LPG allocation of 70% of the pre-crisis level on 28 March. On a 100-cylinder baseline, that leaves 30 cylinder-equivalents outside the allocation. Deliveries to individual customers can differ from allocations.', 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2246464&lang=1&reg=3', '/a/hormuz-oil-stock-release-india-lpg-supply/'],
    ['A farmer’s fertiliser', 'The estimated kharif P&K subsidy requirement rose from ₹37,216.15 crore in 2025 to ₹41,533.81 crore in 2026, about 11.6%. That compares government estimates and says little about the bag price or local availability.', 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2250032&lang=1&reg=35', '/a/india-rabi-2026-fertiliser-subsidy-nbs-dap-price-cap/'],
    ['A freight operator’s fuel', 'A truck using 1,000 litres a month spends ₹5,000 more if diesel rises by ₹5 per litre. At 20,000 tonne-kilometres a month, that equals ₹0.25 per tonne-kilometre before fuel surcharges or changes to routes.', '/what-if/pump-price/', '/a/indian-exporters-maritime-rerouting-inventory-service-contracts/'],
    ['The government’s excise receipts', 'The March decision cut special additional excise duty by ₹10 a litre on both petrol and diesel. For 1 million unchanged taxable litres, the arithmetic is ₹1 crore less duty. Actual fiscal effects depend on volumes and other measures.', 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2245970&lang=2&reg=48', '/a/india-petrol-diesel-excise-cut-oil-shock-fiscal-incidence/'],
    ['India’s crude import bill', 'At 1 million barrels, a $10 rise in the price adds $10 million to the cargo before freight and insurance. At an assumed ₹94 per dollar, that is ₹94 crore. A weaker rupee changes the same bill again.', '/research/oil-rupee/', '/a/india-current-account-deficit-q1-2026-services-remittances-capital-flows/']
  ];
  const visuals = [
    ['Commercial LPG allocation', 70, '70 of 100', 'Share of the pre-crisis allocation reported by the government.'],
    ['Kharif subsidy requirement', 89.6, '₹41,534 crore', 'The 2025 estimate was about 89.6% of the 2026 estimate.'],
    ['Freight scenario', 100, '₹5,000/month', '1,000 litres × ₹5 per litre.'],
    ['Excise scenario', 100, '₹1 crore', '1 million litres × ₹10 per litre.'],
    ['Import scenario', 100, '₹94 crore', '1 million barrels × $10 per barrel × ₹94 per dollar.']
  ];
  const graphic = (i) => {
    const [label, share, value, detail] = visuals[i];
    const bars = i < 2 ? `<div class="yr-case-bar" role="presentation"><span style="width:${share}%"></span></div>` : '';
    return `<figure class="yr-case-figure"><figcaption>${esc(label)}</figcaption>${bars}<strong>${esc(value)}</strong><small>${esc(detail)}</small></figure>`;
  };
  return page(head, 'Data story', 'One oil shock, five bills', 'Follow the same supply disruption through restaurants, farms, freight, public finances and India’s import bill.',
    section('Where the costs land', `<ol class="yr-timeline">${cases.map(([title, detail, primary, article], i) => `<li><h3>${esc(title)}</h3><p>${esc(detail)}</p>${graphic(i)}<div class="yr-links">${source(primary, primary.startsWith('/') ? 'Scenario and assumptions' : 'Official release')}${source(article, 'Read the analysis')}</div></li>`).join('')}</ol>`) +
    '<p class="meta">The examples use different denominators and time periods. They illustrate channels and should not be added together.</p>' +
    cards([tools[1], ['/desk/india-year-in-review/oil/', 'Follow the oil timeline', 'Read the dated policy changes and releases.']]));
}

const macroRows = [
  ['Real GDP', '7.8%', '6.9%', 'April–June 2026 vs the year-earlier quarter’s growth rate. Constant 2022–23 prices.', 'https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2304949&lang=2&reg=48'],
  ['Real fixed investment', '11.9%', '5.8%', 'Growth in gross fixed capital formation on the same basis. Includes public and private investment.', 'https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2304949&lang=2&reg=48'],
  ['Listed manufacturing operating profits', '21.3%', '9.4%', 'Year-on-year growth in April–June 2026 and in the preceding quarter. Listed firms only.', 'https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63452'],
  ['Unemployment, age 15+', '5.1%', '5.4%', 'July–September 2026 and the preceding quarter. Current weekly status, % of the labour force.', 'https://www.mospi.gov.in/uploads/latestReleases/latest_release_1794295684925_f604faa2-d13d-4df0-b9b7-2454962048b9_Press_note_July-Sept_2026_PLFS_QB.pdf'],
  ['Consumer inflation', '6.09%', '6.63% rural / 5.41% urban', 'October 2026, year on year. National figure and same-month geography comparison. Provisional.', 'https://mospi.gov.in/uploads/latestreleasesfiles/1794480048335-Press%20Release%20of%20CPI%20for%20October%202026%20.pdf']
];

function gdpContributions(gdp) {
  const rows = gdp.rows.map(([name, before, after, sign]) => [name, before, after, sign * (after - before) * 100 / gdp.priorGDP]);
  const largest = Math.max(...rows.map(row => Math.abs(row[3])));
  const bars = rows.map(([name, , , value]) => {
    const width = 50 * Math.abs(value) / largest;
    return `<li><span>${esc(name)}</span><div class="yr-gdp-track" aria-hidden="true"><i class="${value < 0 ? 'negative' : 'positive'}" style="width:${width}%"></i></div><strong>${value > 0 ? '+' : ''}${value.toFixed(2)}</strong></li>`;
  }).join('');
  return section('Contributions to real GDP growth', `<p>${esc(gdp.period)} compared with the same quarter a year earlier, in percentage points. Values use constant ${esc(gdp.baseYear)} prices.</p><ul class="yr-gdp-bars">${bars}</ul><p class="meta">Divide each component’s change by prior-year real GDP. Imports enter with a minus sign. The statistical discrepancy reconciles the expenditure estimates. Values may differ from the headline by rounding.</p><div class="yr-links">${source(gdp.source, 'MoSPI expenditure table')}${source('/economy/divergence/gdp-contributions.csv', 'Download calculation inputs')}${source('https://thekakisto.wordpress.com/2026/08/31/india-april-june-2026-gdp-private-investment-test/', 'Read the growth analysis')}</div>`);
}

function divergence(head, gdp) {
  return page(head, 'Economy', 'Growth, work and earnings', 'Read activity, corporate earnings, employment and prices together. The releases cover different groups and periods.',
    section('What the releases measure', table(['Measure', 'Latest in review', 'Comparison', 'Period and definition'],
      macroRows.map(([name, value, prior, note, url]) => [esc(name), esc(value), esc(prior), `${esc(note)} ${source(url, 'Release')}`]))) +
    gdpContributions(gdp) +
    section('What to check next', '<p>Test whether investment broadened beyond government and large listed companies using project and spending records. Use participation, hours and real wages to see whether stronger output reached workers. A comparable wage series would require a consistent occupation, geography, price deflator and vintage.</p>') +
    '<div class="yr-links"><a href="/economy/growth/">GDP detail</a><a href="/economy/prices/">Price detail</a><a href="/companies/">Company data</a><a href="/economy/divergence/data.csv">Download CSV</a></div>');
}

function fiscalRoom(head, data) {
  return page(head, 'India by State', 'Same policy, different states', 'Compare Maharashtra, Karnataka and Uttar Pradesh on committed costs and the capital outlay they actually delivered.',
    section('Committed costs and capital outlay', table(['State', 'Committed spending, 2024–25 actual', 'Committed spending, 2026–27 BE', 'Capex, 2024–25 BE', 'Capex, 2024–25 actual', 'Actual vs BE', 'Capex, 2026–27 BE'],
      data.map(r => [source(r.source, r.name), r.actualCommitted + '%', r.budgetCommitted + '%', fmt(r.priorBudgetCapex), fmt(r.actualCapex), Math.round(100 * r.actualCapex / r.priorBudgetCapex) + '%', fmt(r.newBudgetCapex)]))) +
    '<p class="meta">Committed spending means salaries, pensions and interest as a share of revenue receipts. Capital outlay is in ₹ crore. BE means Budget Estimate. The 2024–25 outturn ratios use the original 2024–25 budgets.</p>' +
    '<p>Capital outlay can differ from budget because of project timing, procurement or changes in revenue. Read the outturn ratio alongside project milestones and the composition of spending.</p>' +
    '<div class="yr-links"><a href="/states/">All states</a><a href="/states/fiscal-room/data.csv">Download CSV</a><a href="/desk/india-year-in-review/public-money/">Public money timeline</a></div>');
}

const rateFields = [
  ['repo_pct', 'Repo', '#a33c70'],
  ['fresh_loans_pct', 'New loans', '#197e8e'],
  ['outstanding_loans_pct', 'Outstanding loans', '#51439b'],
  ['fresh_deposits_pct', 'New term deposits', '#9a5b16'],
  ['outstanding_deposits_pct', 'Outstanding term deposits', '#4d7545']
];

function notebook(head, csv) {
  const [header, ...lines] = csv.trim().split(/\r?\n/).map(line => line.split(','));
  const data = lines.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]])));
  const change = (r, key) => Math.round((Number(r[key]) - Number(data[0][key])) * 100);
  const point = (r, i, key) => `${85 + i * 135},${145 - change(r, key) * 2}`;
  const chart = `<svg class="yr-chart" viewBox="0 0 700 265" role="img" aria-label="Changes in the repo, lending and deposit rates from November 2025 in basis points. Data table follows.">
    ${[-50, -25, 0, 25].map(bp => `<line x1="65" x2="640" y1="${145 - bp * 2}" y2="${145 - bp * 2}" stroke="#b9b1aa"/><text x="52" y="${149 - bp * 2}" text-anchor="end">${bp}</text>`).join('')}
    ${data.map((r, i) => `<text x="${85 + i * 135}" y="261" text-anchor="middle">${r.month}</text>`).join('')}
    ${rateFields.map(([key, , color]) => `<polyline fill="none" stroke="${color}" stroke-width="3" points="${data.map((r, i) => point(r, i, key)).join(' ')}"/>`).join('')}
  </svg><ul class="yr-legend">${rateFields.map(([, label, color]) => `<li><span style="--yr-line:${color}"></span>${label}</li>`).join('')}</ul>`;
  const last = data.at(-1);
  return page(head, 'Research Notebook', 'How much RBI easing reached borrowers?', 'A reproducible comparison of selected months around the December 2025 repo cut, using figures available by 30 September 2026.',
    section('Change since November 2025, in basis points', chart +
      `<p>By August 2026, the repo rate was ${Math.abs(change(last, 'repo_pct'))} basis points below November. The weighted rate on outstanding rupee loans was ${Math.abs(change(last, 'outstanding_loans_pct'))} points lower and the weighted rate on fresh loans was ${Math.abs(change(last, 'fresh_loans_pct'))} points lower. The fresh loan series fell by ${Math.abs(change(data[1], 'fresh_loans_pct'))} points in December before recovering part of that decline.</p>`) +
    section('Observation months and release dates', table(['Month', ...rateFields.map(([, label]) => label + ' (%)'), 'RBI release'],
      data.map(r => [esc(r.month), ...rateFields.map(([key]) => esc(r[key])), source(r.source, r.release_date)]))) +
    section('Method and reproduction', '<p>Subtract the November 2025 rate from each later rate and multiply by 100 to get basis points. The selected observations come from RBI releases on scheduled commercial banks excluding regional rural and small finance banks. Publication dates differ from the observation months. The chart spaces selected observations evenly. The table gives their actual months.</p><p>Loan mix, maturities and resets can change the averages. This comparison describes repricing across bank aggregates. A causal estimate would need matched borrowers or products with comparable contractual reset rules.</p><pre class="code">python3 repo_transmission.py repo-transmission.csv</pre><div class="yr-links"><a href="/research/repo-transmission/repo-transmission.csv">Source data (CSV)</a><a href="/research/repo-transmission/repo_transmission.py">Python script</a><a href="/research/repo-transmission/results.csv">Results (CSV)</a><a href="https://thekakisto.wordpress.com/2026/09/30/rbi-easing-fresh-outstanding-loan-rates-september-2026/">Read the companion analysis</a></div>'));
}

function landedCost(head) {
  const inputs = [
    ['value', 'Customs value (US$)', 10000, 10000],
    ['ordinary', 'Ordinary duty (%)', 5, 5],
    ['extra', 'Additional duty (%)', 10, 12.5],
    ['freight', 'Freight outside customs value (US$)', 400, 350],
    ['compliance', 'Compliance and handling (US$)', 250, 100]
  ];
  const panel = (i, title) => `<fieldset><legend>${title}</legend>${inputs.map(([key, label, ...values]) => `<label>${label}<input name="${key}${i}" type="number" min="0" max="${key === 'ordinary' || key === 'extra' ? '10000' : '1000000000000'}" value="${values[i]}" step="0.01" required></label>`).join('')}<output id="landed-${i}"></output></fieldset>`;
  return page(head, 'What if?', 'Compare two landed costs', 'Enter the applicable rates and extra costs for two suppliers. The starting values are illustrative.',
    '<form class="yr-cost" id="landed-cost">' + panel(0, 'Supplier A') + panel(1, 'Supplier B') +
    '<div class="yr-cost-result"><p id="landed-difference" aria-live="polite"></p><button class="btn ghost" type="reset">Reset assumptions</button></div></form>' +
    '<noscript><p>Enable JavaScript to calculate the comparison.</p></noscript><script src="/landed-cost.js" defer></script>' +
    section('How the calculation works', '<p>Each entered duty rate is applied to the same customs value, then freight outside that value and compliance costs are added. Include freight once. For compound or specific duties, VAT, exemptions, quotas or preferential rules, calculate the applicable charge separately before comparing. Verify classification, origin and the date of entry against the relevant customs authority.</p><div class="yr-links"><a href="/desk/india-year-in-review/tariffs/">Tariff timeline</a><a href="https://hts.usitc.gov/">US tariff schedule</a><a href="https://taxinformation.cbic.gov.in/">India customs portal</a></div>'));
}

function csvEncode(rows) {
  return rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\n') + '\n';
}

export async function writeYearReview({ review, wp, fiscal, gdp, repoCsv, repoScript, repoResults, pageHead, publish, write }) {
  const articles = new Map(wp.map(a => [a.id, a]));
  const events = new Map(review.events.map(e => [e.id, e]));
  const byId = new Map(review.series.map(s => [s.id, s]));
  const paths = [];
  const add = async (path, title, description, body) => {
    paths.push(path);
    await write(path.slice(1) + 'index.html', publish({ path, title, description, body }));
  };
  const routesHtml = routes.map(([title, description, ids]) => `<article class="yr-card"><h3>${esc(title)}</h3><p>${esc(description)}</p><ul>${ids.map(id => `<li><a href="${seriesPath(id)}">${esc(byId.get(id).title)}</a></li>`).join('')}</ul></article>`).join('');
  const reviewDescription = 'Eight timelines tracing India’s economy from November 2025 to November 2026.';
  await add(reviewPath, 'What shaped India’s economy', reviewDescription,
    page(pageHead, 'India’s year in review', 'What shaped India’s economy', `${date(review.windowStart)} to ${date(review.asOf)}. Follow the year’s shocks and policy decisions through households, firms, states and India’s external accounts.`,
      section('Choose where to start', `<div class="yr-cards">${routesHtml}</div>`) +
      section('Follow a story', cards(review.series.map(s => [seriesPath(s.id), s.title, s.question]))) +
      section('Explore the evidence', cards([...tools, ...Object.values(essayLabs)])) +
      section('More reading paths', cards(essays.map(([slug, title, intro]) => ['/series/' + slug + '/', title, intro]))) +
      '<div class="yr-links"><a href="/desk/">Daily Desk</a><a href="/api/india-year-in-review.json">Timeline data (JSON)</a></div>'));
  for (const s of review.series) await add(seriesPath(s.id), s.title, s.question, renderTimeline(s, review, events, articles, pageHead));
  for (const [slug, title, intro, chapters, next] of essays) {
    await add('/series/' + slug + '/', title, intro, page(pageHead, 'Reading path', title, intro,
      section('Read in order', `<ol class="yr-timeline">${chapters.map(([name, detail, url]) => `<li><h3>${esc(name)}</h3><p>${esc(detail)}</p>${source(url, url.startsWith('/') ? 'Read the analysis' : 'Open the source')}</li>`).join('')}</ol>`) +
      section('What to watch', `<p>${esc(next)}</p>`) +
      (essayLabs[slug] ? section('Explore the research workbench', cards([essayLabs[slug]])) : '') +
      `<p><a href="${reviewPath}">Explore the year in review</a></p>`));
  }
  await add(tools[0][0], tools[0][1], tools[0][2], fiveBills(pageHead));
  await add(tools[1][0], tools[1][1], tools[1][2], divergence(pageHead, gdp));
  await add(tools[2][0], tools[2][1], tools[2][2], fiscalRoom(pageHead, fiscal));
  await add(tools[3][0], 'Research Notebook: RBI transmission', tools[3][2], notebook(pageHead, repoCsv));
  await add(tools[4][0], tools[4][1], tools[4][2], landedCost(pageHead));
  await write('api/india-year-in-review.json', JSON.stringify(review, null, 2));
  await write('economy/divergence/data.csv', csvEncode([['measure', 'value', 'comparison', 'definition', 'source'], ...macroRows]));
  await write('economy/divergence/gdp-contributions.csv', csvEncode([
    ['measure', 'prior_year_rs_crore', 'current_year_rs_crore', 'contribution_pp', 'prior_gdp_rs_crore', 'current_gdp_rs_crore', 'release', 'source'],
    ...gdp.rows.map(([name, before, after, sign]) => [name, before, after, (100 * sign * (after - before) / gdp.priorGDP).toFixed(4), gdp.priorGDP, gdp.currentGDP, gdp.release, gdp.source])
  ]));
  const fiscalColumns = ['name', 'actualCommitted', 'budgetCommitted', 'priorBudgetCapex', 'actualCapex', 'newBudgetCapex', 'source'];
  await write('states/fiscal-room/data.csv', csvEncode([fiscalColumns, ...fiscal.map(row => fiscalColumns.map(k => row[k]))]));
  await write('research/repo-transmission/repo-transmission.csv', repoCsv);
  await write('research/repo-transmission/repo_transmission.py', repoScript);
  await write('research/repo-transmission/results.csv', repoResults);
  return paths;
}
