#!/usr/bin/env python3
"""Fetch market and commodity data into data/markets/*.json.

Sources (all free, no keys):
  NSE archives      index closes, valuations, stock prices, market caps   (Source: NSE)
  FRED (CSV)        US Treasury yields, fed funds, broad dollar index, EIA oil and gas spot prices
  Frankfurter       ECB euro foreign exchange reference rates
  World Bank        Pink Sheet monthly commodity prices (CC BY 4.0)
  CoinGecko         crypto prices (attribution: CoinGecko)

Incremental: index history is cached and only missing trading days are fetched.
Usage: python3 scripts/fetch_markets.py [--years N]
"""
import csv, io, json, os, sys, time, zipfile, datetime as dt, urllib.request, urllib.error

OUT = 'data/markets'
UA = {'User-Agent': 'Mozilla/5.0 (compatible; kakistocrat-data/1.0; +https://kakistocrat.pages.dev)', 'Accept': '*/*'}
TODAY = dt.date.today()
YEARS = int(sys.argv[sys.argv.index('--years') + 1]) if '--years' in sys.argv else 3
os.makedirs(OUT, exist_ok=True)

def get(url, tries=3, timeout=30):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            if k == tries - 1: raise
        except Exception:
            if k == tries - 1: raise
        time.sleep(1.5 * (k + 1))

def load(name, default):
    p = f'{OUT}/{name}.json'
    return json.load(open(p)) if os.path.exists(p) else default

def save(name, obj):
    with open(f'{OUT}/{name}.json', 'w') as f: json.dump(obj, f, separators=(',', ':'), ensure_ascii=False)

def num(s):
    s = (s or '').strip()
    if s in ('', '-', '…'): return None
    try: return float(s)
    except ValueError: return None

# ------------------------------------------------------------------ NSE indices
KEEP = ['Nifty 50', 'Nifty Next 50', 'Nifty 100', 'Nifty 500', 'NIFTY Midcap 100', 'NIFTY Smallcap 100', 'Nifty Bank', 'Nifty Financial Services',
        'Nifty IT', 'Nifty Auto', 'Nifty FMCG', 'Nifty Pharma', 'Nifty Metal', 'Nifty Realty', 'Nifty Energy', 'Nifty PSU Bank', 'Nifty Private Bank',
        'Nifty Media', 'Nifty Oil & Gas', 'Nifty Healthcare Index', 'Nifty Consumer Durables', 'Nifty Infrastructure', 'Nifty Commodities',
        'Nifty India Defence', 'Nifty CPSE', 'Nifty PSE', 'India VIX', 'Nifty 10 yr Benchmark G-Sec']
def nse_indices():
    hist = load('nse_indices', {})          # {date: {index: [close, chg%, pe, pb, dy]}}
    start = TODAY - dt.timedelta(days=365 * YEARS + 10)
    d, fetched = TODAY, 0
    while d >= start:
        key = d.isoformat()
        if d.weekday() < 5 and key not in hist:
            raw = get(f'https://archives.nseindia.com/content/indices/ind_close_all_{d:%d%m%Y}.csv')
            if raw:
                rows = {}
                for r in csv.DictReader(io.StringIO(raw.decode('utf-8', 'replace'))):
                    n = (r.get('Index Name') or '').strip()
                    m = next((k for k in KEEP if k.lower() == n.lower()), None)
                    if m: rows[m] = [num(r.get('Closing Index Value')), num(r.get('Change(%)')), num(r.get('P/E')), num(r.get('P/B')), num(r.get('Div Yield'))]
                if rows: hist[key] = rows; fetched += 1
            time.sleep(0.15)
        d -= dt.timedelta(days=1)
    hist = dict(sorted((k, v) for k, v in hist.items() if k >= start.isoformat()))
    save('nse_indices', hist)
    print(f'NSE indices: {len(hist)} days ({fetched} new), latest {max(hist) if hist else None}')
    return hist

