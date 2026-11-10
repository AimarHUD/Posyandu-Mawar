USE posyandu_mawar;

CREATE TABLE IF NOT EXISTS pengukuran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  balita_id INT NOT NULL,
  jenis ENUM('berat','tinggi','lingkar_kepala','lila') NOT NULL,
  nilai DECIMAL(6,2) NOT NULL,
  cara_ukur ENUM('berbaring','berdiri') NULL,
  tanggal_ukur DATE NOT NULL,
  catatan TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pengukuran_balita_jenis_tanggal (balita_id, jenis, tanggal_ukur),
  CONSTRAINT fk_pengukuran_balita
    FOREIGN KEY (balita_id) REFERENCES balita(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vitamin_a (
  id INT AUTO_INCREMENT PRIMARY KEY,
  balita_id INT NOT NULL,
  jenis_kapsul ENUM('biru','merah') NOT NULL,
  sudah_diberikan BOOLEAN NOT NULL DEFAULT FALSE,
  tanggal_pemberian DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vitamin_a_balita_jenis_tanggal (balita_id, jenis_kapsul, tanggal_pemberian),
  CONSTRAINT fk_vitamin_a_balita
    FOREIGN KEY (balita_id) REFERENCES balita(id) ON DELETE CASCADE
);
