import urllib.request, re
H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
def g(u):
    try: r=urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=45); return r.read().decode('utf8','replace')
    except Exception as e: return 'ERR '+str(e)[:120]
d=g('https://api.mospi.gov.in/api-docs/'); print('DOCS', re.findall(r'(?:src|href)="([^"]+)"', d)[:20]); print(d[:600])
for js in re.findall(r'src="([^"]+\.js)"', d):
    u=js if js.startswith('http') else 'https://api.mospi.gov.in/api-docs/'+js.lstrip('./')
    t=g(u); print('JS',u,len(t)); print(' urls:', sorted(set(re.findall(r'["\'](/api/[a-zA-Z0-9_/]+)["\']', t)))[:200]); print(' spec:', re.findall(r'url\s*:\s*["\']([^"\']+)', t)[:5])
f=g('https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx'); i=f.find('<table'); print('NSDL', re.sub(r'\s+',' ',re.sub(r'<[^>]+>','|',f[i:i+6000]))[:1800])
a=g('https://www.amfiindia.com/research-information/amfi-monthly'); print('AMFI', re.findall(r'href="([^"]+(?:xls|xlsx)[^"]*)"', a, re.I)[:6])
