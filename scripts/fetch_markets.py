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
import csv, io, json, os, re, sys, time, zipfile, datetime as dt, urllib.request, urllib.error, urllib.parse

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

# ------------------------------------------------------------------ Nifty 500 companies: daily closes, turnover and delivery share from NSE bhavcopies,
# kept in monthly files (data/markets/nse500/YYYY-MM.json) so each day's refresh touches one small file. Market cap from the latest PR file.
def nse500(days=10):
    lst = list(csv.DictReader(io.StringIO(get('https://archives.nseindia.com/content/indices/ind_nifty500list.csv').decode())))
    meta = {r['Symbol'].strip(): {'n': r['Company Name'].strip().replace(' Ltd.', '').replace(' Limited', ''), 'ind': r['Industry'].strip(), 'isin': r['ISIN Code'].strip()} for r in lst if r.get('Symbol')}
    syms = set(meta); folder = os.path.join(OUT, 'nse500'); os.makedirs(folder, exist_ok=True)
    idx = json.load(open(os.path.join(OUT, 'nse_indices.json'))) if os.path.exists(os.path.join(OUT, 'nse_indices.json')) else {}
    tdays = sorted(idx)[-days:]
    have = set()
    for f in os.listdir(folder):
        if f.endswith('.json') and f[:4].isdigit(): have |= set(json.load(open(os.path.join(folder, f))))
    months = {}
    for n, d in enumerate(t for t in tdays if t not in have):
        dd = dt.date.fromisoformat(d)
        raw = get(f'https://archives.nseindia.com/products/content/sec_bhavdata_full_{dd:%d%m%Y}.csv', timeout=60)
        if not raw: continue
        rows = {}
        for r in csv.DictReader(io.StringIO(raw.decode()), skipinitialspace=True):
            sym = (r.get('SYMBOL') or '').strip()
            if sym in syms and (r.get('SERIES') or '').strip() in ('EQ', 'BE'):
                c = num(r['CLOSE_PRICE']); t = num(r['TURNOVER_LACS']); dp = num(r.get('DELIV_PER'))
                if c: rows[sym] = [c, round(t / 100, 2) if t else None, dp]   # close ₹, turnover ₹ crore, delivery %
        mk = d[:7]
        if mk not in months:
            p = os.path.join(folder, mk + '.json'); months[mk] = json.load(open(p)) if os.path.exists(p) else {}
        months[mk][d] = rows
        if n % 25 == 24: print(f'  nse500 {n + 1} days')
        time.sleep(0.3)
    for mk, m in months.items():
        with open(os.path.join(folder, mk + '.json'), 'w') as fh: json.dump(dict(sorted(m.items())), fh, separators=(',', ':'))
    # market cap and listing meta from the latest PR zip
    last = max(have | {d for m in months.values() for d in m}) if (have or months) else None
    if last:
        dd = dt.date.fromisoformat(last); pr = get(f'https://archives.nseindia.com/archives/equities/bhavcopy/pr/PR{dd:%d%m%y}.zip')
        if pr:
            z = zipfile.ZipFile(io.BytesIO(pr)); mf = next((n for n in z.namelist() if n.startswith('mcap')), None)
            if mf:
                for r in csv.DictReader(io.StringIO(z.read(mf).decode('utf-8', 'replace'))):
                    r = {k.strip(): (v or '').strip() for k, v in r.items() if k}
                    if r.get('Symbol') in meta and r.get('Series') in ('EQ', 'BE'): meta[r['Symbol']]['mcap'] = round((num(r.get('Market Cap(Rs.)')) or 0) / 1e7)
    save('nse500_meta', {'date': last, 'companies': meta})
    print(f'Nifty 500: {len(meta)} companies, {len(have) + sum(len(m) for m in months.values())} days, latest {last}')

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
       'NE.IMP.GNFS.ZS': ('Imports of goods and services', '% of GDP'), 'NE.GDI.TOTL.ZS': ('Gross capital formation', '% of GDP'),
       'BN.CAB.XOKA.GD.ZS': ('Current account balance (World Bank)', '% of GDP'), 'DT.DOD.DECT.GN.ZS': ('External debt stocks', '% of GNI'), 'DT.DOD.DSTC.IR.ZS': ('Short-term external debt', '% of total reserves'),
       'DT.TDS.DECT.EX.ZS': ('External debt service', '% of exports and primary income'), 'BX.PEF.TOTL.CD.WD': ('Portfolio equity, net inflows', 'US$'), 'FI.RES.TOTL.CD': ('Total reserves including gold', 'US$'),
       'BX.GSR.NFSV.CD': ('Service exports', 'US$')}
