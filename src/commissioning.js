(() => {
 const root=document.getElementById('co-cards');if(!root)return;
 const q=document.getElementById('co-search'),st=document.getElementById('co-status'),sr=document.getElementById('co-series'),cards=[...root.querySelectorAll('.co-card')],out=document.getElementById('co-result'),empty=document.getElementById('co-empty');
 const params=new URLSearchParams(location.search);q.value=params.get('q')||'';
 if([...st.options].some(x=>x.value===params.get('status')))st.value=params.get('status');
 if([...sr.options].some(x=>x.value===params.get('series')))sr.value=params.get('series');
 const run=()=>{let shown=0;const words=q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  for(const c of cards){let hit=words.every(w=>c.dataset.search.includes(w))&&(st.value==='all'||st.value===c.dataset.status)&&(sr.value==='all'||sr.value===c.dataset.series);
   c.hidden=!hit;if(hit)shown++}
  out.textContent='Showing '+shown+' of '+cards.length+' commissions';empty.hidden=shown>0;
  const p=new URLSearchParams();if(q.value.trim())p.set('q',q.value.trim());if(st.value!=='all')p.set('status',st.value);if(sr.value!=='all')p.set('series',sr.value);
  const s=p.toString();history.replaceState(null,'',location.pathname+(s?'?'+s:'')+location.hash);
 };
 q.addEventListener('input',run);st.addEventListener('change',run);sr.addEventListener('change',run);document.getElementById('co-reset').addEventListener('click',()=>{q.value='';st.value='all';sr.value='all';run();q.focus()});run();
})();
