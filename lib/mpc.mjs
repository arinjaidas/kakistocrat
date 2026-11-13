// The MPC vote tracker: every published vote of every member, from the RBI's minutes (data/markets/mpc.json, refreshed by the data run).
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtD = d => d ? `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : '';
// One key per person: titles and spacing vary between sets of minutes ("Shri. Shaktikanta Das", "Dr.Pami Dua").
const key = n => n.replace(/^(Dr|Shri|Smt|Prof|Ms|Mr)\.?\s*/i, '').replace(/\s+/g, ' ').replace(/\.\s*/g, '. ').trim();
const title = n => { const m = n.match(/^(Dr|Shri|Smt|Prof|Ms|Mr)\b/i); return m ? (m[1] === 'Shri' || m[1] === 'Smt' ? m[1] : m[1] + '.') : ''; };
const move = r => /reduce|cut/i.test(r) ? 'cut' : /increase|hike|raise/i.test(r) ? 'hike' : 'hold';
const sentence = r => { const t = r.replace(/^(to )?/, '').replace(/\s+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };

export function mpcData(raw) {
  const meetings = Object.values(raw.meetings).filter(m => m.meeting && m.resolutions?.length).sort((a, b) => a.meeting.localeCompare(b.meeting)).map(m => {
    const rate = m.resolutions.find(r => /repo/i.test(r.resolution)) || m.resolutions[0], other = m.resolutions.filter(r => r !== rate);
    const votes = rate.votes.map(([n, v]) => ({ k: key(n), name: `${title(n)} ${key(n)}`.trim(), v }));
    return { date: m.meeting, released: m.released, url: m.url, ordinal: m.ordinal, rate: sentence(rate.resolution), move: move(rate.resolution), votes,
      yes: votes.filter(x => x.v === 'Yes').length, no: votes.filter(x => x.v === 'No'), other: other.map(r => ({ text: sentence(r.resolution), no: r.votes.filter(v => v[1] === 'No').map(v => `${title(v[0])} ${key(v[0])}`.trim()), n: r.votes.length })) };
  });
  const people = new Map();
  for (const m of meetings) for (const x of m.votes) { const p = people.get(x.k) || { name: x.name, first: m.date, last: m.date, n: 0, no: 0, noOther: 0, noDates: [] }; p.name = x.name; p.last = m.date; p.n++; if (x.v === 'No') { p.no++; p.noDates.push(m.date); } people.set(x.k, p); }
  for (const m of meetings) for (const o of m.other) for (const n of o.no) { const p = people.get(key(n)); if (p) p.noOther++; }
  return { meetings, people: [...people.values()] };
}

export function mpcPage(raw, { pageHead }) {
  const { meetings: M, people: P } = mpcData(raw); if (!M.length) return pageHead('Economy · MPC', 'How the MPC voted', 'Data unavailable.');
  const L = M[M.length - 1], split = M.filter(m => m.no.length), dissents = M.reduce((s, m) => s + m.no.length, 0);
  const top = [...P].sort((a, b) => b.no - a.no || a.first.localeCompare(b.first))[0];
  const card = (lbl, v, s1, s2 = '') => `<a class="mk-card" href="#record"><span class="lbl">${lbl}</span><span class="v">${v}</span><span class="sub">${s1}</span>${s2 ? `<span class="sub">${s2}</span>` : ''}</a>`;
  const cards = card('Latest decision', `${L.yes}–${L.no.length}`, esc(L.rate), fmtD(L.date))
    + card('Meetings with a published vote', M.length, `${fmtD(M[0].date)} to ${fmtD(L.date)}`)
    + card('Split decisions', split.length, `${Math.round(split.length / M.length * 100)}% of meetings`, `${dissents} dissenting votes in all`)
    + card('Most dissents on the rate', top.no, esc(top.name), `in ${top.n} meetings`);

  // the strip: one column per meeting, one square per member; dissents in the section colour
  const W = 15, H = 11, G = 3, X0 = 6, Y0 = 26, w = X0 * 2 + M.length * W, h = Y0 + 6 * (H + G) + 30;
  const arrow = (m, x) => m.move === 'cut' ? `<path d="M${x + 2} 8 h${W - 7} l-${(W - 7) / 2} 8 z" class="mv-cut"/>` : m.move === 'hike' ? `<path d="M${x + 2} 16 h${W - 7} l-${(W - 7) / 2} -8 z" class="mv-hike"/>` : `<rect x="${x + 3}" y="11" width="${W - 9}" height="2" class="mv-hold"/>`;
  const yrs = [...new Set(M.map(m => m.date.slice(0, 4)))];
  const strip = `<svg class="mpc-strip" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMin meet" role="img" aria-label="Votes at each of ${M.length} MPC meetings: a column per meeting, a square per member, dissents highlighted">
    ${M.map((m, i) => { const x = X0 + i * W, ord = [...m.votes].sort((a, b) => (a.v === 'No') - (b.v === 'No'));
      return `<g><title>${esc(fmtD(m.date))}: ${esc(m.rate)} (${m.yes}–${m.no.length}${m.no.length ? '; against: ' + esc(m.no.map(x => x.name).join(', ')) : ''})</title>${arrow(m, x)}${ord.map((x2, j) => `<rect x="${x}" y="${Y0 + j * (H + G)}" width="${W - 4}" height="${H}" rx="1.5" class="${x2.v === 'No' ? 'v-no' : 'v-yes'}"/>`).join('')}</g>`; }).join('')}
    ${yrs.map(y => { const i = M.findIndex(m => m.date.startsWith(y)); return `<text x="${X0 + i * W}" y="${h - 8}" class="mpc-yr">${y}</text>`; }).join('')}
  </svg>`;

  const rows = [...M].reverse().map(m => `<tr><th><a href="${esc(m.url)}">${fmtD(m.date)}</a></th><td><span class="mv mv-${m.move}">${m.move === 'cut' ? 'Cut' : m.move === 'hike' ? 'Hike' : 'Hold'}</span> ${esc(m.rate)}</td><td class="num"><b>${m.yes}–${m.no.length}</b></td><td>${m.no.length ? esc(m.no.map(x => x.name).join(', ')) : '<span class="meta">Unanimous</span>'}${m.other.map(o => `<div class="meta">Also: ${esc(o.text)} — ${o.n - o.no.length}–${o.no.length}${o.no.length ? ' (against: ' + esc(o.no.join(', ')) + ')' : ''}</div>`).join('')}</td></tr>`).join('');
  const ppl = [...P].sort((a, b) => b.last.localeCompare(a.last) || a.first.localeCompare(b.first)).map(p => `<tr><th>${esc(p.name)}</th><td>${fmtD(p.first)} – ${p.last === L.date ? '<b>serving</b>' : fmtD(p.last)}</td><td class="num">${p.n}</td><td class="num"><b>${p.no}</b></td><td class="meta">${p.noDates.map(fmtD).join(', ')}</td></tr>`).join('');

  return pageHead('Economy · MPC', 'How the Monetary Policy Committee voted',
    `Every vote by every member at each of the ${M.length} meetings since October 2016 for which the RBI has published minutes. The minutes appear 14 days after each meeting, and this page adds them automatically.`, cards) + `<div class="wrap">
  <section class="xr-sec" id="strip"><h2 class="col-title">Every meeting, every member</h2>
    <p class="meta">Each column is a meeting and each square a member’s vote on the policy rate; squares in colour are votes against the resolution. The mark above shows the decision: a cut, a hike or no change. Hover over a column for the detail.</p>
    <div class="ip-tw mpc-sw">${strip}</div>
    <p class="mpc-key"><span><i class="v-yes"></i> For the resolution</span><span><i class="v-no"></i> Against</span><span><svg width="14" height="12"><path d="M2 2 h10 l-5 8 z" class="mv-cut"/></svg> Cut</span><span><svg width="14" height="12"><path d="M2 10 h10 l-5 -8 z" class="mv-hike"/></svg> Hike</span><span><svg width="14" height="12"><rect x="2" y="5" width="10" height="2" class="mv-hold"/></svg> Hold</span></p></section>
  <section class="xr-sec" id="record"><h2 class="col-title">Meeting by meeting</h2>
    <div class="ip-tw"><table class="mpc-t"><thead><tr><th>Meeting ended</th><th>Resolution on the policy rate</th><th>Vote</th><th>Voted against</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="meta">A vote against the resolution means the member wanted a different decision; each member’s statement in the minutes, linked from the date, sets out what they preferred. Votes on the policy stance are not tallied here: the minutes table only the rate vote, and give stance dissents in the text of the resolution.</p></section>
  <section class="xr-sec" id="members"><h2 class="col-title">Members</h2>
    <div class="ip-tw"><table class="mpc-t mpc-p"><thead><tr><th>Member</th><th>Votes recorded</th><th>Meetings</th><th>Against the rate decision</th><th>Dissented at</th></tr></thead><tbody>${ppl}</tbody></table></div>
    <p class="meta">The committee has three RBI members (the Governor, the Deputy Governor in charge of monetary policy and an officer nominated by the RBI’s Board) and three external members appointed by the government for four years. The Governor has a casting vote in a tie.</p></section>
  <section class="xr-sec"><h2 class="col-title">Method and sources</h2><ul class="meta">
    <li>Votes are read from the “Voting on the Resolution” tables in the RBI’s minutes, published under Section 45ZL of the RBI Act; names are as printed, matched across meetings.</li>
    <li>The 39th meeting, on 3 November 2022, was held to draft the RBI’s report to the government on missing the inflation target (Section 45ZN). It took no rate decision, and the RBI has said no minutes are available for it; it is not shown.</li>
    <li>Source: <a href="${esc(L.url)}">RBI, Minutes of the Monetary Policy Committee Meeting</a> (each date in the table links to its minutes); on the 39th meeting, <a href="https://www.deccanherald.com/business/rbi-has-no-record-of-mpc-meet-on-inflation-target-miss-report-1202554.html">Deccan Herald</a>.</li>
    <li>Data: <a href="/api/mpc.json">/api/mpc.json</a>.</li></ul></section>
  <p class="meta"><a href="/economy/rates/">Interest rates and yields</a> · <a href="/desk/calendar/">Release calendar</a></p></div>`;
}
