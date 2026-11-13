const form = document.querySelector('#landed-cost');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function total(index) {
  const value = name => form.elements.namedItem(name + index).valueAsNumber;
  return value('value') * (1 + (value('ordinary') + value('extra')) / 100)
    + value('freight') + value('compliance');
}

function render() {
  const results = [0, 1].map(index => document.querySelector('#landed-' + index));
  const difference = document.querySelector('#landed-difference');
  if (!form.checkValidity()) {
    results.forEach(result => { result.value = ''; });
    difference.textContent = 'Enter a valid, non-negative number in each field.';
    return;
  }
  const [a, b] = [total(0), total(1)];
  results[0].value = currency.format(a);
  results[1].value = currency.format(b);
  const cents = Math.round(a * 100) - Math.round(b * 100);
  difference.textContent = cents === 0
    ? 'Both suppliers have the same estimated landed cost.'
    : 'Supplier ' + (cents > 0 ? 'B' : 'A') + ' is cheaper by ' + currency.format(Math.abs(cents) / 100) + '.';
}
form.addEventListener('input', render);
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', () => requestAnimationFrame(render));
render();
