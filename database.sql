CREATE DATABASE IF NOT EXISTS posyandu_mawar
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE posyandu_mawar;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','kader') NOT NULL DEFAULT 'kader',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (nama, username, password, role)
VALUES (
  'Administrator Posyandu',
  'admin',
  '$2y$10$DnuCptNx19QOkHdc44ttuOgw3PZlabWxCBcY1fo5.cbFI2z4Dccbu',
  'admin'
)
ON DUPLICATE KEY UPDATE
  nama = VALUES(nama),
  password = VALUES(password),
  role = VALUES(role);

CREATE TABLE IF NOT EXISTS balita (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  tanggal_lahir DATE NOT NULL,
  alamat TEXT NULL,
  jenis_kelamin VARCHAR(10) NULL,
  anak_ke SMALLINT UNSIGNED NULL,
  nomor_kk VARCHAR(16) NULL,
  nik VARCHAR(16) NULL,
  nama_ibu VARCHAR(100) NULL,
  nama_ayah VARCHAR(100) NULL,
  imd VARCHAR(10) NULL,
  berat_lahir DECIMAL(5,2) NULL,
  panjang_lahir DECIMAL(5,2) NULL,
  lingkar_kepala_lahir DECIMAL(5,2) NULL,
  lingkar_lengan_lahir DECIMAL(5,2) NULL,
  lulus_manual TINYINT(1) NOT NULL DEFAULT 0,
  nama_ortu VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lansia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  tanggal_lahir DATE NOT NULL,
  alamat VARCHAR(150),
  jenis_kelamin VARCHAR(10) NULL,
  nomor_kk VARCHAR(16) NULL,
  nik VARCHAR(16) NULL,
  nomor_hp VARCHAR(20) NULL,
  nama_pendamping VARCHAR(100) NULL,
  nomor_hp_pendamping VARCHAR(20) NULL,
  status ENUM('aktif','meninggal','selesai') NOT NULL DEFAULT 'aktif',
  tanggal_wafat DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW v_balita AS
SELECT b.*,
  TIMESTAMPDIFF(MONTH, tanggal_lahir, CURDATE()) AS umur_bulan,
  60 - TIMESTAMPDIFF(MONTH, tanggal_lahir, CURDATE()) AS sisa_bulan,
  CASE WHEN TIMESTAMPDIFF(MONTH, tanggal_lahir, CURDATE()) > 59
       THEN 'lulus' ELSE 'aktif' END AS status
FROM balita b;
