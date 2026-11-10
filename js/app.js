var KEY = 'posyandu-mawar-v1';
var db;
var tab = 'home';
var sub = 'balita';
var rsub = 'balita';
var screen = 'main';
var formReturn = 'main';
var selectedChildId = null;
var selectedElderId = null;
var today = new Date();
var apiError = '';
var lansiaApiError = '';
var storageError = '';
var balitaSearch = '';
var lansiaSearch = '';

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
function aktifB() { return db.balita.filter(function (child) { return !lulus(child); }); }
function lulusB() { return db.balita.filter(lulus); }
function aktifL() { return db.lansia.filter(function (person) { return !person.wafat && !person.selesai; }); }
function riwayatL() { return db.lansia.filter(function (person) { return person.wafat || person.selesai; }); }
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
  var view = document.getElementById('view');
  var app = document.getElementById('app');
  var fab = document.getElementById('fab');
  var nav = document.getElementById('nav');
  app.classList.toggle('child-form-screen', screen === 'childForm');
  app.classList.toggle('child-detail-screen', screen === 'childDetail' || screen === 'elderDetail');
  fab.style.display = screen === 'main' && (tab === 'balita' || tab === 'lansia') ? 'grid' : 'none';
  fab.textContent = tab === 'balita' ? '+ Tambah Anak' : '+ Tambah Lansia';
  fab.setAttribute('aria-label', tab === 'balita' ? 'Tambah Anak' : 'Tambah Lansia');
  nav.style.display = screen === 'childForm' ? 'none' : 'flex';

  if (screen === 'childForm') {
    renderChildForm(view);
    return;
  }
  if (screen === 'childDetail') {
    renderChildDetail(view);
    return;
  }
  if (screen === 'elderDetail') {
    renderElderDetail(view);
    return;
  }

  var html = errorNotice();
  if (tab === 'home') {
    var notifications = notif();
    html += '<div class="grid"><div class="stat"><b>' + aktifB().length + '</b><span>Balita aktif (0-59 bln)</span></div><div class="stat"><b>' + aktifL().length + '</b><span>Lansia aktif (59+ th)</span></div><div class="stat"><b>' + lulusB().length + '</b><span>Balita lulus (tersimpan)</span></div><div class="stat"><b>' + riwayatL().length + '</b><span>Lansia riwayat</span></div></div>';
    html += '<h2>🔔 Notifikasi</h2>';
    html += notifications.length ? notifications.map(function (child) {
      return '<div class="alert"><b>' + esc(child.nama) + '</b> berumur ' + umurTxt(bulan(child.lahir)) + '. Akan keluar dari sistem balita dalam ' + sisa(child) + ' bulan.</div>';
    }).join('') : '<div class="empty">Belum ada balita yang mendekati usia keluar.</div>';
    html += '<h2>Tentang</h2><div class="stat" style="font-size:13px;color:var(--muted)">Balita dicatat sampai 59 bulan, lalu otomatis lulus dan datanya tetap tersimpan. Lansia dimulai dari umur 59 tahun dan dapat dipindahkan ke riwayat menggunakan tombol Selesai.</div>';
  }

  if (tab === 'balita') {
    var children = aktifB();
    html += '<h2 style="margin-top:0">Daftar data Balita</h2>';
    html += '<div class="directory-tools"><label class="directory-search"><span aria-hidden="true">⌕</span><input type="search" data-search-type="balita" value="' + esc(balitaSearch) + '" placeholder="Ketik untuk mencari nama ..." aria-label="Cari nama balita"></label><div class="directory-total"><span aria-hidden="true">▣</span> Total data Balita: <b>' + children.length + ' anak</b></div></div>';
    html += children.length ? children.map(function (child) {
      var remaining = sisa(child);
      return '<div class="item balita-item" data-searchable data-search-name="' + esc(child.nama.toLocaleLowerCase()) + '">' +
        '<a class="balita-card-link" href="#balita-' + child.id + '" data-detail-balita="' + child.id + '" aria-label="Buka pemantauan ' + esc(child.nama) + '">' +
        '<div class="av">👶</div><div class="info"><b class="child-name">' + esc(child.nama) + genderSymbol(child.gender) + '</b><small>' + umurTxt(bulan(child.lahir)) + ' · Ortu: ' + esc(child.ortu || '-') + '</small></div>' +
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
        return '<div class="item child-item" role="button" tabindex="0" data-child-id="' + child.id + '" aria-label="Lihat biodata ' + esc(child.nama) + '"><div class="av">🎓</div><div class="info"><b class="child-name">' + esc(child.nama) + genderSymbol(child.gender) + '</b><small>Lahir ' + esc(child.lahir) + ' · Ortu: ' + esc(child.ortu || '-') + '</small></div><span class="badge gray">Lulus</span></div>';
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
    '<label for="child-order">Anak Ke-</label><input id="child-order" type="number" min="1" max="99" value="' + value('anakKe') + '" placeholder="Urutan anak">' +
    '<label for="child-nik">NIK Anak</label><input id="child-nik" type="text" inputmode="numeric" maxlength="16" value="' + value('nik') + '" placeholder="16 digit NIK">' +
    '<label for="child-imd">Inisiasi Menyusu Dini (IMD)</label><select id="child-imd"><option value="">Pilih status IMD</option><option value="Ya" ' + (child && child.imd === 'Ya' ? 'selected' : '') + '>Ya</option><option value="Tidak" ' + (child && child.imd === 'Tidak' ? 'selected' : '') + '>Tidak</option></select>' +
    '<h2 class="measure-heading">Data Timbang</h2>' +
    '<label for="child-weight">Berat Badan Lahir (KG)</label><input id="child-weight" type="number" min="0" max="999.99" step="0.01" value="' + value('beratLahir') + '" placeholder="Berat badan lahir (kg)">' +
    '<label for="child-length">Panjang Badan Lahir (CM)</label><input id="child-length" type="number" min="0" max="999.99" step="0.01" value="' + value('panjangLahir') + '" placeholder="Panjang badan lahir (cm)">' +
    '<label for="child-head">Lingkar Kepala Lahir (CM)</label><input id="child-head" type="number" min="0" max="999.99" step="0.01" value="' + value('lingkarKepala') + '" placeholder="Lingkar kepala lahir (cm)">' +
    '<label for="child-parent">Nama Orang Tua/Wali</label><input id="child-parent" maxlength="100" value="' + value('ortu') + '" placeholder="Nama orang tua/wali">' +
    '<p class="form-error" id="child-error" role="alert"></p><button class="btn child-submit" id="child-save" type="button">' + (child ? 'Simpan Perubahan' : 'Lanjut') + '</button></div></section>';
}

function displayValue(value, unit) {
  return value === null || value === undefined || value === '' ? 'Belum diisi' : esc(value) + (unit || '');
}

function renderChildDetail(view) {
  var child = db.balita.find(function (item) { return item.id === selectedChildId; });
  if (!child) {
    screen = 'main';
    render();
    return;
  }
  view.innerHTML = '<section class="child-page detail-page"><button class="back-link" data-back type="button">← Kembali</button>' +
    '<div class="child-content"><div class="detail-identity"><span class="av">👶</span><div><small>Data Anak</small><h1>' + esc(child.nama) + genderSymbol(child.gender) + '</h1></div></div>' +
    '<section class="bio-section"><div class="bio-heading"><h2>Biodata Anak</h2><button class="text-action" data-edit-child type="button">Ubah</button></div>' +
    '<dl class="bio-list">' +
    '<div><dt>Nama</dt><dd>' + esc(child.nama) + '</dd></div>' +
    '<div><dt>Jenis Kelamin</dt><dd>' + displayValue(child.gender) + '</dd></div>' +
    '<div><dt>Tanggal Lahir</dt><dd>' + esc(child.lahir) + '</dd></div>' +
    '<div><dt>Umur</dt><dd>' + umurTxt(bulan(child.lahir)) + '</dd></div>' +
    '<div><dt>Anak Ke-</dt><dd>' + displayValue(child.anakKe) + '</dd></div>' +
    '<div><dt>NIK Anak</dt><dd>' + displayValue(child.nik) + '</dd></div>' +
    '<div><dt>Inisiasi Menyusu Dini (IMD)</dt><dd>' + displayValue(child.imd) + '</dd></div>' +
    '<div><dt>Nama Orang Tua/Wali</dt><dd>' + displayValue(child.ortu) + '</dd></div></dl></section>' +
    '<section class="bio-section"><div class="bio-heading"><h2>Data Timbang</h2><button class="text-action" data-edit-child type="button">Ubah</button></div>' +
    '<dl class="bio-list"><div><dt>Berat Badan Lahir</dt><dd>' + displayValue(child.beratLahir, ' kg') + '</dd></div>' +
    '<div><dt>Panjang Badan Lahir</dt><dd>' + displayValue(child.panjangLahir, ' cm') + '</dd></div>' +
    '<div><dt>Lingkar Kepala Lahir</dt><dd>' + displayValue(child.lingkarKepala, ' cm') + '</dd></div></dl></section></div></section>';
}

function renderElderDetail(view) {
  var person = db.lansia.find(function (item) { return item.id === selectedElderId; });
  if (!person) {
    screen = 'main';
    render();
    return;
  }
  view.innerHTML = '<section class="child-page detail-page"><button class="back-link" data-back type="button">← Kembali</button>' +
    '<div class="child-content"><div class="detail-identity"><span class="av">👵</span><div><small>Data Lansia</small><h1>' + esc(person.nama) + genderSymbol(person.gender) + '</h1></div></div>' +
    '<section class="bio-section"><div class="bio-heading"><h2>Biodata Lansia</h2></div>' +
    '<dl class="bio-list">' +
    '<div><dt>Nama Lengkap</dt><dd>' + esc(person.nama) + '</dd></div>' +
    '<div><dt>Jenis Kelamin</dt><dd>' + displayValue(person.gender) + '</dd></div>' +
    '<div><dt>NIK</dt><dd>' + displayValue(person.nik) + '</dd></div>' +
    '<div><dt>Tanggal Lahir</dt><dd>' + esc(displayDate(person.lahir)) + '</dd></div>' +
    '<div><dt>Umur</dt><dd>' + tahun(person.lahir) + ' tahun</dd></div>' +
    '<div><dt>Alamat</dt><dd>' + displayValue(person.alamat) + '</dd></div>' +
    '<div><dt>Nomor HP</dt><dd>' + displayValue(person.nomorHp) + '</dd></div>' +
    '<div><dt>Nama Pendamping</dt><dd>' + displayValue(person.namaPendamping) + '</dd></div>' +
    '<div><dt>Nomor HP Pendamping</dt><dd>' + displayValue(person.nomorHpPendamping) + '</dd></div>' +
    '</dl></section></div></section>';
}

function openChildForm(editing) {
  formReturn = editing ? 'childDetail' : 'main';
  if (!editing) selectedChildId = null;
  screen = 'childForm';
  render();
  window.scrollTo(0, 0);
  document.getElementById('child-name').focus();
}

async function saveChild() {
  var errorElement = document.getElementById('child-error');
  var name = document.getElementById('child-name').value.trim();
  var birth = document.getElementById('child-birth').value;
  var gender = document.getElementById('child-gender').value;
  var orderValue = document.getElementById('child-order').value;
  var nik = document.getElementById('child-nik').value.trim();
  var imd = document.getElementById('child-imd').value;
  var weight = document.getElementById('child-weight').value;
  var length = document.getElementById('child-length').value;
  var head = document.getElementById('child-head').value;

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
  var values = [weight, length, head];
  if (values.some(function (value) { return value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 999.99); })) {
    errorElement.textContent = 'Ukuran saat lahir harus berupa angka yang valid.';
    return;
  }

  var payload = {
    nama: name,
    lahir: birth,
    gender: gender,
    anakKe: orderValue || null,
    nik: nik,
    imd: imd || null,
    beratLahir: weight,
    panjangLahir: length,
    lingkarKepala: head,
    ortu: document.getElementById('child-parent').value.trim()
  };
  if (formReturn === 'childDetail') payload.id = selectedChildId;

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
    screen = 'childDetail';
    render();
    window.scrollTo(0, 0);
  } catch (error) {
    errorElement.textContent = error.message;
    button.disabled = false;
  }
}

