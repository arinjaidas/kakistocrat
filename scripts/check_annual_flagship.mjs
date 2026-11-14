// Guard the 2025-26 annual flagship against stale status and conflicting canonical links.
import {readFileSync} from 'node:fs';
const j=x=>JSON.parse(readFileSync(x,'utf8'));
const q=j('data/blueprint-commissions.json'),s=j('data/year-outcome-scorecard.json'),review=j('data/year-review.json');
const target='https://thekakisto.wordpress.com/2026/11/14/india-economic-year-in-review-2025-2026-growth-jobs-inflation-capital-flows/';
const c=q.commissions.find(x=>x.id==='C18');
if(!c||c.status!=='published-anchor'||c.related_wp_ids.length!==1||c.related_wp_ids[0]!==1814)throw Error('Annual C18 commission not marked with canonical WordPress post');
if(c.publication_url!==target||c.published_on!=='2026-11-14')throw Error('C18 publication link or date drift');
if(s.flagship?.id!==1814||s.flagship.url!==target||s.flagship.date!==c.published_on)throw Error('Five-outcome ledger and C18 disagree');
if(s.status.includes('Not a causal ranking and not the completed'))throw Error('Source ledger still calls annual flagship unpublished');
if(s.dimensions.length!==5||review.events.length!==48)throw Error('Unexpected annual evidence baseline');
const page=readFileSync('lib/year-review.mjs','utf8'),renderer=readFileSync('lib/outcome-scorecard.mjs','utf8'),build=readFileSync('build.mjs','utf8');
for(const [name,txt] of [['review',page],['build',build]]){
 if(!txt.includes(target))throw Error('Canonical flagship not linked by '+name);
}
if(!renderer.includes("data.flagship"))throw Error('Outcome page has no flagship reader entry');
if(!build.includes('1814: [['))throw Error('Canonical annual article lacks research companions');
console.log('Annual flagship integration OK: WordPress 1814 is canonical, C18 completed at article level, 48 milestones and five outcomes remain distinct.');
