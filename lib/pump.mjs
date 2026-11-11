// What's in a litre of petrol: Delhi price build-up as a waterfall, plus a calculator.
import { esc } from './charts.mjs';

const f = (v, d = 2) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const longD = iso => new Date(iso + (iso.length === 7 ? '-01' : '') + 'T00:00:00Z').toLocaleDateString('en-GB', { day: iso.length === 7 ? undefined : 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function pumpPage(P, { pageHead, brent, inr }) {
  const base = +(P.chargedToDealersExVat - P.excise).toFixed(2), tax = P.excise + P.vat, taxShare = tax / P.rsp * 100;
  const crudePerL = brent && inr ? brent.v * inr / 158.987 : null;
  const steps = [['Oil company price', base, 'Refinery-gate price, freight and the oil company’s margin'], ['Central excise', P.excise, 'Fixed rupees per litre, same everywhere in India'], ['Dealer commission', P.dealerCommission, 'What the petrol pump keeps'], ['Delhi VAT', P.vat, `${f(P.vatRate)}% on everything above, including excise`]];
  return pageHead('Pump price', `What’s in a litre of petrol: ₹${f(P.rsp)} in ${P.city}`, `Indian Oil’s price build-up for ${longD(P.effective)}. Taxes take ₹${f(tax)} of every litre, ${f(taxShare, 1)}% of the price.`) + `<div class="wrap">
  <section class="xr-sec"><div class="mk-cards" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
   <div class="mk-card"><span class="lbl">Pump price, ${esc(P.city)}</span><span class="v">₹${f(P.rsp)}</span><span class="c">per litre</span><span class="sub">from ${longD(P.effective)}</span></div>
   <div class="mk-card"><span class="lbl">Taxes</span><span class="v">₹${f(tax)}</span><span class="c dn">${f(taxShare, 1)}% of the price</span><span class="sub">Centre ₹${f(P.excise)} · Delhi ₹${f(P.vat)}</span></div>
   <div class="mk-card"><span class="lbl">Before tax and dealer</span><span class="v">₹${f(base)}</span><span class="c">oil company price</span><span class="sub">price to dealer minus excise</span></div>
   ${crudePerL ? `<div class="mk-card"><span class="lbl">A litre of Brent crude</span><span class="v">₹${f(crudePerL)}</span><span class="c">$${f(brent.v)}/bbl × ₹${f(inr)}</span><span class="sub">Brent spot, ${esc(brent.d)}</span></div>` : ''}
  </div></section>
  <section class="xr-sec"><h2 class="col-title">From refinery gate to pump</h2><div id="pp-wf" class="ec" style="height:420px"></div>
   <p class="meta">${steps.map(s => `<b>${s[0]}</b>: ${s[2]}.`).join(' ')}</p></section>
  <section class="xr-sec"><h2 class="col-title">Pump price calculator</h2>
   <div class="pp-calc">
    <label>Oil company price, ₹/litre <input type="range" id="pp-b" min="40" max="110" step="0.01" value="${base}"><output id="pp-bo">${f(base)}</output></label>
    <label>Central excise, ₹/litre <input type="range" id="pp-e" min="0" max="35" step="0.1" value="${P.excise}"><output id="pp-eo">${f(P.excise)}</output></label>
    <label>Dealer commission, ₹/litre <input type="range" id="pp-d" min="2" max="8" step="0.01" value="${P.dealerCommission}"><output id="pp-do">${f(P.dealerCommission)}</output></label>
    <label>State VAT, % <input type="range" id="pp-v" min="0" max="35" step="0.1" value="${P.vatRate}"><output id="pp-vo">${f(P.vatRate)}</output></label>
    <div class="pp-out"><span>Pump price</span><b id="pp-r">₹${f(P.rsp)}</b><small id="pp-rd"></small><span style="margin-top:8px">Tax share</span><b id="pp-t">${f(taxShare, 1)}%</b></div>
   </div>
   <p class="meta">Because VAT is charged on top of excise, every rupee of central excise adds about ₹${f(1 + P.vatRate / 100)} at the pump in Delhi. Try putting excise back to ₹${f(P.exciseHistory[0].total)}, where it stood before ${longD(P.exciseHistory[1].from)}.</p></section>
  <section class="xr-sec"><h2 class="col-title">Central excise on petrol</h2><ul class="src">${P.exciseHistory.map(h => `<li>From ${longD(h.from)}: ₹${f(h.total)} a litre. ${esc(h.note)}.</li>`).join('')}</ul></section>
  <section class="xr-sec"><h2 class="col-title">Sources</h2><ul class="src">${P.sources.map(s => `<li><a href="${s.url}">${esc(s.name)}</a></li>`).join('')}<li>Brent spot: US Energy Information Administration via FRED; rupee rate: ECB. One barrel is 158.987 litres. Crude is not petrol: refining, freight and losses sit between the two.</li></ul><p class="meta">Checked ${longD(P.checked)}. Data at <a href="/api/pump.json" style="text-decoration:underline">/api/pump.json</a>. See also the <a href="/tools/shock-lab/" style="text-decoration:underline">Shock Lab</a> and the <a href="/commodities/" style="text-decoration:underline">commodities board</a>.</p></section>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script>window.__PUMP=${JSON.stringify({ base, ...P })};</script>
  <script defer>
  (function(){var P=window.__PUMP,$=function(i){return document.getElementById(i)},nf=function(v,d){return Number(v).toLocaleString('en-IN',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d})};
   function calc(){var b=+$('pp-b').value,e=+$('pp-e').value,d=+$('pp-d').value,v=+$('pp-v').value,vat=(b+e+d)*v/100,r=b+e+d+vat,diff=r-P.rsp;
    $('pp-bo').textContent=nf(b);$('pp-eo').textContent=nf(e);$('pp-do').textContent=nf(d);$('pp-vo').textContent=nf(v);$('pp-r').textContent='₹'+nf(r);$('pp-t').textContent=nf((e+vat)/r*100,1)+'%';
    $('pp-rd').textContent=Math.abs(diff)<0.05?'same as today':(diff>0?'+':'−')+'₹'+nf(Math.abs(diff))+' on today';$('pp-rd').className=Math.abs(diff)<0.05?'':diff>0?'dn':'up';}
   ['pp-b','pp-e','pp-d','pp-v'].forEach(function(i){$(i).addEventListener('input',calc)});calc();
   (function w(){if(!window.echarts)return setTimeout(w,60);var c=echarts.init($('pp-wf'));addEventListener('resize',function(){c.resize()});
    var cats=['Oil company price','Central excise','Dealer commission','Delhi VAT','Pump price'],vals=[P.base,P.excise,P.dealerCommission,P.vat],cum=[0,P.base,P.base+P.excise,P.base+P.excise+P.dealerCommission];
    var col=['#15171A','#B42318','#6B7078','#B45309','#1D4ED8'];
    c.setOption({textStyle:{fontFamily:'"IBM Plex Sans",sans-serif'},grid:{left:56,right:24,top:30,bottom:40},tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:function(p){var x=p[1];return x.name+': ₹'+nf(x.value)+' ('+nf(x.value/P.rsp*100,1)+'% of the price)'}},
     xAxis:{type:'category',data:cats,axisTick:{show:false},axisLine:{lineStyle:{color:'#E2DFD8'}},axisLabel:{color:'#15171A',fontSize:12}},yAxis:{type:'value',axisLabel:{color:'#6B7078',fontFamily:'"IBM Plex Mono",monospace',formatter:'₹{value}'},splitLine:{lineStyle:{color:'#EEECE7'}}},
     series:[{type:'bar',stack:'w',silent:true,itemStyle:{color:'transparent'},data:cum.concat([0])},{type:'bar',stack:'w',barWidth:'56%',data:vals.concat([P.rsp]).map(function(v,i){return{value:v,itemStyle:{color:col[i],borderRadius:2}}}),label:{show:true,position:'top',fontFamily:'"IBM Plex Mono",monospace',fontWeight:700,color:'#15171A',formatter:function(p){return '₹'+nf(p.value)}}}]});})();
  })();
  </script>`;
}
