"""Post new data releases to a Telegram channel. Runs after each build in the markets workflow.
Needs two GitHub secrets the owner creates: TELEGRAM_BOT_TOKEN (from @BotFather) and TELEGRAM_CHAT_ID (e.g. @yourchannel).
Without them it does nothing. On the first run it records what is already out and posts nothing."""
import json, os, re, sys, urllib.parse, urllib.request
TOKEN, CHAT = os.environ.get('TELEGRAM_BOT_TOKEN'), os.environ.get('TELEGRAM_CHAT_ID')
if not (TOKEN and CHAT): print('notify: no Telegram secrets, skipped'); sys.exit(0)
feed = open('dist/feeds/data.xml', encoding='utf8').read()
items = re.findall(r'<item><title>(.*?)</title><link>(.*?)</link><guid[^>]*>(.*?)</guid>', feed)
path = 'data/notified.json'; seen = set(json.load(open(path))) if os.path.exists(path) else None
unesc = lambda t: t.replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&apos;', "'").replace('&amp;', '&')
new = [] if seen is None else [(t, l, g) for t, l, g in items if g not in seen]
for t, l, g in new[:8]:
    body = urllib.parse.urlencode({'chat_id': CHAT, 'text': f'{unesc(t)}\n{unesc(l)}', 'disable_web_page_preview': 'true'}).encode()
    try: urllib.request.urlopen(f'https://api.telegram.org/bot{TOKEN}/sendMessage', data=body, timeout=30); print('notify: posted', unesc(t))
    except Exception as e: print('notify: failed', e)
json.dump(sorted({g for _, _, g in items} | (seen or set())), open(path, 'w'))
print('notify:', 'initialised' if seen is None else f'{len(new)} new')
