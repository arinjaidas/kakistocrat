// Site checks run after every build: broken internal links, stale data series, and pages missing basics.
// Usage: node scripts/check_site.mjs [dist] [--strict]. Writes dist/api/health.json and prints a summary.
// With --strict it exits 1 on broken links (used in CI); the Cloudflare build only warns.
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'dist';
const strict = process.argv.includes('--strict');
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(OUT), pages = files.filter(f => f.endsWith('.html'));
const have = new Set(files.map(f => '/' + f.slice(OUT.length + 1).replace(/\\/g, '/')));
have.add('/api/health.json'); // written by this script
const redirects = new Set(existsSync(join(OUT, '_redirects')) ? readFileSync(join(OUT, '_redirects'), 'utf8').split('\n').map(l => l.split(/\s+/)[0]).filter(Boolean) : []);
const exists = u => {
  if (redirects.has(u)) return true;
  if (have.has(u)) return true;
  if (u.endsWith('/') && have.has(u + 'index.html')) return true;
  if (!/\.[a-z0-9]+$/i.test(u) && (have.has(u + '.html') || have.has(u + '/index.html'))) return true;
  return false;
};

const imgSkipped = u => { const m = u.match(/^\/img\/([^/]+)\//); return m && !existsSync(join(OUT, 'img', m[1])); }; // image sets not rendered in this build (no matplotlib, or SKIP_IMG)
const broken = new Map(); let links = 0;
const missing = { title: [], description: [], h1: [] };
for (const f of pages) {
  const h = readFileSync(f, 'utf8'), page = '/' + f.slice(OUT.length + 1).replace(/index\.html$/, '');
  if (/^\/(wp-kit|embed)\//.test(page)) continue;
  for (const m of h.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const u = decodeURI(m[1]); if (u.startsWith('//') || imgSkipped(u)) continue; links++;
    if (!exists(u)) { if (!broken.has(u)) broken.set(u, []); const a = broken.get(u); if (a.length < 3) a.push(page); }
  }
  if (!/<title>[^<]{3,}/.test(h)) missing.title.push(page);
  if (!/<meta name="description" content="[^"]{20,}/.test(h) && page !== '/404.html') missing.description.push(page);
  if (!/<h1[\s>]/.test(h) && !/^\/(s|wp-kit)\//.test(page) && !['/', '/terminal/', '/404.html'].includes(page)) missing.h1.push(page);
}

// stale series: how far each series' last observation is behind what its frequency implies
const now = Date.now(), cat = existsSync(join(OUT, 'api/catalog.json')) ? JSON.parse(readFileSync(join(OUT, 'api/catalog.json'), 'utf8')) : [];
const LIMIT = { daily: 12, weekly: 21, fortnightly: 40, monthly: 75, quarterly: 200, annual: 800 };
const stale = cat.filter(c => c.last && !c.id.startsWith('wdi-') && LIMIT[c.freq] && (now - Date.parse(c.last)) / 864e5 > LIMIT[c.freq] * (/OECD/.test(c.source || '') ? 1.8 : 1))
  .map(c => ({ id: c.id, name: c.name, freq: c.freq, last: c.last, days: Math.round((now - Date.parse(c.last)) / 864e5) })).sort((a, b) => b.days - a.days);

const health = { checked: new Date().toISOString(), pages: pages.length, links, broken: [...broken].map(([url, from]) => ({ url, from })), stale, missing };
writeFileSync(join(OUT, 'api/health.json'), JSON.stringify(health, null, 1));
console.log(`Checks: ${pages.length} pages, ${links} internal links, ${broken.size} broken, ${stale.length} stale series, ${missing.title.length + missing.description.length + missing.h1.length} pages missing basics`);
for (const [u, from] of [...broken].slice(0, 25)) console.log(`  broken ${u}  ← ${from.join(', ')}`);
for (const s of stale.slice(0, 15)) console.log(`  stale  ${s.id} (${s.freq}) last ${s.last}, ${s.days} days`);
for (const [k, v] of Object.entries(missing)) if (v.length) console.log(`  no ${k}: ${v.slice(0, 5).join(', ')}${v.length > 5 ? ` +${v.length - 5}` : ''}`);
if (strict && broken.size) process.exit(1);
