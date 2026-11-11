import { esc, lineChart } from './charts.mjs';

const bars = (s) => {
  const max = Math.max(...s.values.map(Math.abs)) || 1;
  return `<div class="tc-bars">${s.labels.map((l, i) => `<div class="tc-bar"><span class="l">${esc(l)}</span><span class="t"><i style="width:${Math.abs(s.values[i]) / max * 100}%;background:${s.color}"></i></span><span class="v">${s.values[i] > 0 ? '+' : ''}${s.values[i]}${s.unit}</span></div>`).join('')}</div>`;
};
const chart = (s, kind) => kind === 'bars' ? bars(s) : lineChart({ labels: s.labels, series: [{ label: '', values: s.values, color: s.color, width: 2.6 }], unit: s.unit, decimals: s.decimals, w: 520, h: 240, title: s.title });

export function twoChartPage(T, { pageHead }) {
  return pageHead('The Two-Chart Test', 'The Two-Chart Test', esc(T.intro)) + `<div class="wrap">
  <nav class="tc-toc">${T.tests.map((t, i) => `<a href="#${t.id}"><span class="n">${i + 1}</span>${esc(t.short)}</a>`).join('')}</nav>
  ${T.tests.map((t, i) => `<article class="tc" id="${t.id}">
   <header><span class="kicker">Test ${i + 1}</span><h2>“${esc(t.claim)}”</h2><span class="tc-verdict">${esc(t.verdict)}</span></header>
   <div class="tc-pair"><figure><figcaption>${esc(t.a.title)}</figcaption>${chart(t.a, t.kind)}</figure><figure><figcaption>${esc(t.b.title)}</figcaption>${chart(t.b, t.kind)}</figure></div>
   <div class="tc-read"><div><h3>What the charts show</h3><p>${esc(t.shows)}</p></div><div><h3>What they cannot tell you</h3><p>${esc(t.cannot)}</p></div></div>
   <p class="meta">Sources: ${t.sources.map(s => `<a href="${esc(s.url)}" style="text-decoration:underline">${esc(s.name)}</a>`).join(' · ')}</p>
  </article>`).join('')}
  <p class="meta">Checked ${esc(T.checked)}. Verdicts describe what these two series show over the period plotted, not a final judgement on the claim.</p></div>`;
}