# ------------------------------------------------------------------ NSE stocks (Nifty 50 heatmap, breadth, movers)
def nse_stocks(latest_date):
    if not latest_date: return
    d = dt.date.fromisoformat(latest_date)
    n50 = list(csv.DictReader(io.StringIO(get('https://archives.nseindia.com/content/indices/ind_nifty50list.csv').decode())))
    bhav = get(f'https://archives.nseindia.com/products/content/sec_bhavdata_full_{d:%d%m%Y}.csv')
    pr = get(f'https://archives.nseindia.com/archives/equities/bhavcopy/pr/PR{d:%d%m%y}.zip')
    px = {}
    for r in csv.DictReader(io.StringIO(bhav.decode()), skipinitialspace=True):
        if (r.get('SERIES') or '').strip() == 'EQ':
            px[r['SYMBOL'].strip()] = (num(r['PREV_CLOSE']), num(r['CLOSE_PRICE']), num(r['TURNOVER_LACS']))
    mcap = {}
    if pr:
        z = zipfile.ZipFile(io.BytesIO(pr))
        mf = next((n for n in z.namelist() if n.startswith('mcap')), None)
        if mf:
            for r in csv.DictReader(io.StringIO(z.read(mf).decode('utf-8', 'replace'))):
                r = {k.strip(): (v or '').strip() for k, v in r.items() if k}
                if r.get('Series') == 'EQ': mcap[r['Symbol']] = num(r.get('Market Cap(Rs.)'))
    stocks = []
    for s in n50:
        sym = s['Symbol'].strip()
        if sym in px:
            prev, close, tov = px[sym]
            stocks.append({'s': sym, 'n': s['Company Name'].strip().replace(' Ltd.', '').replace(' Limited', ''), 'ind': s['Industry'].strip(),
                           'c': close, 'p': prev, 'chg': round((close / prev - 1) * 100, 2) if prev else None, 'mcap': round((mcap.get(sym) or 0) / 1e7), 'tov': tov})
    adv = sum(1 for v in px.values() if v[0] and v[1] > v[0]); dec = sum(1 for v in px.values() if v[0] and v[1] < v[0])
    save('nse_stocks', {'date': latest_date, 'nifty50': stocks, 'breadth': {'advances': adv, 'declines': dec, 'unchanged': len(px) - adv - dec, 'universe': len(px)}})
    print(f'NSE stocks: {len(stocks)} Nifty 50 names, breadth {adv}/{dec}')

# ------------------------------------------------------------------ FRED (public-domain series only)
FRED = {'DGS3MO': 'US 3-month Treasury', 'DGS2': 'US 2-year Treasury', 'DGS10': 'US 10-year Treasury', 'DGS30': 'US 30-year Treasury',
        'DFF': 'US federal funds rate', 'T10YIE': 'US 10-year breakeven inflation', 'DTWEXBGS': 'Broad US dollar index',
        'DCOILBRENTEU': 'Brent crude spot', 'DCOILWTICO': 'WTI crude spot', 'DHHNGSP': 'Henry Hub natural gas spot', 'DEXINUS': 'Rupees per US dollar (Fed H.10)'}
