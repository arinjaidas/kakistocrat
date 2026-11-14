// FY2025–26 audited-vintage comparison; all rupee values come from data/fy26-capex-audit.json.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const amt=x=>x==null?'Not in source':new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(x);
const diff=(a,b)=>a==null||b==null?'—':(b-a>0?'+':'')+amt(b-a);
const pc=(a,b)=>a==null||b==null||a===0?'—':((b-a)/a*100).toFixed(2)+'%';
export function capexAuditPage({data,pageHead}) {
  const cap=data.observations.find(r=>r.code==='capex'), max=Math.max(cap.be,cap.re,cap.pa);
  const sources=data.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.name)+'</a> <span>('+esc(s.key)+', released '+esc(s.release_date)+')</span></li>').join('');
  const rows=data.observations.map(r=>'<tr><th scope="row">'+esc(r.label)+'</th><td data-num="'+(r.be??'')+'">'+amt(r.be)+'</td><td>'+amt(r.re)+'</td><td>'+amt(r.pa)+'</td><td>'+diff(r.be,r.pa)+'</td><td>'+pc(r.be,r.pa)+'</td></tr>').join('');
  const bars=[['Budget Estimate',cap.be],['Revised Estimate',cap.re],['Provisional accounts',cap.pa]].map(([name,n],i)=>
    '<div class="ca-bar-row"><span>'+esc(name)+'</span><div class="ca-bar-track"><div class="ca-bar ca-bar-'+i+'" style="width:'+((n/max)*100).toFixed(4)+'%"></div></div><strong>₹'+(n/100000).toFixed(3)+' lakh crore</strong></div>'
  ).join('');
  const payload=JSON.stringify(data).replace(/</g,'\\u003c');
  return pageHead('Research Notebook','The capex execution audit','A source-linked comparison of the original FY2025–26 Union Budget, Revised Estimate and provisional unaudited accounts. Figures in ₹ crore unless otherwise stated.')+
  '<div class="wrap ca-wrap"><div class="ca-meta">Fiscal year 2025–26 · Original budget versus provisional accounts · Data assembled '+esc(data.published_on)+'</div>'+
  '<section class="ca-lead"><h2>₹51,971 crore below the original Budget Estimate</h2><p>The Union budgeted <strong>₹11,21,090 crore</strong> in capital expenditure. The Controller General of Accounts recorded <strong>₹10,69,119 crore</strong> in provisional, unaudited accounts. That is <strong>4.64% below the original plan</strong>, not a measurement of how many assets were completed.</p>'+
  '<div class="ca-bars">'+bars+'</div>'+
  '<div class="ca-links"><a href="'+esc(data.related_article)+'">Read the historical investigation</a><a href="/api/research/fy26-capex.json">Download JSON</a><a href="/research/fy26-capex/data.csv">Download CSV</a><a href="/desk/india-year-in-review/public-money/">Public money timeline</a></div></section>'+
  '<section class="ca-tool"><h2>Compare a metric across estimate vintages</h2><p>Choose a Union account and its reference estimate. Missing Budget Estimates are deliberately left blank rather than invented.</p>'+
  '<div class="ca-controls"><label for="ca-metric">Fiscal metric<select id="ca-metric">'+data.observations.map(r=>'<option value="'+esc(r.code)+'">'+esc(r.label)+'</option>').join('')+'</select></label>'+
  '<label for="ca-base">Reference estimate<select id="ca-base"><option value="be">Original Budget Estimate</option><option value="re">Revised Estimate</option></select></label></div>'+
  '<div class="ca-results" aria-live="polite"><div><span>Reference</span><strong id="ca-base-value">₹11,21,090 crore</strong></div><div><span>Provisional outturn</span><strong id="ca-pa-value">₹10,69,119 crore</strong></div><div><span>Outturn minus reference</span><strong id="ca-change">−₹51,971 crore</strong></div><div><span>Percentage variance</span><strong id="ca-change-pc">−4.64%</strong></div></div><p id="ca-note" class="ca-note">'+esc(cap.note)+'</p></section>'+
  '<section class="ca-detail"><h2>Original recorded figures</h2><p>All amounts in <strong>₹ crore</strong>. Dashes mean that this source bundle does not include a directly matched figure. BE, RE and PA mean Budget Estimates, Revised Estimates and Provisional Accounts.</p>'+
  '<div class="ca-scroll"><table><thead><tr><th>Metric</th><th>BE</th><th>RE</th><th>PA</th><th>PA − BE</th><th>Variance vs BE</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<p>Effective capital expenditure in the <em>original Budget Estimate</em> was ₹'+amt(data.effective_capex.be)+' crore. This includes grants-in-aid for the creation of capital assets, so it should not be directly compared with the narrower provisional direct capital expenditure figure. The year-end FY26 ‘actual’ here remains <em>provisional and unaudited</em>.</p></section>'+
  '<section class="ca-notes"><h2>Method, sources and limits</h2><ul>'+data.research_notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul><p><strong>Formula:</strong> absolute variance = provisional amount − reference estimate; percentage variance = (provisional / reference − 1) × 100. No extrapolation, deflation, forecasting or multiplier estimate is applied.</p><ul class="ca-sources">'+sources+'</ul>'+
  '<p><strong>Interpretation:</strong> a disbursed public loan is not necessarily a completed project; a completed project is not automatically a used or productive asset; a later private investment project cannot be casually attributed to public capex. This notebook is a fiscal accounting comparison, not a causal evaluation.</p></section></div>'+
  '<script id="ca-dataset" type="application/json">'+payload+'</script><link rel="stylesheet" href="/capex-audit.css"><script src="/capex-audit.js" defer></script>';
}
export function capexAuditCsv(data){
 const cols=['code','label','be_crore','re_crore','provisional_crore','be_source','re_source','pa_source','note'];
 const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 return [cols,...data.observations.map(r=>[r.code,r.label,r.be??'',r.re??'',r.pa??'',r.be==null?'':data.sources[0].url,r.re==null?'':data.sources[1].url,r.pa==null?'':data.sources[2].url,r.note])].map(row=>row.map(cell).join(',')).join('\n')+'\n';
}
