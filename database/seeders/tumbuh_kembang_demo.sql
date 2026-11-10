USE posyandu_mawar;

INSERT INTO balita (nama, tanggal_lahir, nama_ortu)
SELECT 'Aisyah Putri', DATE_SUB(CURDATE(), INTERVAL 6 MONTH), 'Ibu Rina'
WHERE NOT EXISTS (SELECT 1 FROM balita WHERE nama = 'Aisyah Putri');

INSERT INTO balita (nama, tanggal_lahir, nama_ortu)
SELECT 'Raka Pratama', DATE_SUB(CURDATE(), INTERVAL 24 MONTH), 'Ibu Sari'
WHERE NOT EXISTS (SELECT 1 FROM balita WHERE nama = 'Raka Pratama');

INSERT INTO pengukuran (balita_id, jenis, nilai, tanggal_ukur, catatan)
SELECT id, 'berat', 7.20, CURDATE(), 'Contoh data awal'
FROM balita
WHERE nama = 'Aisyah Putri'
  AND NOT EXISTS (
    SELECT 1 FROM pengukuran p WHERE p.balita_id = balita.id AND p.jenis = 'berat'
  );

INSERT INTO pengukuran (balita_id, jenis, nilai, cara_ukur, tanggal_ukur, catatan)
SELECT id, 'tinggi', 84.50, 'berdiri', CURDATE(), 'Contoh data awal'
FROM balita
WHERE nama = 'Raka Pratama'
  AND NOT EXISTS (
    SELECT 1 FROM pengukuran p WHERE p.balita_id = balita.id AND p.jenis = 'tinggi'
  );
