// Indicator pages: one page per economic question, holding every series that answers it, whatever the source.
// Statistics use actual observations only; projections are drawn dashed and reported separately.
import { esc } from './charts.mjs';

const f = (v, d = 2) => v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const dp = v => Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 100 ? 1 : 2;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const period = (iso, freq) => {
  if (freq === 'annual' || iso.length === 4) return iso.slice(0, 4);
  const [y, m, d] = iso.split('-');
  if (freq === 'monthly' || iso.length === 7) return `${MON[+m - 1]} ${y}`;
  return `${+d} ${MON[+m - 1]} ${y}`;
};
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const isRate = m => /%|per cent|pts|bp/i.test(m.unit || '');

// actual observations only (drops IMF projection years)
export function actuals(meta, sd) {
  const P = meta.projectionFrom; const d = [], v = [];
  sd.d.forEach((x, i) => { if (!(P && x.slice(0, 4) >= P) && sd.v[i] != null) { d.push(x); v.push(sd.v[i]); } });
  return { d, v };
}
// the observation closest to `months` before the last one (null if the gap is too large)
function back(d, months, freq) {
  const [y, m, day = '01'] = d.at(-1).split('-'); const t = new Date(Date.UTC(+y, +m - 1 - months, +day));
  const target = t.toISOString().slice(0, 10); let i = d.length - 1;
  while (i > 0 && d[i].padEnd(10, '-01').slice(0, 10) > target) i--;
  const gap = Math.abs(Date.parse(d[i].padEnd(10, '-01').slice(0, 10)) - Date.parse(target)) / 864e5;
  const tol = { daily: 7, weekly: 10, fortnightly: 20, monthly: 20, quarterly: 50, annual: 200 }[freq] ?? 30;
  return gap <= tol ? i : null;
}
export function readings(meta, sd) {
  const A = actuals(meta, sd), n = A.v.length; if (!n) return null;
  const last = A.v[n - 1], rate = isRate(meta), yr = 12;
  const ch = i => i == null ? null : rate ? last - A.v[i] : (last / A.v[i] - 1) * 100;
  const iY = back(A.d, yr, meta.freq), iP = n > 1 ? n - 2 : null;
  const since = months => { const [y, m] = A.d.at(-1).split('-'); const t = new Date(Date.UTC(+y, +m - 1 - months, 1)).toISOString().slice(0, 7); return A.d[0].slice(0, 7) <= t ? A.d.findIndex(x => x.slice(0, 7) >= t) : null; };
  const tenStart = since(120) ?? 0, win = A.v.slice(tenStart), sorted = [...win].sort((a, b) => a - b);
  const fiveStart = since(60), avg5 = fiveStart == null ? null : A.v.slice(fiveStart).reduce((s, x) => s + x, 0) / (n - fiveStart);
  const proj = meta.projectionFrom ? sd.d.map((x, i) => [x, sd.v[i]]).filter(([x]) => x.slice(0, 4) >= meta.projectionFrom) : [];
  return {
    last, at: A.d[n - 1], prev: iP == null ? null : A.v[iP], prevAt: iP == null ? null : A.d[iP], dPrev: ch(iP), yAgo: iY == null ? null : A.v[iY], dYear: ch(iY), avg5,
    lo: sorted[0], hi: sorted.at(-1), pct: Math.round(sorted.filter(x => x <= last).length / sorted.length * 100), winFrom: A.d[tenStart], first: A.d[0], n, rate, next: proj[0] || null,
  };
}
const chg = (c, rate) => c == null ? '—' : `${c > 0 ? '+' : c < 0 ? '−' : ''}${rate ? f(Math.abs(c), 2) + ' pts' : f(Math.abs(c), 1) + '%'}`;

