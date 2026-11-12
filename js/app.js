var KEY = 'posyandu-mawar-v1';
var db;
var tab = 'home';
var sub = 'balita';
var rsub = 'balita';
var screen = 'main';
var formReturn = 'main';
var returnToGrowthDetail = false;
var elderFormReturn = 'main';
var selectedElderFormId = null;
var selectedChildId = null;
var selectedElderId = null;
var elderSection = 'profil';
var elderMeasurementPage = false;
var elderMeasurementKind = '';
var elderMeasurementDate = iso(new Date());
var elderSwipeStart = null;
var elderNotice = '';
var today = new Date();
var exportDate = iso(today);
var apiError = '';
var lansiaApiError = '';
var storageError = '';
var balitaSearch = '';
var lansiaSearch = '';
var elderMeasurements = { personId: null, records: [], loading: false, error: '' };
var elderVisitNotes = { personId: null, records: [], loading: false, loaded: false, error: '' };
var elderVisitDate = iso(new Date());
var elderMeasurementTypes = {
  berat: { title: 'Berat Badan', unit: 'kg', image: 'assets/images/scale.svg', min: 1, max: 300, step: '0.01' },
  tinggi: { title: 'Tinggi Badan', unit: 'cm', image: 'assets/images/stadiometer.svg', min: 50, max: 250, step: '0.1' },
  lingkar_perut: { title: 'Lingkar Perut', unit: 'cm', image: 'assets/images/waist-circumference.svg', min: 20, max: 250, step: '0.1' },
  tekanan_darah: { title: 'Tekanan Darah', unit: 'mmHg', image: 'assets/images/blood-pressure.svg' }
};
var monthlyAttendance = { balita: null, lansia: null, monthLabel: '', loading: false, error: '' };

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"]/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char];
  });
}

function iso(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function ago(months, years) {
  var date = new Date(today.getFullYear() - (years || 0), today.getMonth() - (months || 0), Math.min(today.getDate(), 28));
  return iso(date);
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch (error) {
    storageError = 'Data lokal tidak dapat dibaca dari browser.';
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    storageError = '';
  } catch (error) {
    storageError = 'Penyimpanan lokal browser tidak tersedia.';
  }
}

function seed() {
  return {
    id: 20,
    balita: [
      { id: 1, nama: 'Aisyah Putri', lahir: ago(6), ortu: 'Ibu Rina' },
      { id: 2, nama: 'Raka Pratama', lahir: ago(24), ortu: 'Ibu Sari' },
      { id: 3, nama: 'Nayla Azzahra', lahir: ago(41), ortu: 'Ibu Dewi' },
      { id: 4, nama: 'Fajar Ramadhan', lahir: ago(58), ortu: 'Ibu Lilis' },
      { id: 5, nama: 'Salsa Maharani', lahir: ago(63), ortu: 'Ibu Tuti' }
    ],
    lansia: [
      { id: 11, nama: 'Bu Siti Aminah', lahir: ago(0, 66), alamat: 'RT 01', wafat: false },
      { id: 12, nama: 'Pak Slamet', lahir: ago(0, 72), alamat: 'RT 02', wafat: false },
      { id: 13, nama: 'Bu Marni', lahir: ago(0, 59), alamat: 'RT 03', wafat: false },
      { id: 14, nama: 'Pak Darto', lahir: ago(0, 81), alamat: 'RT 02', wafat: true, tglWafat: ago(2) }
    ]
  };
}

function bulan(birthDate) {
  var birth = new Date(birthDate);
  var months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  return Math.max(months, 0);
}

function tahun(birthDate) {
  var birth = new Date(birthDate);
  var years = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() == birth.getMonth() && today.getDate() < birth.getDate())) years--;
  return years;
}

function lulus(child) { return Boolean(child.lulusManual) || bulan(child.lahir) > 59; }
function sisa(child) { return 60 - bulan(child.lahir); }
function umurTxt(months) { return months >= 12 ? Math.floor(months / 12) + ' th ' + (months % 12) + ' bln' : months + ' bln'; }
function alphabetize(records) {
  return records.slice().sort(function (first, second) {
    return String(first.nama).localeCompare(String(second.nama), 'id', { sensitivity: 'base' }) ||
      Number(first.id) - Number(second.id);
  });
}
function aktifB() { return alphabetize(db.balita.filter(function (child) { return !lulus(child); })); }
function lulusB() { return alphabetize(db.balita.filter(lulus)); }
function aktifL() { return alphabetize(db.lansia.filter(function (person) { return !person.wafat && !person.selesai; })); }
function riwayatL() { return alphabetize(db.lansia.filter(function (person) { return person.wafat || person.selesai; })); }
function notif() { return aktifB().filter(function (child) { return sisa(child) <= 3; }); }

function displayDate(value) {
  if (!value) return 'Belum ada';
  var date = new Date(value + 'T00:00:00');
  return isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function genderSymbol(gender) {
  if (gender === 'Laki-laki') return '<span class="gender-symbol male" aria-label="Laki-laki" title="Laki-laki">♂</span>';
  if (gender === 'Perempuan') return '<span class="gender-symbol female" aria-label="Perempuan" title="Perempuan">♀</span>';
  return '';
}

async function requestBalita(payload) {
  var options = { method: payload ? 'POST' : 'GET', credentials: 'same-origin', headers: {} };
  if (payload) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['X-CSRF-Token'] = document.querySelector('meta[name="csrf-token"]').content;
    options.body = JSON.stringify(payload);
  }
  var response = await fetch('api-balita.php', options);
  var result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error('Respons server tidak dapat dibaca.');
  }
  if (!response.ok) throw new Error(result.error || 'Permintaan data balita gagal.');
  return result.data;
}

async function requestLansia(payload, method) {
  var options = { method: method || (payload ? 'POST' : 'GET'), credentials: 'same-origin', headers: {} };
  if (payload) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['X-CSRF-Token'] = document.querySelector('meta[name="csrf-token"]').content;
    options.body = JSON.stringify(payload);
  }
  var response = await fetch('api-lansia.php', options);
  var result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error('Respons server tidak dapat dibaca.');
  }
  if (!response.ok) throw new Error(result.error || 'Permintaan data lansia gagal.');
  return result.data;
}

async function syncMonthlyAttendance() {
  monthlyAttendance.loading = true;
  monthlyAttendance.error = '';
  render();
  try {
    var response = await fetch('api-statistik.php', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    });
    var result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error('Respons statistik tidak dapat dibaca.');
    }
    if (!response.ok) throw new Error(result.error || 'Statistik kunjungan gagal dimuat.');
    if (!result.data || !Number.isInteger(result.data.balita) ||
      !Number.isInteger(result.data.lansia) || typeof result.data.monthLabel !== 'string') {
      throw new Error('Data statistik kunjungan tidak valid.');
    }
    monthlyAttendance = {
      balita: result.data.balita,
      lansia: result.data.lansia,
      monthLabel: result.data.monthLabel,
      loading: false,
      error: ''
    };
  } catch (error) {
    monthlyAttendance.loading = false;
    monthlyAttendance.error = error.message;
  }
  render();
}

async function requestElderMeasurements(personId, payload) {
  var options = { method: payload ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: {} };
  if (payload) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['X-CSRF-Token'] = document.querySelector('meta[name="csrf-token"]').content;
    options.body = JSON.stringify(payload);
  }
  var url = 'api-lansia.php' + (payload ? '' : '?measurements=' + encodeURIComponent(personId));
  var response = await fetch(url, options);
  var result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error('Respons server tidak dapat dibaca.');
  }
  if (!response.ok) throw new Error(result.error || 'Permintaan pengukuran lansia gagal.');
  return result.data;
}