def imf_wdi():
    out = {'imf': {}, 'wdi': {}, 'countries': PEERS}
    for code, (label, unit) in IMF.items():
        j = json.loads(get(f'https://www.imf.org/external/datamapper/api/v1/{code}/{"/".join(PEERS)}'))
        vals = j.get('values', {}).get(code, {})
        out['imf'][code] = {'label': label, 'unit': unit, 'data': {c: {y: v for y, v in vals.get(c, {}).items() if int(y) >= 1990} for c in PEERS}}
        time.sleep(0.4)
    prev = json.load(open(os.path.join(OUT, 'macro_world.json'))) if os.path.exists(os.path.join(OUT, 'macro_world.json')) else {}
    # Keep the WEO labelling stable when DataMapper returns the same vintage.
    latest_year = max(out['imf']['NGDP_RPCH']['data']['IND'])
    previous_year = max(prev.get('imf', {}).get('NGDP_RPCH', {}).get('data', {}).get('IND', {}), default='')
    out['imfVintageYear'] = prev.get('imfVintageYear', 2026) if latest_year == previous_year else int(latest_year) - 5
    for code, (label, unit) in WDI.items():
        try: j = json.loads(get(f'https://api.worldbank.org/v2/country/{";".join(PEERS)}/indicator/{code}?format=json&per_page=2000&date=1990:2030', timeout=120))
        except Exception as e:
            print('  WDI', code, 'failed, keeping cached:', e)
            if code in prev.get('wdi', {}): out['wdi'][code] = prev['wdi'][code]
            continue
        data = {}
        for r in (j[1] if len(j) > 1 and j[1] else []):
            if r['value'] is not None: data.setdefault(r['countryiso3code'], {})[r['date']] = r['value']
        out['wdi'][code] = {'label': label, 'unit': unit, 'data': data}
        time.sleep(0.4)
    save('macro_world', out)
    print('IMF/WDI:', len(out['imf']), len(out['wdi']), 'India growth', {k: v for k, v in out['imf']['NGDP_RPCH']['data']['IND'].items() if k in ('2025', '2026')})


# ------------------------------------------------------------------ RBI Weekly Statistical Supplement: foreign exchange reserves (weekly since the late 1990s)
RBI = 'https://www.rbi.org.in/Scripts/'
MONTHS = {m: i + 1 for i, m in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])}
def _rbi_date(t):
    m = re.search(r'As on\s+([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})', t) or re.search(r'As on\s+(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})', t)
    if not m: return None
    a, b, y = m.groups()
    mon, day = (a, b) if a[:1].isalpha() else (b, a)
    k = MONTHS.get(mon[:3].lower())
    return f'{int(y):04d}-{k:02d}-{int(day):02d}' if k else None
def _rbi_row(t, label):
    m = re.search('(?:' + label + r')[^|]*\|\s*([-\d.,]+)\s*\|\s*([-\d.,]+)', t)
    if not m: return None
    try: return float(m.group(2).replace(',', ''))
    except ValueError: return None
def rbi_fx(limit=150):
    path = os.path.join(OUT, 'rbi_fx.json')
    cache = json.load(open(path)) if os.path.exists(path) else {'source': 'RBI Weekly Statistical Supplement, Table 2: Foreign Exchange Reserves (US$ million)', 'weeks': {}, 'seen': []}
    seen = set(cache.get('seen', []))
    idx = get(RBI + 'WSSViewDetail.aspx?TYPE=Section&PARAM1=2', timeout=90).decode('utf-8', 'replace')
    ids = re.findall(r'WSSView.aspx\?Id=(\d+)>Foreign Exchange Reserves', idx)
    todo = [i for i in ids if i not in seen][: limit or None]
    for n, i in enumerate(todo):
        try: h = get(RBI + f'WSSView.aspx?Id={i}', timeout=60).decode('utf-8', 'replace')
        except Exception as e: print('  skip', i, e); continue
        k = h.find('Foreign Exchange Reserves'); t = re.sub(r'<(td|th)[^>]*>', '|', h[k:k + 30000]); t = re.sub(r'<[^>]+>', ' ', t).replace('&nbsp;', ' ')
        t = re.sub(r'[ \t\r\n]+', ' ', t)
        d = _rbi_date(t)
        if d:
            row = {'total': _rbi_row(t, r'Total Reserves'), 'fca': _rbi_row(t, r'Foreign Currency Assets'), 'gold': _rbi_row(t, r'\|\s*1\.2\s*Gold|Gold'), 'sdr': _rbi_row(t, r'SDRs'), 'rtp': _rbi_row(t, r'Reserve (?:Tranche )?Position')}
            if row['total']: cache['weeks'][d] = row
        seen.add(i)
        if n % 50 == 49: cache['seen'] = sorted(seen); json.dump(cache, open(path, 'w')); print(f'  rbi_fx {n + 1}/{len(todo)}')
        time.sleep(0.25)
    cache['seen'] = sorted(seen); cache['weeks'] = dict(sorted(cache['weeks'].items()))
    json.dump(cache, open(path, 'w'), separators=(',', ':'))
    w = cache['weeks']; print('RBI FX reserves:', len(w), 'weeks', (min(w), max(w)) if w else '')

