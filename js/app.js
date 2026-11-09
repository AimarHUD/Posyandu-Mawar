var KEY = 'posyandu-mawar-v1';
var db;
var tab = 'home';
var sub = 'balita';
var rsub = 'balita';
var screen = 'main';
var formReturn = 'main';
var selectedChildId = null;
var today = new Date();
var apiError = '';
var storageError = '';

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

function lulus(child) { return bulan(child.lahir) > 59; }
function sisa(child) { return 60 - bulan(child.lahir); }
function umurTxt(months) { return months >= 12 ? Math.floor(months / 12) + ' th ' + (months % 12) + ' bln' : months + ' bln'; }
function aktifB() { return db.balita.filter(function (child) { return !lulus(child); }); }
function lulusB() { return db.balita.filter(lulus); }
function aktifL() { return db.lansia.filter(function (person) { return !person.wafat; }); }
function wafatL() { return db.lansia.filter(function (person) { return person.wafat; }); }
function notif() { return aktifB().filter(function (child) { return sisa(child) <= 3; }); }

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

function errorNotice() {
  var message = apiError || storageError;
  if (!message) return '';
  return '<div class="alert error-notice" role="alert">' + esc(message) +
    (apiError ? ' <button class="link" data-retry> Coba lagi</button>' : '') + '</div>';
}

function render() {
  var view = document.getElementById('view');
  var app = document.getElementById('app');
  var fab = document.getElementById('fab');
  var nav = document.getElementById('nav');
  app.classList.toggle('child-form-screen', screen === 'childForm');
  app.classList.toggle('child-detail-screen', screen === 'childDetail');
  fab.style.display = screen === 'main' && (tab === 'balita' || tab === 'lansia') ? 'grid' : 'none';
  nav.style.display = screen === 'childForm' ? 'none' : 'flex';

  if (screen === 'childForm') {
    renderChildForm(view);
    return;
  }
  if (screen === 'childDetail') {
    renderChildDetail(view);
    return;
  }

  var html = errorNotice();
  if (tab === 'home') {
    var notifications = notif();
    html += '<div class="grid"><div class="stat"><b>' + aktifB().length + '</b><span>Balita aktif (0-59 bln)</span></div><div class="stat"><b>' + aktifL().length + '</b><span>Lansia aktif (59+ th)</span></div><div class="stat"><b>' + lulusB().length + '</b><span>Balita lulus (tersimpan)</span></div><div class="stat"><b>' + wafatL().length + '</b><span>Lansia riwayat</span></div></div>';
    html += '<h2>🔔 Notifikasi</h2>';
    html += notifications.length ? notifications.map(function (child) {
      return '<div class="alert"><b>' + esc(child.nama) + '</b> berumur ' + umurTxt(bulan(child.lahir)) + '. Akan keluar dari sistem balita dalam ' + sisa(child) + ' bulan.</div>';
    }).join('') : '<div class="empty">Belum ada balita yang mendekati usia keluar.</div>';
    html += '<h2>Tentang</h2><div class="stat" style="font-size:13px;color:var(--muted)">Balita dicatat sampai 59 bulan, lalu otomatis lulus dan datanya tetap tersimpan. Lansia dimulai dari umur 59 tahun dan keluar dari daftar aktif dengan ceklis meninggal.</div>';
  }

  if (tab === 'balita') {
    html += '<h2 style="margin-top:0">Daftar Balita Aktif</h2>';
    html += aktifB().length ? aktifB().map(function (child) {
      var remaining = sisa(child);
      return '<div class="item child-item" role="button" tabindex="0" data-child-id="' + child.id + '" aria-label="Lihat biodata ' + esc(child.nama) + '"><div class="av">👶</div><div class="info"><b class="child-name">' + esc(child.nama) + '</b><small>' + umurTxt(bulan(child.lahir)) + ' · Ortu: ' + esc(child.ortu || '-') + '</small></div>' +
        (remaining <= 3 ? '<span class="badge warn">Keluar ' + remaining + ' bln</span>' : '<span class="badge">Aktif</span>') + '</div>';
    }).join('') : '<div class="empty">Belum ada data balita.</div>';
  }

  if (tab === 'lansia') {
    html += '<h2 style="margin-top:0">Daftar Lansia Aktif</h2>';
    html += aktifL().length ? aktifL().map(function (person) {
      return '<div class="item"><div class="av">👵</div><div class="info"><b>' + esc(person.nama) + '</b><small>' + tahun(person.lahir) + ' tahun · ' + esc(person.alamat || '-') + '</small></div><div class="item-actions"><button class="item-action" data-edit="lansia" data-id="' + person.id + '" aria-label="Edit data ' + esc(person.nama) + '">Edit</button><button class="item-action delete" data-delete="lansia" data-id="' + person.id + '" aria-label="Hapus data ' + esc(person.nama) + '">Hapus</button></div><label class="chk"><input type="checkbox" data-w="' + person.id + '">Meninggal</label></div>';
    }).join('') : '<div class="empty">Belum ada data lansia.</div>';
  }

  if (tab === 'riwayat') {
    html += '<div class="seg"><button data-r="balita" class="' + (rsub === 'balita' ? 'on' : '') + '">Balita Lulus</button><button data-r="lansia" class="' + (rsub === 'lansia' ? 'on' : '') + '">Lansia Meninggal</button></div>';
    if (rsub === 'balita') {
      html += lulusB().length ? lulusB().map(function (child) {
        return '<div class="item child-item" role="button" tabindex="0" data-child-id="' + child.id + '" aria-label="Lihat biodata ' + esc(child.nama) + '"><div class="av">🎓</div><div class="info"><b class="child-name">' + esc(child.nama) + '</b><small>Lahir ' + esc(child.lahir) + ' · Ortu: ' + esc(child.ortu || '-') + '</small></div><span class="badge gray">Lulus</span></div>';
      }).join('') : '<div class="empty">Belum ada balita yang lulus.</div>';
    } else {
      html += wafatL().length ? wafatL().map(function (person) {
        return '<div class="item"><div class="av">🕊️</div><div class="info"><b>' + esc(person.nama) + '</b><small>Wafat ' + esc(person.tglWafat || '-') + ' · ' + esc(person.alamat || '-') + '</small></div><button class="link" data-u="' + person.id + '">Batalkan</button></div>';
      }).join('') : '<div class="empty">Belum ada riwayat.</div>';
    }
  }

  view.innerHTML = html;
  var tabs = [['home', '🏠', 'Beranda'], ['balita', '👶', 'Balita'], ['lansia', '👵', 'Lansia'], ['riwayat', '🗂️', 'Riwayat']];
  nav.innerHTML = tabs.map(function (item) {
    return '<button data-t="' + item[0] + '" class="' + (tab === item[0] ? 'on' : '') + '"><span>' + item[1] + '</span>' + item[2] + '</button>';
  }).join('');
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
    '<div class="child-content"><div class="detail-identity"><span class="av">👶</span><div><small>Data Anak</small><h1>' + esc(child.nama) + '</h1></div></div>' +
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
  sheet.innerHTML = '<h2 style="margin:0">' + (record ? 'Edit Lansia' : 'Tambah Lansia') + '</h2><label for="f-nama">Nama lengkap</label><input id="f-nama" value="' + (record ? esc(record.nama) : '') + '"><label for="f-lahir">Tanggal lahir</label><input type="date" id="f-lahir" max="' + iso(today) + '" value="' + (record ? esc(record.lahir) : '') + '"><label for="f-x">Alamat / RT</label><input id="f-x" value="' + (record ? esc(record.alamat || '') : '') + '"><div class="err" id="f-err"></div><button class="btn" id="f-ok">Simpan</button><button class="btn ghost" id="f-no">Batal</button>';
  document.getElementById('modal').classList.add('show');
  document.getElementById('f-no').onclick = closeM;
  document.getElementById('f-ok').onclick = function () {
    var name = document.getElementById('f-nama').value.trim();
    var birth = document.getElementById('f-lahir').value;
    var address = document.getElementById('f-x').value.trim();
    var error = document.getElementById('f-err');
    if (!name || !birth) { error.textContent = 'Nama dan tanggal lahir wajib diisi.'; return; }
    if (new Date(birth + 'T00:00:00') > new Date(iso(today) + 'T00:00:00')) { error.textContent = 'Tanggal lahir tidak valid.'; return; }
    if (tahun(birth) < 59) { error.textContent = 'Lansia minimal berumur 59 tahun.'; return; }
    if (record) { record.nama = name; record.lahir = birth; record.alamat = address; }
    else db.lansia.push({ id: ++db.id, nama: name, lahir: birth, alamat: address, wafat: false });
    save();
    closeM();
    render();
  };
}