function openForm(kind, id) {
  var sheet = document.getElementById('sheet');
  var record = id ? db[kind].find(function (item) { return item.id == id; }) : null;
  if (id && !record) return;
  sheet.innerHTML = '<h2 style="margin:0">' + (record ? 'Edit Lansia' : 'Tambah Lansia') + '</h2>' +
    '<label for="f-nama">Nama Lengkap</label><input id="f-nama" maxlength="100" required value="' + (record ? esc(record.nama) : '') + '" placeholder="Nama lengkap lansia">' +
    '<label for="f-nik">NIK</label><input id="f-nik" inputmode="numeric" maxlength="16" required value="' + (record ? esc(record.nik || '') : '') + '" placeholder="16 digit NIK">' +
    '<label for="f-gender">Jenis Kelamin</label><select id="f-gender"><option value="">Pilih jenis kelamin</option><option value="Laki-laki" ' + (record && record.gender === 'Laki-laki' ? 'selected' : '') + '>Laki-laki</option><option value="Perempuan" ' + (record && record.gender === 'Perempuan' ? 'selected' : '') + '>Perempuan</option></select>' +
    '<label for="f-lahir">Tanggal Lahir</label><input type="date" id="f-lahir" max="' + iso(today) + '" required value="' + (record ? esc(record.lahir) : '') + '">' +
    '<label for="f-alamat">Alamat</label><input id="f-alamat" maxlength="150" required value="' + (record ? esc(record.alamat || '') : '') + '" placeholder="Alamat lengkap">' +
    '<label for="f-hp">Nomor HP</label><input id="f-hp" type="tel" maxlength="20" required value="' + (record ? esc(record.nomorHp || '') : '') + '" placeholder="Nomor HP lansia">' +
    '<label for="f-pendamping">Nama Pendamping</label><input id="f-pendamping" maxlength="100" required value="' + (record ? esc(record.namaPendamping || '') : '') + '" placeholder="Nama pendamping">' +
    '<label for="f-hp-pendamping">Nomor HP Pendamping</label><input id="f-hp-pendamping" type="tel" maxlength="20" required value="' + (record ? esc(record.nomorHpPendamping || '') : '') + '" placeholder="Nomor HP pendamping">' +
    '<div class="err" id="f-err" role="alert"></div><button class="btn" id="f-ok">Simpan</button><button class="btn ghost" id="f-no">Batal</button>';
  document.getElementById('modal').classList.add('show');
  document.getElementById('f-no').onclick = closeM;
  document.getElementById('f-ok').onclick = async function () {
    var name = document.getElementById('f-nama').value.trim();
    var birth = document.getElementById('f-lahir').value;
    var nik = document.getElementById('f-nik').value.trim();
    var address = document.getElementById('f-alamat').value.trim();
    var phone = document.getElementById('f-hp').value.trim();
    var guardian = document.getElementById('f-pendamping').value.trim();
    var guardianPhone = document.getElementById('f-hp-pendamping').value.trim();
    var gender = document.getElementById('f-gender').value;
    var error = document.getElementById('f-err');
    if (!name || !birth || !nik || !address || !phone || !guardian || !guardianPhone) {
      error.textContent = 'Lengkapi nama, NIK, tanggal lahir, alamat, dan kontak lansia serta pendamping.';
      return;
    }
    if (!/^\d{16}$/.test(nik)) { error.textContent = 'NIK harus terdiri dari 16 angka.'; return; }
    if (new Date(birth + 'T00:00:00') > new Date(iso(today) + 'T00:00:00')) { error.textContent = 'Tanggal lahir tidak valid.'; return; }
    if (tahun(birth) < 59) { error.textContent = 'Lansia minimal berumur 59 tahun.'; return; }
    var button = document.getElementById('f-ok');
    button.disabled = true;
    error.textContent = 'Menyimpan data...';
    try {
      var payload = {
        nama: name,
        lahir: birth,
        nik: nik,
        gender: gender || null,
        alamat: address,
        nomorHp: phone,
        namaPendamping: guardian,
        nomorHpPendamping: guardianPhone
      };
      if (record) payload.id = record.id;
      var saved = await requestLansia(payload);
      var existingIndex = db.lansia.findIndex(function (person) { return person.id === saved.id; });
      if (existingIndex < 0) db.lansia.push(saved);
      else db.lansia[existingIndex] = saved;
      save();
      closeM();
      render();
    } catch (requestError) {
      error.textContent = requestError.message;
      button.disabled = false;
    }
  };
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
    ' akan dipindahkan ke Riwayat dan tidak lagi muncul di daftar aktif.</p><p>Apakah Anda yakin ingin melanjutkan?</p></div>' +
    '<button type="button" class="btn" data-confirm-transfer="' + kind + '" data-id="' + id + '">' +
    (child ? 'Ya, Luluskan' : 'Ya, Selesaikan') + '</button>' +
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
  } catch (error) {
    lansiaApiError = error.message;
  }
  render();
}

