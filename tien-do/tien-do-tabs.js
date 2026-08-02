(function () {
  var tabs = document.querySelectorAll('[data-tien-do-tab]');
  var panels = document.querySelectorAll('[data-tien-do-panel]');
  if (!tabs.length || !panels.length) return;

  function activate(id) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tien-do-tab') === id;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (p) {
      var on = p.getAttribute('data-tien-do-panel') === id;
      p.classList.toggle('is-active', on);
      if (on) {
        p.removeAttribute('hidden');
      } else {
        p.setAttribute('hidden', '');
      }
    });
    if (history.replaceState) {
      history.replaceState(null, '', '#' + id);
    }
    if (window.DocPageNumbers && window.DocPageNumbers.refreshBaoGia) {
      window.DocPageNumbers.refreshBaoGia();
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activate(tab.getAttribute('data-tien-do-tab'));
    });
  });

  var hash = (location.hash || '').replace('#', '');
  if (hash && document.querySelector('[data-tien-do-panel="' + hash + '"]')) {
    activate(hash);
  }
})();
