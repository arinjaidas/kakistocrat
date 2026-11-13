import urllib.request, json, re
H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36','Accept':'*/*'}
def g(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=45); b=r.read(); return r.status, b, len(b)
    except Exception as e: return 'ERR', str(e)[:140].encode(), 0
U=['https://api.mospi.gov.in/api/nas/getNASData?Format=JSON&base_year=2022-23&limit=3','https://api.mospi.gov.in/api/nas/getNASData?Format=JSON&series=Current&limit=3',
 'https://api.mospi.gov.in/api/plfs/getPLFSData?Format=JSON&limit=3','https://api.mospi.gov.in/api/plfs/getData?Format=JSON&limit=3','https://api.mospi.gov.in/api/plfs/getPLFSMonthly?Format=JSON&limit=3',
 'https://api.mospi.gov.in/api-docs/','https://api.mospi.gov.in/swagger.json','https://api.mospi.gov.in/api/swagger.json',
 'https://www.npci.org.in/what-we-do/upi/product-statistics','https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx','https://www.fpi.nsdl.co.in/web/Reports/Yearwise.aspx?RptType=6',
 'https://www.amfiindia.com/research-information/amfi-monthly','https://portal.amfiindia.com/spages/NAVAll.txt',
 'https://www.fbil.org.in/','https://www.ccilindia.com/','https://grid-india.in/en/reports/daily-psp-report','https://report.grid-india.in/',
 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx','https://rbi.org.in/Scripts/AnnualPolicy.aspx','https://www.mospi.gov.in/advance-release-calendar',
 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT','https://api.exchange.coinbase.com/products/BTC-USD/ticker','https://open.er-api.com/v6/latest/USD']
for u in U:
    s,b,n=g(u); t=b.decode('utf8','replace'); t=re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>','',t); t=re.sub(r'<[^>]+>',' ',t); t=re.sub(r'\s+',' ',t)
    print('###',u,'|',s,n,'|',t[:260])
