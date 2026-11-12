USE posyandu_mawar;

CREATE TABLE IF NOT EXISTS catatan_kunjungan_lansia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lansia_id INT NOT NULL,
  tanggal_kunjungan DATE NOT NULL,
  catatan TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_catatan_kunjungan_lansia_tanggal (lansia_id, tanggal_kunjungan),
  CONSTRAINT fk_catatan_kunjungan_lansia
    FOREIGN KEY (lansia_id) REFERENCES lansia(id) ON DELETE CASCADE
);
