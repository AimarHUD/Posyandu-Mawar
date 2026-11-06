# Posyandu Mawar (Laragon)

## Cara pasang (3 langkah)
1. Salin folder `posyandu-mawar` ke `C:\laragon\www\`
2. Laragon: klik **Start All** (Apache + MySQL)
3. Buka `http://localhost/posyandu-mawar/setup.php` (membuat database, tabel, dan akun admin, lalu menghapus dirinya sendiri)

Setelah itu buka `http://localhost/posyandu-mawar/` dan login: `admin` / `admin123`.
Alamat alternatif (Auto Virtual Hosts Laragon): `http://posyandu-mawar.test`

## Tanpa Apache (jika port 80 bentrok)
Di Terminal Laragon, dari dalam folder proyek:
    php -S localhost:8000
lalu buka `http://localhost:8000/setup.php`.

## Struktur
- `setup.php` : installer sekali jalan
- `database.sql` : skema database (users, balita, lansia, view v_balita)
- `config.php` : koneksi MySQL (default Laragon: root, tanpa password)
- `login.php`, `logout.php`, `auth.php` : sistem login
- `index.php` : aplikasi (wajib login)
- `css/style.css`, `css/login.css`, `js/app.js` : tampilan dan logika

## Catatan
Data balita dan lansia di `js/app.js` masih disimpan di localStorage browser.
Tabel `balita` dan `lansia` sudah siap untuk dihubungkan ke MySQL.
