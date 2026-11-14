// Source-vintage annotated evidence ledger, not a synthetic composite index or policy ranking.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=(n,unit)=>{
 const fmt=x=>Number(x).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:Math.abs(x)%1>0?1:0});
 if(unit==='₹ crore')return (n<0?'−':'')+'₹'+fmt(Math.abs(n))+' crore';
 if(unit==='US$ billion')return (n<0?'−':'')+'US$'+fmt(Math.abs(n))+'bn';
 return fmt(n)+' '+unit;
};
export function outcomesPage({data,pageHead}){
 const options=data.dimensions.map(d=>'<option value="'+esc(d.id)+'">'+esc(d.name)+'</option>').join('');
 const cards=data.dimensions.map((d,i)=>'<article class="os-card" data-dimension="'+esc(d.id)+'" id="outcome-'+esc(d.id)+'">'+
 '<header><div class="os-kicker">Outcome '+(i+1)+' / '+data.dimensions.length+'</div><h2>'+esc(d.name)+'</h2><p>'+esc(d.question)+'</p></header>'+
 '<div class="os-metric"><span>'+esc(d.main.label)+'</span><strong>'+esc(value(d.main.value,d.main.unit))+'</strong><small>'+esc(d.main.current_period)+'</small>'+
 (d.main.previous==null?'':'<div class="os-prior">Comparison: '+esc(value(d.main.previous,d.main.unit))+' ('+esc(d.main.previous_period||'')+')</div>')+
 '<p>'+esc(d.main.note)+'</p></div>'+
 '<div class="os-supplement"><h3>Additional observations</h3><ul>'+d.supporting.map(x=>'<li><span>'+esc(x.label)+'</span><strong>'+esc(value(x.value,x.unit))+'</strong><small>'+esc(x.period)+'</small></li>').join('')+'</ul></div>'+
 '<div class="os-evidence"><h3>What the evidence says</h3><p>'+esc(d.observed)+'</p><h3>Transmission mechanism</h3><p>'+esc(d.mechanism)+'</p><h3>What this does not establish</h3><p>'+esc(d.cannot_infer)+'</p><h3>The next evidence test</h3><p>'+esc(d.next_test)+'</p></div>'+
 '<footer><p><strong>Original release:</strong> <a href="'+esc(d.primary.url)+'" target="_blank" rel="noopener noreferrer">'+esc(d.primary.title)+'</a> ('+esc(d.primary.release)+')</p>'+
 '<div class="os-related">'+d.related.map(x=>'<a href="'+esc(x.url)+'">'+esc(x.title)+'</a>').join('')+'</div></footer></article>').join('');
 return pageHead('India’s year in review','Five outcomes that matter','A source-linked scorecard of household purchasing power, work, real investment, fiscal execution and external resilience. Each dimension has its own data period and limitations; no composite ranking is invented.')+
 '<div class="wrap os-wrap"><p class="os-disclaimer"><strong>Measurement before judgement:</strong> A statistic can establish an outcome for its stated period. It cannot by itself identify the effects of a policy. These five lenses use different denominators, vintages and geographic coverage and should not be aggregated into one “India score”.</p>'+
 (data.flagship ? '<section class="os-flagship"><span class="kicker">Published annual investigation</span><h2><a href="'+esc(data.flagship.url)+'">'+esc(data.flagship.title)+'</a></h2><p>Published '+esc(data.flagship.date)+'. This editorial synthesis draws on all five indicators without equating correlation, expenditure accounting and causal effects.</p></section>' : '')+
 '<section class="os-top"><div><strong>'+data.dimensions.length+'</strong><span>Measured outcome dimensions</span></div><div><strong>48</strong><span>Milestones in the linked chronology</span></div><div><strong>'+esc(data.as_of)+'</strong><span>Evidence cutoff</span></div></section>'+
 '<div class="os-picker"><label>Read one economic outcome<select id="os-filter"><option value="all">All five outcomes</option>'+options+'</select></label><span id="os-count" role="status">Showing all five outcomes</span></div>'+
 '<div class="os-cards" id="os-cards">'+cards+'</div>'+
 '<section class="os-method"><h2>How to read this scorecard</h2><p>Each number retains its observation period, source release date, classification and relevant price base. A comparison with a preceding quarter is not the same as a year-on-year change; a revised estimate is not an observed new quarter; a budget versus an outturn is not a time-series growth rate.</p>'+
 '<p>The full annual synthesis should test four questions for every major shock: who was exposed, how it transmitted to prices or income, what actually changed, and what counter-evidence remains. Evidence of exposure is weaker than measurement of outcomes; outcome changes are not necessarily causal effects of the event that preceded them.</p>'+
 '<div class="os-links"><a href="/api/research/year-outcome-scorecard.json">Download this source ledger</a><a href="/desk/chronology/">Search 48 dated milestones</a><a href="/desk/commissions/">Track 19 historical commissions</a><a href="/desk/india-year-in-review/">Eight story timelines</a><a href="https://thekakisto.wordpress.com/corrections-and-methodology/">Corrections and methods</a></div>'+
 '<p><strong>Editorial status:</strong> '+esc(data.status)+'</p></section></div>'+
 '<link rel="stylesheet" href="/outcomes.css"><script src="/outcomes.js" defer></script>';
}