# RBI WSS Tables 3 and 7 (fortnightly): bank deposits and credit, and money supply. Outstanding as on the reporting fortnight; growth is year on year.
def _first_num(t, label):
    m = re.search('(?:' + label + ')', t)
    if not m: return None
    for cell in t[m.end():].split('|')[1:6]:
        c = cell.strip().replace(',', '')
        if re.fullmatch(r'-?\d+(\.\d+)?', c): return float(c)
    return None
def _wss_page(i, key):
    h = get(RBI + f'WSSView.aspx?Id={i}', timeout=60).decode('utf-8', 'replace')
    k = h.find(key); t = re.sub(r'<(td|th)[^>]*>', '|', h[k:k + 30000]); t = re.sub(r'</tr>', '\n', t); t = re.sub(r'<[^>]+>', ' ', t).replace('&nbsp;', ' ').replace('&lsquo;', "'").replace('&rsquo;', "'")
    return re.sub(r'[ \t]+', ' ', t)
def _fortnight(t):
    iss = re.search(r'Date\s*:\s*([A-Za-z]{3})\w*\.?\s+(\d{1,2}),\s*(\d{4})', t)
    m = re.search(r'Outstanding as on\s+([A-Za-z]{3})\w*\.?\s+(\d{1,2}),\s*(\d{4})', t)
    if m: return f'{int(m.group(3)):04d}-{MONTHS[m.group(1).lower()]:02d}-{int(m.group(2)):02d}'
    if not iss: return None
    # money stock table: "| Mar. 31 | Oct. 15 |" with the year on the row above; the second date is the reporting fortnight
    ds = re.findall(r'\|\s*([A-Z][a-z]{2})\.?\s+(\d{1,2})\s*(?=\|)', t[:3000])
    if len(ds) < 2: return None
    mon, day = MONTHS[ds[1][0].lower()], int(ds[1][1]); iy, im = int(iss.group(3)), MONTHS[iss.group(1).lower()]
    return f'{iy - (1 if mon > im else 0):04d}-{mon:02d}-{day:02d}'
def rbi_money(limit=150):
    path = os.path.join(OUT, 'rbi_money.json')
    cache = json.load(open(path)) if os.path.exists(path) else {'source': 'RBI Weekly Statistical Supplement, Table 3 (Scheduled Commercial Banks, business in India) and Table 7 (Money Stock), fortnightly; ₹ crore and per cent', 'fortnights': {}, 'seen': []}
    seen = set(cache.get('seen', []))
    for sec, key in [(3, 'Scheduled Commercial Banks - Business in India'), (7, 'Money Stock')]:
        idx = get(RBI + f'WSSViewDetail.aspx?TYPE=Section&PARAM1={sec}', timeout=90).decode('utf-8', 'replace')
        ids = [i for i in re.findall(r'WSSView.aspx\?Id=(\d+)>', idx) if f'{sec}:{i}' not in seen][: limit or None]
        for n, i in enumerate(ids):
            try: t = _wss_page(i, key)
            except Exception as e: print('  skip', i, e); continue
            d = _fortnight(t)
            if d:
                row = cache['fortnights'].setdefault(d, {})
                if sec == 3:
                    row.update({k: v for k, v in {'deposits': _first_num(t, r'2\.1 Aggregate Deposits'), 'deposits_yoy': _last_num(t, r'2\.1a Growth \(Per cent\)'), 'credit': _first_num(t, r'\|\s*7 Bank Credit'),
                                'credit_yoy': _last_num(t, r'7\.1a Growth \(Per cent\)'), 'nonfood': _first_num(t, r'7a\.2 Non-food credit'), 'gsec': _first_num(t, r'6\.1 Government Securities')}.items() if v is not None})
                else:
                    row.update({k: v for k, v in {'m3': _nth_num(t, r'\|\s*M3\s', 1), 'm3_yoy': _last_num(t, r'\|\s*M3\s'), 'cic_yoy': _last_num(t, r'1\.1 Currency with the Public'), 'bccs_yoy': _last_num(t, r'2\.2 Bank Credit to Commercial Sector')}.items() if v is not None})
            seen.add(f'{sec}:{i}')
            if n % 50 == 49: cache['seen'] = sorted(seen); json.dump(cache, open(path, 'w')); print(f'  rbi_money s{sec} {n + 1}/{len(ids)}')
            time.sleep(0.25)
    cache['seen'] = sorted(seen); cache['fortnights'] = dict(sorted((k, v) for k, v in cache['fortnights'].items() if v))
    json.dump(cache, open(path, 'w'), separators=(',', ':'))
    f = cache['fortnights']; print('RBI money and credit:', len(f), 'fortnights', (min(f), max(f)) if f else '')
