(()=>{const pick=document.getElementById('os-filter'),root=document.getElementById('os-cards');if(!pick||!root)return;
 const cards=[...root.querySelectorAll('.os-card')],params=new URLSearchParams(location.search);
 const from=params.get('outcome');if([...pick.options].some(x=>x.value===from))pick.value=from;
 const run=()=>{let shown=0;for(const c of cards){let match=pick.value==='all'||c.dataset.dimension===pick.value;c.hidden=!match;if(match)shown++}
 document.getElementById('os-count').textContent=shown===cards.length?'Showing all five outcomes':'Showing '+shown+' outcome';
 const p=new URLSearchParams();if(pick.value!=='all')p.set('outcome',pick.value);history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+location.hash);
 };
 pick.addEventListener('change',run);run();
})();
