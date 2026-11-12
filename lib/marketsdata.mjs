// Loads data/markets/*.json and derives everything the Markets and Commodities pages need.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const rd = async f => existsSync(`data/markets/${f}.json`) ? JSON.parse(await readFile(`data/markets/${f}.json`, 'utf8')) : null;

export async function loadMarkets() {
  const [idx, stocks, fred, fx, wb, crypto, meta, world, portwatch, imfWorld, rbiFx, rbiRates, trade] = await Promise.all(['nse_indices', 'nse_stocks', 'fred', 'fx', 'worldbank', 'crypto', 'meta', 'macro_world', 'portwatch', 'imf_world', 'rbi_fx', 'rbi_rates', 'trade'].map(rd));
  if (!idx) return null;
  const dates = Object.keys(idx).sort();
  const names = [...new Set(dates.flatMap(d => Object.keys(idx[d])))];
  const series = Object.fromEntries(names.map(n => [n, dates.map(d => idx[d][n]?.[0] ?? null)]));
  const pe = dates.map(d => idx[d]['Nifty 50']?.[2] ?? null), pb = dates.map(d => idx[d]['Nifty 50']?.[3] ?? null), dy = dates.map(d => idx[d]['Nifty 50']?.[4] ?? null);
  const last = dates.length - 1;
  const at = (arr, i) => { for (let k = i; k >= 0; k--) if (arr[k] != null) return arr[k]; return null; };
  const idxAt = date => { let i = dates.findIndex(d => d >= date); return i < 0 ? last : i; };
  const ret = (n, fromIdx) => { const a = series[n], v1 = at(a, last), v0 = at(a, fromIdx); return v1 != null && v0 ? (v1 / v0 - 1) * 100 : null; };
  const back = days => { const t = new Date(dates[last]); t.setDate(t.getDate() - days); return idxAt(t.toISOString().slice(0, 10)); };
  const ytd = idxAt(dates[last].slice(0, 4) + '-01-01') - 1;
  const perf = names.map(n => ({ n, last: at(series[n], last), d1: ret(n, last - 1), w1: ret(n, back(7)), m1: ret(n, back(30)), m3: ret(n, back(91)), ytd: ret(n, Math.max(0, ytd)), y1: ret(n, back(365)), y3: ret(n, 0) }));
  // percentile of current Nifty P/E within the history we hold
  const peVals = pe.filter(v => v != null).sort((a, b) => a - b), peNow = at(pe, last);
  const pePct = peVals.length ? Math.round(peVals.filter(v => v <= peNow).length / peVals.length * 100) : null;
  const mean = peVals.reduce((a, b) => a + b, 0) / peVals.length, sd = Math.sqrt(peVals.reduce((a, b) => a + (b - mean) ** 2, 0) / peVals.length);

  // FX: changes vs USD (positive = currency weakened against the dollar)
  let fxOut = null;
  if (fx) {
    const L = fx.dates.length - 1, fi = d => { let i = fx.dates.findIndex(x => x >= d); return i < 0 ? L : i; };
    const back2 = days => { const t = new Date(fx.dates[L]); t.setDate(t.getDate() - days); return fi(t.toISOString().slice(0, 10)); };
    const ytd2 = Math.max(0, fi(fx.dates[L].slice(0, 4) + '-01-01') - 1);
    const ch = (c, i) => { const a = fx.rates[c]; return a[L] && a[i] ? (a[L] / a[i] - 1) * 100 : null; };
    fxOut = { date: fx.dates[L], table: Object.keys(fx.rates).map(c => ({ c, last: fx.rates[c][L], d1: ch(c, L - 1), m1: ch(c, back2(30)), ytd: ch(c, ytd2), y1: ch(c, back2(365)) })) };
  }
  // World Bank commodity board
  let comm = null;
  if (wb) {
    const M = wb.months.length - 1;
    comm = { updated: wb.updated, month: wb.months[M], months: wb.months, items: Object.entries(wb.series).map(([id, s]) => {
      const v = s.v, cur = at(v, M), prev = at(v, M - 1), yago = at(v, M - 12);
      const last60 = v.slice(-60).filter(x => x != null), lo = Math.min(...last60), hi = Math.max(...last60);
      return { id, name: s.name, group: s.group, unit: s.unit, cur, mm: prev ? (cur / prev - 1) * 100 : null, yy: yago ? (cur / yago - 1) * 100 : null, lo, hi, pos: hi > lo ? (cur - lo) / (hi - lo) * 100 : 50, spark: v.slice(-24) };
    }) };
  }
  const fredLast = fred ? Object.fromEntries(Object.entries(fred).map(([k, s]) => { const p = s.pts; return [k, { label: s.label, last: p.at(-1), prev: p.at(-2), yago: p.find(x => x[0] >= shiftYear(p.at(-1)[0], -1)) }]; })) : null;
  for (const R of [rbiFx, rbiRates]) if (R?.weeks) { R.weeks = Object.fromEntries(Object.entries(R.weeks).sort((a, b) => a[0].localeCompare(b[0]))); delete R.seen; }
  return { trade, rbiFx, rbiRates, imfWorld, portwatch, world, meta, dates, names, series, pe, pb, dy, pePct, peMean: mean, peSd: sd, perf, stocks, fred, fredLast, fx, fxOut, wb, comm, crypto, lastDate: dates[last] };
}
function shiftYear(d, n) { const t = new Date(d); t.setFullYear(t.getFullYear() + n); return t.toISOString().slice(0, 10); }
