// GST consumer price arithmetic. This is a scenario, not an estimate of realised pass-through.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function gstPassThroughPage({pageHead}) {
  return pageHead('What if?', 'Who received a GST rate cut?', 'Change a statutory rate and a pass-through assumption. See the buyer’s price, the seller’s net receipt and the tax collected on that illustrative sale.')+
  '<div class="wrap" style="max-width:1000px"><section class="gst-tool" id="gst-tool">'+
  '<div class="gst-control"><h2>Set the transaction</h2>'+
  '<label>Original tax-inclusive retail price (₹)<input type="number" id="gst-price" min="0.01" max="1000000000" step=".01" value="118"></label>'+
  '<label>Old GST rate (%)<input type="number" id="gst-old" min="0" max="100" step=".1" value="18"></label>'+
  '<label>New GST rate (%)<input type="number" id="gst-new" min="0" max="100" step=".1" value="5"></label>'+
  '<label>Consumer share of statutory saving (%)<input type="range" id="gst-share" min="0" max="100" step="5" value="100"><output for="gst-share" id="gst-share-label">100%</output></label>'+
  '<label>Units purchased each month<input type="number" id="gst-units" min="0" max="1000000" step="1" value="10"></label>'+
  '<button class="gst-reset" type="button" id="gst-reset">Reset assumptions</button></div>'+
  '<div class="gst-results"><h2>What changes?</h2>'+
  '<div class="gst-output"><span>New customer price per unit</span><strong id="gst-price-new">₹105.00</strong></div>'+
  '<div class="gst-output"><span>Consumer saving per unit</span><strong id="gst-saving">₹13.00</strong></div>'+
  '<div class="gst-output"><span>Monthly consumer saving</span><strong id="gst-monthly">₹130.00</strong></div>'+
  '<div class="gst-output"><span>Change in seller’s pre-tax receipt per unit</span><strong id="gst-seller">₹0.00</strong></div>'+
  '<div class="gst-output"><span>Change in gross GST collected per unit</span><strong id="gst-tax">−₹13.00</strong></div>'+
  '<p class="gst-method" id="gst-math"></p></div></section>'+
  '<section class="gst-notes"><h2>What this does and does not show</h2>'+
  '<p>This calculator holds the underlying transaction and product specification fixed. The original pretax base is the old inclusive price divided by (1 + old rate/100). The full statutory saving is the difference between old and new inclusive prices at that same base. The chosen consumer share allocates that arithmetic saving between buyers and sellers. It does not estimate the actual share passed through in Indian shops.</p>'+
  '<p>Changing input-tax credits, exempt goods, non-creditable costs, cess, promotions, changing pack sizes, inventory pricing, competition and inflation can all change the realised incidence. The statutory saving may also be negative if the rate goes up. This is a single-transaction illustration, not a fiscal revenue forecast.</p>'+
  '<div class="yr-links"><a href="https://thekakisto.wordpress.com/2026/11/14/gst-september-2025-rate-cuts-consumer-price-pass-through-evidence/">Read the historical investigation</a><a href="/desk/india-year-in-review/public-money/">Public money timeline</a><a href="/ledger/">Policy Ledger</a></div></section></div><link rel="stylesheet" href="/gst-pass-through.css"><script src="/gst-pass-through.js" defer></script>';
}
