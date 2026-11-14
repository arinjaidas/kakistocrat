# The Kakistocrat: research and commissioning charter

**As of:** 14 November 2026  
**Status:** Working editorial blueprint, not publication instructions for unchecked claims.

## Mission

Explain how an economic decision changes the constraints faced by Indian households, workers, firms, taxpayers, governments and trading partners. The unit of reporting is the **mechanism** connecting announcement to incidence and measurable outcome. Separate fact, interpretation, scenario and forecast.

## Existing publication architecture

WordPress holds the canonical signed articles; Cloudflare Pages hosts the interactive charts, datasets, tools, research routes and mirrored article reading pages. The 2025–26 year-review register holds eight timelines and 48 milestone records as of 13 November. Seven records have no linked analysis according to the register. That is a **linkage gap**, not proof an article does not exist elsewhere.

## The editorial lanes

1. **Today:** one verified daily lead on a decision, release, implementation or meaningful data update, if the evidence supports one.
2. **Archive:** a historically dated investigation of a turning point, published with the actual publication date and clearly marked *event date*. Two to four per week, not a quota.
3. **Sunday:** a 1,800–2,400-word flagship with a reproducible model, original visual or comparison, and limitations.
4. **Living series:** additions only when the latest release materially changes what readers can conclude.
5. **Research notebook:** replication files, underlying datasets, methodology notes, corrections and code.

## Historical commission priorities

The companion `data/editorial-commissions.json` defines seven top gaps. Four are P0: the September 2025 GST reset, June and July 2026 US trade action, and GDP base-vintage revisions. Remaining research covers labour rules, the Economic Survey capex thesis and RBI rate transmission. A gap is filled only by a checked source, a genuine new explanation and an article link in the register.

## Article standard

Every substantive article must contain: (1) the concrete question; (2) what changed and on what date; (3) who faces which costs, incomes or risks; (4) evidence and source links; (5) at least one honest alternative explanation; (6) what would falsify or revise the claim; (7) links to previous/next chapters; (8) the date the facts were last checked. Put the original event date in a labeled field, not as an invented publication date.

## Credibility gates

- Primary official releases beat summaries for legal status, dates and numerical figures.
- Preserve observation date, publication date, measurement unit, denominator, base year and revision vintage for every datapoint.
- State when the data are too weak for causal inference.
- Never silently replace missing numbers or introduce fictional citations.
- A stale URL, dated policy proposal or a mismatch between release versions blocks publication until reconciled.
- Use the WordPress canonical link and keep any Cloudflare mirror canonicalised to it.
- Newsletter and social distribution remain separate decisions from publication; publishing may notify subscribers. Do not bulk publish unverified backlog.

## Improvement programme

**Now:** source-linked chronology, filterable by storyline/coverage/importance, 7-gap research queue, current redirects and sitemap integrity.

**Next:** a date-vintage audit of the eight series and the policy ledger; cross-links from original articles to their living chronology; compare archive status against the event index instead of assuming an unlinked milestone has no article.

**Then:** publish data-supported historical chapters, mark tested hypotheses, add a reader-facing corrections and revisions page, and expose a publication-status feed for each series.

**Ongoing:** measure reader return through search and referral depth, not just raw posting volume; track queries answered, clicks into tools, article-to-series continuation and newsletter conversion where consented analytics permit.

## Production safeguards

All research, code and content changes should be reviewed on a feature branch and pass the site build, broken-link checker and mobile checks before merging. The production site's automated desk continues on its existing schedule; this blueprint does not create a new overlapping automation.
