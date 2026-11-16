USE posyandu_mawar;

-- PERINGATAN: backup database dulu (mysqldump posyandu_mawar > backup.sql).
-- Jalankan database/check_duplicates.sql lebih dulu. Jika query 1-4 di sana
-- menampilkan baris, gabungkan/hapus data ganda itu secara manual SEBELUM
-- menjalankan file ini, karena index UNIQUE NIK di bawah akan gagal jika masih ada NIK kembar.

-- 1. Rapikan pengukuran ganda: untuk orang + jenis + tanggal yang sama, simpan baris TERBARU
--    (id terbesar). Ini sama dengan baris yang sejak awal dipakai oleh ekspor Excel.
DELETE p FROM pengukuran p
JOIN pengukuran newer
  ON newer.balita_id = p.balita_id AND newer.jenis = p.jenis
 AND newer.tanggal_ukur = p.tanggal_ukur AND newer.id > p.id;

DELETE p FROM pengukuran_lansia p
JOIN pengukuran_lansia newer
  ON newer.lansia_id = p.lansia_id AND newer.jenis = p.jenis
 AND newer.tanggal_ukur = p.tanggal_ukur AND newer.id > p.id;

-- 2. Rapikan Vitamin A ganda (kapsul + tanggal pemberian sama) dan catatan kunjungan yang persis sama.
DELETE v FROM vitamin_a v
JOIN vitamin_a newer
  ON newer.balita_id = v.balita_id AND newer.jenis_kapsul = v.jenis_kapsul
 AND newer.tanggal_pemberian = v.tanggal_pemberian AND newer.id > v.id;

DELETE c FROM catatan_kunjungan_lansia c
JOIN catatan_kunjungan_lansia newer
  ON newer.lansia_id = c.lansia_id AND newer.tanggal_kunjungan = c.tanggal_kunjungan
 AND newer.catatan = c.catatan AND newer.id > c.id;

-- 3. Kunci di tingkat database agar duplikat tidak bisa masuk walaupun dari dua pengguna sekaligus.
--    Aman dijalankan ulang: index yang sudah ada dilewati.
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'pengukuran' AND index_name = 'uq_pengukuran_balita_jenis_tanggal') = 0,
  'ALTER TABLE pengukuran ADD UNIQUE KEY uq_pengukuran_balita_jenis_tanggal (balita_id, jenis, tanggal_ukur)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'pengukuran_lansia' AND index_name = 'uq_pengukuran_lansia_jenis_tanggal') = 0,
  'ALTER TABLE pengukuran_lansia ADD UNIQUE KEY uq_pengukuran_lansia_jenis_tanggal (lansia_id, jenis, tanggal_ukur)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'vitamin_a' AND index_name = 'uq_vitamin_a_balita_jenis_tanggal') = 0,
  'ALTER TABLE vitamin_a ADD UNIQUE KEY uq_vitamin_a_balita_jenis_tanggal (balita_id, jenis_kapsul, tanggal_pemberian)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'balita' AND index_name = 'uq_balita_nik') = 0,
  'ALTER TABLE balita ADD UNIQUE KEY uq_balita_nik (nik)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'lansia' AND index_name = 'uq_lansia_nik') = 0,
  'ALTER TABLE lansia ADD UNIQUE KEY uq_lansia_nik (nik)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
