// Fail the build when a historical finance cell or original editorial commission drifts.
import { readFileSync } from 'node:fs';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const data=read('data/fy26-capex-audit.json'),q=read('data/blueprint-commissions.json');
const errors=[],cap=data.observations.find(x=>x.code==='capex');
const m=Object.fromEntries(data.observations.map(x=>[x.code,x]));
const eq=(a,b,label)=>{if(a!==b)errors.push(label+': expected '+b+', observed '+a)};
eq(cap?.be,1121090,'Original FY26 capex BE');
eq(cap?.re,1095755,'FY26 capex RE');
eq(cap?.pa,1069119,'FY26 capex provisional accounts');
eq(cap.pa-cap.be,-51971,'Capex shortfall vs original Budget');
eq(cap.pa-cap.re,-26636,'Capex shortfall vs Revised Estimate');
eq(m.total_expenditure.pa,m.revenue_expenditure.pa+cap.pa,'Revenue plus capital = total expenditure');
eq(m.total_expenditure.pa-m.nondebt_receipts.pa,m.fiscal_deficit.pa,'Deficit cash-account identity');
if(data.unit!=='crore')errors.push('Incorrect fiscal unit');
for(const r of data.observations){
  if(r.code!=='capex'&&[r.be,r.re,r.pa].every(x=>x==null))errors.push('Empty fiscal row: '+r.code);
  if(!r.label||!r.note)errors.push('Missing fiscal documentation: '+r.code);
  for(const col of ['be','re','pa'])if(r[col]!=null&&(!Number.isFinite(r[col])||r[col]<0))errors.push('Invalid amount: '+r.code+'/'+col);
}
eq(q.commissions.length,19,'Original blueprint commissions');
const ids=new Set();
const stage=new Set(Object.keys(q.taxonomy));
for(const c of q.commissions){
  if(ids.has(c.id))errors.push('Duplicate commission '+c.id);
  ids.add(c.id);
  if(!stage.has(c.status))errors.push('Unknown status for '+c.id);
  if(!c.title||!c.series||!c.event_date||!c.next_evidence)errors.push('Incomplete '+c.id);
  if(!Array.isArray(c.related_wp_ids))errors.push('Missing related post list: '+c.id);
  if(c.status==='published-anchor'&&!c.related_wp_ids?.length)errors.push('Published commission has no anchor: '+c.id);
}
for(let i=1;i<=19;i++){const id='C'+String(i).padStart(2,'0');if(!ids.has(id))errors.push('Missing original commission '+id)}
if(errors.length){console.error(errors.map(x=>' - '+x).join('\n'));process.exit(1)}
console.log('Editorial research checks passed: 19 historical commissions, '+data.observations.length+' fiscal metrics, accounting identities match.');
