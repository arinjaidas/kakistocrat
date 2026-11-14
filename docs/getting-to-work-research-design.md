# The Economics of Getting to Work
## A reproducible urban labour-market access research design

**Prepared:** 14 November 2026  
**Status:** Model and blank field instrument. No personal information or observed Pune commute data have been collected.

### Question

How do housing costs, wages, cash commuting expenses, travel time, unreliable transit, and dependent-care costs change the net monetary value of otherwise attainable jobs?

### Model

Cash remaining per month = take-home pay − rent and housing charges − workdays × daily round-trip travel expenditure − work-related care expenditure.

Commute time per month = workdays × (round-trip minutes + reliability buffer minutes) / 60.

Time-adjusted remainder = cash remaining − commute time × an explicit assumed hourly time value.

For two options A and B, the break-even wage at B is the A time-adjusted remainder plus all non-wage costs of B, including the selected value of time.

The model is an accounting framework, not an estimated labour supply equation. Its parameters must not be presented as Pune or Indian averages without a documented sample.

### Field design

A small pilot in Pune can compare pairs of housing/work locations at a coarse neighbourhood or route level without recording exact home addresses. Collect repeated trip observations for the same time of day and day of week, with documented fare receipts, scheduled versus observed travel duration, transfers, and any failed journeys. Separate wage offers from accepted employment and stated preferences from revealed choices.

Record no names, precise GPS coordinates, phone numbers, Aadhaar numbers, employer IDs or health information. Use pseudonymous record IDs and record consent separately from analytic data. Never post an identifiable dataset publicly.

The blank CSV has headers only. Anonymise, aggregate, review re-identification risk, and obtain appropriate permissions before sharing participant information.

### Methodological path

1. Define two comparable commute options, a consistent monthly work schedule and the same family care responsibilities.
2. Validate the cash budget against payslips/rent/transport observations only with explicit participant permission.
3. Show sensitivity to hourly time value, travel uncertainty, workdays and childcare access.
4. For causal transit studies, identify a plausibly exogenous timetable or service change and comparable unaffected routes. Check parallel trends, relocation and route selection before using difference-in-differences.
5. Present distributions and missing data. Avoid treating an opportunistic sample of friends or students as representative of all working households.
6. Investigate whether an improved transit connection broadens the attainable job set, changes actual accepted wages, or mainly reduces an existing commute burden.

### Replication

- Browser tool: /research/getting-to-work/
- Input schema: data/getting-to-work-survey-schema.json
- Empty template: /research/getting-to-work/field-template.csv
- Python script: scripts/getting_to_work_analysis.py
- Run: python3 scripts/getting_to_work_analysis.py field-template.csv --output results.csv

With a header-only template, the script produces no observations; it never invents respondents.

### Boundaries

Do not interpret the difference in time-adjusted remainder as an estimate of welfare, job acceptance, fairness, productivity or a causal wage premium. Real households face nonlinear constraints, different risk tolerance, informal transfers, joint household decisions and housing search costs.
