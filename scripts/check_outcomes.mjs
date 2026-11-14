// The annual scorecard must preserve source vintages and agree with the underlying research notebooks.
import {readFileSync} from 'node:fs';
const read=x=>JSON.parse(readFileSync(x,'utf8'));
const sc=read('data/year-outcome-scorecard.json');
const bop=read('data/dollar-cushion-bop.json');
const cap=read('data/fy26-capex-audit.json');
const gdp=read('data/gdp-contributions.json');
if(sc.as_of!=='2026-11-14')throw Error('Annual scorecard cutoff changed without review');
if(sc.dimensions.length!==5)throw Error('Expected five outcome dimensions');
const ids=sc.dimensions.map(x=>x.id);
if(new Set(ids).size!==5)throw Error('Duplicate outcome ID');
if(!['households','work','investment','public-finance','external'].every(x=>ids.includes(x)))throw Error('Missing core dimension');
for(const row of sc.dimensions){
 if(!row.name||!row.question||!row.observed||!row.mechanism||!row.cannot_infer||!row.next_test)throw Error('Incomplete '+row.id);
 if(!/^https:\/\//.test(row.primary?.url)||!row.primary.release||row.primary.release>sc.as_of)throw Error('Source problem: '+row.id);
 if(!Number.isFinite(row.main.value)||!row.main.current_period||!row.main.unit)throw Error('Unusable indicator: '+row.id);
 for(const x of row.supporting)if(!Number.isFinite(x.value)||!x.unit||!x.period)throw Error('Unusable secondary metric: '+row.id);
}
const m=Object.fromEntries(sc.dimensions.map(d=>[d.id,d]));
if(m.households.main.value!==6.09||m.households.supporting.find(x=>x.label==='Food inflation')?.value!==8.94)throw Error('CPI release values inconsistent');
if(m.work.main.value!==5.1||m.work.main.previous!==5.4||m.work.supporting.find(x=>x.label==='Worker-population ratio')?.value!==52.7)throw Error('PLFS release figures inconsistent');
const rate=100*(gdp.currentGDP/gdp.priorGDP-1);
if(Math.abs(rate-m.investment.main.value)>0.07)throw Error('GDP growth mismatch');
const pf=gdp.rows.find(x=>x[0]==='Private consumption'),inv=gdp.rows.find(x=>x[0]==='Gross fixed capital formation'||x[0]==='Fixed investment');
const contributions=[pf,inv].map(x=>100*(x[2]-x[1])/gdp.priorGDP);
if(contributions.some(x=>Math.abs(x-3.95)>0.02))throw Error('GDP contribution mismatch');
const c=cap.observations.find(x=>x.code==='capex');
if(m['public-finance'].main.value!==c.pa||m['public-finance'].main.previous!==c.be)throw Error('Fiscal scorecard mismatch');
const b=bop.rows.find(x=>x.id==='aprsep2026'),p=bop.rows.find(x=>x.id==='aprsep2025');
if(m.external.main.value!==b.current||m.external.main.previous!==p.current)throw Error('BoP scorecard mismatch');
if(m.external.supporting.find(x=>x.label==='Net services receipts')?.value!==b.services)throw Error('BoP services mismatch');
console.log('Five-outcome scorecard: verified against GDP, capex, RBI BoP, and hard-pinned latest CPI/PLFS releases.');