function closeM() { document.getElementById('modal').classList.remove('show'); }

document.addEventListener('click', function (event) {
  var target = event.target.closest('[data-t]');
  if (target) { screen = 'main'; tab = target.dataset.t; render(); return; }
  target = event.target.closest('[data-r]');
  if (target) { rsub = target.dataset.r; render(); return; }
  target = event.target.closest('[data-child-id]');
  if (target) { selectedChildId = Number(target.dataset.childId); formReturn = 'main'; screen = 'childDetail'; render(); window.scrollTo(0, 0); return; }
  if (event.target.closest('[data-edit-child]')) { openChildForm(true); return; }
  if (event.target.closest('[data-back]')) {
    screen = screen === 'childForm' ? formReturn : 'main';
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (event.target.closest('[data-retry]')) { syncBalita(); return; }
  if (event.target.id === 'child-save') { saveChild(); return; }
  target = event.target.closest('[data-edit]');
  if (target) { openForm(target.dataset.edit, Number(target.dataset.id)); return; }
  target = event.target.closest('[data-delete]');
  if (target) {
    var list = db[target.dataset.delete];
    var record = list.find(function (item) { return item.id == target.dataset.id; });
    if (record && confirm('Hapus data ' + record.nama + '? Data yang dihapus tidak dapat dikembalikan.')) {
      db[target.dataset.delete] = list.filter(function (item) { return item.id != target.dataset.id; });
      save();
      render();
    }
    return;
  }
  target = event.target.closest('[data-u]');
  if (target) {
    var person = db.lansia.find(function (item) { return item.id == target.dataset.u; });
    if (person) { person.wafat = false; delete person.tglWafat; save(); render(); }
    return;
  }
  if (event.target.id === 'fab') {
    if (tab === 'balita') openChildForm(false);
    else openForm('lansia');
  }
  if (event.target.id === 'modal') closeM();
});

document.addEventListener('keydown', function (event) {
  var childCard = event.target.closest('[data-child-id]');
  if (childCard && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    childCard.click();
  }
});

document.addEventListener('change', function (event) {
  var personId = event.target.dataset && event.target.dataset.w;
  if (personId) {
    var person = db.lansia.find(function (item) { return item.id == personId; });
    if (person && confirm('Tandai ' + person.nama + ' sebagai meninggal? Data akan pindah ke Riwayat.')) {
      person.wafat = true;
      person.tglWafat = iso(today);
      save();
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
