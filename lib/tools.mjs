// Calculators that run in the reader's browser on data the site already holds.
import { esc } from './charts.mjs';

const shell = (kicker, title, dek, body, data) => `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">${esc(kicker)}</span><h1>${esc(title)}</h1><p class="dek sm">${dek}</p></div></div></div></div>
<div class="wrap tl">${body}</div>
<script>window.__T=${JSON.stringify(data)};</script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script><script src="/tools.js?v=${Date.now()}" defer></script>`;

export function myInflationPage(basket) {
  const rows = basket.divisions.map((d, i) => `<tr><th>${esc(d.name)}</th><td>${d.weight.toFixed(2)}%</td><td>${d.inflation.toFixed(2)}%</td>
    <td><input type="number" min="0" step="100" class="tl-in" data-i="${i}" aria-label="Your monthly spending on ${esc(d.name)}" placeholder="₹ a month"></td><td class="tl-sh" data-i="${i}">—</td></tr>`).join('');
  return shell('What if? · Your inflation', 'What is your own inflation rate?', `Official CPI inflation was <b>${basket.headline}%</b> in ${esc(basket.month)}. It averages the whole country’s spending. Put in what your household spends each month on each group and the calculator reweights the same price changes to your basket.`,
    `<section class="xr-sec tl-grid"><div><div class="ip-tw"><table class="ip-t tl-t"><thead><tr><th>CPI group</th><th>Official weight</th><th>Inflation, ${esc(basket.month)}</th><th>Your spending</th><th>Your share</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="tl-btns"><button type="button" class="btn ghost" id="tl-official">Fill with the official weights (₹1 lakh a month)</button> <button type="button" class="btn ghost" id="tl-clear">Clear</button></p></div>
      <aside class="tl-out"><span class="lbl">Your inflation rate</span><b id="tl-you">—</b><span id="tl-cmp" class="sub">Enter your spending to compare with the official ${basket.headline}%.</span><div id="tl-bars" class="ec" style="height:300px" data-noclick></div></aside></section>
     <section class="xr-sec ip-method"><h2 class="col-title">How it works</h2><ul><li>Your rate is the average of each group’s official year-on-year inflation, weighted by your share of spending: Σ (your share × group inflation).</li><li>Group inflation rates and official weights are MoSPI’s, CPI base 2024=100, All-India Combined, ${esc(basket.month)}. Within each group your prices are assumed to move like the national average, so a household that mostly buys vegetables within food will differ further.</li><li>Nothing you type leaves your browser.</li></ul></section>`,
    { tool: 'my-inflation', headline: basket.headline, month: basket.month, divisions: basket.divisions });
}

export function rupeeValuePage(cpiIndex, gold, nifty = []) {
  const months = cpiIndex.map(x => x[0]);
  const opt = sel => months.map(m => `<option value="${m}"${m === sel ? ' selected' : ''}>${m}</option>`).join('');
  return shell('What if? · Rupee value', 'What is a rupee from then worth now?', 'Carry any sum between two months using the all-India consumer price index, and see what the same money would have done in gold.',
    `<section class="xr-sec tl-grid"><div class="tl-form"><label>Amount (₹)<input type="number" id="rv-amt" value="10000" min="0" step="100"></label><label>From<select id="rv-from">${opt(months[0])}</select></label><label>To<select id="rv-to">${opt(months.at(-1))}</select></label></div>
      <aside class="tl-out"><span class="lbl">Same purchasing power</span><b id="rv-out">—</b><span class="sub" id="rv-sub"></span><span class="sub" id="rv-gold"></span><span class="sub" id="rv-nifty"></span></aside></section>
     <section class="xr-sec"><h2 class="col-title">Prices and gold since the start</h2><div id="rv-chart" class="ec" style="height:380px" data-noclick></div></section>
     <section class="xr-sec ip-method"><h2 class="col-title">How it works</h2><ul><li>CPI-Combined, all-India. To December 2025 this is MoSPI’s 2012=100 index. From January 2026 the index is carried forward with the official year-on-year rates of the 2024=100 series, which keeps the two bases linked but is not an official index level.</li><li>Gold: World Bank monthly average price in US dollars per troy ounce, converted at the month’s average rupee rate.</li><li>Nifty 50: the monthly average of the price index (no dividends), available here for the last three years.</li></ul></section>`,
    { tool: 'rupee-value', cpi: cpiIndex, gold, nifty });
}

export function policyRulePage(cpi, repo, latest) {
  return shell('What if? · Policy rule', 'Is the RBI tight or loose?', `A Taylor rule says what the repo rate “should” be given inflation and the output gap. It is a yardstick, not a forecast. Change the assumptions and see how far the actual repo rate (${latest.repo}%) sits from the rule.`,
    `<section class="xr-sec tl-grid"><div class="tl-form"><label>Neutral real rate r* (%)<input type="number" id="pr-r" value="1.5" step="0.25"></label><label>Inflation target (%)<input type="number" id="pr-t" value="4" step="0.25"></label>
      <label>Weight on the inflation gap<input type="number" id="pr-a" value="0.5" step="0.1"></label><label>Output gap (% of potential)<input type="number" id="pr-g" value="0" step="0.25"></label><label>Weight on the output gap<input type="number" id="pr-b" value="0.5" step="0.1"></label></div>
      <aside class="tl-out"><span class="lbl">Rule-implied repo rate</span><b id="pr-out">—</b><span class="sub" id="pr-sub"></span></aside></section>
     <section class="xr-sec"><h2 class="col-title">The rule against the actual repo rate</h2><div id="pr-chart" class="ec" style="height:400px" data-noclick></div><p class="meta">Rule: i = r* + π + a(π − target) + b × gap, with π the year-on-year CPI inflation of each month and a constant output gap. Headline CPI is volatile, so the rule swings with food prices; central banks look through some of that.</p></section>`,
    { tool: 'policy-rule', cpi, repo });
}

