USE posyandu_mawar;

ALTER TABLE balita
  ADD COLUMN alamat TEXT NULL,
  ADD COLUMN lingkar_lengan_lahir DECIMAL(5,2) NULL;
