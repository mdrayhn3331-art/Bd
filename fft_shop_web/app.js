const SUPABASE_URL = "https://ihxwkebgjvtndynhosbk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wcazcpFqsX1TDEeVROpoDQ_rDGXDBDR";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let session=null, products=[];

// Remote images: Google favicon service for partner brands + real public product image sources.
const partnerImages={
  Daraz:'https://www.google.com/s2/favicons?domain=daraz.com.bd&sz=128',
  eBay:'https://www.google.com/s2/favicons?domain=ebay.com&sz=128',
  'TikTok Shop':'https://www.google.com/s2/favicons?domain=tiktok.com&sz=128',
  AliExpress:'https://www.google.com/s2/favicons?domain=aliexpress.com&sz=128',
  Noon:'https://www.google.com/s2/favicons?domain=noon.com&sz=128',
  SHEIN:'https://www.google.com/s2/favicons?domain=shein.com&sz=128',
  PriyoShop:'https://www.google.com/s2/favicons?domain=priyoshop.com&sz=128',
  AjkerDeal:'https://www.google.com/s2/favicons?domain=ajkerdeal.com&sz=128',
  Rokomari:'https://www.google.com/s2/favicons?domain=rokomari.com&sz=128',
  Chaldal:'https://www.google.com/s2/favicons?domain=chaldal.com&sz=128',
  Pickaboo:'https://www.google.com/s2/favicons?domain=pickaboo.com&sz=128'
};
const fallbackProducts=[
 {name:'Foldable Holder',price:55.66,stock:104,image_url:'https://cdn.yamibuy.net/item/1f7f4dc52c79250df07cd2dc73ac7880_750x750.webp',category:'Accessories'},
 {name:'FC Barcelona (Metal Sticker)',price:72.35,stock:20,image_url:'https://www.google.com/search?tbm=isch&q=FC+Barcelona+metal+sticker',category:'Sticker'},
 {name:'Naruto stickers pack',price:63.26,stock:12,image_url:'https://www.google.com/search?tbm=isch&q=Naruto+sticker+pack',category:'Sticker'},
 {name:'Iraqi Passport (Metal Sticker)',price:52.35,stock:12,image_url:'https://www.google.com/search?tbm=isch&q=Iraqi+passport+metal+sticker',category:'Sticker'}
];
function money(v){return `BDT ${Number(v||0).toFixed(2)}`}
function toast(msg){const e=document.querySelector('#toast');e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2400)}
function scrollToProducts(){document.querySelector('#productsSection')?.scrollIntoView({behavior:'smooth'})}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function imgFallback(e){e.target.src='https://www.google.com/s2/favicons?domain=daraz.com.bd&sz=128'}

