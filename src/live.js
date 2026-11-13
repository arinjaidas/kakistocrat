// Live crypto prices from Coinbase's public market-data feed (no key, no cost). Elements: <span data-live="BTC-USD"></span>
(function () {
  const els = [...document.querySelectorAll('[data-live]')]; if (!els.length) return;
  const ids = [...new Set(els.map(e => e.dataset.live))], open = {};
  const fmt = v => v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const paint = (id, p, o) => els.filter(e => e.dataset.live === id).forEach(e => { const ch = o ? (p / o - 1) * 100 : null; e.innerHTML = `$${fmt(p)}${ch == null ? '' : ` <i class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '+' : '−'}${Math.abs(ch).toFixed(2)}%</i>`}`; e.closest('.live')?.classList.add('on'); });
  try {
    const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', product_ids: ids, channels: ['ticker'] }));
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.type === 'ticker' && d.price) { open[d.product_id] = +d.open_24h; paint(d.product_id, +d.price, open[d.product_id]); } };
    ws.onerror = () => ids.forEach(id => fetch(`https://api.exchange.coinbase.com/products/${id}/ticker`).then(r => r.json()).then(d => paint(id, +d.price)).catch(() => {}));
  } catch (e) {}
})();