def _nth_num(t, label, n):
    m = re.search('(?:' + label + ')', t)
    if not m: return None
    vals = [c.strip().replace(',', '') for c in t[m.end():].split('|')[1:8]]
    vals = [float(c) for c in vals if re.fullmatch(r'-?\d+(\.\d+)?', c)]
    return vals[n] if len(vals) > n else None

# MoSPI eSankhyiki API (no key): Index of Industrial Production, monthly, general index, sectors and use-based groups.
# Growth is year on year; where two base years overlap the newest base is kept.
MOSPI = 'https://api.mospi.gov.in/api/'
def mospi_pages(path, params):
    out, page = [], 1
    while True:
        j = json.loads(get(MOSPI + path + '?' + urllib.parse.urlencode({**params, 'limit': 200, 'page': page}), timeout=90))
        out += j.get('data') or []
        if page >= (j.get('meta_data') or {}).get('totalPages', 1): return out
        page += 1; time.sleep(0.3)
def cpi_mospi():
    """All-India CPI (2012=100) from MoSPI's API: every sector (rural/urban/combined), group and subgroup, Jan 2011 to Dec 2025.
    The 2024-base series that started in 2026 is not in the API yet; its releases are in data/tape.json."""
    path = os.path.join(OUT, 'cpi_hist.json')
    have = json.load(open(path)) if os.path.exists(path) else {}
    if have.get('last', '') >= '2025-12': print('CPI history: complete to', have['last']); return
    rows = []
    for yr in range(2011, 2026):
        try: rows += mospi_pages('cpi/getCPIIndex', {'base_year': 2012, 'year': yr, 'state_code': 99, 'Format': 'JSON'})
        except Exception as e: print('  CPI', yr, e)
    mi = {m: i + 1 for i, m in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'])}
    ser = {}
    for r in rows:
        if r.get('state') != 'All India' or r.get('month') not in mi: continue
        k = f"{r.get('sector')}|{r.get('group')}|{r.get('subgroup')}"
        d = f"{r['year']}-{mi[r['month']]:02d}"
        ser.setdefault(k, {})[d] = [num(str(r.get('index'))), num(str(r.get('inflation')))]
    out = {'source': 'MoSPI CPI (base 2012=100) via api.mospi.gov.in, All India', 'series': {k: sorted([[d, *v] for d, v in s_.items()]) for k, s_ in ser.items()}}
    out['last'] = max((v[-1][0] for v in out['series'].values()), default='')
    json.dump(out, open(path, 'w'), separators=(',', ':'))
    print('CPI history:', len(rows), 'rows,', len(out['series']), 'series, to', out['last'])

def iip():
    MON = {m: i + 1 for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'])}
    series = {}
    for typ in ['General', 'Sectoral', 'Use-based category']:
        for r in mospi_pages('iip/getIIPMonthly', {'type': typ}):
            if r.get('sub_category') or r.get('month') not in MON: continue
            name = {'Mining & Quarrying': 'Mining', 'Electricity & Gas Supply': 'Electricity'}.get(r['category'], r['category']).replace('Infrastructure/ Construction', 'Infrastructure/construction')
            if name in ('Basic Goods', 'Water Supply, Sewerage & Waste Management'): continue
            d = f"{int(r['year']):04d}-{MON[r['month']]:02d}-01"; by = r['base_year']
            s = series.setdefault(name, {'type': typ, 'pts': {}})
            old = s['pts'].get(d)
            if old and old['base'] >= by: continue
            try: s['pts'][d] = {'base': by, 'index': float(r['index']) if r.get('index') not in (None, '') else None, 'growth': float(r['growth_rate']) if r.get('growth_rate') not in (None, '', 'NA') else None}
            except ValueError: pass
    for s in series.values(): s['pts'] = dict(sorted(s['pts'].items()))
    if series: save('iip', {'source': 'MoSPI, Index of Industrial Production (eSankhyiki API); growth is year on year', 'series': series})
    print('IIP:', {k: list(v['pts'].items())[-1] for k, v in series.items() if k == 'General'}, len(series), 'series')

# data.gov.in (needs DATA_GOV_IN_KEY, a GitHub secret the site owner creates; skipped without it).
# Daily mandi prices: all-India average modal price, ₹ per quintal, for the vegetables that drive food inflation.
# data.gov.in only answers Indian IPs, so GitHub can't call it. A Cloudflare function (functions/api/ogd)
# refreshes each dataset whenever a page view is served from an Indian data centre and keeps it in KV;
# here we read that store and save compact files.
OGD = 'https://kakistocrat.pages.dev/api/ogd/'
def _ogd_rows(name):
    meta = json.loads(get(OGD + name, timeout=60))
    if not meta.get('fetched'): return meta, None
    rows = []
    for i in range(meta.get('pages') or 0):
        rows += json.loads(get(f'{OGD}{name}?page={i}', timeout=90)).get('records') or []
    return meta, rows
def _f(x):
    try: return float(str(x).replace(',', ''))
    except (TypeError, ValueError): return None
def _k(r, *names):
    low = {k.lower().strip('_ '): v for k, v in r.items()}
    for n in names:
        if n.lower() in low: return low[n.lower()]
def ogd():
    os.makedirs('data/ogd', exist_ok=True)
    for _ in range(16):   # each call refreshes the stalest dataset (the function runs in Mumbai, so data.gov.in answers)
        try:
            r = json.loads(get(OGD + 'refresh', timeout=120))
            print('  ogd refresh', r.get('did') or r)
            if not r.get('due'): break
        except Exception as e: print('  ogd refresh error', e); break
    got = {}
    for name in ['mandi', 'aqi', 'wpi', 'core8', 'petcons', 'pettrade', 'crudeprod', 'refprod', 'steel', 'msme', 'mgnrega', 'fci']:
        try: meta, rows = _ogd_rows(name)
        except Exception as e: print('  ogd', name, 'error', e); continue
        if rows is None: print('  ogd', name, 'not fetched yet'); continue
        src = {'source': f"data.gov.in resource {meta['rid']} ({meta.get('note','')})", 'fetched': meta['fetched']}
        if name == 'mandi':   # all-India mean of modal prices per commodity per day; per-state for the CPI-sensitive ones
            path = os.path.join(OUT, 'mandi.json')
            cache = json.load(open(path)) if os.path.exists(path) else {'days': {}}
            cache['source'] = 'Agmarknet via data.gov.in; all-India mean of market modal prices, ₹/quintal'
            by, st = {}, {}
            for r in rows:
                try: d = dt.datetime.strptime(r['arrival_date'], '%d/%m/%Y').date().isoformat(); p = float(r['modal_price'])
                except (KeyError, ValueError): continue
                c = r.get('commodity', '').strip().lower()
                by.setdefault((d, c), []).append(p)
                if c in ('onion', 'tomato', 'potato'): st.setdefault((d, c, r.get('state', '')), []).append(p)
            for (d, c), v in by.items():
                if len(v) >= 5: cache['days'].setdefault(d, {})[c] = {'price': round(sum(v) / len(v)), 'markets': len(v)}
            cache['days'] = dict(sorted(cache['days'].items())[-400:])
            cache['states'] = {}
            for (d, c, s_), v in st.items(): cache['states'].setdefault(c, {}).setdefault(d, {})[s_] = round(sum(v) / len(v))
            for c in cache['states']: cache['states'][c] = dict(sorted(cache['states'][c].items())[-1:])
            json.dump(cache, open(path, 'w'), separators=(',', ':'), sort_keys=True); got[name] = len(rows); continue
        if name == 'aqi':     # one row per city: mean PM2.5 and PM10 across stations
            cities = {}
            for r in rows:
                pol = r.get('pollutant_id'); v = _f(r.get('avg_value'))
                if pol not in ('PM2.5', 'PM10') or v is None: continue
                c = cities.setdefault((r.get('state'), r.get('city')), {'state': r.get('state'), 'city': r.get('city'), 'lat': _f(r.get('latitude')), 'lon': _f(r.get('longitude')), 'PM2.5': [], 'PM10': [], 'at': r.get('last_update')})
                c[pol].append(v)
            out = [{**{k: v for k, v in c.items() if k not in ('PM2.5', 'PM10')}, 'pm25': round(sum(c['PM2.5']) / len(c['PM2.5'])) if c['PM2.5'] else None, 'pm10': round(sum(c['PM10']) / len(c['PM10'])) if c['PM10'] else None, 'stations': max(len(c['PM2.5']), len(c['PM10']))} for c in cities.values()]
            json.dump({**src, 'cities': sorted(out, key=lambda x: -(x['pm25'] or 0))}, open('data/ogd/aqi.json', 'w'), separators=(',', ':')); got[name] = len(out); continue
        if name == 'mgnrega':
            keep = ['fin_year', 'month', 'state_name', 'district_name', 'Total_Households_Worked', 'Total_Individuals_Worked', 'Persondays_of_Central_Liability_so_far', 'Women_Persondays', 'Average_Wage_rate_per_day_per_person', 'Average_days_of_employment_provided_per_Household', 'Total_Exp', 'Total_No_of_Active_Workers', 'percentage_payments_gererated_within_15_days']
            rows = [{k: r.get(k) for k in keep} for r in rows]
        if name == 'fci':     # latest date: stock by commodity, tonnes
            last = max((r.get('Date') or '') for r in rows)
            agg = {}
            for r in rows:
                if r.get('Date') == last: agg[r.get('Commodity_name')] = agg.get(r.get('Commodity_name'), 0) + (_f(r.get('Stock')) or 0)
            path = 'data/ogd/fci.json'; cache = json.load(open(path)) if os.path.exists(path) else {'days': {}}
            cache.update(src); cache['days'][last] = {k: round(v) for k, v in agg.items()}
            json.dump(cache, open(path, 'w'), separators=(',', ':'), sort_keys=True); got[name] = len(agg); continue
        json.dump({**src, 'fields': list(rows[0].keys()) if rows else [], 'rows': rows}, open(f'data/ogd/{name}.json', 'w'), separators=(',', ':'))
        got[name] = len(rows)
    print('data.gov.in via Cloudflare relay:', got)

# India monthly activity from FRED (OECD Main Economic Indicators, seasonally adjusted, US$)
FRED_LONG = {'DEXINUS': 'inr_long'}  # long daily history for episode comparisons
FRED_IN = {'XTEXVA01INM667S': ('India merchandise exports, monthly (seasonally adjusted)', 'US$'), 'XTIMVA01INM667S': ('India merchandise imports, monthly (seasonally adjusted)', 'US$')}
def india_monthly():
    out = {}
    for sid, (label, unit) in FRED_IN.items():
        raw = get(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd=2010-01-01')
        pts = [[r[0], num(r[1])] for r in csv.reader(io.StringIO(raw.decode())) if len(r) == 2 and r[0][:2] in ('19', '20') and num(r[1]) is not None]
        if pts: out[sid] = {'label': label, 'unit': unit, 'pts': pts}
        time.sleep(0.3)
    if out: save('india_monthly', out)
    for sid, name in FRED_LONG.items():
        raw = get(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd=2005-01-01')
        pts = [[r[0], num(r[1])] for r in csv.reader(io.StringIO(raw.decode())) if len(r) == 2 and r[0][:2] in ('19', '20') and num(r[1]) is not None]
        if pts: save(name, {'source': f'FRED {sid}', 'pts': pts})
    print('India monthly (FRED):', {k: v['pts'][-1] for k, v in out.items()})

# RBI WSS Table 4 (Ratios and Rates): money-market and bond rates, the RBI/FBIL rupee reference rate and forward premia; we keep the latest week on each page
RATE_ROWS = {'call': r'Call Money Rate[^|]*', 'tb91': r'91[- ]Day Treasury Bill[^|]*', 'tb364': r'364[- ]Day Treasury Bill[^|]*', 'gsec10': r'10[- ]Year (?:G-Sec|Government Securities)[^|]*',
             'inr': r'INR[- ]US\$ Spot Rate[^|]*|Rupee[- ]US Dollar[^|]*|Reference Rate[^|]*US\$[^|]*', 'fwd1m': r'Forward Premia of US\$ 1-month', 'fwd3m': r'\|\s*3-month', 'fwd6m': r'\|\s*6-month', 'crr': r'Cash Reserve Ratio', 'repo': r'Policy Repo Rate|Repo Rate'}
def _last_num(t, label):
    m = re.search('(?:' + label + ')', t)
    if not m: return None
    vals = []
    for cell in t[m.end():].split('|')[1:40]:
        c = cell.strip()
        if re.search(r'[A-Za-z]', c): break
        if c: vals.append(c)
    if not vals: return None
    try: return float(vals[-1].split('/')[0].replace(',', ''))
    except ValueError: return None
def rbi_rates(limit=150):
    path = os.path.join(OUT, 'rbi_rates.json')
    cache = json.load(open(path)) if os.path.exists(path) else {'source': 'RBI Weekly Statistical Supplement, Table 4: Ratios and Rates (latest week on each issue)', 'weeks': {}, 'seen': []}
    seen = set(cache.get('seen', []))
    idx = get(RBI + 'WSSViewDetail.aspx?TYPE=Section&PARAM1=4', timeout=90).decode('utf-8', 'replace')
    ids = re.findall(r'WSSView.aspx\?Id=(\d+)>', idx)
    todo = [i for i in ids if i not in seen][: limit or None]
    for n, i in enumerate(todo):
        try: h = get(RBI + f'WSSView.aspx?Id={i}', timeout=60).decode('utf-8', 'replace')
        except Exception as e: print('  skip', i, e); continue
        k = h.find('Ratios and Rates'); t = re.sub(r'<(td|th)[^>]*>', '|', h[k:k + 40000]); t = re.sub(r'</tr>', '\n', t); t = re.sub(r'<[^>]+>', ' ', t).replace('&nbsp;', ' ').replace('&#8377;', '₹')
        lines = [re.sub(r'[ \t\r]+', ' ', l) for l in t.split('\n')]
        d = None
        for j, l in enumerate(lines):
            if re.search(r'Week Ended', l):
                yrs = re.findall(r'(19\d\d|20\d\d)', l); ds = re.findall(r'([A-Z][a-z]{2})\.?\s*(\d{1,2})', lines[j + 1] if j + 1 < len(lines) else '')
                if yrs and ds:
                    mon, day = ds[-1]; kk = MONTHS.get(mon.lower())
                    if kk: d = f'{int(yrs[-1]):04d}-{kk:02d}-{int(day):02d}'
                break
        body = ' '.join(lines)
        if d:
            row = {key: _last_num(body, rx_) for key, rx_ in RATE_ROWS.items()}
            if any(v is not None for v in row.values()): cache['weeks'][d] = row
        seen.add(i)
        if n % 50 == 49: cache['seen'] = sorted(seen); json.dump(cache, open(path, 'w')); print(f'  rbi_rates {n + 1}/{len(todo)}')
        time.sleep(0.25)
    cache['seen'] = sorted(seen); cache['weeks'] = dict(sorted(cache['weeks'].items()))
    json.dump(cache, open(path, 'w'), separators=(',', ':'))
    w = cache['weeks']; print('RBI rates:', len(w), 'weeks', (min(w), max(w)) if w else '')

# ------------------------------------------------------------------ UN Comtrade (public preview API): India's goods trade by partner and by HS chapter
CT = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS'
def comtrade():
    ref = json.loads(get('https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json', timeout=90))['results']
    iso = {r['id']: (r.get('PartnerCodeIsoAlpha3'), r['text']) for r in ref}
    hs = {r['id']: r['text'] for r in json.loads(get('https://comtradeapi.un.org/files/v1/app/reference/HS.json', timeout=120))['results'] if r.get('aggrLevel') == 2}
    this = dt.date.today().year; years = list(range(2015, this))
    out = {'source': 'UN Comtrade (reported by India), goods trade, US$', 'years': [], 'world': {'X': {}, 'M': {}}, 'partners': {}, 'chapters': {}, 'partnerChapters': {}}
    def q(**kw):
        u = CT + '?' + urllib.parse.urlencode({'reporterCode': 699, 'customsCode': 'C00', 'motCode': 0, 'partner2Code': 0, **kw})
        for k in range(3):
            try:
                j = json.loads(get(u, timeout=90)); time.sleep(1.3); return j.get('data') or []
            except Exception as e: print('  comtrade retry', kw, e); time.sleep(5)
        return []
    for y in years:
        got = False
        for fl in ('X', 'M'):
            for r in q(period=y, flowCode=fl, cmdCode='TOTAL'):
                v = r['primaryValue']; pc = r['partnerCode']
                if pc == 0: out['world'][fl][str(y)] = v; got = True; continue
                a3, name = iso.get(pc, (None, None))
                if not a3 or a3.startswith('_') or a3 in ('W00', 'X1', 'XX'): continue
                p = out['partners'].setdefault(a3, {'name': name, 'X': {}, 'M': {}}); p[fl][str(y)] = v
        if got: out['years'].append(y)
    ly = str(out['years'][-1]) if out['years'] else None
    if ly:
        for fl in ('X', 'M'):
            out['chapters'][fl] = {r['cmdCode']: r['primaryValue'] for r in q(period=ly, partnerCode=0, flowCode=fl, cmdCode='AG2')}
        out['chapterNames'] = {k: v.split(' - ', 1)[-1] for k, v in hs.items() if k in set(out['chapters'].get('X', {})) | set(out['chapters'].get('M', {}))}
        top = sorted(out['partners'], key=lambda a: -(out['partners'][a]['X'].get(ly, 0) + out['partners'][a]['M'].get(ly, 0)))[:15]
        inv = {v[0]: k for k, v in iso.items() if v[0]}
        for a in top:
            out['partnerChapters'][a] = {fl: {r['cmdCode']: r['primaryValue'] for r in q(period=ly, partnerCode=inv[a], flowCode=fl, cmdCode='AG2')} for fl in ('X', 'M')}
    save('trade', out)
    print('Comtrade:', out['years'], len(out['partners']), 'partners')

# ------------------------------------------------------------------ IMF WEO for every country (India vs the world rankings)
WORLD_IND = {'NGDPD': ('GDP', 'US$ billion'), 'PPPGDP': ('GDP at purchasing power parity', 'int$ billion'), 'NGDPDPC': ('GDP per person', 'US$'),
             'PPPPC': ('GDP per person at purchasing power parity', 'int$'), 'NGDP_RPCH': ('Real GDP growth', '%'), 'PCPIPCH': ('Inflation, average consumer prices', '%'),
             'LP': ('Population', 'million'), 'GGXWDG_NGDP': ('Government gross debt', '% of GDP'), 'GGXCNL_NGDP': ('Government net lending/borrowing', '% of GDP'),
             'BCA_NGDPD': ('Current account balance', '% of GDP')}
def imf_world():
    cj = json.loads(get('https://www.imf.org/external/datamapper/api/v1/countries'))['countries']
    data = {}
    for ind in WORLD_IND:
        j = json.loads(get(f'https://www.imf.org/external/datamapper/api/v1/{ind}', timeout=60))['values'][ind]
        data[ind] = {iso: {y: (round(v, 3) if abs(v) < 1000 else round(v, 1)) for y, v in ser.items() if v is not None and 1990 <= int(y) <= 2031} for iso, ser in j.items() if iso in cj}
        time.sleep(1)
    out = {'source': 'IMF World Economic Outlook via the DataMapper API', 'indicators': {k: {'label': a, 'unit': b} for k, (a, b) in WORLD_IND.items()},
           'countries': {iso: v['label'] for iso, v in cj.items() if any(iso in data[i] for i in data)}, 'data': data}
    save('imf_world', out)
    print('IMF world:', len(out['countries']), 'countries')


# ------------------------------------------------------------------ IMF PortWatch: daily transit calls through maritime chokepoints (AIS-based)
PW = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query'
CHOKE = ['Strait of Hormuz', 'Bab el-Mandeb Strait', 'Suez Canal', 'Cape of Good Hope', 'Malacca Strait']
def portwatch():
    out = {}
    for name in CHOKE:
        rows, off = [], 0
        while True:
            q = urllib.parse.urlencode({'where': f"portname='{name}' AND date >= DATE '2023-01-01'", 'outFields': 'date,n_total,n_tanker,n_container,n_dry_bulk,capacity,capacity_tanker',
                                        'orderByFields': 'date', 'resultOffset': off, 'resultRecordCount': 1000, 'f': 'json'})
            j = json.loads(get(f'{PW}?{q}', timeout=60)); feats = [f['attributes'] for f in j.get('features', [])]
            rows += feats; off += len(feats)
            if not j.get('exceededTransferLimit') or not feats: break
        if not rows: continue
        out[name] = {k: [r.get(src) for r in rows] for k, src in [('d', 'date'), ('total', 'n_total'), ('tanker', 'n_tanker'), ('container', 'n_container'), ('bulk', 'n_dry_bulk'), ('cap', 'capacity'), ('capT', 'capacity_tanker')]}
        time.sleep(1)
    if out: save('portwatch', {'source': 'IMF PortWatch, Daily Chokepoint Transit Calls and Trade Volume Estimates', 'chokepoints': out})
    print('PortWatch:', {k: (v['d'][-1], v['total'][-1]) for k, v in out.items()})

if __name__ == '__main__':
    steps = [('fred', fred), ('fx', fx), ('worldbank', worldbank), ('crypto', crypto), ('imf_wdi', imf_wdi), ('portwatch', portwatch), ('imf_world', imf_world), ('rbi_fx', rbi_fx), ('rbi_rates', rbi_rates), ('rbi_money', rbi_money), ('india_monthly', india_monthly), ('iip', iip), ('cpi_mospi', cpi_mospi), ('ogd', ogd), ('nse500', nse500), ('comtrade', comtrade)]
    if '--quick' in sys.argv:  # Cloudflare builds: just the fast daily sources; the GitHub workflow refreshes and commits everything else
        steps = [(n, f) for n, f in steps if n in ('fred', 'fx', 'crypto', 'portwatch')] + [('nse500', lambda: nse500(days=3))]
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
