/* Scenario engine: every output recalculates from the same three shocks. State lives in the URL hash. */
(function () {
  const B = window.__SX; if (!B) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const nf = (v, d = 2) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const sg = (v, d = 2, pre = '', suf = '') => `${v > 0 ? '+' : v < 0 ? '−' : ''}${pre}${nf(Math.abs(v), d)}${suf}`;
  const L = 158.987, ids = ['brent', 'inr', 'repo', 'pass', 'exc', 'litres', 'loan', 'years', 'spread'];
  const v = k => parseFloat($('#sx-' + k).value);
  const PRESET = { today: { brent: B.brent, inr: B.inr, repo: B.repo }, hormuz: { brent: 140, inr: +(B.inr * 1.04).toFixed(2), repo: B.repo }, crash: { brent: 55, inr: +(B.inr * 0.98).toFixed(2), repo: B.repo - 0.5 },
    rupee100: { brent: B.brent, inr: 100, repo: B.repo }, hike: { brent: B.brent, inr: B.inr, repo: B.repo + 0.5 }, perfect: { brent: 150, inr: 105, repo: B.repo + 1 } };
  const pumpAt = (brent, inr, pass, exc) => { const d = (brent * inr - B.brent * B.inr) / L * pass; const pre = B.pump.base + d + exc + B.pump.dealer; return pre * (1 + B.pump.vatRate / 100); };
  const emi = (P, r, n) => { const i = r / 1200, m = n * 12; return i ? P * i * (1 + i) ** m / ((1 + i) ** m - 1) : P / m; };
  const calc = () => {
    ids.forEach(k => { const o = $(`#sx-${k}-o`); if (o) o.textContent = { brent: `$${nf(v(k), 1)}`, inr: `₹${nf(v(k))}`, repo: `${nf(v(k))}%`, pass: `${v(k)}%`, exc: `₹${nf(v(k))}`, litres: `${v(k)} L`, loan: `₹${v(k)} lakh`, years: `${v(k)} yrs`, spread: `${nf(v(k))} pts` }[k]; });
    const br = v('brent'), ir = v('inr'), rp = v('repo'), pass = v('pass') / 100, exc = v('exc');
    const p0 = pumpAt(B.brent, B.inr, 1, B.pump.excise), p1 = pumpAt(br, ir, pass, exc), dp = p1 - p0;
    $('#o-pump').textContent = `₹${nf(p1)}`; $('#o-pump-s').textContent = `${sg(dp, 2, '₹')} a litre on today’s ₹${nf(p0)} · taxes ${nf((exc + (p1 - p1 / (1 + B.pump.vatRate / 100))) / p1 * 100, 1)}% of the price`;
    const lit = v('litres'); $('#o-house').textContent = `${sg(dp * lit, 0, '₹')}`; $('#o-house-s').textContent = `a month on ${lit} litres (₹${nf(p1 * lit, 0)} in all)`;
    const bbl = B.crudeImportsMt * 1e6 * B.barrelsPerTonne, bill0 = bbl * B.brent / 1e9, bill1 = bbl * br / 1e9, dUsd = bill1 - bill0;
    const lc0 = bbl * B.brent * B.inr / 1e12, lc1 = bbl * br * ir / 1e12;
    $('#o-bill').textContent = `$${nf(bill1, 0)} bn`; $('#o-bill-s').textContent = `${sg(dUsd, 1, '$', ' bn')} a year · in rupees ₹${nf(lc1, 2)} lakh crore (${sg(lc1 - lc0, 2, '₹', ' lakh crore')})`;
    if (B.gdpUsd) { const pc = dUsd / B.gdpUsd * 100; $('#o-cad').textContent = `${sg(-pc, 2, '', '% of GDP')}`; $('#o-cad-s').textContent = pc > 0 ? 'wider deficit from the oil bill alone' : pc < 0 ? 'narrower deficit from the oil bill alone' : 'no change from oil'; }
    const P = v('loan') * 1e5, n = v('years'), sp = v('spread'), e0 = emi(P, B.repo + sp, n), e1 = emi(P, rp + sp, n);
    $('#o-emi').textContent = `₹${nf(e1, 0)}`; $('#o-emi-s').textContent = `${sg(e1 - e0, 0, '₹')} a month at ${nf(rp + sp)}% · ${sg((e1 - e0) * n * 12, 0, '₹')} over the loan`;
    const oilE = bbl * (br - B.brent) * B.inr / 1e12, fxE = bbl * B.brent * (ir - B.inr) / 1e12, both = (lc1 - lc0) - oilE - fxE, tot = Math.abs(oilE) + Math.abs(fxE) + Math.abs(both) || 1;
    $('#o-bar').innerHTML = `<i style="width:${Math.abs(oilE) / tot * 100}%;background:#15171A"></i><i style="width:${Math.abs(fxE) / tot * 100}%;background:#B42318"></i><i style="width:${Math.abs(both) / tot * 100}%;background:#C9C3B4"></i>`;
    $('#o-split').innerHTML = `<em style="color:#15171A">Oil ${sg(oilE, 2, '₹', 'L cr')}</em> · <em style="color:#B42318">Rupee ${sg(fxE, 2, '₹', 'L cr')}</em> · both ${sg(both, 2, '₹', 'L cr')}`;
    const parts = [];
    if (Math.abs(br - B.brent) >= 0.5) parts.push(`Brent ${br > B.brent ? 'up' : 'down'} $${nf(Math.abs(br - B.brent), 1)} to $${nf(br, 1)}`);
    if (Math.abs(ir - B.inr) >= 0.05) parts.push(`the rupee ${ir > B.inr ? 'weaker' : 'stronger'} at ₹${nf(ir)}`);
    if (Math.abs(rp - B.repo) >= 0.01) parts.push(`the repo rate ${rp > B.repo ? 'up' : 'down'} ${nf(Math.abs(rp - B.repo) * 100, 0)}bp`);
    $('#o-story').innerHTML = parts.length ? `<b>In one line:</b> with ${parts.join(', ')}, petrol in Delhi would be ${Math.abs(dp) < 0.005 ? 'unchanged' : `${dp > 0 ? 'up' : 'down'} ₹${nf(Math.abs(dp))} a litre, at ₹${nf(p1)}`}${pass < 1 ? ` (at ${v('pass')}% pass-through)` : ''}, India would pay $${nf(Math.abs(dUsd), 1)} bn ${dUsd >= 0 ? 'more' : 'less'} a year for crude${B.gdpUsd ? ` (${nf(Math.abs(dUsd / B.gdpUsd * 100), 2)}% of GDP)` : ''}, and a ₹${v('loan')} lakh home loan would cost ${Math.abs(e1 - e0) < 1 ? 'the same each month' : `₹${nf(Math.abs(e1 - e0), 0)} ${e1 > e0 ? 'more' : 'less'} a month`}.` : '<b>Move a slider or pick a preset</b> to run a scenario. Everything here starts from today’s values.';
    const h = new URLSearchParams(); ids.forEach(k => h.set(k, $('#sx-' + k).value)); history.replaceState(null, '', '#' + h);
  };
  const set = o => { Object.entries(o).forEach(([k, x]) => { $('#sx-' + k).value = x; }); calc(); };
  const p = new URLSearchParams(location.hash.slice(1)); ids.forEach(k => { if (p.has(k)) $('#sx-' + k).value = p.get(k); });
  ids.forEach(k => $('#sx-' + k).addEventListener('input', calc));
  $$('.sx-presets [data-p]').forEach(b => b.addEventListener('click', () => { $$('.sx-presets [data-p]').forEach(x => x.removeAttribute('aria-pressed')); b.setAttribute('aria-pressed', 'true'); set(PRESET[b.dataset.p]); }));
  $('#sx-share').addEventListener('click', () => { navigator.clipboard?.writeText(location.href).then(() => { $('#sx-share').textContent = 'Link copied'; setTimeout(() => $('#sx-share').textContent = 'Copy link', 1600); }); });
  calc();
})();