async function requestElderVisitNotes(personId, payload) {
  var options = { method: payload ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: {} };
  if (payload) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['X-CSRF-Token'] = document.querySelector('meta[name="csrf-token"]').content;
    options.body = JSON.stringify(payload);
  }
  var url = 'api-lansia.php' + (payload ? '' : '?visit_notes=' + encodeURIComponent(personId));
  var response = await fetch(url, options);
  var result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error('Respons server tidak dapat dibaca.');
  }
  if (!response.ok) throw new Error(result.error || 'Permintaan catatan kunjungan gagal.');
  return result.data;
}

async function syncBalita() {
  apiError = '';
  render();
  try {
    var records = await requestBalita();
    if (!records.length && db.balita.length) {
      records = [];
      for (var i = 0; i < db.balita.length; i++) {
        var legacyRecord = Object.assign({}, db.balita[i]);
        delete legacyRecord.id;
        records.push(await requestBalita(legacyRecord));
      }
    }
    db.balita = records;
    save();
  } catch (error) {
    apiError = error.message;
  }
  render();
}

async function syncLansia() {
  lansiaApiError = '';
  render();
  try {
    var records = await requestLansia();
    if (!records.length && db.lansia.length) {
      records = [];
      for (var i = 0; i < db.lansia.length; i++) {
        var legacyRecord = db.lansia[i];
        var payload = {
          nama: legacyRecord.nama,
          lahir: legacyRecord.lahir,
          alamat: legacyRecord.alamat,
          gender: legacyRecord.gender || null,
          nomorKK: legacyRecord.nomorKK || '',
          nik: legacyRecord.nik || '',
          nomorHp: legacyRecord.nomorHp || '',
          namaPendamping: legacyRecord.namaPendamping || '',
          nomorHpPendamping: legacyRecord.nomorHpPendamping || ''
        };
        var saved = await requestLansia(payload);
        if (legacyRecord.wafat) {
          saved = await requestLansia({
            action: 'status',
            id: saved.id,
            status: 'meninggal',
            tanggalWafat: legacyRecord.tglWafat || iso(today)
          });
        }
        records.push(saved);
      }
    }
    db.lansia = records;
    save();
  } catch (error) {
    lansiaApiError = error.message;
  }
  render();
}

function errorNotice() {
  var message = [apiError, lansiaApiError, storageError].filter(Boolean).join(' ');
  if (!message) return '';
  return '<div class="alert error-notice" role="alert">' + esc(message) +
    (apiError || lansiaApiError ? ' <button class="link" data-retry> Coba lagi</button>' : '') + '</div>';
}

function render() {
  today = new Date();
  var view = document.getElementById('view');
  var app = document.getElementById('app');
  var fab = document.getElementById('fab');
  var nav = document.getElementById('nav');
  app.classList.toggle('child-form-screen', screen === 'childForm' || screen === 'elderForm');
  app.classList.toggle('child-detail-screen', screen === 'elderDetail');
  fab.style.display = screen === 'main' && (tab === 'balita' || tab === 'lansia') ? 'grid' : 'none';
  fab.textContent = tab === 'balita' ? '+ Tambah Anak' : '+ Tambah Lansia';
  fab.setAttribute('aria-label', tab === 'balita' ? 'Tambah Anak' : 'Tambah Lansia');
  nav.style.display = screen === 'childForm' || screen === 'elderForm' ? 'none' : 'flex';

  if (screen === 'childForm') {
    renderChildForm(view);
    return;
  }
  if (screen === 'elderForm') {
    renderElderForm(view);
    return;
  }
  if (screen === 'elderDetail') {
    renderElderDetail(view);
    return;
  }

  var html = errorNotice();
  if (tab === 'home') {
    var notifications = notif();
    var attendanceMonth = monthlyAttendance.monthLabel || 'bulan ini';
    var balitaAttendance = monthlyAttendance.loading ? '…' :
      monthlyAttendance.error ? '—' : monthlyAttendance.balita;
    var lansiaAttendance = monthlyAttendance.loading ? '…' :
      monthlyAttendance.error ? '—' : monthlyAttendance.lansia;
    html += '<div class="grid"><div class="stat"><b>' + aktifB().length + '</b><span>Balita aktif (0-59 bln)</span></div>' +
      '<div class="stat"><b>' + aktifL().length + '</b><span>Lansia aktif (59+ th)</span></div>' +
      '<div class="stat"><b>' + balitaAttendance + '</b><span>Balita datang (' + esc(attendanceMonth) + ')</span></div>' +
      '<div class="stat"><b>' + lansiaAttendance + '</b><span>Lansia datang (' + esc(attendanceMonth) + ')</span></div></div>';
    if (monthlyAttendance.error) {
      html += '<div class="alert error-notice" role="alert">' + esc(monthlyAttendance.error) +
        ' <button class="link" data-retry-monthly>Coba lagi</button></div>';
    }
    html += '<h2>🔔 Notifikasi</h2>';
    html += notifications.length ? notifications.map(function (child) {
      return '<div class="alert"><b>' + esc(child.nama) + '</b> berumur ' + umurTxt(bulan(child.lahir)) + '. Akan keluar dari sistem balita dalam ' + sisa(child) + ' bulan.</div>';
    }).join('') : '<div class="empty">Belum ada balita yang mendekati usia keluar.</div>';
    html += '<section class="growth-card export-card"><h2>Ekspor Data Pertemuan</h2>' +
      '<p class="growth-hint">Pilih tanggal pertemuan. Hanya peserta yang memiliki pengukuran pada tanggal tersebut akan masuk ke file.</p>' +
      '<label class="growth-label" for="export-date">Tanggal pertemuan</label>' +
      '<input class="growth-input" id="export-date" type="date" max="' + iso(today) + '" value="' + esc(exportDate) + '">' +
      '<div class="growth-actions"><button type="button" class="growth-button" data-export="balita">Excel Balita</button>' +
      '<button type="button" class="growth-button secondary" data-export="lansia">Excel Lansia</button></div>' +
      '<p class="export-status" id="export-status" role="status" aria-live="polite"></p></section>';
    html += '<h2>Tentang</h2><div class="stat" style="font-size:13px;color:var(--muted)">Balita dicatat sampai 59 bulan, lalu otomatis lulus dan datanya tetap tersimpan. Lansia dimulai dari umur 59 tahun dan dapat dipindahkan ke riwayat menggunakan tombol Lulus.</div>';
  }

  if (tab === 'balita') {
    var children = aktifB();
    html += '<h2 style="margin-top:0">Daftar data Balita</h2>';
    html += '<div class="directory-tools"><label class="directory-search"><span aria-hidden="true">⌕</span><input type="search" data-search-type="balita" value="' + esc(balitaSearch) + '" placeholder="Ketik untuk mencari nama ..." aria-label="Cari nama balita"></label><div class="directory-total"><span aria-hidden="true">▣</span> Total data Balita: <b>' + children.length + ' anak</b></div></div>';
    html += children.length ? children.map(function (child) {
      var remaining = sisa(child);
      return '<div class="item balita-item" data-searchable data-search-name="' + esc(child.nama.toLocaleLowerCase()) + '">' +
        '<a class="balita-card-link" href="#balita-' + child.id + '" data-detail-balita="' + child.id + '" aria-label="Buka pemantauan ' + esc(child.nama) + '">' +
        '<div class="av">👶</div><div class="info"><b class="child-name">' + esc(child.nama) + genderSymbol(child.gender) + '</b><small>' + umurTxt(bulan(child.lahir)) + ' · ' + childParentSummary(child) + '</small></div>' +
        (remaining <= 3 ? '<span class="badge warn">Keluar ' + remaining + ' bln</span>' : '<span class="badge">Aktif</span>') +
        '</a></div>';
    }).join('') : '<div class="empty" data-directory-empty>Belum ada data balita.</div>';
    html += '<div class="empty" data-search-empty hidden>Nama balita tidak ditemukan.</div>';
  }

  if (tab === 'lansia') {
    var elders = aktifL();
    html += '<h2 style="margin-top:0">Daftar data Lansia</h2>';
    html += '<div class="directory-tools"><label class="directory-search"><span aria-hidden="true">⌕</span><input type="search" data-search-type="lansia" value="' + esc(lansiaSearch) + '" placeholder="Ketik untuk mencari nama ..." aria-label="Cari nama lansia"></label><div class="directory-total"><span aria-hidden="true">▣</span> Total data Lansia: <b>' + elders.length + ' orang</b></div></div>';
    html += elders.length ? elders.map(function (person) {
      return '<div class="item balita-item child-item elder-list-item" role="button" tabindex="0" data-elder-id="' + person.id + '" data-searchable data-search-name="' + esc(person.nama.toLocaleLowerCase()) + '" aria-label="Lihat biodata ' + esc(person.nama) + '"><div class="av">👵</div><div class="info"><b class="child-name">' + esc(person.nama) + genderSymbol(person.gender) + '</b><small>' + tahun(person.lahir) + ' tahun · ' + esc(person.alamat || '-') + '</small></div><span class="badge">Aktif</span></div>';
    }).join('') : '<div class="empty" data-directory-empty>Belum ada data lansia.</div>';
    html += '<div class="empty" data-search-empty hidden>Nama lansia tidak ditemukan.</div>';
  }

  if (tab === 'riwayat') {
    html += '<div class="seg"><button data-r="balita" class="' + (rsub === 'balita' ? 'on' : '') + '">Balita Lulus</button><button data-r="lansia" class="' + (rsub === 'lansia' ? 'on' : '') + '">Riwayat Lansia</button></div>';
    if (rsub === 'balita') {
      html += lulusB().length ? lulusB().map(function (child) {
        return '<div class="item child-item" role="button" tabindex="0" data-child-id="' + child.id + '" aria-label="Lihat biodata ' + esc(child.nama) + '"><div class="av">🎓</div><div class="info"><b class="child-name">' + esc(child.nama) + genderSymbol(child.gender) + '</b><small>Lahir ' + esc(child.lahir) + ' · ' + childParentSummary(child) + '</small></div><span class="badge gray">Lulus</span></div>';
      }).join('') : '<div class="empty">Belum ada balita yang lulus.</div>';
    } else {
      html += riwayatL().length ? riwayatL().map(function (person) {
        return '<div class="item"><div class="av">' + (person.wafat ? '🕊️' : '✅') + '</div><div class="info"><b>' + esc(person.nama) + genderSymbol(person.gender) + '</b><small>' + (person.wafat ? 'Wafat ' + esc(person.tglWafat || '-') : 'Selesai') + ' · ' + esc(person.alamat || '-') + '</small></div><button class="link" data-u="' + person.id + '">Batalkan</button></div>';
      }).join('') : '<div class="empty">Belum ada riwayat.</div>';
    }
  }

  view.innerHTML = html;
  var tabs = [['home', '🏠', 'Beranda'], ['balita', '👶', 'Balita'], ['lansia', '👵', 'Lansia'], ['riwayat', '🗂️', 'Riwayat']];
  nav.innerHTML = tabs.map(function (item) {
    return '<button data-t="' + item[0] + '" class="' + (tab === item[0] ? 'on' : '') + '"><span>' + item[1] + '</span>' + item[2] + '</button>';
  }).join('');
  if (tab === 'balita') updateDirectorySearch('balita', balitaSearch);
  if (tab === 'lansia') updateDirectorySearch('lansia', lansiaSearch);
}

