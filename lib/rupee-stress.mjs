import { esc } from './charts.mjs';

export const rupeeStressPath = '/research/oil-rupee/';

export function rupeeStress({ data, pageHead }) {
  const barrelChange = data.baseline_oil_usd * (data.stress_inr_per_usd - data.baseline_inr_per_usd);
  const crudePerLitre = barrelChange / data.litres_per_barrel;
  const barrels = data.import_volume_mt * 1e6 * data.barrels_per_tonne;
  const inrCrore = barrels * barrelChange / 1e7;
  const fmt = (n, d = 2) => n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const rows = data.pass_through.map(pass => {
    const change = crudePerLitre * pass * (1 + data.delhi_vat_rate);
    return { pass, change, household: change * data.household_litres_per_month, price: change + data.delhi_petrol_inr_per_litre };
  });
  const chart = '<figure class="research-chart"><img src="/research/oil-rupee/pass-through.png" width="1200" height="630" alt="The modeled monthly fuel bill rises by ₹0, ₹45, ₹90, ₹135 and ₹180 across the five pass-through assumptions. The full data follow in the table."></figure>';
  const table = `<div class="research-table"><table><thead><tr><th scope="col">Pass-through</th><th scope="col">Change per litre</th><th scope="col">Modeled pump price</th><th scope="col">Change per month</th></tr></thead><tbody>
    ${rows.map(r => `<tr><th scope="row">${r.pass * 100}%</th><td>₹${fmt(r.change)}</td><td>₹${fmt(r.price)}</td><td>₹${fmt(r.household)}</td></tr>`).join('')}
  </tbody></table></div>`;
  const body = pageHead('Research', 'Who pays when the rupee falls?', 'A fixed oil and rupee stress test for India. Change the assumptions in the notebook or explore a comparable shock with current site inputs.') +
    `<div class="wrap"><section class="xr-sec">
      <h2 class="col-title">The scenario</h2>
      <p>Hold crude at $${data.baseline_oil_usd} per barrel and move the exchange rate from ₹${data.baseline_inr_per_usd} to ₹${data.stress_inr_per_usd} per dollar. At the same crude volume, the modeled dollar bill stays fixed. Converting the same imports into rupees adds roughly <strong>₹${fmt(inrCrore, 0)} crore</strong> on the ${esc(data.import_period)} volume. This is an exposure calculation, with freight, grades, hedging and volumes held fixed.</p>
      <p>Starting at Indian Oil’s ₹${fmt(data.delhi_petrol_inr_per_litre)} Delhi price effective ${esc(data.delhi_price_effective)}, keep excise and dealer commission fixed. The pump-price change equals the crude cost change per litre times the assumed pass-through, with Delhi VAT applied to the change. The monthly bill assumes ${data.household_litres_per_month} litres.</p>
      ${chart}${table}
      <div class="en-chips"><a href="/research/oil-rupee/rupee-fuel-stress-test.ipynb" download>Python notebook</a><a href="/research/oil-rupee/inputs.json" download>Inputs JSON</a><a href="/research/oil-rupee/results.csv" download>Results CSV</a><a href="/research/oil-rupee/pass-through.png" download>Chart PNG</a><a href="/what-if/#inr=100&amp;pass=50">Try ₹100 with 50% pass-through →</a></div>
      <p class="meta">Save the notebook and inputs JSON in the same directory to rerun the calculation. The interactive calculator uses the latest inputs on the site.</p>
      <h2 class="col-title">Sources</h2>
      <ul class="src">${Object.entries(data.sources).map(([label, url]) => `<li><a href="${esc(url)}">${esc(label)}</a></li>`).join('')}</ul>
      <p><a href="/series/the-2026-oil-shock/">Read The 2026 oil shock in order →</a></p>
    </section></div>`;
  const csv = ['pass_through_pct,pump_change_inr_per_litre,pump_price_inr_per_litre,household_change_inr_per_month',
    ...rows.map(r => [r.pass * 100, r.change.toFixed(2), r.price.toFixed(2), r.household.toFixed(2)].join(','))].join('\n') + '\n';
  return { body, csv };
}
