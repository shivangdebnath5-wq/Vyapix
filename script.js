/* DUKAANOS — frontend prototype */
const DAY=864e5,now=Date.now();
const seedSales=[["Milk 500ml",240,"UPI",0,40],["Parle-G 250g",120,"Cash",0,95],["Groceries",760,"UPI",0,150],["Bread",90,"Cash",1,200],["Groceries",1480,"UPI",1,260],["Maggi 70g",310,"Cash",2,180],["Groceries",2150,"UPI",3,120],["Coca-Cola 750ml",420,"Cash",4,90]];
const defaultData={
 products:[[1,"Parle-G 250g",6,10,4,40],[2,"Milk 500ml",18,15,7,30],[3,"Bread",8,12,5,45],[4,"Tata Salt 1kg",4,8,2,28],[5,"Maggi 70g",9,12,5,14],[6,"Surf Excel",3,7,1,120],[7,"Coca-Cola 750ml",5,10,3,45]].map(([id,name,stock,low,daily,price])=>({id,name,stock,low,daily,price})),
 payments:[{id:1,name:"Ramesh Kumar",amount:420,due:"3 days ago"},{id:2,name:"Priya Sharma",amount:850,due:"Today"},{id:3,name:"Amit",amount:600,due:"7 days ago"}],
 sales:seedSales.map(([product,amount,payment,d,m])=>({product,amount,payment,qty:1,ts:now-d*DAY-m*6e4})),
 expenses:[{name:"Electricity bill",amount:1250,ts:now-3e6},{name:"Delivery boy",amount:500,ts:now-6e6}],
 settings:{shopName:"Rajesh Kirana",ownerName:"Rajesh Kumar",city:"Ghaziabad, Uttar Pradesh"}};
let data;try{data=JSON.parse(localStorage.getItem("dk-data")||"null")}catch(e){}
data=data||structuredClone(defaultData);
const save=()=>{try{localStorage.setItem("dk-data",JSON.stringify(data))}catch(e){}};
const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)];
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sameDay=ts=>new Date(ts).toDateString()===new Date().toDateString();
const sum=a=>a.reduce((s,x)=>s+Number(x.amount),0);
const todaySales=()=>data.sales.filter(s=>sameDay(s.ts)),todayExp=()=>data.expenses.filter(e=>sameDay(e.ts));
const low=()=>data.products.filter(p=>p.stock<=p.low);
const buyQty=p=>Math.max(p.low*2,p.daily*7)-p.stock;
const timeStr=ts=>new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
const dayLabel=ts=>sameDay(ts)?"Today":new Date(ts).toLocaleDateString("en-IN",{day:"numeric",month:"short"});

function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;$("toasts").append(t);setTimeout(()=>{t.classList.add("out");setTimeout(()=>t.remove(),320)},2800)}
function countTo(el,val){const from=Number(el.dataset.v||0);el.dataset.v=val;if(matchMedia("(prefers-reduced-motion: reduce)").matches||from===val){el.textContent=el.dataset.fmt==="n"?val:money(val);return}
  const t0=performance.now();(function step(t){const p=Math.min(1,(t-t0)/600),e=1-Math.pow(1-p,3),v=Math.round(from+(val-from)*e);el.textContent=el.dataset.fmt==="n"?v:money(v);if(p<1)requestAnimationFrame(step)})(t0)}