function renderChildForm(view) {
  var child = selectedChildId ? db.balita.find(function (item) { return item.id === selectedChildId; }) : null;
  var value = function (key) { return esc(child ? child[key] : ''); };
  view.innerHTML = '<section class="child-page">' +
    '<button class="back-link" data-back type="button">← Kembali</button>' +
    '<div class="child-content"><p class="form-intro">Silakan mengisi data-data di bawah ini untuk kelengkapan informasi</p>' +
    '<h2>Biodata Anak</h2>' +
    '<label for="child-name">Nama Anak</label><input id="child-name" maxlength="100" required value="' + value('nama') + '" placeholder="Nama lengkap anak">' +
    '<label for="child-gender">Jenis Kelamin</label><select id="child-gender" required><option value="">Pilih jenis kelamin</option><option value="Laki-laki" ' + (child && child.gender === 'Laki-laki' ? 'selected' : '') + '>Laki-laki</option><option value="Perempuan" ' + (child && child.gender === 'Perempuan' ? 'selected' : '') + '>Perempuan</option></select>' +
    '<label for="child-birth">Tanggal Lahir</label><input id="child-birth" type="date" max="' + iso(today) + '" required value="' + value('lahir') + '">' +
    '<label for="child-address">Alamat</label><input id="child-address" value="' + value('alamat') + '" placeholder="Alamat lengkap">' +
    '<label for="child-order">Anak Ke-</label><input id="child-order" type="number" min="1" max="99" value="' + value('anakKe') + '" placeholder="Urutan anak">' +
    '<label for="child-mother">Nama Ibu</label><input id="child-mother" maxlength="100" value="' + value('namaIbu') + '" placeholder="Nama ibu anak">' +
    '<label for="child-father">Nama Ayah</label><input id="child-father" maxlength="100" value="' + value('namaAyah') + '" placeholder="Nama ayah anak">' +
    '<label for="child-kk">Nomor KK</label><input id="child-kk" type="text" inputmode="numeric" maxlength="16" value="' + value('nomorKK') + '" placeholder="16 digit nomor KK">' +
    '<label for="child-nik">NIK Anak</label><input id="child-nik" type="text" inputmode="numeric" maxlength="16" value="' + value('nik') + '" placeholder="16 digit NIK">' +
    '<label for="child-imd">Inisiasi Menyusu Dini (IMD)</label><select id="child-imd"><option value="">Pilih status IMD</option><option value="Ya" ' + (child && child.imd === 'Ya' ? 'selected' : '') + '>Ya</option><option value="Tidak" ' + (child && child.imd === 'Tidak' ? 'selected' : '') + '>Tidak</option></select>' +
    '<h2 class="measure-heading">Data Timbang</h2>' +
    '<label for="child-weight">Berat Badan Lahir (KG)</label><input id="child-weight" type="number" min="0" max="999.99" step="0.01" value="' + value('beratLahir') + '" placeholder="Berat badan lahir (kg)">' +
    '<label for="child-length">Panjang Badan Lahir (CM)</label><input id="child-length" type="number" min="0" max="999.99" step="0.01" value="' + value('panjangLahir') + '" placeholder="Panjang badan lahir (cm)">' +
    '<label for="child-head">Lingkar Kepala Lahir (CM)</label><input id="child-head" type="number" min="0" max="999.99" step="0.01" value="' + value('lingkarKepala') + '" placeholder="Lingkar kepala lahir (cm)">' +
    '<label for="child-arm">Lingkar Lengan Lahir (CM)</label><input id="child-arm" type="number" min="0" max="999.99" step="0.01" value="' + value('lingkarLenganLahir') + '" placeholder="Lingkar lengan lahir (cm)">' +
    '<p class="form-error" id="child-error" role="alert"></p><button class="btn child-submit" id="child-save" type="button">' + (child ? 'Simpan Perubahan' : 'Lanjut') + '</button></div></section>';
}

