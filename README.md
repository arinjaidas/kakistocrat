# The Kakistocrat — data & tools site

Static site for The Kakistocrat. Articles are written and published on
[thekakisto.wordpress.com](https://thekakisto.wordpress.com) and pulled in automatically;
everything else (macro tape, Shock Lab, Policy Ledger, Forecast Book) lives here.

## Build

```
node build.mjs      # fetches WordPress, writes the site to dist/
npm run serve       # preview at http://localhost:8080
```

No dependencies. Node 18 or later.

## Updating data

| What | File |
|---|---|
| Macro tape (CPI, repo, rupee, 10Y, Brent, Nifty) | `data/tape.json` |
| Policy Ledger items | `data/ledger.json` |
| Forecast Book calls | `data/forecasts.json` |

Edit the file on GitHub and commit; Cloudflare Pages rebuilds in about a minute.
Every figure in `tape.json` carries its source and the date it was checked.
Forecast calls must be entered on the day they are made.

## Sync

`.github/workflows/sync.yml` runs every three hours. It refreshes `data/wp-cache.json`
from WordPress and commits it only when articles changed, which triggers a rebuild.
Run it by hand from the Actions tab after publishing.

## Hosting

Cloudflare Pages, connected to this repository. Build command `node build.mjs`, output `dist`.
Article pages carry a canonical link to the WordPress original.
