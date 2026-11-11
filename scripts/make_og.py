# Renders 1200x630 social cards for the main data pages with Playwright. Output: static/og/<slug>.png
import asyncio, sys, html
from playwright.async_api import async_playwright
OUT = sys.argv[1]
CARDS = [
 ('default', 'The Kakistocrat', 'India’s economy, markets and policy in data', '#B42318'),
 ('today', 'India Today', 'The Indian economy on one screen', '#B42318'),
 ('terminal', 'Terminal', 'Every market and macro number on one screen', '#F59E0B'),
 ('markets', 'Markets', 'NSE indices, heatmap, rates, currencies and crypto', '#0F6B3A'),
 ('commodities', 'Commodities', 'Energy, metals, fertilisers and food prices', '#B45309'),
 ('rupee', 'Rupee & external sector', 'The rupee, the rate gap and India’s external accounts', '#1D4ED8'),
 ('hormuz', 'Chokepoint watch', 'Ships through Hormuz and the world’s shipping lanes', '#B42318'),
 ('charts', 'Chart workbench', 'Plot 300 Indian and global series against each other', '#0F766E'),
 ('infographics', 'India in pictures', 'The Budget rupee, the inflation basket, states as countries', '#7C3AED'),
 ('pump-price', 'Pump price', 'What’s in a litre of petrol', '#B45309'),
 ('emi', 'EMI shock calculator', 'What a repo rate change does to your home loan', '#1D4ED8'),
 ('chartle', 'Chartle', 'Guess the economic series behind today’s chart', '#0F6B3A'),
 ('budget-x-ray', 'Budget X-Ray 2026-27', 'How far the Centre has got through its Budget', '#B42318'),
 ('india-by-state', 'India by State', 'Indian states compared, with sources', '#0F766E'),
 ('api', 'Data API', 'Free JSON endpoints for every dataset on the site', '#15171A'),
]
TPL = '''<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&family=IBM+Plex+Mono:wght@500;700&display=block');
body{margin:0;width:1200px;height:630px;background:#15171A;color:#fff;font-family:'Newsreader',Georgia,serif;position:relative;overflow:hidden}
.k{position:absolute;left:72px;top:72px;font:700 22px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:ACC}
.t{position:absolute;left:72px;top:128px;right:72px;font-size:92px;line-height:1.02;letter-spacing:-.01em}
.d{position:absolute;left:72px;right:300px;top:370px;font-size:38px;line-height:1.2;color:#C9CCD1}
.b{position:absolute;left:72px;bottom:60px;font:500 22px 'IBM Plex Mono',monospace;color:#9AA0A8}.b b{color:#fff}
.bar{position:absolute;left:0;top:0;width:100%;height:10px;background:ACC}
svg{position:absolute;right:60px;bottom:50px;opacity:.9}
</style></head><body><div class="bar"></div><div class="k">KICK</div><div class="t">TITLE</div><div class="d">DESC</div>
<div class="b"><b>The Kakistocrat</b> · kakistocrat.pages.dev</div>
<svg width="260" height="140" viewBox="0 0 260 140"><polyline fill="none" stroke="ACC" stroke-width="5" points="0,120 30,104 60,110 90,82 120,90 150,60 180,70 210,36 240,44 260,18"/><polyline fill="none" stroke="#3A3E44" stroke-width="3" points="0,130 40,124 80,126 120,116 160,118 200,104 260,100"/></svg>
</body></html>'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1200, 'height': 630})
        for slug, title, desc, acc in CARDS:
            h = TPL.replace('ACC', acc).replace('KICK', 'The Kakistocrat' if slug != 'default' else 'Economics · Politics · Policy').replace('TITLE', html.escape(title)).replace('DESC', html.escape(desc))
            await pg.set_content(h, wait_until='networkidle'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'{OUT}/{slug}.png')
        await b.close()
asyncio.run(main())
