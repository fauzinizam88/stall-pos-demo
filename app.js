const products = [
  {
    id: 'nasi-goreng',
    n: 'Nasi Goreng',
    c: 'Nasi',
    d: 'Pilih jenis nasi goreng sebelum menambah ke troli.',
    p: 6,
    e: '🍚',
    variants: ['Kampung', 'Ayam', 'Ikan Masin', 'Daging', 'Udang', 'Kerang', 'Sotong'],
    selectedVariant: 'Kampung'
  },
  {id:'mee-goreng',n:'Mee Goreng',c:'Mee & lain-lain',d:'Mee goreng gaya gerai.',p:6,e:'🍜'},
  {id:'kuey-teow-goreng',n:'Kuey Teow Goreng',c:'Mee & lain-lain',d:'Kuey teow goreng panas.',p:6,e:'🥢'},
  {id:'mee-kerang',n:'Kuey Teow / Mee Kerang',c:'Mee & lain-lain',d:'Pilih kuey teow atau mee bersama kerang.',p:6,e:'🦪'},
  {id:'char-kuey-teow',n:'Char Kuey Teow Udang / Kerang',c:'Mee & lain-lain',d:'Pilih udang atau kerang.',p:6,e:'🍤'},
  {id:'bandung',n:'Mee / Kuey Teow Bandung',c:'Mee & lain-lain',d:'Pilih mee atau kuey teow bandung.',p:6,e:'🥣'},
  {id:'chicken-chop',n:'Chicken Chop',c:'Western',d:'Hidangan chicken chop bersama sos.',p:12,e:'🍗'},
  {id:'nasi-chicken-chop',n:'Nasi Goreng Chicken Chop',c:'Western',d:'Nasi goreng bersama chicken chop.',p:15,e:'🍛'},
  {id:'tambah-telur',n:'Tambah Telur',c:'Tambahan',d:'Telur tambahan untuk mana-mana hidangan.',p:1,e:'🍳'},
  {
    id: 'minuman',
    n: 'Minuman',
    c: 'Minuman',
    d: 'Pilih jenis minuman. RM2.00 di gerai atau RM3.00 bungkus.',
    drink: true,
    e: '🧋',
    variants: ['Teh Ais', 'Teh O Ais', 'Nescafe Ais', 'Milo Ais', 'Kopi Ais', 'Limau Ais', 'Limau Asam Boi Ais'],
    selectedVariant: 'Teh Ais'
  }
];

const cart = Object.create(null);
let cat = 'Semua';
let type = 'dine';

const money = value => new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR'
}).format(value);

const productById = id => products.find(product => product.id === id);
const unitPrice = product => product.drink ? (type === 'take' ? 3 : 2) : product.p;
const cartKey = (product, variant = product.selectedVariant) => product.variants ? `${product.id}::${variant}` : product.id;
const quantityFor = product => cart[cartKey(product)] || 0;

function selectedLines() {
  return Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .map(([key, quantity]) => {
      const [productId, variant] = key.split('::');
      const product = productById(productId);
      return {
        key,
        product,
        variant: variant || '',
        quantity,
        price: unitPrice(product),
        name: variant ? `${product.n} · ${variant}` : product.n
      };
    });
}

const total = () => selectedLines().reduce((sum, line) => sum + line.price * line.quantity, 0);
const count = () => selectedLines().reduce((sum, line) => sum + line.quantity, 0);

function variantSummary(product) {
  const lines = selectedLines().filter(line => line.product.id === product.id);
  if (!lines.length) {
    return '<small class="variant-hint">Pilih jenis, kemudian tekan + untuk tambah.</small>';
  }

  return `<div class="chosen-summary"><b>Dalam troli</b>${lines.map(line =>
    `<span>${line.variant} × ${line.quantity}</span>`
  ).join('')}</div>`;
}

function renderProduct(product) {
  const price = unitPrice(product);
  const priceNote = product.drink
    ? `<small class="price-note">${type === 'take' ? 'Harga bungkus' : 'Harga minum di gerai'}</small>`
    : '';

  if (product.variants) {
    const options = product.variants.map(variant =>
      `<option value="${variant}" ${variant === product.selectedVariant ? 'selected' : ''}>${variant}</option>`
    ).join('');

    return `<article class="food has-variants">
      <div class="emoji">${product.e}</div>
      <div><h3>${product.n}</h3><p>${product.d}</p><div class="price">${money(price)} ${priceNote}</div></div>
      <div class="variant-panel">
        <label for="variant-${product.id}">Pilih jenis</label>
        <div class="variant-controls">
          <select class="variant-select" id="variant-${product.id}" onchange="chooseVariant('${product.id}', this.value)">${options}</select>
          <div class="qty">
            <button aria-label="Kurangkan ${product.n}" onclick="qty('${product.id}',-1)">−</button>
            <span>${quantityFor(product)}</span>
            <button aria-label="Tambah ${product.n}" onclick="qty('${product.id}',1)">+</button>
          </div>
        </div>
        ${variantSummary(product)}
      </div>
    </article>`;
  }

  return `<article class="food">
    <div class="emoji">${product.e}</div>
    <div><h3>${product.n}</h3><p>${product.d}</p><div class="price">${money(price)} ${priceNote}</div></div>
    <div class="qty">
      <button aria-label="Kurangkan ${product.n}" onclick="qty('${product.id}',-1)">−</button>
      <span>${quantityFor(product)}</span>
      <button aria-label="Tambah ${product.n}" onclick="qty('${product.id}',1)">+</button>
    </div>
  </article>`;
}

