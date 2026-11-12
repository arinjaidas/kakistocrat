// The Kakistocrat Terminal: every number on the site on one dark, dense screen, with a command bar
// that charts any of the series in the catalogue.
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';
import { chokeStats } from './hormuz.mjs';

const f = (v, d = 2) => v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const pc = (v, d = 1) => v == null || Number.isNaN(v) ? '<span class="t-mu">—</span>' : `<span class="${v > 0 ? 't-up' : v < 0 ? 't-dn' : 't-mu'}">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}</span>`;
const short = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const FXN = { INR: 'INR', EUR: 'EUR', GBP: 'GBP', JPY: 'JPY', CNY: 'CNY', KRW: 'KRW', IDR: 'IDR', MYR: 'MYR', PHP: 'PHP', THB: 'THB', SGD: 'SGD', BRL: 'BRL', MXN: 'MXN', ZAR: 'ZAR', TRY: 'TRY' };

const panel = (id, title, body, extra = '') => `<section class="t-p" id="${id}" ${extra}><h2 class="t-h"><span>${title}</span></h2><div class="t-b">${body}</div></section>`;

export function terminalPage({ MK, tape, articles, BUILT }) {
  const M = MK, L = M.dates.length - 1;
  const slug = n => 'nse-' + n.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Indices
  const ORDER = ['Nifty 50', 'Nifty Next 50', 'Nifty 100', 'Nifty 500', 'NIFTY Midcap 100', 'NIFTY Smallcap 100', 'India VIX', 'Nifty Bank', 'Nifty Financial Services', 'Nifty Private Bank', 'Nifty PSU Bank', 'Nifty IT', 'Nifty Auto', 'Nifty FMCG', 'Nifty Pharma', 'Nifty Healthcare Index', 'Nifty Metal', 'Nifty Energy', 'Nifty Oil & Gas', 'Nifty Realty', 'Nifty Media', 'Nifty Consumer Durables', 'Nifty Infrastructure', 'Nifty Commodities', 'Nifty India Defence', 'Nifty CPSE', 'Nifty PSE'];
  const perf = ORDER.map(n => M.perf.find(p => p.n === n)).filter(Boolean);
  const idxRows = perf.map(p => `<tr data-s="${slug(p.n)}" tabindex="0"><th>${esc(/^(NIFTY|Nifty) (\d|Next|Midcap|Smallcap)/.test(p.n) ? p.n.replace(/^NIFTY /, 'Nifty ') : p.n.replace(/^Nifty /, '').replace(' Index', ''))}</th><td>${f(p.last)}</td><td>${pc(p.d1, 2)}</td><td>${pc(p.w1)}</td><td>${pc(p.m1)}</td><td>${pc(p.ytd)}</td><td>${pc(p.y1)}</td></tr>`).join('');
  const indices = `<table class="t-t"><thead><tr><th>NSE</th><th>Last</th><th>1D%</th><th>1W%</th><th>1M%</th><th>YTD%</th><th>1Y%</th></tr></thead><tbody>${idxRows}</tbody></table>`;

  // Macro tape
  const macro = `<table class="t-t"><thead><tr><th>India</th><th>Latest</th><th>Prev</th><th>Period</th><th>Next</th></tr></thead><tbody>${tape.indicators.filter(i => ['cpi', 'repo', 'inr', 'g10'].includes(i.id)).map(i => `<tr><th><a href="/s/${{ cpi: "india-cpi", repo: "india-repo", inr: "fx-usdinr", g10: "nse-nifty-10-yr-benchmark-g-sec" }[i.id]}/">${esc(i.short || i.label)}</a></th><td class="t-hi">${f(i.latest.value, i.decimals ?? 2)}${i.unit === '%' ? '%' : ''}</td><td>${i.previous ? f(i.previous.value, i.decimals ?? 2) : '—'}</td><td class="t-mu">${esc(i.latest.period)}</td><td class="t-am">${i.next ? esc(short(i.next.date)) : ''}</td></tr>`).join('')}</tbody></table>
   <div class="t-val"><span>Nifty P/E <b>${f(M.pe.at(-1))}</b></span><span>P/B <b>${f(M.pb.at(-1))}</b></span><span>Div yld <b>${f(M.dy.at(-1))}%</b></span><span>P/E pctile <b>${M.pePct}</b></span></div>`;

  // FX
  const fx = M.fxOut?.table || [], inr = fx.find(t => t.c === 'INR')?.last;
  const fxRows = fx.map(t => `<tr data-s="fx-usd${t.c.toLowerCase()}" tabindex="0"><th>USD${FXN[t.c] || t.c}</th><td>${f(t.last, t.last > 100 ? 2 : 4)}</td><td>${t.c === 'INR' ? '—' : f(inr / t.last, t.c === 'JPY' || t.c === 'KRW' || t.c === 'IDR' ? 4 : 2)}</td><td>${pc(t.d1 == null ? null : -t.d1, 2)}</td><td>${pc(t.m1 == null ? null : -t.m1)}</td><td>${pc(t.y1 == null ? null : -t.y1)}</td></tr>`).join('');
  const fxP = `<table class="t-t"><thead><tr><th>Pair</th><th>Last</th><th>In ₹</th><th>1D%</th><th>1M%</th><th>1Y%</th></tr></thead><tbody>${fxRows}</tbody></table><p class="t-note">% = currency’s move against the dollar (+ = stronger). ECB, ${M.fxOut ? short(M.fxOut.date) : ''}.</p>`;

  // Rates
  const fl = M.fredLast || {};
  const rr = [['DFF', 'Fed funds'], ['DGS3MO', 'UST 3M'], ['DGS2', 'UST 2Y'], ['DGS10', 'UST 10Y'], ['DGS30', 'UST 30Y'], ['T10YIE', '10Y breakeven'], ['DTWEXBGS', 'Broad dollar']];
  const ratesRows = rr.filter(([id]) => fl[id]).map(([id, n]) => { const x = fl[id], ch = x.prev ? x.last[1] - x.prev[1] : null, y = x.yago ? x.last[1] - x.yago[1] : null, isIdx = id === 'DTWEXBGS';
    return `<tr data-s="fred-${id.toLowerCase()}" tabindex="0"><th>${n}</th><td>${f(x.last[1])}${isIdx ? '' : '%'}</td><td>${isIdx ? pc(x.prev ? (x.last[1] / x.prev[1] - 1) * 100 : null, 2) : pc(ch == null ? null : ch * 100, 0)}</td><td>${isIdx ? pc(x.yago ? (x.last[1] / x.yago[1] - 1) * 100 : null) : pc(y == null ? null : y * 100, 0)}</td><td class="t-mu">${short(x.last[0])}</td></tr>`; }).join('');
  const repo = tape.indicators.find(i => i.id === 'repo')?.latest.value, g10 = tape.indicators.find(i => i.id === 'g10')?.latest.value;
  const s2s10 = fl.DGS10 && fl.DGS2 ? (fl.DGS10.last[1] - fl.DGS2.last[1]) * 100 : null;
  const rates = `<table class="t-t"><thead><tr><th>Rate</th><th>Last</th><th>1D</th><th>1Y</th><th>As of</th></tr></thead><tbody>
   <tr><th>RBI repo</th><td class="t-hi">${f(repo)}%</td><td colspan="3" class="t-mu">policy rate</td></tr><tr><th>India 10Y</th><td class="t-hi">${f(g10)}%</td><td colspan="3" class="t-mu">G-Sec close</td></tr>${ratesRows}</tbody></table>
   <div class="t-val"><span>US 2s10s <b>${s2s10 == null ? '—' : (s2s10 > 0 ? '+' : '') + s2s10.toFixed(0) + 'bp'}</b></span><span>IN–US 10Y <b>${fl.DGS10 ? ((g10 - fl.DGS10.last[1]) * 100).toFixed(0) + 'bp' : '—'}</b></span><span>Repo–FF <b>${fl.DFF ? ((repo - fl.DFF.last[1]) * 100).toFixed(0) + 'bp' : '—'}</b></span></div><p class="t-note">Changes in basis points; dollar index in %.</p>`;

  // Commodities
  const C = M.comm;
  const daily = [['DCOILBRENTEU', 'Brent spot', '$/bbl'], ['DCOILWTICO', 'WTI spot', '$/bbl'], ['DHHNGSP', 'Henry Hub', '$/mmbtu']].filter(([id]) => fl[id]).map(([id, n, u]) => { const x = fl[id]; return `<tr data-s="fred-${id.toLowerCase()}" tabindex="0"><th title="${u}, ${short(x.last[0])}">${n} <small class="t-mu">${u}</small></th><td>${f(x.last[1])}</td><td>${pc(x.prev ? (x.last[1] / x.prev[1] - 1) * 100 : null, 2)}</td><td>${pc(x.yago ? (x.last[1] / x.yago[1] - 1) * 100 : null)}</td></tr>`; }).join('');
  const commRows = (C?.items || []).map(i => `<tr data-s="wb-${i.id}" tabindex="0"><th title="${esc(i.unit)}">${esc(i.name)} <small class="t-mu">${esc(i.unit.replace(/^US?\$\s?\/?\s?/, '$/'))}</small></th><td>${f(i.cur, i.cur >= 100 ? 0 : 2)}</td><td>${pc(i.mm)}</td><td>${pc(i.yy)}</td></tr>`).join('');
  const comm = `<table class="t-t"><thead><tr><th>Commodity</th><th>Last</th><th>1D/1M%</th><th>1Y%</th></tr></thead><tbody>${daily}${commRows}</tbody></table><p class="t-note">Spot rows: daily EIA prices${fl.DCOILBRENTEU ? ' to ' + short(fl.DCOILBRENTEU.last[0]) : ''}, 1D change. Monthly averages: World Bank Pink Sheet${C ? ', ' + esc(C.month) : ''}.</p>`;

  // Movers
  const st = M.stocks?.nifty50 || [], srt = [...st].sort((a, b) => b.chg - a.chg), br = M.stocks?.breadth;
  const mv = s => `<li><span>${esc(s.n)}</span><b>${f(s.c)}</b>${pc(s.chg, 2)}</li>`;
  const movers = `<div class="t-mv"><ol>${srt.slice(0, 6).map(mv).join('')}</ol><ol>${srt.slice(-6).reverse().map(mv).join('')}</ol></div>${br ? `<div class="t-br"><i style="flex:${br.advances};background:#22C55E"></i><i style="flex:${br.unchanged};background:#4B5563"></i><i style="flex:${br.declines};background:#EF4444"></i></div><p class="t-note">NSE breadth: <span class="t-up">${br.advances} up</span> · <span class="t-dn">${br.declines} down</span> · ${br.unchanged} flat</p>` : ''}`;

  // Crypto
  const cr = M.crypto || {};
  const crypto = `<div class="t-cr"><div data-s="crypto-bitcoin"><span>BTC</span><b data-live="btc2">$${f(cr.bitcoin?.at(-1)?.[1], 0)}</b><em data-live="btc2-c">close</em>${sparkSVG((cr.bitcoin || []).slice(-90).map(p => p[1]), 160, 28, '#F59E0B')}</div><div data-s="crypto-ethereum"><span>ETH</span><b data-live="eth">$${f(cr.ethereum?.at(-1)?.[1], 2)}</b><em data-live="eth-c">close</em>${sparkSVG((cr.ethereum || []).slice(-90).map(p => p[1]), 160, 28, '#A78BFA')}</div></div>`;

  // Chokepoints
  const CS = chokeStats(M.portwatch);
  const choke = CS.length ? `<table class="t-t"><thead><tr><th>Strait</th><th>Ships/day</th><th>2025 avg</th><th>vs 2025</th></tr></thead><tbody>${CS.map(c => `<tr><th><a href="/hormuz/">${esc(c.short)}</a></th><td class="t-hi">${f(c.avg7, 1)}</td><td>${f(c.base, 1)}</td><td>${pc(c.chg, 0)}%</td></tr>`).join('')}</tbody></table><p class="t-note">7-day average to ${CS[0].last}. IMF PortWatch.</p>` : '';
  // Calendar: next releases from the tape
  const cal = tape.indicators.filter(i => i.next?.date && !/^Next trading session$/i.test(i.next.what)).sort((a, b) => a.next.date.localeCompare(b.next.date)).map(i => `<li><b>${esc(short(i.next.date))}</b><span>${esc(i.next.what)}</span></li>`).join('');
  // Wire: latest articles
  const wire = articles.slice(0, 8).map(a => `<li><time>${esc(short(a.date.slice(0, 10)))}</time><a href="${esc(a.url)}">${esc(a.title)}</a></li>`).join('');

  return `<div class="term" id="term">
  <div class="t-bar"><span class="t-logo">KAKISTOCRAT<b>TERMINAL</b></span>
   <form class="t-cmd" id="t-cmd" autocomplete="off" role="search"><label for="t-q" class="sr">Chart a series</label><span class="t-pr">&gt;</span><input id="t-q" placeholder="Type a series and press Enter — e.g. brent, nifty bank, usdinr, india gdp, gold   ( / to focus )" spellcheck="false"><ul id="t-sug" role="listbox"></ul></form>
   <span class="t-clk"><span id="t-nse">NSE</span> <b id="t-time">--:--</b> IST</span></div>
  <div class="t-grid">
   <section class="t-p t-chart"><h2 class="t-h"><span id="t-ct">NIFTY 50</span><span class="t-rg" id="t-rg">${['3M', '6M', '1Y', '3Y', 'All'].map(r => `<button type="button" data-r="${r}"${r === '1Y' ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span></h2><div class="t-b"><div id="t-ec" style="height:320px"></div><p class="t-note" id="t-cs"></p></div></section>
   ${panel('t-idx', 'Indian equities', indices)}
   ${panel('t-mac', 'India macro', macro)}
   ${panel('t-rt', 'Rates', rates)}
   ${panel('t-fx', 'Currencies vs USD', fxP)}
   ${panel('t-cm', 'Commodities', comm, 'data-tall')}
   ${panel('t-mv', 'Nifty 50 movers', movers)}
   ${panel('t-cr', 'Crypto', crypto)}
   ${M.unusual?.length ? panel('t-un', 'Unusual moves', M.movesHTML(M.unusual.slice(0, 12), true) + '<p class="t-note">Latest change against each series’ own typical change (σ). Every daily and monthly series on the site is checked.</p>') : ''}
   ${choke ? panel('t-ch', 'Chokepoints', choke) : ''}
   ${panel('t-cal', 'Data calendar', `<ul class="t-cal">${cal}</ul>`)}
   ${panel('t-w', 'Kakistocrat wire', `<ul class="t-w">${wire}</ul>`)}
  </div>
  <p class="t-foot">Closing data, not live quotes, except crypto. NSE close ${short(M.lastDate)}. Built ${BUILT.toISOString().slice(0, 16).replace('T', ' ')} UTC. Click any row to chart it. Every number is in the <a href="/api/">data API</a>.</p>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/terminal.js?v=${Date.now()}" defer></script>`;
}
