const foods=[
{id:1,n:'Nasi Goreng Kampung',c:'Nasi',d:'Pilihan nasi goreng gerai.',p:6,e:'🍚',q:0},
{id:2,n:'Nasi Goreng Ayam',c:'Nasi',d:'Nasi goreng bersama ayam.',p:6,e:'🍗',q:0},
{id:3,n:'Nasi Goreng Ikan Masin',c:'Nasi',d:'Nasi goreng berperisa ikan masin.',p:6,e:'🐟',q:0},
{id:4,n:'Nasi Goreng Daging',c:'Nasi',d:'Nasi goreng bersama daging.',p:6,e:'🥩',q:0},
{id:5,n:'Nasi Goreng Udang',c:'Nasi',d:'Nasi goreng bersama udang.',p:6,e:'🍤',q:0},
{id:6,n:'Nasi Goreng Sotong',c:'Nasi',d:'Nasi goreng bersama sotong.',p:6,e:'🦑',q:0},
{id:7,n:'Mee Goreng',c:'Mee & lain-lain',d:'Mee goreng gaya gerai.',p:6,e:'🍜',q:0},
{id:8,n:'Kuey Teow Goreng',c:'Mee & lain-lain',d:'Kuey teow goreng panas.',p:6,e:'🥢',q:0},
{id:9,n:'Kuey Teow / Mee Kerang',c:'Mee & lain-lain',d:'Pilih kuey teow atau mee bersama kerang.',p:6,e:'🦪',q:0},
{id:10,n:'Char Kuey Teow Udang / Kerang',c:'Mee & lain-lain',d:'Pilih udang atau kerang.',p:6,e:'🍤',q:0},
{id:11,n:'Mee / Kuey Teow Bandung',c:'Mee & lain-lain',d:'Pilih mee atau kuey teow bandung.',p:6,e:'🥣',q:0},
{id:12,n:'Chicken Chop',c:'Western',d:'Hidangan chicken chop bersama sos.',p:12,e:'🍗',q:0},
{id:13,n:'Nasi Goreng Chicken Chop',c:'Western',d:'Nasi goreng bersama chicken chop.',p:15,e:'🍛',q:0},
{id:14,n:'Tambah Telur',c:'Tambahan',d:'Telur tambahan untuk mana-mana hidangan.',p:1,e:'🍳',q:0}
];
let cat='Semua',type='dine';
const money=n=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(n);
const selected=()=>foods.filter(x=>x.q);
const total=()=>selected().reduce((s,x)=>s+x.p*x.q,0);
const count=()=>selected().reduce((s,x)=>s+x.q,0);

function render(){
  const cats=['Semua',...new Set(foods.map(x=>x.c))];
  chips.innerHTML=cats.map(x=>`<button class="chip ${x===cat?'on':''}" onclick="cat='${x.replace(/'/g,"\\'")}';render()">${x}</button>`).join('');
  menuList.innerHTML=foods.filter(x=>cat==='Semua'||x.c===cat).map(x=>`
    <article class="food">
      <div class="emoji">${x.e}</div>
      <div><h3>${x.n}</h3><p>${x.d}</p><div class="price">${money(x.p)}</div></div>
      <div class="qty"><button aria-label="Kurangkan ${x.n}" onclick="qty(${x.id},-1)">−</button><span>${x.q}</span><button aria-label="Tambah ${x.n}" onclick="qty(${x.id},1)">+</button></div>
    </article>`).join('');
  const lines=selected().map(x=>`<div class="line"><span><b>${x.n}</b><br><small class="muted">${x.q} × ${money(x.p)}</small></span><b>${money(x.q*x.p)}</b></div>`).join('')||'<p class="muted">Troli anda masih kosong.</p>';
  cartLines.innerHTML=lines+`<div class="line total"><span>Jumlah</span><span>${money(total())}</span></div>`;
  paymentItems.innerHTML=lines;
  paymentTotal.textContent=money(total());
  cartSummary.textContent=`${count()} item · ${money(total())}`;
  cartMeta.textContent=type==='dine'?`Meja ${tableNo.value||'—'} · Makan di sini`:'Pesanan bungkus';
  cartBar.style.display=document.querySelector('.view.active').id==='menu'&&count()?'flex':'none';
}

function qty(id,d){const x=foods.find(f=>f.id===id);x.q=Math.max(0,Math.min(20,x.q+d));render()}
function show(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('.bottom button').forEach(b=>b.classList.toggle('on',b.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});render()
}
function setType(v){
  type=v;dineBtn.classList.toggle('on',v==='dine');takeBtn.classList.toggle('on',v==='take');
  tableField.style.display=v==='dine'?'block':'none';render()
}
function placeOrder(){
  if(!count())return toast('Tambah sekurang-kurangnya satu menu');
  if(!customerName.value.trim())return toast('Masukkan nama pelanggan');
  if(type==='dine'&&!tableNo.value.trim())return toast('Masukkan nombor meja');
  show('payment');toast('Pesanan berjaya dihantar')
}
function paid(){
  payBadge.textContent='Bayaran dihantar';payBadge.className='status pending';
  payStep.classList.add('done');payStep.querySelector('.dot').textContent='✓';
  payStep.querySelector('small').textContent='Menunggu pengesahan manual pemilik gerai.';
  paidBtn.disabled=true;paidBtn.textContent='Pengesahan dihantar';toast('Maklumat bayaran dihantar')
}
function verifyPayment(){
  adminBadge.textContent='Bayaran disahkan';adminBadge.className='status paid';
  adminActions.innerHTML='<button class="btn success" onclick="this.textContent=\'Sedang disediakan\';toast(\'Penyediaan pesanan dimulakan\')">Mula sediakan</button><button class="btn secondary" onclick="toast(\'Butiran pesanan dibuka\')">Butiran</button>';
  payBadge.textContent='Bayaran disahkan';payBadge.className='status paid';toast('Bayaran disahkan')
}
function toast(m){
  const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');
  clearTimeout(window.tt);window.tt=setTimeout(()=>t.classList.remove('show'),1900)
}
function downloadCSV(){
  const csv='Pesanan,Pelanggan,Jenis,Jumlah,Status\n0723-A7K,Ahmad,Makan di sini,7.00,Disahkan\n0723-B2M,Siti,Bungkus,6.00,Sedang disediakan';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='jualan-gerai-teh-ais-nekman-demo.csv';a.click();toast('CSV demo dimuat turun')
}
tableNo.addEventListener('input',render);
render();