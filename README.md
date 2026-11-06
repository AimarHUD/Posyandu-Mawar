<<<<<<< HEAD
# Posyandu Mawar (Laragon)

## Cara menjalankan
1. Salin folder `posyandu-mawar` ke `C:\laragon\www\`
2. Laragon: klik **Start All** (Apache + MySQL)
3. Import `database.sql` ke MySQL melalui HeidiSQL atau phpMyAdmin. File ini membuat database, tabel, dan akun admin awal. Mengimpor ulang file ini akan mengatur ulang password akun `admin` ke password awal di bawah.
4. Buka `http://localhost/posyandu-mawar/`

Login admin awal: username `admin`, password `admin123`.
Alamat alternatif (Auto Virtual Hosts Laragon): `http://posyandu-mawar.test`.

## Tanpa Apache (jika port 80 bentrok)
Pastikan MySQL tetap berjalan. Di Terminal Laragon, dari dalam folder proyek:
    php -S localhost:8000
lalu buka `http://localhost:8000/`.

## Struktur
- `database.sql` : skema database (users, balita, lansia, view v_balita) dan akun admin awal
- `config.php` : koneksi MySQL (default Laragon: root, tanpa password)
- `login.php`, `logout.php`, `auth.php` : sistem login
- `index.php` : aplikasi (wajib login)
- `css/style.css`, `css/login.css`, `js/app.js` : tampilan dan logika

## Catatan
Data balita dan lansia di `js/app.js` masih disimpan di localStorage browser.
Tabel `balita` dan `lansia` sudah siap untuk dihubungkan ke MySQL.
=======
# Posyandu-Mawar
>>>>>>> 7c3fe0f842cad39b84e941348239e233591933c4
