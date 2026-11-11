// Generates WordPress block-theme templates that mirror the static site's design.
// Output: static/wp-kit/*.html (served by Cloudflare Pages, fetched from wp-admin and saved via the REST API).
import { mkdir, writeFile } from 'node:fs/promises';

const WP = 'https://thekakisto.wordpress.com';
const PD = 'https://kakistocrat.pages.dev';
const C = { ink: '#15171A', paper: '#FFFFFF', stone: '#F4F2ED', rule: '#E2DFD8', rule2: '#CFCBC2', slate: '#555A61', graphite: '#3A3E44', mute: '#6B7078', accent: '#B42318', navText: '#D7DADF', pink: '#F0A39B', darkP: '#C9CCD1', darkRule: '#3A3E44' };
const CATS = [
  ['money-finance', 'Money & finance', 151176], ['trade-external-sector', 'Trade & external sector', 793138849],
  ['public-finance', 'Public finance', 560265], ['growth-jobs-industry', 'Growth, jobs & industry', 793138305],
  ['rural-economy-welfare', 'Rural economy & welfare', 793138979], ['energy-climate', 'Energy & climate', 8323095],
  ['world-geopolitics', 'World & geopolitics', 69841505],
];
const SHORT = { 'money-finance': 'Money', 'trade-external-sector': 'Trade', 'public-finance': 'Public finance', 'growth-jobs-industry': 'Growth & jobs', 'rural-economy-welfare': 'Rural & welfare', 'energy-climate': 'Energy', 'world-geopolitics': 'World' };
const SERIES = [
  ['series-the-2026-oil-shock', 'The 2026 oil shock', 'How a spike in crude ran through India’s inflation target, monetary policy, fuel taxes, reserves and the rupee.'],
  ['series-testing-indias-subsidies', 'Testing India’s subsidies', 'Semiconductors, AI compute, minerals, green hydrogen, fertiliser: what each subsidy should be made to deliver.'],
  ['series-indias-trade-deals', 'India’s trade deals', 'India’s agreements with the UK, EU, New Zealand and the US, each judged by whether firms can actually use them.'],
  ['series-reading-indias-jobs-data', 'Reading India’s jobs data', 'What the employment numbers measure, what they miss and how to read each new release.'],
];

// ---------- serialisation helpers ----------
const escA = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const J = o => JSON.stringify(o).replace(/--/g, '\\u002d\\u002d').replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
function css(st = {}) {
  const out = [];
  const box = (prefix, v) => { if (!v) return; if (typeof v === 'string') out.push(`${prefix}:${v}`); else for (const k of ['top', 'right', 'bottom', 'left']) if (v[k] != null) out.push(`${prefix}-${k}:${v[k]}`); };
  if (st.border) {
    for (const side of ['top', 'right', 'bottom', 'left']) { const b = st.border[side]; if (b) { if (b.color) out.push(`border-${side}-color:${b.color}`); if (b.style) out.push(`border-${side}-style:${b.style}`); if (b.width) out.push(`border-${side}-width:${b.width}`); } }
    if (st.border.color) out.push(`border-color:${st.border.color}`); if (st.border.style) out.push(`border-style:${st.border.style}`); if (st.border.width) out.push(`border-width:${st.border.width}`);
    if (st.border.radius != null) out.push(`border-radius:${st.border.radius}`);
  }
  if (st.color?.text) out.push(`color:${st.color.text}`);
  if (st.color?.background) out.push(`background-color:${st.color.background}`);
  if (st.spacing) { box('margin', st.spacing.margin); box('padding', st.spacing.padding); }
  if (st.dimensions?.minHeight) out.push(`min-height:${st.dimensions.minHeight}`);
  if (st.typography) for (const [k, v] of Object.entries(st.typography)) out.push(`${kebab(k)}:${v}`);
  return out.join(';');
}
function cls(base, a) {
  const c = [base];
  if (a.style?.color?.text) c.push('has-text-color');
  if (a.style?.color?.background) c.push('has-background');
  if (a.style?.elements?.link) c.push('has-link-color');
  if (a.fontFamily) c.push(`has-${a.fontFamily}-font-family`);
  if (a.style?.border && (a.style.border.color || a.style.border.width && !a.style.border.top)) c.push('has-border-color');
  if (a.align) c.push('align' + a.align);
  if (a.className) c.push(a.className);
  return c.join(' ');
}
const attrStr = (a) => Object.keys(a).length ? ' ' + J(a) : '';
const styleAttr = (a) => { const s = css(a.style); return s ? ` style="${s}"` : ''; };