async function init(){
 const {data:{session:s}}=await db.auth.getSession(); session=s; updateAccount();
 if(!session){location.href='login.html';return}
 db.auth.onAuthStateChange((_e,s)=>{session=s;updateAccount();loadWallet();loadOrders()});
 await Promise.all([loadSiteSettings(),loadProducts(),loadWallet(),loadOrders(),loadProfile()]);
}
async function loadSiteSettings(){
 const {data}=await db.from('site_settings').select('*').limit(1).maybeSingle();
 if(data){if(data.site_name)document.title=data.site_name;const b=document.querySelector('.brand span:last-child');if(b&&data.site_name)b.textContent=data.site_name;if(data.announcement)document.querySelector('.pill').textContent=data.announcement;if(data.hero_image_url){const h=document.querySelector('.hero');h.style.backgroundImage=`url(${JSON.stringify(data.hero_image_url)})`;h.classList.add('remote-hero')}}
}
async function loadProducts(){
 const box=document.querySelector('#products');box.innerHTML='<div class="loading">পণ্য লোড হচ্ছে...</div>';
 const {data,error}=await db.from('products').select('id,name,price,stock,image_url,category,is_active').eq('is_active',true).order('created_at',{ascending:false}).limit(12);
 products=(!error&&data?.length)?data:fallbackProducts;
 box.innerHTML=products.map((p,i)=>{const img=p.image_url||fallbackProducts[i%fallbackProducts.length].image_url;const hasId=!!p.id;return `<article class="product"><img src="${escapeHtml(img)}" onerror="imgFallback(event)" alt="${escapeHtml(p.name)}"><div class="product-info"><div class="product-name">${escapeHtml(p.name||'Product')}</div><div class="stat"><span>মূল্য:</span><strong class="price">${money(p.price)}</strong></div><div class="stat"><span>দৈনিক বিক্রয়:</span><span class="red">${Math.max(12,Number(p.stock||0))}</span></div><div class="stat"><span>দৈনিক বিক্রয় বৃদ্ধির হার:</span><span class="orange">${82+i*4}%</span></div>${hasId?`<button class="buy-btn" onclick="placeOrder('${escapeHtml(p.id)}')">অর্ডার করুন</button>`:''}</div></article>`}).join('');
}
async function loadWallet(){
 if(!session){return}
 const {data}=await db.from('wallets').select('balance').eq('user_id',session.user.id).maybeSingle();document.querySelector('#balance').textContent=money(data?.balance||0);
 const {data:tx}=await db.from('wallet_transactions').select('amount,type,status').eq('user_id',session.user.id).eq('status','completed');
 const commission=(tx||[]).filter(x=>x.type==='commission'||x.type==='admin_adjustment').reduce((a,x)=>a+Number(x.amount||0),0);document.querySelector('#commission').textContent=money(commission)
}
async function loadOrders(){
 const box=document.querySelector('#orders');if(!session){box.innerHTML='<div class="empty">লগইন করলে আপনার অর্ডার দেখা যাবে।</div>';return}
 const {data,error}=await db.from('orders').select('id,total_amount,status,created_at,payment_status').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(10);
 if(error||!data?.length){box.innerHTML='<div class="empty">এখনও কোনো অর্ডার নেই।</div>';return}
 box.innerHTML=data.map(o=>`<div class="order-card"><div class="order-row"><b>${new Date(o.created_at).toLocaleString('bn-BD')}</b><span class="status">${escapeHtml(o.status||'pending')}</span></div><div style="margin-top:10px">মোট: <b>${money(o.total_amount)}</b> · পেমেন্ট: ${escapeHtml(o.payment_status||'pending')}</div></div>`).join('')
}
async function loadProfile(){
 const {data}=await db.from('profiles').select('full_name,invite_code,vip_level,credit_score').eq('id',session.user.id).maybeSingle();
 if(data){document.querySelector('#creditScore').textContent=data.credit_score??100;document.querySelector('#userId').textContent=`ID: ${session.user.id.slice(0,8)}… · ${escapeHtml(data.vip_level||'VIP1')}`}
}
function updateAccount(){document.querySelector('#userPhone').textContent=session?.user?.phone||session?.user?.email||'গেস্ট ইউজার';document.querySelector('#userId').textContent=session?`ID: ${session.user.id.slice(0,8)}…`:'লগইন করলে আপনার তথ্য এখানে দেখা যাবে';document.querySelector('#authBtn').textContent=session?'✓':'👤'}
function authModal(mode='login'){location.href=mode==='login'?'login.html':'register.html'}
async function logout(){await db.auth.signOut();location.href='login.html'}
function accountModal(){if(!session){location.href='login.html';return}openModal(`<h2>আমার অ্যাকাউন্ট</h2><p><b>${escapeHtml(session.user.phone||session.user.email||'')}</b></p><p>Credit Score: <b>${escapeHtml(document.querySelector('#creditScore').textContent)}</b></p><button class="primary-btn" onclick="scrollToProducts();closeModal()">শপিং শুরু করুন</button><button class="field danger" onclick="logout()">লগআউট</button>`)}
function openModal(html){document.querySelector('#modalContent').innerHTML=html;document.querySelector('#modal').classList.add('show')}
function closeModal(){document.querySelector('#modal').classList.remove('show')}
function showInfo(type){openModal(`<h2>${type==='company'?'কোম্পানির পরিচিতি':'কাজের নিয়ম'}</h2><p>${type==='company'?'FFT SHOP একটি Supabase-connected shopping platform. Authentication, products, wallet, deposits, withdrawals এবং orders real database থেকে আসে।':'পণ্য নির্বাচন করুন → অর্ডার করুন → আপনার wallet থেকে টাকা কাটা হবে → order status এখানে দেখা যাবে। Recharge/withdrawal admin approval-এর মাধ্যমে সম্পন্ন হবে।'}</p>`)}
async function placeOrder(productId){
 if(!session){authModal();return}
 if(!confirm('এই পণ্যটি অর্ডার করতে চান?'))return;
 const {data,error}=await db.rpc('place_order',{p_product_id:productId});
 if(error){toast(error.message)}else{toast('অর্ডার সফল হয়েছে');loadWallet();loadOrders()}
}
async function deposit(){const amount=Number(document.querySelector('#depAmount').value),method=document.querySelector('#depMethod').value.trim(),tx=document.querySelector('#depTx').value.trim();if(!amount||amount<=0||!method){toast('সব তথ্য দিন');return}const {error}=await db.from('deposit_requests').insert({user_id:session.user.id,amount,payment_method:method,transaction_id:tx||null});if(error)toast(error.message);else{closeModal();toast('রিচার্জ রিকোয়েস্ট পাঠানো হয়েছে')}}
async function withdraw(){const amount=Number(document.querySelector('#wdAmount').value),method=document.querySelector('#wdMethod').value.trim(),account=document.querySelector('#wdAccount').value.trim();if(!amount||amount<=0||!method||!account){toast('সব তথ্য দিন');return}const {error}=await db.from('withdraw_requests').insert({user_id:session.user.id,amount,payment_method:method,account_number:account});if(error)toast(error.message);else{closeModal();toast('উত্তোলন রিকোয়েস্ট পাঠানো হয়েছে')}}

document.querySelector('#authBtn').onclick=accountModal;document.querySelector('#accountNav').onclick=accountModal;document.querySelector('#notifyBtn').onclick=()=>toast('নতুন কোনো নোটিফিকেশন নেই');
document.querySelector('#depositBtn').onclick=()=>openModal(`<h2>রিচার্জ</h2><input id="depAmount" class="field" type="number" min="1" placeholder="পরিমাণ (BDT)"><input id="depMethod" class="field" placeholder="পেমেন্ট মাধ্যম (bKash/Nagad)"><input id="depTx" class="field" placeholder="Transaction ID"><button class="primary-btn" onclick="deposit()">রিকোয়েস্ট পাঠান</button>`);
document.querySelector('#withdrawBtn').onclick=()=>openModal(`<h2>উত্তোলন</h2><input id="wdAmount" class="field" type="number" min="1" placeholder="পরিমাণ (BDT)"><input id="wdMethod" class="field" placeholder="bKash / Nagad"><input id="wdAccount" class="field" placeholder="মোবাইল নম্বর"><button class="primary-btn" onclick="withdraw()">উত্তোলন রিকোয়েস্ট</button>`);
document.querySelectorAll('.nav').forEach(n=>n.addEventListener('click',()=>{document.querySelector('.nav.active')?.classList.remove('active');n.classList.add('active')}));
init();