function renderElderForm(view) {
  var person = selectedElderFormId ? db.lansia.find(function (item) { return item.id === selectedElderFormId; }) : null;
  var value = function (key) { return esc(person ? person[key] : ''); };
  view.innerHTML = '<section class="child-page">' +
    '<button class="back-link" data-back type="button">← Kembali</button>' +
    '<div class="child-content"><p class="form-intro">Silakan mengisi data-data di bawah ini untuk kelengkapan informasi</p>' +
    '<h2>Biodata Lansia</h2>' +
    '<label for="elder-name">Nama Lengkap</label><input id="elder-name" maxlength="100" required value="' + value('nama') + '" placeholder="Nama lengkap lansia">' +
    '<label for="elder-gender">Jenis Kelamin</label><select id="elder-gender"><option value="">Pilih jenis kelamin</option><option value="Laki-laki" ' + (person && person.gender === 'Laki-laki' ? 'selected' : '') + '>Laki-laki</option><option value="Perempuan" ' + (person && person.gender === 'Perempuan' ? 'selected' : '') + '>Perempuan</option></select>' +
    '<label for="elder-birth">Tanggal Lahir</label><input id="elder-birth" type="date" max="' + iso(today) + '" required value="' + value('lahir') + '">' +
    '<label for="elder-kk">Nomor KK</label><input id="elder-kk" type="text" inputmode="numeric" maxlength="16" value="' + value('nomorKK') + '" placeholder="16 digit nomor KK">' +
    '<label for="elder-nik">NIK</label><input id="elder-nik" type="text" inputmode="numeric" maxlength="16" value="' + value('nik') + '" placeholder="16 digit NIK">' +
    '<label for="elder-address">Alamat</label><input id="elder-address" maxlength="150" value="' + value('alamat') + '" placeholder="Alamat lengkap">' +
    '<label for="elder-phone">Nomor HP</label><input id="elder-phone" type="tel" maxlength="20" value="' + value('nomorHp') + '" placeholder="Nomor HP lansia">' +
    '<label for="elder-guardian">Nama Pendamping</label><input id="elder-guardian" maxlength="100" value="' + value('namaPendamping') + '" placeholder="Nama pendamping">' +
    '<label for="elder-guardian-phone">Nomor HP Pendamping</label><input id="elder-guardian-phone" type="tel" maxlength="20" value="' + value('nomorHpPendamping') + '" placeholder="Nomor HP pendamping">' +
    '<p class="form-error" id="elder-error" role="alert"></p><div class="growth-actions">' +
    '<button class="growth-button secondary" type="button" data-back>Batal</button>' +
    '<button class="growth-button" id="elder-save" type="button">Simpan</button></div></div></section>';
}

function displayValue(value, unit) {
  return value === null || value === undefined || value === '' ? 'Belum diisi' : esc(value) + (unit || '');
}

function childParentSummary(child) {
  if (child.namaIbu || child.namaAyah) {
    return 'Ibu: ' + esc(child.namaIbu || '-') + ' · Ayah: ' + esc(child.namaAyah || '-');
  }
  return 'Ortu: ' + esc(child.ortu || '-');
}

function renderElderDetail(view) {
  var person = db.lansia.find(function (item) { return item.id === selectedElderId; });
  if (!person) {
    screen = 'main';
    render();
    return;
  }
  if (elderMeasurementPage) {
    renderElderMeasurementPage(view, person);
    return;
  }
  var records = elderMeasurements.personId === person.id ? elderMeasurements.records : [];
  var sectionHtml = elderSection === 'profil' ? elderProfileHtml(person) :
    elderSection === 'pengukuran' ? elderMeasurementsHtml(person, records) : elderVisitNotesHtml(person);
  var noticeHtml = elderNotice ? '<div class="growth-success" role="status">' + esc(elderNotice) + '</div>' : '';
  elderNotice = '';
  view.innerHTML = '<section class="child-page detail-page"><button class="back-link" data-back type="button">← Kembali</button>' +
    '<div class="child-content"><div class="detail-identity"><span class="av">👵</span><div><small>Pemantauan lansia</small><h1>' +
    esc(person.nama) + genderSymbol(person.gender) + '</h1><small>' + tahun(person.lahir) + ' tahun · Lahir ' +
    esc(displayDate(person.lahir)) + '</small></div></div>' + errorNotice() + noticeHtml +
    '<div class="growth-tabs" role="tablist" aria-label="Detail lansia">' +
    '<button type="button" role="tab" data-elder-tab="profil" aria-selected="' + (elderSection === 'profil') +
    '" class="' + (elderSection === 'profil' ? 'active' : '') + '">Profil</button>' +
    '<button type="button" role="tab" data-elder-tab="pengukuran" aria-selected="' + (elderSection === 'pengukuran') +
    '" class="' + (elderSection === 'pengukuran' ? 'active' : '') + '">Pengukuran</button>' +
    '<button type="button" role="tab" data-elder-tab="catatan" aria-selected="' + (elderSection === 'catatan') +
    '" class="' + (elderSection === 'catatan' ? 'active' : '') + '">Catatan Kunjungan</button></div>' +
    '<div class="growth-content elder-swipe-area">' + sectionHtml + '</div></div></section>';
}

function elderProfileHtml(person) {
  return '<section class="bio-section"><div class="bio-heading"><h2>Biodata Lansia</h2>' +
    '<button class="text-action" type="button" data-edit="lansia" data-id="' + esc(person.id) + '">Ubah</button></div>' +
    '<dl class="bio-list">' +
    '<div><dt>Nama Lengkap</dt><dd>' + esc(person.nama) + '</dd></div>' +
    '<div><dt>Jenis Kelamin</dt><dd>' + displayValue(person.gender) + '</dd></div>' +
    '<div><dt>Nomor KK</dt><dd>' + displayValue(person.nomorKK) + '</dd></div>' +
    '<div><dt>NIK</dt><dd>' + displayValue(person.nik) + '</dd></div>' +
    '<div><dt>Tanggal Lahir</dt><dd>' + esc(displayDate(person.lahir)) + '</dd></div>' +
    '<div><dt>Umur</dt><dd>' + tahun(person.lahir) + ' tahun</dd></div>' +
    '<div><dt>Alamat</dt><dd>' + displayValue(person.alamat) + '</dd></div>' +
    '<div><dt>Nomor HP</dt><dd>' + displayValue(person.nomorHp) + '</dd></div>' +
    '<div><dt>Nama Pendamping</dt><dd>' + displayValue(person.namaPendamping) + '</dd></div>' +
    '<div><dt>Nomor HP Pendamping</dt><dd>' + displayValue(person.nomorHpPendamping) + '</dd></div>' +
    '</dl></section><div class="growth-profile-actions"><button type="button" class="growth-button secondary" data-elder-graduate="' +
    esc(person.id) + '">Lulus</button></div>';
}

