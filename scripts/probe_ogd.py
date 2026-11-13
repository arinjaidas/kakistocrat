"""List data.gov.in resources that are actually being updated, and probe chosen ones.
Uses DATA_GOV_IN_KEY if set, otherwise the public demo key from data.gov.in's docs (10 rows max)."""
import json, os, sys, time, urllib.request, urllib.parse
KEY = os.environ.get("DATA_GOV_IN_KEY") or "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "kakistocrat-probe"})
    with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)
def lists(offset, limit=100):
    q = {"format": "json", "api-key": KEY, "notfilters[source]": "visualize.data.gov.in",
         "filters[active]": 1, "offset": offset, "limit": limit, "sort[updated]": "desc"}
    return get("https://api.data.gov.in/lists?" + urllib.parse.urlencode(q))
seen = {}
for off in range(0, 1500, 100):
    try: d = lists(off)
    except Exception as e: print("lists error", off, e); break
    for r in d.get("records", []):
        t = r.get("title", ""); key = t.split(" for ")[0][:70]
        seen.setdefault(key, []).append((r.get("index_name"), r.get("updated_date") or r.get("updated"), (r.get("org") or [""])[0] if isinstance(r.get("org"), list) else r.get("org"), t))
    time.sleep(0.5)
print("== distinct recently-updated resource families:", len(seen))
for k, v in sorted(seen.items(), key=lambda kv: -len(kv[1])):
    print(f"{len(v):4d}  {v[0][1]}  {v[0][0]}  {v[0][2]}  | {v[0][3][:140]}")
for rid in sys.argv[1:]:
    try:
        d = get(f"https://api.data.gov.in/resource/{rid}?api-key={KEY}&format=json&limit=2")
        print("\n##", rid, "|", d.get("title"), "| updated", d.get("updated_date"), "| total", d.get("total"))
        print("   fields:", [f.get("id") for f in d.get("field", [])])
        print("   row:", json.dumps((d.get("records") or [None])[0])[:400])
    except Exception as e: print("\n##", rid, "ERROR", e)
