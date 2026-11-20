/* DUKAANOS — frontend prototype */
const DAY=864e5;

/* ---------- safety helpers ----------
   $ never returns null: a missing id logs a warning and hands back a detached
   dummy element, so one absent element can no longer stop the whole script.
   step() isolates each init/render function so one failure can't block the rest. */
const ghosts={};
const $=id=>document.getElementById(id)||(console.warn("[DukaanOS] missing element #"+id),ghosts[id]||(ghosts[id]=document.createElement("div")));
const $$=s=>[...document.querySelectorAll(s)];
const step=(name,fn)=>{try{return fn()}catch(e){console.error("[DukaanOS] "+name+" failed:",e)}};
const clone=o=>JSON.parse(JSON.stringify(o));
let seq=0;const nid=()=>Date.now()*100+(seq++%100);

/* ---------- data ---------- */
const GENERIC=["groceries"]; /* catch-all sale labels: counted in revenue, not ranked as a product */
const seedSales=[["Milk 500ml",240,"UPI",0,40],["Parle-G 250g",120,"Cash",0,95],["Groceries",760,"UPI",0,150],["Bread",90,"Cash",1,200],["Groceries",1480,"UPI",1,260],["Maggi 70g",310,"Cash",2,180],["Groceries",2150,"UPI",3,120],["Coca-Cola 750ml",420,"Cash",4,90]];
const makeDefault=()=>{const now=Date.now();return{
 products:[[1,"Parle-G 250g",6,10,4,40],[2,"Milk 500ml",18,15,7,30],[3,"Bread",8,12,5,45],[4,"Tata Salt 1kg",4,8,2,28],[5,"Maggi 70g",9,12,5,14],[6,"Surf Excel",3,7,1,120],[7,"Coca-Cola 750ml",5,10,3,45]].map(([id,name,stock,low,daily,price])=>({id,name,stock,low,daily,price})),
 payments:[{id:1,name:"Ramesh Kumar",amount:420,due:"3 days ago"},{id:2,name:"Priya Sharma",amount:850,due:"Today"},{id:3,name:"Amit",amount:600,due:"7 days ago"}],
 sales:seedSales.map(([product,amount,payment,d,m])=>({product,amount,payment,qty:1,ts:now-d*DAY-m*6e4})),
 expenses:[{name:"Electricity bill",amount:1250,ts:now-3e6},{name:"Delivery boy",amount:500,ts:now-6e6}],
 settings:{shopName:"Rajesh Kirana",ownerName:"Rajesh Kumar",city:"Ghaziabad, Uttar Pradesh"}}};

/* Saved data from an older version (or hand-edited / partial) is repaired instead of crashing startup. */
function normalize(d){
 const ok=d&&typeof d==="object"&&["products","sales","payments","expenses"].some(k=>Array.isArray(d[k]));
 if(!ok)return makeDefault();
 const A=k=>Array.isArray(d[k])?d[k]:[],N=(v,f=0)=>Number.isFinite(+v)?+v:f;let uid=nid();
 return{
  products:A("products").filter(p=>p&&p.name).map(p=>({id:N(p.id,uid++),name:String(p.name),stock:N(p.stock),low:N(p.low,10),daily:N(p.daily),price:N(p.price)})),
  payments:A("payments").filter(x=>x&&x.name).map(x=>({id:N(x.id,uid++),name:String(x.name),amount:N(x.amount),due:String(x.due||"Today")})),
  sales:A("sales").filter(s=>s&&Number.isFinite(+s.ts)).map(s=>({product:String(s.product||"Sale"),amount:N(s.amount),payment:String(s.payment||"Cash"),qty:N(s.qty,1)||1,ts:+s.ts})),
  expenses:A("expenses").filter(e=>e&&Number.isFinite(+e.ts)).map(e=>({name:String(e.name||"Expense"),amount:N(e.amount),ts:+e.ts})),
  settings:Object.assign({},makeDefault().settings,d.settings&&typeof d.settings==="object"?d.settings:{})}}
let data=null;try{data=JSON.parse(localStorage.getItem("dk-data")||"null")}catch(e){}
data=normalize(data);
const save=()=>{try{localStorage.setItem("dk-data",JSON.stringify(data))}catch(e){}};

/* notes live under their own key, so "Reset demo data" never wipes them */
function normNotes(a){
 if(!Array.isArray(a))return[];let uid=nid();
 return a.filter(n=>n&&typeof n==="object").map(n=>{
  const items=Array.isArray(n.items)?n.items.filter(i=>i&&String(i.text||"").trim()).map(i=>({id:Number(i.id)||uid++,text:String(i.text),done:!!i.done})):[];
  const c=Number.isFinite(+n.created)?+n.created:Date.now();
  return{id:Number(n.id)||uid++,title:String(n.title||""),body:String(n.body||""),type:n.type==="list"?"list":"text",items,pinned:!!n.pinned,created:c,updated:Number.isFinite(+n.updated)?+n.updated:c}})}
let notes=[];try{notes=normNotes(JSON.parse(localStorage.getItem("dk-notes")||"[]"))}catch(e){}
let notesWarned=false;
const saveNotes=()=>{try{localStorage.setItem("dk-notes",JSON.stringify(notes))}catch(e){if(!notesWarned){notesWarned=true;toast("Couldn't save: browser storage is blocked")}}};