// static wrappers
const group = (a, inner, tag = 'div') => { a = { ...a }; if (tag !== 'div') a.tagName = tag; return `<!-- wp:group${attrStr(a)} -->\n<${tag} class="${cls('wp-block-group', a)}"${a.anchor ? ` id="${a.anchor}"` : ''}${styleAttr(a)}>${inner}</${tag}>\n<!-- /wp:group -->`; };
const columns = (a, inner) => `<!-- wp:columns${attrStr(a)} -->\n<div class="${cls('wp-block-columns', a)}${a.isStackedOnMobile === false ? ' is-not-stacked-on-mobile' : ''}"${styleAttr(a)}>${inner}</div>\n<!-- /wp:columns -->`;
const column = (a, inner) => { const st = css(a.style); const fb = a.width ? `flex-basis:${a.width}` : ''; const s = [st, fb].filter(Boolean).join(';'); return `<!-- wp:column${attrStr(a)} -->\n<div class="${cls('wp-block-column', a)}"${s ? ` style="${s}"` : ''}>${inner}</div>\n<!-- /wp:column -->`; };
const p = (a, html) => `<!-- wp:paragraph${attrStr(a)} -->\n<p class="${cls('', a).trim()}"${styleAttr(a)}>${html}</p>\n<!-- /wp:paragraph -->`.replace(' class=""', '');
const h = (level, a, html) => { const aa = { ...a }; if (level !== 2) aa.level = level; return `<!-- wp:heading${attrStr(aa)} -->\n<h${level} class="${cls('wp-block-heading', a)}"${styleAttr(a)}>${html}</h${level}>\n<!-- /wp:heading -->`; };
const buttons = (inner, a = {}) => `<!-- wp:buttons${attrStr(a)} -->\n<div class="wp-block-buttons"${styleAttr(a)}>${inner}</div>\n<!-- /wp:buttons -->`;
const button = (a, text, href) => `<!-- wp:button${attrStr(a)} -->\n<div class="wp-block-button"><a class="${cls('wp-block-button__link', a).replace('wp-block-button__link', 'wp-block-button__link')} wp-element-button" href="${href}"${styleAttr(a)}>${text}</a></div>\n<!-- /wp:button -->`;
const sep = (color) => `<!-- wp:separator {"style":{"color":{"background":"${color}"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"is-style-wide"} -->\n<hr class="wp-block-separator has-text-color has-alpha-channel-opacity has-background is-style-wide" style="margin-top:0;margin-bottom:0;background-color:${color};color:${color}"/>\n<!-- /wp:separator -->`;
// dynamic blocks
const dyn = (name, a = {}) => `<!-- wp:${name}${attrStr(a)} /-->`;
const dynWrap = (name, a, inner) => `<!-- wp:${name}${attrStr(a)} -->\n${inner}\n<!-- /wp:${name} -->`;
const query = (q, inner, extra = {}) => `<!-- wp:query ${J({ queryId: q.id, query: { perPage: q.perPage, pages: 0, offset: q.offset || 0, postType: 'post', order: 'desc', orderBy: 'date', author: '', search: '', exclude: [], sticky: q.sticky ?? 'exclude', inherit: !!q.inherit, ...(q.tax ? { taxQuery: q.tax } : {}) }, ...extra })} -->\n<div class="wp-block-query">${inner}</div>\n<!-- /wp:query -->`;
const postTemplate = (a, inner) => dynWrap('post-template', a, inner);

