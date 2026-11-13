// Guilloché: the engraved line patterns of banknote security printing, generated as SVG.
const r2 = v => Math.round(v * 10) / 10;
const path = pts => 'M' + pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L');

// A rosette of hypotrochoids around (cx, cy)
export function rosette({ size = 640, rings = [[180, 48, 110], [156, 36, 92], [130, 40, 70], [100, 28, 50], [64, 16, 30]], perTurn = 150, stroke = '#fff', opacity = 0.22, width = 0.6, cls = '' } = {}) {
  const c = size / 2, paths = rings.map(([R, r, d], k) => {
    const pts = [], turns = r / gcd(R, r), steps = Math.round(turns * perTurn);
    for (let i = 0; i <= steps; i++) { const t = i / steps * 2 * Math.PI * turns; pts.push([c + (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t), c + (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t)]); }
    return `<path d="${path(pts)}" pathLength="1" style="--k:${k}"/>`;
  }).join('');
  return `<svg class="gl-rosette ${cls}" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false"><g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-opacity="${opacity}" vector-effect="non-scaling-stroke">${paths}</g></svg>`;
}

// A ribbon of phase-shifted waves, like the border lines on a note
export function ribbon({ w = 520, h = 64, lines = 9, waves = 5, stroke = 'currentColor', opacity = 0.5, cls = '' } = {}) {
  const out = [];
  for (let k = 0; k < lines; k++) {
    const pts = [], ph = k / lines * Math.PI * 2;
    for (let x = 0; x <= w; x += 4) { const env = Math.sin(Math.PI * x / w); pts.push([x, h / 2 + (h * 0.42) * env * Math.sin(2 * Math.PI * waves * x / w + ph) * Math.cos(Math.PI * x / w * 0.5 + ph / 2)]); }
    out.push(`<path d="${path(pts)}"/>`);
  }
  return `<svg class="gl-ribbon ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g fill="none" stroke="${stroke}" stroke-width=".7" stroke-opacity="${opacity}" vector-effect="non-scaling-stroke">${out.join('')}</g></svg>`;
}
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
