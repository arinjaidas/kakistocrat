export function emiPage({ pageHead, repo }) {
  const ctrl = (id, label, min, max, step, val, hint = '') => `<div class="ctrl"><label for="${id}">${label}<output for="${id}"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
  return pageHead('EMI shock', 'What a rate change does to your EMI', `When the RBI moves the repo rate, home loans linked to an external benchmark reprice within about three months. Enter your loan to see what a change does to your monthly instalment, or how much longer you would pay if the EMI is held and the tenure stretched instead. The repo rate is now ${repo.value}%, after a ${repo.change} change on ${repo.date}.`) +
  `<div class="wrap lab" id="emi"><div class="controls">
   <h2 class="col-title">Your loan</h2>
   ${ctrl('e-p', 'Outstanding loan, ₹ lakh', 5, 300, 1, 50)}
   ${ctrl('e-n', 'Years left to pay', 1, 30, 1, 20)}
   ${ctrl('e-r', 'Current interest rate, %', 6, 14, 0.05, 8.5)}
   <h2 class="col-title" style="margin-top:20px">The change</h2>
   ${ctrl('e-d', 'Change in your loan rate, basis points', -150, 200, 25, 25, '100 basis points = 1 percentage point. A repo change usually passes fully to repo-linked loans.')}
   <div class="ctrl"><label>When the rate changes, the bank…</label><div class="seg" id="e-mode"><button type="button" data-r="emi" aria-pressed="true">raises the EMI</button><button type="button" data-r="ten">extends the tenure</button></div></div>
   <button class="btn" id="share" type="button">Copy link to this scenario</button>
  </div><div>
   <div class="results">
    <div class="res"><div class="lbl">Monthly EMI</div><div class="num" id="e-emi"></div><div class="sub" id="e-emi-sub"></div></div>
    <div class="res"><div class="lbl" id="e-k2">Change per month</div><div class="num" id="e-d2"></div><div class="sub" id="e-d2-sub"></div></div>
    <div class="res"><div class="lbl">Extra interest over the loan</div><div class="num" id="e-int"></div><div class="sub" id="e-int-sub"></div></div>
   </div>
   <h2 class="col-title" style="margin-top:24px">The same loan at other rate changes</h2>
   <div class="tbl-wrap"><table class="xr-table" id="e-tbl"></table></div>
   <div class="assume"><b>Assumptions</b><ul><li>Standard reducing-balance EMI with monthly compounding. Fees, insurance, prepayments and the bank's reset date are ignored.</li><li>If the bank holds the EMI and the new rate means the EMI no longer covers the monthly interest, the loan would never be repaid; banks then raise the EMI. The calculator flags this.</li><li>Loans linked to the bank's MCLR reprice more slowly and only partly. Check your loan agreement for the benchmark and reset frequency.</li></ul></div>
  </div></div>`;
}
