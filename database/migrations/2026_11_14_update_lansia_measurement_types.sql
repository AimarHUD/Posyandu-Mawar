USE posyandu_mawar;

DELETE FROM pengukuran_lansia WHERE jenis = 'tinggi';

ALTER TABLE pengukuran_lansia
  MODIFY jenis ENUM(
    'berat',
    'lingkar_perut',
    'tekanan_darah',
    'kolesterol',
    'asam_urat',
    'gula_darah'
  ) NOT NULL;
