// Forecast Book with automatic scoring. Calls are entered by the author in data/forecasts.json, each on the day it is made.
// A call can carry a machine-checkable rule against any series on the site; when its resolution date passes, the build
// reads the data, records the outcome and the Brier score. Calls without a rule are resolved by hand with "result".
//
// Call format:
// { "id": "cpi-dec-2026", "made": "2026-11-12", "call": "CPI inflation for December 2026 is above 5%", "probability": 0.6,
//   "changeMind": "...", "resolves": "2027-01-14",
//   "rule": { "series": "india-cpi", "op": ">", "value": 5, "period": "2026-12" },      // value for that month
//   or "rule": { "series": "fx-usdinr", "op": ">=", "value": 95, "by": "2026-12-31" } // ever crossed before the date
//   or "rule": { "series": "fx-usdinr", "op": ">=", "value": 95, "on": "2026-12-31" } // last value on or before the date
//   "revisions": [{ "date": "2026-12-01", "probability": 0.7, "why": "..." }], "result": "yes" | "no" (manual only) }
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';

const OPS = { '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b };
const prob = c => +(c.revisions?.length ? c.revisions.at(-1).probability : c.probability);

export function scoreCalls(fc, SD, today) {
  return (fc.calls || []).map(c => {
    const r = c.rule, out = { ...c, p: prob(c), status: 'open', reading: null };
    if (c.result) { out.outcome = /^(yes|true|1)$/i.test(String(c.result)) ? 1 : 0; out.status = 'resolved'; out.how = 'resolved by hand'; }
    else if (r && SD[r.series] && OPS[r.op]) {
      const { d, v } = SD[r.series], test = x => x != null && OPS[r.op](x, +r.value);
      if (r.period) { const i = d.findIndex(x => x.startsWith(r.period)); out.reading = i >= 0 ? { date: d[i], value: v[i] } : null; if (i >= 0) { out.outcome = test(v[i]) ? 1 : 0; out.status = 'resolved'; } }
      else if (r.by) { const lo = d.findIndex(x => x >= c.made); const hit = lo < 0 ? -1 : d.findIndex((x, i) => i >= lo && x <= r.by && test(v[i])); const last = d.findLastIndex(x => x <= r.by);
        out.reading = last >= 0 ? { date: d[last], value: v[last] } : null;
        if (hit >= 0) { out.outcome = 1; out.status = 'resolved'; out.how = `crossed on ${d[hit]}`; } else if (today > r.by && d.at(-1) >= r.by) { out.outcome = 0; out.status = 'resolved'; } }
      else if (r.on) { const i = d.findLastIndex(x => x <= r.on); out.reading = i >= 0 ? { date: d[i], value: v[i] } : null; if (today > r.on && i >= 0 && d.at(-1) >= r.on) { out.outcome = test(v[i]) ? 1 : 0; out.status = 'resolved'; } }
      const lo = Math.max(0, d.findIndex(x => x >= c.made) - 20); out.spark = v.slice(lo).slice(-120);
    }
    if (out.status === 'resolved') out.brier = +((out.p - out.outcome) ** 2).toFixed(4);
    return out;
  });
}

export function forecastsPage(fc, scored, { pageHead }) {
  const res = scored.filter(c => c.status === 'resolved'), open = scored.filter(c => c.status === 'open');
  const brier = res.length ? res.reduce((a, c) => a + c.brier, 0) / res.length : null;
  const ruleTxt = c => !c.rule ? '' : `<a href="/s/${esc(c.rule.series)}/">${esc(c.rule.series)}</a> ${esc(c.rule.op)} ${esc(c.rule.value)}${c.rule.period ? ` for ${esc(c.rule.period)}` : c.rule.by ? ` at any point by ${esc(c.rule.by)}` : c.rule.on ? ` on ${esc(c.rule.on)}` : ''}`;
  const card = c => `<article class="fc-card fc-${c.status}"><div class="fc-top"><span class="fc-p">${Math.round(c.p * 100)}%</span><div><h3>${esc(c.call)}</h3><p class="meta">Made ${esc(c.made)} · resolves ${esc(c.resolves || c.rule?.by || c.rule?.on || '')}${c.rule ? ` · checked automatically: ${ruleTxt(c)}` : ''}</p></div>
   ${c.status === 'resolved' ? `<span class="fc-out ${c.outcome ? 'yes' : 'no'}">${c.outcome ? 'Happened' : 'Did not happen'}<small>Brier ${c.brier.toFixed(3)}</small></span>` : c.reading ? `<span class="fc-out">Now ${esc(String(c.reading.value))}<small>${esc(c.reading.date)}</small></span>` : ''}</div>
   ${c.spark ? sparkSVG(c.spark, 260, 36, '#17202C') : ''}
   ${c.changeMind ? `<p><b>What would change the view:</b> ${esc(c.changeMind)}</p>` : ''}
   ${c.revisions?.length ? `<ul class="fc-rev"><li>${esc(c.made)}: ${Math.round(c.probability * 100)}% (original)</li>${c.revisions.map(r => `<li>${esc(r.date)}: ${Math.round(r.probability * 100)}%${r.why ? ` — ${esc(r.why)}` : ''}</li>`).join('')}</ul>` : ''}
   ${c.how ? `<p class="meta">${esc(c.how)}</p>` : ''}</article>`;
  // calibration: resolved calls in probability bins
  const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.01].slice(0, -1).map((lo, i, a) => { const hi = [0.2, 0.4, 0.6, 0.8, 1.01][i]; const b = res.filter(c => c.p >= lo && c.p < hi); return { lo, hi, n: b.length, hit: b.length ? b.filter(c => c.outcome).length / b.length : null }; });
  const calib = res.length ? `<div class="fc-cal">${bins.map(b => `<div><span class="t-mu">${Math.round(b.lo * 100)}–${Math.min(100, Math.round(b.hi * 100))}%</span><div class="fc-bar"><i style="height:${b.hit == null ? 0 : Math.round(b.hit * 100)}%"></i><em style="bottom:${Math.round((b.lo + Math.min(1, b.hi)) / 2 * 100)}%"></em></div><span>${b.n ? `${Math.round(b.hit * 100)}% of ${b.n}` : '—'}</span></div>`).join('')}</div><p class="meta">Bars show how often calls in each band came true; the line marks the band’s midpoint. A well-calibrated book has bars near the lines.</p>` : '';
  return pageHead('Forecast Book', 'The Forecast Book', esc(fc.method)) + `<div class="wrap" style="max-width:1000px">
  <div class="mk-cards" style="margin-top:10px"><div class="mk-card"><span class="lbl">Calls</span><span class="v">${scored.length}</span><span class="c">${open.length} open · ${res.length} resolved</span></div>
   <div class="mk-card"><span class="lbl">Average Brier score</span><span class="v">${brier == null ? '—' : brier.toFixed(3)}</span><span class="c">0 is perfect; always saying 50% scores 0.25</span></div>
   <div class="mk-card"><span class="lbl">Checked automatically</span><span class="v">${scored.filter(c => c.rule).length}</span><span class="c">read from the site’s data every build</span></div></div>
  ${open.length ? `<section class="xr-sec"><h2 class="col-title">Open calls</h2>${open.map(card).join('')}</section>` : ''}
  ${res.length ? `<section class="xr-sec"><h2 class="col-title">Resolved</h2>${calib}${res.map(card).join('')}</section>` : ''}
  ${!scored.length ? `<div class="module" style="margin-top:24px;max-width:720px"><h3>No calls recorded yet</h3><p>The first calls will be entered on the day they are made. Each will name a clearly defined event, a probability, the evidence that would change the view and the date it resolves. Revisions will sit beside the original call, so the record shows how the judgement moved.</p><p>Calls tied to a series on the site, such as CPI, the repo rate, the rupee or Brent, are checked against the data automatically when they fall due, so nobody marks their own homework.</p></div>` : ''}
  <h2 class="col-title" style="margin-top:30px">How calls are scored</h2><div class="prose" style="margin-top:8px;font-size:16.5px"><p>Each resolved call gets a Brier score: the squared difference between the stated probability and the outcome (1 if it happened, 0 if not). A perfect call scores 0; saying 50% every time scores 0.25. The running average across all resolved calls is the headline measure of judgement. Where a call is tied to a data series, the outcome is read from that series on the resolution date by the site’s build, not entered by hand. The full record is at <a href="/api/forecasts.json">/api/forecasts.json</a>.</p></div></div>`;
}
