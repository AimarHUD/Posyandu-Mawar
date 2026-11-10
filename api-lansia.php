<?php
header('Content-Type: application/json; charset=utf-8');

function respondLansia(int $status, array $body): void
{
  http_response_code($status);
  echo json_encode($body, JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  require __DIR__ . '/config.php';

  if (empty($_SESSION['user'])) {
    respondLansia(401, ['error' => 'Sesi login berakhir. Silakan masuk kembali.']);
  }

  $columns = [
    'jenis_kelamin' => 'VARCHAR(10) NULL',
    'nik' => 'VARCHAR(16) NULL',
    'nomor_hp' => 'VARCHAR(20) NULL',
    'nama_pendamping' => 'VARCHAR(100) NULL',
    'nomor_hp_pendamping' => 'VARCHAR(20) NULL',
  ];
  $existingColumns = $pdo->query('SHOW COLUMNS FROM lansia')->fetchAll(PDO::FETCH_COLUMN);
  foreach ($columns as $name => $definition) {
    if (!in_array($name, $existingColumns, true)) {
      $pdo->exec("ALTER TABLE lansia ADD COLUMN {$name} {$definition}");
    }
  }

  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = $pdo->query(
      'SELECT id, nama, tanggal_lahir, alamat, status, tanggal_wafat, jenis_kelamin,
              nik, nomor_hp, nama_pendamping, nomor_hp_pendamping
       FROM lansia ORDER BY id DESC'
    )->fetchAll();
    respondLansia(200, ['data' => array_map('formatLansia', $rows)]);
  }

  if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'], true)) {
    header('Allow: GET, POST, DELETE');
    respondLansia(405, ['error' => 'Metode permintaan tidak didukung.']);
  }

  $csrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $csrf)) {
    respondLansia(403, ['error' => 'Sesi tidak valid. Muat ulang halaman lalu coba lagi.']);
  }

  $input = json_decode(file_get_contents('php://input'), true);
  if (!is_array($input)) {
    respondLansia(400, ['error' => 'Data yang dikirim tidak valid.']);
  }

  if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id || $id < 1) {
      respondLansia(422, ['error' => 'ID lansia tidak valid.']);
    }
    $stmt = $pdo->prepare('DELETE FROM lansia WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->rowCount()) {
      respondLansia(404, ['error' => 'Data lansia tidak ditemukan.']);
    }
    respondLansia(200, ['data' => true]);
  }

  if (($input['action'] ?? '') === 'status') {
    $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
    $status = $input['status'] ?? '';
    $deathDate = $input['tanggalWafat'] ?? null;
    if (!$id || $id < 1 || !in_array($status, ['aktif', 'meninggal', 'selesai'], true)) {
      respondLansia(422, ['error' => 'Status data lansia tidak valid.']);
    }
    if ($status === 'meninggal') {
      $date = is_string($deathDate) ? DateTimeImmutable::createFromFormat('!Y-m-d', $deathDate) : false;
      $dateErrors = DateTimeImmutable::getLastErrors();
      if (!$date || ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count']))
        || $date->format('Y-m-d') !== $deathDate || $date > new DateTimeImmutable('today')) {
        respondLansia(422, ['error' => 'Tanggal wafat tidak valid.']);
      }
    } else {
      $deathDate = null;
    }
    $stmt = $pdo->prepare('UPDATE lansia SET status = ?, tanggal_wafat = ? WHERE id = ?');
    $stmt->execute([$status, $deathDate, $id]);
    $stmt = $pdo->prepare(
      'SELECT id, nama, tanggal_lahir, alamat, status, tanggal_wafat, jenis_kelamin,
              nik, nomor_hp, nama_pendamping, nomor_hp_pendamping
       FROM lansia WHERE id = ?'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
      respondLansia(404, ['error' => 'Data lansia tidak ditemukan.']);
    }
    respondLansia(200, ['data' => formatLansia($row)]);
  }

  $name = trim((string)($input['nama'] ?? ''));
  $birthDate = (string)($input['lahir'] ?? '');
  $nik = trim((string)($input['nik'] ?? ''));
  $address = trim((string)($input['alamat'] ?? ''));
  $phone = trim((string)($input['nomorHp'] ?? ''));
  $guardian = trim((string)($input['namaPendamping'] ?? ''));
  $guardianPhone = trim((string)($input['nomorHpPendamping'] ?? ''));
  $gender = $input['gender'] ?? null;
  $date = DateTimeImmutable::createFromFormat('!Y-m-d', $birthDate);
  $dateErrors = DateTimeImmutable::getLastErrors();
  if (
    $name === '' || mb_strlen($name, 'UTF-8') > 100 || !$date ||
    ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count'])) ||
    $date->format('Y-m-d') !== $birthDate || $date > new DateTimeImmutable('today')
  ) {
    respondLansia(422, ['error' => 'Nama dan tanggal lahir yang valid wajib diisi.']);
  }
  if ($nik !== '' && !preg_match('/^\d{16}$/', $nik)) {
    respondLansia(422, ['error' => 'NIK harus terdiri dari 16 angka.']);
  }
  if ($gender !== null && !in_array($gender, ['Laki-laki', 'Perempuan'], true)) {
    respondLansia(422, ['error' => 'Jenis kelamin tidak valid.']);
  }
  if (
    mb_strlen($address, 'UTF-8') > 150 || mb_strlen($phone, 'UTF-8') > 20 ||
    mb_strlen($guardian, 'UTF-8') > 100 || mb_strlen($guardianPhone, 'UTF-8') > 20
  ) {
    respondLansia(422, ['error' => 'Panjang alamat atau data kontak melebihi batas.']);
  }

  $id = null;
  if (array_key_exists('id', $input)) {
    $id = filter_var($input['id'], FILTER_VALIDATE_INT);
    if (!$id || $id < 1) {
      respondLansia(422, ['error' => 'ID lansia tidak valid.']);
    }
  }
  $values = [
    $name,
    $birthDate,
    $address !== '' ? $address : null,
    $gender,
    $nik !== '' ? $nik : null,
    $phone !== '' ? $phone : null,
    $guardian !== '' ? $guardian : null,
    $guardianPhone !== '' ? $guardianPhone : null,
  ];

  if ($id) {
    $stmt = $pdo->prepare(
      'UPDATE lansia SET nama = ?, tanggal_lahir = ?, alamat = ?, jenis_kelamin = ?,
       nik = ?, nomor_hp = ?, nama_pendamping = ?, nomor_hp_pendamping = ? WHERE id = ?'
    );
    $stmt->execute(array_merge($values, [$id]));
    $stmt = $pdo->prepare('SELECT id FROM lansia WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetchColumn()) {
      respondLansia(404, ['error' => 'Data lansia tidak ditemukan.']);
    }
  } else {
    $stmt = $pdo->prepare(
      'INSERT INTO lansia
       (nama, tanggal_lahir, alamat, jenis_kelamin, nik, nomor_hp, nama_pendamping, nomor_hp_pendamping)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute($values);
    $id = (int)$pdo->lastInsertId();
  }

  $stmt = $pdo->prepare(
    'SELECT id, nama, tanggal_lahir, alamat, status, tanggal_wafat, jenis_kelamin,
            nik, nomor_hp, nama_pendamping, nomor_hp_pendamping
     FROM lansia WHERE id = ?'
  );
  $stmt->execute([$id]);
  respondLansia(200, ['data' => formatLansia($stmt->fetch())]);
} catch (Throwable $error) {
  error_log('api-lansia.php: ' . $error->getMessage());
  respondLansia(500, ['error' => 'Terjadi kesalahan saat mengakses data lansia. Periksa koneksi database.']);
}

function formatLansia(array $row): array
{
  return [
    'id' => (int)$row['id'],
    'nama' => $row['nama'],
    'lahir' => $row['tanggal_lahir'],
    'alamat' => $row['alamat'],
    'wafat' => $row['status'] === 'meninggal',
    'selesai' => $row['status'] === 'selesai',
    'tglWafat' => $row['tanggal_wafat'],
    'gender' => $row['jenis_kelamin'],
    'nik' => $row['nik'],
    'nomorHp' => $row['nomor_hp'],
    'namaPendamping' => $row['nama_pendamping'],
    'nomorHpPendamping' => $row['nomor_hp_pendamping'],
  ];
}
