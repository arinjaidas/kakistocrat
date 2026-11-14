(() => {
  const root=document.getElementById('ca-dataset'); if(!root) return;
  const d=JSON.parse(root.textContent),metric=document.getElementById('ca-metric'),baseline=document.getElementById('ca-base');
  const money=n=> (n<0?'−':'')+'₹'+Math.abs(n).toLocaleString('en-IN',{maximumFractionDigits:0})+' crore';
  const render=()=>{
    const row=d.observations.find(r=>r.code===metric.value),base=row[baseline.value],pa=row.pa;
    const set=(id,v)=>{document.getElementById(id).textContent=v};
    set('ca-base-value',base==null?'Not available':money(base));
    set('ca-pa-value',pa==null?'Not available':money(pa));
    set('ca-change',base==null||pa==null?'Not comparable':money(pa-base));
    set('ca-change-pc',base==null||pa==null||base===0?'Not comparable':((pa/base-1)*100).toFixed(2)+'%');
    document.getElementById('ca-note').textContent=row.note;
  };
  metric.addEventListener('change',render);baseline.addEventListener('change',render);render();
})();