/* ---------- formatting / small helpers ---------- */
const money=n=>{n=Number(n)||0;return(n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN",{maximumFractionDigits:2})};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sameDay=ts=>new Date(ts).toDateString()===new Date().toDateString();
const sum=a=>a.reduce((s,x)=>s+Number(x.amount),0);
const todaySales=()=>data.sales.filter(s=>sameDay(s.ts)),todayExp=()=>data.expenses.filter(e=>sameDay(e.ts));
const weekSales=()=>data.sales.filter(s=>s.ts>Date.now()-7*DAY);
const low=()=>data.products.filter(p=>p.stock<=p.low);
const buyQty=p=>Math.max(p.low*2,p.daily*7)-p.stock;
const timeStr=ts=>new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
const dayLabel=ts=>sameDay(ts)?"Today":new Date(ts).toLocaleDateString("en-IN",{day:"numeric",month:"short"});

function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;$("toasts").append(t);setTimeout(()=>{t.classList.add("out");setTimeout(()=>t.remove(),320)},2800)}
function countTo(el,val){const from=Number(el.dataset.v||0);el.dataset.v=val;if(matchMedia("(prefers-reduced-motion: reduce)").matches||from===val){el.textContent=el.dataset.fmt==="n"?val:money(val);return}
  const t0=performance.now();(function step(t){const p=Math.min(1,(t-t0)/600),e=1-Math.pow(1-p,3),v=p===1?val:Math.round(from+(val-from)*e);el.textContent=el.dataset.fmt==="n"?v:money(v);if(p<1)requestAnimationFrame(step)})(t0)}
const setNum=(id,v,isCount)=>{const e=$(id);if(isCount)e.dataset.fmt="n";countTo(e,v)};

/* ---------- theme ---------- */
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem("dk-theme",t)}catch(e){}$$("#themeSeg button").forEach(b=>b.classList.toggle("on",b.dataset.t===t))}

/* ---------- header ---------- */
function updateHeader(){const h=new Date().getHours();$("greeting").textContent=h<12?"GOOD MORNING":h<17?"GOOD AFTERNOON":"GOOD EVENING";
  $("todayDate").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const s=data.settings;$("shopMiniName").textContent=s.shopName;$("shopMiniCity").textContent=String(s.city||"").split(",")[0];$("shopAvatar").textContent=String(s.shopName).split(" ").filter(Boolean).map(w=>w[0]).slice(0,2).join("").toUpperCase()}

/* ---------- dashboard stats ---------- */
function calculateStats(){const ts=todaySales(),sales=sum(ts),exp=sum(todayExp()),pend=sum(data.payments),lows=low().length,week=sum(weekSales());
  setNum("todaySales",sales);setNum("salesPageToday",sales);setNum("todayExpenses",exp);setNum("pendingTotal",pend);setNum("udhaarTotal",pend);setNum("salesWeek",week);setNum("profitToday",sales-exp);
  setNum("lowStockCount",lows,1);setNum("inventoryLow",lows,1);setNum("inventoryOut",data.products.filter(p=>!p.stock).length,1);setNum("totalProducts",data.products.length,1);setNum("udhaarPeople",data.payments.length,1);
  $("salesNote").textContent=`${ts.length} sale${ts.length===1?"":"s"} recorded today`;$("pendingNote").textContent=`${data.payments.length} customer${data.payments.length===1?"":"s"} owe you`;
  $("productList").innerHTML=data.products.map(p=>`<option value="${esc(p.name)}">`).join("")}

/* ---------- insights ---------- */
function renderInsights(){const l=low(),p=l[0];let h="";
  if(p){const d=p.daily>0?Math.max(1,Math.floor(p.stock/p.daily)):7;h+=`<div class="smart-insight"><strong>📦 ${esc(p.name)} may run out soon</strong><p>You have ${p.stock} left. At ${p.daily} per day, that lasts about ${d} day${d>1?"s":""}.</p><span class="action">Add it to your next order</span></div>`}
  const best={};weekSales().forEach(s=>best[s.product]=(best[s.product]||0)+s.amount);const top=Object.entries(best).filter(([k])=>!GENERIC.includes(k.toLowerCase())).sort((a,b)=>b[1]-a[1])[0];
  if(top)h+=`<div class="smart-insight"><strong>📈 ${esc(top[0])} is your top seller this week</strong><p>${money(top[1])} in sales over the last 7 days.</p></div>`;
  const old=data.payments.filter(x=>/ago/.test(x.due));h+=`<div class="smart-insight"><strong>🧾 ${data.payments.length} payment${data.payments.length===1?"":"s"} pending</strong><p>${money(sum(data.payments))} outstanding${old.length?`, ${old.length} overdue`:""}.</p></div>`;
  $("smartInsights").innerHTML=h;
  $("insightCards").innerHTML=`<div class="big-insight"><span>📈</span><h2>Last 7 days</h2><p>You sold <strong>${money(sum(weekSales()))}</strong> across ${weekSales().length} sales.</p></div>
  <div class="big-insight"><span>📦</span><h2>Stock needs attention</h2><p>${l.length} product${l.length===1?" is":"s are"} at or below the preferred level.</p></div>
  <div class="big-insight"><span>🧾</span><h2>Udhaar reminder</h2><p>${data.payments.length} customer${data.payments.length===1?" has":"s have"} ${money(sum(data.payments))} pending.</p></div>`}

function renderPreviews(){const l=low().slice(0,4);
  $("inventoryPreview").innerHTML=l.length?l.map(p=>`<div class="inventory-row"><div class="product-info"><strong>${esc(p.name)}</strong><small>Usually sells ${p.daily}/day</small></div><span class="stock-badge ${p.stock?"":"out"}">${p.stock?p.stock+" left":"Out of stock"}</span></div>`).join(""):`<p class="empty">Everything looks healthy 🎉</p>`;
  $("paymentPreview").innerHTML=data.payments.length?data.payments.slice(0,4).map(x=>`<div class="payment-row"><div class="customer-info"><strong>${esc(x.name)}</strong><small>${esc(x.due)}</small></div><span class="amount">${money(x.amount)}</span></div>`).join(""):`<p class="empty">No pending payments 🎉</p>`}

