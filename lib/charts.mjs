// Server-rendered SVG charts. No JavaScript needed to read them.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const inr = (v, d = 0) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const lakhCr = v => (v / 1e5).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Multi-series line chart. series: [{label, values:[...], color, dash}]
export function lineChart({ labels, series, w = 760, h = 300, unit = '', yMin, yMax, refLine, refLabel, decimals = 1, title }) {
  const pad = { l: 46, r: 110, t: 18, b: 32 };
  const all = series.flatMap(s => s.values).filter(v => v != null);
  let lo = yMin ?? Math.min(...all), hi = yMax ?? Math.max(...all);
  if (refLine != null) { lo = Math.min(lo, refLine); hi = Math.max(hi, refLine); }
  const span = hi - lo || 1; if (yMin == null) lo -= span * 0.06; if (yMax == null) hi += span * 0.06;
  const X = i => pad.l + (w - pad.l - pad.r) * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
  const Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4; g += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#D9DED3"/><text x="${pad.l - 8}" y="${Y(v) + 4}" text-anchor="end" class="ax">${v.toFixed(decimals)}${unit}</text>`; }
  labels.forEach((l, i) => { g += `<text x="${X(i)}" y="${h - 10}" text-anchor="middle" class="ax">${esc(l)}</text>`; });
  if (refLine != null) g += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(refLine)}" y2="${Y(refLine)}" stroke="#17202C" stroke-dasharray="3 4"/><text x="${w - pad.r + 6}" y="${Y(refLine) + 4}" class="ax">${esc(refLabel || '')}</text>`;
  series.forEach(s => {
    const pts = s.values.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean);
    g += `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} points="${pts.map(p => p.join(',')).join(' ')}"/>`;
    pts.forEach((p, i) => { g += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${s.color}"><title>${esc(s.label)} · ${esc(labels[i])}: ${s.values[i]}${unit}</title></circle>`; });
    const last = pts.at(-1); if (last) g += `<text x="${last[0] + 8}" y="${last[1] + 4}" class="lbl" fill="${s.color}">${esc(s.label)}</text>`;
  });
  return `<svg class="svgchart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title || series.map(s => s.label).join(' vs '))}">${g}</svg>`;
}

// Horizontal "pace" bars: % of a target used, with a marker for time elapsed.
export function paceBars(rows, { marker = 50, markerLabel = 'Time elapsed' } = {}) {
  return `<div class="pace">${rows.map(r => {
    const pct = r.pct, w = Math.min(pct, 100);
    const cls = r.good == null ? '' : r.good ? 'ok' : 'warn';
    return `<div class="pace-row ${cls}"><div class="pace-lbl">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div><div class="pace-track"><span class="pace-fill" style="width:${w}%"></span>${r.prev != null ? `<span class="pace-prev" style="left:${Math.min(r.prev, 100)}%" title="Same point last year: ${r.prev}%"></span>` : ''}<span class="pace-mark" style="left:${marker}%"></span></div><div class="pace-val">${pct.toFixed(1)}%${r.prev != null ? `<small>last yr ${r.prev}%</small>` : ''}</div></div>`;
  }).join('')}<div class="pace-key"><span><i class="k-fill"></i>Share of full-year budget</span><span><i class="k-mark"></i>${esc(markerLabel)} (${marker}%)</span><span><i class="k-prev"></i>Same point last year</span></div></div>`;
}

// Stacked horizontal bar of parts.
export function stack(parts, total) {
  return `<div class="stack">${parts.map(p => `<span style="width:${p.v / total * 100}%;background:${p.color}" title="${esc(p.label)}: ${(p.v / total * 100).toFixed(1)}%"></span>`).join('')}</div><div class="legend">${parts.map(p => `<span><i style="background:${p.color}"></i>${esc(p.label)} ${(p.v / total * 100).toFixed(0)}%</span>`).join('')}</div>`;
}

// Scatter: points [{x,y,label,color}]
export function scatter({ points, xLabel, yLabel, w = 760, h = 420, xUnit = '', yUnit = '', decimals = 1, labelAll = true, title }) {
  const pad = { l: 56, r: 24, t: 18, b: 46 };
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = (x1 - x0) || 1, sy = (y1 - y0) || 1; x0 -= sx * .08; x1 += sx * .08; y0 -= sy * .08; y1 += sy * .08;
  const X = v => pad.l + (w - pad.l - pad.r) * (v - x0) / (x1 - x0), Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - y0) / (y1 - y0));
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = y0 + (y1 - y0) * k / 4; g += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#D9DED3"/><text x="${pad.l - 8}" y="${Y(v) + 4}" text-anchor="end" class="ax">${v.toFixed(decimals)}${yUnit}</text>`; const xv = x0 + (x1 - x0) * k / 4; g += `<text x="${X(xv)}" y="${h - 26}" text-anchor="middle" class="ax">${xv.toFixed(decimals)}${xUnit}</text>`; }
  g += `<text x="${(pad.l + w - pad.r) / 2}" y="${h - 6}" text-anchor="middle" class="axt">${esc(xLabel)}</text><text x="14" y="${(pad.t + h - pad.b) / 2}" text-anchor="middle" class="axt" transform="rotate(-90 14 ${(pad.t + h - pad.b) / 2})">${esc(yLabel)}</text>`;
  // OLS fit
  const n = points.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const sxy = points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0), sxx = points.reduce((a, p) => a + (p.x - mx) ** 2, 0), syy = points.reduce((a, p) => a + (p.y - my) ** 2, 0);
  const b = sxy / (sxx || 1), a = my - b * mx, r = sxy / Math.sqrt((sxx * syy) || 1);
  g += `<line x1="${X(x0)}" y1="${Y(a + b * x0)}" x2="${X(x1)}" y2="${Y(a + b * x1)}" stroke="#B5367A" stroke-dasharray="4 4" stroke-width="1.5"/>`;
  points.forEach(p => { g += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4.5" fill="${p.color || '#17202C'}" fill-opacity=".85"><title>${esc(p.label)}: ${p.x}${xUnit}, ${p.y}${yUnit}</title></circle>${labelAll ? `<text x="${X(p.x) + 7}" y="${Y(p.y) + 4}" class="pt">${esc(p.short || p.label)}</text>` : ''}`; });
  return { svg: `<svg class="svgchart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title || yLabel + ' against ' + xLabel)}">${g}</svg>`, r, slope: b, n };
}
