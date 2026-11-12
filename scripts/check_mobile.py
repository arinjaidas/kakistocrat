# Loads the main pages at phone width and fails if any page scrolls sideways or throws a script error.
# Usage: python3 scripts/check_mobile.py http://localhost:8811
import sys, asyncio, os
from playwright.async_api import async_playwright
PAGES = ['/', '/desk/', '/markets/', '/companies/', '/commodities/', '/terminal/', '/economy/', '/economy/prices/', '/economy/budget/', '/external/', '/trade/', '/hormuz/',
         '/states/', '/districts/', '/world/', '/what-if/', '/what-if/pump-price/', '/charts/', '/explore/', '/stories/hormuz/', '/s/fx-usdinr/', '/state/kerala/', '/country/china/', '/company/hdfcbank/', '/topic/trade-external-sector/', '/research/oil-rupee/']

async def check_scenario(pg, base):
    await pg.goto(base + '/what-if/', wait_until='domcontentloaded')
    delta = pg.locator('#o-pump-s')
    await delta.wait_for()
    initial = await delta.inner_text()
    if not initial.startswith('₹0.00 per litre'):
        return 'default calculation does not match the published baseline'
    fx = pg.locator('#sx-inr')
    baseline_fx = float(await fx.input_value())
    await pg.get_by_role('button', name='Rupee at 100', exact=True).click()
    if float(await fx.input_value()) != 100:
        return 'rupee preset did not set the exchange rate'
    test_fx = 101 if abs(baseline_fx - 100) < 0.05 else 100
    await fx.fill(str(test_fx))
    await pg.locator('#sx-pass').fill('50')
    shocked = await delta.inner_text()
    expected_sign = '+₹' if test_fx > baseline_fx else '−₹'
    if not shocked.startswith(expected_sign):
        return 'a change in the exchange rate moved the fuel price in the wrong direction'
    await pg.reload(wait_until='domcontentloaded')
    if await delta.inner_text() != shocked:
        return 'the shared URL did not restore the scenario'
    await pg.get_by_role('button', name='Reset baseline').click()
    if await delta.inner_text() != initial or await pg.locator('#sx-pass').input_value() != '100':
        return 'reset did not restore all baseline inputs'

async def main(base):
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.getenv('KAKISTOCRAT_CHROMIUM')); pg = await b.new_page(viewport={'width': 360, 'height': 780})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        for u in PAGES:
            errs.clear()
            try: await pg.goto(base + u, wait_until='networkidle', timeout=45000)
            except Exception as e: bad.append((u, f'load: {e}'[:120])); continue
            await pg.wait_for_timeout(700)
            w = await pg.evaluate('document.documentElement.scrollWidth')
            if w > 365: bad.append((u, f'scrolls sideways: {w}px wide'))
            if errs: bad.append((u, 'script error: ' + errs[0][:120]))
        try:
            scenario_problem = await check_scenario(pg, base)
            if scenario_problem: bad.append(('/what-if/', scenario_problem))
        except Exception as e:
            bad.append(('/what-if/', f'calculator test: {e}'[:150]))
        await b.close()
    print(f'Mobile: {len(PAGES)} pages, {len(bad)} problems')
    for u, why in bad: print(' ', u, why)
    sys.exit(1 if bad else 0)
asyncio.run(main(sys.argv[1].rstrip('/')))
