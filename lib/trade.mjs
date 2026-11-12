// India's goods trade by partner and product (UN Comtrade, reported by India), and the trade block on country pages.
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';
import { slugify, cleanCountry } from './entities.mjs';

const bn = v => v == null ? '—' : `$${(v / 1e9).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}bn`;
const pc = (a, b) => a == null || !b ? null : (a / b - 1) * 100;
const sgn = v => v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(0)}%`;
const CH_SHORT = { '27': 'Fuels', '71': 'Gems & gold', '85': 'Electronics', '84': 'Machinery', '30': 'Medicines', '87': 'Vehicles', '29': 'Organic chemicals', '10': 'Cereals', '73': 'Iron & steel goods', '72': 'Iron & steel', '39': 'Plastics', '62': 'Clothing (woven)', '61': 'Clothing (knit)', '63': 'Textiles, made-up', '03': 'Fish', '15': 'Edible oils', '31': 'Fertilisers', '26': 'Ores', '28': 'Inorganic chemicals', '90': 'Instruments', '88': 'Aircraft', '89': 'Ships', '76': 'Aluminium', '74': 'Copper', '52': 'Cotton', '38': 'Chemical products', '40': 'Rubber', '08': 'Fruit & nuts', '09': 'Coffee, tea, spices', '17': 'Sugar', '94': 'Furniture', '64': 'Footwear', '42': 'Leather goods', '47': 'Pulp', '48': 'Paper' };
export const chName = (T, c) => CH_SHORT[c] || (T.chapterNames?.[c] || c).replace(/;.*$/, '').replace(/ and articles thereof/i, '').slice(0, 40);

export function tradeBlock(T, iso, name) {
  const p = T?.partners?.[iso]; if (!p) return '';
  const ys = T.years.map(String), ly = ys.at(-1), x = p.X[ly], m = p.M[ly];
  const rank = fl => { const r = Object.entries(T.partners).filter(([, q]) => q[fl][ly]).sort((a, b) => b[1][fl][ly] - a[1][fl][ly]); return r.findIndex(([k]) => k === iso) + 1; };
  const share = fl => (p[fl][ly] || 0) / (T.world[fl][ly] || 1) * 100;
  const pcx = T.partnerChapters?.[iso];
  const top = fl => pcx?.[fl] ? Object.entries(pcx[fl]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v]) => `<li><span>${esc(chName(T, c))}</span><b>${bn(v)}</b></li>`).join('') : '';
  return `<section class="xr-sec"><h2 class="col-title">Trade with India, ${ly}</h2><div class="tr-blk">
   <div class="mk-card"><span class="lbl">India’s exports to ${esc(name)}</span><span class="v">${bn(x)}</span><span class="c">${rank('X') ? `${rank('X')}${['th', 'st', 'nd', 'rd'][rank('X') % 10 > 3 || [11, 12, 13].includes(rank('X') % 100) ? 0 : rank('X') % 10]} biggest market · ` : ''}${share('X').toFixed(1)}% of exports</span>${sparkSVG(ys.map(y => p.X[y] ?? null), 140, 30, '#0F6B3A')}<span class="sub">${sgn(pc(x, p.X[ys.at(-6)]))} over 5 years</span></div>
   <div class="mk-card"><span class="lbl">India’s imports from ${esc(name)}</span><span class="v">${bn(m)}</span><span class="c">${rank('M') ? `${rank('M')}${['th', 'st', 'nd', 'rd'][rank('M') % 10 > 3 || [11, 12, 13].includes(rank('M') % 100) ? 0 : rank('M') % 10]} biggest supplier · ` : ''}${share('M').toFixed(1)}% of imports</span>${sparkSVG(ys.map(y => p.M[y] ?? null), 140, 30, '#B42318')}<span class="sub">${sgn(pc(m, p.M[ys.at(-6)]))} over 5 years</span></div>
   <div class="mk-card"><span class="lbl">Balance</span><span class="v ${(x || 0) - (m || 0) >= 0 ? 'up' : 'dn'}">${(x || 0) - (m || 0) >= 0 ? '+' : '−'}${bn(Math.abs((x || 0) - (m || 0)))}</span><span class="c">${(x || 0) >= (m || 0) ? 'India sells more than it buys' : 'India buys more than it sells'}</span><span class="sub">goods only</span></div>
   ${pcx ? `<div class="tr-top"><div><h3 class="sub-h">India sells</h3><ul>${top('X')}</ul></div><div><h3 class="sub-h">India buys</h3><ul>${top('M')}</ul></div></div>` : ''}
  </div><p class="meta">Goods trade as reported by India to UN Comtrade, US dollars. <a href="/trade/">All of India’s trade →</a></p></section>`;
}

export function tradePage(T, { pageHead, countrySlug, countryName = {} }) {
  const ys = T.years.map(String), ly = ys.at(-1), y5 = ys.at(-6);
  const wx = T.world.X[ly], wm = T.world.M[ly];
  const rows = Object.entries(T.partners).filter(([a]) => a !== 'IND' && !/^_|^W00/.test(a)).map(([a, p]) => ({ a, name: countryName[a] || cleanCountry(p.name).replace(/, nes$/, ' (n.e.s.)'), x: p.X[ly] || 0, m: p.M[ly] || 0, x5: p.X[y5], m5: p.M[y5] })).filter(r => r.x + r.m > 0).sort((p, q) => (q.x + q.m) - (p.x + p.m));
  const link = r => countrySlug[r.a] ? `<a href="/country/${countrySlug[r.a]}/">${esc(r.name)}</a>` : esc(r.name);
  const tbl = rows.slice(0, 40).map((r, i) => `<tr><td class="num">${i + 1}</td><th scope="row">${link(r)}</th><td class="num">${bn(r.x)}</td><td class="num">${bn(r.m)}</td><td class="num ${r.x - r.m >= 0 ? 'up' : 'dn'}">${r.x - r.m >= 0 ? '+' : '−'}${bn(Math.abs(r.x - r.m))}</td><td class="num">${((r.x + r.m) / (wx + wm) * 100).toFixed(1)}%</td><td class="num">${sgn(pc(r.x, r.x5))}</td><td class="num">${sgn(pc(r.m, r.m5))}</td></tr>`).join('');
  const payload = { years: ys, world: T.world, top: rows.slice(0, 12).map(r => ({ a: r.a, name: r.name, X: T.partners[r.a].X, M: T.partners[r.a].M, slug: countrySlug[r.a] })), chapters: Object.fromEntries(['X', 'M'].map(fl => [fl, Object.entries(T.chapters[fl] || {}).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ c, n: chName(T, c), v }))])), balance: rows.slice(0, 25).map(r => ({ name: r.name, b: r.x - r.m, slug: countrySlug[r.a] })) };
  return pageHead('Trade', `India’s trade: who buys, who sells, and what`, `India exported ${bn(wx)} of goods in ${ly} and imported ${bn(wm)}, a goods deficit of ${bn(wm - wx)}. Partners, products and the trend since ${ys[0]}, as reported by India to UN Comtrade. Click any country for its full page.`) + `<div class="wrap">
  <section class="xr-sec"><h2 class="col-title">Exports and imports since ${ys[0]}</h2><div id="tr-world" class="ec" style="height:320px"></div></section>
  <section class="xr-sec"><div class="mk-two" style="align-items:start"><div><h2 class="col-title">What India sells, ${ly}</h2><div id="tr-cx" class="ec" style="height:420px"></div></div><div><h2 class="col-title">What India buys, ${ly}</h2><div id="tr-cm" class="ec" style="height:420px"></div></div></div><p class="meta">Boxes sized by value, by HS chapter.</p></section>
  <section class="xr-sec"><h2 class="col-title">The biggest partners over time</h2><div class="mk-two" style="align-items:start"><div><h3 class="sub-h">India’s exports to</h3><div id="tr-px" class="ec" style="height:380px"></div></div><div><h3 class="sub-h">India’s imports from</h3><div id="tr-pm" class="ec" style="height:380px"></div></div></div></section>
  <section class="xr-sec"><h2 class="col-title">Surplus and deficit by partner, ${ly}</h2><div id="tr-bal" class="ec" style="height:560px"></div></section>
  <section class="xr-sec"><h2 class="col-title">Top 40 partners, ${ly}</h2><div class="tbl-wrap"><table class="xr-table"><thead><tr><th>#</th><th>Partner</th><th class="num">Exports</th><th class="num">Imports</th><th class="num">Balance</th><th class="num">Share of trade</th><th class="num">Exports, 5y</th><th class="num">Imports, 5y</th></tr></thead><tbody>${tbl}</tbody></table></div>
   <p class="meta">Source: <a href="https://comtradeplus.un.org/">UN Comtrade</a>, goods trade reported by India (customs basis), US dollars, calendar years. Services, which India runs a large surplus on, are not included. Data at <a href="/api/markets/trade.json">/api/markets/trade.json</a>.</p></section>
  </div>
  <script>window.__TR=${JSON.stringify(payload)};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/trade.js?v=${Date.now()}" defer></script>`;
}
