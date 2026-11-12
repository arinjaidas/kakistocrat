// The Daily Desk: one dated page per trading day, written from the numbers. Every sentence is generated from
// the data on the page; nothing is opinion. Snapshots are saved to data/desk/<date>.json so past days stay readable.
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';

const LINES = [
  ['nse-nifty-50', 'Nifty 50', 'India'], ['nse-nifty-bank', 'Bank Nifty', 'India'], ['nse-nifty-midcap-100', 'Nifty Midcap 100', 'India'], ['nse-india-vix', 'India VIX', 'India'],
  ['nifty50-pe', 'Nifty 50 P/E', 'India'], ['fx-usdinr', 'Rupee per dollar', 'Money'], ['fred-dcoilbrenteu', 'Brent crude', 'World'],
  ['fred-dgs10', 'US 10-year Treasury', 'World'], ['fred-dtwexbgs', 'Broad dollar index', 'World'], ['fx-usdcny', 'Yuan per dollar', 'World'], ['crypto-bitcoin', 'Bitcoin', 'World'],
  ['pw-strait-of-hormuz', 'Ships through Hormuz', 'World'], ['rbi-fx-total', 'India’s FX reserves', 'Money'], ['rbi-call', 'Call money rate', 'Money'], ['rbi-fwd3m', '3-month forward premium', 'Money'],
];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${MON[+m - 1]} ${y}`; };
const wd = d => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(d + 'T00:00:00Z').getUTCDay()];
const isRate = c => /%/.test(c.unit || '') || c.rate;
const fmt = (v, c) => v == null ? '—' : c.unit === 'US$ million' ? `$${(v / 1000).toFixed(1)}bn` : Math.abs(v) >= 1000 ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : v.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: /%|\$/.test(c.unit) ? 2 : 0 }) + (/%/.test(c.unit) ? '%' : '');

export function deskSnapshot({ SD, byId, unusual, tape, articles, events, date, prevDate }) {
  const at = (id, back) => { const s = SD[id]; if (!s) return null; let i = s.d.length - 1; while (i >= 0 && s.d[i] > date) i--; const j = i - back; return j >= 0 && i >= 0 ? s.v[j] : null; };
  const lastDate = id => { const s = SD[id]; if (!s) return null; let i = s.d.length - 1; while (i >= 0 && s.d[i] > date) i--; return s.d[i]; };
  const ytd = id => { const s = SD[id]; if (!s) return null; const y0 = s.d.findLastIndex(d => d < date.slice(0, 4) + '-01-01'); return y0 >= 0 ? s.v[y0] : null; };
  const lines = LINES.filter(([id]) => byId[id] && SD[id]).map(([id, label, sec]) => {
    const c = byId[id], wk = c.freq === 'weekly' ? 1 : 5, mo = c.freq === 'weekly' ? 4 : 21, last = at(id, 0), rate = isRate(c);
    const ch = (b) => b == null || last == null ? null : rate ? +(last - b).toFixed(3) : +((last / b - 1) * 100).toFixed(2);
    const s = SD[id]; let i = s.d.length - 1; while (i >= 0 && s.d[i] > date) i--;
    return { id, label, sec, unit: c.unit, freq: c.freq, rate, date: lastDate(id), last, d1: ch(at(id, 1)), w1: ch(at(id, wk)), m1: ch(at(id, mo)), ytd: ch(ytd(id)), spark: s.v.slice(Math.max(0, i - 65), i + 1) };
  });
  const fresh = tape?.indicators?.filter(t => t.latest?.released && t.latest.released > (prevDate || '0') && t.latest.released <= date) || [];
  const releases = fresh.map(t => ({ id: t.id, label: t.label, period: t.latest.period, value: t.latest.value, prev: t.previous?.value, unit: t.unit, released: t.latest.released, context: t.context || '' }));
  const ahead = (tape?.indicators || []).filter(t => t.next?.date && t.next.date > date && !/trading session/i.test(t.next.what)).map(t => ({ date: t.next.date, what: t.next.what })).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const arts = articles.filter(a => a.date.slice(0, 10) <= date && a.date.slice(0, 10) > (prevDate || date)).slice(0, 8).map(a => ({ title: a.title, url: a.url, date: a.date.slice(0, 10) }));
  const ev = (events || []).filter(e => e.date > (prevDate || date) && e.date <= date).map(e => ({ date: e.date, label: e.label }));
  const moves = (unusual || []).filter(u => u.date > (prevDate || '0') || u.date === date).slice(0, 6);
  return { date, prevDate, lines, releases, ahead, articles: arts, events: ev, moves };
}

const pct = (v, rate) => v == null ? '—' : rate ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v * 100))}bp` : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0)}%`;
const cls = v => v > 0 ? 'up' : v < 0 ? 'dn' : '';

// Plain sentences from the numbers. No adjectives that the numbers don't support.
function sentences(S) {
  const L = Object.fromEntries(S.lines.map(l => [l.id, l])), out = [];
  const dir = (v, up = 'rose', dn = 'fell') => v > 0 ? up : v < 0 ? dn : 'was unchanged';
  const n = L['nse-nifty-50'];
  if (n?.d1 != null) out.push(`The Nifty 50 ${dir(n.d1)}${n.d1 ? ` ${Math.abs(n.d1).toFixed(2)}%` : ''} to ${fmt(n.last, { unit: '' })}${n.w1 != null ? `, ${n.w1 >= 0 ? 'up' : 'down'} ${Math.abs(n.w1).toFixed(1)}% on the week` : ''}${n.ytd != null ? ` and ${n.ytd >= 0 ? 'up' : 'down'} ${Math.abs(n.ytd).toFixed(1)}% this year` : ''}.`);
  const b = L['nse-nifty-bank'], m = L['nse-nifty-midcap-100'];
  if (b?.d1 != null && m?.d1 != null) out.push(`Bank Nifty ${dir(b.d1, 'gained', 'lost')} ${Math.abs(b.d1).toFixed(2)}% and the Midcap 100 ${dir(m.d1, 'gained', 'lost')} ${Math.abs(m.d1).toFixed(2)}%.`);
  const r = L['fx-usdinr'];
  if (r?.last) out.push(`The rupee ended at ${r.last.toFixed(2)} to the dollar${r.d1 ? `, ${r.d1 > 0 ? 'weaker' : 'stronger'} by ${Math.abs(r.d1).toFixed(2)}% on the day` : ''}${r.ytd != null ? `; it is ${r.ytd > 0 ? 'down' : 'up'} ${Math.abs(r.ytd).toFixed(1)}% against the dollar this year` : ''}.`);
  const br = L['fred-dcoilbrenteu'];
  if (br?.last) out.push(`Brent was $${br.last.toFixed(2)} a barrel on ${longDate(br.date)}${br.w1 != null ? `, ${pct(br.w1)} on the week` : ''}.`);
  const v = L['nse-india-vix'];
  if (v?.last && v.d1 != null && Math.abs(v.d1) >= 5) out.push(`India VIX, the market’s gauge of expected volatility, ${dir(v.d1)} ${Math.abs(v.d1).toFixed(0)}% to ${v.last.toFixed(2)}.`);
  const fx = L['rbi-fx-total'];
  if (fx?.last && fx.d1 != null) out.push(`The RBI’s latest weekly figure put reserves at $${(fx.last / 1000).toFixed(1)}bn in the week to ${longDate(fx.date)}, ${fx.d1 >= 0 ? 'up' : 'down'} $${Math.abs(fx.last * fx.d1 / 100 / 1000 / (1 + fx.d1 / 100)).toFixed(1)}bn on the week.`);
  return out;
}

export function deskPage(S, { pageHead, archive, catalogUrl = id => `/s/${id}/`, movesHTML }) {
  const i = archive.indexOf(S.date), prev = archive[i + 1], next = archive[i - 1];
  const sec = s => S.lines.filter(l => l.sec === s);
  const row = l => `<tr><th scope="row"><a href="${catalogUrl(l.id)}">${esc(l.label)}</a>${l.date && l.date < S.date ? `<small> ${esc(longDate(l.date).replace(/ \d{4}$/, ''))}</small>` : ''}</th><td class="num">${fmt(l.last, l)}</td><td class="num ${cls(l.d1)}">${pct(l.d1, l.rate)}</td><td class="num ${cls(l.w1)}">${pct(l.w1, l.rate)}</td><td class="num ${cls(l.m1)}">${pct(l.m1, l.rate)}</td><td class="num ${cls(l.ytd)}">${pct(l.ytd, l.rate)}</td><td>${sparkSVG(l.spark, 110, 24, '#15171A')}</td></tr>`;
  const table = s => sec(s).length ? `<h3 class="sub-h">${s}</h3><div class="tbl-wrap"><table class="xr-table dk-t"><thead><tr><th></th><th class="num">Last</th><th class="num">Day</th><th class="num">Week</th><th class="num">Month</th><th class="num">This year</th><th>3 months</th></tr></thead><tbody>${sec(s).map(row).join('')}</tbody></table></div>` : '';
  const said = sentences(S);
  return pageHead('The Daily Desk', `${wd(S.date)}, ${longDate(S.date)}`, `What moved in India’s markets and economy, written from the day’s numbers. Every figure links to its series page.`) + `<div class="wrap dk">
  <nav class="dk-nav">${prev ? `<a href="/desk/${prev}/">← ${esc(longDate(prev))}</a>` : '<span></span>'}<a href="/desk/archive/">All days</a>${next ? `<a href="/desk/${next}/">${esc(longDate(next))} →</a>` : '<span></span>'}</nav>
  <div class="dk-grid"><div>
   <section class="xr-sec"><h2 class="col-title">The day in numbers</h2><div class="dk-lede">${said.map(t => `<p>${esc(t)}</p>`).join('')}</div></section>
   ${S.releases.length ? `<section class="xr-sec"><h2 class="col-title">Released</h2>${S.releases.map(r => `<div class="dk-rel"><b>${esc(r.label)}, ${esc(r.period)}</b><span class="dk-big">${r.value}${esc(r.unit)}</span>${r.prev != null ? `<span class="t-mu">from ${r.prev}${esc(r.unit)}</span>` : ''}<p>${esc(r.context)}</p></div>`).join('')}</section>` : ''}
   <section class="xr-sec"><h2 class="col-title">Markets</h2>${table('India')}${table('Money')}${table('World')}<p class="meta">Closing levels. Rates and yields change in basis points; everything else in per cent. A date next to a name means that series last updated on that day.</p></section>
  </div><aside>
   ${S.moves.length && movesHTML ? `<section class="xr-sec"><h2 class="col-title">Out of the ordinary</h2>${movesHTML(S.moves)}<p class="meta">Latest change against each series’ usual change.</p></section>` : ''}
   ${S.events.length ? `<section class="xr-sec"><h2 class="col-title">On the record</h2><ul class="dk-list">${S.events.map(e => `<li><time>${esc(longDate(e.date))}</time>${esc(e.label)}</li>`).join('')}</ul></section>` : ''}
   ${S.ahead.length ? `<section class="xr-sec"><h2 class="col-title">Coming up</h2><ul class="dk-list">${S.ahead.map(e => `<li><time>${esc(longDate(e.date))}</time>${esc(e.what)}</li>`).join('')}</ul></section>` : ''}
   ${S.articles.length ? `<section class="xr-sec"><h2 class="col-title">New on the site</h2><ul class="dk-list">${S.articles.map(a => `<li><time>${esc(longDate(a.date))}</time><a href="${esc(a.url)}">${esc(a.title)}</a></li>`).join('')}</ul></section>` : ''}
   <section class="xr-sec"><h2 class="col-title">Go deeper</h2><ul class="dk-list"><li><a href="/terminal/">Terminal</a> — every market on one screen</li><li><a href="/today/">India Today</a> — the macro picture</li><li><a href="/charts/">Chart workbench</a> — plot anything against anything</li><li><a href="/img/desk/${S.date}.png">Share image for this day</a></li><li><a href="/api/desk.json">This page as data</a></li></ul></section>
  </aside></div></div>`;
}

export function deskArchive(snaps, { pageHead }) {
  const byMonth = {}; for (const s of snaps) (byMonth[s.date.slice(0, 7)] ||= []).push(s);
  return pageHead('The Daily Desk', 'Every day on the desk', 'One page per trading day, with the Nifty’s move for a quick scan.') + `<div class="wrap">${Object.entries(byMonth).map(([m, ss]) => `<section class="xr-sec"><h2 class="col-title">${MON[+m.slice(5) - 1]} ${m.slice(0, 4)}</h2><ul class="dk-arch">${ss.map(s => { const n = s.lines.find(l => l.id === 'nse-nifty-50'); return `<li><a href="/desk/${s.date}/">${esc(wd(s.date).slice(0, 3))} ${+s.date.slice(8)}</a><span class="${cls(n?.d1)}">${n ? pct(n.d1) : ''}</span></li>`; }).join('')}</ul></section>`).join('')}</div>`;
}
