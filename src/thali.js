(()=>{const raw=document.getElementById('th-data');if(!raw)return;const data=JSON.parse(raw.textContent),id=x=>document.getElementById(x);
 const rupee=x=>(x<0?'−':'')+'₹'+Math.abs(x).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
 const inputs=data.rows.map((_,i)=>id('th-quantity-'+i)).concat([id('th-uplift'),id('th-cooking'),id('th-meals')]);
 const run=()=>{const q=data.rows.map((_,i)=>Number(id('th-quantity-'+i).value)),up=+id('th-uplift').value,cook=+id('th-cooking').value,meals=+id('th-meals').value;
  const v=[...q,up,cook,meals];if(v.some(x=>!Number.isFinite(x)||x<0)||up>1000||meals>300||q.some(x=>x>5)){id('th-validate').textContent='Use nonnegative quantities of at most 5 kg each, an uplift up to 1,000% and at most 300 meals.';return}
  id('th-validate').textContent='Calculated from dated mandi averages and reader-selected assumptions, not a retail survey.';
  const rawCost=data.rows.reduce((s,r,i)=>{const cost=q[i]*r.wholesale_rupees_per_kg;id('th-cost-'+i).textContent=rupee(cost);return s+cost},0);
  const adjusted=rawCost*(1+up/100)+cook;
  id('th-raw').textContent=rupee(rawCost);id('th-total').textContent=rupee(adjusted);id('th-month').textContent=rupee(adjusted*meals);
 };
 inputs.forEach(x=>x.addEventListener('input',run));run();
})();
