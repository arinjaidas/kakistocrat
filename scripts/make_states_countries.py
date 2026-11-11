# Builds data/states_countries.json: each state's GSDP in US dollars next to the nearest-sized country.
# State GSDP (current prices, ₹ lakh crore) transcribed from the RBI Handbook of Statistics on Indian States 2024-25, Table 21.
# Country GDP: IMF World Economic Outlook, NGDPD (US$ billion), 2024 (India's 2024 = FY2024-25), via the DataMapper API.
# Exchange rate: average of daily Fed H.10 rupee-dollar rates, April 2024 to March 2025.
import json, sys, urllib.request
GSDP = {"Maharashtra": (45.32, "2024-25"), "Tamil Nadu": (31.19, "2024-25"), "Uttar Pradesh": (29.78, "2024-25"), "Karnataka": (28.84, "2024-25"),
 "West Bengal": (18.15, "2024-25"), "Rajasthan": (17.04, "2024-25"), "Telangana": (16.41, "2024-25"), "Andhra Pradesh": (15.93, "2024-25"),
 "Madhya Pradesh": (15.03, "2024-25"), "Kerala": (12.49, "2024-25"), "Delhi": (12.15, "2024-25"), "Haryana": (12.14, "2024-25"), "Bihar": (9.92, "2024-25"),
 "Odisha": (8.90, "2024-25"), "Punjab": (8.39, "2024-25"), "Assam": (6.44, "2024-25"), "Chhattisgarh": (5.68, "2024-25"), "Jharkhand": (5.16, "2024-25"),
 "Uttarakhand": (3.78, "2024-25"), "Jammu & Kashmir": (2.62, "2024-25"), "Himachal Pradesh": (2.32, "2024-25"), "Tripura": (0.90, "2024-25"),
 "Meghalaya": (0.60, "2024-25"), "Puducherry": (0.52, "2024-25"), "Arunachal Pradesh": (0.44, "2024-25"),
 "Gujarat": (22.03, "2022-23"), "Goa": (1.07, "2023-24"), "Manipur": (0.43, "2023-24"), "Mizoram": (0.33, "2023-24"), "Nagaland": (0.40, "2023-24"), "Sikkim": (0.49, "2023-24")}
RENAME = {"China, People's Republic of": "China", "Korea, Republic of": "South Korea", "Taiwan Province of China": "Taiwan", "Hong Kong SAR": "Hong Kong", "Türkiye, Republic of": "Turkey",
 "Russian Federation": "Russia", "Iran": "Iran", "Slovak Republic": "Slovakia", "Czech Republic": "Czechia", "Egypt": "Egypt", "Kyrgyz Republic": "Kyrgyzstan", "Lao P.D.R.": "Laos",
 "Congo, Dem. Rep. of the": "DR Congo", "Congo, Republic of ": "Republic of the Congo", "Micronesia, Fed. States of": "Micronesia", "Bahamas, The": "The Bahamas", "Gambia, The": "The Gambia",
 "Macao SAR": "Macao", "São Tomé and Príncipe": "São Tomé and Príncipe", "Syria": "Syria", "West Bank and Gaza": "West Bank and Gaza", "South Sudan, Republic of": "South Sudan", "Netherlands, The": "Netherlands"}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'kakistocrat-data/1.0'}), timeout=60))
# Optional: pass two local JSON files (NGDPD and countries) downloaded from the same API, if direct download is blocked.
if len(sys.argv) == 3: g = json.load(open(sys.argv[1]))['values']['NGDPD']; c = json.load(open(sys.argv[2]))['countries']
else: g = get('https://www.imf.org/external/datamapper/api/v1/NGDPD')['values']['NGDPD']; c = get('https://www.imf.org/external/datamapper/api/v1/countries')['countries']
cy = lambda y: sorted([(RENAME.get(c[k]['label'], c[k]['label']), round(v[y], 1)) for k, v in g.items() if k in c and k != 'IND' and v.get(y)], key=lambda x: -x[1])
countries = cy('2024')
fred = json.load(open('data/markets/fred.json'))['DEXINUS']['pts']
def fxfy(fy):  # financial-year average, e.g. '2024-25' -> Apr 2024 to Mar 2025
    a = int(fy[:4]); v = [p[1] for p in fred if f'{a}-04-01' <= p[0] <= f'{a + 1}-03-31' and p[1]]; return round(sum(v) / len(v), 2)
fx = fxfy('2024-25')
states = []
for n, (lc, yr) in GSDP.items():
    r = fxfy(yr); usd = lc * 1e12 / r / 1e9   # ₹ lakh crore -> US$ billion (1 lakh crore = 1e12 rupees), at that year's average rate
    pool = cy(yr[:4]); near = min(pool, key=lambda x: abs(x[1] - usd))
    states.append({"name": n, "gsdp": lc, "year": yr, "fx": r, "usd": round(usd, 1), "country": near[0], "countryUsd": near[1]})
states.sort(key=lambda s: -s['usd'])
out = {"checked": "2026-11-12", "fx": fx, "indiaUsd": round(g['IND']['2024'], 1), "states": states, "countries": [{"name": n, "usd": v} for n, v in countries],
  "sources": [{"name": "RBI, Handbook of Statistics on Indian States 2024-25, Table 21: Gross State Domestic Product (current prices)", "url": "https://website.rbi.org.in/kn/web/rbi/-/publications/handbook-of-statistics-on-indian-states-2025"},
              {"name": "IMF World Economic Outlook, GDP in current US dollars (NGDPD), 2024", "url": "https://www.imf.org/external/datamapper/NGDPD@WEO"},
              {"name": "Federal Reserve H.10 rupee–dollar rate, financial-year averages, via FRED", "url": "https://fred.stlouisfed.org/series/DEXINUS"}]}
json.dump(out, open('data/states_countries.json', 'w'), ensure_ascii=False, indent=1)
for s in states[:8]: print(s)
print('fx', fx, 'countries', len(countries))