function elderMeasurementsHtml(person, records) {
  var measureCards = Object.keys(elderMeasurementTypes).map(function (kind) {
    var type = elderMeasurementTypes[kind];
    var latest = records.find(function (item) { return item.jenis === kind; });
    var value = 'Catat sekarang';
    if (latest) {
      value = kind === 'tekanan_darah' ?
        latest.sistolik + '/' + latest.diastolik + ' mmHg · ' + displayDate(latest.tanggal_ukur) :
        latest.nilai + ' ' + type.unit + ' · ' + displayDate(latest.tanggal_ukur);
    }
    return '<button type="button" class="measure-card" data-elder-measure="' + kind + '"' +
      (elderMeasurements.loading ? ' disabled' : '') + '>' +
      '<span class="measure-icon"><img src="' + type.image + '" alt="" aria-hidden="true"></span>' +
      '<span class="measure-copy"><b>' + type.title + '</b><small>' + esc(value) +
      '</small></span><span class="measure-arrow" aria-hidden="true">›</span></button>';
  }).join('');
  var historyHtml = elderMeasurements.loading ? '<p class="growth-hint">Memuat riwayat pengukuran...</p>' :
    elderMeasurements.error ? '<div class="alert error-notice" role="alert">' + esc(elderMeasurements.error) +
      ' <button type="button" class="link" data-elder-measure-retry>Coba lagi</button></div>' :
      records.length ? '<div class="elder-measure-history">' + records.map(function (item) {
        var type = elderMeasurementTypes[item.jenis];
        var value = item.jenis === 'tekanan_darah' ?
          item.sistolik + '/' + item.diastolik + ' mmHg' : item.nilai + ' ' + type.unit;
        return '<article class="elder-measure-entry"><div><b>' + type.title + '</b><time>' +
          esc(displayDate(item.tanggal_ukur)) + '</time></div><strong>' + esc(value) + '</strong>' +
          (item.catatan ? '<p>' + esc(item.catatan) + '</p>' : '') + '</article>';
      }).join('') + '</div>' : '<div class="empty">Belum ada riwayat pengukuran.</div>';
  var dateInvalid = elderMeasurementDate < person.lahir || elderMeasurementDate > iso(today);
  return '<section class="elder-measure-section"><h2>Catat hasil pengukuran</h2>' +
    '<p class="growth-hint">Tentukan satu tanggal untuk semua hasil pengukuran pada kunjungan ini.</p>' +
    '<label class="growth-label" for="elder-visit-date">Tanggal pengukuran</label>' +
    '<input class="growth-input" id="elder-visit-date" type="date" min="' + esc(person.lahir) +
    '" max="' + iso(today) + '" value="' + esc(elderMeasurementDate) + '">' +
    (dateInvalid ? '<div class="growth-error" role="alert">Tanggal harus berada di antara tanggal lahir dan hari ini.</div>' : '') +
    '<div class="elder-measure-cards">' + measureCards + '</div>' +
    '<h3 class="growth-section-title">Riwayat Pengukuran</h3>' + historyHtml + '</section>';
}

function switchElderSection(section) {
  if (section !== 'profil' && section !== 'pengukuran' && section !== 'catatan') return;
  elderSection = section;
  elderMeasurementPage = false;
  render();
  if (section === 'catatan' &&
    (elderVisitNotes.personId !== selectedElderId || !elderVisitNotes.loaded && !elderVisitNotes.loading)) {
    loadElderVisitNotes(selectedElderId);
  }
}

function loadElderVisitNotes(personId) {
  elderVisitNotes = { personId: personId, records: [], loading: true, loaded: false, error: '' };
  render();
  requestElderVisitNotes(personId).then(function (records) {
    if (selectedElderId !== personId) return;
    elderVisitNotes = { personId: personId, records: records, loading: false, loaded: true, error: '' };
    render();
  }).catch(function (error) {
    if (selectedElderId !== personId) return;
    elderVisitNotes = { personId: personId, records: [], loading: false, loaded: false, error: error.message };
    render();
  });
}

function elderVisitNotesHtml(person) {
  var state = elderVisitNotes.personId === person.id ? elderVisitNotes :
    { records: [], loading: false, loaded: false, error: '' };
  var historyHtml = state.loading ? '<p class="growth-hint">Memuat catatan kunjungan...</p>' :
    state.error ? '<div class="alert error-notice" role="alert">' + esc(state.error) +
      ' <button type="button" class="link" data-elder-notes-retry>Coba lagi</button></div>' :
      state.records.length ? '<div class="visit-timeline">' + state.records.map(function (item) {
        var lines = (item.measurements || []).map(function (measurement) {
          var type = elderMeasurementTypes[measurement.jenis];
          if (!type) return '';
          var value = measurement.jenis === 'tekanan_darah' ?
            measurement.sistolik + '/' + measurement.diastolik + ' mmHg' :
            measurement.nilai + ' ' + type.unit;
          return type.title + ': ' + value +
            (measurement.catatan ? ' · Catatan pengukuran: ' + measurement.catatan : '');
        }).filter(Boolean);
        (item.catatan || []).forEach(function (note) {
          lines.push('Catatan kunjungan: ' + note);
        });
        return '<article class="visit-entry"><span class="visit-dot"></span><time>' +
          esc(displayDate(item.tanggal_kunjungan)) + '</time><p>' +
          esc(lines.join(' · ') || 'Kunjungan tercatat') + '</p></article>';
      }).join('') + '</div>' :
        '<div class="growth-empty"><span aria-hidden="true">🌸</span><b>Belum ada riwayat kunjungan</b>' +
        '<p>Pengukuran dan catatan kunjungan yang tersimpan akan tampil di sini.</p></div>';
  return '<section class="elder-measure-section"><h2>Catatan Kunjungan</h2>' +
    '<label class="growth-label" for="elder-visit-note-date">Tanggal kunjungan</label>' +
    '<input class="growth-input" id="elder-visit-note-date" type="date" min="' + esc(person.lahir) +
    '" max="' + iso(today) + '" value="' + esc(elderVisitDate) + '">' +
    '<label class="growth-label" for="elder-visit-note">Catatan</label>' +
    '<textarea class="growth-input" id="elder-visit-note" rows="4" maxlength="2000" placeholder="Tulis catatan kunjungan"></textarea>' +
    '<div class="growth-error inline-error" id="elder-visit-note-error" aria-live="polite"></div>' +
    '<div class="growth-actions"><button type="button" class="growth-button" data-elder-note-save>Simpan Catatan</button></div>' +
    '<h3 class="growth-section-title">Riwayat Kunjungan</h3>' + historyHtml + '</section>';
}

async function saveElderVisitNote(button) {
  var date = document.getElementById('elder-visit-note-date').value;
  var note = document.getElementById('elder-visit-note').value.trim();
  var errorElement = document.getElementById('elder-visit-note-error');
  var person = db.lansia.find(function (item) { return item.id === selectedElderId; });
  if (!date || date < person.lahir || date > iso(today)) {
    errorElement.textContent = 'Tanggal kunjungan wajib diisi, tidak boleh sebelum tanggal lahir atau melewati hari ini.';
    return;
  }
  if (!note || note.length > 2000) {
    errorElement.textContent = 'Catatan kunjungan wajib diisi dan maksimal 2.000 karakter.';
    return;
  }
  elderVisitDate = date;
  button.disabled = true;
  errorElement.textContent = 'Menyimpan catatan...';
  try {
    var records = await requestElderVisitNotes(selectedElderId, {
      action: 'visit_note',
      id: selectedElderId,
      tanggal_kunjungan: date,
      catatan: note
    });
    elderVisitNotes = { personId: selectedElderId, records: records, loading: false, loaded: true, error: '' };
    elderVisitDate = iso(today);
    render();
  } catch (error) {
    errorElement.textContent = error.message;
    button.disabled = false;
  }
}

function loadElderMeasurements(personId) {
  elderMeasurements = { personId: personId, records: [], loading: true, error: '' };
  render();
  requestElderMeasurements(personId).then(function (records) {
    if (selectedElderId !== personId) return;
    elderMeasurements = { personId: personId, records: records, loading: false, error: '' };
    render();
  }).catch(function (error) {
    if (selectedElderId !== personId) return;
    elderMeasurements = { personId: personId, records: [], loading: false, error: error.message };
    render();
  });
}

function openElderMeasurementForm(kind) {
  var type = elderMeasurementTypes[kind];
  if (!type) return;
  elderMeasurementKind = kind;
  elderMeasurementPage = true;
  render();
}

