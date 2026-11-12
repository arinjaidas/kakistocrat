"""Render a 1200x675 PNG for every series in dist/api/catalog.json -> dist/img/s/<id>.png.
These images live at fixed URLs and are redrawn on every build, so a chart inserted into a WordPress post
(Image block -> Insert from URL) updates itself. Optional event markers come from data/events.json.
Usage: python3 scripts/render_charts.py dist [--only id1,id2]"""
import json, os, sys, datetime as dt
import logging
logging.getLogger('matplotlib.font_manager').setLevel(logging.ERROR)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
import matplotlib.dates as mdates

OUT = sys.argv[1] if len(sys.argv) > 1 else 'dist'
ONLY = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
HERE = os.path.dirname(os.path.abspath(__file__)); FONTS = os.path.join(HERE, '..', 'static', 'fonts')
for f in os.listdir(FONTS):
    if f.endswith('.ttf'): fm.fontManager.addfont(os.path.join(FONTS, f))
SANS, MONO, SERIF = 'IBM Plex Sans', 'IBM Plex Mono', 'Newsreader'
BG, INK, MUTE, RULE, RED = '#FAF8F4', '#15171A', '#6B7078', '#E2DFD8', '#B42318'
plt.rcParams.update({'font.family': SANS, 'axes.edgecolor': RULE, 'axes.labelcolor': MUTE, 'xtick.color': MUTE, 'ytick.color': MUTE, 'svg.fonttype': 'none'})

def load(p):
    with open(p, encoding='utf-8') as fh: return json.load(fh)

def parse(d):
    if len(d) == 4: return dt.date(int(d), 7, 1)
    if len(d) == 7: return dt.date(int(d[:4]), int(d[5:7]), 15)
    return dt.date.fromisoformat(d)

def fmt(v):
    a = abs(v)
    return f'{v:,.0f}' if a >= 1000 else f'{v:,.1f}' if a >= 100 else f'{v:,.2f}'

def main():
    cat = load(os.path.join(OUT, 'api', 'catalog.json'))
    ev_path = os.path.join(HERE, '..', 'data', 'events.json')
    events = load(ev_path)['events'] if os.path.exists(ev_path) else []
    os.makedirs(os.path.join(OUT, 'img', 's'), exist_ok=True)
    today = dt.date.today(); n = 0
    for c in cat:
        if ONLY and c['id'] not in ONLY: continue
        s = load(os.path.join(OUT, 'api', 'series', c['id'] + '.json'))
        d = [parse(x) for x in s['d']]; v = s['v']
        annual = c['freq'] == 'annual'
        start = dt.date(1995, 1, 1) if annual else today.replace(year=today.year - 3)
        pts = [(a, b) for a, b in zip(d, v) if a >= start and b is not None]
        if len(pts) < 3: continue
        x, y = zip(*pts)
        fig = plt.figure(figsize=(12, 6.75), dpi=100, facecolor=BG)
        ax = fig.add_axes([0.075, 0.13, 0.86, 0.62], facecolor=BG)
        if annual and any(a.year > today.year for a in x):
            k = next(i for i, a in enumerate(x) if a.year > today.year)
            ax.plot(x[:k], y[:k], color=RED, lw=2.6); ax.plot(x[k - 1:], y[k - 1:], color=RED, lw=2.2, ls=(0, (4, 3)))
        else:
            ax.plot(x, y, color=RED, lw=2.2 if not annual else 2.6)
            ax.fill_between(x, y, min(y), color=RED, alpha=0.06)
        lo, hi = min(y), max(y); pad = (hi - lo) * 0.08 or abs(hi) * 0.05 or 1
        ax.set_ylim(lo - pad, hi + pad * 1.7)
        # events that fall in range and are tagged for this series (or for everything)
        placed = []; span = (x[-1] - x[0]).days or 1
        for e in sorted(events, key=lambda e: e['date']):
            ed = parse(e['date'])
            if ed <= x[0] or ed > x[-1]: continue
            tags = e.get('series', [])
            if tags and c['id'] not in tags and not any(c['id'].startswith(t.rstrip('*')) for t in tags if t.endswith('*')): continue
            level = 0
            while any(abs((ed - p).days) < span * 0.11 and l == level for p, l in placed): level += 1
            if level > 3: continue
            placed.append((ed, level))
            ax.axvline(ed, color=INK, lw=0.8, alpha=0.3, ls=(0, (2, 2)))
            right = (x[-1] - ed).days < span * 0.12
            ax.text(ed, hi + pad * 1.5 - level * pad * 0.62, (e['short'] + ' ') if right else (' ' + e['short']), fontsize=9, color=INK, alpha=0.8, va='top', ha='right' if right else 'left', family=MONO,
                    bbox=dict(facecolor=BG, edgecolor='none', pad=0.6, alpha=0.85))
        ax.annotate(fmt(y[-1]), xy=(x[-1], y[-1]), xytext=(6, 0), textcoords='offset points', va='center', fontsize=13, fontweight='bold', color=RED, family=MONO)
        for side in ('top', 'right', 'left'): ax.spines[side].set_visible(False)
        ax.grid(axis='y', color='#ECE8DF', lw=1); ax.tick_params(length=0, labelsize=11)
        for lab in ax.get_xticklabels() + ax.get_yticklabels(): lab.set_fontfamily(MONO)
        if not annual: ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %Y'))
        fig.text(0.075, 0.905, c['name'], fontsize=26, color=INK, family=SERIF, fontweight='semibold', va='center')
        fig.text(0.075, 0.835, f"{c['unit']} · {c['freq']} · last {s['d'][-1]}{' · dashed = IMF projection' if annual and x[-1].year > today.year else ''}", fontsize=13, color=MUTE, va='center')
        fig.add_artist(plt.Line2D([0, 1], [0.995, 0.995], color=RED, lw=8))
        fig.text(0.075, 0.045, f"Source: {c['source']}", fontsize=10.5, color=MUTE, va='center')
        fig.text(0.075, 0.015, 'THE KAKISTOCRAT', fontsize=10.5, color=INK, family=MONO, fontweight='bold', va='center')
        fig.text(0.935, 0.03, f"kakistocrat.pages.dev/s/{c['id']}/ · updated {today.isoformat()}", fontsize=10.5, color=MUTE, family=MONO, ha='right', va='center')
        fig.savefig(os.path.join(OUT, 'img', 's', c['id'] + '.png'), facecolor=BG)
        plt.close(fig); n += 1
    print(f'Rendered {n} chart images')

if __name__ == '__main__':
    main()
