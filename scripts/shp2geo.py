# Minimal Shapefile (polygon) + DBF reader, Douglas-Peucker simplification, GeoJSON writer. No dependencies.
# Used to build static/geo/india-states.json from DataMeet maps (MIT licence), States/Admin2.shp:
#   python3 scripts/shp2geo.py <path>/States/Admin2.shp static/geo/india-states.json 0.02 0.00003
import struct, json, sys
def read_dbf(p):
    b = open(p, 'rb').read(); n = struct.unpack('<I', b[4:8])[0]; hl = struct.unpack('<H', b[8:10])[0]; rl = struct.unpack('<H', b[10:12])[0]
    fields = []; o = 32
    while b[o] != 0x0D: name = b[o:o+11].split(b'\0')[0].decode(); ln = b[o+16]; fields.append((name, ln)); o += 32
    recs = []
    for i in range(n):
        r = b[hl + i*rl + 1: hl + (i+1)*rl]; d = {}; k = 0
        for name, ln in fields: d[name] = r[k:k+ln].decode('utf-8', 'replace').strip(); k += ln
        recs.append(d)
    return recs
def read_shp(p):
    b = open(p, 'rb').read(); o = 100; shapes = []
    while o < len(b):
        cl = struct.unpack('>i', b[o+4:o+8])[0] * 2; c = b[o+8:o+8+cl]; o += 8 + cl
        st = struct.unpack('<i', c[:4])[0]
        if st == 0: shapes.append([]); continue
        np_, npts = struct.unpack('<ii', c[36:44]); parts = list(struct.unpack(f'<{np_}i', c[44:44+4*np_]))
        pts = struct.unpack(f'<{2*npts}d', c[44+4*np_:44+4*np_+16*npts]); pts = [(pts[2*i], pts[2*i+1]) for i in range(npts)]
        parts.append(npts); shapes.append([pts[parts[i]:parts[i+1]] for i in range(np_)])
    return shapes
def dp(pts, eps):
    if len(pts) < 3: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts)-1)]
    while stack:
        a, z = stack.pop(); (x1, y1), (x2, y2) = pts[a], pts[z]; dx, dy = x2-x1, y2-y1; L = (dx*dx+dy*dy) or 1e-18; best, bi = -1, -1
        for i in range(a+1, z):
            x, y = pts[i]; t = ((x-x1)*dx + (y-y1)*dy)/L; t = max(0, min(1, t)); ex, ey = x1+t*dx-x, y1+t*dy-y; d = ex*ex+ey*ey
            if d > best: best, bi = d, i
        if bi > 0 and best > eps*eps: keep[bi] = True; stack += [(a, bi), (bi, z)]
    return [p for p, k in zip(pts, keep) if k]
def area(r): return abs(sum(r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1] for i in range(len(r)-1)))/2
if __name__ == '__main__':
    shp, out, eps, minarea = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
    recs = read_dbf(shp[:-4] + '.dbf'); shapes = read_shp(shp)
    if len(sys.argv) > 5: print(recs[:3]); print(len(recs), len(shapes)); sys.exit()
    feats = []
    for r, rings in zip(recs, shapes):
        polys = []
        for ring in rings:
            if area(ring) < minarea: continue
            sa = sum(ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1] for i in range(len(ring)-1))
            q = [[round(x, 3), round(y, 3)] for x, y in dp(ring, eps)]
            if len(q) < 4: continue
            if sa < 0 or not polys: polys.append([q])   # clockwise = outer ring in shapefiles
            else: polys[-1].append(q)                     # counter-clockwise = hole of the last outer ring
        if polys: feats.append({'type': 'Feature', 'properties': r, 'geometry': {'type': 'MultiPolygon', 'coordinates': polys}})
    json.dump({'type': 'FeatureCollection', 'features': feats}, open(out, 'w'), separators=(',', ':'))
