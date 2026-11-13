import urllib.request, re
H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
def g(u):
    try: r=urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=45); return r.read().decode('utf8','replace')
    except Exception as e: return 'ERR '+str(e)[:120]
t=g('https://api.mospi.gov.in/api-docs/swagger-ui-init.js'); print('INIT', t[:6000])
