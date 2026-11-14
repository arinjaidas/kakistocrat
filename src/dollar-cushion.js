(()=>{const raw=document.getElementById('dc-data');if(!raw)return;const data=JSON.parse(raw.textContent),id=x=>document.getElementById(x);
 const vars=['goods','services','transfers','income','capital'],format=n=>(n<0?'−':n>0?'+':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'bn';
 const run=()=>{const row=data.rows.find(x=>x.id===id('dc-period').value),delta=Object.fromEntries(vars.map(k=>[k,+id('dc-'+k).value]));if(!row)return;
 if(vars.some(k=>!Number.isFinite(delta[k])||Math.abs(delta[k])>500)){id('dc-message').textContent='Each shock must be between −$500bn and +$500bn.';return}
 const ca=row.current+delta.goods+delta.services+delta.transfers+delta.income,capital=row.capital+delta.capital;
 const total=ca+capital;
 for(const [name,n] of [['ca',ca],['cap',capital],['overall',total],['monetary',-total]])id('dc-'+name).textContent=format(n);
 id('dc-message').textContent='Uses the published '+row.period+' '+row.stage+' baseline. The assumed balancing transaction of '+format(-total)+' is only an accounting counterpart, not a predicted reserve stock change or exchange rate.';
 };
 vars.forEach(k=>id('dc-'+k).addEventListener('input',run));id('dc-period').addEventListener('change',run);
 id('dc-reset').addEventListener('click',()=>{vars.forEach(k=>id('dc-'+k).value=0);run()});run();
})();
