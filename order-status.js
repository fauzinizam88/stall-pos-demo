(() => {
  const ORDER_NUMBER = '0723-A7K';
  const STORAGE_KEY = `stall-pos-order-status-${ORDER_NUMBER}`;
  const CHANNEL_NAME = 'stall-pos-live-order-status';
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
  let orderState = readStoredState() || {
    orderNumber: ORDER_NUMBER,
    status: 'payment_submitted',
    updatedAt: Date.now()
  };

  const channel = 'BroadcastChannel' in window
    ? new BroadcastChannel(CHANNEL_NAME)
    : null;

  function readStoredState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || saved.orderNumber !== ORDER_NUMBER || !VALID_STATUSES.has(saved.status)) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function publishState(nextStatus) {
    if (!VALID_STATUSES.has(nextStatus)) return;

    orderState = {
      orderNumber: ORDER_NUMBER,
      status: nextStatus,
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orderState));
    } catch {
      // The same-tab prototype still works if browser storage is unavailable.
    }

    channel?.postMessage(orderState);
    renderLiveStatus();
  }

  function acceptExternalState(candidate) {
    if (!candidate || candidate.orderNumber !== ORDER_NUMBER || !VALID_STATUSES.has(candidate.status)) return;
    if (candidate.updatedAt <= orderState.updatedAt) return;
    orderState = candidate;
    renderLiveStatus();
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

  function statusConfiguration(status) {
    const configurations = {
      awaiting_payment: {
        customerLabel: 'Menunggu bayaran',
        adminLabel: 'Menunggu bayaran',
        badgeClass: 'pending',
        actions: '<button class="btn secondary" type="button" disabled>Menunggu pelanggan</button><button class="btn secondary" type="button" onclick="toast(\'Belum ada pengesahan bayaran\')">Butiran</button>'
      },
      payment_submitted: {
        customerLabel: 'Bayaran dihantar',
        adminLabel: 'Bayaran dihantar',
        badgeClass: 'pending',
        actions: '<button class="btn success" type="button" onclick="verifyPayment()">Sahkan bayaran</button><button class="btn danger" type="button" onclick="rejectPayment()">Tolak</button>'
      },
      payment_rejected: {
        customerLabel: 'Bayaran perlu disemak',
        adminLabel: 'Bayaran ditolak',
        badgeClass: 'rejected',
        actions: '<button class="btn secondary" type="button" disabled>Menunggu penghantaran semula</button><button class="btn secondary" type="button" onclick="toast(\'Pelanggan perlu hantar semula pengesahan\')">Butiran</button>'
      },
      confirmed: {
        customerLabel: 'Bayaran disahkan',
        adminLabel: 'Bayaran disahkan',
        badgeClass: 'paid',
        actions: '<button class="btn success" type="button" onclick="startPreparing()">Mula sediakan</button><button class="btn secondary" type="button" onclick="toast(\'Butiran pesanan dibuka\')">Butiran</button>'
      },
      preparing: {
        customerLabel: 'Sedang disediakan',
        adminLabel: 'Sedang disediakan',
        badgeClass: 'prep',
        actions: '<button class="btn primary" type="button" onclick="markReady()">Tanda sedia</button><button class="btn secondary" type="button" onclick="toast(\'Butiran pesanan dibuka\')">Butiran</button>'
      },
      ready: {
        customerLabel: 'Pesanan sedia',
        adminLabel: 'Sedia',
        badgeClass: 'ready',
        actions: '<button class="btn success" type="button" onclick="completeOrder()">Tanda selesai</button><button class="btn secondary" type="button" onclick="toast(\'Butiran pesanan dibuka\')">Butiran</button>'
      },
      completed: {
        customerLabel: 'Pesanan selesai',
        adminLabel: 'Selesai',
        badgeClass: 'paid',
        actions: '<button class="btn secondary" type="button" disabled>Pesanan selesai</button><button class="btn secondary" type="button" onclick="toast(\'Butiran pesanan dibuka\')">Butiran</button>'
      }
    };

    return configurations[status] || configurations.awaiting_payment;
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

  function renderLiveStatus() {
    const configuration = statusConfiguration(orderState.status);
    const customerBadge = document.getElementById('payBadge');
    const adminBadge = document.getElementById('adminBadge');
    const adminActions = document.getElementById('adminActions');
    const paidButton = document.getElementById('paidBtn');
    const updatedAt = document.getElementById('liveUpdatedAt');

    if (customerBadge) {
      customerBadge.textContent = configuration.customerLabel;
      customerBadge.className = `status ${configuration.badgeClass}`;
    }

    if (adminBadge) {
      adminBadge.textContent = configuration.adminLabel;
      adminBadge.className = `status ${configuration.badgeClass}`;
    }

    if (adminActions) adminActions.innerHTML = configuration.actions;

    if (paidButton) {
      const canSubmit = orderState.status === 'awaiting_payment' || orderState.status === 'payment_rejected';
      paidButton.disabled = !canSubmit;
      paidButton.textContent = orderState.status === 'payment_rejected'
        ? 'Hantar semula pengesahan'
        : canSubmit
          ? 'Saya sudah bayar'
          : 'Pengesahan dihantar';
    }

    if (updatedAt) {
      const time = new Date(orderState.updatedAt).toLocaleTimeString('ms-MY', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      });
      updatedAt.textContent = `Dikemas kini secara langsung pada ${time}`;
    }

    renderTimeline(orderState.status);
  }

  window.placeOrder = function placeOrderWithStatusReset() {
    originalPlaceOrder();
    if (document.getElementById('payment')?.classList.contains('active')) {
      publishState('awaiting_payment');
    }
  };

  window.paid = function submitPaymentConfirmation() {
    publishState('payment_submitted');
    window.toast('Maklumat bayaran dihantar');
  };

  window.verifyPayment = function verifyPaymentLive() {
    publishState('confirmed');
    window.toast('Bayaran disahkan');
  };

  window.rejectPayment = function rejectPaymentLive() {
    publishState('payment_rejected');
    window.toast('Bayaran ditolak. Pelanggan diminta menyemak semula.');
  };

  window.startPreparing = function startPreparingLive() {
    publishState('preparing');
    window.toast('Penyediaan pesanan dimulakan');
  };

  window.markReady = function markReadyLive() {
    publishState('ready');
    window.toast('Pesanan ditanda sedia');
  };

  window.completeOrder = function completeOrderLive() {
    publishState('completed');
    window.toast('Pesanan ditanda selesai');
  };

  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      acceptExternalState(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed external storage values.
    }
  });

  if (channel) {
    channel.addEventListener('message', event => acceptExternalState(event.data));
  }

  window.setInterval(() => {
    if (document.hidden) return;
    const saved = readStoredState();
    if (saved) acceptExternalState(saved);
  }, 2000);

  renderLiveStatus();
})();
