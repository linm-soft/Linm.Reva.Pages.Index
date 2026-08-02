(function () {
  var STORAGE_KEY = 'reva_contract_unlock';
  var gate = document.getElementById('contract-gate');
  var app = document.getElementById('contract-app');
  var form = document.getElementById('contract-gate-form');
  var input = document.getElementById('contract-gate-code');
  var errorEl = document.getElementById('contract-gate-error');
  var errorText = document.getElementById('contract-gate-error-text');
  var setupEl = document.getElementById('contract-gate-setup');

  function tokenFor(code) {
    var h = 5381;
    for (var i = 0; i < code.length; i++) {
      h = ((h << 5) + h + code.charCodeAt(i)) | 0;
    }
    return 'rc_' + (h >>> 0).toString(36);
  }

  function getExpectedCode() {
    var cfg = window.CONTRACT_ACCESS;
    return cfg && typeof cfg.code === 'string' ? cfg.code : '';
  }

  function showError(msg) {
    if (!errorEl || !errorText || !input) return;
    if (msg) {
      errorText.textContent = msg;
      errorEl.hidden = false;
      errorEl.classList.add('is-open');
      input.classList.add('is-error');
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    errorText.textContent = '';
    errorEl.hidden = true;
    errorEl.classList.remove('is-open');
    input.classList.remove('is-error');
    input.removeAttribute('aria-invalid');
  }

  function gateIconBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('access.js') !== -1) {
        return src.replace(/access\.js(\?.*)?$/, 'icons/');
      }
    }
    return 'icons/';
  }

  function injectGateBrand() {
    var card = document.querySelector('.contract-gate-card');
    var logo = document.querySelector('.contract-gate-logo');
    if (!card || !logo || card.querySelector('.contract-gate-brand')) return;
    var iconBase = gateIconBase();
    var brand = document.createElement('div');
    brand.className = 'contract-gate-brand';
    brand.setAttribute('aria-label', 'Linm & Reva');
    brand.innerHTML =
      '<div class="contract-gate-brand-logos">' +
      '<img class="contract-gate-brand-logo" src="' + iconBase + 'linm-logo.png" width="48" height="48" alt="Linm">' +
      '<span class="contract-gate-brand-amp" aria-hidden="true">&amp;</span>' +
      '<img class="contract-gate-brand-logo contract-gate-brand-logo-reva" src="' + iconBase + 'reva-logo.svg" width="48" height="48" alt="Reva">' +
      '</div>' +
      '<span class="contract-gate-brand-text">Linm &amp; Reva</span>';
    card.insertBefore(brand, logo);
  }

  function unlock() {
    if (gate) {
      gate.hidden = true;
      gate.setAttribute('hidden', '');
    }
    var publicNav = document.getElementById('plan-nav-public');
    if (publicNav) {
      publicNav.hidden = true;
      publicNav.setAttribute('hidden', '');
    }
    if (app) {
      app.classList.remove('is-locked');
      app.hidden = false;
      app.removeAttribute('hidden');
      app.removeAttribute('aria-hidden');
    }
    document.body.classList.remove('contract-locked');
  }

  function lock() {
    if (gate) {
      gate.hidden = false;
      gate.removeAttribute('hidden');
    }
    var publicNav = document.getElementById('plan-nav-public');
    if (publicNav) {
      publicNav.hidden = false;
      publicNav.removeAttribute('hidden');
    }
    if (app) {
      app.classList.add('is-locked');
      app.hidden = true;
      app.setAttribute('hidden', '');
      app.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.add('contract-locked');
  }

  function showSetupError() {
    if (setupEl) {
      setupEl.hidden = false;
      setupEl.textContent = document.documentElement.lang === 'en'
        ? 'Access code is not configured. Set CONTRACT_ACCESS_CODE and run scripts/gen-config.'
        : 'Chưa cấu hình mã truy cập. Đặt CONTRACT_ACCESS_CODE và chạy scripts/gen-config.';
    }
    var submit = form && form.querySelector('button[type=submit]');
    if (submit) submit.disabled = true;
    if (input) input.disabled = true;
  }

  function init() {
    injectGateBrand();
    var expected = getExpectedCode();
    if (!expected) {
      lock();
      showSetupError();
      return;
    }

    var saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved && saved === tokenFor(expected)) {
      unlock();
      return;
    }

    lock();
    if (input) input.focus();
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showError('');
      var expected = getExpectedCode();
      if (!expected) {
        showSetupError();
        lock();
        return;
      }
      var value = (input && input.value) ? input.value.trim() : '';
      if (value === expected) {
        sessionStorage.setItem(STORAGE_KEY, tokenFor(expected));
        unlock();
        return;
      }
      showError(document.documentElement.lang === 'en'
        ? 'Invalid access code.'
        : 'Mã truy cập không đúng.');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
