# Pemantauan tumbuh kembang

Proyek ini tidak memakai Laravel atau `artisan`; gunakan MySQL Laragon dan jalankan skrip SQL secara berurutan:

1. Pastikan database `posyandu_mawar` sudah dibuat dari `database.sql`.
2. Jalankan migration SQL sesuai urutan nama file, termasuk tabel pengukuran/catatan lansia, kolom biodata balita, dan indeks tanggal kehadiran bulanan.
3. Opsional: jalankan `seeders/tumbuh_kembang_demo.sql` untuk menambahkan contoh balita dan pengukuran.

Skrip dapat dibuka dan dijalankan melalui HeidiSQL atau phpMyAdmin. Endpoint tumbuh kembang ada di `routes/tumbuh-kembang.php`, sedangkan statistik beranda dihitung oleh `api-statistik.php`. Halaman detail saat ini memakai Balita di `localStorage` dan menyelaraskan profilnya ke tabel `balita` ketika pemantauan dibuka.
