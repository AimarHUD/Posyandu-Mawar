var db = {balita: [], lansia: []};
var csrf = '';
var tab = 'home';
var rsub = 'balita';
var today = new Date();

function esc(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character];
  });
}

function iso(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function showError(message) {
  var error = document.getElementById('app-error');
  error.textContent = message;
  error.hidden = false;
}

function clearError() {
  var error = document.getElementById('app-error');
  error.textContent = '';
  error.hidden = true;
}

async function request(method, data) {
  var options = {method: method, headers: {}};
  if (method === 'POST') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(Object.assign({csrf: csrf}, data));
  }

  var response = await fetch('api.php', options);
  var result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error('Server mengirim respons yang tidak dapat dibaca.');
  }
  if (!response.ok) {
    throw new Error(result.error || 'Permintaan gagal diproses.');
  }
  return result;
}

async function reloadData() {
  var result = await request('GET');
  csrf = result.csrf;
  db = {balita: result.balita, lansia: result.lansia};
}

function bulan(birthDate) {
  var birth = new Date(birthDate + 'T00:00:00');
  var months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  return Math.max(months, 0);
}

function tahun(birthDate) {
  var birth = new Date(birthDate + 'T00:00:00');
  var years = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) years--;
  return years;
}

function lulus(record) {
  return bulan(record.lahir) > 59;
}

function sisa(record) {
  return Math.max(0, 60 - bulan(record.lahir));
}

function umurTxt(months) {
  return months >= 12 ? Math.floor(months / 12) + ' th ' + (months % 12) + ' bln' : months + ' bln';
}

function aktifB() {
  return db.balita.filter(function (record) { return !lulus(record); });
}

function lulusB() {
  return db.balita.filter(lulus);
}

function aktifL() {
  return db.lansia.filter(function (record) { return !record.wafat; });
}

function wafatL() {
  return db.lansia.filter(function (record) { return record.wafat; });
}

function notif() {
  return aktifB().filter(function (record) { return sisa(record) <= 3; });
}

