// Thali ingredient accounting. Agmarknet market-modal mean benchmark is wholesale, never retail CPI.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function thaliData(mandi){
 const date=Object.keys(mandi.days).sort().at(-1),values=mandi.days[date];
 const selection=[['rice','Rice',0.1],['red gram split/arhar dal/tur dal','Arhar dal',0.04],['potato','Potato',0.07],['onion','Onion',0.03],['tomato','Tomato',0.07]];
 const rows=selection.map(([key,name,quantity_kg])=>{
  const r=values[key];if(!r || !Number.isFinite(r.price))throw Error('Agmarknet snapshot missing required commodity '+key);
  return {key,name,quantity_kg,markets:r.markets,wholesale_rupees_per_quintal:r.price,wholesale_rupees_per_kg:r.price/100};
 });
 return {date,source:mandi.source,source_url:'https://agmarknet.gov.in/',rows,description:'A market modal-price snapshot, with simple cross-market averaging as supplied in the source dataset; values are not retail transaction prices or nationally representative unit costs.',limitations:['Averaging modal prices across markets does not weight transactions, traded quantity, quality, geography or grade.','Mandi prices are wholesale benchmarks. Retail margin, transport, tax where applicable, wastage, fuel and labour are distinct.','The selected quantities are illustrative ingredients only and are not a nutritionally complete or representative Indian thali.','One observation day cannot establish a change over time or an effect of the monsoon or inflation.']};
}
export function thaliCsv(d){
 const rows=[['commodity','markets','snapshot_date','wholesale_modal_rupees_per_quintal','wholesale_rupees_per_kg','illustrative_kg_per_meal','source'],...d.rows.map(r=>[r.name,r.markets,d.date,r.wholesale_rupees_per_quintal,r.wholesale_rupees_per_kg,r.quantity_kg,d.source])];
 const cell=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
 return rows.map(r=>r.map(cell).join(',')).join('\n')+'\n';
}
export function thaliPage({data,pageHead}){
 const rows=data.rows.map((r,i)=>'<tr><th scope="row">'+esc(r.name)+'</th><td>'+r.markets+'</td><td>₹'+r.wholesale_rupees_per_quintal.toLocaleString('en-IN')+'/quintal</td><td>₹'+r.wholesale_rupees_per_kg.toFixed(2)+'/kg</td><td><label><span class="sr-only">Amount of '+esc(r.name)+' per meal, kilograms</span><input type="number" id="th-quantity-'+i+'" min="0" max="5" step=".005" value="'+r.quantity_kg+'"></label></td><td id="th-cost-'+i+'">—</td></tr>').join('');
 const payload=JSON.stringify(data).replace(/</g,'\\u003c');
 return pageHead('Research Notebook','The price of a thali','An illustrative ingredient-cost calculation using available Agmarknet mandi modal-price averages, dated '+esc(data.date)+'. The figures are wholesale benchmarks, not observed retail meal prices.')+
 '<div class="wrap th-wrap"><p class="th-caution"><strong>Not a retail price index:</strong> These reported mandi prices are from one date, aggregated across markets that may not sell identical grades or weights. This model is an accounting illustration. No observed change in household inflation is inferred.</p>'+
 '<section class="th-top"><div><span>Price snapshot</span><strong>'+esc(data.date)+'</strong></div><div><span>Ingredients</span><strong>'+data.rows.length+'</strong></div><div><span>Pricing convention</span><strong>₹/quintal → ₹/kg</strong></div></section>'+
 '<section class="th-ingredients"><h2>Set the quantities in your meal</h2><p>Enter kilograms per meal, including intended preparation amounts. Adjust everything to match your own recipe; the starting quantities are hypothetical and not a dietary recommendation.</p>'+
 '<div class="th-scroll"><table><thead><tr><th>Ingredient</th><th>Markets</th><th>Reported mandi mean</th><th>Converted price</th><th>Your kg / meal</th><th>Mandi input cost</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
 '<section class="th-assumptions"><h2>From wholesale ingredients to household expenditure</h2><div class="th-controls">'+
 '<label>Assumed combined retail uplift, wastage and distribution (%)<input type="number" id="th-uplift" min="0" max="1000" step="1" value="25"></label>'+
 '<label>Assumed cooking fuel and extra ingredients (₹ per meal)<input type="number" id="th-cooking" min="0" max="100000" step=".5" value="5"></label>'+
 '<label>Meals of this type per month<input type="number" id="th-meals" min="0" max="300" step="1" value="30"></label>'+
 '</div><div class="th-results"><div><span>Mandi-equivalent raw food input</span><strong id="th-raw">—</strong></div><div><span>Illustrative adjusted meal cost</span><strong id="th-total">—</strong></div><div><span>Illustrative monthly food budget for these meals</span><strong id="th-month">—</strong></div></div><p class="th-validate" id="th-validate" role="status" aria-live="polite"></p></section>'+
 '<section class="th-method"><h2>Interpretation and reproducibility</h2><p>For each ingredient: rupees per kilogram = published rupees per quintal ÷ 100. Ingredient cost = kilograms used × price per kilogram. The assumed retail-uplift percentage is applied to the total wholesale-equivalent ingredients before the independently chosen per-meal cooking allowance. Nothing here estimates an actual retailer gross margin.</p><ul>'+data.limitations.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>'+
 '<p>A real historical Price of a Thali series requires a <em>matched</em> crop, grade, market and date sample across months, aligned with documented local retail prices, household cooking fuel and ingredient quantities. Farmgate or mandi quotes must not be inserted into a retail-price series as though identical.</p>'+
 '<div class="th-links"><a href="/api/research/thali-snapshot.json">Download source bundle</a><a href="/research/thali/data.csv">Download source-price CSV</a><a href="/series/price-of-a-thali/">Historical reading path</a><a href="/economy/prices/">Official inflation dashboard</a><a href="'+esc(data.source_url)+'">Agmarknet</a></div></section></div>'+
 '<script type="application/json" id="th-data">'+payload+'</script><link rel="stylesheet" href="/thali.css"><script src="/thali.js" defer></script>';
}