export function debtPathPage(d0, imfPath) {
  return shell('What if? · Debt path', 'Where is India’s public debt heading?', `General government debt was about <b>${d0.value.toFixed(1)}% of GDP</b> in ${d0.year} (IMF). Debt next year is this year’s debt grown by the interest rate, shrunk by nominal GDP growth, less the primary balance. Change the three and watch the path.`,
    `<section class="xr-sec tl-grid"><div class="tl-form"><label>Starting debt (% of GDP)<input type="number" id="dp-d" value="${d0.value.toFixed(1)}" step="0.5"></label><label>Average interest rate on debt (%)<input type="number" id="dp-r" value="7.5" step="0.25"></label>
      <label>Nominal GDP growth (%)<input type="number" id="dp-g" value="10" step="0.25"></label><label>Primary balance (% of GDP, deficit negative)<input type="number" id="dp-p" value="-2" step="0.25"></label><label>Years<input type="number" id="dp-n" value="15" min="3" max="40"></label></div>
      <aside class="tl-out"><span class="lbl">Debt at the end</span><b id="dp-out">—</b><span class="sub" id="dp-sub"></span></aside></section>
     <section class="xr-sec"><h2 class="col-title">Your path and the IMF’s projection</h2><div id="dp-chart" class="ec" style="height:380px" data-noclick></div><p class="meta">d(t+1) = d(t) × (1 + r) / (1 + g) − primary balance. The debt-stabilising primary balance is d × (r − g) / (1 + g). Defaults are round numbers for illustration, not estimates.</p></section>`,
    { tool: 'debt-path', imf: imfPath, start: d0 });
}

// Release calendar: official fixed dates plus each release's usual day
export function calendarEvents(cal, from, days = 75) {
  const out = [], end = new Date(from.getTime() + days * 864e5), MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const iso = d => d.toISOString().slice(0, 10), refMonth = (d, lag) => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - lag, 1)); return `${MON[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
  const refQuarter = d => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 2, 1)), fy = t.getUTCMonth() >= 3 ? t.getUTCFullYear() : t.getUTCFullYear() - 1, q = Math.floor(((t.getUTCMonth() + 9) % 12) / 3) + 1; return `Q${q} ${fy}-${String(fy + 1).slice(2)}`; };
  for (const f of cal.fixed) { const d = new Date(f.date + 'T00:00:00Z'); if (d >= from && d <= end) out.push({ ...f, date: f.date, ref: '', kind: 'official' }); }
  for (let t = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())); t <= end; t = new Date(t.getTime() + 864e5)) {
    const dow = t.getUTCDay(), last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)); let lw = last; while ([0, 6].includes(lw.getUTCDay())) lw = new Date(lw.getTime() - 864e5);
    for (const r of cal.rules) {
      let hit = false;
      if (r.rule === 'monthday') hit = t.getUTCDate() === r.day;
      if (r.rule === 'weekday') hit = dow === r.dow;
      if (r.rule === 'lastworkday') hit = iso(t) === iso(lw) && (!r.months || r.months.includes(t.getUTCMonth() + 1));
      if (hit) out.push({ date: iso(t), time: r.time, name: r.name, body: r.body, url: r.url, ref: r.rule === 'weekday' ? '' : r.quarterly ? refQuarter(t) : refMonth(t, r.lag || 1), kind: 'usual', weekend: [0, 6].includes(dow) });
    }
  }
  return out.sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
}
export function calendarPage(events, note) {
  const fmt = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const byDay = {}; for (const e of events) (byDay[e.date] ||= []).push(e);
  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">Desk · Calendar</span><h1>Release calendar</h1><p class="dek sm">What India’s statistics offices and the RBI publish over the next ten weeks. ${esc(note)}</p></div></div></div></div>
  <div class="wrap"><section class="xr-sec"><div class="ip-tw"><table class="ip-t cal-t"><thead><tr><th>Date</th><th>Time (IST)</th><th>Release</th><th>Covers</th><th>From</th><th>Date status</th></tr></thead><tbody>${Object.entries(byDay).map(([d, es]) => es.map((e, i) => `<tr class="${e.kind}"><th>${i ? '' : esc(fmt(d))}</th><td>${esc(e.time || '—')}</td><td><a href="${esc(e.url)}">${esc(e.name)}</a>${e.detail ? `<span>${esc(e.detail)}</span>` : ''}</td><td>${esc(e.ref || '')}</td><td>${esc(e.body)}</td><td>${e.kind === 'official' ? `<a href="${esc(e.source)}">Official schedule</a>` : e.weekend ? 'Usual day; falls on a weekend, may move' : 'Usual day'}</td></tr>`).join('')).join('')}</tbody></table></div>
  <p class="meta">Official: dates published by the institution (the RBI’s MPC calendar for 2026-27). Usual day: the release’s regular slot (CPI on the 12th, WPI on the 14th, IIP on the 28th, quarterly GDP on the last working day of February, May, August and November, RBI reserves every Friday); holidays can move them.</p></section></div>`;
}
