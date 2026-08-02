/**
 * Trang /tao-phu-luc-theo-bao-gia — preview HTML + tải Word khớp nội dung hiển thị.
 */
(function () {
  var SO_HD_REGEX = /^\d{5}-\d{2}\/\d{4}-LIC\/LINM-[A-Z0-9]+$/i;

  function $(id) {
    return document.getElementById(id);
  }

  function validateSoHopDong(so) {
    so = (so || '').trim();
    if (!so) return 'Vui lòng nhập số hợp đồng tham chiếu.';
    if (!SO_HD_REGEX.test(so)) {
      return (
        'Số HĐ không đúng quy cách LIC.\nMẫu: 51001-07/2026-LIC/LINM-FM'
      );
    }
    return null;
  }

  function soPhuLucFromHopDong(so) {
    return '01-PL/' + (so || '').trim();
  }

  function buildSoHopDongMau() {
    var now = new Date();
    var thang = String(now.getMonth() + 1).padStart(2, '0');
    var nam = now.getFullYear();
    return '51001-' + thang + '/' + nam + '-LIC/LINM-FM';
  }

  function getPreviewData() {
    return window.PHU_LUC_PREVIEW || null;
  }

  function renderBody(soHopDong, ngayKy) {
    var data = getPreviewData();
    var el = $('phu-luc-doc-body');
    if (!data || !el) return;
    var ngay = (ngayKy || '').trim() || data.defaultNgay;
    var soPl = soPhuLucFromHopDong(soHopDong);
    var html = data.bodyTemplate
      .split(data.placeholderSo)
      .join(soHopDong)
      .split(data.placeholderSoPl)
      .join(soPl)
      .split(data.placeholderNgay)
      .join(ngay);
    el.innerHTML = html;
    var plPreview = $('phu-luc-so-pl-preview');
    if (plPreview) plPreview.textContent = soPl;
  }

  function readForm() {
    var soInput = $('phu-luc-so');
    var ngayInput = $('phu-luc-ngay');
    return {
      so: soInput ? soInput.value.trim() : '',
      ngay: ngayInput ? ngayInput.value.trim() : '',
    };
  }

  function applyPreview() {
    var form = readForm();
    var err = validateSoHopDong(form.so);
    if (err) {
      window.alert(err);
      return false;
    }
    renderBody(form.so, form.ngay);
    if (window.DocPageNumbers) {
      window.DocPageNumbers.refreshPhuLuc();
    }
    if (window.history && window.history.replaceState) {
      var q =
        '?so=' +
        encodeURIComponent(form.so) +
        (form.ngay ? '&ngay=' + encodeURIComponent(form.ngay) : '');
      window.history.replaceState(null, '', q);
    }
    return true;
  }

  function initFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var so = params.get('so') || '';
    var ngay = params.get('ngay') || '';
    var data = getPreviewData();
    var soInput = $('phu-luc-so');
    var ngayInput = $('phu-luc-ngay');
    if (soInput) soInput.value = so || (data && data.defaultSo) || buildSoHopDongMau();
    if (ngayInput && ngay) ngayInput.value = ngay;
    applyPreview();
  }

  function apiUrl(pathQuery) {
    return window.location.origin + pathQuery;
  }

  function isLocalDevHost() {
    var host = window.location.hostname;
    if (/^(localhost|127\.0\.0\.1)$/.test(host)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    return false;
  }

  function buildWordExportHtml(bodyInner) {
    var data = getPreviewData();
    var css = (data && data.docxCss) || '';
    var bodyStyle =
      (data && data.exportBodyStyle) ||
      "font-family:'Times New Roman',Times,serif;font-size:13pt;line-height:1.45;color:#111;margin:0";
    return (
      '<!DOCTYPE html><html lang="vi">' +
      '<head><meta charset="UTF-8"><style>' +
      css +
      '</style></head><body style="' +
      bodyStyle +
      '">' +
      bodyInner +
      '</body></html>'
    );
  }

  function getPreviewBodyHtml() {
    var bodyEl = $('phu-luc-doc-body');
    if (!bodyEl || !bodyEl.innerHTML.trim()) {
      throw new Error('Chưa có nội dung xem trước — nhập số HĐ và bấm Cập nhật xem trước.');
    }
    return bodyEl.innerHTML;
  }

  function downloadBlob(blob, fileName) {
    if (typeof saveAs === 'function') {
      saveAs(blob, fileName);
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseFileName(cd, fallback) {
    if (!cd) return fallback;
    var m = cd.match(/filename="([^"]+)"/i);
    return m ? m[1] : fallback;
  }

  function assertValidDocxBlob(blob, res) {
    var ct = res && res.headers ? res.headers.get('Content-Type') || '' : '';
    if (
      res &&
      ct.indexOf('wordprocessingml') === -1 &&
      ct.indexOf('octet-stream') === -1
    ) {
      return Promise.reject(
        new Error('API trả về không phải Word (' + ct + '). Restart yarn dev:std.'),
      );
    }
    return blob.arrayBuffer().then(function (ab) {
      var u8 = new Uint8Array(ab);
      if (u8.length < 4 || u8[0] !== 0x50 || u8[1] !== 0x4b) {
        return Promise.reject(
          new Error(
            'File tải về không hợp lệ (không phải DOCX). Mở http://localhost:9140/api/health — restart yarn dev:std.',
          ),
        );
      }
      return blob;
    });
  }

  function saveDocxResponse(res, form) {
    if (!res.ok) {
      return res.text().then(function (t) {
        throw new Error(t || 'Xuất Word lỗi (' + res.status + ')');
      });
    }
    var fallback = 'PhuLuc_' + form.so.replace(/[^\w.-]+/g, '_') + '.docx';
    var fileName = parseFileName(res.headers.get('Content-Disposition'), fallback);
    return res
      .blob()
      .then(function (blob) {
        return assertValidDocxBlob(blob, res);
      })
      .then(function (blob) {
        downloadBlob(blob, fileName);
      });
  }

  function downloadWordServer(form) {
    var bodyHtml = getPreviewBodyHtml();
    var q =
      '/api/export-hop-dong.docx?type=phu-luc-theo-bao-gia&so=' +
      encodeURIComponent(form.so);
    if (form.ngay) q += '&ngay=' + encodeURIComponent(form.ngay);

    return fetch(apiUrl(q), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyHtml: bodyHtml }),
    })
      .then(function (res) {
        if (res.status === 404 || res.status === 405) {
          return downloadWordServerGetFallback(form);
        }
        return saveDocxResponse(res, form);
      })
      .catch(function (err) {
        if (err && err.name === 'TypeError') {
          return downloadWordServerGetFallback(form);
        }
        throw err;
      });
  }

  function downloadWordServerGetFallback(form) {
    var q =
      '/api/export-hop-dong.docx?type=phu-luc-theo-bao-gia&so=' +
      encodeURIComponent(form.so);
    if (form.ngay) q += '&ngay=' + encodeURIComponent(form.ngay);
    return fetch(apiUrl(q), { credentials: 'include' }).then(function (res) {
      return saveDocxResponse(res, form);
    });
  }

  function downloadWordClient(form) {
    var bodyHtml = getPreviewBodyHtml();
    var html = buildWordExportHtml(bodyHtml);
    if (typeof htmlDocx === 'undefined' || !htmlDocx.asBlob) {
      throw new Error('Thiếu html-docx vendor.');
    }
    var blob = htmlDocx.asBlob(html);
    return assertValidDocxBlob(blob, null)
      .then(function (valid) {
        var fileName =
          'LinmSoft_Foodmart_PhuLuc_' +
          form.so.replace(/[^\w.-]+/g, '_') +
          '.docx';
        downloadBlob(valid, fileName);
      })
      .catch(function () {
        throw new Error(
          'Trình duyệt không tạo được Word hợp lệ. Chạy local: yarn dev:phu-luc rồi mở http://localhost:9140/tao-phu-luc-theo-bao-gia/',
        );
      });
  }

  function downloadWord() {
    if (!applyPreview()) return;
    var form = readForm();
    var btn = $('phu-luc-download-word');
    var label = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang tạo…';
    }
    var job = isLocalDevHost()
      ? downloadWordServer(form).catch(function () {
          return downloadWordServerGetFallback(form);
        })
      : downloadWordClient(form);
    job
      .catch(function (err) {
        window.alert(err && err.message ? err.message : String(err));
      })
      .finally(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = label;
        }
      });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('Clipboard không hỗ trợ.'));
  }

  function printPhuLuc() {
    if (!applyPreview()) return;
    document.body.classList.add('phu-luc-print-main');
    window.print();
  }

  function wireUi() {
    var form = $('phu-luc-form');
    var fillBtn = $('phu-luc-fill-mau');
    var copyBtn = $('phu-luc-copy-so');
    var dlBtn = $('phu-luc-download-word');
    var printBtn = $('phu-luc-print');

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        applyPreview();
      });
    }
    if (fillBtn) {
      fillBtn.addEventListener('click', function () {
        var soInput = $('phu-luc-so');
        if (soInput) {
          soInput.value = buildSoHopDongMau();
          applyPreview();
        }
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var form = readForm();
        copyText(form.so).then(function () {
          copyBtn.classList.add('is-copied');
          var prev = copyBtn.textContent;
          copyBtn.textContent = 'Đã chép';
          setTimeout(function () {
            copyBtn.classList.remove('is-copied');
            copyBtn.textContent = prev;
          }, 1600);
        });
      });
    }
    if (dlBtn) dlBtn.addEventListener('click', downloadWord);
    if (printBtn) {
      printBtn.addEventListener('click', printPhuLuc);
    }
  }

  window.addEventListener('afterprint', function () {
    document.body.classList.remove('phu-luc-print-main');
  });

  function whenUnlocked(cb) {
    var app = $('contract-app');
    if (!app) return;
    var obs = new MutationObserver(function () {
      if (!app.classList.contains('is-locked') && !app.hidden) {
        obs.disconnect();
        cb();
      }
    });
    obs.observe(app, { attributes: true, attributeFilter: ['class', 'hidden'] });
    if (!app.classList.contains('is-locked') && !app.hidden) cb();
  }

  function boot() {
    wireUi();
    whenUnlocked(initFromQuery);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
