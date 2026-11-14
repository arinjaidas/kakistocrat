// China-origin imported input exposure, based on India-reported UN Comtrade 2025 HS2 goods values.
// Trade shares describe observed national values, never a firm's supplier portfolio or a price effect.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const usd=n=>'$'+Number(n/1e9).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'bn';
const pct=n=>Number(n*100).toFixed(1)+'%';
export function chinaInputsData(trade){
 const year=String(Math.max(...trade.years)),partner=trade.partners.CHN,world=trade.world.M;
 const byChapter=trade.partnerChapters.CHN.M,global=trade.chapters.M;
 const rows=Object.entries(byChapter).map(([code,chinaUsd])=>({
  code:String(code).padStart(2,'0'),name:trade.chapterNames[code]||'HS chapter '+code,
  china_usd:chinaUsd,india_world_usd:global[code]??null,
  china_share:global[code]>0?chinaUsd/global[code]:null,
 })).filter(r=>r.india_world_usd!=null).sort((a,b)=>b.china_usd-a.china_usd);
 const chinaTotal=+partner.M[year],worldTotal=+world[year];
 return {source:trade.source,period:year,classification:'HS 2-digit product chapters, goods imports reported by India',source_url:'https://comtradeplus.un.org/',china_total_usd:chinaTotal,world_total_usd:worldTotal,china_import_share:chinaTotal/worldTotal,rows,
  caution:'Share of India goods imports in a chapter from China is not the share of a representative business inputs, not evidence of underpricing or dumping, and not a causal measure of domestic displacement. Unit values, quantity, product mix, re-exports, tariffs and services are not resolved at HS2.'};
}
export function chinaInputsCsv(data){
 const fields=['code','hs2_description','china_imports_usd','india_world_imports_usd','china_share_of_chapter','source','period'];
 const csv=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
 return [fields,...data.rows.map(r=>[r.code,r.name,r.china_usd,r.india_world_usd,r.china_share,data.source,data.period])].map(row=>row.map(csv).join(',')).join('\n')+'\n';
}
export function chinaInputsPage({data,pageHead}){
 const top=data.rows.slice(0,8);
 const bars=top.map(r=>'<div class="ci-bar-row"><a href="#ci-chapter-'+esc(r.code)+'">HS '+esc(r.code)+'</a><div class="ci-track"><div style="width:'+(100*r.china_usd/top[0].china_usd).toFixed(3)+'%"></div></div><strong>'+usd(r.china_usd)+'</strong></div>').join('');
 const trs=data.rows.map(r=>'<tr id="ci-chapter-'+esc(r.code)+'" data-hs="'+esc(r.code)+'" data-name="'+esc(r.name.toLowerCase())+'" data-share="'+(r.china_share??'')+'"><th scope="row">'+esc(r.code)+'</th><td>'+esc(r.name)+'</td><td>'+usd(r.china_usd)+'</td><td>'+usd(r.india_world_usd)+'</td><td>'+(r.china_share==null?'Unavailable':pct(r.china_share))+'</td></tr>').join('');
 return pageHead('Research Notebook','The China input map','India-reported goods imports from China, by HS two-digit product chapter for '+esc(data.period)+'. Explore where sourcing value is concentrated and how an explicitly hypothetical supplier cost shock would affect a firm.')+
 '<div class="wrap ci-wrap"><div class="ci-kpis"><div><span>India imports from China, '+esc(data.period)+'</span><strong>'+usd(data.china_total_usd)+'</strong></div><div><span>China share of India goods imports</span><strong>'+pct(data.china_import_share)+'</strong></div><div><span>India imports from all origins</span><strong>'+usd(data.world_total_usd)+'</strong></div></div>'+
 '<section><h2>The largest China-origin import chapters</h2><p>Import values in current US dollars. A category can be economically strategic even if its value is comparatively small; a high share does not tell us whether suppliers can be substituted.</p><div class="ci-bars">'+bars+'</div></section>'+
 '<section class="ci-table"><h2>Find a product chapter</h2><div class="ci-filters"><label>Search HS chapter<input id="ci-query" type="search" placeholder="Chemicals, electrical, 85..."></label><label>Minimum China share of chapter<select id="ci-min"><option value="0">All shares</option><option value="0.25">25% or more</option><option value="0.5">50% or more</option><option value="0.75">75% or more</option></select></label></div><p id="ci-count" role="status">All matching chapters</p>'+
 '<div class="ci-scroll"><table><thead><tr><th>HS2</th><th>Product chapter</th><th>From China</th><th>All origins</th><th>China share</th></tr></thead><tbody id="ci-rows">'+trs+'</tbody></table></div></section>'+
 '<section class="ci-scenario" id="ci-scenario"><h2>What if your imported inputs became dearer?</h2><p>This is a reader-defined <strong>company cost scenario</strong>, not a transmission estimate from the country-level import shares above. Enter your own invoice values and supplier composition.</p>'+
 '<div class="ci-controls"><label>Company imported-input spend per month (₹)<input id="ci-spend" type="number" min="0" max="100000000000" step="1000" value="1000000"></label><label>Share of company input spend purchased from China (%)<input id="ci-sourcing" type="number" min="0" max="100" step="1" value="30"></label><label>Assumed percentage price change for those inputs (%)<input id="ci-shock" type="number" min="-100" max="1000" step=".5" value="10"></label></div>'+
 '<div class="ci-scenario-result"><span>Change in this firm’s monthly input bill, before substitution or other effects</span><strong id="ci-result">₹30,000</strong><p id="ci-formula"></p></div>'+
 '<p>All values in the calculator are illustrative until replaced with the reader’s own measured spend and invoices. Exchange rates, shipping, import duties, supplier substitution and production responses are held constant. The chapter-level China share in the trade table cannot be substituted for an individual company’s sourcing share.</p></section>'+
 '<section class="ci-method"><h2>Reproduce and interpret the data</h2><p><strong>Observation:</strong> '+esc(data.period)+' India-reported, annual merchandise import values from UN Comtrade, classified at HS2. Share = value imported from China / value imported by India from all countries within the same HS2 chapter. The aggregate China share is calculated from annual total imports, not an average of chapter shares.</p>'+
 '<p>'+esc(data.caution)+'</p><div class="ci-links"><a href="/api/research/china-inputs.json">Download data JSON</a><a href="/research/china-inputs/data.csv">Download data CSV</a><a href="/series/the-china-price-shock/">Reading path</a><a href="/trade/">India partner and product trade explorer</a><a href="'+esc(data.source_url)+'">Original UN Comtrade platform</a></div></section></div>'+
 '<link rel="stylesheet" href="/china-inputs.css"><script src="/china-inputs.js" defer></script>';
}