// cfg: { path, kicker, title, dek, key:[ids], panels:[{title, ids, note, band, line, range, breaks}], extraTop, extraBottom, related, method }
export function indicatorPage(cfg, { SD: SD0, byId: B0 }) {
  // dollar series published in units are shown in US$ billions
  const SD = {}, byId = {}, scales = {};
  for (const id of Object.keys(B0)) { const m = B0[id], sd = SD0[id]; if (!sd) continue;
    const big = /US\$/.test(m.unit || '') && Math.max(...sd.v.map(Math.abs)) > 1e7;
    if (big) { scales[id] = 1e9; SD[id] = { d: sd.d, v: sd.v.map(x => x / 1e9) }; byId[id] = { ...m, unit: 'US$ bn' }; } else { SD[id] = sd; byId[id] = m; } }
  const have = id => SD[id] && byId[id];
  const ids = [...new Set([...(cfg.key || []), ...cfg.panels.flatMap(p => p.ids), ...(cfg.alsoTable || [])])].filter(have);
  const R = Object.fromEntries(ids.map(id => [id, readings(byId[id], SD[id])]));
  const unitOf = id => byId[id].unit;
  const keyCards = (cfg.key || []).filter(have).map(id => {
    const m = byId[id], r = R[id]; if (!r) return '';
    return `<a class="mk-card" href="#r-${id}"><span class="lbl">${esc(m.short || m.name)}</span><span class="v">${f(r.last, dp(r.last))}${/%/.test(m.unit) ? '%' : ''}</span>
      <span class="sub">${esc(period(r.at, m.freq))} · ${chg(r.dPrev, r.rate)} on ${esc(period(r.prevAt || r.at, m.freq))}</span>${r.next ? `<span class="sub">IMF projection ${esc(r.next[0].slice(0, 4))}: ${f(r.next[1], dp(r.next[1]))}</span>` : ''}</a>`;
  }).join('');
  const panels = cfg.panels.map((p, k) => {
    const pid = p.ids.filter(have); if (!pid.length) return '';
    return `<section class="xr-sec ip-panel" id="${esc(p.anchor || 'p' + k)}"><div class="mk-chart-head"><h2 class="col-title" style="margin:0">${esc(p.title)}</h2>
      <div class="mk-ctrl"><span class="seg ip-range">${['1Y', '3Y', '5Y', '10Y', 'All'].map(r => `<button type="button" data-r="${r}"${r === (p.range || 'All') ? ' aria-pressed="true"' : ''}>${r}</button>`).join('')}</span><button type="button" class="btn ghost ip-csv">CSV</button></div></div>
      <div class="ec ip-chart" data-noclick style="height:${p.height || 400}px" data-cfg='${esc(JSON.stringify({ ids: pid, scales: Object.fromEntries(pid.filter(id => scales[id]).map(id => [id, scales[id]])), units: Object.fromEntries(pid.map(id => [id, byId[id].unit])), band: p.band, line: p.line, lineLabel: p.lineLabel ?? (p.line === 0 ? '' : p.line == null ? null : 'Target ' + p.line), breaks: p.breaks, range: p.range || 'All', bar: p.bar, names: Object.fromEntries(pid.map(id => [id, byId[id].short || byId[id].name])) }))}'></div>
      ${p.note ? `<p class="meta">${p.note}</p>` : ''}</section>`;
  }).join('');
  const row = id => {
    const m = byId[id], r = R[id]; if (!r) return '';
    return `<tr id="r-${id}"><th><a href="#${esc((cfg.panels.find(p => p.ids.includes(id)) || {}).anchor || '')}">${esc(m.short || m.name)}</a><span>${esc(m.unit)} · ${esc(m.freq)}</span></th>
      <td><b>${f(r.last, dp(r.last))}</b><span>${esc(period(r.at, m.freq))}</span></td><td>${r.prev == null ? '—' : f(r.prev, dp(r.prev))}<span>${r.prevAt ? esc(period(r.prevAt, m.freq)) : ''}</span></td>
      <td>${r.yAgo == null ? '—' : f(r.yAgo, dp(r.yAgo))}<span>${chg(r.dYear, r.rate)}</span></td><td>${r.avg5 == null ? '—' : f(r.avg5, dp(r.avg5))}</td>
      <td>${f(r.lo, dp(r.lo))} – ${f(r.hi, dp(r.hi))}<span>since ${esc(period(r.winFrom, m.freq))}</span></td><td>${r.n >= 20 ? ord(Math.max(1, r.pct)) : '—'}</td>
      <td>${r.next ? `${f(r.next[1], dp(r.next[1]))}<span>IMF, ${esc(r.next[0].slice(0, 4))}</span>` : '—'}</td>
      <td class="src">${esc(m.source)}<span>${esc(period(r.first, m.freq))} to ${esc(period(r.at, m.freq))} · <a href="/api/series/${id}.json">JSON</a> · <a href="/charts/#s=${id}:lvl">Workbench</a></span></td></tr>`;
  };
  const table = ids.map(row).join('');
  if (cfg.bare) return `<div class="wrap">${panels}<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script><script src="/indicator.js?v=${Date.now()}" defer></script></div>`;
  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">${esc(cfg.kicker)}</span><h1>${esc(cfg.title)}</h1><p class="dek sm">${cfg.dek}</p></div></div>
    ${keyCards ? `<div class="mk-cards">${keyCards}</div>` : ''}</div></div>
  <div class="wrap">${cfg.extraTop || ''}${panels}
   <section class="xr-sec"><h2 class="col-title">Readings</h2><div class="ip-tw"><table class="ip-t"><thead><tr><th>Series</th><th>Latest</th><th>Previous</th><th>A year earlier</th><th>5-year average</th><th>Range, last 10 years</th><th>Percentile</th><th>Projection</th><th>Source and coverage</th></tr></thead><tbody>${table}</tbody></table></div>
    <p class="meta">Every figure in this table uses published observations only. IMF projections are shown in their own column and as dashed lines, never in the averages, ranges or percentiles. Percentile: where the latest reading sits among the last ten years of observations (shown when there are at least 20).</p></section>
   ${cfg.method ? `<section class="xr-sec ip-method"><h2 class="col-title">Definitions and breaks</h2>${cfg.method}</section>` : ''}
   ${cfg.extraBottom || ''}
   ${cfg.related ? `<section class="xr-sec"><h2 class="col-title">Related</h2><p class="chips">${cfg.related.map(([u, t]) => `<a class="chip" href="${esc(u)}">${esc(t)}</a>`).join('')}</p></section>` : ''}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script><script src="/indicator.js?v=${Date.now()}" defer></script>`;
}

// A dense heat table: rows are series, columns the last `k` observations, cells coloured by value
export function heatTable(rows, SD, { k = 13, freq = 'monthly' } = {}) {
  const ref = SD[rows[0]?.[0]]; if (!ref) return '';
  const cols = ref.d.filter((d, i) => ref.v[i] != null).slice(-k);
  const col = v => v == null ? '#f4f3ef' : v >= 0 ? `rgba(46,125,91,${Math.min(0.85, 0.12 + v / 14)})` : `rgba(179,38,30,${Math.min(0.85, 0.12 - v / 14)})`;
  return `<div class="ip-tw"><table class="ip-t ip-heat"><thead><tr><th>Year-on-year, %</th>${cols.map(c => `<th>${esc(period(c, freq))}</th>`).join('')}</tr></thead><tbody>${rows.filter(([id]) => SD[id]).map(([id, n]) => {
    const m = new Map(SD[id].d.map((d, i) => [d, SD[id].v[i]]));
    return `<tr><th>${esc(n)}</th>${cols.map(c => { const v = m.get(c); return `<td style="background:${col(v)};color:${v != null && Math.abs(v) > 9 ? '#fff' : 'inherit'}">${v == null ? '—' : f(v, 1)}</td>`; }).join('')}</tr>`; }).join('')}</tbody></table></div>`;
}

// The macro dashboard: one row per headline indicator, grouped, each linking to its concept page
export function dashboardPage(groups, { SD, byId }) {
  const rows = groups.map(([g, items]) => {
    const tr = items.filter(([id]) => SD[id] && byId[id]).map(([id, url, label]) => {
      const m = byId[id], r = readings(m, SD[id]); if (!r) return '';
      const A = actuals(m, SD[id]), sp = A.v.slice(-36), lo = Math.min(...sp), hi = Math.max(...sp), W = 120, H = 26;
      const path = sp.map((v, i) => `${i ? 'L' : 'M'}${(i / Math.max(1, sp.length - 1) * W).toFixed(1)},${(H - 2 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 4)).toFixed(1)}`).join('');
      return `<tr><th><a href="${esc(url)}">${esc(label || m.short || m.name)}</a><span>${esc(m.unit)} · ${esc(m.freq)} · ${esc((m.source || '').split(/[,(:]/)[0])}</span></th>
        <td><b>${f(r.last, dp(r.last))}</b><span>${esc(period(r.at, m.freq))}</span></td><td>${r.prev == null ? '—' : f(r.prev, dp(r.prev))}</td><td>${r.yAgo == null ? '—' : f(r.yAgo, dp(r.yAgo))}<span>${chg(r.dYear, r.rate)}</span></td>
        <td>${r.avg5 == null ? '—' : f(r.avg5, dp(r.avg5))}</td><td>${r.n >= 20 ? ord(Math.max(1, r.pct)) : '—'}</td><td>${r.next ? `${f(r.next[1], dp(r.next[1]))}<span>IMF ${esc(r.next[0].slice(0, 4))}</span>` : '—'}</td>
        <td><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${path}" fill="none" stroke="#b3261e" stroke-width="1.5"/></svg></td></tr>`;
    }).join('');
    return tr ? `<tr class="ip-g"><th colspan="8">${esc(g)}</th></tr>${tr}` : '';
  }).join('');
  return `<div class="ip-tw"><table class="ip-t ip-dash"><thead><tr><th>Indicator</th><th>Latest</th><th>Previous</th><th>A year earlier</th><th>5-year average</th><th>Percentile, 10 years</th><th>Projection</th><th>Last 36 readings</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