function renderElderMeasurementPage(view, person) {
  var kind = elderMeasurementKind;
  var type = elderMeasurementTypes[kind];
  if (!type) {
    elderMeasurementPage = false;
    render();
    return;
  }
  var last = elderMeasurements.records.find(function (item) { return item.jenis === kind; });
  var lastValue = last ? kind === 'tekanan_darah' ?
    last.sistolik + '/' + last.diastolik + ' mmHg' : last.nilai + ' ' + type.unit : 'Belum ada';
  var fields = kind === 'tekanan_darah' ?
    '<div class="elder-blood-pressure-fields"><div><label class="growth-label" for="elder-systolic">Sistolik</label>' +
    '<div class="large-number"><input id="elder-systolic" type="number" inputmode="numeric" min="50" max="300" step="1" placeholder="120"><span>mmHg</span></div></div>' +
    '<div><label class="growth-label" for="elder-diastolic">Diastolik</label>' +
    '<div class="large-number"><input id="elder-diastolic" type="number" inputmode="numeric" min="30" max="200" step="1" placeholder="80"><span>mmHg</span></div></div></div>' :
    '<label class="growth-label" for="elder-measure-value">Hasil pengukuran</label>' +
    '<div class="large-number"><input id="elder-measure-value" type="number" inputmode="decimal" min="' + type.min +
    '" max="' + type.max + '" step="' + type.step + '" placeholder="0"><span>' + type.unit + '</span></div>';
  view.innerHTML = '<section class="child-page detail-page"><div class="child-content elder-measure-form">' +
    '<button type="button" class="growth-back-link" data-elder-measure-back>‹ Kembali ke daftar pengukuran</button>' +
    '<div class="detail-identity"><span class="av">👵</span><div><small>Pemantauan lansia</small><h1>' +
    esc(person.nama) + genderSymbol(person.gender) + '</h1></div></div>' +
    '<h2 class="growth-section-title">' + type.title + '</h2>' +
    '<div class="growth-card shared-measure-date"><span>Tanggal pengukuran</span><b>' +
    esc(displayDate(elderMeasurementDate)) + '</b><small>Tanggal ditetapkan di halaman Pengukuran.</small></div>' +
    '<div class="growth-card last-measure-grid"><div><span>Pengukuran terakhir</span><b>' +
    esc(last ? displayDate(last.tanggal_ukur) : 'Belum ada') + '</b></div><div><span>Nilai terakhir</span><b>' +
    esc(lastValue) + '</b></div></div>' + fields +
    '<div class="growth-error inline-error" id="elder-measure-error" aria-live="polite"></div>' +
    '<label class="growth-label" for="elder-measure-note">Catatan (opsional)</label>' +
    '<textarea class="growth-input" id="elder-measure-note" rows="3" maxlength="2000" placeholder="Catatan saat pengukuran"></textarea>' +
    '<div class="growth-actions"><button type="button" class="growth-button" data-elder-measure-save="' + kind +
    '">Simpan</button><button type="button" class="growth-button secondary" data-elder-measure-repeat>Ulangi</button></div>' +
    '</div></section>';
}

async function saveElderMeasurement(kind, button) {
  var type = elderMeasurementTypes[kind];
  var errorElement = document.getElementById('elder-measure-error');
  var date = elderMeasurementDate;
  var note = document.getElementById('elder-measure-note').value.trim();
  var measurement = { jenis: kind, tanggal_ukur: date, catatan: note };
  if (kind === 'tekanan_darah') {
    measurement.sistolik = document.getElementById('elder-systolic').value;
    measurement.diastolik = document.getElementById('elder-diastolic').value;
    if (!Number.isInteger(Number(measurement.sistolik)) || !Number.isInteger(Number(measurement.diastolik)) ||
      Number(measurement.sistolik) < 50 || Number(measurement.sistolik) > 300 ||
      Number(measurement.diastolik) < 30 || Number(measurement.diastolik) > 200 ||
      Number(measurement.sistolik) <= Number(measurement.diastolik)) {
      errorElement.textContent = 'Masukkan tekanan sistolik 50–300 dan diastolik 30–200 mmHg. Sistolik harus lebih tinggi.';
      return;
    }
  } else {
    var value = document.getElementById('elder-measure-value').value.trim();
    var number = Number(value);
    if (!value || !Number.isFinite(number) || number < type.min || number > type.max) {
      errorElement.textContent = 'Nilai ' + type.title.toLowerCase() + ' harus antara ' + type.min + '–' + type.max + ' ' + type.unit + '.';
      return;
    }
    measurement.nilai = number;
  }
  var person = db.lansia.find(function (item) { return item.id === selectedElderId; });
  if (!date || date < person.lahir || date > iso(today)) {
    errorElement.textContent = 'Tanggal pengukuran wajib diisi, tidak boleh sebelum tanggal lahir atau melewati hari ini.';
    return;
  }
  button.disabled = true;
  errorElement.textContent = 'Menyimpan pengukuran...';
  try {
    var records = await requestElderMeasurements(selectedElderId, Object.assign({
      action: 'measurement',
      id: selectedElderId
    }, measurement));
    elderMeasurements = { personId: selectedElderId, records: records, loading: false, error: '' };
    elderMeasurementPage = false;
    render();
  } catch (error) {
    errorElement.textContent = error.message;
    button.disabled = false;
  }
}

function openChildForm(editing) {
  formReturn = 'main';
  returnToGrowthDetail = Boolean(editing && /^#balita-\d+$/.test(location.hash));
  if (!editing) selectedChildId = null;
  if (returnToGrowthDetail && window.exitGrowthForEdit) window.exitGrowthForEdit();
  screen = 'childForm';
  render();
  window.scrollTo(0, 0);
  document.getElementById('child-name').focus();
}

async function saveChild() {
  var errorElement = document.getElementById('child-error');
  var name = document.getElementById('child-name').value.trim();
  var birth = document.getElementById('child-birth').value;
  var address = document.getElementById('child-address').value.trim();
  var gender = document.getElementById('child-gender').value;
  var orderValue = document.getElementById('child-order').value;
  var householdNumber = document.getElementById('child-kk').value.trim();
  var nik = document.getElementById('child-nik').value.trim();
  var imd = document.getElementById('child-imd').value;
  var weight = document.getElementById('child-weight').value;
  var length = document.getElementById('child-length').value;
  var head = document.getElementById('child-head').value;
  var arm = document.getElementById('child-arm').value;

  if (!name || !birth || !gender) {
    errorElement.textContent = 'Nama, jenis kelamin, dan tanggal lahir wajib diisi.';
    return;
  }
  if (new Date(birth + 'T00:00:00') > new Date(iso(today) + 'T00:00:00')) {
    errorElement.textContent = 'Tanggal lahir tidak boleh melebihi hari ini.';
    return;
  }
  if (bulan(birth) > 59) {
    errorElement.textContent = 'Umur lebih dari 59 bulan, tidak masuk kategori balita.';
    return;
  }
  if (orderValue && (!Number.isInteger(Number(orderValue)) || Number(orderValue) < 1 || Number(orderValue) > 99)) {
    errorElement.textContent = 'Urutan anak harus berupa angka mulai dari 1.';
    return;
  }
  if (nik && !/^\d{16}$/.test(nik)) {
    errorElement.textContent = 'NIK harus terdiri dari 16 angka.';
    return;
  }
  if (householdNumber && !/^\d{16}$/.test(householdNumber)) {
    errorElement.textContent = 'Nomor KK harus terdiri dari 16 angka.';
    return;
  }
  if (address.length > 16000) {
    errorElement.textContent = 'Alamat terlalu panjang.';
    return;
  }
  var values = [weight, length, head, arm];
  if (values.some(function (value) { return value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 999.99); })) {
    errorElement.textContent = 'Ukuran saat lahir harus berupa angka yang valid.';
    return;
  }

  var payload = {
    nama: name,
    lahir: birth,
    alamat: address,
    gender: gender,
    anakKe: orderValue || null,
    nomorKK: householdNumber,
    nik: nik,
    namaIbu: document.getElementById('child-mother').value.trim(),
    namaAyah: document.getElementById('child-father').value.trim(),
    imd: imd || null,
    beratLahir: weight,
    panjangLahir: length,
    lingkarKepala: head,
    lingkarLenganLahir: arm
  };
  var isEditing = Boolean(selectedChildId);
  if (isEditing) payload.id = selectedChildId;

  var button = document.getElementById('child-save');
  button.disabled = true;
  errorElement.textContent = 'Menyimpan data...';
  try {
    var saved = await requestBalita(payload);
    var existingIndex = db.balita.findIndex(function (child) { return child.id === saved.id; });
    if (existingIndex < 0) db.balita.push(saved);
    else db.balita[existingIndex] = saved;
    selectedChildId = saved.id;
    save();
    if (returnToGrowthDetail) {
      returnToGrowthDetail = false;
      window.openBalitaDetail(saved.id, 'Biodata balita berhasil diperbarui.', true);
      return;
    }
    window.openBalitaDetail(
      saved.id,
      isEditing ? 'Biodata balita berhasil diperbarui.' : 'Data balita berhasil disimpan.',
      false
    );
    window.scrollTo(0, 0);
  } catch (error) {
    errorElement.textContent = error.message;
    button.disabled = false;
  }
}

