USE posyandu_mawar;

CREATE TABLE IF NOT EXISTS pengukuran_lansia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lansia_id INT NOT NULL,
  jenis ENUM('berat','tinggi','lingkar_perut','tekanan_darah') NOT NULL,
  nilai DECIMAL(7,2) NULL,
  sistolik SMALLINT UNSIGNED NULL,
  diastolik SMALLINT UNSIGNED NULL,
  tanggal_ukur DATE NOT NULL,
  catatan TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pengukuran_lansia_jenis_tanggal (lansia_id, jenis, tanggal_ukur),
  CONSTRAINT fk_pengukuran_lansia
    FOREIGN KEY (lansia_id) REFERENCES lansia(id) ON DELETE CASCADE
);