function renderInventory(){const q=$("inventorySearch").value.toLowerCase();const list=data.products.filter(p=>p.name.toLowerCase().includes(q));
  $("inventoryList").innerHTML=list.length?list.map((p,i)=>{const c=!p.stock?"out":p.stock<=p.low?"low":"",st=!p.stock?"Out of stock":c?"Low":"Healthy";
  return`<div class="inventory-item" style="animation-delay:${i*30}ms"><div><strong>${esc(p.name)}</strong><small>${money(p.price)} · sells ~${p.daily}/day · low at ${p.low} · ${st}</small></div>
  <div class="stock-number ${c}">${p.stock}</div><div></div><div class="row-actions"><button class="mini" data-act="stock" data-id="${p.id}" data-d="-1" aria-label="Decrease">−</button><button class="mini" data-act="stock" data-id="${p.id}" data-d="1" aria-label="Increase">+</button><button class="mini" data-act="stock" data-id="${p.id}" data-d="10">+10</button><button class="mini bad" data-act="delProduct" data-id="${p.id}" aria-label="Delete">×</button></div></div>`}).join(""):`<p class="empty">No products found.</p>`}

function renderSales(){const l=[...data.sales].sort((a,b)=>b.ts-a.ts).slice(0,12);
  $("salesList").innerHTML=l.map(s=>`<div><div><strong>${esc(s.product)}${s.qty>1?" × "+s.qty:""}</strong><small>${dayLabel(s.ts)}, ${timeStr(s.ts)} · ${esc(s.payment)}</small></div><strong>${money(s.amount)}</strong></div>`).join("")||`<p class="empty">No sales yet.</p>`;
  $("expenseList").innerHTML=[...data.expenses].sort((a,b)=>b.ts-a.ts).slice(0,12).map(e=>`<div><div><strong>${esc(e.name)}</strong><small>${dayLabel(e.ts)}, ${timeStr(e.ts)}</small></div><strong>${money(e.amount)}</strong></div>`).join("")||`<p class="empty">No expenses yet.</p>`}

function renderPayments(){$("udhaarList").innerHTML=data.payments.map((x,i)=>`<div class="payment-row" style="animation:rise .35s var(--ease) ${i*40}ms both"><div class="customer-info"><strong>${esc(x.name)}</strong><small>Due: ${esc(x.due)}</small></div>
  <div class="row-actions"><span class="amount">${money(x.amount)}</span><button class="mini good" data-act="receive" data-id="${x.id}">Receive</button><button class="mini good" data-act="paid" data-id="${x.id}">Paid in full</button></div></div>`).join("")||`<p class="empty">No one owes you anything right now 🎉</p>`}

function renderPurchases(){const l=low();$("restockAll").classList.toggle("hidden",!l.length);
  $("purchaseList").innerHTML=l.map((p,i)=>`<div class="purchase-item" style="animation-delay:${i*40}ms"><div><strong>${esc(p.name)}</strong><p>${p.stock} left · usually sells ${p.daily}/day</p></div><div class="row-actions"><div style="text-align:right"><strong>Buy ${buyQty(p)}</strong><br><span class="recommended">Recommended</span></div><button class="mini good" data-act="received" data-id="${p.id}">Received</button></div></div>`).join("")||`<p class="empty">Nothing to order right now.</p>`}

/* ---------- MONTHLY TRACKER ---------- */
const mKey=ts=>{const d=new Date(ts);return d.getFullYear()*12+d.getMonth()};
const curKey=()=>mKey(Date.now());
const mDate=(k,d=1)=>new Date(Math.floor(k/12),k%12,d);
const mLabel=k=>mDate(k).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
const mShort=k=>mDate(k).toLocaleDateString("en-IN",{month:"short"});
const mTick=(k,first)=>mShort(k)+(first||k%12===0?" ’"+String(Math.floor(k/12)).slice(2):"");
let monthSel=null;

function monthStats(k){
 const s=data.sales.filter(x=>mKey(x.ts)===k),e=data.expenses.filter(x=>mKey(x.ts)===k);
 const rev=sum(s),exp=sum(e),byDay={},prods={};
 s.forEach(x=>{const d=new Date(x.ts).getDate();byDay[d]=(byDay[d]||0)+x.amount;
   if(GENERIC.includes(x.product.toLowerCase()))return;
   const o=prods[x.product]||(prods[x.product]={name:x.product,rev:0,qty:0});o.rev+=x.amount;o.qty+=x.qty});
 return{k,rev,exp,profit:rev-exp,count:s.length,ec:e.length,byDay,prods:Object.values(prods).sort((a,b)=>b.rev-a.rev)}}

function chip(c,p,inv,pk,has){
 const lbl=mShort(pk);
 if(!has)return`<span>No ${lbl} data to compare</span>`;
 if(p===0)return`<span>${c===0?"Same as":"Up from ₹0 in"} ${lbl}</span>`;
 const d=(c-p)/Math.abs(p)*100;if(Math.abs(d)<.05)return`<span>Same as ${lbl} (${money(p)})</span>`;
 return`<span class="${(d>0)!==inv?"positive":"negative"}">${d>0?"▲":"▼"} ${Math.abs(d).toFixed(1)}%</span> vs ${lbl} (${money(p)})`}
const pct=(c,p)=>p===0?"—":`<span class="${c>=p?"positive":"negative"}">${c>=p?"▲":"▼"} ${Math.abs((c-p)/Math.abs(p)*100).toFixed(0)}%</span>`;
const short=v=>"₹"+(v>=1e7?(v/1e7).toFixed(1)+"Cr":v>=1e5?(v/1e5).toFixed(1)+"L":v>=1e3?(v/1e3).toFixed(v>=1e4?0:1).replace(".0","")+"k":String(Math.round(v)));
const niceMax=m=>{const p=Math.pow(10,Math.floor(Math.log10(m))),n=m/p;return(n<=1?1:n<=2?2:n<=5?5:10)*p};

