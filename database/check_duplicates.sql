-- Jalankan SEBELUM migrasi 2026_11_15_prevent_duplicate_data.sql.
-- Semua query di sini hanya MEMBACA data (tidak mengubah apa pun).
USE posyandu_mawar;

-- 1. Balita terdaftar ganda (nama + tanggal lahir sama)
SELECT nama, tanggal_lahir, COUNT(*) AS jumlah, GROUP_CONCAT(id ORDER BY id) AS daftar_id
FROM balita GROUP BY nama, tanggal_lahir HAVING COUNT(*) > 1;

-- 2. Balita dengan NIK sama
SELECT nik, COUNT(*) AS jumlah, GROUP_CONCAT(id ORDER BY id) AS daftar_id
FROM balita WHERE nik IS NOT NULL AND nik <> '' GROUP BY nik HAVING COUNT(*) > 1;

-- 3. Lansia terdaftar ganda (nama + tanggal lahir sama)
SELECT nama, tanggal_lahir, COUNT(*) AS jumlah, GROUP_CONCAT(id ORDER BY id) AS daftar_id
FROM lansia GROUP BY nama, tanggal_lahir HAVING COUNT(*) > 1;

-- 4. Lansia dengan NIK sama
SELECT nik, COUNT(*) AS jumlah, GROUP_CONCAT(id ORDER BY id) AS daftar_id
FROM lansia WHERE nik IS NOT NULL AND nik <> '' GROUP BY nik HAVING COUNT(*) > 1;

-- 5. Pengukuran ganda (orang + jenis + tanggal sama) yang akan dirapikan migrasi
SELECT balita_id, jenis, tanggal_ukur, COUNT(*) AS jumlah
FROM pengukuran GROUP BY balita_id, jenis, tanggal_ukur HAVING COUNT(*) > 1;
SELECT lansia_id, jenis, tanggal_ukur, COUNT(*) AS jumlah
FROM pengukuran_lansia GROUP BY lansia_id, jenis, tanggal_ukur HAVING COUNT(*) > 1;
