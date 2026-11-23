// Guard the 2025-26 annual flagship against stale status and conflicting canonical links.
import {readFileSync} from 'node:fs';
const j=x=>JSON.parse(readFileSync(x,'utf8'));
const q=j('data/blueprint-commissions.json'),s=j('data/year-outcome-scorecard.json'),review=j('data/year-review.json'),register=j('data/historical-research-register.json');
const target='https://thekakisto.wordpress.com/2026/11/14/india-economic-year-in-review-2025-2026-growth-jobs-inflation-capital-flows/';
const c=q.commissions.find(x=>x.id==='C18');
if(!c||c.status!=='published-anchor'||c.related_wp_ids.length!==1||c.related_wp_ids[0]!==1814)throw Error('Annual C18 commission not marked with canonical WordPress post');
if(c.publication_url!==target||c.published_on!=='2026-11-14')throw Error('C18 publication link or date drift');
if(s.flagship?.id!==1814||s.flagship.url!==target||s.flagship.date!==c.published_on)throw Error('Five-outcome ledger and C18 disagree');
if(s.status.includes('Not a causal ranking and not the completed'))throw Error('Source ledger still calls annual flagship unpublished');
if(s.dimensions.length!==5||review.events.length!==50)throw Error('Unexpected annual evidence baseline');
const s54url='https://thekakisto.wordpress.com/2026/11/21/india-new-zealand-fta-entry-into-force-rules-origin-quotas-2026/';
const s54=review.events.filter(e=>e.id==='S54');
if(s54.length!==1||s54[0].date!=='2026-10-20'||!s54[0].articles.some(a=>a.id===1835&&a.url===s54url))throw Error('S54 chronology and WordPress publication do not reconcile');
if(!review.series.find(x=>x.id==='trade-deals')?.events.includes('S54'))throw Error('S54 missing from the trade-deals series');
const keys=register.entries.map(e=>e.key);
if(new Set(keys).size!==keys.length)throw Error('Historical research register contains duplicate keys');
for(const entry of register.entries.filter(e=>e.status==='published-verified')){
 const event=review.events.find(e=>e.id===entry.event_id);
 if(!event||!event.articles.some(a=>a.id===entry.post_id&&a.url===entry.post_url))throw Error('Published research register entry does not match chronology: '+entry.key);
}
const s54entry=register.entries.filter(e=>e.event_id==='S54'&&e.post_id===1835&&e.post_url===s54url&&e.actual_publication_date==='2026-11-21');
if(s54entry.length!==1)throw Error('S54 research register does not match the confirmed publication');
const s55url='https://thekakisto.wordpress.com/2026/11/23/india-semicon-2-0-portal-application-eligibility-matching-funds-2026/';
const s55=review.events.filter(e=>e.id==='S55');
if(s55.length!==1||s55[0].date!=='2026-11-06'||!s55[0].articles.some(a=>a.id===1837&&a.url===s55url))throw Error('S55 chronology and WordPress publication do not reconcile');
if(!review.series.find(x=>x.id==='industry')?.events.includes('S55'))throw Error('S55 missing from the industry series');
const s55entry=register.entries.filter(e=>e.event_id==='S55'&&e.post_id===1837&&e.post_url===s55url&&e.actual_publication_date==='2026-11-23'&&e.word_count===1787);
if(s55entry.length!==1)throw Error('S55 research register does not match the confirmed publication');
const page=readFileSync('lib/year-review.mjs','utf8'),renderer=readFileSync('lib/outcome-scorecard.mjs','utf8'),build=readFileSync('build.mjs','utf8');
for(const [name,txt] of [['review',page],['build',build]]){
 if(!txt.includes(target))throw Error('Canonical flagship not linked by '+name);
}
if(!renderer.includes("data.flagship"))throw Error('Outcome page has no flagship reader entry');
if(!build.includes('1814: [['))throw Error('Canonical annual article lacks research companions');
console.log('Annual flagship integration OK: WordPress 1814 is canonical, C18 completed at article level, 50 milestones and five outcomes remain distinct.');