function render() {
  const categories = ['Semua', ...new Set(products.map(product => product.c))];
  chips.innerHTML = categories.map(category =>
    `<button class="chip ${category === cat ? 'on' : ''}" onclick="cat='${category.replace(/'/g, "\\'")}';render()">${category}</button>`
  ).join('');

  menuList.innerHTML = products
    .filter(product => cat === 'Semua' || product.c === cat)
    .map(renderProduct)
    .join('');

  const lines = selectedLines().map(line =>
    `<div class="line"><span><b>${line.name}</b><br><small class="muted">${line.quantity} × ${money(line.price)}${line.product.drink ? ` · ${type === 'take' ? 'bungkus' : 'minum di gerai'}` : ''}</small></span><b>${money(line.quantity * line.price)}</b></div>`
  ).join('') || '<p class="muted">Troli anda masih kosong.</p>';

  cartLines.innerHTML = lines + `<div class="line total"><span>Jumlah</span><span>${money(total())}</span></div>`;
  paymentItems.innerHTML = lines;
  paymentTotal.textContent = money(total());
  cartSummary.textContent = `${count()} item · ${money(total())}`;
  cartMeta.textContent = type === 'dine' ? `Meja ${tableNo.value || '—'} · Makan/minum di sini` : 'Pesanan bungkus';
  cartBar.style.display = document.querySelector('.view.active').id === 'menu' && count() ? 'flex' : 'none';
}

function chooseVariant(productId, variant) {
  const product = productById(productId);
  if (!product || !product.variants.includes(variant)) return;
  product.selectedVariant = variant;
  render();
}

function qty(productId, change) {
  const product = productById(productId);
  if (!product) return;
  const key = cartKey(product);
  const nextQuantity = Math.max(0, Math.min(20, (cart[key] || 0) + change));
  if (nextQuantity === 0) delete cart[key];
  else cart[key] = nextQuantity;
  render();
}

function show(id) {
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === id));
  document.querySelectorAll('.bottom button').forEach(button => button.classList.toggle('on', button.dataset.view === id));
  window.scrollTo({top: 0, behavior: 'smooth'});
  render();
}

function setType(value) {
  type = value;
  dineBtn.classList.toggle('on', value === 'dine');
  takeBtn.classList.toggle('on', value === 'take');
  tableField.style.display = value === 'dine' ? 'block' : 'none';
  render();
}

function placeOrder() {
  if (!count()) return toast('Tambah sekurang-kurangnya satu menu');
  if (!customerName.value.trim()) return toast('Masukkan nama pelanggan');
  if (type === 'dine' && !tableNo.value.trim()) return toast('Masukkan nombor meja');
  show('payment');
  toast('Pesanan berjaya dihantar');
}

function paid() {
  payBadge.textContent = 'Bayaran dihantar';
  payBadge.className = 'status pending';
  payStep.classList.add('done');
  payStep.querySelector('.dot').textContent = '✓';
  payStep.querySelector('small').textContent = 'Menunggu pengesahan manual pemilik gerai.';
  paidBtn.disabled = true;
  paidBtn.textContent = 'Pengesahan dihantar';
  toast('Maklumat bayaran dihantar');
}

function verifyPayment() {
  adminBadge.textContent = 'Bayaran disahkan';
  adminBadge.className = 'status paid';
  adminActions.innerHTML = '<button class="btn success" onclick="this.textContent=\'Sedang disediakan\';toast(\'Penyediaan pesanan dimulakan\')">Mula sediakan</button><button class="btn secondary" onclick="toast(\'Butiran pesanan dibuka\')">Butiran</button>';
  payBadge.textContent = 'Bayaran disahkan';
  payBadge.className = 'status paid';
  toast('Bayaran disahkan');
}

function toast(message) {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.tt);
  window.tt = setTimeout(() => element.classList.remove('show'), 1900);
}

function downloadCSV() {
  const csv = 'Pesanan,Pelanggan,Jenis,Jumlah,Status\n0723-A7K,Ahmad,Makan di sini,9.00,Disahkan\n0723-B2M,Siti,Bungkus,9.00,Sedang disediakan';
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
  link.download = 'jualan-gerai-teh-ais-nekman-demo.csv';
  link.click();
  toast('CSV demo dimuat turun');
}

tableNo.addEventListener('input', render);
render();
