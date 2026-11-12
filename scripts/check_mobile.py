# Loads the main pages at phone width and fails if any page scrolls sideways or throws a script error.
# Usage: python3 scripts/check_mobile.py http://localhost:8811
import sys, asyncio
from playwright.async_api import async_playwright
PAGES = ['/', '/desk/', '/today/', '/terminal/', '/markets/', '/commodities/', '/rupee/', '/external/', '/trade/', '/hormuz/', '/world/', '/maps/', '/charts/',
         '/explore/', '/tools/', '/tools/shock-lab/', '/tools/pump-price/', '/infographics/', '/s/fx-usdinr/', '/state/kerala/', '/country/china/', '/topic/trade-external-sector/']
async def main(base):
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 390, 'height': 844})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        for u in PAGES:
            errs.clear()
            try: await pg.goto(base + u, wait_until='networkidle', timeout=45000)
            except Exception as e: bad.append((u, f'load: {e}'[:120])); continue
            await pg.wait_for_timeout(700)
            w = await pg.evaluate('document.documentElement.scrollWidth')
            if w > 395: bad.append((u, f'scrolls sideways: {w}px wide'))
            if errs: bad.append((u, 'script error: ' + errs[0][:120]))
        await b.close()
    print(f'Mobile: {len(PAGES)} pages, {len(bad)} problems')
    for u, why in bad: print(' ', u, why)
    sys.exit(1 if bad else 0)
asyncio.run(main(sys.argv[1].rstrip('/')))
