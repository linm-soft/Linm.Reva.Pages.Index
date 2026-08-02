/**
 * Xuất Hợp đồng / Phụ lục DOCX từ nội dung báo giá.
 * Local dev: GET /api/export-hop-dong.docx (html-to-docx server).
 * Production / fallback: vendor html-docx-js + FileSaver.
 */
(function () {
  var CONFIG = {
    quocHieu: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    quocHieuSub: 'Độc lập - Tự do - Hạnh phúc',
    soHopDong: '_____-__/____-LIC/LINM-FM',
    soPhuLuc: '01-PL/51001-07/2026-LIC/LINM-FM',
    ngayKy: '______ tháng ______ năm 2026',
    tenDuAn:
      'Triển khai Foodmart (FM) - Hệ thống kế toán - quản trị siêu thị — ERP Linm & tích hợp',
    benA: {
      label: 'BÊN A (BÊN THUÊ)',
      ten: 'CÔNG TY CỔ PHẦN SIÊU THỊ THỰC PHẨM VIỆT NAM',
      diaChi:
        '22/4 Đường Tân Phú, Lô M8, Khu phố Phú Mỹ Hưng - Midtown, P. Tân Phú, Q.7, TP. Hồ Chí Minh',
      dienThoai: '028 22 188 999',
      email: 'sieuthifoodmart@gmail.com',
      mst: '0317983888',
      daiDien: 'Ông Nguyễn Thanh Dân',
      chucVu: 'Giám đốc',
      daiDienDienThoai: '0902331619',
    },
    benB: {
      label: 'BÊN B (BÊN GIA CÔNG)',
      loai: 'ca-nhan',
      ten: 'ĐINH BỘ LĨNH',
      diaChi:
        'Đông Viên, Xã Minh Châu, Tỉnh Nghệ An (địa chỉ cũ: xóm 8, xã Diễn Hạnh, Huyện Diễn Châu, Tỉnh Nghệ An)',
      dienThoai: '0775909978',
      email: 'linmsoft@gmail.com',
      mst: '',
      daiDien: 'Đinh Bộ Lĩnh',
      chucVu: 'Kỹ sư/Chuyên viên phát triển phần mềm',
      cccd: '040096030652',
    },
    panelOrder: [
      { id: 'hang-muc', title: 'Phần 1 · Hạng mục (ERP & API)' },
      { id: 'phan-he', title: 'Phần 2 · Danh mục · Chứng từ · Báo cáo' },
      { id: 'timeline', title: 'Phần 3 · Timeline Release' },
      { id: 'ban-giao', title: 'Phần 4 · Bàn giao · Hạ tầng' },
      { id: 'bao-tri', title: 'Phần 5 · Bảo trì phần mềm' },
      { id: 'dieu-khoan', title: 'Phần 6 · Điều khoản triển khai' },
    ],
    fileNamePrefix: 'LinmSoft_Foodmart_ERP_2026_HopDong',
  };

  var DOCX_CSS =
    "body{font-family:'Times New Roman',Times,serif;font-size:13pt;line-height:1.35;color:#111;}" +
    'h1{font-size:16pt;text-align:center;margin:16px 0 8px;}' +
    'h2{font-size:14pt;margin:18px 0 8px;}' +
    'h3{font-size:13pt;margin:14px 0 6px;}' +
    'p{margin:6px 0;}' +
    'table{border-collapse:collapse;width:100%;margin:12px 0;font-size:11pt;}' +
    'th,td{border:1px solid #444;padding:5px 8px;vertical-align:top;}' +
    'th{background:#eef2f7;font-weight:bold;}' +
    '.price-col{text-align:right;}' +
    'tr.total-row td{background:#f4f6f8;font-weight:bold;}' +
    '.contract-box{border:1px solid #888;border-left:4px solid #2563eb;padding:12px 14px;margin:14px 0;}' +
    '.panel-note{background:#fffbeb;border:1px solid #e5c76b;padding:10px 12px;margin:12px 0;}' +
    '.section-part{page-break-before:always;margin-top:8px;}' +
    '.section-part:first-of-type{page-break-before:auto;}' +
    '.part-heading{font-size:14pt;font-weight:bold;text-align:center;margin:20px 0 12px;border-bottom:1px solid #ccc;padding-bottom:6px;}' +
    '.quoc-hieu{text-align:center;font-size:12pt;}' +
    '.party-block{margin:12px 0;font-size:12pt;}';

  function partyHtml(party) {
    var lines = [
      '<strong>' + party.label + ': ' + party.ten + '</strong>',
      'Địa chỉ: ' + party.diaChi,
      'Điện thoại: ' + party.dienThoai,
    ];
    if (party.email) lines.push('Email: ' + party.email);
    if (party.mst) lines.push('MST: ' + party.mst);
    if (party.loai === 'ca-nhan') {
      if (party.cccd) lines.push('Số CCCD: ' + party.cccd);
      if (party.chucVu) lines.push('Chức vụ: ' + party.chucVu);
    } else {
      var repLine =
        'Đại diện: <strong>' +
        party.daiDien +
        '</strong> — Chức vụ: ' +
        party.chucVu;
      if (party.daiDienDienThoai) {
        repLine += ' — Số điện thoại: ' + party.daiDienDienThoai;
      }
      lines.push(repLine);
    }
    return '<div class="party-block">' + lines.join('<br>') + '</div>';
  }

  function stripPanelHtml(el) {
    var clone = el.cloneNode(true);
    var removeSel =
      'script,style,button,nav,.tien-do-tabs-wrap,.plan-nav,.plan-footer,.hero-stats,.print-tab-label,.doc-footer';
    clone.querySelectorAll(removeSel).forEach(function (node) {
      node.remove();
    });
    clone.querySelectorAll('a[href]').forEach(function (a) {
      var span = document.createElement('span');
      span.textContent = a.textContent || '';
      a.replaceWith(span);
    });
    clone.removeAttribute('hidden');
    return clone.innerHTML;
  }

  function contractHeaderHtml(type) {
    var isPhuLuc = type === 'phu-luc';
    var title = isPhuLuc
      ? 'PHỤ LỤC HỢP ĐỒNG<br>NGHIỆM THU – TIẾN ĐỘ – THANH TOÁN'
      : 'HỢP ĐỒNG GIA CÔNG PHẦN MỀM';
    var so = isPhuLuc ? CONFIG.soPhuLuc : CONFIG.soHopDong;
    var dinhKem = isPhuLuc
      ? '<p style="text-align:center;font-size:12pt;"><em>Số:</em> ' +
        so +
        '<br><em>(Đính kèm Hợp đồng gia công phần mềm số ' +
        CONFIG.soHopDong +
        ' — ' +
        CONFIG.tenDuAn +
        ')</em></p>'
      : '<p style="text-align:center;font-size:12pt;"><em>Số:</em> ' + so + '</p>';

    return (
      '<div class="quoc-hieu">' +
      CONFIG.quocHieu +
      '</div>' +
      '<div class="quoc-hieu" style="margin-bottom:20px;">' +
      CONFIG.quocHieuSub +
      '<br>---o0o---</div>' +
      '<h1>' +
      title +
      '</h1>' +
      dinhKem +
      '<p>Phụ lục / Hợp đồng này được lập căn cứ <strong>Báo giá triển khai ERP Linm &amp; tích hợp</strong> (Foodmart · FM · 2026) và ký ngày ' +
      CONFIG.ngayKy +
      ' giữa:</p>' +
      partyHtml(CONFIG.benA) +
      partyHtml(CONFIG.benB) +
      '<p>Về dự án: <strong>' +
      CONFIG.tenDuAn +
      '</strong>. Nội dung chi tiết theo các phần sau (đồng bộ báo giá).</p>'
    );
  }

  function buildHtml(type, includeHeader) {
    var app = document.getElementById('contract-app');
    if (!app || app.classList.contains('is-locked')) {
      throw new Error('Vui lòng mở báo giá (nhập mã truy cập) trước khi xuất Word.');
    }
    var parts = [];
    if (includeHeader) parts.push(contractHeaderHtml(type));
    CONFIG.panelOrder.forEach(function (panel) {
      var el = app.querySelector('[data-tien-do-panel="' + panel.id + '"]');
      if (!el) return;
      parts.push(
        '<section class="section-part"><h2 class="part-heading">' +
          panel.title +
          '</h2>' +
          stripPanelHtml(el) +
          '</section>',
      );
    });
    return (
      '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><style>' +
      DOCX_CSS +
      '</style></head><body>' +
      parts.join('') +
      '</body></html>'
    );
  }

  function defaultFileName(type) {
    var suffix = type === 'phu-luc' ? 'PhuLuc' : 'HopDong';
    var d = new Date();
    var ymd =
      '' +
      d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    return CONFIG.fileNamePrefix + '_' + suffix + '_' + ymd + '.docx';
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

  function parseFileNameFromDisposition(header, fallback) {
    if (!header) return fallback;
    var m = header.match(/filename="([^"]+)"/i);
    return m ? m[1] : fallback;
  }

  function isLocalDevHost() {
    return /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  }

  function exportViaDevApi(type) {
    var url =
      '/api/export-hop-dong.docx?type=' + encodeURIComponent(type || 'phu-luc');
    return fetch(url, { method: 'GET', credentials: 'same-origin' }).then(
      function (res) {
        if (!res.ok) {
          return res.text().then(function (text) {
            throw new Error(text || 'API xuất Word lỗi (' + res.status + ')');
          });
        }
        var fileName = parseFileNameFromDisposition(
          res.headers.get('Content-Disposition'),
          defaultFileName(type),
        );
        return res.blob().then(function (blob) {
          downloadBlob(blob, fileName);
        });
      },
    );
  }

  function exportViaClient(type, includeHeader) {
    if (typeof htmlDocx === 'undefined') {
      throw new Error(
        'Thư viện xuất Word chưa tải — kiểm tra bao-gia/vendor/html-docx.js hoặc chạy yarn dev:std.',
      );
    }
    var html = buildHtml(type || 'phu-luc', includeHeader !== false);
    var blob = htmlDocx.asBlob(html, { orientation: 'portrait' });
    downloadBlob(blob, defaultFileName(type || 'phu-luc'));
  }

  function exportDocx(type, includeHeader) {
    type = type || 'phu-luc';
    if (isLocalDevHost()) {
      return exportViaDevApi(type).catch(function (apiErr) {
        console.warn('Dev API export failed, fallback client:', apiErr);
        try {
          exportViaClient(type, includeHeader);
        } catch (clientErr) {
          throw new Error(
            (apiErr && apiErr.message ? apiErr.message + '\n' : '') +
              (clientErr && clientErr.message ? clientErr.message : String(clientErr)),
          );
        }
      });
    }
    return Promise.resolve().then(function () {
      exportViaClient(type, includeHeader);
    });
  }

  function wireButton() {
    var btn = document.getElementById('bao-gia-export-docx');
    if (!btn) return;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'Đang xuất…';
      exportDocx('phu-luc', true)
        .catch(function (err) {
          window.alert(err && err.message ? err.message : String(err));
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = label;
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButton);
  } else {
    wireButton();
  }

  window.BaoGiaExportDocx = { exportDocx: exportDocx, buildHtml: buildHtml };
})();
