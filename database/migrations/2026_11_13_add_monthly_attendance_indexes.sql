USE posyandu_mawar;

ALTER TABLE pengukuran
  ADD INDEX idx_pengukuran_tanggal_balita (tanggal_ukur, balita_id);

ALTER TABLE pengukuran_lansia
  ADD INDEX idx_pengukuran_lansia_tanggal (tanggal_ukur, lansia_id);

ALTER TABLE catatan_kunjungan_lansia
  ADD INDEX idx_catatan_kunjungan_tanggal (tanggal_kunjungan, lansia_id);
