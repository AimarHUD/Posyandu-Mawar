# Posyandu Mawar (Laragon)

## Cara menjalankan
1. Salin folder `posyandu-mawar` ke `C:\laragon\www\`
2. Laragon: klik **Start All** (Apache + MySQL)
3. Import `database.sql` ke MySQL melalui HeidiSQL atau phpMyAdmin. File ini membuat database, tabel, dan akun admin awal. Mengimpor ulang file ini akan mengatur ulang password akun `admin` ke password awal di bawah.
4. Setelah itu, pilih database `posyandu_mawar` dan jalankan `database/migrations/2026_11_09_create_tumbuh_kembang_tables.sql` untuk membuat tabel pengukuran dan Vitamin A.
5. Jalankan `database/migrations/2026_11_12_create_lansia_measurements.sql` untuk membuat tabel pengukuran lansia.
6. Jalankan `database/migrations/2026_11_12_create_lansia_visit_notes.sql` untuk membuat tabel catatan kunjungan lansia.
7. Buka `http://localhost/posyandu-mawar/`

Login admin awal: username `admin`, password `admin123`.
Alamat alternatif (Auto Virtual Hosts Laragon): `http://posyandu-mawar.test`.

## Tanpa Apache (jika port 80 bentrok)
Pastikan MySQL tetap berjalan. Di Terminal Laragon, dari dalam folder proyek:
    php -S localhost:8000
lalu buka `http://localhost:8000/`.

## Struktur
- `database.sql` : skema database (users, balita, lansia, view v_balita) dan akun admin awal
- `database/migrations/2026_11_09_create_tumbuh_kembang_tables.sql` : tabel pengukuran dan Vitamin A
- `database/migrations/2026_11_12_create_lansia_measurements.sql` : tabel riwayat pengukuran lansia
- `database/migrations/2026_11_12_create_lansia_visit_notes.sql` : tabel catatan kunjungan lansia
- `config.php` : koneksi MySQL (default Laragon: root, tanpa password)
- `api-balita.php`, `api-lansia.php` : memuat dan menyimpan biodata serta pengukuran lansia ke MySQL
- `export.php` : mengunduh file Excel balita atau lansia berdasarkan tanggal pertemuan, hanya berisi peserta yang diukur
- `routes/tumbuh-kembang.php` : API untuk pengukuran, Vitamin A, dan catatan kunjungan balita
- `controllers/`, `models/` : logika data tumbuh kembang balita
- `login.php`, `logout.php`, `auth.php` : sistem login
- `index.php` : aplikasi (wajib login)
- `css/style.css`, `css/login.css`, `js/app.js`, `js/growth.js` : tampilan dan logika

## Catatan
Data balita dan lansia disimpan di MySQL. Data tumbuh kembang balita memerlukan
migrasi yang tercantum di atas; jika tabel belum tersedia, jalankan migrasi
sebelum membuka halaman pengukuran. Riwayat berat badan, tinggi badan, lingkar
perut, dan tekanan darah lansia serta catatan kunjungannya memerlukan migrasi lansia
yang tercantum di atas.
Tanggal kunjungan pengukuran ditetapkan sekali dari daftar pengukuran balita atau
lansia dan digunakan kembali untuk setiap hasil yang disimpan pada kunjungan itu.
Detail lansia dapat berpindah antara Profil, Pengukuran, dan Catatan Kunjungan
melalui tab atau gestur geser horizontal.
Daftar balita dan lansia diurutkan alfabetis. Ekspor Excel tersedia di Beranda
dalam file `.xlsx` terpisah untuk balita dan lansia, berdasarkan tanggal pertemuan
yang dipilih. Hanya peserta dengan pengukuran pada tanggal tersebut yang diekspor;
ekspor membutuhkan ekstensi PHP `zip`.
