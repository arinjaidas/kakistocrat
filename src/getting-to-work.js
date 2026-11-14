(() => {
  const form=document.getElementById('gw-form');if(!form)return;
  const id=x=>document.getElementById(x);
  const fields=['days','time-value','a-wage','a-rent','a-fare','a-minutes','a-buffer','a-care','b-wage','b-rent','b-fare','b-minutes','b-buffer','b-care'];
  const n=x=>Number(id('gw-'+x).value);
  const money=v=>(v<0?'−':'')+'₹'+Math.abs(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const hours=v=>v.toLocaleString('en-IN',{maximumFractionDigits:1})+' hours/month';
  const calc=()=>{
    const vals=fields.map(n);
    if(vals.some(v=>!Number.isFinite(v)||v<0)){id('gw-difference').textContent='Enter valid nonnegative numeric inputs.';return}
    const days=n('days'),tv=n('time-value');
    const one=x=>{
      const cash=n(x+'-wage')-n(x+'-rent')-days*n(x+'-fare')-n(x+'-care');
      const time=days*(n(x+'-minutes')+n(x+'-buffer'))/60;
      return {cash,time,adjusted:cash-tv*time,nonwage:n(x+'-rent')+days*n(x+'-fare')+n(x+'-care')+tv*time};
    };
    const a=one('a'),b=one('b'),difference=b.adjusted-a.adjusted;
    for(const [label,result] of [['a',a],['b',b]]){
      id('gw-'+label+'-cash').textContent=money(result.cash);
      id('gw-'+label+'-net').textContent=money(result.adjusted);
      id('gw-'+label+'-time').textContent='Travel and buffer time: '+hours(result.time);
    }
    const which=Math.abs(difference)<0.005?'Neither option has a higher time-adjusted remainder.':difference>0?'Option B has the higher time-adjusted remainder.':'Option A has the higher time-adjusted remainder.';
    id('gw-difference').textContent=which+' Difference (B minus A): '+money(difference)+' per month.';
    id('gw-breakeven').textContent='To match Option A, the Option B take-home wage would need to be '+money(a.adjusted+b.nonwage)+' per month, with all the other assumptions unchanged.';
  };
  form.addEventListener('input',calc);
  form.addEventListener('reset',()=>{requestAnimationFrame(calc)});
  calc();
})();
