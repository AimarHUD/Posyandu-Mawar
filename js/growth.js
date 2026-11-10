(function () {
  var labels = {
    berat: { title: 'Berat Badan', unit: 'kg', min: 1, max: 30, icon: '⚖️' },
    tinggi: { title: 'Panjang/Tinggi Badan', unit: 'cm', min: 40, max: 130, icon: '📏' },
    lingkar_kepala: { title: 'Lingkar Kepala', unit: 'cm', min: 30, max: 60, icon: '🧢' },
    lila: { title: 'Lingkar Lengan Atas', unit: 'cm', min: 8, max: 25, icon: '💪' }
  };
  var growth = {
    page: '',
    child: null,
    section: 'profil',
    kind: '',
    method: '',
    data: null,
    loading: false,
    error: '',
    notice: '',
    chartType: 'berat',
    chart: null,
    drafts: {},
    pending: null
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function todayString() {
    return iso(new Date());
  }

  function displayDate(value) {
    if (!value) return 'Belum ada';
    var date = new Date(value + 'T00:00:00');
    return isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function selectedChild() {
    return growth.child;
  }

  function measurements() {
    return growth.data ? growth.data.measurements || [] : [];
  }

  function latestMeasurement(kind) {
    if (!growth.data || !growth.data.latest) return null;
    for (var i = 0; i < growth.data.latest.length; i++) {
      if (growth.data.latest[i].jenis === kind) return growth.data.latest[i];
    }
    return null;
  }

  function ageAt(date) {
    var born = new Date(selectedChild().lahir + 'T00:00:00');
    var at = new Date(date + 'T00:00:00');
    var months = (at.getFullYear() - born.getFullYear()) * 12 + at.getMonth() - born.getMonth();
    if (at.getDate() < born.getDate()) months--;
    return Math.max(0, months);
  }

  function correctionFor(method, date) {
    var months = ageAt(date || todayString());
    if (months <= 24 && method === 'berdiri') return 0.7;
    if (months > 24 && method === 'berbaring') return -0.7;
    return 0;
  }

  function request(action, payload) {
    var csrf = document.querySelector('meta[name="growth-csrf"]').content;
    return fetch('routes/tumbuh-kembang.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({
        action: action,
        balita: selectedChild(),
        measurement: payload || null,
        vitamin: payload || null
      })
    }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error(body.error || 'Permintaan tidak berhasil.');
        return body;
      });
    });
  }

  function updateData(data) {
    growth.data = data;
    selectedChild().growthBalitaId = data.balita_id;
    save();
  }

  function loadData() {
    var childId = selectedChild().id;
    growth.loading = true;
    growth.error = '';
    renderGrowth();
    request('load').then(function (data) {
      if (!growth.child || growth.child.id !== childId) return;
      updateData(data);
      growth.loading = false;
      renderGrowth();
    }).catch(function (error) {
      if (!growth.child || growth.child.id !== childId) return;
      growth.loading = false;
      growth.error = error.message;
      renderGrowth();
    });
  }

  function setPage(page) {
    growth.page = page;
    if (growth.chart) {
      growth.chart.destroy();
      growth.chart = null;
    }
    renderGrowth();
  }

  function openChild(id) {
    var child = db.balita.find(function (record) { return Number(record.id) === Number(id); });
    if (!child) return;
    growth.child = child;
    growth.section = 'profil';
    growth.kind = '';
    growth.method = '';
    growth.data = null;
    growth.notice = '';
    growth.drafts = {};
    setPage('detail');
    loadData();
  }

  function showListFromRoute() {
    growth.page = '';
    growth.child = null;
    if (growth.chart) {
      growth.chart.destroy();
      growth.chart = null;
    }
    render();
  }

  function syncDetailRoute() {
    var match = location.hash.match(/^#balita-(\d+)$/);
    if (match) {
      openChild(match[1]);
    } else if (growth.page) {
      showListFromRoute();
    }
  }

  function headerHtml() {
    var child = selectedChild();
    return '<div class="growth-heading">' +
      '<button class="growth-back" data-growth-back type="button" aria-label="Kembali ke daftar balita">‹</button>' +
      '<div><span class="growth-eyebrow">Pemantauan balita</span><h2>' + escapeHtml(child.nama) + '</h2>' +
      '<small>' + escapeHtml(umurTxt(bulan(child.lahir))) + ' · Lahir ' + escapeHtml(displayDate(child.lahir)) + '</small></div>' +
      '</div>';
  }

  function tabsHtml() {
    var tabs = [
      ['profil', 'Profil'], ['pengukuran', 'Pengukuran'], ['grafik', 'Grafik'],
      ['vitamin', 'Vitamin A'], ['catatan', 'Catatan Kunjungan']
    ];
    return '<div class="growth-tabs" role="tablist" aria-label="Detail balita">' +
      tabs.map(function (item) {
        return '<button type="button" role="tab" data-growth-tab="' + item[0] +
          '" aria-selected="' + (growth.section === item[0]) + '" class="' +
          (growth.section === item[0] ? 'active' : '') + '">' + item[1] + '</button>';
      }).join('') + '</div>';
  }

  function statusHtml() {
    if (growth.loading) return '<div class="growth-message">Memuat catatan tumbuh kembang…</div>';
    if (growth.error) {
      return '<div class="growth-error" role="alert">' + escapeHtml(growth.error) +
        '<button type="button" class="link" data-growth-retry>Coba lagi</button></div>';
    }
    if (growth.notice) {
      var notice = growth.notice;
      growth.notice = '';
      return '<div class="growth-success" role="status">' + escapeHtml(notice) + '</div>';
    }
    return '';
  }

  function profileHtml() {
    var child = selectedChild();
    var latest = growth.data && growth.data.latest || [];
    var weight = latest.find(function (item) { return item.jenis === 'berat'; });
    var height = latest.find(function (item) { return item.jenis === 'tinggi'; });
    return '<section class="growth-card growth-profile">' +
      '<div class="growth-avatar" aria-hidden="true">🌹</div><div><span class="growth-eyebrow">Profil balita</span>' +
      '<h3>' + escapeHtml(child.nama) + '</h3><p>Anak dari ' + escapeHtml(child.ortu || 'belum dicatat') + '</p></div>' +
      '</section><div class="growth-summary-grid">' +
      summaryCard('Tanggal lahir', displayDate(child.lahir)) +
      summaryCard('Umur saat ini', umurTxt(bulan(child.lahir))) +
      summaryCard('Berat terakhir', weight ? weight.nilai + ' kg' : 'Belum dicatat') +
      summaryCard('Tinggi terakhir', height ? height.nilai + ' cm' : 'Belum dicatat') +
      '</div><p class="growth-hint">Gunakan tab Pengukuran untuk mencatat hasil pemeriksaan secara manual.</p>';
  }

  function summaryCard(title, value) {
    return '<div class="growth-card growth-summary"><span>' + escapeHtml(title) + '</span><b>' +
      escapeHtml(value) + '</b></div>';
  }

  function measurementsHtml() {
    var cards = Object.keys(labels).map(function (kind) {
      var type = labels[kind];
      var last = latestMeasurement(kind);
      var sub = last ? escapeHtml(last.nilai) + ' ' + type.unit + ' · ' + escapeHtml(displayDate(last.tanggal_ukur)) : 'Catat sekarang';
      return '<button type="button" class="measure-card" data-measure="' + kind + '">' +
        '<span class="measure-icon">' + type.icon + '</span><span class="measure-copy"><b>' + type.title +
        '</b><small>' + sub + '</small></span><span class="measure-arrow" aria-hidden="true">›</span></button>';
    }).join('');
    return '<h3 class="growth-section-title">Catat hasil pengukuran</h3>' +
      '<p class="growth-hint">Masukkan hasil yang diukur langsung oleh petugas.</p>' + cards;
  }

  function measurementFormHtml() {
    var type = labels[growth.kind];
    var last = latestMeasurement(growth.kind);
    var today = todayString();
    var correction = correctionFor(growth.method, today);
    var correctionText = correction > 0 ? 'Hasil ukur berdiri dikoreksi otomatis +0,7 cm karena umur saat pengukuran 0–24 bulan.' :
      correction < 0 ? 'Hasil ukur berbaring dikoreksi otomatis −0,7 cm karena umur saat pengukuran di atas 24 bulan.' :
        'Tidak ada koreksi otomatis untuk cara ukur dan umur ini.';
    var modeHtml = growth.kind === 'tinggi' ?
      '<div class="measure-mode"><span>Cara ukur</span><b>' + (growth.method === 'berdiri' ? 'Berdiri' : 'Berbaring') +
      '</b><button type="button" class="link" data-change-mode>Ubah</button></div>' +
      '<div class="growth-soft-alert" id="correction-note">' + correctionText + '</div>' : '';
    return '<button type="button" class="growth-back-link" data-measure-back>‹ Kembali ke daftar pengukuran</button>' +
      '<h3 class="growth-section-title">' + type.title + '</h3>' +
      '<div class="growth-card last-measure-grid"><div><span>Pengukuran terakhir</span><b>' +
      escapeHtml(last ? displayDate(last.tanggal_ukur) : 'Belum ada') + '</b></div><div><span>Nilai terakhir</span><b>' +
      escapeHtml(last ? last.nilai + ' ' + type.unit : 'Belum ada') + '</b></div></div>' +
      modeHtml + '<label class="growth-label" for="measure-value">Hasil pengukuran</label>' +
      '<div class="large-number"><input id="measure-value" type="number" inputmode="decimal" min="' + type.min +
      '" max="' + type.max + '" step="0.01" placeholder="0,00" aria-describedby="measure-error"><span>' + type.unit + '</span></div>' +
      '<div class="growth-error inline-error" id="measure-error" aria-live="polite"></div>' +
      '<label class="growth-label" for="measure-date">Tanggal pengukuran</label>' +
      '<input class="growth-input" id="measure-date" type="date" max="' + today + '" value="' + today + '">' +
      '<label class="growth-label" for="measure-note">Catatan (opsional)</label>' +
      '<textarea class="growth-input" id="measure-note" rows="3" maxlength="2000" placeholder="Contoh: kondisi saat pengukuran"></textarea>' +
      '<div class="growth-actions"><button type="button" class="growth-button" data-measure-save>Simpan</button>' +
      '<button type="button" class="growth-button secondary" data-measure-repeat>Ulangi</button></div>';
  }

  function graphHtml() {
    var choices = [
      ['berat', 'Berat badan'], ['tinggi', 'Panjang/Tinggi'], ['lingkar_kepala', 'Lingkar kepala']
    ];
    var points = measurements().filter(function (item) { return item.jenis === growth.chartType; });
    var pills = choices.map(function (choice) {
      return '<button type="button" data-chart-type="' + choice[0] + '" class="' +
        (growth.chartType === choice[0] ? 'active' : '') + '">' + choice[1] + '</button>';
    }).join('');
    if (points.length < 2) {
      return '<div class="growth-chart-pills">' + pills + '</div><div class="growth-empty">' +
        '<span aria-hidden="true">🌱</span><b>Grafik akan tumbuh bersama catatan</b>' +
        '<p>Tambahkan minimal dua pengukuran untuk melihat perkembangan dari bulan ke bulan.</p>' +
        '<button type="button" class="growth-button" data-growth-tab="pengukuran">Tambah pengukuran</button></div>';
    }
    if (typeof Chart === 'undefined') {
      return '<div class="growth-chart-pills">' + pills + '</div>' +
        '<div class="growth-error" role="alert">Grafik belum dapat dimuat. Periksa koneksi internet lalu coba lagi.</div>';
    }
    return '<div class="growth-chart-pills">' + pills + '</div><div class="growth-card chart-card">' +
      '<canvas id="growth-chart" aria-label="Grafik pertumbuhan balita" role="img"></canvas></div>';
  }

  function chartAge(date) {
    return ageAt(date);
  }

  function createChart() {
    var canvas = document.getElementById('growth-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    var type = growth.chartType;
    var points = measurements().filter(function (item) { return item.jenis === type; });
    if (points.length < 2) return;
    var context = canvas.getContext('2d');
    var gradient = context.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(225, 29, 99, .28)');
    gradient.addColorStop(1, 'rgba(225, 29, 99, .015)');
    growth.chart = new Chart(context, {
      type: 'line',
      data: {
        labels: points.map(function (item) { return chartAge(item.tanggal_ukur) + ' bln'; }),
        datasets: [{
          label: labels[type].title + ' (' + labels[type].unit + ')',
          data: points.map(function (item) { return Number(item.nilai); }),
          borderColor: '#E11D63',
          backgroundColor: gradient,
          pointBackgroundColor: '#F43F7A',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          borderWidth: 3,
          fill: true,
          tension: .35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8A6672' } },
          y: { beginAtZero: false, grid: { color: '#FFE4EC' }, ticks: { color: '#8A6672' } }
        }
      }
    });
  }

  function eligible(type) {
    var age = bulan(selectedChild().lahir);
    return type === 'biru' ? age >= 6 && age <= 11 : age >= 12 && age <= 59;
  }

  function vitaminLatest(type) {
    var vitamins = growth.data && growth.data.vitamins || [];
    return vitamins.find(function (item) { return item.jenis_kapsul === type; }) || null;
  }

  function vitaminDraft(type) {
    if (!growth.drafts[type]) {
      var last = vitaminLatest(type);
      growth.drafts[type] = {
        given: last ? String(last.sudah_diberikan) === '1' || last.sudah_diberikan === true : false,
        date: last && last.tanggal_pemberian ? last.tanggal_pemberian : todayString()
      };
    }
    return growth.drafts[type];
  }

  function vitaminCard(type, title, description) {
    var enabled = eligible(type);
    var last = vitaminLatest(type);
    var draft = vitaminDraft(type);
    var isGiven = last && (String(last.sudah_diberikan) === '1' || last.sudah_diberikan === true);
    var status = isGiven ? '<span class="vitamin-badge given">Sudah diberikan</span>' :
      '<span class="vitamin-badge pending">Belum diberikan</span>';
    return '<section class="growth-card vitamin-card ' + (enabled ? '' : 'disabled') + '">' +
      '<div class="vitamin-card-head"><div><span class="growth-eyebrow">Vitamin A</span><h3>' + title +
      '</h3><p>' + description + '</p></div>' + status + '</div>' +
      (!enabled ? '<div class="growth-soft-alert">Belum sesuai usia balita.</div>' :
        '<div class="vitamin-toggle" role="group" aria-label="Status ' + title + '">' +
        '<button type="button" data-vitamin-status="' + type + '" data-given="1" aria-pressed="' + draft.given +
        '" class="' + (draft.given ? 'active' : '') + '">Sudah</button>' +
        '<button type="button" data-vitamin-status="' + type + '" data-given="0" aria-pressed="' + (!draft.given) +
        '" class="' + (!draft.given ? 'active' : '') + '">Belum</button></div>' +
        '<label class="growth-label" for="vitamin-date-' + type + '">Tanggal pemberian</label>' +
        '<input class="growth-input" id="vitamin-date-' + type + '" data-vitamin-date="' + type +
        '" type="date" max="' + todayString() + '" value="' + escapeHtml(draft.date) + '"' +
        (draft.given ? '' : ' disabled') + '>' +
        '<button type="button" class="growth-button" data-vitamin-save="' + type + '">Simpan</button>') +
      '</section>';
  }

  function vitaminsHtml() {
    return '<p class="growth-hint">Pilih status sesuai layanan yang diterima balita.</p>' +
      vitaminCard('biru', 'Kapsul Biru (100.000 SI)', 'Untuk bayi usia 6–11 bulan') +
      vitaminCard('merah', 'Kapsul Merah (200.000 SI)', 'Untuk balita usia 12–59 bulan');
  }

  function visitsHtml() {
    var visits = {};
    measurements().forEach(function (item) {
      if (!visits[item.tanggal_ukur]) visits[item.tanggal_ukur] = { measurements: [], vitamins: [] };
      visits[item.tanggal_ukur].measurements.push(item);
    });
    (growth.data && growth.data.vitamin_history || []).forEach(function (item) {
      var date = item.tanggal_pemberian || item.created_at;
      if (!date) return;
      date = String(date).slice(0, 10);
      if (!visits[date]) visits[date] = { measurements: [], vitamins: [] };
      visits[date].vitamins.push(item);
    });
    var dates = Object.keys(visits).sort().reverse();
    if (!dates.length) {
      return '<div class="growth-empty"><span aria-hidden="true">🌸</span><b>Belum ada catatan kunjungan</b>' +
        '<p>Catatan pengukuran dan Vitamin A yang disimpan akan tampil di sini.</p></div>';
    }
    return '<div class="visit-timeline">' + dates.map(function (date) {
      var visit = visits[date];
      var lines = visit.measurements.map(function (item) {
        return labels[item.jenis].title + ': ' + item.nilai + ' ' + labels[item.jenis].unit;
      });
      visit.vitamins.forEach(function (item) {
        lines.push('Vitamin A kapsul ' + (item.jenis_kapsul === 'biru' ? 'biru' : 'merah') +
          (String(item.sudah_diberikan) === '1' || item.sudah_diberikan === true ? ' sudah diberikan' : ' belum diberikan'));
      });
      return '<article class="visit-entry"><span class="visit-dot"></span><time>' + escapeHtml(displayDate(date)) +
        '</time><p>' + escapeHtml(lines.join(' · ') || 'Kunjungan tercatat') + '</p></article>';
    }).join('') + '</div>';
  }

  function renderGrowth() {
    if (!growth.child || growth.page !== 'detail' && growth.page !== 'measurement') return;
    if (growth.chart) {
      growth.chart.destroy();
      growth.chart = null;
    }
    var view = document.getElementById('view');
    document.getElementById('fab').style.display = 'none';
    if (growth.page === 'measurement') {
      view.innerHTML = headerHtml() + statusHtml() + measurementFormHtml();
      updateCorrectionNote();
      return;
    }
    var content = '';
    if (growth.section === 'profil') content = profileHtml();
    if (growth.section === 'pengukuran') content = measurementsHtml();
    if (growth.section === 'grafik') content = graphHtml();
    if (growth.section === 'vitamin') content = vitaminsHtml();
    if (growth.section === 'catatan') content = visitsHtml();
    view.innerHTML = headerHtml() + tabsHtml() + statusHtml() + '<div class="growth-content">' + content + '</div>';
    if (growth.section === 'grafik') createChart();
  }

  function updateCorrectionNote() {
    if (growth.kind !== 'tinggi') return;
    var note = document.getElementById('correction-note');
    var date = document.getElementById('measure-date');
    if (!note || !date) return;
    var correction = correctionFor(growth.method, date.value);
    note.textContent = correction > 0 ?
      'Hasil ukur berdiri dikoreksi otomatis +0,7 cm karena umur saat pengukuran 0–24 bulan.' :
      correction < 0 ?
        'Hasil ukur berbaring dikoreksi otomatis −0,7 cm karena umur saat pengukuran di atas 24 bulan.' :
        'Tidak ada koreksi otomatis untuk cara ukur dan umur ini.';
  }

  function showHeightChoice() {
    var sheet = document.getElementById('sheet');
    sheet.innerHTML = '<h2>Pilih cara ukur tinggi badan</h2><p class="growth-hint">Tentukan posisi balita sebelum memasukkan hasil.</p>' +
      '<div class="height-choice"><button type="button" data-height-method="berbaring"><span>🛏️</span><b>Berbaring</b></button>' +
      '<button type="button" data-height-method="berdiri"><span>🧍</span><b>Berdiri</b></button></div>' +
      '<button type="button" class="btn ghost" data-modal-close>Batal</button>';
    document.getElementById('modal').classList.add('show');
  }

  function showMeasureConfirmation(payload) {
    var sheet = document.getElementById('sheet');
    var type = labels[payload.jenis];
    var corrected = payload.jenis === 'tinggi' ?
      Number(payload.nilai) + correctionFor(payload.cara_ukur, payload.tanggal_ukur) : Number(payload.nilai);
    growth.pending = payload;
    sheet.innerHTML = '<div class="confirm-mark" aria-hidden="true">✓</div><h2>Simpan data pengukuran?</h2>' +
      '<p class="growth-hint">' + type.title + ': <b>' + corrected.toFixed(2).replace(/\.?0+$/, '') + ' ' +
      type.unit + '</b> pada ' + escapeHtml(displayDate(payload.tanggal_ukur)) + '.</p>' +
      '<button type="button" class="btn" data-confirm-measure>Ya, simpan</button>' +
      '<button type="button" class="btn ghost" data-modal-close>Batal</button>';
    document.getElementById('modal').classList.add('show');
  }

  function saveMeasurement() {
    if (!growth.pending) return;
    var payload = growth.pending;
    growth.pending = null;
    closeM();
    growth.loading = true;
    growth.error = '';
    renderGrowth();
    request('measurement', payload).then(function (data) {
      updateData(data);
      growth.loading = false;
      growth.page = 'detail';
      growth.section = 'pengukuran';
      growth.notice = 'Data pengukuran berhasil disimpan.';
      renderGrowth();
    }).catch(function (error) {
      growth.loading = false;
      growth.error = error.message;
      renderGrowth();
    });
  }

  function saveVitamin(type) {
    var draft = vitaminDraft(type);
    if (draft.given && !draft.date) {
      growth.error = 'Tanggal pemberian wajib diisi.';
      renderGrowth();
      return;
    }
    growth.loading = true;
    growth.error = '';
    renderGrowth();
    request('vitamin', {
      jenis_kapsul: type,
      sudah_diberikan: draft.given,
      tanggal_pemberian: draft.given ? draft.date : null
    }).then(function (data) {
      updateData(data);
      delete growth.drafts[type];
      growth.loading = false;
      growth.notice = 'Catatan Vitamin A berhasil disimpan.';
      renderGrowth();
    }).catch(function (error) {
      growth.loading = false;
      growth.error = error.message;
      renderGrowth();
    });
  }

  function readMeasurementForm() {
    var type = labels[growth.kind];
    var value = document.getElementById('measure-value').value.trim().replace(',', '.');
    var date = document.getElementById('measure-date').value;
    var note = document.getElementById('measure-note').value.trim();
    var error = document.getElementById('measure-error');
    var number = Number(value);
    if (!value || !Number.isFinite(number) || number <= 0) {
      error.textContent = 'Masukkan angka pengukuran yang positif.';
      return;
    }
    if (number < type.min || number > type.max) {
      error.textContent = 'Nilai ' + type.title.toLowerCase() + ' harus antara ' + type.min + '–' + type.max + ' ' + type.unit + '.';
      return;
    }
    if (!date || date > todayString()) {
      error.textContent = 'Tanggal pengukuran wajib diisi dan tidak boleh melewati hari ini.';
      return;
    }
    if (growth.kind === 'tinggi') {
      var corrected = number + correctionFor(growth.method, date);
      if (corrected < type.min || corrected > type.max) {
        error.textContent = 'Nilai setelah koreksi berada di luar batas wajar ' + type.min + '–' + type.max + ' cm.';
        return;
      }
    }
    error.textContent = '';
    showMeasureConfirmation({
      jenis: growth.kind,
      nilai: number,
      cara_ukur: growth.kind === 'tinggi' ? growth.method : null,
      tanggal_ukur: date,
      catatan: note
    });
  }

  document.addEventListener('click', function (event) {
    var navButton = event.target.closest('[data-t]');
    if (!navButton) return;
    if (growth.chart) growth.chart.destroy();
    growth.chart = null;
    growth.page = '';
    growth.child = null;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }, true);

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[data-detail-balita]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.pushState({ growthDetail: true }, '', link.href);
    openChild(link.getAttribute('data-detail-balita'));
  });

  document.addEventListener('click', function (event) {
    var target = event.target.closest('button');
    if (!target) return;

    if (target.hasAttribute('data-growth-back')) {
      if (history.state && history.state.growthDetail) {
        history.back();
      } else {
        history.replaceState(null, '', location.pathname + location.search);
        showListFromRoute();
      }
      return;
    }
    if (target.hasAttribute('data-growth-tab')) {
      growth.section = target.getAttribute('data-growth-tab');
      growth.page = 'detail';
      growth.error = '';
      renderGrowth();
      return;
    }
    if (target.hasAttribute('data-measure')) {
      growth.kind = target.getAttribute('data-measure');
      growth.error = '';
      if (growth.kind === 'tinggi') showHeightChoice();
      else {
        growth.method = '';
        setPage('measurement');
      }
      return;
    }
    if (target.hasAttribute('data-height-method')) {
      growth.method = target.getAttribute('data-height-method');
      closeM();
      setPage('measurement');
      return;
    }
    if (target.hasAttribute('data-change-mode')) {
      showHeightChoice();
      return;
    }
    if (target.hasAttribute('data-measure-back')) {
      growth.page = 'detail';
      growth.section = 'pengukuran';
      growth.error = '';
      renderGrowth();
      return;
    }
    if (target.hasAttribute('data-measure-save')) {
      readMeasurementForm();
      return;
    }
    if (target.hasAttribute('data-measure-repeat')) {
      document.getElementById('measure-value').value = '';
      document.getElementById('measure-date').value = todayString();
      document.getElementById('measure-note').value = '';
      document.getElementById('measure-error').textContent = '';
      updateCorrectionNote();
      return;
    }
    if (target.hasAttribute('data-confirm-measure')) {
      saveMeasurement();
      return;
    }
    if (target.hasAttribute('data-modal-close')) {
      closeM();
      return;
    }
    if (target.hasAttribute('data-chart-type')) {
      growth.chartType = target.getAttribute('data-chart-type');
      renderGrowth();
      return;
    }
    if (target.hasAttribute('data-vitamin-status')) {
      var vitaminType = target.getAttribute('data-vitamin-status');
      growth.drafts[vitaminType] = growth.drafts[vitaminType] || vitaminDraft(vitaminType);
      growth.drafts[vitaminType].given = target.getAttribute('data-given') === '1';
      renderGrowth();
      return;
    }
    if (target.hasAttribute('data-vitamin-save')) {
      saveVitamin(target.getAttribute('data-vitamin-save'));
      return;
    }
    if (target.hasAttribute('data-growth-retry')) {
      loadData();
    }
  });

  document.addEventListener('input', function (event) {
    var date = event.target;
    if (date.id === 'measure-date') updateCorrectionNote();
    if (date.hasAttribute('data-vitamin-date')) {
      var type = date.getAttribute('data-vitamin-date');
      vitaminDraft(type).date = date.value;
    }
  });

  document.addEventListener('change', function (event) {
    if (event.target.id === 'measure-date') updateCorrectionNote();
  });

  window.addEventListener('popstate', syncDetailRoute);
  window.addEventListener('hashchange', syncDetailRoute);

  var originalRender = render;
  render = function () {
    originalRender();
    if (growth.page === 'detail' || growth.page === 'measurement') renderGrowth();
  };

  syncDetailRoute();
})();