/* theme */
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem("dk-theme",t)}catch(e){}$$("#themeSeg button").forEach(b=>b.classList.toggle("on",b.dataset.t===t))}
$$(".theme-toggle").forEach(b=>b.onclick=()=>setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark"));
$$("#themeSeg button").forEach(b=>b.onclick=()=>setTheme(b.dataset.t));

/* header */
function updateHeader(){const h=new Date().getHours();$("greeting").textContent=h<12?"GOOD MORNING":h<17?"GOOD AFTERNOON":"GOOD EVENING";
  $("todayDate").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const s=data.settings;$("shopMiniName").textContent=s.shopName;$("shopMiniCity").textContent=s.city.split(",")[0];$("shopAvatar").textContent=s.shopName.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()}

/* stats */
function calculateStats(){const ts=todaySales(),sales=sum(ts),exp=sum(todayExp()),pend=sum(data.payments),lows=low().length,week=sum(data.sales.filter(s=>s.ts>now-7*DAY));
  const set=(id,v,n)=>{const e=$(id);if(n)e.dataset.fmt="n";countTo(e,v)};
  set("todaySales",sales);set("salesPageToday",sales);set("todayExpenses",exp);set("pendingTotal",pend);set("udhaarTotal",pend);set("salesWeek",week);set("profitToday",sales-exp);
  set("lowStockCount",lows,1);set("inventoryLow",lows,1);set("inventoryOut",data.products.filter(p=>!p.stock).length,1);set("totalProducts",data.products.length,1);set("udhaarPeople",data.payments.length,1);
  $("salesNote").textContent=`${ts.length} sale${ts.length===1?"":"s"} recorded today`;$("pendingNote").textContent=`${data.payments.length} customer${data.payments.length===1?"":"s"} owe you`;
  $("productList").innerHTML=data.products.map(p=>`<option value="${esc(p.name)}">`).join("")}

/* insights */
function renderInsights(){const l=low(),p=l[0];let h="";
  if(p){const d=p.daily>0?Math.max(1,Math.floor(p.stock/p.daily)):7;h+=`<div class="smart-insight"><strong>📦 ${esc(p.name)} may run out soon</strong><p>You have ${p.stock} left. At ${p.daily} per day, that lasts about ${d} day${d>1?"s":""}.</p><span class="action">Add it to your next order</span></div>`}
  const best={};data.sales.filter(s=>s.ts>now-7*DAY).forEach(s=>best[s.product]=(best[s.product]||0)+s.amount);const top=Object.entries(best).filter(([k])=>k!=="Groceries").sort((a,b)=>b[1]-a[1])[0];
  if(top)h+=`<div class="smart-insight"><strong>📈 ${esc(top[0])} is your top seller this week</strong><p>${money(top[1])} in sales over the last 7 days.</p></div>`;
  const old=data.payments.filter(x=>/ago/.test(x.due));h+=`<div class="smart-insight"><strong>🧾 ${data.payments.length} payment${data.payments.length===1?"":"s"} pending</strong><p>${money(sum(data.payments))} outstanding${old.length?`, ${old.length} overdue`:""}.</p></div>`;
  $("smartInsights").innerHTML=h;
  $("insightCards").innerHTML=`<div class="big-insight"><span>📈</span><h2>Last 7 days</h2><p>You sold <strong>${money(sum(data.sales.filter(s=>s.ts>now-7*DAY)))}</strong> across ${data.sales.filter(s=>s.ts>now-7*DAY).length} sales.</p></div>
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
  $("salesList").innerHTML=l.map(s=>`<div><div><strong>${esc(s.product)}${s.qty>1?" × "+s.qty:""}</strong><small>${dayLabel(s.ts)}, ${timeStr(s.ts)} · ${s.payment}</small></div><strong>${money(s.amount)}</strong></div>`).join("")||`<p class="empty">No sales yet.</p>`;
  $("expenseList").innerHTML=[...data.expenses].sort((a,b)=>b.ts-a.ts).slice(0,12).map(e=>`<div><div><strong>${esc(e.name)}</strong><small>${dayLabel(e.ts)}, ${timeStr(e.ts)}</small></div><strong>${money(e.amount)}</strong></div>`).join("")||`<p class="empty">No expenses yet.</p>`}

function renderPayments(){$("udhaarList").innerHTML=data.payments.map((x,i)=>`<div class="payment-row" style="animation:rise .35s var(--ease) ${i*40}ms both"><div class="customer-info"><strong>${esc(x.name)}</strong><small>Due: ${esc(x.due)}</small></div>
  <div class="row-actions"><span class="amount">${money(x.amount)}</span><button class="mini good" data-act="receive" data-id="${x.id}">Receive</button><button class="mini good" data-act="paid" data-id="${x.id}">Paid in full</button></div></div>`).join("")||`<p class="empty">No one owes you anything right now 🎉</p>`}

function renderPurchases(){const l=low();$("restockAll").classList.toggle("hidden",!l.length);
  $("purchaseList").innerHTML=l.map((p,i)=>`<div class="purchase-item" style="animation-delay:${i*40}ms"><div><strong>${esc(p.name)}</strong><p>${p.stock} left · usually sells ${p.daily}/day</p></div><div class="row-actions"><div style="text-align:right"><strong>Buy ${buyQty(p)}</strong><br><span class="recommended">Recommended</span></div><button class="mini good" data-act="received" data-id="${p.id}">Received</button></div></div>`).join("")||`<p class="empty">Nothing to order right now.</p>`}

/* navigation */
function openPage(page){$$(".page").forEach(s=>s.classList.toggle("active",s.id===page));$$(".nav-item").forEach(i=>i.classList.toggle("active",i.dataset.page===page));closeSidebar();window.scrollTo({top:0,behavior:"smooth"})}
const closeSidebar=()=>{$("sidebar").classList.remove("open");$("scrim").classList.remove("show")};
$$(".nav-item").forEach(b=>b.onclick=()=>openPage(b.dataset.page));$$("[data-page-link]").forEach(b=>b.onclick=()=>openPage(b.dataset.pageLink));
$("mobileMenuBtn").onclick=()=>{$("sidebar").classList.add("open");$("scrim").classList.add("show")};$("scrim").onclick=closeSidebar;

/* modals */
const openModal=id=>{$(id).classList.add("open");setTimeout(()=>$(id).querySelector("input")?.focus(),60)};
const closeModals=()=>$$(".modal").forEach(m=>m.classList.remove("open"));
$$("[data-modal]").forEach(b=>b.onclick=()=>openModal(b.dataset.modal));$$(".close-modal").forEach(b=>b.onclick=closeModals);
$$(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModals()}));

/* forms */
const sale={price:0};
function autoAmount(){const p=data.products.find(x=>x.name.toLowerCase()===$("saleProduct").value.trim().toLowerCase());if(p){$("saleAmount").value=p.price*(Number($("saleQty").value)||1)}}
$("saleProduct").oninput=autoAmount;$("saleQty").oninput=autoAmount;
$("saleForm").onsubmit=e=>{e.preventDefault();const name=$("saleProduct").value.trim(),qty=Number($("saleQty").value)||1,amount=Number($("saleAmount").value);
  const p=data.products.find(x=>x.name.toLowerCase()===name.toLowerCase());let note="";
  if(p){if(qty>p.stock){toast(`Only ${p.stock} of ${p.name} in stock`);return}p.stock-=qty;note=p.stock<=p.low?` · ${p.name} is running low`:""}
  data.sales.unshift({product:p?p.name:name,amount,payment:$("salePayment").value,qty,ts:Date.now()});save();e.target.reset();$("saleQty").value=1;closeModals();refresh();toast(`Sale recorded: ${money(amount)}${note}`)};
$("expenseForm").onsubmit=e=>{e.preventDefault();data.expenses.unshift({name:$("expenseName").value.trim(),amount:Number($("expenseAmount").value),ts:Date.now()});save();e.target.reset();closeModals();refresh();toast("Expense added")};
$("productForm").onsubmit=e=>{e.preventDefault();data.products.push({id:Date.now(),name:$("productName").value.trim(),price:Number($("productPrice").value),stock:Number($("productStock").value),low:Number($("productLow").value),daily:Number($("productDaily").value)});save();e.target.reset();$("productLow").value=10;$("productDaily").value=2;closeModals();refresh();openPage("inventory");toast("Product added")};
$("paymentForm").onsubmit=e=>{e.preventDefault();data.payments.push({id:Date.now(),name:$("customerName").value.trim(),amount:Number($("customerAmount").value),due:$("customerDue").value});save();e.target.reset();closeModals();refresh();openPage("udhaar");toast("Udhaar added")};
let receiving=null;
$("receiveForm").onsubmit=e=>{e.preventDefault();const x=data.payments.find(p=>p.id===receiving),a=Number($("receiveAmount").value);if(!x)return;
  if(a>=x.amount){data.payments=data.payments.filter(p=>p!==x);toast(`${x.name} cleared`)}else{x.amount-=a;toast(`${money(a)} received, ${money(x.amount)} left`)}
  save();e.target.reset();closeModals();refresh()};

/* delegated row actions */
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(!b)return;const id=Number(b.dataset.id),act=b.dataset.act;
  if(act==="stock"){const p=data.products.find(x=>x.id===id);p.stock=Math.max(0,p.stock+Number(b.dataset.d))}
  if(act==="delProduct"){if(!confirm("Delete this product?"))return;data.products=data.products.filter(x=>x.id!==id)}
  if(act==="paid"){const x=data.payments.find(p=>p.id===id);data.payments=data.payments.filter(p=>p.id!==id);toast(`${x.name} cleared`)}
  if(act==="receive"){const x=data.payments.find(p=>p.id===id);receiving=id;$("receiveTitle").textContent="Payment from "+x.name;$("receiveAmount").max=x.amount;$("receiveAmount").value=x.amount;openModal("receiveModal");return}
  if(act==="received"){const p=data.products.find(x=>x.id===id);const q=buyQty(p);p.stock+=q;toast(`${q} × ${p.name} added to stock`)}
  save();refresh()});
$("restockAll").onclick=()=>{low().forEach(p=>p.stock+=buyQty(p));save();refresh();toast("Stock updated for all items")};
$("inventorySearch").oninput=renderInventory;

/* ask */
function askDukaan(){const q=$("askInput").value.toLowerCase().trim();if(!q)return;let r;const l=low();
  if(/buy|order|stock|purchase/.test(q))r=l.length?`I'd consider ordering: <strong>${l.slice(0,4).map(p=>`${esc(p.name)} × ${buyQty(p)}`).join(", ")}</strong>.`:"Your inventory looks healthy. No urgent purchases.";
  else if(/profit|earn|margin/.test(q))r=`Today's sales are <strong>${money(sum(todaySales()))}</strong> and expenses <strong>${money(sum(todayExp()))}</strong>, so about <strong>${money(sum(todaySales())-sum(todayExp()))}</strong> before stock costs.`;
  else if(/sale|sell|revenue/.test(q))r=`Today you've recorded <strong>${money(sum(todaySales()))}</strong>. Over the last 7 days: <strong>${money(sum(data.sales.filter(s=>s.ts>now-7*DAY)))}</strong>.`;
  else if(/udhaar|payment|owe|pending/.test(q))r=data.payments.length?`<strong>${money(sum(data.payments))}</strong> is pending from ${data.payments.length} people: ${data.payments.map(p=>`${esc(p.name)} (${money(p.amount)})`).join(", ")}.`:"No pending udhaar.";
  else r="I can help with sales, profit, stock, purchases and udhaar. Try: “What should I buy tomorrow?”";
  $("askResponse").innerHTML=`<div class="smart-insight">${r}</div>`}
$("askBtn").onclick=askDukaan;$("askInput").onkeydown=e=>{if(e.key==="Enter")askDukaan()};

/* settings */
function fillSettings(){const s=data.settings;$("shopName").value=s.shopName;$("ownerName").value=s.ownerName;$("shopCity").value=s.city}
$("saveSettings").onclick=()=>{Object.assign(data.settings,{shopName:$("shopName").value.trim()||"My Shop",ownerName:$("ownerName").value,city:$("shopCity").value});save();updateHeader();toast("Shop details saved")};
$("resetData").onclick=()=>{if(!confirm("Reset all demo data?"))return;data=structuredClone(defaultData);save();fillSettings();refresh();toast("Demo data restored")};

function refresh(){calculateStats();renderInsights();renderPreviews();renderInventory();renderSales();renderPayments();renderPurchases();updateHeader()}

/* ===== CALCULATOR ===== */
const C={expr:"",result:"",hist:[]};
const calc=$("calc"),fab=$("calcFab");
const OPS={"*":"×","/":"÷","-":"−","+":"+"};
function evalExpr(s){if(!s)return null;let t=s.replace(/(\d+\.?\d*)%/g,"($1/100)");t=t.replace(/[+\-*/.]+$/,"");if(!t||!/^[0-9+\-*/.()\s]+$/.test(t))return null;
  try{const v=Function('"use strict";return ('+t+')')();return isFinite(v)?Math.round(v*1e8)/1e8:null}catch(e){return null}}
const fmt=v=>v===null?"":Number(v).toLocaleString("en-IN",{maximumFractionDigits:8});
function draw(pop){$("calcExpr").textContent=C.expr?C.expr.replace(/[*/\-+]/g,m=>" "+OPS[m]+" ").trim():"\u00a0";const v=evalExpr(C.expr);const r=$("calcResult");r.textContent=v===null?(C.expr?fmt(evalExpr(C.expr.slice(0,-1)))||"0":"0"):fmt(v);
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

/* Nexora branding */
const logo=$("nexoraLogo"),link=$("nexoraLogoLink");
if(logo)logo.src=atob("aHR0cHM6Ly9pLmliYi5jby9NeGROVGd2Ri9DaGF0LUdQVC1JbWFnZS1TZXAtMjQtMjAyNi0wMy0zMC01Ni1QTS5wbmc=");
if(link)link.href=atob("aHR0cHM6Ly9pYmIuY28vZnpKMFJYZ2o=");
$("copyrightYear").textContent=new Date().getFullYear();

/* start */
setTheme(document.documentElement.dataset.theme||"dark");fillSettings();refresh();draw();
