// Scenario engine: one set of shocks (oil, rupee, repo) pushed through the pump price, the household fuel bill,
// the national crude import bill, the current account and a home-loan EMI, with links into every related page.
import { esc } from './charts.mjs';

export function scenarioPage({ MK, tape, pump, sc, pageHead }) {
  const oil = MK?.fredLast?.DCOILBRENTEU?.last;
  const fx = MK?.fxOut;
  const policy = tape.indicators.find(i => i.id === 'repo')?.latest;
  const brent = +(oil?.[1] ?? 100).toFixed(2), inr = +(fx?.table.find(t => t.c === 'INR')?.last ?? 94).toFixed(2), repo = policy?.value ?? 5.5;
  const gdpUsd = MK?.imfWorld?.data?.NGDPD?.IND?.[String(new Date().getUTCFullYear())] ?? null;
  const base = { brent, inr, repo, gdpUsd, pump: { rsp: pump.rsp, excise: pump.excise, vatRate: pump.vatRate }, ...sc };
  const ctrl = (id, label, min, max, step, val, unit, context = '') => `<div class="sx-c"><label for="${id}"><span>${label}</span><output id="${id}-o"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" aria-describedby="${id}-baseline"><div class="sx-now" id="${id}-baseline">Baseline · ${unit(val)}${context ? ' · ' + esc(context) : ''}</div></div>`;
  return pageHead('Scenario engine', 'What if? One shock, every consequence', 'Move oil, the rupee and the repo rate to see how the assumptions affect fuel bills, crude imports, the current account and a home-loan EMI. Each input has its own observation date. Results are scenarios.') + `<div class="wrap sx" id="sx">
  <div class="sx-presets"><span>Presets</span>${[['today', 'Reset baseline'], ['hormuz', 'Hormuz disruption'], ['crash', 'Oil crash'], ['rupee100', 'Rupee at 100'], ['hike', 'RBI hikes 50bp'], ['perfect', 'Combined shock']].map(([k, t]) => `<button type="button" data-p="${k}" aria-pressed="false">${t}</button>`).join('')}<button type="button" id="sx-share" class="sx-share">Copy link</button></div>
  <div class="sx-grid"><div class="sx-ctrls">
   ${ctrl('sx-brent', 'Brent crude, $ a barrel', 30, 200, 0.01, brent, v => `$${v.toFixed(2)}`, oil ? `${oil[0]} · EIA via FRED` : 'Illustrative input')}
   ${ctrl('sx-inr', 'Rupees per US dollar', 75, 120, 0.01, inr, v => `₹${v.toFixed(2)}`, fx?.date ? `${fx.date} · ECB via Frankfurter` : 'Illustrative input')}
   ${ctrl('sx-repo', 'RBI repo rate, %', 3, 9, 0.01, repo, v => `${v.toFixed(2)}%`, policy?.released ? `Decision ${policy.released} · RBI` : 'Illustrative input')}
   ${ctrl('sx-pass', 'Pass-through to the pump, %', 0, 100, 5, 100, v => `${v}% (assumed)`)}
   ${ctrl('sx-exc', 'Central excise on petrol, ₹ a litre', 0, 35, 0.01, pump.excise, v => `₹${v}`, `Delhi price build-up ${pump.effective}`)}
   <details class="sx-more"><summary>Your numbers</summary>
    ${ctrl('sx-litres', 'Petrol you buy, litres a month', 0, 200, 5, 40, v => `${v} litres (assumed)`)}
    ${ctrl('sx-loan', 'Home loan, ₹ lakh', 5, 300, 5, sc.loan.principal / 1e5, v => `₹${v} lakh (assumed)`)}
    ${ctrl('sx-years', 'Loan term, years', 5, 30, 1, sc.loan.years, v => `${v} years`)}
    ${ctrl('sx-spread', 'Your loan rate minus the repo rate, points', 0, 6, 0.01, +(sc.loan.rate - repo).toFixed(2), v => `${v} points (assumed)`)}
   </details></div>
  <div class="sx-out">
   <div class="sx-card" data-k="pump"><span class="lbl">Petrol in Delhi</span><b id="o-pump"></b><span id="o-pump-s"></span><a href="/what-if/pump-price/">Price build-up →</a></div>
   <div class="sx-card" data-k="house"><span class="lbl">Your fuel bill</span><b id="o-house"></b><span id="o-house-s"></span><a href="/economy/prices/">Inflation basket →</a></div>
   <div class="sx-card" data-k="bill"><span class="lbl">India’s crude import bill</span><b id="o-bill"></b><span id="o-bill-s"></span><a href="/s/fred-dcoilbrenteu/">Brent →</a></div>
   <div class="sx-card" data-k="cad"><span class="lbl">Current account</span><b id="o-cad"></b><span id="o-cad-s"></span><a href="/external/">Rupee & external sector →</a></div>
   <div class="sx-card" data-k="emi"><span class="lbl">Your EMI</span><b id="o-emi"></b><span id="o-emi-s"></span></div>
   <div class="sx-card" data-k="split"><span class="lbl">Why the import bill moved</span><div class="sx-bar" id="o-bar"></div><span id="o-split"></span><a href="/hormuz/">Shipping chokepoints →</a></div>
   <div class="sx-explain" id="o-story"></div>
  </div></div>
  <section class="xr-sec"><h2 class="col-title">How it’s worked out</h2><ul class="src">
   <li><b>Pump price.</b> Starts at ₹${pump.rsp} from Indian Oil’s Delhi build-up effective ${esc(pump.effective)}. The change in the rupee cost of a litre of crude (Brent × rupees per dollar ÷ 158.987) is multiplied by your pass-through assumption, then adjusted for any excise change. Delhi VAT of ${pump.vatRate}% applies to that change. Actual retail prices also depend on refining, distribution and pricing decisions.</li>
   <li><b>Import bill.</b> ${sc.crudeImportsMt} million tonnes of crude in ${esc(sc.crudeImportsYear)} × ${sc.barrelsPerTonne} barrels a tonne, valued at Brent. Real cargoes are priced off several benchmarks with discounts and premiums, so treat the level as rough; the change is the useful part.</li>
   <li><b>Current account.</b> The change in the import bill as a share of India’s GDP (IMF estimate for this year${gdpUsd ? `, $${Math.round(gdpUsd).toLocaleString('en-IN')} billion` : ''}), before any second-round effects on exports, remittances or demand.</li>
   <li><b>EMI.</b> Standard reducing-balance formula, with your loan rate moving one-for-one with the repo rate. Banks pass on changes with a lag.</li>
   <li>Sources: ${sc.sources.map(s => `<a href="${s.url}">${esc(s.name)}</a>`).join('; ')}.</li></ul></section>
  </div>
  <script>window.__SX=${JSON.stringify(base)};</script>
  <script src="/scenario.js?v=${Date.now()}" defer></script>`;
}