/* tiny dependency-free SVG bar chart; colours come from CSS classes so it follows the theme */
function barChart(labels,series,o={}){
 const W=640,H=240,L=48,R=10,T=14,B=28,pw=W-L-R,ph=H-T-B;
 const mx=Math.max(0,...series.flatMap(s=>s.values)),top=niceMax(mx||1),gw=pw/labels.length,bw=Math.max(3,Math.min(30,gw*.74/series.length)),y=v=>T+ph-v/top*ph;
 let g="";
 [0,.5,1].forEach(f=>{const v=top*f,yy=y(v);g+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text class="axis" x="${L-6}" y="${yy+4}" text-anchor="end">${short(v)}</text>`});
 labels.forEach((lb,i)=>{const cx=L+gw*i+gw/2;
  series.forEach((s,j)=>{const v=s.values[i]||0,h=v/top*ph,x=cx-bw*series.length/2+bw*j,cls=o.marks&&o.marks[i]&&j===0?o.marks[i]:s.cls;
   g+=`<rect class="${cls}" x="${x.toFixed(1)}" y="${(T+ph-h).toFixed(1)}" width="${(bw-1.5).toFixed(1)}" height="${(v>0?Math.max(h,1.5):0).toFixed(1)}" rx="3"><title>${esc(lb)} · ${esc(s.name)}: ${money(v)}</title></rect>`});
  if(!o.every||i===0||(i+1)%o.every===0)g+=`<text class="axis" x="${cx.toFixed(1)}" y="${H-8}" text-anchor="middle">${esc(lb)}</text>`});
 return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||"Chart")}" style="min-width:${o.minW||520}px">${g}</svg>`}

function renderMonthly(){
 const cur=curKey(),min=Math.min(cur,...data.sales.map(x=>mKey(x.ts)),...data.expenses.map(x=>mKey(x.ts)));
 if(monthSel===null||monthSel>cur)monthSel=cur;if(monthSel<min)monthSel=min;
 const k=monthSel,m=monthStats(k),p=monthStats(k-1),has=p.count+p.ec>0;
 $("monthLabel").textContent=mLabel(k)+(k===cur?" · so far":"");
 $$("[data-month]").forEach(b=>b.disabled=Number(b.dataset.month)<0?k<=min:k>=cur);
 setNum("mRevenue",m.rev);setNum("mExpenses",m.exp);setNum("mProfit",m.profit);
 $("mRevenueNote").innerHTML=chip(m.rev,p.rev,false,k-1,has);$("mExpensesNote").innerHTML=chip(m.exp,p.exp,true,k-1,has);$("mProfitNote").innerHTML=chip(m.profit,p.profit,false,k-1,has);
 /* 6-month trend + table */
 const ms=[...Array(7)].map((_,i)=>monthStats(k-6+i)),last=ms.slice(1);
 $("trendChart").innerHTML=barChart(last.map((x,i)=>mTick(x.k,i===0)),[{name:"Revenue",cls:"b-rev",values:last.map(x=>x.rev)},{name:"Expenses",cls:"b-exp",values:last.map(x=>x.exp)}],{label:"Revenue and expenses for the last six months"});
 $("trendTable").innerHTML=`<table class="mtable"><thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Revenue vs prev.</th></tr></thead><tbody>${last.map((x,i)=>`<tr class="${x.k===k?"sel":""}"><td>${mLabel(x.k)}</td><td>${money(x.rev)}</td><td>${money(x.exp)}</td><td class="${x.profit<0?"negative":""}">${money(x.profit)}</td><td>${pct(x.rev,ms[i].rev)}</td></tr>`).reverse().join("")}</tbody></table>`;
 /* best / slowest day */
 const days=Object.entries(m.byDay).map(([d,v])=>({d:+d,v})),dStr=d=>mDate(k,d).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
 const best=days.length?days.reduce((a,b)=>b.v>a.v?b:a):null,worst=days.length>1?days.reduce((a,b)=>b.v<a.v?b:a):null;
 $("mBest").textContent=best?money(best.v):"—";$("mBestNote").textContent=best?dStr(best.d):"No sales this month";
 const tie=!!(best&&worst&&worst.v===best.v); /* every sales day equal: there is no "slowest" day */
 $("mWorst").textContent=worst&&!tie?money(worst.v):"—";$("mWorstNote").textContent=tie?"All sales days were equal":worst?dStr(worst.d):days.length?"Needs 2+ days with sales":"No sales this month";
 setNum("mCount",m.count,1);$("mCountNote").textContent=`across ${days.length} day${days.length===1?"":"s"}`;
 /* daily chart */
 const n=new Date(Math.floor(k/12),k%12+1,0).getDate(),marks={};
 if(best)marks[best.d-1]="b-best";if(worst&&!tie)marks[worst.d-1]="b-worst";
 $("dailyChart").innerHTML=barChart(Array.from({length:n},(_,i)=>String(i+1)),[{name:"Revenue",cls:"b-rev",values:Array.from({length:n},(_,i)=>m.byDay[i+1]||0)}],{marks,every:5,minW:560,label:"Daily revenue for "+mLabel(k)});
 /* top products */
 const tp=m.prods.slice(0,8);
 $("topProducts").innerHTML=tp.length?tp.map((x,i)=>`<div class="top-row"><span class="rank">${i+1}</span><div class="top-main"><strong>${esc(x.name)}</strong><small>${x.qty} sold · ${money(x.rev)}</small><div class="progress"><i style="width:${(x.rev/tp[0].rev*100).toFixed(1)}%"></i></div></div></div>`).join(""):`<p class="empty">No product sales recorded this month.</p>`}

/* ---------- NOTEPAD ---------- */
let editing=null,draft={type:"text",items:[]};
function noteCard(n){const done=n.items.filter(i=>i.done).length,pc=n.items.length?Math.round(done/n.items.length*100):0;
 const body=n.type==="list"?(n.items.length?`<ul class="check-list">${n.items.map(i=>`<li class="${i.done?"done":""}"><label class="ck"><input type="checkbox" data-note="tick" data-id="${n.id}" data-iid="${i.id}" ${i.done?"checked":""}><span>${esc(i.text)}</span></label></li>`).join("")}</ul><div><small class="fine" style="margin:0">${done}/${n.items.length} done</small><div class="progress"><i style="width:${pc}%"></i></div></div>`:`<p class="empty">Empty checklist</p>`):`<p class="note-body">${esc(n.body)}</p>`;
 return`<article class="note-card${n.pinned?" pinned":""}"><div class="note-head"><div><h3>${esc(n.title||"Untitled note")}</h3><small>${n.type==="list"?"Checklist · ":""}${dayLabel(n.updated)}</small></div></div>${body}
 <div class="note-actions"><button class="mini ${n.pinned?"on":""}" data-note="pin" data-id="${n.id}" aria-pressed="${n.pinned}">${n.pinned?"Unpin":"Pin"}</button><button class="mini" data-note="edit" data-id="${n.id}">Edit</button><button class="mini bad" data-note="del" data-id="${n.id}" aria-label="Delete note">×</button></div></article>`}
function renderNotes(){
 const q=$("notesSearch").value.trim().toLowerCase();
 const list=notes.filter(n=>!q||[n.title,n.body,...n.items.map(i=>i.text)].join(" ").toLowerCase().includes(q)).sort((a,b)=>(b.pinned-a.pinned)||(b.updated-a.updated));
 const pin=list.filter(n=>n.pinned),rest=list.filter(n=>!n.pinned);let h="";
 if(pin.length)h+=`<span class="panel-label notes-label">PINNED</span><div class="notes-grid">${pin.map(noteCard).join("")}</div>`;
 if(rest.length)h+=(pin.length?`<span class="panel-label notes-label">OTHERS</span>`:"")+`<div class="notes-grid">${rest.map(noteCard).join("")}</div>`;
 if(!list.length)h=`<div class="panel"><p class="empty">${notes.length?"No notes match your search.":"No notes yet. Tap “New note” to jot something down."}</p></div>`;
 $("notesList").innerHTML=h}
function renderDraftItems(){$("noteItems").innerHTML=draft.items.map((it,i)=>`<div class="item-row"><input type="checkbox" data-ni="done" data-i="${i}" ${it.done?"checked":""} aria-label="Done"><input type="text" class="search-input" data-ni="text" data-i="${i}" value="${esc(it.text)}" maxlength="120"><button type="button" class="mini bad" data-ni="del" data-i="${i}" aria-label="Remove item">×</button></div>`).join("")}
function setNoteType(t,silent){
 if(!silent){
  if(t==="list"&&!draft.items.length)draft.items=$("noteBody").value.split("\n").map(s=>s.trim()).filter(Boolean).map(text=>({id:nid(),text,done:false}));
  if(t==="text"&&!$("noteBody").value.trim()&&draft.items.length)$("noteBody").value=draft.items.map(i=>i.text).join("\n")}
 draft.type=t;$$("#noteType button").forEach(b=>b.classList.toggle("on",b.dataset.nt===t));
 $("noteTextWrap").classList.toggle("hidden",t!=="text");$("noteListWrap").classList.toggle("hidden",t!=="list");renderDraftItems()}
function openNote(id){
 const n=id?notes.find(x=>x.id===id):null;editing=n?n.id:null;
 draft={type:n?n.type:"text",items:n?n.items.map(i=>({...i})):[]};
 $("noteTitle").value=n?n.title:"";$("noteBody").value=n?n.body:"";$("notePinned").checked=!!(n&&n.pinned);$("noteNewItem").value="";
 $("noteHeading").textContent=n?"Edit note":"Add note";$("noteEyebrow").textContent=n?"EDIT NOTE":"NEW NOTE";$("noteDelete").classList.toggle("hidden",!n);
 setNoteType(draft.type,true);openModal("noteModal")}
function addDraftItem(){const v=$("noteNewItem").value.trim();if(!v)return;draft.items.push({id:nid(),text:v,done:false});$("noteNewItem").value="";renderDraftItems();$("noteNewItem").focus()}
function deleteNote(n){if(!n||!confirm("Delete this note?"))return false;notes=notes.filter(x=>x!==n);saveNotes();renderNotes();toast("Note deleted");return true}
$("noteForm").onsubmit=e=>{e.preventDefault();
 if(draft.type==="list"){const v=$("noteNewItem").value.trim();if(v){draft.items.push({id:nid(),text:v,done:false});$("noteNewItem").value=""}}
 const title=$("noteTitle").value.trim(),body=draft.type==="text"?$("noteBody").value.trim():"",items=draft.type==="list"?draft.items.map(i=>({...i,text:i.text.trim()})).filter(i=>i.text):[];
 if(!title&&!body&&!items.length){toast("Add a title or some content");return}
 const t=Date.now(),wasEdit=!!editing,fields={title,body,type:draft.type,items,pinned:$("notePinned").checked,updated:t};
 if(wasEdit){const n=notes.find(x=>x.id===editing);if(n)Object.assign(n,fields)}else notes.unshift({id:nid(),created:t,...fields});
 saveNotes();closeModals();renderNotes();toast(wasEdit?"Note updated":"Note saved")};
$("noteDelete").onclick=()=>{if(deleteNote(notes.find(x=>x.id===editing)))closeModals()};
$("noteAddItem").onclick=addDraftItem;
$("noteNewItem").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addDraftItem()}};
$("noteItems").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches('[data-ni="text"]')){e.preventDefault();$("noteNewItem").focus()}});
$("noteItems").addEventListener("input",e=>{const t=e.target.closest('[data-ni="text"]');if(t&&draft.items[+t.dataset.i])draft.items[+t.dataset.i].text=t.value});
$("noteItems").addEventListener("change",e=>{const t=e.target.closest('[data-ni="done"]');if(t&&draft.items[+t.dataset.i])draft.items[+t.dataset.i].done=t.checked});
$("noteItems").addEventListener("click",e=>{const b=e.target.closest('[data-ni="del"]');if(b){draft.items.splice(+b.dataset.i,1);renderDraftItems()}});
$("notesSearch").oninput=renderNotes;

