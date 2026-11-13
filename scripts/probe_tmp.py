import urllib.request, json
def g(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=60); b=r.read(); return r.status, b[:500].decode('utf8','replace'), len(b)
    except Exception as e: return 'ERR', str(e)[:150], 0
B='https://api.mospi.gov.in/api/'
for u in [B+'cpi/getCPIIndex?base_year=2024&year=2026&Format=JSON', B+'cpi/getCPIIndex?base_year=2024&year=2026&month_code=9&Format=JSON', B+'cpi/getCPIIndex?series=New&Format=JSON',
          B+'cpi/getCPIIndex?year=2026&Format=JSON', B+'cpi/getItemIndex?year=2026&Format=JSON', B+'cpi/getCPIIndex?base_year=2012&year=2025&month_code=12&state_code=27&Format=JSON',
          B+'cpi/getStateIndex?Format=JSON', B+'cpi24/getCPIIndex?Format=JSON', B+'cpi/getCPIIndex?base_year=2024&Format=JSON&limit=3',
          B+'wpi/getWpiRecords?year=2026&month_code=9&Format=JSON', B+'iip/getIIPMonthly?type=General&Format=JSON&limit=2']:
    s,b,n=g(u); print('\n###',u,'\n',s,n,b.replace('\n',' ')[:400])
