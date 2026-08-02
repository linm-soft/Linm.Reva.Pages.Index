/**
 * Trang /hop-dong — preview HTML + tải Word khớp nội dung hiển thị.
 */
(function () {
  var SO_HD_REGEX = /^\d{5}-\d{2}\/\d{4}-LIC\/LINM-[A-Z0-9]+$/i;
  var GAP_STORAGE_KEY = 'hop-dong-show-lawyer-gap';

  function $(id) {
    return document.getElementById(id);
  }

  function stripGapMarkup(html) {
    return String(html || '')
      .replace(/<p class="hd-gap-block"[^>]*>[\s\S]*?<\/p>/gi, '')
      .replace(/<span class="hd-gap"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  }

  function validateSoHopDong(so) {
    so = (so || '').trim();
    if (!so) return 'Vui lòng nhập số hợp đồng.';
    if (!SO_HD_REGEX.test(so)) {
      return (
        'Số HĐ không đúng quy cách LIC.\nMẫu: 51001-07/2026-LIC/LINM-FM'
      );
    }
    return null;
  }

  function buildSoHopDongMau() {
    var now = new Date();
    var thang = String(now.getMonth() + 1).padStart(2, '0');
    var nam = now.getFullYear();
    return '51001-' + thang + '/' + nam + '-LIC/LINM-FM';
  }

  function getPreviewData() {
    return window.HOP_DONG_PREVIEW || null;
  }

  function renderBody(soHopDong, ngayKy) {
    var data = getPreviewData();
    var el = $('hop-dong-doc-body');
    if (!data || !el) return;
    var ngay = (ngayKy || '').trim() || data.defaultNgay;
    var html = data.bodyTemplate
      .split(data.placeholderSo)
      .join(soHopDong)
      .split(data.placeholderNgay)
      .join(ngay);
    el.innerHTML = html;
    if (
      $('hop-dong-preview-wrap') &&
      $('hop-dong-preview-wrap').classList.contains('show-lawyer-gap')
    ) {
      renderLawyerGapPanel();
    }
  }

  function readForm() {
    var soInput = $('hop-dong-so');
    var ngayInput = $('hop-dong-ngay');
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
      window.DocPageNumbers.refreshHopDong();
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
    var soInput = $('hop-dong-so');
    var ngayInput = $('hop-dong-ngay');
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
    // Dev server LAN — vẫn có API html-to-docx (tránh fallback html-docx client lệch In)
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    return false;
  }

  /** HTML + CSS SSOT — khớp server html-to-docx */
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
    var bodyEl = $('hop-dong-doc-body');
    if (!bodyEl || !bodyEl.innerHTML.trim()) {
      throw new Error('Chưa có nội dung xem trước — nhập số HĐ và bấm Cập nhật xem trước.');
    }
    return stripGapMarkup(bodyEl.innerHTML);
  }

  function gapIdsInDom() {
    var bodyEl = $('hop-dong-doc-body');
    if (!bodyEl) return {};
    var map = {};
    bodyEl.querySelectorAll('[data-hd-gap]').forEach(function (el) {
      map[el.getAttribute('data-hd-gap')] = true;
    });
    return map;
  }

  function renderLawyerGapPanel() {
    var panel = $('hop-dong-lawyer-gap-panel');
    var data = getPreviewData();
    if (!panel || !data || !data.lawyerGaps) return;

    var inDom = gapIdsInDom();
    var docRef = data.lawyerDocRef || 'bản luật sư';
    var items = data.lawyerGaps.slice();

    items.sort(function (a, b) {
      var rank = { high: 0, medium: 1, low: 2 };
      var ra = rank[a.severity] != null ? rank[a.severity] : 9;
      var rb = rank[b.severity] != null ? rank[b.severity] : 9;
      if (ra !== rb) return ra - rb;
      if (a.category !== b.category) return a.category < b.category ? -1 : 1;
      return a.title < b.title ? -1 : 1;
    });

    var listHtml = items
      .map(function (g) {
        var hasAnchor = !!inDom[g.id];
        var legendOnly = g.anchor === 'legend' || !hasAnchor;
        var jumpBtn = hasAnchor
          ? '<button type="button" class="gap-jump" data-gap-jump="' +
            g.id +
            '">Xem trong HĐ</button>'
          : '';
        return (
          '<li class="' +
          (legendOnly ? 'is-legend-only' : '') +
          '" data-gap-id="' +
          g.id +
          '">' +
          '<strong>' +
          g.title +
          '</strong>' +
          jumpBtn +
          '<div>' +
          g.detail +
          '</div>' +
          '<div class="gap-meta">' +
          g.lawyerRef +
          '</div>' +
          '</li>'
        );
      })
      .join('');

    panel.innerHTML =
      '<p class="hop-dong-lawyer-gap-panel-lead">Đối chiếu với <em>' +
      docRef +
      '</em>. Vàng = Bên A cần bổ sung · Đỏ = HĐ chưa có/khác bản luật sư · Tím = ghi chú review.</p>' +
      '<div class="hop-dong-lawyer-gap-legend">' +
      '<span class="lg-ben-a"><i></i> Thiếu / chờ Bên A</span>' +
      '<span class="lg-lawyer"><i></i> Gap vs luật sư</span>' +
      '<span class="lg-review"><i></i> Ghi chú review</span>' +
      '</div>' +
      '<ul class="hop-dong-lawyer-gap-list">' +
      listHtml +
      '</ul>';

    panel.querySelectorAll('[data-gap-jump]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-gap-jump');
        var el = document.querySelector('[data-hd-gap="' + id + '"]');
        if (el && el.scrollIntoView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('hd-gap-flash');
          setTimeout(function () {
            el.classList.remove('hd-gap-flash');
          }, 1600);
        }
      });
    });
  }

  function setLawyerGapVisible(on) {
    var wrap = $('hop-dong-preview-wrap');
    var preview = $('hop-dong-preview');
    var panel = $('hop-dong-lawyer-gap-panel');
    var cb = $('hop-dong-lawyer-gap-cb');
    if (wrap) wrap.classList.toggle('show-lawyer-gap', !!on);
    if (preview) preview.classList.toggle('show-lawyer-gap', !!on);
    if (panel) panel.hidden = !on;
    if (cb) cb.checked = !!on;
    try {
      localStorage.setItem(GAP_STORAGE_KEY, on ? '1' : '0');
    } catch (e) {
      /* ignore */
    }
    if (on) renderLawyerGapPanel();
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

  /** DOCX = ZIP (magic PK) — chặn lưu HTML/JSON lỗi thành .docx */
  function assertValidDocxBlob(blob, res) {
    var ct = res && res.headers ? res.headers.get('Content-Type') || '' : '';
    if (
      res &&
      ct.indexOf('wordprocessingml') === -1 &&
      ct.indexOf('octet-stream') === -1
    ) {
      return Promise.reject(
        new Error('API trả về không phải Word (' + ct + '). Restart yarn dev:hop-dong.'),
      );
    }
    return blob.arrayBuffer().then(function (ab) {
      var u8 = new Uint8Array(ab);
      if (u8.length < 4 || u8[0] !== 0x50 || u8[1] !== 0x4b) {
        return Promise.reject(
          new Error(
            'File tải về không hợp lệ (không phải DOCX). Mở http://localhost:9140/api/health — restart yarn dev:hop-dong.',
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
    var fallback = 'HopDong_' + form.so.replace(/[^\w.-]+/g, '_') + '.docx';
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
      '/api/export-hop-dong.docx?type=hop-dong-chinh&so=' +
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
      '/api/export-hop-dong.docx?type=hop-dong-chinh&so=' +
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
          'LinmSoft_Foodmart_HopDong_' +
          form.so.replace(/[^\w.-]+/g, '_') +
          '.docx';
        downloadBlob(valid, fileName);
      })
      .catch(function () {
        throw new Error(
          'Trình duyệt không tạo được Word hợp lệ. Chạy local: yarn dev:hop-dong rồi mở http://localhost:9140/hop-dong/',
        );
      });
  }

  function downloadWord() {
    if (!applyPreview()) return;
    var form = readForm();
    var btn = $('hop-dong-download-word');
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

  function wireUi() {
    var form = $('hop-dong-form');
    var fillBtn = $('hop-dong-fill-mau');
    var copyBtn = $('hop-dong-copy-so');
    var dlBtn = $('hop-dong-download-word');
    var printBtn = $('hop-dong-print');

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        applyPreview();
      });
    }
    if (fillBtn) {
      fillBtn.addEventListener('click', function () {
        var soInput = $('hop-dong-so');
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
      printBtn.addEventListener('click', function () {
        if (!applyPreview()) return;
        window.print();
      });
    }

    var gapCb = $('hop-dong-lawyer-gap-cb');
    if (gapCb) {
      var saved = true;
      try {
        var stored = localStorage.getItem(GAP_STORAGE_KEY);
        if (stored !== null) saved = stored === '1';
      } catch (e) {
        saved = true;
      }
      setLawyerGapVisible(saved);
      gapCb.addEventListener('change', function () {
        setLawyerGapVisible(gapCb.checked);
      });
    }
  }

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

  window.addEventListener('beforeprint', function () {
    if (window.DocPageNumbers) {
      window.DocPageNumbers.refreshHopDong();
    }
  });

  window.addEventListener('afterprint', function () {
    if (window.DocPageNumbers) {
      window.DocPageNumbers.restoreHopDongFromPrint();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