// ---------- design tokens as block styles ----------
const linkInk = { link: { color: { text: C.ink }, typography: { textDecoration: 'none' }, ':hover': { color: { text: C.accent } } } };
const linkAccent = { link: { color: { text: C.accent }, typography: { textDecoration: 'none' }, ':hover': { typography: { textDecoration: 'underline' } } } };
const kickerTerms = (size = '11px') => dyn('post-terms', { term: 'category', style: { typography: { fontSize: size, fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }, elements: linkAccent, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-mono' });
const title = (size, level = 3, lh = '1.18') => dyn('post-title', { level, isLink: true, style: { typography: { fontSize: size, fontWeight: '500', lineHeight: lh, letterSpacing: '-0.01em' }, elements: linkInk, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'newsreader' });
const excerpt = (size, len, color = C.graphite) => dyn('post-excerpt', { moreText: '', excerptLength: len, style: { typography: { fontSize: size, lineHeight: '1.5' }, color: { text: color }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'newsreader' });
const date = (fmt = 'j M Y') => dyn('post-date', { format: fmt, style: { typography: { fontSize: '11.5px', letterSpacing: '0.02em' }, color: { text: C.mute }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-mono' });
const vstack = (gap, inner, extra = {}) => group({ style: { spacing: { blockGap: gap, ...(extra.spacing || {}) }, ...(extra.style || {}) }, layout: { type: 'flex', orientation: 'vertical' }, ...(extra.attrs || {}) }, inner);
const hstack = (gap, inner, extra = {}) => group({ style: { spacing: { blockGap: gap } }, layout: { type: 'flex', flexWrap: 'wrap', verticalAlignment: 'center', ...(extra.justify ? { justifyContent: extra.justify } : {}) }, ...(extra.attrs || {}) }, inner);
const monoLabel = (text, color = C.slate, size = '11.5px') => p({ style: { typography: { fontSize: size, fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase' }, color: { text: color }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-mono' }, text);
const wrap = (inner, extra = {}) => group({ align: 'full', style: { spacing: { padding: { left: '24px', right: '24px', ...(extra.pad || {}) }, margin: { top: '0', bottom: '0' } }, ...(extra.style || {}) }, layout: { type: 'constrained', contentSize: '1232px', wideSize: '1232px' }, ...(extra.attrs || {}) }, inner, extra.tag || 'div');
const secHead = (label, href) => group({ style: { border: { top: { color: C.ink, width: '3px', style: 'solid' } }, spacing: { padding: { top: '10px' }, margin: { top: '44px', bottom: '14px' } } }, layout: { type: 'flex', flexWrap: 'nowrap', justifyContent: 'space-between' } },
  h(2, { style: { typography: { fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-sans' }, label) +
  (href ? p({ style: { typography: { fontSize: '12.5px', fontWeight: '600' }, elements: linkAccent, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-sans' }, `<a href="${href}">More →</a>`) : ''));

// ---------- header (dark bar + tools strip) ----------
const navLink = (label, url) => dyn('navigation-link', { label: escA(label), url, kind: 'custom', isTopLevelLink: true });
const header = () => group({ align: 'full', style: { color: { background: C.ink, text: C.paper }, spacing: { padding: { top: '10px', bottom: '10px', left: '24px', right: '24px' }, margin: { top: '0', bottom: '0' } }, elements: { link: { color: { text: C.paper } } } }, fontFamily: 'ibm-plex-sans', layout: { type: 'constrained', contentSize: '1232px', wideSize: '1232px' } },
  group({ style: { spacing: { blockGap: '22px' } }, layout: { type: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', verticalAlignment: 'center' } },
    group({ style: { spacing: { blockGap: '26px' } }, layout: { type: 'flex', flexWrap: 'wrap', verticalAlignment: 'center' } },
      vstack('2px',
        dyn('site-title', { level: 0, style: { typography: { fontSize: '22px', fontWeight: '500', letterSpacing: '-0.02em', lineHeight: '1' }, elements: { link: { color: { text: C.paper }, typography: { textDecoration: 'none' } } } }, fontFamily: 'newsreader' }) +
        p({ style: { typography: { fontSize: '9px', fontWeight: '500', letterSpacing: '0.14em', textTransform: 'uppercase', lineHeight: '1.2' }, color: { text: '#9CA1A9' }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-mono' }, 'Economics · Politics · Policy')) +
      dynWrap('navigation', { overlayMenu: 'mobile', customTextColor: C.navText, customOverlayBackgroundColor: C.ink, customOverlayTextColor: C.paper, style: { typography: { fontSize: '13.5px', fontWeight: '500' }, spacing: { blockGap: '18px' } }, fontFamily: 'ibm-plex-sans', layout: { type: 'flex', flexWrap: 'wrap' }, ariaLabel: 'Topics' },
        CATS.map(([s, , ]) => navLink(SHORT[s], `${WP}/category/${s}/`)).join('\n'))) +
    group({ style: { spacing: { blockGap: '18px' } }, layout: { type: 'flex', flexWrap: 'wrap', verticalAlignment: 'center' } },
      dynWrap('navigation', { overlayMenu: 'never', customTextColor: C.paper, style: { typography: { fontSize: '13.5px', fontWeight: '600' }, spacing: { blockGap: '18px' } }, fontFamily: 'ibm-plex-sans', layout: { type: 'flex', flexWrap: 'wrap' }, ariaLabel: 'Tools' },
        [['Series', `${WP}/series/`], ['Today', `${PD}/today/`], ['Markets', `${PD}/markets/`], ['Charts', `${PD}/charts/`], ['Tools', `${PD}/tools/`]].map(([l, u]) => navLink(l, u)).join('\n')) +
      dyn('search', { label: 'Search', showLabel: false, placeholder: 'Search the archive', buttonText: 'Search', buttonPosition: 'button-only', buttonUseIcon: true, style: { border: { radius: '0px', width: '0px' }, color: { background: C.ink, text: C.paper } } }) +
      buttons(button({ style: { color: { background: C.accent, text: C.paper }, border: { radius: '0px' }, typography: { fontSize: '13px', fontWeight: '600' }, spacing: { padding: { top: '9px', bottom: '9px', left: '14px', right: '14px' } } }, fontFamily: 'ibm-plex-sans' }, 'Subscribe', `${WP}/#subscribe`)))))
  + '\n' + group({ align: 'full', style: { color: { background: C.stone }, border: { bottom: { color: C.rule2, width: '1px', style: 'solid' } }, spacing: { padding: { top: '9px', bottom: '9px', left: '24px', right: '24px' }, margin: { top: '0', bottom: '0' } } }, layout: { type: 'constrained', contentSize: '1232px', wideSize: '1232px' } },
    p({ style: { typography: { fontSize: '12px', fontWeight: '500', letterSpacing: '0.02em' }, color: { text: C.graphite }, elements: { link: { color: { text: C.ink }, typography: { textDecoration: 'none' }, ':hover': { color: { text: C.accent } } } }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-mono' },
      `<strong><a href="${PD}/today/"><span style="color:${C.accent}">LIVE DATA</span></a></strong>   <a href="${PD}/today/">India Today</a>   ·   <a href="${PD}/markets/">Markets</a>   ·   <a href="${PD}/commodities/">Commodities</a>   ·   <a href="${PD}/charts/">Chart workbench</a>   ·   <a href="${PD}/tools/budget-x-ray/">Budget X-Ray</a>   ·   <a href="${PD}/infographics/">Infographics</a>   ·   <a href="${PD}/tools/emi/">EMI shock</a>   ·   <a href="${PD}/chartle/">Chartle</a>   →`));

// ---------- footer ----------
const footList = (head, items) => vstack('6px', monoLabel(head, C.slate, '11px') + items.map(([l, u]) => p({ style: { typography: { fontSize: '13.5px' }, elements: linkInk, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-sans' }, `<a href="${u}">${escA(l)}</a>`)).join(''));
const footer = () => group({ align: 'full', style: { border: { top: { color: C.ink, width: '3px', style: 'solid' } }, spacing: { padding: { top: '28px', bottom: '40px', left: '24px', right: '24px' }, margin: { top: '56px', bottom: '0' } } }, fontFamily: 'ibm-plex-sans', layout: { type: 'constrained', contentSize: '1232px', wideSize: '1232px' } },
  columns({ style: { spacing: { blockGap: { left: '28px' } } } },
    column({ width: '40%' }, p({ style: { typography: { fontSize: '26px', fontWeight: '500', letterSpacing: '-0.02em', lineHeight: '1' }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'newsreader' }, 'The Kakistocrat') +
      p({ style: { typography: { fontSize: '13.5px', lineHeight: '1.55' }, color: { text: C.slate }, elements: linkInk }, fontFamily: 'ibm-plex-sans' }, `Independent analysis of India’s economy and the politics around it, by Arinjai Das. Live data and interactive tools are at <a href="${PD}/" style="text-decoration:underline">kakistocrat.pages.dev</a>.`)) +
    column({ width: '20%' }, footList('Topics', CATS.map(([s, n]) => [n, `${WP}/category/${s}/`]))) +
    column({ width: '20%' }, footList('Read', [['Series', `${WP}/series/`], ['Explainers', `${WP}/explainers/`], ['About', `${WP}/about/`], ['Contact', `${WP}/contact/`], ['Archive and search', `${PD}/archive/`], ['RSS', `${WP}/feed/`]])) +
    column({ width: '20%' }, footList('Tools', [['India Today', `${PD}/today/`], ['Markets', `${PD}/markets/`], ['Commodities', `${PD}/commodities/`], ['Chart workbench', `${PD}/charts/`], ['India macro data', `${PD}/data/`], ['Budget X-Ray', `${PD}/tools/budget-x-ray/`], ['India by State', `${PD}/tools/india-by-state/`], ['Exposure Map', `${PD}/tools/exposure/`], ['Two-Chart Test', `${PD}/tools/two-chart-test/`], ['Shock Lab', `${PD}/tools/shock-lab/`], ['Policy Ledger', `${PD}/ledger/`], ['Forecast Book', `${PD}/forecasts/`]]))));

// ---------- reusable rail modules ----------
const darkBox = (kick, head, body, cta, href) => group({ style: { color: { background: C.ink, text: C.paper }, spacing: { padding: { top: '18px', bottom: '18px', left: '20px', right: '20px' }, blockGap: '8px' } }, layout: { type: 'flex', orientation: 'vertical' } },
  monoLabel(kick, C.pink, '11px') + h(3, { style: { typography: { fontSize: '17px', fontWeight: '600', lineHeight: '1.3' }, color: { text: C.paper }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-sans' }, head) +
  p({ style: { typography: { fontSize: '13.5px', lineHeight: '1.5' }, color: { text: C.darkP }, spacing: { margin: { top: '0', bottom: '4px' } } }, fontFamily: 'ibm-plex-sans' }, body) +
  buttons(button({ style: { color: { background: C.paper, text: C.ink }, border: { radius: '0px' }, typography: { fontSize: '13px', fontWeight: '600' }, spacing: { padding: { top: '9px', bottom: '9px', left: '14px', right: '14px' } } }, fontFamily: 'ibm-plex-sans' }, cta, href)));
const toolList = () => group({ style: { border: { color: C.rule2, width: '1px', style: 'solid' }, spacing: { padding: { top: '16px', bottom: '14px', left: '18px', right: '18px' }, blockGap: '0' } }, layout: { type: 'flex', orientation: 'vertical' } },
  monoLabel('Tools and data', C.accent, '11px') +
  [['Budget X-Ray', 'Halfway through 2026-27', '/tools/budget-x-ray/'], ['India by State', 'Thirty-one states compared', '/tools/india-by-state/'], ['Exposure Map', 'Where India is exposed', '/tools/exposure/'], ['Two-Chart Test', 'Claims against data', '/tools/two-chart-test/'], ['Policy Ledger', 'From promise to proof', '/ledger/'], ['India macro data', 'Latest, previous, revised', '/data/']]
    .map(([t, s, u]) => group({ style: { border: { top: { color: C.rule, width: '1px', style: 'solid' } }, spacing: { padding: { top: '9px', bottom: '9px' }, blockGap: '2px' } }, layout: { type: 'flex', orientation: 'vertical' } },
      p({ style: { typography: { fontSize: '14.5px', fontWeight: '600', lineHeight: '1.3' }, elements: linkInk, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-sans' }, `<a href="${PD}${u}">${t} →</a>`) +
      p({ style: { typography: { fontSize: '11.5px' }, color: { text: C.mute }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-mono' }, s))).join(''));
const subscribeBand = () => wrap(group({ anchor: 'subscribe', style: { color: { background: C.stone }, border: { top: { color: C.ink, width: '3px', style: 'solid' } }, spacing: { padding: { top: '32px', bottom: '32px', left: '32px', right: '32px' }, margin: { top: '48px', bottom: '0' } } }, layout: { type: 'default' } },
  columns({ verticalAlignment: 'center', style: { spacing: { blockGap: { left: '40px' } } } },
    column({ verticalAlignment: 'center', width: '50%' }, monoLabel('Newsletter', C.accent, '11px') + h(2, { style: { typography: { fontSize: '28px', fontWeight: '500', lineHeight: '1.15' }, spacing: { margin: { top: '6px', bottom: '6px' } } }, fontFamily: 'newsreader' }, 'New analysis, by email') + p({ style: { typography: { fontSize: '14px' }, color: { text: C.graphite } }, fontFamily: 'ibm-plex-sans' }, 'One email when a new piece is published. Nothing else.')) +
    column({ verticalAlignment: 'center', width: '50%' }, dyn('jetpack/subscriptions', { subscribePlaceholder: 'Your email address', submitButtonText: 'Subscribe', customEmailFieldBackgroundColor: '#FFFFFF', customButtonBackgroundColor: C.accent, customTextColor: '#FFFFFF', borderRadius: 0, borderWeight: 1, customBorderColor: C.ink, padding: 12, spacing: 8, fontSize: '14px' })))));

// story card inside query loops
const card = ({ kick = true, tSize, xLen, xSize = '14.5px', gap = '6px', pad }) => group({ style: { spacing: { blockGap: gap, ...(pad ? { padding: pad } : {}) }, ...(pad ? { border: { bottom: { color: C.rule, width: '1px', style: 'solid' } } } : {}) }, layout: { type: 'flex', orientation: 'vertical' } },
  (kick ? kickerTerms() : '') + title(tSize) + (xLen ? excerpt(xSize, xLen) : '') + date());

// ---------- home ----------
let qid = 40;
const home = () => {
  const front = columns({ style: { spacing: { blockGap: { left: '32px' }, padding: { top: '24px' } } } },
    column({ width: '54%', style: { spacing: { blockGap: '0' } } },
      query({ id: qid++, perPage: 1 }, postTemplate({}, vstack('10px', kickerTerms() + title('34px', 2, '1.12') + excerpt('18px', 42) +
        hstack('8px', dyn('post-author-name', { style: { typography: { fontSize: '12px' }, color: { text: C.slate } }, fontFamily: 'ibm-plex-mono' }) + p({ style: { typography: { fontSize: '12px' }, color: { text: C.mute } }, fontFamily: 'ibm-plex-mono' }, '·') + date('j F Y'))))) +
      group({ style: { border: { top: { color: C.rule, width: '1px', style: 'solid' } }, spacing: { padding: { top: '20px' }, margin: { top: '20px' } } }, layout: { type: 'default' } },
        query({ id: qid++, perPage: 2, offset: 1 }, postTemplate({ style: { spacing: { blockGap: '28px' } }, layout: { type: 'grid', columnCount: 2, minimumColumnWidth: null } }, card({ tSize: '22px', xLen: 30 }))))) +
    column({ width: '23%', style: { border: { left: { color: C.rule, width: '1px', style: 'solid' } }, spacing: { padding: { left: '24px' } } } },
      group({ style: { border: { bottom: { color: C.ink, width: '2px', style: 'solid' } }, spacing: { padding: { bottom: '6px' } } }, layout: { type: 'default' } }, monoLabel('Latest', C.ink, '12px')) +
      query({ id: qid++, perPage: 8, offset: 3 }, postTemplate({ style: { spacing: { blockGap: '0' } } }, card({ tSize: '16.5px', gap: '4px', pad: { top: '11px', bottom: '11px' } }))) +
      p({ style: { typography: { fontSize: '12px', fontWeight: '600' }, elements: linkAccent, spacing: { margin: { top: '12px' } } }, fontFamily: 'ibm-plex-mono' }, `<a href="${PD}/archive/">Full archive and search →</a>`)) +
    column({ width: '23%', style: { spacing: { blockGap: '16px' } } },
      darkBox('Shock Lab', 'What does a $10 oil spike cost?', 'Move oil and the rupee, see the bill for an importer, the pump and a household.', 'Open the calculator', `${PD}/tools/shock-lab/`) +
      toolList() +
      darkBox('Budget X-Ray', 'Halfway through 2026-27', 'How much of the year’s Budget the Centre has already used, line by line.', 'See the X-Ray', `${PD}/tools/budget-x-ray/`)));
  const desk = ([slug, name, id], i) => secHead(name, `${WP}/category/${slug}/`) +
    columns({ style: { spacing: { blockGap: { left: '28px' } } } },
      column({ width: '40%' }, query({ id: qid++, perPage: 1, tax: { category: [id] } }, postTemplate({}, vstack('8px', title('22px') + excerpt('15px', 34) + date())))) +
      column({ width: '60%' }, query({ id: qid++, perPage: 4, offset: 1, tax: { category: [id] } }, postTemplate({ style: { spacing: { blockGap: '20px' } }, layout: { type: 'grid', columnCount: 2, minimumColumnWidth: null } }, vstack('5px', title('16.5px') + excerpt('13.5px', 18) + date())))));
  const series = secHead('Series', `${WP}/series/`) + group({ style: { spacing: { blockGap: '16px' } }, layout: { type: 'grid', columnCount: 4, minimumColumnWidth: '14rem' } },
    SERIES.map(([slug, name, d]) => group({ style: { color: { background: C.stone }, border: { top: { color: C.ink, width: '2px', style: 'solid' } }, spacing: { padding: { top: '14px', bottom: '16px', left: '16px', right: '16px' }, blockGap: '6px' } }, layout: { type: 'flex', orientation: 'vertical' } },
      monoLabel('Series', C.accent, '10.5px') + h(3, { style: { typography: { fontSize: '20px', fontWeight: '500', lineHeight: '1.2' }, elements: linkInk, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'newsreader' }, `<a href="${WP}/tag/${slug}/">${escA(name)}</a>`) +
      p({ style: { typography: { fontSize: '13px', lineHeight: '1.45' }, color: { text: C.graphite }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-sans' }, escA(d)))).join(''));
  const toolsBand = group({ align: 'full', style: { color: { background: C.ink, text: C.paper }, spacing: { padding: { top: '36px', bottom: '40px', left: '24px', right: '24px' }, margin: { top: '56px', bottom: '0' } } }, layout: { type: 'constrained', contentSize: '1232px', wideSize: '1232px' } },
    monoLabel('Tools', C.pink, '11px') + h(2, { style: { typography: { fontSize: '30px', fontWeight: '500', lineHeight: '1.1' }, color: { text: C.paper }, spacing: { margin: { top: '6px', bottom: '18px' } } }, fontFamily: 'newsreader' }, 'Test the numbers yourself') +
    group({ style: { spacing: { blockGap: '18px' } }, layout: { type: 'grid', columnCount: 4, minimumColumnWidth: '14rem' } },
      [['India macro tape', 'Latest, previous, revised', 'CPI, repo, rupee, bond yields, Brent and the Nifty, each with its source and next release.', '/data/'], ['Budget X-Ray', 'Halfway through the Budget', 'Receipts, spending and the deficit against the full-year plan, with a year-end calculator.', '/tools/budget-x-ray/'], ['India by State', 'Thirty-one states compared', 'Income, growth, inflation and state debt on a tile map, with any two measures plotted.', '/tools/india-by-state/'], ['Exposure Map', 'Where India is exposed', 'Crude suppliers, the Hormuz chokepoint, fertiliser and China-sourced goods.', '/tools/exposure/']]
        .map(([k, t, b, u]) => group({ style: { border: { color: C.darkRule, width: '1px', style: 'solid' }, spacing: { padding: { top: '16px', bottom: '16px', left: '16px', right: '16px' }, blockGap: '6px' } }, layout: { type: 'flex', orientation: 'vertical' } },
          monoLabel(k, C.pink, '11px') + h(3, { style: { typography: { fontSize: '21px', fontWeight: '500', lineHeight: '1.15' }, elements: { link: { color: { text: C.paper }, typography: { textDecoration: 'none' }, ':hover': { typography: { textDecoration: 'underline' } } } }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'newsreader' }, `<a href="${PD}${u}">${t}</a>`) +
          p({ style: { typography: { fontSize: '13px', lineHeight: '1.45' }, color: { text: C.darkP }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-sans' }, b))).join('')) +
    p({ style: { typography: { fontSize: '13px', fontWeight: '600' }, elements: { link: { color: { text: C.paper } } }, spacing: { margin: { top: '18px' } } }, fontFamily: 'ibm-plex-sans' }, `<a href="${PD}/tools/" style="text-decoration:underline">All tools →</a>`));
  return dyn('template-part', { slug: 'header', theme: 'pub/twentytwentyfive', tagName: 'header' }) + '\n' +
    wrap(front + CATS.slice(0, 2).map(desk).join('') + series + CATS.slice(2).map(desk).join(''), { tag: 'main', style: { color: { text: C.ink } }, attrs: { fontFamily: 'ibm-plex-sans' } }) + '\n' +
    toolsBand + '\n' + subscribeBand() + '\n' + dyn('template-part', { slug: 'footer', theme: 'pub/twentytwentyfive', tagName: 'footer' });
};

// ---------- single ----------
const rail = () => group({ style: { spacing: { blockGap: '18px' }, position: { type: 'sticky', top: '16px' } }, layout: { type: 'flex', orientation: 'vertical', justifyContent: 'stretch' } },
  group({ style: { border: { color: C.rule2, width: '1px', style: 'solid' }, spacing: { padding: { top: '14px', bottom: '8px', left: '16px', right: '16px' } } }, layout: { type: 'default' } },
    monoLabel('Latest', C.accent, '11px') + query({ id: qid++, perPage: 5 }, postTemplate({ style: { spacing: { blockGap: '0' } } }, card({ kick: false, tSize: '15.5px', gap: '3px', pad: { top: '10px', bottom: '10px' } })))) +
  darkBox('Shock Lab', 'Run your own scenario', 'Oil, the rupee and who pays.', 'Open', `${PD}/tools/shock-lab/`) + toolList());
const single = () => dyn('template-part', { slug: 'header', theme: 'pub/twentytwentyfive', tagName: 'header' }) + '\n' +
  wrap(columns({ style: { spacing: { blockGap: { left: '56px' }, padding: { top: '28px' } } } },
    column({ width: '72%' },
      vstack('12px', kickerTerms('11.5px') + dyn('post-title', { level: 1, style: { typography: { fontSize: '40px', fontWeight: '500', lineHeight: '1.12', letterSpacing: '-0.015em' }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'newsreader' }) +
        excerpt('20px', 60) +
        group({ style: { border: { top: { color: C.rule, width: '1px', style: 'solid' }, bottom: { color: C.rule, width: '1px', style: 'solid' } }, spacing: { padding: { top: '10px', bottom: '10px' }, margin: { top: '6px' } } }, layout: { type: 'flex', flexWrap: 'wrap', verticalAlignment: 'center' } },
          p({ style: { typography: { fontSize: '13px' }, color: { text: C.slate }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-sans' }, 'By') +
          dyn('post-author-name', { style: { typography: { fontSize: '13px', fontWeight: '600' } }, fontFamily: 'ibm-plex-sans' }) + date('j F Y') +
          dyn('post-terms', { term: 'post_tag', separator: ' · ', style: { typography: { fontSize: '11.5px', letterSpacing: '0.02em' }, elements: linkAccent }, fontFamily: 'ibm-plex-mono' }))) +
      dyn('post-content', { style: { typography: { fontSize: '18.5px', lineHeight: '1.65' }, spacing: { margin: { top: '26px' } }, elements: { link: { color: { text: C.ink }, typography: { textDecoration: 'underline' } } } }, fontFamily: 'newsreader', layout: { type: 'constrained', contentSize: '720px', justifyContent: 'left' } }) +
      group({ style: { border: { top: { color: C.rule, width: '1px', style: 'solid' } }, spacing: { padding: { top: '14px' }, margin: { top: '32px' }, blockGap: '10px' } }, layout: { type: 'flex', flexWrap: 'wrap', verticalAlignment: 'center' } },
        monoLabel('Share', C.slate, '11px') +
        dynWrap('jetpack/sharing-buttons', { styleType: 'icon-text', size: 'has-small-icon-size', style: { spacing: { blockGap: { left: '8px' } } } }, ['whatsapp', 'x', 'linkedin', 'facebook', 'mail', 'share'].map(svc => dyn('jetpack/sharing-button', { service: svc, label: { whatsapp: 'WhatsApp', x: 'X', linkedin: 'LinkedIn', facebook: 'Facebook', mail: 'Email', share: 'Share' }[svc] })).join(''))) +
      group({ style: { spacing: { margin: { top: '32px' } } }, layout: { type: 'default' } }, monoLabel('Read next', C.accent, '11px') + dyn('jetpack/related-posts', { displayDate: true, displayThumbnails: false, displayContext: false, postLayout: 'grid', postsToShow: 3, displayHeadline: false })) +
      group({ anchor: 'comments', style: { border: { top: { color: C.ink, width: '2px', style: 'solid' } }, spacing: { padding: { top: '14px' }, margin: { top: '40px' } } }, fontFamily: 'ibm-plex-sans', layout: { type: 'constrained', contentSize: '720px', justifyContent: 'left' } },
        dynWrap('comments', { style: { typography: { fontSize: '15px' } } },
          dyn('comments-title', { showPostTitle: false, level: 2, style: { typography: { fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' } }, fontFamily: 'ibm-plex-sans' }) +
          dynWrap('comment-template', {}, group({ style: { border: { bottom: { color: C.rule, width: '1px', style: 'solid' } }, spacing: { padding: { top: '12px', bottom: '12px' }, blockGap: '4px' } }, layout: { type: 'flex', orientation: 'vertical' } },
            hstack('8px', dyn('comment-author-name', { style: { typography: { fontSize: '14px', fontWeight: '600' } } }) + dyn('comment-date', { format: 'j M Y', style: { typography: { fontSize: '11.5px' }, color: { text: C.mute } }, fontFamily: 'ibm-plex-mono' })) +
            dyn('comment-content', { style: { typography: { fontSize: '16px', lineHeight: '1.55' } }, fontFamily: 'newsreader' }) + dyn('comment-reply-link', { style: { typography: { fontSize: '12px', fontWeight: '600' } } }))) +
          dynWrap('comments-pagination', {}, dyn('comments-pagination-previous') + dyn('comments-pagination-numbers') + dyn('comments-pagination-next')) +
          dyn('post-comments-form', { style: { typography: { fontSize: '14px' } } }))) +
      group({ style: { border: { top: { color: C.ink, width: '2px', style: 'solid' } }, spacing: { padding: { top: '16px' }, margin: { top: '40px' } } }, layout: { type: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' } },
        dyn('post-navigation-link', { type: 'previous', label: '← Previous', showTitle: true, style: { typography: { fontSize: '16px', lineHeight: '1.3' } }, fontFamily: 'newsreader' }) +
        dyn('post-navigation-link', { label: 'Next →', showTitle: true, style: { typography: { fontSize: '16px', lineHeight: '1.3' } }, fontFamily: 'newsreader' }))) +
    column({ width: '28%' }, rail())), { tag: 'main', style: { color: { text: C.ink } }, attrs: { fontFamily: 'ibm-plex-sans' } }) + '\n' +
  subscribeBand() + '\n' + dyn('template-part', { slug: 'footer', theme: 'pub/twentytwentyfive', tagName: 'footer' });

// ---------- archive / index / search ----------
const listRow = () => group({ style: { border: { bottom: { color: C.rule, width: '1px', style: 'solid' } }, spacing: { padding: { top: '16px', bottom: '16px' }, blockGap: '20px' } }, layout: { type: 'flex', flexWrap: 'nowrap', verticalAlignment: 'top' } },
  group({ style: { spacing: { blockGap: '4px' }, layout: { selfStretch: 'fixed', flexSize: '120px' } }, layout: { type: 'flex', orientation: 'vertical' } }, date() + kickerTerms('10.5px')) +
  group({ style: { spacing: { blockGap: '6px' }, layout: { selfStretch: 'fill' } }, layout: { type: 'flex', orientation: 'vertical' } }, title('21px') + excerpt('14.5px', 30)));
const listing = (headInner, q) => dyn('template-part', { slug: 'header', theme: 'pub/twentytwentyfive', tagName: 'header' }) + '\n' +
  wrap(group({ style: { border: { bottom: { color: C.ink, width: '2px', style: 'solid' } }, spacing: { padding: { top: '28px', bottom: '18px' }, blockGap: '8px' } }, layout: { type: 'flex', orientation: 'vertical' } }, headInner) +
    columns({ style: { spacing: { blockGap: { left: '48px' }, padding: { top: '8px' } } } },
      column({ width: '70%' }, query({ id: qid++, perPage: 12, inherit: true, ...q }, postTemplate({ style: { spacing: { blockGap: '0' } } }, listRow()) +
        dynWrap('query-pagination', { paginationArrow: 'arrow', style: { typography: { fontSize: '13px', fontWeight: '600' }, spacing: { margin: { top: '24px' } } }, fontFamily: 'ibm-plex-sans', layout: { type: 'flex', justifyContent: 'space-between' } }, dyn('query-pagination-previous', { label: 'Newer' }) + dyn('query-pagination-numbers') + dyn('query-pagination-next', { label: 'Older' })) +
        dynWrap('query-no-results', {}, p({ fontFamily: 'newsreader', style: { typography: { fontSize: '18px' } } }, 'Nothing here yet. Try the search, or the full archive on the data site.')))) +
      column({ width: '30%' }, rail())), { tag: 'main', style: { color: { text: C.ink } }, attrs: { fontFamily: 'ibm-plex-sans' } }) + '\n' +
  dyn('template-part', { slug: 'footer', theme: 'pub/twentytwentyfive', tagName: 'footer' });
const bigTitle = { style: { typography: { fontSize: '40px', fontWeight: '500', lineHeight: '1.1', letterSpacing: '-0.015em' }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'newsreader' };
const archive = () => listing(monoLabel('Topic', C.accent) + dyn('query-title', { type: 'archive', showPrefix: false, ...bigTitle }) + dyn('term-description', { style: { typography: { fontSize: '17px', lineHeight: '1.5' }, color: { text: C.graphite } }, fontFamily: 'newsreader' }), {});
const index = () => listing(monoLabel('Archive', C.accent) + h(1, bigTitle, 'All analysis'), {});
const search = () => listing(monoLabel('Search', C.accent) + dyn('query-title', { type: 'search', ...bigTitle }) + dyn('search', { label: 'Search', showLabel: false, placeholder: 'Search the archive', buttonText: 'Search', style: { border: { radius: '0px' } } }), {});
const page = () => dyn('template-part', { slug: 'header', theme: 'pub/twentytwentyfive', tagName: 'header' }) + '\n' +
  wrap(group({ style: { spacing: { padding: { top: '28px' }, blockGap: '18px' } }, layout: { type: 'constrained', contentSize: '760px', justifyContent: 'left' } },
    dyn('post-title', { level: 1, ...bigTitle }) + dyn('post-content', { style: { typography: { fontSize: '18.5px', lineHeight: '1.65' } }, fontFamily: 'newsreader', layout: { type: 'constrained', contentSize: '720px', justifyContent: 'left' } })), { tag: 'main', style: { color: { text: C.ink } }, attrs: { fontFamily: 'ibm-plex-sans' } }) + '\n' +
  dyn('template-part', { slug: 'footer', theme: 'pub/twentytwentyfive', tagName: 'footer' });
const p404 = () => dyn('template-part', { slug: 'header', theme: 'pub/twentytwentyfive', tagName: 'header' }) + '\n' +
  wrap(group({ style: { spacing: { padding: { top: '48px', bottom: '48px' }, blockGap: '14px' } }, layout: { type: 'constrained', contentSize: '720px', justifyContent: 'left' } },
    monoLabel('404', C.accent) + h(1, bigTitle, 'Page not found') + p({ style: { typography: { fontSize: '18px' } }, fontFamily: 'newsreader' }, `It may have moved. Search below, or browse the <a href="${PD}/archive/">full archive</a>.`) + dyn('search', { label: 'Search', showLabel: false, placeholder: 'Search the archive', buttonText: 'Search', style: { border: { radius: '0px' } } })), { tag: 'main' }) + '\n' +
  dyn('template-part', { slug: 'footer', theme: 'pub/twentytwentyfive', tagName: 'footer' });

const category = () => listing(p({ style: { typography: { fontSize: '11.5px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase' }, color: { text: '__COLOR__' }, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-mono' }, 'Topic') + dyn('query-title', { type: 'archive', showPrefix: false, ...bigTitle }) + dyn('term-description', { style: { typography: { fontSize: '17px', lineHeight: '1.5' }, color: { text: C.graphite } }, fontFamily: 'newsreader' }), {}).replaceAll(C.accent, '__COLOR__').replace(/"color":\{"text":"#15171A","width":"2px"/, '"color":{"text":"#15171A","width":"2px"');
const seriesT = () => dyn('template-part', { slug: 'header', theme: 'pub/twentytwentyfive', tagName: 'header' }) + '\n' +
  wrap(group({ style: { border: { bottom: { color: C.ink, width: '2px', style: 'solid' } }, spacing: { padding: { top: '28px', bottom: '18px' }, blockGap: '8px' } }, layout: { type: 'flex', orientation: 'vertical' } },
      monoLabel('Series', C.accent) + dyn('query-title', { type: 'archive', showPrefix: false, ...bigTitle }) + dyn('term-description', { style: { typography: { fontSize: '17px', lineHeight: '1.5' }, color: { text: C.graphite } }, fontFamily: 'newsreader' }) + p({ style: { typography: { fontSize: '12px' }, color: { text: C.mute } }, fontFamily: 'ibm-plex-mono' }, 'Read in order, from the first part to the latest.')) +
    columns({ style: { spacing: { blockGap: { left: '48px' }, padding: { top: '8px' } } } },
      column({ width: '70%' }, `<!-- wp:query ${J({ queryId: 90, query: { perPage: 50, pages: 0, offset: 0, postType: 'post', order: 'asc', orderBy: 'date', author: '', search: '', exclude: [], sticky: '', inherit: false, taxQuery: { post_tag: ['__TAGID__'] } } })} -->\n<div class="wp-block-query">` + postTemplate({ style: { spacing: { blockGap: '0' } } }, listRow()) + `</div>\n<!-- /wp:query -->`) +
      column({ width: '30%' }, rail())), { tag: 'main', style: { color: { text: C.ink } }, attrs: { fontFamily: 'ibm-plex-sans' } }) + '\n' +
  dyn('template-part', { slug: 'footer', theme: 'pub/twentytwentyfive', tagName: 'footer' });

const patterns = () => JSON.stringify([
  { title: 'Kakistocrat: article skeleton', content:
    p({ style: { typography: { fontSize: '19px', lineHeight: '1.6' } }, fontFamily: 'newsreader' }, '[Opening: the judgement in two or three sentences. What is happening, and what you conclude.]') +
    h(2, { style: { typography: { fontSize: '24px', fontWeight: '600' } }, fontFamily: 'ibm-plex-sans' }, 'The evidence') + p({ fontFamily: 'newsreader' }, '[The numbers, with a source linked after each one.]') +
    h(2, { style: { typography: { fontSize: '24px', fontWeight: '600' } }, fontFamily: 'ibm-plex-sans' }, 'The other side') + p({ fontFamily: 'newsreader' }, '[The strongest case against your judgement.]') +
    h(2, { style: { typography: { fontSize: '24px', fontWeight: '600' } }, fontFamily: 'ibm-plex-sans' }, 'What would change my mind') + p({ fontFamily: 'newsreader' }, '[The specific data or event that would make you revise the judgement, and when it is due.]') +
    h(2, { style: { typography: { fontSize: '24px', fontWeight: '600' } }, fontFamily: 'ibm-plex-sans' }, 'Sources') + p({ style: { typography: { fontSize: '14px' } }, fontFamily: 'ibm-plex-sans' }, '[Source name, publisher, date, link]') },
  { title: 'Kakistocrat: explore the data (dark card)', content: darkBox('Live data', 'See the numbers behind this piece', 'Charts, sources and the latest figures, updated every weekday.', 'Open the data', `${PD}/today/`) },
  { title: 'Kakistocrat: live figures box', content: group({ style: { color: { background: C.stone }, border: { top: { color: C.ink, width: '2px', style: 'solid' } }, spacing: { padding: { top: '14px', bottom: '14px', left: '18px', right: '18px' }, blockGap: '6px' } }, layout: { type: 'flex', orientation: 'vertical' } },
    monoLabel('Live figures', C.accent, '11px') + [['CPI inflation', '/data/cpi/'], ['RBI repo rate', '/data/repo/'], ['Rupee per dollar', '/data/inr/'], ['10-year bond yield', '/data/g10/'], ['Brent crude', '/commodities/'], ['Nifty 50', '/markets/']].map(([t, u]) => p({ style: { typography: { fontSize: '14.5px' }, elements: linkInk, spacing: { margin: { top: '0', bottom: '0' } } }, fontFamily: 'ibm-plex-sans' }, `<a href="${PD}${u}">${t} →</a>`)).join('')) },
  { title: 'Kakistocrat: key takeaways', content: group({ style: { border: { left: { color: C.accent, width: '4px', style: 'solid' } }, spacing: { padding: { top: '6px', bottom: '6px', left: '18px' }, blockGap: '6px' } }, layout: { type: 'flex', orientation: 'vertical' } },
    monoLabel('Key takeaways', C.accent, '11px') + `<!-- wp:list {"fontFamily":"ibm-plex-sans","style":{"typography":{"fontSize":"15.5px"}}} -->\n<ul class="wp-block-list has-ibm-plex-sans-font-family" style="font-size:15.5px"><!-- wp:list-item -->\n<li>[First point]</li>\n<!-- /wp:list-item --><!-- wp:list-item -->\n<li>[Second point]</li>\n<!-- /wp:list-item --><!-- wp:list-item -->\n<li>[Third point]</li>\n<!-- /wp:list-item --></ul>\n<!-- /wp:list -->`) },
  { title: 'Kakistocrat: chart source line', content: p({ style: { typography: { fontSize: '12px', letterSpacing: '0.02em' }, color: { text: C.mute } }, fontFamily: 'ibm-plex-mono' }, 'Source: [publisher, release name, date]. Chart: The Kakistocrat.') },
]);

const files = { category: category(), series: seriesT(), header: header(), footer: footer(), home: home(), single: single(), archive: archive(), index: index(), search: search(), page: page(), '404': p404() };
await mkdir('static/wp-kit', { recursive: true });
for (const [k, v] of Object.entries(files)) await writeFile(`static/wp-kit/${k}.html`, v);
await writeFile('static/wp-kit/patterns.json', patterns());
await writeFile('static/wp-kit/manifest.json', JSON.stringify({ built: new Date().toISOString(), files: Object.keys(files) }));
console.log(Object.entries(files).map(([k, v]) => `${k}: ${v.length}`).join(', '));
