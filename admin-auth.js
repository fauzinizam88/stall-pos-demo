(() => {
  const PROTECTED_VIEWS = new Set(['orders', 'sales']);
  const ADMIN_PASSWORD_HASH = '25f43b1486ad95a1398e3eeb3d83bc4010015fcc9bedb35b432e00298d5021f7';
  const SESSION_KEY = 'stall-pos-admin-authenticated';
  const originalShow = window.show;
  let pendingAdminView = 'orders';

  function isAdminAuthenticated() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }

  async function sha256(value) {
    if (!window.crypto || !window.crypto.subtle) return '';
    const data = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  function setModalVisibility(visible) {
    const modal = document.getElementById('adminLoginModal');
    if (!modal) return;
    modal.classList.toggle('open', visible);
    modal.setAttribute('aria-hidden', visible ? 'false' : 'true');
    document.body.classList.toggle('modal-open', visible);
  }

  window.openAdmin = function openAdmin(targetView = 'orders') {
    pendingAdminView = PROTECTED_VIEWS.has(targetView) ? targetView : 'orders';

    if (isAdminAuthenticated()) {
      originalShow(pendingAdminView);
      return;
    }

    const error = document.getElementById('adminLoginError');
    if (error) error.textContent = '';
    setModalVisibility(true);
    window.setTimeout(() => document.getElementById('adminPassword')?.focus(), 80);
  };

  window.closeAdminLogin = function closeAdminLogin() {
    setModalVisibility(false);
    const input = document.getElementById('adminPassword');
    const error = document.getElementById('adminLoginError');
    if (input) input.value = '';
    if (error) error.textContent = '';
  };

  window.adminLogin = async function adminLogin(event) {
    event.preventDefault();

    const input = document.getElementById('adminPassword');
    const error = document.getElementById('adminLoginError');
    const button = document.getElementById('adminLoginButton');
    const password = input?.value ?? '';

    if (button) {
      button.disabled = true;
      button.textContent = 'Menyemak...';
    }
    if (error) error.textContent = '';

    try {
      const suppliedHash = await sha256(password);
      if (suppliedHash !== ADMIN_PASSWORD_HASH) {
        if (error) error.textContent = 'Kata laluan tidak betul.';
        input?.focus();
        input?.select();
        return;
      }

      sessionStorage.setItem(SESSION_KEY, '1');
      window.closeAdminLogin();
      originalShow(pendingAdminView);
      window.toast('Log masuk admin berjaya');
    } catch {
      if (error) error.textContent = 'Log masuk tidak dapat diproses. Cuba semula.';
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Log masuk';
      }
    }
  };

  window.adminLogout = function adminLogout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors in the static prototype.
    }
    originalShow('menu');
    window.toast('Admin telah log keluar');
  };

  window.show = function protectedShow(viewId) {
    if (PROTECTED_VIEWS.has(viewId) && !isAdminAuthenticated()) {
      window.openAdmin(viewId);
      return;
    }
    originalShow(viewId);
  };

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') window.closeAdminLogin();
  });

  document.getElementById('adminLoginModal')?.addEventListener('click', event => {
    if (event.target.id === 'adminLoginModal') window.closeAdminLogin();
  });
})();