function closeM() { document.getElementById('modal').classList.remove('show'); }

document.addEventListener('click', function (event) {
  var target = event.target.closest('[data-t]');
  if (target) { screen = 'main'; tab = target.dataset.t; render(); return; }
  target = event.target.closest('[data-r]');
  if (target) { rsub = target.dataset.r; render(); return; }
  target = event.target.closest('[data-child-id]');
  if (target) { selectedChildId = Number(target.dataset.childId); formReturn = 'main'; screen = 'childDetail'; render(); window.scrollTo(0, 0); return; }
  target = event.target.closest('[data-elder-id]');
  if (target) { selectedElderId = Number(target.dataset.elderId); screen = 'elderDetail'; render(); window.scrollTo(0, 0); return; }
  if (event.target.closest('[data-graduate-profile]')) {
    confirmHistoryTransfer('balita', Number(event.target.closest('[data-graduate-profile]').dataset.graduateProfile));
    return;
  }
  if (event.target.closest('[data-edit-child]')) { openChildForm(true); return; }
  if (event.target.closest('[data-back]')) {
    screen = screen === 'childForm' ? formReturn : 'main';
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (event.target.closest('[data-retry]')) { syncBalita(); syncLansia(); return; }
  if (event.target.id === 'child-save') { saveChild(); return; }
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