function render() {
  var view = document.getElementById('view');
  var html = '';
  var fab = document.getElementById('fab');
  fab.style.display = (tab === 'home' || tab === 'riwayat') ? 'none' : 'block';

  if (tab === 'home') {
    var notifications = notif();
    html += '<div class="grid"><div class="stat"><b>' + aktifB().length + '</b><span>Balita aktif (0-59 bln)</span></div><div class="stat"><b>' + aktifL().length + '</b><span>Lansia aktif (59+ th)</span></div><div class="stat"><b>' + lulusB().length + '</b><span>Balita lulus (tersimpan)</span></div><div class="stat"><b>' + wafatL().length + '</b><span>Lansia riwayat</span></div></div>';
    html += '<h2>🔔 Notifikasi</h2>';
    html += notifications.length
      ? notifications.map(function (record) {
        return '<div class="alert"><b>' + esc(record.nama) + '</b> berumur ' + umurTxt(bulan(record.lahir)) + '. Akan keluar dari sistem balita dalam ' + sisa(record) + ' bulan.</div>';
      }).join('')
      : '<div class="empty">Belum ada balita yang mendekati usia keluar.</div>';
    html += '<h2>Tentang</h2><div class="stat" style="font-size:13px;color:var(--muted)">Balita dicatat sampai 59 bulan, lalu otomatis lulus dan datanya tetap tersimpan. Lansia dimulai dari umur 59 tahun dan keluar dari daftar aktif dengan ceklis meninggal.</div>';
  }

  if (tab === 'balita') {
    html += '<h2 style="margin-top:0">Daftar Balita Aktif</h2>';
    html += aktifB().length ? aktifB().map(function (record) {
      var remaining = sisa(record);
      return '<div class="item"><div class="av">👶</div><div class="info"><b>' + esc(record.nama) + '</b><small>' + umurTxt(bulan(record.lahir)) + ' · Ortu: ' + esc(record.ortu || '-') + '</small></div>' + (remaining <= 3 ? '<span class="badge warn">Keluar ' + remaining + ' bln</span>' : '<span class="badge">Aktif</span>') + '<div class="item-actions"><button class="item-action" data-edit="balita" data-id="' + record.id + '" aria-label="Edit data ' + esc(record.nama) + '">Edit</button><button class="item-action delete" data-delete="balita" data-id="' + record.id + '" aria-label="Hapus data ' + esc(record.nama) + '">Hapus</button></div></div>';
    }).join('') : '<div class="empty">Belum ada data balita.</div>';
  }

  if (tab === 'lansia') {
    html += '<h2 style="margin-top:0">Daftar Lansia Aktif</h2>';
    html += aktifL().length ? aktifL().map(function (record) {
      return '<div class="item"><div class="av">👵</div><div class="info"><b>' + esc(record.nama) + '</b><small>' + tahun(record.lahir) + ' tahun · ' + esc(record.alamat || '-') + '</small></div><div class="item-actions"><button class="item-action" data-edit="lansia" data-id="' + record.id + '" aria-label="Edit data ' + esc(record.nama) + '">Edit</button><button class="item-action delete" data-delete="lansia" data-id="' + record.id + '" aria-label="Hapus data ' + esc(record.nama) + '">Hapus</button></div><label class="chk"><input type="checkbox" data-w="' + record.id + '">Meninggal</label></div>';
    }).join('') : '<div class="empty">Belum ada data lansia.</div>';
  }

  if (tab === 'riwayat') {
    html += '<div class="seg"><button data-r="balita" class="' + (rsub === 'balita' ? 'on' : '') + '">Balita Lulus</button><button data-r="lansia" class="' + (rsub === 'lansia' ? 'on' : '') + '">Lansia Meninggal</button></div>';
    if (rsub === 'balita') {
      html += lulusB().length ? lulusB().map(function (record) {
        return '<div class="item"><div class="av">🎓</div><div class="info"><b>' + esc(record.nama) + '</b><small>Lahir ' + esc(record.lahir) + ' · Ortu: ' + esc(record.ortu || '-') + '</small></div><span class="badge gray">Lulus</span></div>';
      }).join('') : '<div class="empty">Belum ada balita yang lulus.</div>';
    } else {
      html += wafatL().length ? wafatL().map(function (record) {
        return '<div class="item"><div class="av">🕊️</div><div class="info"><b>' + esc(record.nama) + '</b><small>Wafat ' + esc(record.tglWafat || '-') + ' · ' + esc(record.alamat || '-') + '</small></div><button class="link" data-u="' + record.id + '">Batalkan</button></div>';
      }).join('') : '<div class="empty">Belum ada riwayat.</div>';
    }
  }

  view.innerHTML = html;
  var tabs = [['home', '🏠', 'Beranda'], ['balita', '👶', 'Balita'], ['lansia', '👵', 'Lansia'], ['riwayat', '🗂️', 'Riwayat']];
  document.getElementById('nav').innerHTML = tabs.map(function (item) {
    return '<button data-t="' + item[0] + '" class="' + (tab === item[0] ? 'on' : '') + '"><span>' + item[1] + '</span>' + item[2] + '</button>';
  }).join('');
}