function openForm(kind, id) {
  if (kind !== 'lansia') return;
  var person = id ? db.lansia.find(function (item) { return item.id == id; }) : null;
  if (id && !person) return;
  elderFormReturn = screen === 'elderDetail' ? 'elderDetail' : 'main';
  selectedElderFormId = person ? person.id : null;
  screen = 'elderForm';
  render();
  window.scrollTo(0, 0);
  document.getElementById('elder-name').focus();
}

async function saveElder() {
  var errorElement = document.getElementById('elder-error');
  var name = document.getElementById('elder-name').value.trim();
  var birth = document.getElementById('elder-birth').value;
  var gender = document.getElementById('elder-gender').value;
  var householdNumber = document.getElementById('elder-kk').value.trim();
  var nik = document.getElementById('elder-nik').value.trim();
  var address = document.getElementById('elder-address').value.trim();
  var phone = document.getElementById('elder-phone').value.trim();
  var guardian = document.getElementById('elder-guardian').value.trim();
  var guardianPhone = document.getElementById('elder-guardian-phone').value.trim();
  if (!name || !birth) {
    errorElement.textContent = 'Nama lengkap dan tanggal lahir wajib diisi.';
    return;
  }
  if (nik && !/^\d{16}$/.test(nik)) {
    errorElement.textContent = 'NIK harus terdiri dari 16 angka.';
    return;
  }
  if (householdNumber && !/^\d{16}$/.test(householdNumber)) {
    errorElement.textContent = 'Nomor KK harus terdiri dari 16 angka.';
    return;
  }
  var birthDate = new Date(birth + 'T00:00:00');
  if (isNaN(birthDate.getTime()) || birthDate > new Date(iso(today) + 'T00:00:00')) {
    errorElement.textContent = 'Tanggal lahir tidak valid.';
    return;
  }
  if (tahun(birth) < 59) {
    errorElement.textContent = 'Lansia minimal berumur 59 tahun.';
    return;
  }
  var button = document.getElementById('elder-save');
  button.disabled = true;
  errorElement.textContent = 'Menyimpan data...';
  try {
    var payload = {
      nama: name,
      lahir: birth,
      nomorKK: householdNumber,
      nik: nik,
      gender: gender,
      alamat: address,
      nomorHp: phone,
      namaPendamping: guardian,
      nomorHpPendamping: guardianPhone
    };
    var isEditing = Boolean(selectedElderFormId);
    if (isEditing) payload.id = selectedElderFormId;
    var saved = await requestLansia(payload, isEditing ? 'PATCH' : null);
    var existingIndex = db.lansia.findIndex(function (item) { return item.id === saved.id; });
    if (existingIndex < 0) db.lansia.push(saved);
    else db.lansia[existingIndex] = saved;
    selectedElderId = saved.id;
    save();
    if (isEditing) {
      elderSection = 'profil';
      elderNotice = 'Biodata lansia berhasil diperbarui.';
    }
    screen = elderFormReturn;
    render();
    window.scrollTo(0, 0);
  } catch (error) {
    errorElement.textContent = error.message;
    button.disabled = false;
  }
}

function updateDirectorySearch(type, value) {
  var query = value.trim().toLocaleLowerCase();
  if (type === 'balita') balitaSearch = value;
  else lansiaSearch = value;
  var container = document.getElementById('view');
  var entries = container.querySelectorAll('[data-searchable]');
  var visibleCount = 0;
  entries.forEach(function (entry) {
    var visible = entry.dataset.searchName.indexOf(query) !== -1;
    entry.hidden = !visible;
    if (visible) visibleCount++;
  });
  var empty = container.querySelector('[data-directory-empty]');
  var noResults = container.querySelector('[data-search-empty]');
  if (empty) empty.hidden = query !== '';
  if (noResults) noResults.hidden = query === '' || visibleCount !== 0;
}

function confirmHistoryTransfer(kind, id) {
  var child = kind === 'balita';
  var person = (child ? db.balita : db.lansia).find(function (record) { return record.id === id; });
  if (!person) return;
  document.getElementById('sheet').innerHTML =
    '<div class="transfer-warning" role="alert"><b>PERINGATAN</b><p>Data ' + esc(person.nama) +
    ' akan dipindahkan ke Riwayat dan tidak lagi muncul di daftar aktif. Data tetap tersimpan.</p><p>Apakah Anda yakin ingin melanjutkan?</p></div>' +
    '<button type="button" class="btn" data-confirm-transfer="' + kind + '" data-id="' + id + '">' +
    'Ya, Luluskan</button>' +
    '<button type="button" class="btn ghost" data-modal-close>Batal</button>';
  document.getElementById('modal').classList.add('show');
}

async function setBalitaLulus(id) {
  try {
    var saved = await requestBalita({ action: 'lulus', id: id });
    var index = db.balita.findIndex(function (child) { return child.id === saved.id; });
    if (index >= 0) db.balita[index] = saved;
    save();
    apiError = '';
    window.dispatchEvent(new Event('balita-lulus-saved'));
  } catch (error) {
    apiError = error.message;
  }
  render();
}

async function setLansiaStatus(id, status, date) {
  try {
    var saved = await requestLansia({ action: 'status', id: id, status: status, tanggalWafat: date || null });
    var index = db.lansia.findIndex(function (person) { return person.id === saved.id; });
    if (index >= 0) db.lansia[index] = saved;
    save();
    lansiaApiError = '';
    if (status === 'selesai') {
      screen = 'main';
      tab = 'riwayat';
      rsub = 'lansia';
    }
  } catch (error) {
    lansiaApiError = error.message;
  }
  render();
}

function closeM() { document.getElementById('modal').classList.remove('show'); }

