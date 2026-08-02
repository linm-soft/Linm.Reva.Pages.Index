(function () {
  var panels = document.querySelectorAll('[data-tien-do-panel]');
  var tabs = document.querySelectorAll('[data-tien-do-tab]');
  if (!panels.length) return;

  var savedPanelId = null;

  function refreshPageNumbers() {
    if (window.DocPageNumbers && window.DocPageNumbers.refreshBaoGia) {
      window.DocPageNumbers.refreshBaoGia();
    }
  }

  function getActiveId() {
    var active = document.querySelector('[data-tien-do-panel].is-active');
    return active ? active.getAttribute('data-tien-do-panel') : 'hang-muc';
  }

  function showAllPanelsForPrint() {
    panels.forEach(function (p) {
      p.removeAttribute('hidden');
      p.classList.add('is-active');
    });
    document.body.classList.add('bao-gia-printing');
  }

  function restoreTabState() {
    document.body.classList.remove('bao-gia-printing');
    var id = savedPanelId || getActiveId() || 'hang-muc';
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
    refreshPageNumbers();
  }

  window.addEventListener('beforeprint', function () {
    savedPanelId = getActiveId();
    showAllPanelsForPrint();
    refreshPageNumbers();
  });

  window.addEventListener('afterprint', restoreTabState);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshPageNumbers);
  } else {
    refreshPageNumbers();
  }
})();