/* ---------- navigation, modals, theme: one delegated click handler ----------
   (works for every data-page / data-modal / data-note element, present or added later) */
const closeSidebar=()=>{$("sidebar").classList.remove("open");$("scrim").classList.remove("show")};
function openPage(page){if(!document.getElementById(page))return;
 $$(".page").forEach(s=>s.classList.toggle("active",s.id===page));$$(".nav-item").forEach(i=>i.classList.toggle("active",i.dataset.page===page));
 closeSidebar();window.scrollTo({top:0,behavior:"smooth"});
 if(page==="monthly")step("monthly",renderMonthly);if(page==="notes")step("notes",renderNotes)}
/* auto-focus the first field, but never steal focus from a field the user already started typing in */
const openModal=id=>{const m=$(id);m.classList.add("open");setTimeout(()=>{if(!m.contains(document.activeElement))m.querySelector("input,textarea")?.focus()},60)};
const closeModals=()=>$$(".modal").forEach(m=>m.classList.remove("open"));
document.addEventListener("click",e=>{
 const t=e.target;if(!(t instanceof Element))return;let el;
 if(el=t.closest("[data-page],[data-page-link]"))return openPage(el.dataset.page||el.dataset.pageLink);
 if(el=t.closest("[data-month]")){if(!el.disabled){monthSel=(monthSel===null?curKey():monthSel)+Number(el.dataset.month);step("monthly",renderMonthly)}return}
 if(el=t.closest("[data-modal]"))return openModal(el.dataset.modal);
 if(t.closest(".close-modal")||t.classList.contains("modal"))return closeModals();
 if(t.closest("#mobileMenuBtn")){$("sidebar").classList.add("open");$("scrim").classList.add("show");return}
 if(t.closest("#scrim"))return closeSidebar();
 if(el=t.closest(".theme-toggle"))return setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
 if(el=t.closest("#themeSeg [data-t]"))return setTheme(el.dataset.t);
 if(el=t.closest("[data-nt]"))return setNoteType(el.dataset.nt);
 if(el=t.closest("[data-note]")){const a=el.dataset.note;if(a==="tick")return;const id=Number(el.dataset.id);
  if(a==="new")return openNote();
  const n=notes.find(x=>x.id===id);if(!n)return;
  if(a==="edit")return openNote(id);
  if(a==="pin"){n.pinned=!n.pinned;saveNotes();renderNotes();return toast(n.pinned?"Note pinned":"Note unpinned")}
  if(a==="del")deleteNote(n)}});