async function exportMeetingData(kind, button) {
  var status = document.getElementById('export-status');
  var date = document.getElementById('export-date').value;
  if (!date || date > iso(today)) {
    status.textContent = 'Pilih tanggal pertemuan yang valid.';
    return;
  }
  exportDate = date;
  button.disabled = true;
  status.textContent = 'Menyiapkan file Excel...';
  try {
    var response = await fetch('export.php?jenis=' + encodeURIComponent(kind) +
      '&tanggal=' + encodeURIComponent(date), { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) {
      var result;
      try {
        result = await response.json();
      } catch (error) {
        throw new Error('File Excel tidak dapat dibuat.');
      }
      throw new Error(result.error || 'File Excel tidak dapat dibuat.');
    }
    var file = await response.blob();
    var url = URL.createObjectURL(file);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'posyandu-' + kind + '-' + date + '.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    status.textContent = 'File Excel ' + (kind === 'balita' ? 'balita' : 'lansia') + ' berhasil diunduh.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

document.addEventListener('click', function (event) {
  var target = event.target.closest('[data-t]');
  if (target) {
    screen = 'main';
    tab = target.dataset.t;
    render();
    if (tab === 'home') syncMonthlyAttendance();
    return;
  }
  target = event.target.closest('[data-r]');
  if (target) { rsub = target.dataset.r; render(); return; }
  target = event.target.closest('[data-child-id]');
  if (target) {
    window.openBalitaDetail(Number(target.dataset.childId), '', false);
    window.scrollTo(0, 0);
    return;
  }
  target = event.target.closest('[data-elder-id]');
  if (target) {
    selectedElderId = Number(target.dataset.elderId);
    screen = 'elderDetail';
    elderSection = 'profil';
    elderMeasurementPage = false;
    elderMeasurementKind = '';
    elderMeasurementDate = iso(today);
    elderMeasurements = { personId: selectedElderId, records: [], loading: false, error: '' };
    elderVisitNotes = { personId: selectedElderId, records: [], loading: false, loaded: false, error: '' };
    elderVisitDate = iso(today);
    render();
    window.scrollTo(0, 0);
    loadElderMeasurements(selectedElderId);
    return;
  }
  target = event.target.closest('[data-elder-tab]');
  if (target) { switchElderSection(target.dataset.elderTab); return; }
  target = event.target.closest('[data-elder-measure]');
  if (target) { openElderMeasurementForm(target.dataset.elderMeasure); return; }
  target = event.target.closest('[data-elder-measure-save]');
  if (target) { saveElderMeasurement(target.dataset.elderMeasureSave, target); return; }
  target = event.target.closest('[data-elder-note-save]');
  if (target) { saveElderVisitNote(target); return; }
  target = event.target.closest('[data-export]');
  if (target) { exportMeetingData(target.dataset.export, target); return; }
  target = event.target.closest('[data-elder-graduate]');
  if (target) {
    confirmHistoryTransfer('lansia', Number(target.dataset.elderGraduate));
    return;
  }
  if (event.target.closest('[data-elder-notes-retry]')) {
    loadElderVisitNotes(selectedElderId);
    return;
  }
  if (event.target.closest('[data-elder-measure-back]')) {
    elderMeasurementPage = false;
    elderMeasurementKind = '';
    render();
    return;
  }
  if (event.target.closest('[data-elder-measure-repeat]')) {
    var measurementInputs = document.querySelectorAll(
      '#elder-measure-value, #elder-systolic, #elder-diastolic, #elder-measure-note'
    );
    measurementInputs.forEach(function (input) { input.value = ''; });
    document.getElementById('elder-measure-error').textContent = '';
    return;
  }
  if (event.target.closest('[data-elder-measure-retry]')) {
    loadElderMeasurements(selectedElderId);
    return;
  }
  if (event.target.closest('[data-modal-close]')) { closeM(); return; }
  if (event.target.closest('[data-graduate-profile]')) {
    confirmHistoryTransfer('balita', Number(event.target.closest('[data-graduate-profile]').dataset.graduateProfile));
    return;
  }
  if (event.target.closest('[data-edit-child]')) { openChildForm(true); return; }
  if (event.target.closest('[data-back]')) {
    var restoreGrowthDetail = screen === 'childForm' && returnToGrowthDetail;
    if (restoreGrowthDetail) {
      returnToGrowthDetail = false;
      window.openBalitaDetail(selectedChildId, '', true);
      window.scrollTo(0, 0);
      return;
    }
    screen = screen === 'childForm' ? formReturn :
      screen === 'elderForm' ? elderFormReturn : 'main';
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (event.target.closest('[data-retry]')) { syncBalita(); syncLansia(); return; }
  if (event.target.closest('[data-retry-monthly]')) { syncMonthlyAttendance(); return; }
  if (event.target.id === 'child-save') { saveChild(); return; }
  if (event.target.id === 'elder-save') { saveElder(); return; }
  target = event.target.closest('[data-edit]');
  if (target) { openForm(target.dataset.edit, Number(target.dataset.id)); return; }
  target = event.target.closest('[data-graduate]');
  if (target) { confirmHistoryTransfer('balita', Number(target.dataset.graduate)); return; }
  target = event.target.closest('[data-finish]');
  if (target) { confirmHistoryTransfer('lansia', Number(target.dataset.finish)); return; }
  target = event.target.closest('[data-confirm-transfer]');
  if (target) {
    var transferKind = target.dataset.confirmTransfer;
    var transferId = Number(target.dataset.id);
    closeM();
    if (transferKind === 'balita') setBalitaLulus(transferId);
    else setLansiaStatus(transferId, 'selesai', null);
    return;
  }
  target = event.target.closest('[data-delete]');
  if (target) {
    var list = db[target.dataset.delete];
    var record = list.find(function (item) { return item.id == target.dataset.id; });
    if (record && confirm('Hapus data ' + record.nama + '? Data yang dihapus tidak dapat dikembalikan.')) {
      requestLansia({ id: Number(target.dataset.id) }, 'DELETE').then(function () {
        db[target.dataset.delete] = list.filter(function (item) { return item.id != target.dataset.id; });
        save();
        render();
      }).catch(function (error) {
        lansiaApiError = error.message;
        render();
      });
    }
    return;
  }
  target = event.target.closest('[data-u]');
  if (target) {
    var person = db.lansia.find(function (item) { return item.id == target.dataset.u; });
    if (person) setLansiaStatus(person.id, 'aktif', null);
    return;
  }
  if (event.target.id === 'fab') {
    if (tab === 'balita') openChildForm(false);
    else openForm('lansia');
  }
  if (event.target.id === 'modal') closeM();
});

document.addEventListener('input', function (event) {
  var type = event.target.dataset && event.target.dataset.searchType;
  if (type) updateDirectorySearch(type, event.target.value);
});

document.addEventListener('change', function (event) {
  if (event.target.id === 'export-date') {
    exportDate = event.target.value;
  }
  if (event.target.id === 'elder-visit-date') {
    elderMeasurementDate = event.target.value;
    render();
  }
  if (event.target.id === 'elder-visit-note-date') {
    elderVisitDate = event.target.value;
  }
});

document.addEventListener('touchstart', function (event) {
  if (screen !== 'elderDetail' || elderMeasurementPage || !event.target.closest('.elder-swipe-area')) return;
  if (event.target.closest('input, textarea, select')) return;
  var touch = event.touches[0];
  elderSwipeStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

document.addEventListener('touchend', function (event) {
  if (!elderSwipeStart) return;
  var touch = event.changedTouches[0];
  var deltaX = touch.clientX - elderSwipeStart.x;
  var deltaY = touch.clientY - elderSwipeStart.y;
  elderSwipeStart = null;
  if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) return;
  if (deltaX < 0 && elderSection === 'profil') switchElderSection('pengukuran');
  else if (deltaX > 0 && elderSection === 'pengukuran') switchElderSection('profil');
}, { passive: true });

document.addEventListener('touchcancel', function () {
  elderSwipeStart = null;
}, { passive: true });

document.addEventListener('keydown', function (event) {
  var childCard = event.target.closest('[data-child-id]');
  if (childCard && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    childCard.click();
  }
  var elderCard = event.target.closest('[data-elder-id]');
  if (elderCard && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    elderCard.click();
  }
});

document.addEventListener('change', function (event) {
  var personId = event.target.dataset && event.target.dataset.w;
  if (personId) {
    var person = db.lansia.find(function (item) { return item.id == personId; });
    if (person && confirm('Tandai ' + person.nama + ' sebagai meninggal? Data akan pindah ke Riwayat.')) {
      setLansiaStatus(person.id, 'meninggal', iso(today));
      return;
    }
    render();
  }
});

db = load() || seed();
if (!Array.isArray(db.balita)) db.balita = [];
if (!Array.isArray(db.lansia)) db.lansia = [];
if (!Number.isFinite(db.id)) db.id = 20;
save();
render();
syncBalita();
syncLansia();
syncMonthlyAttendance();
