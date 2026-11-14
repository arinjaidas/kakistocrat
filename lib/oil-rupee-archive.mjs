// The Kakistocrat 52-week archive: a source-preserving renderer for the user's
// retrospective manuscript. Historical coverage dates are NOT publication dates.
const MONTHS={January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fnum=n=>Math.round(n).toLocaleString('en-IN');
const priceRe=/\*\*Weekly data\*\*\s*·\s*Brent spot \$([\d.]+)\/bbl\s*·\s*USD\/INR ([\d.]+)\s*·\s*translated Brent about ₹([\d,]+)\/bbl/;
function inline(markdown){
 let s=esc(markdown);
 s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>');
 s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
 s=s.replace(/\*([^*]+)\*/g,'<em>$1</em>');
 return s;
}
function paragraphs(markdown) {
 return markdown.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(s=>{
  if(s.startsWith('*Week '))return '<p class="ow-week-note">'+inline(s)+'</p>';
  if(s.startsWith('**Weekly data**'))return '<p class="ow-week-data">'+inline(s)+'</p>';
  return '<p>'+inline(s.replace(/\n/g,' '))+'</p>';
 }).join('\n');
}
const pathFor=date=>'/research/oil-rupee-weekly/'+date+'/';
export function parseOilRupeeWeeks(raw){
 const appendixStart=raw.indexOf('\n## Weekly data\n');
 if(appendixStart<0)throw Error('Missing original numerical appendix');
 const articleSource=raw.slice(0,appendixStart),appendix=raw.slice(appendixStart);
 const tableRows=[...appendix.matchAll(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([\d.]+|Unavailable)\s*\|\s*([\d.]+)\s*\|\s*(\d+)\s*\|\s*([\d.]+|Unavailable)\s*\|$/gm)];
 const table=new Map(tableRows.map(m=>[m[1],{
  brent_spot_usd_per_bbl:m[2]==='Unavailable'?null:+m[2],
  usd_inr_weekly_average:+m[3],
  fx_observations:+m[4],
  implied_inr_per_bbl:m[5]==='Unavailable'?null:+m[5]
 }]));
 const matches=[...articleSource.matchAll(/^## (\d{1,2}) ([A-Z][a-z]+) (202[56]) · (.+)$/gm)];
 const result=[];
 for(let i=0;i<matches.length;i++){
  const m=matches[i],mon=MONTHS[m[2]];
  if(!mon)throw Error('Unknown month: '+m[2]);
  const date=m[3]+'-'+String(mon).padStart(2,'0')+'-'+m[1].padStart(2,'0');
  const body=articleSource.slice(m.index+m[0].length,i+1<matches.length?matches[i+1].index:articleSource.length).trim();
  const numbers=table.get(date);
  if(!numbers)throw Error('Missing appendixed observations for '+date);
  const originalLine=body.match(/\*\*Weekly data\*\*[^\n]+/)?.[0]||'';
  if(!originalLine)throw Error('Missing original in-prose data for '+date);
  if(numbers.brent_spot_usd_per_bbl===null && !originalLine.includes('unavailable'))throw Error('Missing spot not acknowledged in essay '+date);
  result.push({week:i+1,date,title:m[4],body,...numbers,
   benchmark_status:numbers.brent_spot_usd_per_bbl==null?'Spot observation unavailable at original manuscript compilation':'EIA weekly Brent spot available'});
 }
 if(table.size!==52||result.length!==52)throw Error('Expected 52 unique weeks in both essays and source appendix');
 return result;
}
function spark(weeks){
 const observations=weeks.filter(w=>w.implied_inr_per_bbl!=null);
 const min=Math.min(...observations.map(x=>x.implied_inr_per_bbl)),max=Math.max(...observations.map(x=>x.implied_inr_per_bbl));
 const x=i=>40+i*(760/(weeks.length-1)),y=n=>190-(n-min)/(max-min)*155;
 const pts=observations.map(w=>x(w.week-1).toFixed(1)+','+y(w.implied_inr_per_bbl).toFixed(1)).join(' ');
 return '<figure class="ow-spark"><svg viewBox="0 0 850 225" role="img" aria-label="Historical rupee benchmark barrel value for 51 weeks with available Brent spot observations. Week 52 has no source observation at compilation.">'+
 '<title>Rupee-denominated weekly Brent exposure benchmark, first 51 weeks</title>'+
 '<line x1="40" y1="190" x2="825" y2="190" stroke="currentColor" opacity=".25"/>'+
 '<line x1="40" y1="35" x2="825" y2="35" stroke="currentColor" opacity=".15"/>'+
 '<text x="8" y="38" font-size="12" fill="currentColor">₹'+fnum(max)+'</text><text x="8" y="203" font-size="12" fill="currentColor">₹'+fnum(min)+'</text>'+
 '<polyline points="'+pts+'" fill="none" stroke="#9d4e3f" stroke-width="3" stroke-linejoin="round"/>'+
 '<text x="45" y="217" font-size="12" fill="currentColor">Nov 2025</text><text x="720" y="217" font-size="12" fill="currentColor">Oct 2026</text></svg>'+
 '<figcaption>Indicative weekly translated Brent = weekly EIA spot price × available Fed H.10 USD/INR observations. Week 52 omitted: source manuscript compiled before its weekly EIA spot observation was available. This is neither an actual import invoice nor a rupee commodity futures price.</figcaption></figure>';
}
function csv(weeks){
 const cols=['week','historical_coverage_date','headline','brent_spot_usd_per_bbl','usd_inr_weekly_average','fx_observations','implied_inr_per_bbl','benchmark_status','source_eia','source_fed'];
 const rows=weeks.map(w=>[w.week,w.date,w.title,w.brent_spot_usd_per_bbl??'',w.usd_inr_weekly_average??'',w.fx_observations??'',w.implied_inr_per_bbl??'',w.benchmark_status,'https://www.eia.gov/dnav/pet/hist/RBRTEw.htm','https://www.federalreserve.gov/releases/h10/hist/dat00_in.htm']);
 const cell=x=>'"'+String(x).replace(/"/g,'""')+'"';
 return [cols,...rows].map(x=>x.map(cell).join(',')).join('\n')+'\n';
}
export async function writeOilWeekArchive({source,pageHead,publish,write}){
 const weeks=parseOilRupeeWeeks(source);
 if(weeks.length!==52||weeks.some((w,i)=>w.week!==i+1||!w.body))throw Error('Historical source is not 52 full chapters');
 const articlePages=weeks.map(w=>pathFor(w.date));
 const indexRows=weeks.map(w=>'<li class="ow-list-item" data-text="'+esc((w.title+' '+w.date+' '+w.body).toLowerCase())+'">'+
 '<a href="'+pathFor(w.date)+'"><span class="ow-row-week">W'+String(w.week).padStart(2,'0')+'</span><span><time datetime="'+w.date+'">'+esc(w.date)+'</time><strong>'+esc(w.title)+'</strong></span><span class="ow-row-value">'+(w.implied_inr_per_bbl!=null?'₹'+fnum(w.implied_inr_per_bbl)+'/bbl':'Spot unavailable')+'</span></a></li>').join('');
 const indexPath='/research/oil-rupee-weekly/';
 const intro='<div class="wrap ow-wrap"><p class="ow-disclaimer"><strong>Historical manuscript notice:</strong> These are 52 retrospective essays with coverage weeks from 14 November 2025 to 6 November 2026. The manuscript was prepared on 11 November 2026 and preserved in the research archive on 14 November 2026. A week shown in a heading is the <em>period discussed</em>, not the date on which the story was published. Later sources mentioned in the text must not be mistaken for information available during the historical week.</p>';
 const index=intro+'<section class="ow-top"><div><strong>52</strong><span>Completed weekly chapters</span></div><div><strong>51</strong><span>Original spot-based benchmarks</span></div><div><strong>1</strong><span>Explicit missing spot benchmark at manuscript compilation</span></div></section>'+
 spark(weeks)+
 '<section class="ow-intro"><h2>Follow the oil, currency and trade decisions across the year</h2><p>The weekly cost benchmark compares EIA Brent spot in dollars with the Fed H.10 USD/INR mean of available observations in the same trading week, following the original manuscript’s declared method. It does not track India's actual realised cargo prices or trade elasticity.</p>'+
 '<div class="ow-links"><a href="/research/oil-rupee-weekly/data.csv">Download weekly benchmark CSV</a><a href="/api/research/oil-rupee-weekly.json">Download 52-chapter JSON</a><a href="/series/the-2026-oil-shock/">Oil-shock series</a><a href="/research/oil-rupee/">Oil and rupee stress test</a><a href="https://www.eia.gov/dnav/pet/hist/RBRTEw.htm">EIA source</a><a href="https://www.federalreserve.gov/releases/h10/hist/dat00_in.htm">Fed H.10 source</a></div></section>'+
 '<div class="ow-search"><label>Search all 52 chapters<input type="search" id="ow-search" placeholder="repo rate, tariffs, shipping, dollar..."></label><span id="ow-count" role="status">52 chapters</span></div>'+
 '<ol class="ow-list" id="ow-list">'+indexRows+'</ol><p id="ow-empty" hidden>No weekly chapter matches that search.</p></div>'+
 '<link rel="stylesheet" href="/oil-weekly.css"><script src="/oil-weekly.js" defer></script>';
 await write(indexPath.slice(1)+'index.html',publish({title:'A year of oil, the rupee and trade: 52 weekly investigations',path:indexPath,description:'52 complete historical weekly oil, rupee and trade retrospectives, with dated EIA/Fed benchmark data and clear provenance.',body:pageHead('Historical archive','Fifty-two weeks, one economy','A year of oil, the rupee and trade: 14 November 2025 to 6 November 2026.')+index}));
 for(let i=0;i<weeks.length;i++){
  const w=weeks[i],path=articlePages[i],prev=weeks[i-1],next=weeks[i+1];
  const nav='<nav class="ow-week-nav" aria-label="Neighbouring weeks">'+(prev?'<a href="'+pathFor(prev.date)+'">Previous: week '+prev.week+'</a>':'<span>First week</span>')+
   '<a href="'+indexPath+'">All 52 weeks</a>'+(next?'<a href="'+pathFor(next.date)+'">Next: week '+next.week+'</a>':'<span>Final week</span>')+'</nav>';
  const body='<div class="wrap ow-wrap"><p class="ow-disclaimer"><strong>Coverage date: '+esc(w.date)+'.</strong> The text was written retrospectively on 11 November 2026 and preserved in this archive on 14 November 2026. It was not originally published in the historical week. Figures describe source-vintage benchmarks, not an actual refinery invoice.</p>'+
   '<div class="ow-week-header"><span>Historical week '+w.week+' of 52</span><h2>'+esc(w.title)+'</h2><time datetime="'+w.date+'">Week ending '+esc(w.date)+'</time></div>'+
   '<article class="ow-prose">'+paragraphs(w.body)+'</article>'+nav+
   '<p class="ow-disclaimer">For refreshed source data, use the <a href="https://www.eia.gov/dnav/pet/hist/RBRTEw.htm">EIA Brent weekly series</a> and the <a href="https://www.federalreserve.gov/releases/h10/hist/dat00_in.htm">Federal Reserve H.10 series</a>. Later revisions and post-compilation data should be evaluated as new vintages, not silently inserted into the historical manuscript.</p></div><link rel="stylesheet" href="/oil-weekly.css">';
  await write(path.slice(1)+'index.html',publish({title:w.title,path,description:'Week '+w.week+' of The Kakistocrat retrospective oil, rupee and trade series. Historical coverage date '+w.date+', prepared in November 2026.',body:pageHead('Oil & rupee weekly',w.title,'Historical coverage week ending '+w.date)+body}));
 }
 const copy=weeks.map(({body,...w})=>({...w,text:body}));
 await write('api/research/oil-rupee-weekly.json',JSON.stringify({as_of:'2026-11-11',archive_compiled:'2026-11-14',historical_coverage_only:true,method:'Weekly EIA Brent spot × weekly average of available Fed H.10 USD/INR observations, per source manuscript; missing week 52 spot deliberately blank.',weeks:copy},null,1));
 await write('research/oil-rupee-weekly/data.csv',csv(weeks));
 return [indexPath,...articlePages];
}
