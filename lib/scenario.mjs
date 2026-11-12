// Scenario engine: one set of shocks (oil, rupee, repo) pushed through the pump price, the household fuel bill,
// the national crude import bill, the current account and a home-loan EMI, with links into every related page.
import { esc } from './charts.mjs';

export function scenarioPage({ MK, tape, pump, sc, pageHead }) {
  const fl = MK?.fredLast || {}, brent = fl.DCOILBRENTEU?.last[1] ?? 100, brentD = fl.DCOILBRENTEU?.last[0] ?? '';
  const inr = MK?.fxOut?.table.find(t => t.c === 'INR')?.last ?? 94, repo = tape.indicators.find(i => i.id === 'repo')?.latest.value ?? 5.5;
  const gdpUsd = MK?.imfWorld?.data?.NGDPD?.IND?.[String(new Date().getUTCFullYear())] ?? null;
  const base = { brent: +brent.toFixed(1), inr: +inr.toFixed(2), repo, gdpUsd, pump: { rsp: pump.rsp, base: +(pump.chargedToDealersExVat - pump.excise).toFixed(2), excise: pump.excise, dealer: pump.dealerCommission, vatRate: pump.vatRate, effective: pump.effective }, ...sc };
  const ctrl = (id, label, min, max, step, val, unit) => `<div class="sx-c"><label for="${id}"><span>${label}</span><output id="${id}-o"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><div class="sx-now">Today: ${unit(val)}</div></div>`;
  return pageHead('Scenario engine', 'What if? One shock, every consequence', `Move oil, the rupee and the repo rate, and see what happens to the pump price, a household’s fuel bill, India’s crude import bill, the current account and a home-loan EMI, all at once. Start from today’s values (Brent $${brent.toFixed(1)} on ${brentD}, ₹${inr.toFixed(2)} per dollar, repo ${repo.toFixed(2)}%) or pick a preset.`) + `<div class="wrap sx" id="sx">
  <div class="sx-presets"><span>Presets</span>${[['today', 'Today'], ['hormuz', 'Hormuz stays shut'], ['crash', 'Oil crash'], ['rupee100', 'Rupee at 100'], ['hike', 'RBI hikes 50bp'], ['perfect', 'Perfect storm']].map(([k, t]) => `<button type="button" data-p="${k}">${t}</button>`).join('')}<button type="button" id="sx-share" class="sx-share">Copy link</button></div>
  <div class="sx-grid"><div class="sx-ctrls">
   ${ctrl('sx-brent', 'Brent crude, $ a barrel', 30, 200, 0.5, base.brent, v => `$${v}`)}
   ${ctrl('sx-inr', 'Rupees per US dollar', 75, 120, 0.05, base.inr, v => `₹${v}`)}
   ${ctrl('sx-repo', 'RBI repo rate, %', 3, 9, 0.25, repo, v => `${v.toFixed(2)}%`)}
   ${ctrl('sx-pass', 'Pass-through to the pump, %', 0, 100, 5, 100, v => `${v}% (assumed)`)}
   ${ctrl('sx-exc', 'Central excise on petrol, ₹ a litre', 0, 35, 0.1, pump.excise, v => `₹${v}`)}
   <details class="sx-more"><summary>Your numbers</summary>
    ${ctrl('sx-litres', 'Petrol you buy, litres a month', 0, 200, 5, 40, v => `${v} litres (assumed)`)}
    ${ctrl('sx-loan', 'Home loan, ₹ lakh', 5, 300, 5, sc.loan.principal / 1e5, v => `₹${v} lakh (assumed)`)}
    ${ctrl('sx-years', 'Loan term, years', 5, 30, 1, sc.loan.years, v => `${v} years`)}
    ${ctrl('sx-spread', 'Your loan rate minus the repo rate, points', 0, 6, 0.05, +(sc.loan.rate - repo).toFixed(2), v => `${v} points`)}
   </details></div>
  <div class="sx-out">
   <div class="sx-card" data-k="pump"><span class="lbl">Petrol in Delhi</span><b id="o-pump"></b><span id="o-pump-s"></span><a href="/what-if/pump-price/">Price build-up →</a></div>
   <div class="sx-card" data-k="house"><span class="lbl">Your fuel bill</span><b id="o-house"></b><span id="o-house-s"></span><a href="/states/#ig-cpi">Inflation basket →</a></div>
   <div class="sx-card" data-k="bill"><span class="lbl">India’s crude import bill</span><b id="o-bill"></b><span id="o-bill-s"></span><a href="/s/fred-dcoilbrenteu/">Brent →</a></div>
   <div class="sx-card" data-k="cad"><span class="lbl">Current account</span><b id="o-cad"></b><span id="o-cad-s"></span><a href="/external/">Rupee & external sector →</a></div>
   <div class="sx-card" data-k="emi"><span class="lbl">Your EMI</span><b id="o-emi"></b><span id="o-emi-s"></span><a href="/what-if/">EMI shock →</a></div>
   <div class="sx-card" data-k="split"><span class="lbl">Why the import bill moved</span><div class="sx-bar" id="o-bar"></div><span id="o-split"></span><a href="/hormuz/">Shipping chokepoints →</a></div>
   <div class="sx-explain" id="o-story"></div>
  </div></div>
  <section class="xr-sec"><h2 class="col-title">How it’s worked out</h2><ul class="src">
   <li><b>Pump price.</b> Starts from Indian Oil’s Delhi build-up of ${esc(pump.effective)}: oil company price ₹${base.pump.base}, excise ₹${pump.excise}, dealer commission ₹${pump.dealerCommission}, VAT ${pump.vatRate}% on top. The oil company price moves by the change in the rupee cost of a litre of crude (Brent × rupees per dollar ÷ 158.987) times the pass-through you choose; VAT is then recalculated. In practice pump prices are set by the oil companies and often lag or don’t move.</li>
   <li><b>Import bill.</b> ${sc.crudeImportsMt} million tonnes of crude in ${esc(sc.crudeImportsYear)} × ${sc.barrelsPerTonne} barrels a tonne, valued at Brent. Real cargoes are priced off several benchmarks with discounts and premiums, so treat the level as rough; the change is the useful part.</li>
   <li><b>Current account.</b> The change in the import bill as a share of India’s GDP (IMF estimate for this year${gdpUsd ? `, $${Math.round(gdpUsd).toLocaleString('en-IN')} billion` : ''}), before any second-round effects on exports, remittances or demand.</li>
   <li><b>EMI.</b> Standard reducing-balance formula, with your loan rate moving one-for-one with the repo rate. Banks pass on changes with a lag.</li>
   <li>Sources: ${sc.sources.map(s => `<a href="${s.url}">${esc(s.name)}</a>`).join('; ')}.</li></ul></section>
  </div>
  <script>window.__SX=${JSON.stringify(base)};</script>
  <script src="/scenario.js?v=${Date.now()}" defer></script>`;
}
