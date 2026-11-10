<?php

header('Content-Type: application/json; charset=utf-8');

try {
  require_once __DIR__ . '/../config.php';
} catch (PDOException $error) {
  error_log('Tumbuh kembang database connection error: ' . $error->getMessage());
  http_response_code(503);
  echo json_encode(['error' => 'Database belum dapat dihubungi. Periksa layanan MySQL Laragon.']);
  exit;
}

require_once __DIR__ . '/../controllers/TumbuhKembangController.php';

if (empty($_SESSION['user'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Sesi Anda berakhir. Silakan masuk kembali.']);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  header('Allow: POST');
  echo json_encode(['error' => 'Metode permintaan tidak diizinkan.']);
  exit;
}

$csrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (empty($_SESSION['growth_csrf']) || !hash_equals($_SESSION['growth_csrf'], $csrf)) {
  http_response_code(419);
  echo json_encode(['error' => 'Sesi keamanan tidak valid. Muat ulang halaman.']);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
  http_response_code(400);
  echo json_encode(['error' => 'Data permintaan tidak valid.']);
  exit;
}

try {
  $result = (new TumbuhKembangController($pdo))->handle($input);
  echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (InvalidArgumentException $error) {
  http_response_code(422);
  echo json_encode(['error' => $error->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (PDOException $error) {
  error_log('Tumbuh kembang database error: ' . $error->getMessage());
  http_response_code(503);
  echo json_encode(['error' => 'Data belum dapat disimpan. Periksa koneksi database dan jalankan migrasi tumbuh kembang.']);
} catch (Throwable $error) {
  error_log('Tumbuh kembang request error: ' . $error->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'Terjadi kesalahan saat memproses data. Silakan coba kembali.']);
}