document.addEventListener("change",e=>{const c=e.target instanceof Element&&e.target.closest('[data-note="tick"]');if(!c)return;
 const n=notes.find(x=>x.id===Number(c.dataset.id)),it=n&&n.items.find(i=>i.id===Number(c.dataset.iid));if(it){it.done=c.checked;saveNotes();renderNotes()}});

/* ---------- forms ---------- */
function autoAmount(){const p=data.products.find(x=>x.name.toLowerCase()===$("saleProduct").value.trim().toLowerCase());if(p){$("saleAmount").value=p.price*(Number($("saleQty").value)||1)}}
$("saleProduct").oninput=autoAmount;$("saleQty").oninput=autoAmount;
$("saleForm").onsubmit=e=>{e.preventDefault();const name=$("saleProduct").value.trim(),qty=Number($("saleQty").value)||1,amount=Number($("saleAmount").value);
  const p=data.products.find(x=>x.name.toLowerCase()===name.toLowerCase());let note="";
  if(p){if(qty>p.stock){toast(`Only ${p.stock} of ${p.name} in stock`);return}p.stock-=qty;note=p.stock<=p.low?` · ${p.name} is running low`:""}
  data.sales.unshift({product:p?p.name:name,amount,payment:$("salePayment").value,qty,ts:Date.now()});save();e.target.reset();$("saleQty").value=1;closeModals();refresh();toast(`Sale recorded: ${money(amount)}${note}`)};
$("expenseForm").onsubmit=e=>{e.preventDefault();data.expenses.unshift({name:$("expenseName").value.trim(),amount:Number($("expenseAmount").value),ts:Date.now()});save();e.target.reset();closeModals();refresh();toast("Expense added")};
$("productForm").onsubmit=e=>{e.preventDefault();data.products.push({id:nid(),name:$("productName").value.trim(),price:Number($("productPrice").value),stock:Number($("productStock").value),low:Number($("productLow").value),daily:Number($("productDaily").value)});save();e.target.reset();$("productLow").value=10;$("productDaily").value=2;closeModals();refresh();openPage("inventory");toast("Product added")};
$("paymentForm").onsubmit=e=>{e.preventDefault();data.payments.push({id:nid(),name:$("customerName").value.trim(),amount:Number($("customerAmount").value),due:$("customerDue").value});save();e.target.reset();closeModals();refresh();openPage("udhaar");toast("Udhaar added")};
let receiving=null;
$("receiveForm").onsubmit=e=>{e.preventDefault();const x=data.payments.find(p=>p.id===receiving),a=Number($("receiveAmount").value);if(!x)return;
  if(a>=x.amount){data.payments=data.payments.filter(p=>p!==x);toast(`${x.name} cleared`)}else{x.amount-=a;toast(`${money(a)} received, ${money(x.amount)} left`)}
  save();e.target.reset();closeModals();refresh()};

