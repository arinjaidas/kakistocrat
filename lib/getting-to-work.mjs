// Commute economics model. Assumptions are editable, local to the reader and not collected.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(key,label,val,min,max,step)=>'<label>'+esc(label)+'<input id="'+esc(key)+'" type="number" required min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"></label>';
const scenario=(prefix,title,values)=>
 '<fieldset><legend>'+esc(title)+'</legend>'+
 field(prefix+'-wage','Monthly take-home wage (₹)',values.wage,0,100000000,.01)+
 field(prefix+'-rent','Monthly rent and housing charges (₹)',values.rent,0,100000000,.01)+
 field(prefix+'-fare','Total daily commute cost (₹)',values.fare,0,1000000,.01)+
 field(prefix+'-minutes','Total daily round-trip minutes',values.minutes,0,1440,.1)+
 field(prefix+'-buffer','Extra daily reliability buffer (minutes)',values.buffer,0,600,.1)+
 field(prefix+'-care','Monthly work-related care cost (₹)',values.care,0,10000000,.01)+'</fieldset>';
export function gettingToWorkPage({pageHead}) {
 const left={wage:30000,rent:12000,fare:100,minutes:70,buffer:10,care:2000};
 const right={wage:34000,rent:16000,fare:70,minutes:35,buffer:5,care:3000};
 return pageHead('Research Workbench','The economics of getting to work','Compare two hypothetical job-and-home arrangements. Estimate monthly cash remaining after rent, commuting and care, then include an explicit opportunity cost of travel time.')+
 '<div class="wrap gw-wrap"><p class="gw-disclaimer"><strong>Scenario, not survey evidence.</strong> Starting values are invented solely for illustration. No Pune fares, rents, wages or household behaviour are being asserted. Inputs remain in your browser and are not submitted or stored by this tool.</p>'+
 '<form id="gw-form"><div class="gw-common">'+field('gw-days','Workdays per month',22,0,31,1)+field('gw-time-value','Assumed value of an hour (₹)',120,0,100000,.01)+'</div>'+
 '<div class="gw-inputs">'+scenario('gw-a','Option A: job and home',left)+scenario('gw-b','Option B: job and home',right)+'</div>'+
 '<div class="gw-actions"><button type="reset" id="gw-reset">Reset hypothetical inputs</button></div></form>'+
 '<section class="gw-results"><h2>How the two options compare</h2>'+
 '<div class="gw-panels"><div><span>Option A: monthly cash remaining</span><strong id="gw-a-cash">₹13,800</strong><small id="gw-a-time">Travel time: 29.3 hours/month</small><span>After the selected value of time</span><strong id="gw-a-net">₹10,280</strong></div>'+
 '<div><span>Option B: monthly cash remaining</span><strong id="gw-b-cash">₹13,460</strong><small id="gw-b-time">Travel time: 14.7 hours/month</small><span>After the selected value of time</span><strong id="gw-b-net">₹11,700</strong></div></div>'+
 '<p class="gw-difference" id="gw-difference" role="status" aria-live="polite"></p><p id="gw-breakeven" class="gw-breakeven"></p></section>'+
 '<section class="gw-method"><h2>What the calculation means</h2><p><strong>Cash remaining</strong> = take-home monthly wage − housing costs − (round-trip commuting expenses × workdays) − work-related childcare or care expenditure. This is not a full household budget: food, taxes outside take-home pay, medical costs, rent deposits and other living expenses are excluded.</p>'+
 '<p><strong>Time-adjusted remainder</strong> = cash remaining − ((daily travel and reliability minutes ÷ 60) × workdays × reader-supplied hourly value of time). This is an accounting of a stated opportunity cost, not an estimate of a worker preferences or welfare. Set the time value to zero to see only cash.</p>'+
 '<p><strong>Break-even wage</strong> for B is the wage B would require to match the time-adjusted remainder of A, holding all other costs and assumptions unchanged. The model does not predict equilibrium wages, job offers, household relocation or commuting choices.</p>'+
 '<div class="gw-links"><a href="/series/getting-to-work/">Historical reading path</a><a href="/research/getting-to-work/field-template.csv">Blank anonymised survey template</a><a href="/research/getting-to-work/research-design.md">Research design and ethics</a><a href="/research/getting-to-work/analysis.py">Python reproduction script</a></div></section></div>'+
 '<link rel="stylesheet" href="/getting-to-work.css"><script src="/getting-to-work.js" defer></script>';
}
