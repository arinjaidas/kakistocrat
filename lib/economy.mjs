// Real-economy tracker: industry (IIP), money and credit (RBI fortnightly), and monthly trade. Every series here has its own page.
import { esc } from './charts.mjs';
import { sparkSVG } from './markets.mjs';

export const IIP_ORDER = ['General', 'Mining', 'Manufacturing', 'Electricity', 'Primary Goods', 'Capital Goods', 'Intermediate Goods', 'Infrastructure/construction Goods', 'Consumer Durables', 'Consumer Non-durables'];
export const iipId = n => 'iip-' + n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-goods$/, '').replace(/-$/, '');

export function economyPage(SD, byId, { pageHead, tape }) {
  const last = id => { const s = SD[id]; if (!s) return null; for (let i = s.v.length - 1; i >= 0; i--) if (s.v[i] != null) return { d: s.d[i], v: s.v[i], prev: s.v.slice(0, i).filter(x => x != null).at(-1), spark: s.v.slice(Math.max(0, i - 35), i + 1) }; return null; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const per = (d, f) => f === 'monthly' ? `${MON[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : `${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
  const card = (id, label, sub) => { const x = last(id), c = byId[id]; if (!x) return ''; const ch = x.prev == null ? null : x.v - x.prev;
    return `<a class="mk-card" href="/s/${id}/"><span class="lbl">${esc(label)}</span><span class="v">${x.v.toFixed(1)}%</span><span class="c">${esc(per(x.d, c.freq))}${ch != null ? ` · ${ch >= 0 ? '+' : '−'}${Math.abs(ch).toFixed(1)} pts` : ''}</span>${sparkSVG(x.spark, 140, 28, '#15171A')}<span class="sub">${esc(sub)}</span></a>`; };
  const cpi = tape?.indicators?.find(i => i.id === 'cpi');
  const iipRows = IIP_ORDER.map(n => [iipId(n), n.replace('Infrastructure/construction Goods', 'Infrastructure & construction').replace(' Goods', ' goods')]).filter(([id]) => SD[id]);
  // heatmap: the last 24 months of year-on-year growth for each IIP group
  const gen = SD['iip-general'], months = gen ? gen.d.filter((d, i) => gen.v[i] != null).slice(-24) : [];
  const heat = iipRows.map(([id, n]) => ({ id, n, v: months.map(m => { const s = SD[id], i = s.d.indexOf(m); return i >= 0 ? s.v[i] : null; }) }));
  const payload = {
    months: months.map(m => per(m, 'monthly')), heat,
    iip: ['iip-general', 'iip-manufacturing', 'iip-mining', 'iip-electricity'].filter(id => SD[id]).map(id => ({ id, n: byId[id].name.replace(/^IIP: /, '').replace(/, growth.*$/, ''), d: SD[id].d, v: SD[id].v })),
    money: ['rbi-credit-yoy', 'rbi-deposits-yoy', 'rbi-m3-yoy', 'rbi-cic-yoy'].filter(id => SD[id]).map(id => ({ id, n: byId[id].name.replace(/, year on year.*$/, ''), d: SD[id].d, v: SD[id].v })),
    trade: SD['in-exports'] && SD['in-imports'] ? { d: SD['in-exports'].d, x: SD['in-exports'].v, m: SD['in-imports'].v } : null,
  };
  return pageHead('Real economy', 'The real-economy tracker', 'Factories, banks and trade, month by month: industrial production from MoSPI, bank credit, deposits and money supply from the RBI’s fortnightly returns, and monthly merchandise trade. Every number links to its own series page with the full history.') + `<div class="wrap">
  <div class="mk-cards ec-cards">
   ${card('iip-general', 'Industrial production', 'IIP, year on year')}${card('iip-manufacturing', 'Manufacturing output', 'IIP manufacturing, year on year')}
   ${card('rbi-credit-yoy', 'Bank credit', 'scheduled banks, year on year')}${card('rbi-deposits-yoy', 'Bank deposits', 'scheduled banks, year on year')}
   ${card('rbi-m3-yoy', 'Money supply (M3)', 'year on year')}${card('rbi-cic-yoy', 'Currency with the public', 'year on year')}
   ${cpi ? `<a class="mk-card" href="/s/india-cpi/"><span class="lbl">CPI inflation</span><span class="v">${cpi.latest.value}%</span><span class="c">${esc(cpi.latest.period)}</span><span class="sub">for comparison</span></a>` : ''}
  </div>
  ${heat.length ? `<section class="xr-sec"><h2 class="col-title">Industry: which parts are growing</h2><div id="ec-heat" class="ec" style="height:${80 + heat.length * 34}px"></div><p class="meta">Year-on-year growth of each part of the Index of Industrial Production, last 24 months. Green is growth, red is contraction. Click a row for its page. Source: MoSPI.</p></section>` : ''}
  ${payload.iip.length ? `<section class="xr-sec"><h2 class="col-title">Industrial production since ${payload.iip[0].d.find((d, i) => payload.iip[0].v[i] != null)?.slice(0, 4)}</h2><div id="ec-iip" class="ec" style="height:340px"></div></section>` : ''}
  ${payload.money.length ? `<section class="xr-sec"><h2 class="col-title">Money and credit</h2><div id="ec-money" class="ec" style="height:340px"></div><p class="meta">Year-on-year growth, fortnightly, from the RBI Weekly Statistical Supplement (Tables 3 and 7). Growth since mid-2026 includes the FCNR(B) deposits raised under the swap window; see the <a href="/external/">external sector lab</a>.</p></section>` : ''}
  ${payload.trade ? `<section class="xr-sec"><h2 class="col-title">Merchandise trade, monthly</h2><div id="ec-trade" class="ec" style="height:320px"></div><p class="meta">Seasonally adjusted, US$ billion (OECD Main Economic Indicators via FRED). By partner and product: <a href="/trade/">India’s trade</a>.</p></section>` : ''}
  <section class="xr-sec"><h2 class="col-title">All the series</h2><div class="chips">${[...iipRows.map(([id, n]) => [id, 'IIP: ' + n]), ...payload.money.map(m => [m.id, m.n]), ['rbi-credit', 'Bank credit, ₹ lakh crore'], ['rbi-deposits', 'Bank deposits, ₹ lakh crore'], ['in-exports', 'Exports, monthly'], ['in-imports', 'Imports, monthly']].filter(([id]) => SD[id]).map(([id, n]) => `<a class="chip" href="/s/${id}/">${esc(n)}</a>`).join('')}</div>
   <p class="meta">Data: <a href="/api/markets/iip.json">/api/markets/iip.json</a>, <a href="/api/markets/rbi_money.json">/api/markets/rbi_money.json</a>, <a href="/api/markets/india_monthly.json">/api/markets/india_monthly.json</a>.</p></section>
  </div>
  <script>window.__EC=${JSON.stringify(payload)};</script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/economy.js?v=${Date.now()}" defer></script>`;
}