/* delegated row actions */
document.addEventListener("click",e=>{const b=e.target instanceof Element&&e.target.closest("[data-act]");if(!b)return;const id=Number(b.dataset.id),act=b.dataset.act;
  const p=data.products.find(x=>x.id===id),x=data.payments.find(y=>y.id===id);
  if(act==="stock"&&p)p.stock=Math.max(0,p.stock+Number(b.dataset.d));
  if(act==="delProduct"){if(!confirm("Delete this product?"))return;data.products=data.products.filter(y=>y.id!==id)}
  if(act==="paid"&&x){data.payments=data.payments.filter(y=>y.id!==id);toast(`${x.name} cleared`)}
  if(act==="receive"&&x){receiving=id;$("receiveTitle").textContent="Payment from "+x.name;$("receiveAmount").max=x.amount;$("receiveAmount").value=x.amount;openModal("receiveModal");return}
  if(act==="received"&&p){const q=buyQty(p);p.stock+=q;toast(`${q} × ${p.name} added to stock`)}
  save();refresh()});
$("restockAll").onclick=()=>{low().forEach(p=>p.stock+=buyQty(p));save();refresh();toast("Stock updated for all items")};
$("inventorySearch").oninput=renderInventory;

/* ---------- ask ---------- */
function askDukaan(){const q=$("askInput").value.toLowerCase().trim();if(!q)return;let r;const l=low();
  if(/buy|order|stock|purchase/.test(q))r=l.length?`I'd consider ordering: <strong>${l.slice(0,4).map(p=>`${esc(p.name)} × ${buyQty(p)}`).join(", ")}</strong>.`:"Your inventory looks healthy. No urgent purchases.";
  else if(/month/.test(q)){const m=monthStats(curKey());r=`This month so far: revenue <strong>${money(m.rev)}</strong>, expenses <strong>${money(m.exp)}</strong>, profit <strong>${money(m.profit)}</strong>.`}
  else if(/profit|earn|margin/.test(q))r=`Today's sales are <strong>${money(sum(todaySales()))}</strong> and expenses <strong>${money(sum(todayExp()))}</strong>, so about <strong>${money(sum(todaySales())-sum(todayExp()))}</strong> before stock costs.`;
  else if(/sale|sell|revenue/.test(q))r=`Today you've recorded <strong>${money(sum(todaySales()))}</strong>. Over the last 7 days: <strong>${money(sum(weekSales()))}</strong>.`;
  else if(/udhaar|payment|owe|pending/.test(q))r=data.payments.length?`<strong>${money(sum(data.payments))}</strong> is pending from ${data.payments.length} people: ${data.payments.map(p=>`${esc(p.name)} (${money(p.amount)})`).join(", ")}.`:"No pending udhaar.";
  else r="I can help with sales, profit, stock, purchases, udhaar and this month's numbers. Try: “What should I buy tomorrow?”";
  $("askResponse").innerHTML=`<div class="smart-insight">${r}</div>`}
$("askBtn").onclick=askDukaan;$("askInput").onkeydown=e=>{if(e.key==="Enter")askDukaan()};

/* ---------- settings ---------- */
function fillSettings(){const s=data.settings;$("shopName").value=s.shopName;$("ownerName").value=s.ownerName;$("shopCity").value=s.city}
$("saveSettings").onclick=()=>{Object.assign(data.settings,{shopName:$("shopName").value.trim()||"My Shop",ownerName:$("ownerName").value,city:$("shopCity").value});save();updateHeader();toast("Shop details saved")};
$("resetData").onclick=()=>{if(!confirm("Reset all demo data? Your notes are kept."))return;data=makeDefault();save();fillSettings();refresh();toast("Demo data restored")};

function refresh(){[calculateStats,renderInsights,renderPreviews,renderInventory,renderSales,renderPayments,renderPurchases,renderMonthly,renderNotes,updateHeader].forEach(f=>step(f.name,f))}

/* ===== CALCULATOR ===== */
const C={expr:"",result:"",hist:[]};
const calc=$("calc"),fab=$("calcFab");
const OPS={"*":"×","/":"÷","-":"−","+":"+"};
function evalExpr(s){if(!s)return null;let t=s.replace(/(\d+\.?\d*)%/g,"($1/100)");t=t.replace(/[+\-*/.]+$/,"");if(!t||!/^[0-9+\-*/.()\s]+$/.test(t))return null;
  try{const v=Function('"use strict";return ('+t+')')();return isFinite(v)?Math.round(v*1e8)/1e8:null}catch(e){return null}}
const fmt=v=>v===null?"":Number(v).toLocaleString("en-IN",{maximumFractionDigits:8});
function draw(pop){$("calcExpr").textContent=C.expr?C.expr.replace(/[*/\-+]/g,m=>" "+OPS[m]+" ").trim():" ";const v=evalExpr(C.expr);const r=$("calcResult");r.textContent=v===null?(C.expr?fmt(evalExpr(C.expr.slice(0,-1)))||"0":"0"):fmt(v);
  if(pop){r.classList.remove("pop");void r.offsetWidth;r.classList.add("pop")}
  $("calcHist").innerHTML=C.hist.slice(0,3).map((h,i)=>`<button data-h="${i}"><span>${esc(h.e)}</span><strong>${esc(h.r)}</strong></button>`).join("")}
