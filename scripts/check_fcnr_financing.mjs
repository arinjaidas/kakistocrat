// Check RBI FCNR(B) facility and April–September 2026 BoP source-vintage accounting.
// Gross facility values cannot be silently substituted for net BoP liabilities.
import {readFileSync} from 'node:fs';
import {fcnrCsv,financingCsv} from '../lib/fcnr-financing.mjs';
const data=JSON.parse(readFileSync('data/fcnr-financing-2026.json','utf8'));
const f=data.facility,b=data.bop,eps=0.003;
if(data.as_of!=='2026-11-14')throw Error('Unreviewed date change');
if(f.terms.circular!=='2026-06-08'||f.terms.revised_deposit_cutoff!=='2026-08-31')throw Error('FCNR cutoff or circular drift');
if(f.terms.minimum_tenor_years!==3||f.terms.maximum_tenor_years!==5)throw Error('Wrong eligible FCNR swap tenor');
if(f.snapshots.length!==3)throw Error('Expected precisely three documented RBI facility snapshots');
const expected=[
 ['2026-08-13',52.300,2.805,1.741,56.846],
 ['2026-08-31',127.226,5.260,3.891,136.377],
 ['2026-09-18',132.980,5.320,5.296,143.596]
];
f.snapshots.forEach((r,i)=>{
 const [date,fc,of,ec,total]=expected[i];
 if(r.as_of!==date||Math.abs(r.fcnr_usd_bn-fc)>eps||Math.abs(r.ofcb_usd_bn-of)>eps||Math.abs(r.ecb_usd_bn-ec)>eps||Math.abs(r.total_usd_bn-total)>eps)throw Error('Unexpected dated RBI gross facility source '+r.as_of);
 if(Math.abs(r.fcnr_usd_bn+r.ofcb_usd_bn+r.ecb_usd_bn-r.total_usd_bn)>eps)throw Error('Scheme components do not sum: '+date);
 if(!r.source_url.startsWith('https://www.rbi.org.in/'))throw Error('Facility source does not identify the RBI');
});
if(b.release_date!=='2026-11-13'||b.current_period!=='April–September 2026, preliminary')throw Error('BoP vintage mismatch');
const ca=b.current_account;
if(Math.abs(ca.goods+ca.services+ca.transfers+ca.income-ca.total)>eps)throw Error('Current account fails component accounting identity');
if(b.financial_flow_components.length!==6)throw Error('Wrong number of financial components');
const total=b.financial_flow_components.reduce((s,x)=>s+x.value,0);
if(Math.abs(total-b.financial_aggregate)>eps)throw Error('Financial B items must sum to 92.6bn');
if(Math.abs(ca.total+b.financial_aggregate-b.overall_balance)>eps)throw Error('Overall BoP not equal to CA plus B');
if(Math.abs(b.overall_balance+b.monetary_movement)>eps)throw Error('Monetary movement sign drift');
const bank=b.financial_flow_components.find(x=>x.id==='banking');
if(bank.value!==125.2||bank.of_which_nri_deposits!==125.6||bank.prior_nri_deposits!==6.1)throw Error('NRI deposit must be a nested banking subcomponent');
if(Math.abs((b.financial_aggregate-bank.of_which_nri_deposits)+bank.of_which_nri_deposits-b.financial_aggregate)>eps)throw Error('Net deposit accounting check');
if(Math.abs(ca.total+(b.financial_aggregate-bank.of_which_nri_deposits)+0-(-58.8))>eps)throw Error('Zero NRI inflow sensitivity identity failed');
if(!fcnrCsv(data).includes('fcnr_gross_usd_bn')||!financingCsv(data).includes('apr_sep_2026_preliminary_usd_bn'))throw Error('Downloadable source data headers malformed');
console.log('FCNR financing integrity passed: 3 RBI dated facility snapshots, 6 BoP components, separate gross/net units and zero-NRI counterfactual.');
