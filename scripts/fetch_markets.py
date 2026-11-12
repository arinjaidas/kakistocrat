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
    steps = [('fred', fred), ('fx', fx), ('worldbank', worldbank), ('crypto', crypto), ('imf_wdi', imf_wdi), ('portwatch', portwatch), ('imf_world', imf_world), ('rbi_fx', rbi_fx), ('rbi_rates', rbi_rates), ('comtrade', comtrade)]
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
