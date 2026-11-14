// Validate the three evidence-based economic research labs and their source-vintage arithmetic.
// No model value is a historical observation unless drawn from its named source.
import {readFileSync} from 'node:fs';
import {chinaInputsData,chinaInputsCsv} from '../lib/china-inputs.mjs';
import {thaliData,thaliCsv} from '../lib/thali.mjs';
import {dollarCushionCsv} from '../lib/dollar-cushion.mjs';

const read=f=>JSON.parse(readFileSync(f,'utf8'));
const trade=read('data/markets/trade.json');
const china=chinaInputsData(trade);
if(china.period!=='2025')throw Error('Comtrade year changed; review source vintage');
if(china.rows.length<50)throw Error('Too few HS2 rows');
const sum=china.rows.reduce((a,b)=>a+b.china_usd,0);
if(Math.abs(sum-china.china_total_usd)>1)throw Error('HS chapter totals do not sum to China imports');
if(Math.abs(china.china_total_usd-149494920196.202)>1)throw Error('Unexpected 2025 Chinese imports total');
if(Math.abs(china.world_total_usd-752731081941.054)>1)throw Error('Unexpected 2025 India import total');
for(const row of china.rows){
 if(row.china_usd<0||row.india_world_usd<=0||row.china_share<0||row.china_share>1.01)throw Error('Invalid chapter share '+row.code);
}
if(!chinaInputsCsv(china).startsWith('"code"'))throw Error('China CSV header malformed');
const commodity=thaliData(read('data/markets/mandi.json'));
if(!/^\d{4}-\d{2}-\d{2}$/.test(commodity.date))throw Error('Invalid mandi date');
if(commodity.rows.length!==5)throw Error('Thali should have 5 ingredients');
for(const row of commodity.rows){
 if(row.wholesale_rupees_per_kg!==row.wholesale_rupees_per_quintal/100)throw Error('Incorrect quintal conversion');
 if(row.markets<1||row.quantity_kg<=0)throw Error('Missing quoted markets or recipe quantity');
}
const raw=commodity.rows.reduce((s,r)=>s+r.quantity_kg*r.wholesale_rupees_per_kg,0);
if(!(raw>0&&Number.isFinite(raw)))throw Error('Impossible ingredient-cost default');
if(!thaliCsv(commodity).includes('wholesale_rupees_per_quintal'))throw Error('Thali CSV missing unit');
const bop=read('data/dollar-cushion-bop.json');
if(bop.source_release_date!=='2026-11-13'||bop.rows.length!==4)throw Error('Unexpected RBI source vintage');
for(const r of bop.rows){
 const componentSum=r.merchandise+r.services+r.transfers+r.income;
 if(Math.abs(r.current-componentSum)>0.15)throw Error('RBI current account identity differs beyond rounding: '+r.id);
 if(Math.abs(r.overall-(r.current+r.capital))>0.11)throw Error('RBI overall balance identity fails: '+r.id);
 if(Math.abs(r.monetary+r.overall)>0.11)throw Error('Incorrect RBI monetary movement sign: '+r.id);
}
const sept=bop.rows.find(r=>r.id==='sep2026');
if(sept.current!==-7.4||sept.capital!==16.2||sept.overall!==8.8)throw Error('Unexpected September 2026 RBI source figures');
if(!dollarCushionCsv(bop).includes('September 2026'))throw Error('RBI CSV missing period');
console.log('Research labs OK: '+china.rows.length+' trade chapters, '+commodity.rows.length+
 ' wholesale ingredients ('+commodity.date+'), '+bop.rows.length+' RBI period-vintage rows.');
