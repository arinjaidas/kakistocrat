import urllib.request, json, ssl
def g(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=60); b=r.read(); return r.status, b[:700].decode('utf8','replace'), len(b)
    except Exception as e: return 'ERR', str(e)[:200], 0
for u in ['https://api.mospi.gov.in/api/cpi/getCPIIndex?base_year=2012&year=2024&month_code=1&state_code=99&sector_code=3&Format=JSON',
          'https://api.mospi.gov.in/api/cpi/getCPIIndex?base_year=2012&Format=JSON&limit=5',
          'https://api.mospi.gov.in/api/cpi/getCPIIndex?Format=JSON',
          'https://api.mospi.gov.in/api/cpi/getItemIndex?Format=JSON',
          'https://api.mospi.gov.in/api/cpi/getCPIIndex?base_year=2024&Format=JSON',
          'https://api.mospi.gov.in/api/wpi/getWpiRecords?Format=JSON',
          'https://api.mospi.gov.in/api/nas/getNASData?Format=JSON',
          'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPALTT01INM659N',
          'https://fred.stlouisfed.org/graph/fredgraph.csv?id=INDCPIALLMINMEI']:
    s,b,n=g(u); print('\n###',u,'\n',s,n,'\n',b.replace('\n',' | ')[:700])
