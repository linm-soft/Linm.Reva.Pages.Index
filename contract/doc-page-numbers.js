/**
 * Đánh số trang preview — Thông tin bổ sung (data-page-numbering=exclude) không tính.
 */
(function (global) {
  var FOOTER = 'doc-sheet-page-footer';
  var SHEET = 'doc-print-sheet';
  var EXCLUDE = 'exclude';
  var PAGE_LABEL_PREFIX = 'Foodmart (FM) - Linm - Trang ';

  function getPageLabelPrefix() {
    var d = global.HOP_DONG_PREVIEW;
    if (d && d.pageLabelPrefix) return d.pageLabelPrefix;
    return PAGE_LABEL_PREFIX;
  }

  function formatPageLabel(page, total) {
    return getPageLabelPrefix() + page + '/' + total;
  }

  function isExcluded(el) {
    if (!el) return false;
    if (el.getAttribute('data-page-numbering') === EXCLUDE) return true;
    return !!el.closest('[data-page-numbering="' + EXCLUDE + '"]');
  }

  function clearFooters(root) {
    if (!root) return;
    root.querySelectorAll('.' + FOOTER).forEach(function (f) {
      f.remove();
    });
  }

  function stampFooter(sheet, text, excluded) {
    var f = document.createElement('div');
    f.className = FOOTER + (excluded ? ' doc-sheet-page-footer--excluded' : '');
    f.setAttribute('aria-hidden', 'true');
    f.textContent = text;
    sheet.appendChild(f);
  }

  function numberSheets(sheets) {
    var list = Array.prototype.slice.call(sheets);
    var total = 0;
    list.forEach(function (sheet) {
      if (!isExcluded(sheet)) total += 1;
    });
    var n = 0;
    list.forEach(function (sheet) {
      if (isExcluded(sheet)) {
        stampFooter(
          sheet,
          'Thông tin bổ sung — không đánh số trang',
          true,
        );
        return;
      }
      n += 1;
      stampFooter(sheet, formatPageLabel(n, total));
    });
  }

  function unwrapHopDongSheets(body) {
    var sheets = body.querySelectorAll(':scope > .' + SHEET);
    if (!sheets.length) return;
    var nodes = [];
    sheets.forEach(function (s) {
      clearFooters(s);
      while (s.firstChild) {
        nodes.push(s.removeChild(s.firstChild));
      }
      s.remove();
    });
    nodes.forEach(function (n) {
      body.appendChild(n);
    });
  }

  function paginateHopDong(body, pageHeight) {
    unwrapHopDongSheets(body);
    clearFooters(body);

    var nodes = [];
    body.childNodes.forEach(function (n) {
      nodes.push(n);
    });
    nodes.forEach(function (n) {
      n.remove();
    });

    var sheet = document.createElement('div');
    sheet.className = SHEET;
    body.appendChild(sheet);

    nodes.forEach(function (node) {
      sheet.appendChild(node);
      while (sheet.scrollHeight > pageHeight && sheet.childNodes.length > 1) {
        var last = sheet.lastChild;
        last.remove();
        var next = document.createElement('div');
        next.className = SHEET;
        body.appendChild(next);
        next.appendChild(last);
        sheet = next;
      }
    });

    numberSheets(body.querySelectorAll(':scope > .' + SHEET));
  }

  function refreshPhuLuc() {
    var body = document.getElementById('phu-luc-doc-body');
    if (!body) return;
    clearFooters(body);
    var main = body.querySelector('.phu-luc-main-doc');
    if (main) {
      numberSheets(main.querySelectorAll('.phu-luc-cover, .phu-luc-section'));
    } else {
      numberSheets(body.querySelectorAll('.phu-luc-cover, .phu-luc-section'));
    }
    var boSung = body.querySelector('.phu-luc-bo-sung-doc');
    if (boSung) {
      stampFooter(
        boSung,
        'Thông tin bổ sung — in riêng · không đánh số trang',
        true,
      );
    }
    document.body.classList.add('doc-print-paginated');
  }

  function refreshHopDong() {
    var body = document.getElementById('hop-dong-doc-body');
    if (!body || !body.innerHTML.trim()) return;
    var preview = document.getElementById('hop-dong-preview');
    var pageH = 1020;
    if (preview) {
      var w = preview.clientWidth || 820;
      pageH = Math.max(720, Math.round(w * 1.35));
    }
    paginateHopDong(body, pageH);
    document.body.classList.add('doc-print-paginated');
  }

  function collectBaoGiaPageUnits(panel) {
    var units = [];
    if (!panel) return units;
    if (panel.classList.contains(SHEET)) {
      units.push(panel);
      return units;
    }
    Array.from(panel.children).forEach(function (child) {
      if (
        child.classList.contains(SHEET) ||
        child.getAttribute('data-page-numbering') === EXCLUDE
      ) {
        units.push(child);
      }
    });
    return units;
  }

  function refreshBaoGia() {
    var app = document.getElementById('contract-app');
    if (!app) return;
    clearFooters(app);

    var panel = document.querySelector('[data-tien-do-panel].is-active');
    if (!panel) return;
    numberSheets(collectBaoGiaPageUnits(panel));
  }

  function restoreHopDongFromPrint() {
    var body = document.getElementById('hop-dong-doc-body');
    if (body) unwrapHopDongSheets(body);
    document.body.classList.remove('doc-print-paginated');
    refreshHopDong();
  }

  global.DocPageNumbers = {
    refreshPhuLuc: refreshPhuLuc,
    refreshHopDong: refreshHopDong,
    refreshBaoGia: refreshBaoGia,
    restoreHopDongFromPrint: restoreHopDongFromPrint,
    paginateHopDong: paginateHopDong,
  };
})(window);
