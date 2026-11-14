// Validate the preserved source manuscript and 52 date-specific historical routes.
import {readFileSync} from 'node:fs';
import {parseOilRupeeWeeks} from '../lib/oil-rupee-archive.mjs';
const content=readFileSync('docs/oil-rupee-52-week-retrospective.md','utf8'),weeks=parseOilRupeeWeeks(content);
if(weeks.length!==52)throw Error('52 weekly essays required');
if(weeks[0].date!=='2025-11-14'||weeks.at(-1).date!=='2026-11-06')throw Error('Historical coverage dates wrong');
const ids=new Set();
let populated=0;
for(let i=0;i<weeks.length;i++){
 const w=weeks[i],time=Date.parse(w.date+'T00:00:00Z');
 if(!Number.isFinite(time)||w.week!==i+1||ids.has(w.date))throw Error('Bad date/week '+i);
 ids.add(w.date);
 if(i&&time-Date.parse(weeks[i-1].date+'T00:00:00Z')!==7*864e5)throw Error('Week dates not exactly 7 days apart');
 if(w.body.length<320||!w.body.includes('EIA')||!w.body.includes('Federal Reserve'))throw Error('Missing historical source text: '+w.date);
 if(w.fx_observations<3||w.fx_observations>5||w.usd_inr_weekly_average<0)throw Error('Invalid original FX observations');
 if(w.brent_spot_usd_per_bbl!=null){
   populated++;
   const calculated=w.brent_spot_usd_per_bbl*w.usd_inr_weekly_average;
   if(Math.abs(calculated-w.implied_inr_per_bbl)>0.03)throw Error('Oil-FX arithmetic mismatch '+w.date+' calculated='+calculated+' source='+w.implied_inr_per_bbl);
 }else if(w.date!=='2026-11-06'||w.implied_inr_per_bbl!==null)throw Error('Only week 52 may have missing compiled spot');
}
if(populated!==51)throw Error('Exactly 51 observed Brent benchmarks required');
if(weeks[0].brent_spot_usd_per_bbl!==62.87||weeks[0].implied_inr_per_bbl!==5574.68)throw Error('First benchmark has changed');
if(weeks.at(-1).fx_observations!==5||weeks.at(-1).usd_inr_weekly_average!==94.5340)throw Error('Final week data lost');
console.log('52-week archive validated: 52 complete sourced chapters, 51 translated spot benchmarks, 1 explicit missing vintage.');
