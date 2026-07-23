(() => {
  const ORDERS_KEY = 'stall-pos-orders-v3';
  const CURRENT_ORDER_KEY = 'stall-pos-current-order-v3';
  const CHANNEL_NAME = 'stall-pos-orders-v3-channel';
  const VALID_STATUSES = new Set([
    'awaiting_payment',
    'payment_submitted',
    'payment_rejected',
    'confirmed',
    'preparing',
    'ready',
    'completed'
  ]);

  const originalPlaceOrder = window.placeOrder;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;
  let orders = readOrders();
  let currentOrderNumber = readCurrentOrderNumber();

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function readOrders() {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.filter(order =>
        order &&
        typeof order.orderNumber === 'string' &&
        Array.isArray(order.items) &&
        VALID_STATUSES.has(order.status)
      );
    } catch {
      return [];
    }
  }

  function readCurrentOrderNumber() {
    try {
      return localStorage.getItem(CURRENT_ORDER_KEY) || orders[0]?.orderNumber || '';
    } catch {
      return orders[0]?.orderNumber || '';
    }
  }

  function persistOrders() {
    orders = orders.slice(0, 30);
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      if (currentOrderNumber) localStorage.setItem(CURRENT_ORDER_KEY, currentOrderNumber);
    } catch {
      // Same-tab rendering still works if storage is unavailable.
    }
    channel?.postMessage({ type: 'orders-changed', updatedAt: Date.now() });
    renderAll();
  }

  function reloadFromStorage() {
    orders = readOrders();
    currentOrderNumber = readCurrentOrderNumber();
    renderAll();
  }

  function getCurrentOrder() {
    return orders.find(order => order.orderNumber === currentOrderNumber) || null;
  }

  function generateOrderNumber() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const month = parts.find(part => part.type === 'month')?.value || '00';
    const day = parts.find(part => part.type === 'day')?.value || '00';
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    let orderNumber = '';
    do {
      let code = '';
      crypto.getRandomValues(new Uint8Array(3)).forEach(value => {
        code += alphabet[value % alphabet.length];
      });
      orderNumber = `${month}${day}-${code}`;
    } while (orders.some(order => order.orderNumber === orderNumber));

    return orderNumber;
  }

  function createOrderFromCurrentForm() {
    const orderNumber = generateOrderNumber();
    const now = Date.now();
    const lines = selectedLines();
    const note = document.getElementById('customerNote')?.value.trim() || '';

    return {
      orderNumber,
      customerName: customerName.value.trim(),
      orderType: type,
      tableNumber: type === 'dine' ? tableNo.value.trim() : '',
      note,
      items: lines.map(line => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.price,
        subtotal: line.quantity * line.price
      })),
      total: total(),
      status: 'awaiting_payment',
      createdAt: now,
      updatedAt: now
    };
  }

  function statusConfiguration(status) {
    const configurations = {
      awaiting_payment: {
        customerLabel: 'Menunggu bayaran',
        adminLabel: 'Menunggu bayaran',
        badgeClass: 'pending'
      },
      payment_submitted: {
        customerLabel: 'Bayaran dihantar',
        adminLabel: 'Bayaran dihantar',
        badgeClass: 'pending'
      },
      payment_rejected: {
        customerLabel: 'Bayaran perlu disemak',
        adminLabel: 'Bayaran ditolak',
        badgeClass: 'rejected'
      },
      confirmed: {
        customerLabel: 'Bayaran disahkan',
        adminLabel: 'Bayaran disahkan',
        badgeClass: 'paid'
      },
      preparing: {
        customerLabel: 'Sedang disediakan',
        adminLabel: 'Sedang disediakan',
        badgeClass: 'prep'
      },
      ready: {
        customerLabel: 'Pesanan sedia',
        adminLabel: 'Sedia',
        badgeClass: 'ready'
      },
      completed: {
        customerLabel: 'Pesanan selesai',
        adminLabel: 'Selesai',
        badgeClass: 'paid'
      }
    };
    return configurations[status] || configurations.awaiting_payment;
  }

  function setStep(id, mode, dot, message) {
    const step = document.getElementById(id);
    if (!step) return;
    step.classList.remove('done', 'current', 'rejected');
    if (mode) step.classList.add(mode);
    const dotElement = step.querySelector('.dot');
    const messageElement = step.querySelector('small');
    if (dotElement) dotElement.textContent = dot;
    if (messageElement) messageElement.textContent = message;
  }

  function renderTimeline(status) {
    setStep('receivedStep', 'done', '✓', 'Pesanan anda telah dihantar.');

    if (status === 'awaiting_payment') {
      setStep('paymentStep', 'current', '2', 'Sila buat bayaran dan tekan “Saya sudah bayar”.');
      setStep('preparingStep', '', '3', 'Menunggu pengesahan bayaran.');
      setStep('readyStep', '', '4', 'Status sedia akan dipaparkan di sini.');
      return;
    }

    if (status === 'payment_submitted') {
      setStep('paymentStep', 'current', '2', 'Maklumat bayaran dihantar. Menunggu pengesahan pemilik gerai.');
      setStep('preparingStep', '', '3', 'Pesanan akan disediakan selepas bayaran disahkan.');
      setStep('readyStep', '', '4', 'Status sedia akan dipaparkan di sini.');
      return;
    }

    if (status === 'payment_rejected') {
      setStep('paymentStep', 'rejected', '!', 'Bayaran belum dapat disahkan. Semak bayaran dan hantar semula pengesahan.');
      setStep('preparingStep', '', '3', 'Pesanan belum mula disediakan.');
      setStep('readyStep', '', '4', 'Status sedia akan dipaparkan di sini.');
      return;
    }

    setStep('paymentStep', 'done', '✓', 'Bayaran telah disahkan oleh pemilik gerai.');

    if (status === 'confirmed') {
      setStep('preparingStep', 'current', '3', 'Pesanan menunggu untuk mula disediakan.');
      setStep('readyStep', '', '4', 'Status sedia akan dipaparkan di sini.');
      return;
    }

    if (status === 'preparing') {
      setStep('preparingStep', 'current', '3', 'Gerai sedang menyediakan makanan dan minuman anda.');
      setStep('readyStep', '', '4', 'Status sedia akan dipaparkan di sini.');
      return;
    }

    setStep('preparingStep', 'done', '✓', 'Penyediaan pesanan telah selesai.');
    if (status === 'ready') {
      setStep('readyStep', 'current', '4', 'Pesanan anda sudah sedia. Ambil pesanan atau tunggu di meja.');
      return;
    }
    setStep('readyStep', 'done', '✓', 'Pesanan telah diserahkan dan ditandakan selesai.');
  }

  function renderCustomerOrder(order) {
    if (!order) return;

    const configuration = statusConfiguration(order.status);
    const title = document.getElementById('paymentOrderTitle');
    const reference = document.getElementById('paymentReference');
    const badge = document.getElementById('payBadge');
    const paidButton = document.getElementById('paidBtn');
    const updatedAt = document.getElementById('liveUpdatedAt');

    if (title) title.textContent = `Pesanan ${order.orderNumber}`;
    if (reference) reference.value = order.orderNumber;
    if (badge) {
      badge.textContent = configuration.customerLabel;
      badge.className = `status ${configuration.badgeClass}`;
    }

    paymentItems.innerHTML = order.items.map(item => `
      <div class="line">
        <span><b>${escapeHtml(item.name)}</b><br><small class="muted">${item.quantity} × ${money(item.unitPrice)}</small></span>
        <b>${money(item.subtotal)}</b>
      </div>`).join('');
    paymentTotal.textContent = money(order.total);

    if (paidButton) {
      const canSubmit = order.status === 'awaiting_payment' || order.status === 'payment_rejected';
      paidButton.disabled = !canSubmit;
      paidButton.textContent = order.status === 'payment_rejected'
        ? 'Hantar semula pengesahan'
        : canSubmit
          ? 'Saya sudah bayar'
          : 'Pengesahan dihantar';
    }

    if (updatedAt) {
      const time = new Date(order.updatedAt).toLocaleTimeString('ms-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      });
      updatedAt.textContent = `Dikemas kini secara langsung pada ${time}`;
    }

    renderTimeline(order.status);
  }

  function adminActions(order) {
    const number = order.orderNumber;
    if (order.status === 'awaiting_payment') {
      return '<button class="btn secondary" type="button" disabled>Menunggu pelanggan</button><button class="btn secondary" type="button" onclick="toast(\'Belum ada pengesahan bayaran\')">Butiran</button>';
    }
    if (order.status === 'payment_submitted') {
      return `<button class="btn success" type="button" onclick="verifyPayment('${number}')">Sahkan bayaran</button><button class="btn danger" type="button" onclick="rejectPayment('${number}')">Tolak</button>`;
    }
    if (order.status === 'payment_rejected') {
      return '<button class="btn secondary" type="button" disabled>Menunggu pelanggan</button><button class="btn secondary" type="button" onclick="toast(\'Pelanggan perlu hantar semula pengesahan\')">Butiran</button>';
    }
    if (order.status === 'confirmed') {
      return `<button class="btn success" type="button" onclick="startPreparing('${number}')">Mula sediakan</button><button class="btn secondary" type="button" onclick="toast('Butiran pesanan dibuka')">Butiran</button>`;
    }
    if (order.status === 'preparing') {
      return `<button class="btn primary" type="button" onclick="markReady('${number}')">Tanda sedia</button><button class="btn secondary" type="button" onclick="toast('Butiran pesanan dibuka')">Butiran</button>`;
    }
    if (order.status === 'ready') {
      return `<button class="btn success" type="button" onclick="completeOrder('${number}')">Tanda selesai</button><button class="btn secondary" type="button" onclick="toast('Butiran pesanan dibuka')">Butiran</button>`;
    }
    return '<button class="btn secondary" type="button" disabled>Pesanan selesai</button><button class="btn secondary" type="button" onclick="toast(\'Butiran pesanan dibuka\')">Butiran</button>';
  }

  function renderAdminOrders() {
    const list = document.getElementById('ordersList');
    const countBadge = document.getElementById('adminOrderCount');
    if (!list) return;

    const activeCount = orders.filter(order => order.status !== 'completed').length;
    if (countBadge) countBadge.textContent = `${activeCount} aktif`;

    if (!orders.length) {
      list.innerHTML = '<div class="card empty-orders"><b>Belum ada pesanan pelanggan</b><p class="muted">Pesanan baharu akan muncul di sini secara automatik.</p></div>';
      return;
    }

    list.innerHTML = orders.map(order => {
      const configuration = statusConfiguration(order.status);
      const createdTime = new Date(order.createdAt).toLocaleTimeString('ms-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        hour: 'numeric',
        minute: '2-digit'
      });
      const orderType = order.orderType === 'dine'
        ? `Meja ${escapeHtml(order.tableNumber || '—')} · Makan/minum sini`
        : 'Bungkus';
      const items = order.items.map(item => `
        <div class="line"><span>${item.quantity} × ${escapeHtml(item.name)}</span><b>${money(item.subtotal)}</b></div>`).join('');
      const note = order.note
        ? `<div class="order-note"><b>Catatan:</b> ${escapeHtml(order.note)}</div>`
        : '';

      return `<article class="card" data-order-number="${order.orderNumber}">
        <div class="order-head">
          <div><div class="order-no">#${order.orderNumber}</div><div class="order-meta">${escapeHtml(order.customerName)} · ${orderType} · ${createdTime}</div></div>
          <span class="status ${configuration.badgeClass}">${configuration.adminLabel}</span>
        </div>
        <div class="items">${items}<div class="line total"><span>Jumlah</span><span>${money(order.total)}</span></div></div>
        ${note}
        <div class="actions">${adminActions(order)}</div>
      </article>`;
    }).join('');
  }

  function renderAll() {
    renderAdminOrders();
    renderCustomerOrder(getCurrentOrder());
  }

  function updateOrderStatus(orderNumber, nextStatus) {
    if (!VALID_STATUSES.has(nextStatus)) return;
    const index = orders.findIndex(order => order.orderNumber === orderNumber);
    if (index < 0) return;
    orders[index] = { ...orders[index], status: nextStatus, updatedAt: Date.now() };
    persistOrders();
  }

  window.placeOrder = function placeOrderAndSync() {
    originalPlaceOrder();
    if (!document.getElementById('payment')?.classList.contains('active')) return;

    const order = createOrderFromCurrentForm();
    orders.unshift(order);
    currentOrderNumber = order.orderNumber;
    persistOrders();
    window.toast(`Pesanan ${order.orderNumber} dihantar`);
  };

  window.paid = function submitPaymentConfirmation() {
    const order = getCurrentOrder();
    if (!order) return window.toast('Tiada pesanan aktif');
    updateOrderStatus(order.orderNumber, 'payment_submitted');
    window.toast('Maklumat bayaran dihantar');
  };

  window.verifyPayment = function verifyPayment(orderNumber = currentOrderNumber) {
    updateOrderStatus(orderNumber, 'confirmed');
    window.toast('Bayaran disahkan');
  };

  window.rejectPayment = function rejectPayment(orderNumber = currentOrderNumber) {
    updateOrderStatus(orderNumber, 'payment_rejected');
    window.toast('Bayaran ditolak. Pelanggan diminta menyemak semula.');
  };

  window.startPreparing = function startPreparing(orderNumber = currentOrderNumber) {
    updateOrderStatus(orderNumber, 'preparing');
    window.toast('Penyediaan pesanan dimulakan');
  };

  window.markReady = function markReady(orderNumber = currentOrderNumber) {
    updateOrderStatus(orderNumber, 'ready');
    window.toast('Pesanan ditanda sedia');
  };

  window.completeOrder = function completeOrder(orderNumber = currentOrderNumber) {
    updateOrderStatus(orderNumber, 'completed');
    window.toast('Pesanan ditanda selesai');
  };

  window.openCurrentOrder = function openCurrentOrder() {
    const order = getCurrentOrder();
    if (!order) return window.toast('Belum ada pesanan aktif');
    show('payment');
    renderCustomerOrder(order);
  };

  window.addEventListener('storage', event => {
    if (event.key === ORDERS_KEY || event.key === CURRENT_ORDER_KEY) reloadFromStorage();
  });

  channel?.addEventListener('message', reloadFromStorage);

  window.setInterval(() => {
    if (!document.hidden) reloadFromStorage();
  }, 1500);

  renderAll();
})();