import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';

// India Today: one screen of rule-based readings, each with its threshold stated, plus a monthly heatmap.
export function todayPage({ pageHead, tape, budget, MK, BUILT }) {
  const T = Object.fromEntries(tape.indicators.map(i => [i.id, i]));
  const W = MK.world, imf = (c, y) => W?.imf?.[c]?.data?.IND?.[y], wdi = c => { const d = W?.wdi?.[c]?.data?.IND || {}; const y = Object.keys(d).sort().at(-1); return y ? [y, d[y]] : [null, null]; };
  const yr = BUILT.getUTCFullYear(), L = MK.dates.length - 1;
  const nifty = MK.perf.find(p => p.n === 'Nifty 50'), inr = MK.fxOut.table.find(t => t.c === 'INR');
  const fd = budget.items.find(i => i.id === 'fd'), fdPct = fd.actual / fd.be * 100;
  const brent = MK.fredLast.DCOILBRENTEU, brentYoY = brent.yago ? (brent.last[1] / brent.yago[1] - 1) * 100 : null;
  const us10 = MK.fredLast.DGS10;
  const cpi = T.cpi.latest.value, repoD = T.repo.latest.value - T.repo.previous.value;
  const tone = { hot: ['#B42318', '#FBEDEB'], warm: ['#9A5B00', '#FFF4E0'], fine: ['#0F6B3A', '#E6F2EA'], cool: ['#1D4ED8', '#E8EEFB'], neutral: ['#3A3E44', '#F4F2ED'] };
  const tiles = [
    { k: 'Inflation', v: `${cpi.toFixed(2)}%`, s: cpi > 6 ? ['Above the band', 'hot'] : cpi > 4 ? ['Above target', 'warm'] : cpi >= 2 ? ['Within target', 'fine'] : ['Below the band', 'cool'], why: `CPI, ${T.cpi.latest.period}. RBI target 4%, tolerance band 2–6%.`, spark: T.cpi.history.map(h => h.v), href: '/data/cpi/' },
    { k: 'Policy rate', v: `${T.repo.latest.value.toFixed(2)}%`, s: repoD > 0 ? ['Tightening', 'hot'] : repoD < 0 ? ['Easing', 'cool'] : ['On hold', 'neutral'], why: `Repo rate, ${T.repo.latest.period.toLowerCase()}. Status follows the direction of the last change.`, spark: T.repo.history.map(h => h.v), href: '/data/repo/' },
    { k: 'Bond yields', v: `${T.g10.latest.value.toFixed(2)}%`, s: T.g10.latest.value > 7 ? ['Elevated', 'warm'] : ['Moderate', 'neutral'], why: `10-year government bond, ${T.g10.latest.period}. “Elevated” means above 7%.`, spark: T.g10.history.map(h => h.v), href: '/data/g10/' },
    { k: 'Rupee', v: `₹${inr.last.toFixed(2)}`, s: inr.y1 > 3 ? ['Weakening', 'warm'] : inr.y1 < -3 ? ['Strengthening', 'fine'] : ['Broadly stable', 'neutral'], why: `Per US dollar, ECB reference, ${MK.fxOut.date}. ${inr.y1 >= 0 ? 'Weaker' : 'Stronger'} by ${Math.abs(inr.y1).toFixed(1)}% over a year; ±3% is the threshold.`, spark: MK.fx.rates.INR.slice(-250), href: '/markets/' },
    { k: 'Equities', v: MK.series['Nifty 50'][L].toLocaleString('en-IN', { maximumFractionDigits: 0 }), s: MK.pePct > 80 ? [`P/E high for ${Math.round(MK.dates.length / 250)} years`, 'warm'] : MK.pePct < 20 ? [`P/E low for ${Math.round(MK.dates.length / 250)} years`, 'cool'] : ['P/E mid-range', 'neutral'], why: `Nifty 50, ${MK.lastDate}. ${nifty.ytd >= 0 ? 'Up' : 'Down'} ${Math.abs(nifty.ytd).toFixed(1)}% this year; P/E ${MK.pe.at(-1).toFixed(1)}, ${MK.pePct}th percentile of the last ${Math.round(MK.dates.length / 250)} years.`, spark: MK.series['Nifty 50'].slice(-250), href: '/markets/' },
    { k: 'Oil', v: `$${brent.last[1].toFixed(0)}`, s: brentYoY > 20 ? ['Much dearer than a year ago', 'hot'] : brentYoY > 0 ? ['Dearer than a year ago', 'warm'] : ['Cheaper than a year ago', 'fine'], why: `Brent spot, ${brent.last[0]} (EIA). ${brentYoY >= 0 ? '+' : ''}${brentYoY.toFixed(0)}% on a year earlier.`, spark: MK.fred.DCOILBRENTEU.pts.slice(-250).map(p => p[1]), href: '/commodities/' },
    { k: 'Union Budget', v: `${fdPct.toFixed(1)}%`, s: fdPct > fd.prevPct + 3 ? ['Deficit running ahead', 'warm'] : ['Deficit on pace', 'fine'], why: `Share of the full-year deficit used by ${budget.through}, against ${fd.prevPct}% a year earlier.`, spark: budget.fdPath.fy27, href: '/tools/budget-x-ray/' },
    { k: 'Growth', v: `${imf('NGDP_RPCH', String(yr))}%`, s: imf('NGDP_RPCH', String(yr)) >= 6.5 ? ['Strong', 'fine'] : imf('NGDP_RPCH', String(yr)) >= 5 ? ['Moderate', 'neutral'] : ['Weak', 'warm'], why: `IMF projection for ${yr}-${String(yr + 1).slice(2)}, World Economic Outlook. Last year: ${imf('NGDP_RPCH', String(yr - 1))}%.`, spark: [yr - 6, yr - 5, yr - 4, yr - 3, yr - 2, yr - 1, yr].map(y => imf('NGDP_RPCH', String(y))), href: `/charts/#s=imf-ngdp-rpch-ind:lvl&r=10Y` },
    { k: 'External balance', v: `${imf('BCA_NGDPD', String(yr))}%`, s: imf('BCA_NGDPD', String(yr)) < -2.5 ? ['Wide deficit', 'hot'] : imf('BCA_NGDPD', String(yr)) < -1 ? ['Moderate deficit', 'warm'] : ['Small deficit or surplus', 'fine'], why: `Current account, % of GDP, IMF projection for ${yr}-${String(yr + 1).slice(2)}. Reserves covered ${wdi('FI.RES.TOTL.MO')[1]?.toFixed(1)} months of imports in ${wdi('FI.RES.TOTL.MO')[0]} (World Bank).`, spark: [yr - 6, yr - 5, yr - 4, yr - 3, yr - 2, yr - 1, yr].map(y => imf('BCA_NGDPD', String(y))), href: '/charts/#s=imf-bca-ngdpd-ind:lvl&r=10Y' },
    { k: 'Global rates', v: `${us10.last[1].toFixed(2)}%`, s: us10.yago && us10.last[1] > us10.yago[1] + 0.25 ? ['Tighter than a year ago', 'warm'] : us10.yago && us10.last[1] < us10.yago[1] - 0.25 ? ['Easier than a year ago', 'cool'] : ['Little changed', 'neutral'], why: `US 10-year Treasury, ${us10.last[0]}. A year earlier: ${us10.yago?.[1].toFixed(2)}%.`, spark: MK.fred.DGS10.pts.slice(-250).map(p => p[1]), href: '/markets/' },
  ];
  const tile = t => { const [c, bg] = tone[t.s[1]]; return `<a class="td-tile" href="${t.href}" style="--tc:${c};--tb:${bg}"><span class="k">${esc(t.k)}</span><span class="v">${esc(t.v)}</span><span class="st">${esc(t.s[0])}</span>${sparkSVG(t.spark, 160, 34, c)}<span class="why">${esc(t.why)}</span></a>`; };

  // monthly heatmap: month-on-month % change, last 12 months, coloured by size relative to the series' own volatility
  const monthly = (dates, vals) => { const m = {}; dates.forEach((d, i) => { if (vals[i] != null) m[d.slice(0, 7)] = vals[i]; }); return m; };
  const rows = [
    ['Nifty 50', monthly(MK.dates, MK.series['Nifty 50'])], ['Nifty Bank', monthly(MK.dates, MK.series['Nifty Bank'])], ['Nifty Midcap 100', monthly(MK.dates, MK.series['NIFTY Midcap 100'])],
    ['Rupee per dollar', monthly(MK.fx.dates, MK.fx.rates.INR)], ['US 10-year yield', monthly(MK.fred.DGS10.pts.map(p => p[0]), MK.fred.DGS10.pts.map(p => p[1]))],
    ...['brent', 'ngeu', 'gold', 'copper', 'urea', 'dap', 'wheat', 'rice', 'palm', 'sugar'].map(id => [MK.wb.series[id].name, Object.fromEntries(MK.wb.months.map((m, i) => [m, MK.wb.series[id].v[i]]))])];
  const months = [...new Set(MK.wb.months.slice(-13))].slice(-13);
  const allM = [...new Set(rows.flatMap(r => Object.keys(r[1])))].sort();
  const lastM = allM.filter(m => m <= MK.lastDate.slice(0, 7)).slice(-13);
  const cell = (series, m, i, arr) => { if (i === 0) return null; const a = series[arr[i - 1]], b = series[m]; return a && b ? (b / a - 1) * 100 : null; };
  const heatRows = rows.map(([name, s]) => { const ch = lastM.map((m, i) => cell(s, m, i, lastM)).slice(1); const sd = Math.sqrt(ch.filter(x => x != null).reduce((a, x) => a + x * x, 0) / Math.max(1, ch.filter(x => x != null).length)) || 1;
    return `<tr><th scope="row">${esc(name)}</th>${ch.map(v => { if (v == null) return '<td class="na">·</td>'; const z = Math.max(-2, Math.min(2, v / sd)) / 2; const col = z >= 0 ? `rgba(15,107,58,${Math.abs(z) * 0.75 + 0.05})` : `rgba(180,35,24,${Math.abs(z) * 0.75 + 0.05})`; return `<td style="background:${col};color:${Math.abs(z) > 0.6 ? '#fff' : 'inherit'}">${v > 0 ? '+' : ''}${v.toFixed(1)}</td>`; }).join('')}</tr>`; }).join('');
  const mLabel = m => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });

  return `<div class="mk-top"><div class="wrap"><div class="mk-head"><div><span class="kicker">India Today</span><h1>The Indian economy on one screen</h1><p class="dek sm">Ten readings, each with the rule that sets its label. Click any tile for the data behind it. Updated with every build; market figures are end of day.</p></div><div class="mk-clock" id="mk-clock"><span class="dot"></span><b id="mk-status">NSE</b><span id="mk-time"></span></div></div>
  <div class="td-grid">${tiles.map(tile).join('')}</div></div></div>
  <div class="wrap">
  <section class="xr-sec"><h2 class="col-title">Month by month: markets and the prices India pays</h2>
   <div class="tbl-wrap"><table class="td-heat"><thead><tr><th></th>${lastM.slice(1).map((m, i, a) => `<th>${mLabel(m)}${i === a.length - 1 && m === MK.lastDate.slice(0, 7) ? '<br><small>to date</small>' : ''}</th>`).join('')}</tr></thead><tbody>${heatRows}</tbody></table></div>
   <p class="meta">Month-on-month change, %. Market rows use month-end values; commodity rows are World Bank monthly averages. Colour depth is scaled to each row's own typical monthly move, so a deep cell is unusual for that series. For the rupee and yields, green means the number rose.</p></section>
  <section class="xr-sec"><h2 class="col-title">Notes</h2><ul class="src"><li>Labels are mechanical: each tile's caption states its threshold. They describe the data, not a forecast.</li><li>IMF figures for India are on a fiscal-year basis (April–March) and are projections for ${yr}-${String(yr + 1).slice(2)} onward.</li><li>Sources: MoSPI, RBI, NSE, ECB via Frankfurter, EIA and US Treasury via FRED, World Bank, IMF, Controller General of Accounts. Each tile links to its data page.</li></ul></section>
  </div>
  <script src="/markets.js?v=${Date.now()}" defer></script>`;
}
