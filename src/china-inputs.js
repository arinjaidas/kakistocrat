(()=>{const root=document.getElementById('ci-rows');if(!root)return;
 const id=x=>document.getElementById(x),q=id('ci-query'),min=id('ci-min'),rows=[...root.querySelectorAll('tr')];
 const render=()=>{const term=q.value.trim().toLowerCase(),words=term.split(/\s+/).filter(Boolean);let count=0;for(const r of rows){const label=(r.dataset.name||'')+' '+(r.dataset.hs||'');const okay=words.every(w=>label.includes(w))&&Number(r.dataset.share)>=Number(min.value);r.hidden=!okay;if(okay)count++}id('ci-count').textContent='Showing '+count+' of '+rows.length+' chapters';};
 q.addEventListener('input',render);min.addEventListener('change',render);render();
 const calc=()=>{const spend=+id('ci-spend').value,sourcing=+id('ci-sourcing').value,shock=+id('ci-shock').value;const ok=Number.isFinite(spend)&&spend>=0&&Number.isFinite(sourcing)&&sourcing>=0&&sourcing<=100&&Number.isFinite(shock)&&shock>=-100&&shock<=1000;
  if(!ok){id('ci-result').textContent='Invalid inputs';id('ci-formula').textContent='Enter a nonnegative spend, sourcing share 0–100% and shock −100% to 1,000%.';return}
  const bill=spend*sourcing/100*shock/100;id('ci-result').textContent=(bill<0?'−':'')+'₹'+Math.abs(bill).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});id('ci-formula').textContent='₹'+spend.toLocaleString('en-IN')+' × '+sourcing+'% × '+shock+'% = '+(bill<0?'−':'')+'₹'+Math.abs(bill).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})+'. No substitution or price pass-through model is assumed.';
 };for(const name of ['ci-spend','ci-sourcing','ci-shock'])id(name).addEventListener('input',calc);calc();
})();