function press(k){const last=C.expr.slice(-1),isOp=/[+\-*/]/.test(k);
  if(k==="AC")C.expr="";
  else if(k==="back")C.expr=C.expr.slice(0,-1);
  else if(k==="="){const v=evalExpr(C.expr);if(v!==null){if(/[+\-*/%]/.test(C.expr))C.hist.unshift({e:$("calcExpr").textContent,r:fmt(v)});C.expr=String(v)}}
  else if(k==="gst+"||k==="gst-"){const v=evalExpr(C.expr);if(v===null)return;const g=Number($("gstRate").value)/100;const r=Math.round((k==="gst+"?v*(1+g):v/(1+g))*100)/100;C.hist.unshift({e:`${fmt(v)} ${k==="gst+"?"+":"−"} ${g*100}% GST`,r:fmt(r)});C.expr=String(r)}
  else if(isOp){if(!C.expr){if(k==="-")C.expr="-";}else if(/[+\-*/]/.test(last))C.expr=C.expr.slice(0,-1)+k;else C.expr+=k}
  else if(k==="%"){if(/\d/.test(last))C.expr+="%"}
  else if(k==="."){const seg=C.expr.split(/[+\-*/]/).pop();if(!seg.includes("."))C.expr+=seg?".":"0."}
  else{if(last==="%")C.expr+="*";C.expr+=k}
  draw(true)}
$$(".keys button, .gst-row button").forEach(b=>b.addEventListener("click",e=>{
  const r=document.createElement("i");r.className="rip";const bb=b.getBoundingClientRect();r.style.left=e.clientX-bb.left+"px";r.style.top=e.clientY-bb.top+"px";b.append(r);setTimeout(()=>r.remove(),500);press(b.dataset.k)}));
$("calcHist").onclick=e=>{const b=e.target.closest("[data-h]");if(b){C.expr=C.hist[b.dataset.h].r.replace(/,/g,"");draw(true)}};
function toggleCalc(open=!calc.classList.contains("open")){calc.classList.toggle("open",open);fab.classList.toggle("open",open);fab.setAttribute("aria-expanded",open);calc.setAttribute("aria-hidden",!open);fab.setAttribute("aria-label",open?"Close calculator":"Open calculator")}
fab.onclick=()=>toggleCalc();
$("calcUse").onclick=()=>{const v=evalExpr(C.expr);if(v===null){toast("Calculate an amount first");return}
  const open=document.querySelector(".modal.open");const f=open?open.querySelector('input[type=number][id$="Amount"]'):null;
  if(f){f.value=v;f.dispatchEvent(new Event("input"));toast("Amount filled")}else{openModal("saleModal");$("saleAmount").value=v;toast("Amount added to a new sale")}};
$$(".calc-tabs button").forEach(b=>b.onclick=()=>{$$(".calc-tabs button").forEach(x=>x.classList.toggle("on",x===b));const ch=b.dataset.mode==="change";$("calcMain").classList.toggle("hidden",ch);$("calcChange").classList.toggle("hidden",!ch);
  if(ch){const v=evalExpr(C.expr);if(v!==null)$("chBill").value=v;$("chPaid").focus();changeCalc()}});
function changeCalc(){const bill=parseFloat($("chBill").value),paid=parseFloat($("chPaid").value),o=$("chOut");$("chNotes").innerHTML="";
  if(isNaN(bill)||isNaN(paid)){o.className="change-out";o.textContent="Enter amounts";return}
  const d=Math.round((paid-bill)*100)/100;if(d<0){o.className="change-out short";o.textContent="Short by "+money(-d);return}
  o.className="change-out ok";o.textContent=d===0?"Exact amount ✓":"Return "+money(d);
  let r=Math.floor(d),n=[];[500,200,100,50,20,10,5,2,1].forEach(x=>{const c=Math.floor(r/x);if(c){n.push(`<span>${c} × ₹${x}</span>`);r-=c*x}});$("chNotes").innerHTML=n.join("")}
$("chBill").oninput=changeCalc;$("chPaid").oninput=changeCalc;
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){closeModals();closeSidebar();if(calc.classList.contains("open"))toggleCalc(false);return}
  if(e.target.matches("input,select,textarea"))return;
  if((e.key==="c"||e.key==="C")&&!e.ctrlKey&&!e.metaKey){toggleCalc();return}
  if(!calc.classList.contains("open")||!$("calcMain")||$("calcMain").classList.contains("hidden"))return;
  const k=e.key;if(/^[0-9.+\-*/%]$/.test(k)){press(k);e.preventDefault()}else if(k==="Enter"||k==="="){press("=");e.preventDefault()}else if(k==="Backspace")press("back");else if(k==="Delete")press("AC")});

/* ---------- Nexora branding (hides itself if the image can't load) ---------- */
step("branding",()=>{const logo=$("nexoraLogo"),link=$("nexoraLogoLink");
  logo.onerror=()=>{logo.style.display="none"};
  logo.src=atob("aHR0cHM6Ly9pLmliYi5jby9NeGROVGd2Ri9DaGF0LUdQVC1JbWFnZS1TZXAtMjQtMjAyNi0wMy0zMC01Ni1QTS5wbmc=");
  link.href=atob("aHR0cHM6Ly9pYmIuY28vZnpKMFJYZ2o=");
  $("copyrightYear").textContent=new Date().getFullYear()});

/* ---------- start ---------- */
step("theme",()=>setTheme(document.documentElement.dataset.theme||"dark"));step("settings",fillSettings);refresh();step("calculator",draw);
window.addEventListener("error",e=>console.error("[DukaanOS] uncaught:",e.message));