function openForm(kind, id) {
  var sheet = document.getElementById('sheet');
  var isChild = kind === 'balita';
  var record = id ? db[kind].find(function (item) { return Number(item.id) === id; }) : null;
  if (id && !record) return;

  var title = (record ? 'Edit ' : 'Tambah ') + (isChild ? 'Balita' : 'Lansia');
  sheet.innerHTML = '<h2 style="margin:0">' + title + '</h2><label for="f-nama">Nama lengkap</label><input id="f-nama" maxlength="100" value="' + (record ? esc(record.nama) : '') + '"><label for="f-lahir">Tanggal lahir</label><input type="date" id="f-lahir" max="' + iso(today) + '" value="' + (record ? esc(record.lahir) : '') + '"><label for="f-x">' + (isChild ? 'Nama orang tua' : 'Alamat / RT') + '</label><input id="f-x" maxlength="' + (isChild ? '100' : '150') + '" value="' + (record ? esc(isChild ? record.ortu || '' : record.alamat || '') : '') + '"><div class="err" id="f-err" role="alert"></div><button class="btn" id="f-ok">Simpan</button><button class="btn ghost" id="f-no">Batal</button>';
  document.getElementById('modal').classList.add('show');
  document.getElementById('f-no').onclick = closeM;
  document.getElementById('f-ok').onclick = async function () {
    var name = document.getElementById('f-nama').value.trim();
    var birthDate = document.getElementById('f-lahir').value;
    var other = document.getElementById('f-x').value.trim();
    var error = document.getElementById('f-err');
    error.textContent = '';

    if (!name || !birthDate) {
      error.textContent = 'Nama dan tanggal lahir wajib diisi.';
      return;
    }
    if (new Date(birthDate + 'T00:00:00') > new Date(iso(today) + 'T00:00:00')) {
      error.textContent = 'Tanggal lahir tidak valid.';
      return;
    }
    if (isChild && bulan(birthDate) > 59) {
      error.textContent = 'Umur lebih dari 59 bulan, tidak masuk kategori balita.';
      return;
    }
    if (!isChild && tahun(birthDate) < 59) {
      error.textContent = 'Lansia minimal berumur 59 tahun.';
      return;
    }

    try {
      var data = {
        action: 'save',
        kind: kind,
        nama: name,
        lahir: birthDate
      };
      data[isChild ? 'ortu' : 'alamat'] = other;
      if (record) data.id = Number(record.id);
      await request('POST', data);
      await reloadData();
      clearError();
      closeM();
      render();
    } catch (requestError) {
      error.textContent = requestError.message;
    }
  };
}

function closeM() {
  document.getElementById('modal').classList.remove('show');
}

document.addEventListener('click', async function (event) {
  var target = event.target.closest('[data-t]');
  if (target) {
    tab = target.dataset.t;
    render();
    return;
  }

  target = event.target.closest('[data-r]');
  if (target) {
    rsub = target.dataset.r;
    render();
    return;
  }

  target = event.target.closest('[data-edit]');
  if (target) {
    openForm(target.dataset.edit, Number(target.dataset.id));
    return;
  }

  target = event.target.closest('[data-delete]');
  if (target) {
    var kind = target.dataset.delete;
    var record = db[kind].find(function (item) { return Number(item.id) === Number(target.dataset.id); });
    if (record && confirm('Hapus data ' + record.nama + '? Data yang dihapus tidak dapat dikembalikan.')) {
      try {
        await request('POST', {action: 'delete', kind: kind, id: Number(record.id)});
        await reloadData();
        clearError();
        render();
      } catch (requestError) {
        showError(requestError.message);
      }
    }
    return;
  }

  target = event.target.closest('[data-u]');
  if (target) {
    try {
      await request('POST', {action: 'revive', id: Number(target.dataset.u)});
      await reloadData();
      clearError();
      render();
    } catch (requestError) {
      showError(requestError.message);
    }
    return;
  }

  if (event.target.id === 'fab') openForm(tab);
  if (event.target.id === 'modal') closeM();
});

document.addEventListener('change', async function (event) {
  var id = event.target.dataset && event.target.dataset.w;
  if (!id) return;

  var record = db.lansia.find(function (item) { return Number(item.id) === Number(id); });
  if (!record || !confirm('Tandai ' + record.nama + ' sebagai meninggal? Data akan pindah ke Riwayat.')) {
    render();
    return;
  }

  try {
    await request('POST', {action: 'deceased', id: Number(id)});
    await reloadData();
    clearError();
    render();
  } catch (requestError) {
    showError(requestError.message);
    render();
  }
});

reloadData().then(function () {
  render();
}).catch(function (error) {
  showError(error.message);
});
