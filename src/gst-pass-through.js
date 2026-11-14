(() => {
  const el=id=>document.getElementById(id);
  if (!el('gst-tool')) return;
  const fields=['gst-price','gst-old','gst-new','gst-share','gst-units'].map(el);
  const rupee=(v)=> (v<0?'−':'')+'₹'+Math.abs(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const calculate=()=>{
    const [P,o,n,p,u]=fields.map(f=>+f.value);
    const okay=[P,o,n,p,u].every(Number.isFinite)&&P>0&&o>=0&&o<=100&&n>=0&&n<=100&&p>=0&&p<=100&&u>=0;
    if(!okay){el('gst-math').textContent='Enter valid nonnegative values and rates between 0% and 100%.';return}
    const base=P/(1+o/100), full=base*(1+n/100), saving=P-full;
    const price=P-(p/100)*saving, seller=price/(1+n/100)-base, tax=price-price/(1+n/100)-base*o/100;
    const vals={'gst-price-new':price,'gst-saving':P-price,'gst-monthly':(P-price)*u,'gst-seller':seller,'gst-tax':tax};
    for(const [id,num] of Object.entries(vals))el(id).textContent=rupee(num);
    el('gst-share-label').textContent=p+'%';
    el('gst-math').textContent='Old pretax price: '+rupee(base)+'; price at full statutory pass-through: '+rupee(full)+'. All other prices and costs are assumed unchanged.';
  };
  fields.forEach(f=>f.addEventListener('input',calculate));
  el('gst-reset').addEventListener('click',()=>{
    const defaults=[118,18,5,100,10];fields.forEach((f,i)=>{f.value=defaults[i]});calculate();
  });
  calculate();
})();
