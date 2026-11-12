"""Social cards, 1200x630, redrawn every build:
  dist/img/release/<id>.png  one per tape indicator (CPI, repo, rupee, 10Y, Brent, Nifty): the latest figure, the one before, a short history
  dist/img/desk/<date>.png   one per Daily Desk day: the day's main moves
These are the og:image for the matching pages, so a link shared on release day shows the new number.
Usage: python3 scripts/render_cards.py dist"""
import json, os, sys, glob
import logging
logging.getLogger('matplotlib.font_manager').setLevel(logging.ERROR)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm

OUT = sys.argv[1] if len(sys.argv) > 1 else 'dist'
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..'); FONTS = os.path.join(ROOT, 'static', 'fonts')
for f in os.listdir(FONTS):
    if f.endswith('.ttf'): fm.fontManager.addfont(os.path.join(FONTS, f))
SANS, MONO, SERIF = 'IBM Plex Sans', 'IBM Plex Mono', 'Newsreader'
BG, INK, MUTE, RED, GREEN, DARK = '#FAF8F4', '#15171A', '#6B7078', '#B42318', '#0F6B3A', '#15171A'
MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
def long_date(d): y, m, dd = d.split('-'); return f'{int(dd)} {MON[int(m) - 1]} {y}'
def load(p):
    with open(p, encoding='utf-8') as fh: return json.load(fh)

def canvas():
    fig = plt.figure(figsize=(12, 6.3), dpi=100); fig.patch.set_facecolor(BG)
    fig.add_artist(plt.Rectangle((0, 0.985), 1, 0.015, color=RED, transform=fig.transFigure))
    fig.text(0.05, 0.06, 'The Kakistocrat', family=SERIF, size=22, color=INK)
    fig.text(0.95, 0.06, 'kakistocrat.pages.dev', family=MONO, size=14, color=MUTE, ha='right')
    return fig

def fmtv(v, ind):
    d = ind.get('decimals', 2); s = f"{v:,.{d}f}"
    return f"{ind.get('prefix', '')}{s}{ind.get('unit', '') if ind.get('unit') in ('%',) else ''}"

def release_cards(tape):
    os.makedirs(os.path.join(OUT, 'img', 'release'), exist_ok=True)
    for ind in tape['indicators']:
        L, P = ind['latest'], ind.get('previous') or {}
        fig = canvas()
        fig.text(0.05, 0.86, ind['label'].upper(), family=MONO, size=19, color=RED, weight='medium')
        fig.text(0.05, 0.78, L.get('period', ''), family=SANS, size=22, color=MUTE)
        fig.text(0.05, 0.47, fmtv(L['value'], ind), family=MONO, size=96, color=INK, weight='medium')
        if P.get('value') is not None:
            ch = L['value'] - P['value']
            unit = 'bp' if ind.get('unit') == '%' else ''
            txt = f"{'+' if ch > 0 else '−' if ch < 0 else '±'}{abs(ch) * 100:.0f}bp" if unit else f"{'+' if ch > 0 else '−' if ch < 0 else '±'}{abs(ch / P['value'] * 100):.1f}%"
            fig.text(0.05, 0.36, f"{txt} from {fmtv(P['value'], ind)} ({P.get('period', '')})", family=SANS, size=22, color=MUTE)
        src = (ind.get('sources') or [{}])[0].get('name', '')
        if src: fig.text(0.05, 0.17, f'Source: {src[:80]}', family=SANS, size=13, color=MUTE)
        h = [x for x in ind.get('history', []) if x.get('v') is not None]
        if len(h) >= 2:
            ax = fig.add_axes([0.56, 0.3, 0.39, 0.5]); ax.set_facecolor(BG)
            xs = list(range(len(h))); ys = [x['v'] for x in h]
            ax.plot(xs, ys, color=INK, lw=3); ax.scatter([xs[-1]], [ys[-1]], color=RED, s=90, zorder=3)
            ax.set_xticks([0, len(h) - 1]); ax.set_xticklabels([h[0]['t'], h[-1]['t']], family=MONO, size=12, color=MUTE)
            ax.tick_params(axis='y', labelsize=12, colors=MUTE, length=0); ax.tick_params(axis='x', length=0)
            for s in ax.spines.values(): s.set_visible(False)
            ax.grid(axis='y', color='#E2DFD8', lw=1)
        fig.savefig(os.path.join(OUT, 'img', 'release', f"{ind['id']}.png"), facecolor=BG); plt.close(fig)
    return len(tape['indicators'])

def desk_cards():
    os.makedirs(os.path.join(OUT, 'img', 'desk'), exist_ok=True); n = 0
    for p in sorted(glob.glob(os.path.join(ROOT, 'data', 'desk', '*.json')))[-60:]:
        S = load(p); out = os.path.join(OUT, 'img', 'desk', f"{S['date']}.png")
        L = {l['id']: l for l in S['lines']}
        fig = canvas()
        fig.text(0.05, 0.86, 'THE DAILY DESK', family=MONO, size=19, color=RED, weight='medium')
        fig.text(0.05, 0.76, long_date(S['date']), family=SERIF, size=46, color=INK)
        rows = [('nse-nifty-50', 'Nifty 50'), ('nse-nifty-bank', 'Bank Nifty'), ('fx-usdinr', 'Rupee per $'), ('fred-dcoilbrenteu', 'Brent, $'), ('nse-india-vix', 'India VIX')]
        y = 0.62
        for sid, name in rows:
            l = L.get(sid)
            if not l or l.get('last') is None: continue
            v = l['last']; d1 = l.get('d1')
            fig.text(0.05, y, name, family=SANS, size=24, color=INK)
            fig.text(0.50, y, f'{v:,.0f}' if v >= 1000 else f'{v:,.2f}', family=MONO, size=24, color=INK, ha='right')
            if d1 is not None:
                good = d1 < 0 if sid in ('fx-usdinr', 'nse-india-vix') else d1 > 0
                fig.text(0.64, y, f"{'+' if d1 > 0 else '−' if d1 < 0 else ''}{abs(d1):.2f}%", family=MONO, size=24, color=GREEN if good else RED if d1 else MUTE, ha='right')
            y -= 0.085
        rel = S.get('releases') or []
        if rel:
            r = rel[0]; fig.text(0.70, 0.62, 'RELEASED', family=MONO, size=14, color=MUTE)
            fig.text(0.70, 0.555, f"{r['label']}", family=SANS, size=18, color=INK)
            fig.text(0.70, 0.44, f"{r['value']}{r.get('unit') or ''}", family=MONO, size=54, color=RED)
            fig.text(0.70, 0.385, r.get('period', ''), family=SANS, size=16, color=MUTE)
        fig.savefig(out, facecolor=BG); plt.close(fig); n += 1
    return n

if __name__ == '__main__':
    a = release_cards(load(os.path.join(ROOT, 'data', 'tape.json'))); b = desk_cards()
    print(f'Cards: {a} release, {b} desk')
