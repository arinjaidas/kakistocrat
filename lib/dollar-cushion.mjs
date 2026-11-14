// India's Dollar Cushion: RBI dated, sign-preserving BoP accounting.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>(x<0?'−':'')+'$'+Math.abs(x).toFixed(1)+'bn';
const labels=[['merchandise','Merchandise goods, net'],['services','Services, net'],['transfers','Current transfers, net'],['income','Primary income, net'],['current','Current-account balance'],['capital','RBI capital account (B)'],['overall','Overall balance'],['monetary','Monetary movements (RBI sign)']];
export function dollarCushionCsv(d){
 const fields=['period','stage',...labels.map(x=>x[0]),'source_release_date','source_url'];
 const csv=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
 return [fields,...d.rows.map(r=>[r.period,r.stage,...labels.map(([k])=>r[k]),d.source_release_date,d.source_url])].map(r=>r.map(csv).join(',')).join('\n')+'\n';
}
export function dollarCushionPage({data,pageHead}){
 const sep=data.rows.find(x=>x.id==='sep2026'),half=data.rows.find(x=>x.id==='aprsep2026');
 const waterfall=(r)=>'<div class="dc-breakdown">'+[['Goods',r.merchandise],['Services',r.services],['Transfers',r.transfers],['Primary income',r.income]].map(([n,v])=>
 '<div class="dc-component"><span>'+esc(n)+'</span><strong class="'+(v<0?'dc-negative':'dc-positive')+'">'+money(v)+'</strong></div>').join('')+
 '<div class="dc-component dc-current"><span>Published current-account balance</span><strong>'+money(r.current)+'</strong></div></div>';
 const rows=data.rows.map(r=>'<tr><th scope="row">'+esc(r.period)+' <small>'+esc(r.stage)+'</small></th>'+labels.map(([k])=>'<td>'+money(r[k])+'</td>').join('')+'</tr>').join('');
 const options=data.rows.filter(r=>r.id==='sep2026'||r.id==='aprsep2026').map(r=>'<option value="'+esc(r.id)+'">'+esc(r.period)+'</option>').join('');
 const body=JSON.stringify(data).replace(/</g,'\\u003c');
 return pageHead('Research Notebook','India’s dollar cushion','A dated RBI balance-of-payments accounting bridge: goods deficits against services and transfers, then financing, preserving preliminary data vintages and source definitions.')+
 '<div class="wrap dc-wrap"><div class="dc-meta">RBI release '+esc(data.source_release_date)+' · '+esc(data.units)+' · September and six-month periods are distinct</div>'+
 '<div class="dc-kpis"><div><span>September 2026 goods balance</span><strong>'+money(sep.merchandise)+'</strong></div><div><span>September 2026 net services</span><strong>'+money(sep.services)+'</strong></div><div><span>September 2026 current account</span><strong>'+money(sep.current)+'</strong></div></div>'+
 '<section class="dc-section"><h2>September 2026: what offset the goods deficit?</h2>'+waterfall(sep)+
 '<p>Services and current transfers offset much, but not all, of the merchandise deficit; negative primary investment income widened the remaining gap. Component totals can differ slightly from the published current-account figure because the RBI rounds each to US$0.1bn. The current account is not the same as the monthly merchandise trade balance.</p></section>'+
 '<section class="dc-section"><h2>April–September: a different denominator</h2>'+waterfall(half)+
 '<p>The six-month net goods, services and transfers figures describe a broader period than September alone. Do not add these two displays or treat their magnitudes as comparable per-month observations.</p></section>'+
 '<section class="dc-scenario" id="dc-scenario"><h2>Shock the balance-of-payments ledger</h2><p>Select a single observation period, then change its net components by stated US$ billions. These are <strong>hypothetical shocks</strong> layered on the published baseline, not forecasts. A +1 adjustment to goods means the goods balance becomes $1bn less negative. All changes are independent inputs.</p>'+
 '<label>Observation period<select id="dc-period">'+options+'</select></label><div class="dc-controls">'+
 [['goods','Change in merchandise balance (US$bn)'],['services','Change in net services (US$bn)'],['transfers','Change in net transfers (US$bn)'],['income','Change in primary income balance (US$bn)'],['capital','Change in net capital/financial inflow aggregate (US$bn)']].map(([id,label])=>
 '<label>'+esc(label)+'<input type="number" id="dc-'+id+'" min="-500" max="500" step=".5" value="0"></label>').join('')+'</div>'+
 '<div class="dc-scenario-output"><div><span>New current-account balance</span><strong id="dc-ca">−$7.4bn</strong></div><div><span>Assumed RBI capital-account aggregate</span><strong id="dc-cap">+$16.2bn</strong></div><div><span>Overall balance (CA + B)</span><strong id="dc-overall">+$8.8bn</strong></div><div><span>Balancing monetary transaction sign</span><strong id="dc-monetary">−$8.8bn</strong></div></div>'+
 '<p id="dc-message" role="status" aria-live="polite"></p><button type="button" id="dc-reset">Reset shocks</button></section>'+
 '<section class="dc-section"><h2>Published RBI figures, by period and vintage</h2><div class="dc-scroll"><table><thead><tr><th>Period</th>'+labels.map(([,label])=>'<th>'+esc(label)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
 '<p class="dc-note">P = preliminary; PR = partially revised. The RBI includes errors and omissions within “Other Capital” in the published monthly layout. The monetary-movements sign is negative for an increase in reserves, positive for a decrease, based on recorded flows. It is not a spot FX reserve valuation series.</p></section>'+
 '<section class="dc-section"><h2>Research standards and interpretation</h2><ul>'+data.caveats.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
 '<p>The accounting bridge is CA = net goods + net services + net transfers + net income; overall BoP balance in this RBI presentation = CA + B. We use the <em>published current-account total</em> as the scenario baseline because individually rounded components may not sum exactly.</p>'+
 '<div class="dc-links"><a href="/api/research/dollar-cushion.json">Download source data JSON</a><a href="/research/dollar-cushion/data.csv">Download CSV</a><a href="/series/indias-dollar-cushion/">Reading path</a><a href="/external/">External sector dashboard</a><a href="'+esc(data.source_url)+'">Original RBI release</a></div></section></div>'+
 '<script type="application/json" id="dc-data">'+body+'</script><link rel="stylesheet" href="/dollar-cushion.css"><script src="/dollar-cushion.js" defer></script>';
}
