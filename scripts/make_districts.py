"""Builds data/districts.json: district indicators keyed by Census 2011 district code, matching static/geo/india-districts.json
(DataMeet district boundaries, Census 2011, CC BY 2.5 India).
Inputs:
  Census 2011 district tables (Census of India; compiled as india-districts-census-2011.csv)
  NFHS-5 district fact sheets, phase 1 (21 states/UTs; IIPS/MoHFW; compiled by Pratap Vardhan, CC BY 4.0)
Usage: python3 scripts/make_districts.py <census.csv> <NFHS-5-Districts.csv> <geo.json> data/districts.json"""
import csv, json, sys, re
census_p, nfhs_p, geo_p, out_p = sys.argv[1:5]
geo = json.load(open(geo_p)); G = {f['properties']['id']: f['properties'] for f in geo['features']}
C = list(csv.DictReader(open(census_p, encoding='utf-8')))
f = lambda r, k: float(r[k] or 0)
share = lambda a, b: lambda r: round(f(r, a) / f(r, b) * 100, 1) if f(r, b) else None
IND = {
  'pop':   ('Population', 'people', 'Census 2011', lambda r: int(f(r, 'Population'))),
  'urban': ('Households in towns and cities', '% of households', 'Census 2011', share('Urban_Households', 'Households')),
  'flit':  ('Women who can read and write', '% of all women', 'Census 2011', share('Female_Literate', 'Female')),
  'lit':   ('People who can read and write', '% of population', 'Census 2011', share('Literate', 'Population')),
  'sexr':  ('Women per 1,000 men', 'ratio', 'Census 2011', lambda r: round(f(r, 'Female') / f(r, 'Male') * 1000) if f(r, 'Male') else None),
  'fwork': ('Women who work', '% of all women', 'Census 2011', share('Female_Workers', 'Female')),
  'agri':  ('Workers in farming', '% of workers', 'Census 2011', lambda r: round((f(r, 'Cultivator_Workers') + f(r, 'Agricultural_Workers')) / f(r, 'Workers') * 100, 1) if f(r, 'Workers') else None),
  'elec':  ('Homes with electric lighting', '% of households', 'Census 2011', share('Housholds_with_Electric_Lighting', 'Households')),
  'latr':  ('Homes with a toilet on the premises', '% of households', 'Census 2011', share('Having_latrine_facility_within_the_premises_Total_Households', 'Households')),
  'tap':   ('Homes with tap water', '% of households', 'Census 2011', share('Main_source_of_drinking_water_Tapwater_Households', 'Households')),
  'lpg':   ('Homes cooking with LPG or piped gas', '% of households', 'Census 2011', share('LPG_or_PNG_Households', 'Households')),
  'phone': ('Homes with a phone', '% of households', 'Census 2011', share('Households_with_Telephone_Mobile_Phone', 'Households')),
  'car':   ('Homes with a car, jeep or van', '% of households', 'Census 2011', share('Households_with_Car_Jeep_Van', 'Households')),
  'net':   ('Homes with the internet', '% of households', 'Census 2011', share('Households_with_Internet', 'Households')),
}
data = {k: {'label': v[0], 'unit': v[1], 'source': v[2], 'values': {}} for k, v in IND.items()}
for r in C:
    code = str(int(r['District code']))
    if code not in G: continue
    for k, v in IND.items():
        x = v[3](r)
        if x is not None: data[k]['values'][code] = x
# NFHS-5 phase 1, joined on state and district name
NF = {'stunt': ('73.', 'Children under 5 who are stunted', '% of children'), 'cfuel': ('10.', 'Homes using clean cooking fuel', '% of households'), 'w10': ('15.', 'Women with 10+ years of school', '% of women'),
      'inst': ('42.', 'Births in a hospital or clinic', '% of births'), 'anae': ('84.', 'Women who are anaemic', '% of women 15–49'), 'insur': ('12.', 'Homes covered by health insurance', '% of households')}
norm = lambda s: re.sub(r'[^a-z]', '', s.lower().replace('&', 'and'))
gidx = {}
for code, p in G.items(): gidx.setdefault(norm(p['st'])[:6], {})[norm(p['n'])] = code
for k, (pre, lab, unit) in NF.items(): data[k] = {'label': lab, 'unit': unit, 'source': 'NFHS-5 (2019–20), first-phase states only', 'values': {}}
unmatched = set()
for r in csv.DictReader(open(nfhs_p, encoding='utf-8')):
    st = gidx.get(norm(r['State'])[:6]) or {}
    code = st.get(norm(r['District']))
    if not code:
        cands = [c for n, c in st.items() if n.startswith(norm(r['District'])[:6]) or norm(r['District']).startswith(n[:6])]
        code = cands[0] if len(cands) == 1 else None
    for k, (pre, lab, unit) in NF.items():
        if r['Indicator'].startswith(pre + ' '):
            if not code: unmatched.add((r['State'], r['District'])); continue
            try: data[k]['values'][code] = float(r['NFHS-5'])
            except ValueError: pass
json.dump({'districts': {c: {'n': p['n'], 'st': p['st']} for c, p in G.items()}, 'indicators': data,
           'sources': {'Census 2011': 'Census of India 2011, district tables', 'NFHS-5': 'National Family Health Survey 2019–20 district fact sheets (IIPS, MoHFW), phase 1; CSV by Pratap Vardhan, CC BY 4.0', 'map': 'District boundaries: DataMeet, Census 2011, CC BY 2.5 India'}},
          open(out_p, 'w'), separators=(',', ':'), ensure_ascii=False)
print({k: len(v['values']) for k, v in data.items()}, 'NFHS unmatched:', len(unmatched))
