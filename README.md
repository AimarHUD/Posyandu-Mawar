# Posyandu Mawar (Laragon)

## Cara menjalankan
1. Salin folder `posyandu-mawar` ke `C:\laragon\www\`
2. Laragon: klik **Start All** (Apache + MySQL)
3. Import `database.sql` ke MySQL melalui HeidiSQL atau phpMyAdmin. File ini membuat database, tabel, dan akun admin awal. Mengimpor ulang file ini akan mengatur ulang password akun `admin` ke password awal di bawah.
4. Setelah itu, pilih database `posyandu_mawar` dan jalankan `database/migrations/2026_11_09_create_tumbuh_kembang_tables.sql` untuk membuat tabel pengukuran dan Vitamin A.
5. Buka `http://localhost/posyandu-mawar/`

Login admin awal: username `admin`, password `admin123`.
Alamat alternatif (Auto Virtual Hosts Laragon): `http://posyandu-mawar.test`.

## Tanpa Apache (jika port 80 bentrok)
Pastikan MySQL tetap berjalan. Di Terminal Laragon, dari dalam folder proyek:
    php -S localhost:8000
lalu buka `http://localhost:8000/`.

## Struktur
- `database.sql` : skema database (users, balita, lansia, view v_balita) dan akun admin awal
- `database/migrations/2026_11_09_create_tumbuh_kembang_tables.sql` : tabel pengukuran dan Vitamin A
- `config.php` : koneksi MySQL (default Laragon: root, tanpa password)
- `api-balita.php`, `api-lansia.php` : memuat dan menyimpan biodata balita dan lansia ke MySQL
- `routes/tumbuh-kembang.php` : API untuk pengukuran, grafik, Vitamin A, dan catatan kunjungan balita
- `controllers/`, `models/` : logika data tumbuh kembang balita
- `login.php`, `logout.php`, `auth.php` : sistem login
- `index.php` : aplikasi (wajib login)
- `css/style.css`, `css/login.css`, `js/app.js`, `js/growth.js` : tampilan dan logika

## Catatan
Data balita dan lansia disimpan di MySQL. Data tumbuh kembang balita memerlukan
migrasi yang tercantum di atas; jika tabel belum tersedia, jalankan migrasi
sebelum membuka halaman pengukuran.
