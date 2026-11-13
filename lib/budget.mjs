import { esc, inr, lakhCr, lineChart, paceBars, stack } from './charts.mjs';

export function budgetPage(B, { pageHead, findRelated, articles }) {
  const it = Object.fromEntries(B.items.map(i => [i.id, i]));
  const pct = i => i.actual / i.be * 100;
  const elapsed = B.monthsElapsed / 12 * 100;
  const left = i => i.be - i.actual;
  const h2vsH1 = i => (left(i) / i.actual - 1) * 100;
  const fd = it.fd, rec = it.receipts, exp = it.expenditure;
  const lead = [rec, exp, fd].map(i => {
    const p = pct(i), d = p - i.prevPct;
    return `<a class="mk-card" href="#lines"><span class="lbl">${esc(i.label.replace(/ \(non-debt\)/, ''))}, share of budget used</span><span class="v">${p.toFixed(1)}%</span><span class="sub">Apr–Sep 2026 · ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts on a year earlier</span><span class="sub">₹${lakhCr(i.actual)} of ₹${lakhCr(i.be)} lakh crore</span></a>`;
  }).join('');

  const paceRows = B.items.filter(i => i.id !== 'fd').map(i => ({ label: i.label, pct: pct(i), prev: i.prevPct ?? null, good: i.group === 'receipts' ? pct(i) >= elapsed : null, sub: i.group === 'receipts' ? 'Receipt' : 'Spending' }));
  paceRows.push({ label: 'Fiscal deficit', pct: pct(fd), prev: fd.prevPct, good: pct(fd) <= elapsed, sub: 'Borrowing need' });

  const p = B.fdPath;
  const chart = lineChart({ labels: p.months, series: [{ label: '2026-27', values: p.fy27, color: '#B5367A', width: 2.6 }, { label: '2025-26', values: p.fy26, color: '#555A61', dash: '5 4' }], unit: '%', yMin: 0, yMax: 55, refLine: 50, w: 900, h: 280, refLabel: 'Half-year mark', decimals: 0, title: 'Cumulative fiscal deficit as a share of the full-year Budget Estimate, by month' });

  const rows = B.items.map(i => {
    const need = h2vsH1(i);
    return `<tr class="${i.lead ? 'lead' : ''}"><th scope="row">${esc(i.label)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</th><td>${inr(i.be)}</td><td>${inr(i.actual)}</td><td><b>${pct(i).toFixed(1)}%</b></td><td>${inr(left(i))}</td><td class="${(i.group === 'receipts' && need > 15) || (i.id === 'fd' && need > 0) ? 'neg' : ''}">${need >= 0 ? '+' : '−'}${Math.abs(need).toFixed(1)}%</td></tr>`;
  }).join('');

  const rev = it.revexp.actual, intr = it.interest.actual, subs = B.extra[0].actual, cap = it.capex.actual;
  const parts = [{ label: 'Interest', v: intr, color: '#17202C' }, { label: 'Major subsidies', v: subs, color: '#B5367A' }, { label: 'Other revenue spending', v: rev - intr - subs, color: '#C9CFC3' }, { label: 'Capital spending', v: cap, color: '#1C7C99' }];
  const revReceipts = it.nettax.actual + it.nontax.actual;
  const intShare = intr / revReceipts * 100;
  const taxNeed = h2vsH1(it.nettax), ntLeft = left(it.nontax);
  const rel = findRelated(articles, ['budget', 'fiscal', 'capex', 'fuel-tax', 'subsidy'], 4);

  return pageHead('Economy · Budget and debt', 'Budget X-Ray: halfway through 2026-27', `Six months into the financial year, here is how far the Centre has got through its Budget: what it has collected, what it has spent and how much it has already borrowed, set against the same point last year. Figures to ${esc(B.through)}, published by the Controller General of Accounts on 30 October 2026.`, lead + `<a class="mk-card" href="#lines"><span class="lbl">Interest, share of revenue receipts</span><span class="v">${intShare.toFixed(1)}%</span><span class="sub">Apr–Sep 2026</span><span class="sub">₹${lakhCr(intr)} of ₹${lakhCr(revReceipts)} lakh crore</span></a>`) +
  `<div class="wrap">

  <section class="xr-sec"><h2 class="col-title">What the first half shows</h2>
  <div class="xr-take">
   <p><b>The deficit is ahead of schedule.</b> The Centre had used ${pct(fd).toFixed(1)}% of its full-year deficit allowance by September, against ${fd.prevPct}% at the same point of 2025-26. Spending (${pct(exp).toFixed(1)}% of budget) is running faster than receipts (${pct(rec).toFixed(1)}%) relative to last year.</p>
   <p><b>Receipts look on track only because of the RBI.</b> Non-tax revenue is already at ${pct(it.nontax).toFixed(0)}% of its budget, thanks to the central bank's record surplus transfer in May. Only ₹${lakhCr(ntLeft)} lakh crore of non-tax revenue remains to be collected in the second half. Net tax revenue is at ${pct(it.nettax).toFixed(1)}%, so the second half has to bring in ${taxNeed.toFixed(0)}% more tax than the first.</p>
   <p><b>Interest is the largest single claim.</b> Interest payments took ${intShare.toFixed(0)}% of the Centre's revenue receipts in the first half.</p>
  </div></section>

  <section class="xr-sec"><h2 class="col-title">Pace: share of the full-year budget used after ${B.monthsElapsed} months</h2>
  ${paceRows.length ? paceBars(paceRows, { marker: elapsed, markerLabel: `${B.monthsElapsed} of 12 months` }) : ''}
  <p class="meta" style="margin-top:8px">For receipts, green means ahead of the calendar and amber means behind it. Spending bars are shown in black: spending faster is not good or bad in itself. The calendar is only a rough guide: tax receipts bunch in the quarterly advance-tax months and in March.</p></section>

  <section class="xr-sec"><h2 class="col-title">The fiscal deficit, month by month</h2>
  <div class="chart-wrap">${chart}</div>
  <p class="meta">Cumulative fiscal deficit as a share of the full-year Budget Estimate. April 2026 jumped because spending was front-loaded; the deficit then narrowed in May when the RBI's surplus transfer arrived. Last year's line uses 2025-26 Budget Estimates.</p></section>

  <section class="xr-sec" id="lines"><h2 class="col-title">Line by line, ₹ crore</h2>
  <div class="tbl-wrap"><table class="xr-table"><thead><tr><th>Item</th><th>Budget 2026-27</th><th>Actual Apr–Sep</th><th>% of budget</th><th>Left for Oct–Mar</th><th>Second half vs first</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="meta">“Second half vs first” is how much bigger (or smaller) October–March must be than April–September for the item to land exactly on its Budget Estimate. For the fiscal deficit, a negative number means the second half must borrow less than the first.</p></section>

  <section class="xr-sec"><h2 class="col-title">Where the first half's spending went</h2>
  ${stack(parts, exp.actual)}
  <dl class="xr-extra">${B.extra.map(e => `<dt>${esc(e.label)}</dt><dd>₹${inr(e.actual)} crore. ${esc(e.note)}</dd>`).join('')}</dl></section>

  <section class="xr-sec lab" id="yearend"><div class="controls">
   <h2 class="col-title">Year-end calculator</h2>
   <p style="font-size:13px;margin:0 0 14px;color:var(--graphite)">How big does October–March have to be? Set the second half relative to the first and see where the year lands.</p>
   <div class="ctrl"><label for="h2tax">Net tax, Oct–Mar vs Apr–Sep<output for="h2tax"></output></label><input type="range" id="h2tax" min="-10" max="50" step="0.1" value="${taxNeed.toFixed(1)}"><div class="hint">Budget path: ${taxNeed >= 0 ? '+' : ''}${taxNeed.toFixed(1)}%</div></div>
   <div class="ctrl"><label for="h2nontax">Non-tax and capital receipts, Oct–Mar (₹ lakh crore)<output for="h2nontax"></output></label><input type="range" id="h2nontax" min="0" max="4" step="0.05" value="${((left(it.nontax) + left(it.ndcr)) / 1e5).toFixed(2)}"><div class="hint">Budget path: ₹${lakhCr(left(it.nontax) + left(it.ndcr))} lakh crore</div></div>
   <div class="ctrl"><label for="h2exp">Total spending, Oct–Mar vs Apr–Sep<output for="h2exp"></output></label><input type="range" id="h2exp" min="-10" max="30" step="0.1" value="${h2vsH1(exp).toFixed(1)}"><div class="hint">Budget path: +${h2vsH1(exp).toFixed(1)}%</div></div>
   <div class="ctrl"><label for="gdp">Nominal GDP 2026-27 (₹ lakh crore)<output for="gdp"></output></label><input type="range" id="gdp" min="370" max="410" step="0.5" value="${(B.gdpBE / 1e5).toFixed(1)}"><div class="hint">Budget assumption: ₹${lakhCr(B.gdpBE)} lakh crore</div></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="share" type="button">Copy link to this scenario</button><button class="btn ghost" id="reset" type="button">Back to the Budget path</button></div>
  </div><div>
   <div class="results">
    <div class="res"><div class="lbl">Full-year fiscal deficit</div><div class="num" id="y-fd"></div><div class="sub" id="y-fd-sub"></div></div>
    <div class="res"><div class="lbl">As a share of GDP</div><div class="num" id="y-gdp"></div><div class="sub" id="y-gdp-sub"></div></div>
    <div class="res"><div class="lbl">Slippage vs Budget</div><div class="num" id="y-slip"></div><div class="sub" id="y-slip-sub"></div></div>
   </div>
   <div class="assume"><b>How this works</b><ul>
    <li>Full-year net tax = April–September actual × (1 + your second-half change).</li>
    <li>Full-year spending is built the same way. Non-tax and non-debt capital receipts for October–March are entered directly, because the RBI transfer makes the first half a poor guide.</li>
    <li>The deficit is total spending minus all non-debt receipts. The share of GDP uses your GDP figure; the Budget assumed ₹${lakhCr(B.gdpBE)} lakh crore. A weaker nominal GDP raises the ratio even if the rupee deficit is unchanged.</li>
    <li>Monthly accounts are provisional and the year-end figure is often revised. This is a guide to the arithmetic, not a forecast.</li>
   </ul></div>
  </div></section>
  <script>window.__BUDGET=${JSON.stringify({ h1tax: it.nettax.actual, h1exp: exp.actual, h1other: it.nontax.actual + it.ndcr.actual, beFD: fd.be, beGDP: B.gdpBE }).replace(/</g, '\\u003c')};</script>

  <section class="xr-sec"><h2 class="col-title">Sources</h2><ul class="src">${B.sources.map(s => `<li><a href="${esc(s.url)}">${esc(s.name)}</a></li>`).join('')}</ul>
  <p class="meta">${esc(B.note)} Checked ${esc(B.checked)}. Next update: the October accounts, due at the end of November.</p>
  ${rel.length ? `<h2 class="col-title" style="margin-top:22px">Our analysis</h2><div class="desk-grid">${rel.map(a => `<div><a class="story" href="${a.url}"><h3 class="h-4">${esc(a.title)}</h3><div class="meta">${esc(a.date.slice(0, 10))}</div></a></div>`).join('')}</div>` : ''}</section>
  </div>`;
}
