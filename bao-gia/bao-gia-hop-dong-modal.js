/**
 * Modal + export Hợp đồng chính (scope báo giá · số HĐ · tiền bằng chữ).
 * Số HĐ SSOT: extensions/hop-dong-docx/so-hop-dong-format.mjs
 */
(function () {
  var SO_HD_MA_TP = '51';
  var SO_HD_STT = '001';
  var SO_HD_MA_DOI_TAC = 'FM';
  var SO_HD_REGEX = /^\d{5}-\d{2}\/\d{4}-LIC\/LINM-[A-Z0-9]+$/i;

  /** Mẫu cố định (docs) — UI dùng tháng/năm hiện tại khi điền */
  var SO_HD_MAU_STATIC = '51001-07/2026-LIC/LINM-FM';

  function buildSoHopDongMau() {
    var now = new Date();
    var thang = String(now.getMonth() + 1).padStart(2, '0');
    var nam = now.getFullYear();
    return (
      SO_HD_MA_TP +
      SO_HD_STT +
      '-' +
      thang +
      '/' +
      nam +
      '-LIC/LINM-' +
      SO_HD_MA_DOI_TAC
    );
  }

  function validateSoHopDong(so) {
    so = (so || '').trim();
    if (!so) {
      return 'Vui lòng nhập số hợp đồng.';
    }
    if (!SO_HD_REGEX.test(so)) {
      return (
        'Số HĐ không đúng quy cách.\nMẫu: ' +
        buildSoHopDongMau() +
        '\n{ma TP 2}{STT 3}-{thang 2}/{nam 4}-LIC/LINM-{ma doi tac} (LIC = License)'
      );
    }
    return null;
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
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function parseFileName(cd, fallback) {
    if (!cd) return fallback;
    var m = cd.match(/filename="([^"]+)"/i);
    return m ? m[1] : fallback;
  }

  function isLocalDevHost() {
    return /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  }

  function buildApiUrl(soHopDong, ngayKy) {
    var q =
      '/api/export-hop-dong.docx?type=hop-dong-chinh&so=' +
      encodeURIComponent(soHopDong);
    if (ngayKy) q += '&ngay=' + encodeURIComponent(ngayKy);
    return q;
  }

  function exportHopDongChinh(soHopDong, ngayKy) {
    soHopDong = (soHopDong || '').trim();
    var formatErr = validateSoHopDong(soHopDong);
    if (formatErr) {
      return Promise.reject(new Error(formatErr));
    }

    if (!isLocalDevHost()) {
      return Promise.reject(
        new Error(
          'Tạo Hợp đồng chuẩn cần chạy local: yarn dev:std — hoặc dùng yarn export:hop-dong-chinh --so "..."',
        ),
      );
    }

    return fetch(buildApiUrl(soHopDong, ngayKy), {
      method: 'GET',
      credentials: 'same-origin',
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          throw new Error(text || 'Xuất Hợp đồng lỗi (' + res.status + ')');
        });
      }
      var fallback =
        'LinmSoft_Foodmart_ERP_2026_HopDongChinh_' +
        soHopDong.replace(/[^\w.-]+/g, '_') +
        '.docx';
      var fileName = parseFileName(
        res.headers.get('Content-Disposition'),
        fallback,
      );
      return res.blob().then(function (blob) {
        downloadBlob(blob, fileName);
      });
    });
  }

  function copyText(text) {
    text = (text || '').trim();
    if (!text) return Promise.reject(new Error('Không có nội dung để sao chép.'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        if (ok) resolve();
        else reject(new Error('Sao chép thất bại.'));
      } catch (e) {
        reject(e);
      }
    });
  }

  function flashCopyBtn(btn) {
    if (!btn) return;
    var prev = btn.textContent;
    btn.classList.add('is-copied');
    btn.textContent = 'Đã chép';
    setTimeout(function () {
      btn.classList.remove('is-copied');
      btn.textContent = prev;
    }, 1600);
  }

  function wireModal() {
    var modal = document.getElementById('hop-dong-modal');
    var openBtn = document.getElementById('bao-gia-create-hop-dong');
    var form = document.getElementById('hop-dong-modal-form');
    var cancelBtn = document.getElementById('hop-dong-modal-cancel');
    var soInput = document.getElementById('hop-dong-so');
    var ngayInput = document.getElementById('hop-dong-ngay');
    var fillBtn = document.getElementById('hop-dong-fill-mau');
    var fillInline = document.getElementById('hop-dong-fill-mau-inline');
    var copyBtn = document.getElementById('hop-dong-copy-so');
    if (!modal || !openBtn || !form) return;

    function fillSampleMau() {
      if (!soInput) return;
      soInput.value = buildSoHopDongMau();
      soInput.focus();
      soInput.select();
    }

    function openModal() {
      var app = document.getElementById('contract-app');
      if (!app || app.classList.contains('is-locked')) {
        window.alert('Vui lòng mở báo giá (nhập mã truy cập) trước.');
        return;
      }
      modal.hidden = false;
      modal.removeAttribute('hidden');
      if (soInput && !(soInput.value || '').trim()) {
        fillSampleMau();
      } else if (soInput) {
        soInput.focus();
      }
    }

    function closeModal() {
      modal.hidden = true;
      modal.setAttribute('hidden', '');
    }

    openBtn.addEventListener('click', openModal);
    if (fillBtn) fillBtn.addEventListener('click', fillSampleMau);
    if (fillInline) {
      fillInline.textContent = SO_HD_MAU_STATIC;
      fillInline.addEventListener('click', function () {
        if (soInput) {
          soInput.value = SO_HD_MAU_STATIC;
          soInput.focus();
          soInput.select();
        }
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyText(soInput ? soInput.value : '')
          .then(function () {
            flashCopyBtn(copyBtn);
          })
          .catch(function (err) {
            window.alert(err && err.message ? err.message : String(err));
          });
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modal.querySelectorAll('[data-hop-dong-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submit = form.querySelector('button[type=submit]');
      var label = submit ? submit.textContent : '';
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Đang tạo…';
      }
      exportHopDongChinh(
        soInput ? soInput.value : '',
        ngayInput ? ngayInput.value : '',
      )
        .then(closeModal)
        .catch(function (err) {
          window.alert(err && err.message ? err.message : String(err));
        })
        .finally(function () {
          if (submit) {
            submit.disabled = false;
            submit.textContent = label;
          }
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireModal);
  } else {
    wireModal();
  }

  window.BaoGiaHopDongModal = {
    exportHopDongChinh: exportHopDongChinh,
    buildSoHopDongMau: buildSoHopDongMau,
  };
})();
