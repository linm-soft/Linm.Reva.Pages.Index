(function () {
  var STORAGE_KEY = 'reva_contract_unlock';

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

  function isUnlocked() {
    var expected = getExpectedCode();
    if (!expected) return false;
    var saved = sessionStorage.getItem(STORAGE_KEY);
    return saved && saved === tokenFor(expected);
  }

  function applyState() {
    var unlocked = isUnlocked();
    document.querySelectorAll('[data-quote-unlocked]').forEach(function (el) {
      el.hidden = !unlocked;
      if (unlocked) el.removeAttribute('hidden');
      else el.setAttribute('hidden', '');
    });
    var heroNote = document.getElementById('home-hero-note');
    if (heroNote) {
      heroNote.hidden = unlocked;
      if (unlocked) heroNote.setAttribute('hidden', '');
      else heroNote.removeAttribute('hidden');
    }
  }

  function init() {
    applyState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