def fred():
    start = (TODAY - dt.timedelta(days=365 * max(YEARS, 5))).isoformat()
    out = {}
    for sid, label in FRED.items():
        raw = get(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd={start}')
        pts = []
        for r in csv.reader(io.StringIO(raw.decode())):
            if len(r) == 2 and r[0][:2] in ('19', '20'):
                v = num(r[1])
                if v is not None: pts.append([r[0], v])
        out[sid] = {'label': label, 'pts': pts}
        time.sleep(0.3)
    save('fred', out)
    print('FRED:', {k: (v['pts'][-1] if v['pts'] else None) for k, v in out.items()})

# ------------------------------------------------------------------ FX (ECB reference rates via Frankfurter)
FX = ['INR', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'IDR', 'MYR', 'PHP', 'THB', 'SGD', 'BRL', 'MXN', 'ZAR', 'TRY']
def fx():
    start = (TODAY - dt.timedelta(days=365 * max(YEARS, 5))).isoformat()
    j = json.loads(get(f'https://api.frankfurter.app/{start}..?from=USD&to={",".join(FX)}'))
    pts = sorted(j['rates'].items())
    save('fx', {'base': 'USD', 'source': 'ECB euro foreign exchange reference rates, via Frankfurter', 'dates': [d for d, _ in pts], 'rates': {c: [r.get(c) for _, r in pts] for c in FX}})
    print('FX:', pts[-1][0], pts[-1][1].get('INR'))

# ------------------------------------------------------------------ World Bank Pink Sheet (monthly)
WB_URL = 'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx'
WB_KEEP = {  # column header → (id, display name, group, unit)
    'Crude oil, Brent': ('brent', 'Brent crude', 'Energy', '$/bbl'), 'Crude oil, Dubai': ('dubai', 'Dubai crude', 'Energy', '$/bbl'),
    'Crude oil, WTI': ('wti', 'WTI crude', 'Energy', '$/bbl'), 'Coal, Australian': ('coal', 'Coal, Australia', 'Energy', '$/t'),
    'Natural gas, US': ('ngus', 'Natural gas, US', 'Energy', '$/mmbtu'), 'Natural gas, Europe': ('ngeu', 'Natural gas, Europe', 'Energy', '$/mmbtu'),
    'Liquefied natural gas, Japan': ('lng', 'LNG, Japan', 'Energy', '$/mmbtu'),
    'Gold': ('gold', 'Gold', 'Precious metals', '$/oz'), 'Silver': ('silver', 'Silver', 'Precious metals', '$/oz'), 'Platinum': ('platinum', 'Platinum', 'Precious metals', '$/oz'),
    'Copper': ('copper', 'Copper', 'Base metals', '$/t'), 'Aluminum': ('aluminium', 'Aluminium', 'Base metals', '$/t'), 'Nickel': ('nickel', 'Nickel', 'Base metals', '$/t'),
    'Zinc': ('zinc', 'Zinc', 'Base metals', '$/t'), 'Lead': ('lead', 'Lead', 'Base metals', '$/t'), 'Tin': ('tin', 'Tin', 'Base metals', '$/t'),
    'Iron ore, cfr spot': ('ironore', 'Iron ore', 'Base metals', '$/dmtu'),
    'Urea': ('urea', 'Urea', 'Fertilisers', '$/t'), 'DAP': ('dap', 'DAP', 'Fertilisers', '$/t'), 'TSP': ('tsp', 'TSP', 'Fertilisers', '$/t'),
    'Potassium chloride': ('potash', 'Potash', 'Fertilisers', '$/t'), 'Phosphate rock': ('rockphos', 'Phosphate rock', 'Fertilisers', '$/t'),
    'Wheat, US HRW': ('wheat', 'Wheat, US HRW', 'Grains', '$/t'), 'Maize': ('maize', 'Maize', 'Grains', '$/t'), 'Rice, Thai 5%': ('rice', 'Rice, Thai 5%', 'Grains', '$/t'),
    'Soybeans': ('soy', 'Soybeans', 'Grains', '$/t'),
    'Palm oil': ('palm', 'Palm oil', 'Edible oils', '$/t'), 'Soybean oil': ('soyoil', 'Soybean oil', 'Edible oils', '$/t'), 'Sunflower oil': ('sunoil', 'Sunflower oil', 'Edible oils', '$/t'),
    'Sugar, world': ('sugar', 'Sugar', 'Softs', '$/kg'), 'Coffee, Arabica': ('coffee', 'Coffee, Arabica', 'Softs', '$/kg'), 'Cocoa': ('cocoa', 'Cocoa', 'Softs', '$/kg'),
    'Tea, Kolkata': ('teakol', 'Tea, Kolkata', 'Softs', '$/kg'), 'Cotton, A Index': ('cotton', 'Cotton', 'Softs', '$/kg'), 'Rubber, RSS3': ('rubber', 'Rubber', 'Softs', '$/kg'),
}
def worldbank():
    import openpyxl
    raw = get(WB_URL, timeout=90)
    wb = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    rows = list(wb['Monthly Prices'].iter_rows(values_only=True))
    updated = str(rows[3][0])
    hdr = [str(h).replace('**', '').strip() if h else '' for h in rows[4]]
    data = [r for r in rows[6:] if r and r[0] and str(r[0])[:4].isdigit() and int(str(r[0])[:4]) >= 2010]
    months = [f'{str(r[0])[:4]}-{str(r[0])[5:7]}' for r in data]
    out = {'updated': updated.replace('Updated on ', ''), 'months': [], 'series': {}}
    last_valid = 0
    for col, name in enumerate(hdr):
        key = next((k for k in WB_KEEP if name.rstrip() == k), None)
        if not key: continue
        cid, disp, grp, unit = WB_KEEP[key]
        vals = [r[col] if isinstance(r[col], (int, float)) else None for r in data]
        while vals and vals[-1] is None and len(vals) > 1 and all(v is None for v in vals[-1:]): break
        last_valid = max(last_valid, max((i for i, v in enumerate(vals) if v is not None), default=0))
        out['series'][cid] = {'name': disp, 'group': grp, 'unit': unit, 'v': vals}
    n = last_valid + 1
    out['months'] = months[:n]
    for s in out['series'].values(): s['v'] = [round(x, 4) if x is not None else None for x in s['v'][:n]]
    save('worldbank', out)
    print('World Bank:', out['updated'], out['months'][-1], len(out['series']), 'series')

# ------------------------------------------------------------------ CoinGecko (daily history; live prices are fetched in the browser)
def crypto():
    out = {}
    for cid in ['bitcoin', 'ethereum']:
        j = json.loads(get(f'https://api.coingecko.com/api/v3/coins/{cid}/market_chart?vs_currency=usd&days=365&interval=daily'))
        out[cid] = [[dt.datetime.fromtimestamp(t / 1000, dt.timezone.utc).date().isoformat(), round(v, 2)] for t, v in j['prices']]
        time.sleep(2)
    save('crypto', out)
    print('Crypto:', {k: v[-1] for k, v in out.items()})


# ------------------------------------------------------------------ IMF WEO (annual, with projections) and World Bank WDI
PEERS = {'IND': 'India', 'CHN': 'China', 'IDN': 'Indonesia', 'VNM': 'Vietnam', 'BRA': 'Brazil', 'MEX': 'Mexico', 'ZAF': 'South Africa', 'TUR': 'Turkey', 'BGD': 'Bangladesh', 'PHL': 'Philippines', 'USA': 'United States', 'DEU': 'Germany', 'JPN': 'Japan', 'GBR': 'United Kingdom'}
IMF = {'NGDP_RPCH': ('Real GDP growth', '%'), 'PCPIPCH': ('Consumer price inflation, annual average', '%'), 'BCA_NGDPD': ('Current account balance', '% of GDP'),
       'GGXWDG_NGDP': ('General government gross debt', '% of GDP'), 'GGXCNL_NGDP': ('General government net lending (+) / borrowing (−)', '% of GDP'),
       'NGDPDPC': ('GDP per person, current prices', 'US$'), 'NGDPD': ('GDP, current prices', 'US$ billion'), 'PPPGDP': ('GDP at purchasing power parity', 'int$ billion')}
WDI = {'FI.RES.TOTL.MO': ('Reserves in months of imports', 'months'), 'BX.TRF.PWKR.CD.DT': ('Personal remittances received', 'US$'),
       'BX.KLT.DINV.CD.WD': ('Foreign direct investment, net inflows', 'US$'), 'NE.EXP.GNFS.ZS': ('Exports of goods and services', '% of GDP'),
       'NE.IMP.GNFS.ZS': ('Imports of goods and services', '% of GDP'), 'NE.GDI.TOTL.ZS': ('Gross capital formation', '% of GDP')}
def imf_wdi():
    out = {'imf': {}, 'wdi': {}, 'countries': PEERS}
    for code, (label, unit) in IMF.items():
        j = json.loads(get(f'https://www.imf.org/external/datamapper/api/v1/{code}/{"/".join(PEERS)}'))
        vals = j.get('values', {}).get(code, {})
        out['imf'][code] = {'label': label, 'unit': unit, 'data': {c: {y: v for y, v in vals.get(c, {}).items() if int(y) >= 1990} for c in PEERS}}
        time.sleep(0.4)
    for code, (label, unit) in WDI.items():
        j = json.loads(get(f'https://api.worldbank.org/v2/country/{";".join(PEERS)}/indicator/{code}?format=json&per_page=2000&date=1990:2030'))
        data = {}
        for r in (j[1] if len(j) > 1 and j[1] else []):
            if r['value'] is not None: data.setdefault(r['countryiso3code'], {})[r['date']] = r['value']
        out['wdi'][code] = {'label': label, 'unit': unit, 'data': data}
        time.sleep(0.4)
    save('macro_world', out)
    print('IMF/WDI:', len(out['imf']), len(out['wdi']), 'India growth', {k: v for k, v in out['imf']['NGDP_RPCH']['data']['IND'].items() if k in ('2025', '2026')})

if __name__ == '__main__':
    steps = [('fred', fred), ('fx', fx), ('worldbank', worldbank), ('crypto', crypto), ('imf_wdi', imf_wdi)]
    if '--only' in sys.argv:
        only = sys.argv[sys.argv.index('--only') + 1]; dict(steps)[only](); sys.exit(0)
    ok = True
    try:
        h = nse_indices()
        nse_stocks(max(h) if h else None)
    except Exception as e:
        ok = False; print('NSE failed:', repr(e))
    for name, fn in steps:
        try: fn()
        except Exception as e: ok = False; print(f'{name} failed:', repr(e))
    save('meta', {'fetched': dt.datetime.now(dt.timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")})
    sys.exit(0 if ok else 0)
