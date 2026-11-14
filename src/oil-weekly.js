(()=>{const search=document.getElementById('ow-search'),list=document.getElementById('ow-list');if(!search||!list)return;
 const items=[...list.querySelectorAll('.ow-list-item')],count=document.getElementById('ow-count'),empty=document.getElementById('ow-empty');
 const params=new URLSearchParams(location.search);search.value=params.get('q')||'';
 const run=()=>{const words=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);let shown=0;
  for(const item of items){const show=words.every(w=>item.dataset.text.includes(w));item.hidden=!show;if(show)shown++}
  count.textContent='Showing '+shown+' of '+items.length+' weeks';empty.hidden=shown>0;
  const p=new URLSearchParams();if(search.value.trim())p.set('q',search.value.trim());
  history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+location.hash);
 };
 search.addEventListener('input',run);run();
})();
