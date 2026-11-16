# Pemantauan tumbuh kembang

Proyek ini tidak memakai Laravel atau `artisan`; gunakan MySQL Laragon. Backup database sebelum menjalankan perubahan skema.

Untuk instalasi baru:

1. Buat skema dasar dengan `database.sql`.
2. Jalankan migration SQL yang belum diterapkan sesuai urutan nama file, termasuk tabel pengukuran/catatan lansia, kolom biodata balita, dan indeks tanggal kehadiran bulanan.
3. Jalankan `check_duplicates.sql` untuk memeriksa data sebelum migration pencegah duplikasi.
4. Selesaikan duplikasi biodata yang dilaporkan, lalu jalankan `migrations/2026_11_15_prevent_duplicate_data.sql`.
5. Opsional: jalankan `seeders/tumbuh_kembang_demo.sql` untuk menambahkan contoh balita dan pengukuran.

Untuk database yang sudah ada, jangan jalankan ulang `database.sql` sebagai migration. Terapkan hanya migration yang belum diterapkan, berurutan; setelah migration lama selesai, jalankan `check_duplicates.sql`, selesaikan duplikasi biodata yang ditemukan, lalu jalankan `migrations/2026_11_15_prevent_duplicate_data.sql`. File pemeriksaan hanya membaca data. Migration baru merapikan pengukuran, Vitamin A, dan catatan kunjungan yang identik, lalu menambahkan indeks unik.

Pastikan NIK yang tidak diisi disimpan sebagai `NULL`, bukan string kosong, sebelum menambahkan indeks unik NIK.

Skrip dapat dibuka dan dijalankan melalui HeidiSQL atau phpMyAdmin. Endpoint tumbuh kembang ada di `routes/tumbuh-kembang.php`, sedangkan statistik beranda dihitung oleh `api-statistik.php`. Halaman detail saat ini memakai Balita di `localStorage` dan menyelaraskan profilnya ke tabel `balita` ketika pemantauan dibuka.
