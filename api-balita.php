<?php
header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): void
{
  http_response_code($status);
  echo json_encode($body, JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  require __DIR__ . '/config.php';

  if (empty($_SESSION['user'])) {
    respond(401, ['error' => 'Sesi login berakhir. Silakan masuk kembali.']);
  }

  $userStmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
  $userStmt->execute([$_SESSION['user']['id']]);
  if (!$userStmt->fetchColumn()) {
    respond(401, ['error' => 'Sesi login tidak lagi berlaku. Silakan masuk kembali.']);
  }

  $columns = [
    'alamat' => 'TEXT NULL',
    'jenis_kelamin' => 'VARCHAR(10) NULL',
    'anak_ke' => 'SMALLINT UNSIGNED NULL',
    'nomor_kk' => 'VARCHAR(16) NULL',
    'nik' => 'VARCHAR(16) NULL',
    'nama_ibu' => 'VARCHAR(100) NULL',
    'nama_ayah' => 'VARCHAR(100) NULL',
    'imd' => 'VARCHAR(10) NULL',
    'berat_lahir' => 'DECIMAL(5,2) NULL',
    'panjang_lahir' => 'DECIMAL(5,2) NULL',
    'lingkar_kepala_lahir' => 'DECIMAL(5,2) NULL',
    'lingkar_lengan_lahir' => 'DECIMAL(5,2) NULL',
    'lulus_manual' => 'TINYINT(1) NOT NULL DEFAULT 0',
  ];
  $existingColumns = $pdo->query('SHOW COLUMNS FROM balita')->fetchAll(PDO::FETCH_COLUMN);
  foreach ($columns as $name => $definition) {
    if (!in_array($name, $existingColumns, true)) {
      $pdo->exec("ALTER TABLE balita ADD COLUMN {$name} {$definition}");
    }
  }

  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = $pdo->query(
      'SELECT id, nama, tanggal_lahir, alamat, nama_ortu, jenis_kelamin, anak_ke, nomor_kk, nik,
              nama_ibu, nama_ayah, imd,
              berat_lahir, panjang_lahir, lingkar_kepala_lahir, lingkar_lengan_lahir, lulus_manual
       FROM balita ORDER BY id DESC'
    )->fetchAll();
    respond(200, ['data' => array_map('formatBalita', $rows)]);
  }

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Metode permintaan tidak didukung.']);
  }

  $csrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $csrf)) {
    respond(403, ['error' => 'Sesi tidak valid. Muat ulang halaman lalu coba lagi.']);
  }

  $input = json_decode(file_get_contents('php://input'), true);
  if (!is_array($input)) {
    respond(400, ['error' => 'Data yang dikirim tidak valid.']);
  }

  if (($input['action'] ?? '') === 'lulus') {
    $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id || $id < 1) {
      respond(422, ['error' => 'ID balita tidak valid.']);
    }
    $stmt = $pdo->prepare('UPDATE balita SET lulus_manual = 1 WHERE id = ?');
    $stmt->execute([$id]);
    $stmt = $pdo->prepare('SELECT id FROM balita WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetchColumn()) {
      respond(404, ['error' => 'Data balita tidak ditemukan.']);
    }
    $stmt = $pdo->prepare(
      'SELECT id, nama, tanggal_lahir, alamat, nama_ortu, jenis_kelamin, anak_ke, nomor_kk, nik,
              nama_ibu, nama_ayah, imd,
              berat_lahir, panjang_lahir, lingkar_kepala_lahir, lingkar_lengan_lahir, lulus_manual
       FROM balita WHERE id = ?'
    );
    $stmt->execute([$id]);
    respond(200, ['data' => formatBalita($stmt->fetch())]);
  }

  $name = trim((string)($input['nama'] ?? ''));
  $birthDate = (string)($input['lahir'] ?? '');
  $address = trim((string)($input['alamat'] ?? ''));
  $gender = $input['gender'] ?? null;
  $childOrder = $input['anakKe'] ?? null;
  $householdNumber = trim((string)($input['nomorKK'] ?? ''));
  $nik = trim((string)($input['nik'] ?? ''));
  $motherName = trim((string)($input['namaIbu'] ?? ''));
  $fatherName = trim((string)($input['namaAyah'] ?? ''));
  $hasLegacyParent = array_key_exists('ortu', $input);
  $legacyParent = trim((string)($input['ortu'] ?? ''));
  $imd = $input['imd'] ?? null;

  $date = DateTimeImmutable::createFromFormat('!Y-m-d', $birthDate);
  $dateErrors = DateTimeImmutable::getLastErrors();
  if (
    $name === '' || mb_strlen($name, 'UTF-8') > 100 || !$date ||
    ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count'])) ||
    $date->format('Y-m-d') !== $birthDate || $date > new DateTimeImmutable('today')
  ) {
    respond(422, ['error' => 'Nama dan tanggal lahir yang valid wajib diisi.']);
  }
  if ($gender !== null && !in_array($gender, ['Laki-laki', 'Perempuan'], true)) {
    respond(422, ['error' => 'Jenis kelamin tidak valid.']);
  }
  if ($childOrder !== null && (!filter_var($childOrder, FILTER_VALIDATE_INT) || (int)$childOrder < 1 || (int)$childOrder > 99)) {
    respond(422, ['error' => 'Urutan anak harus berupa angka mulai dari 1.']);
  }
  if ($nik !== '' && !preg_match('/^\d{16}$/', $nik)) {
    respond(422, ['error' => 'NIK harus terdiri dari 16 angka.']);
  }
  if ($householdNumber !== '' && !preg_match('/^\d{16}$/', $householdNumber)) {
    respond(422, ['error' => 'Nomor KK harus terdiri dari 16 angka.']);
  }
  if (mb_strlen($motherName, 'UTF-8') > 100 || mb_strlen($fatherName, 'UTF-8') > 100) {
    respond(422, ['error' => 'Nama ibu dan ayah maksimal 100 karakter.']);
  }
  if (mb_strlen($legacyParent, 'UTF-8') > 100) {
    respond(422, ['error' => 'Nama orang tua/wali lama maksimal 100 karakter.']);
  }
  if (mb_strlen($address, 'UTF-8') > 16000) {
    respond(422, ['error' => 'Alamat terlalu panjang.']);
  }
  if ($imd !== null && !in_array($imd, ['Ya', 'Tidak'], true)) {
    respond(422, ['error' => 'Pilihan IMD tidak valid.']);
  }

  $measurements = [];
  foreach (['beratLahir', 'panjangLahir', 'lingkarKepala', 'lingkarLenganLahir'] as $field) {
    $value = $input[$field] ?? null;
    if ($value === '' || $value === null) {
      $measurements[] = null;
      continue;
    }
    if (!is_numeric($value) || (float)$value < 0 || (float)$value > 999.99) {
      respond(422, ['error' => 'Ukuran saat lahir harus berupa angka yang valid.']);
    }
    $measurements[] = (float)$value;
  }

  $values = [
    $name,
    $birthDate,
    $address !== '' ? $address : null,
    $gender,
    $childOrder !== null && $childOrder !== '' ? (int)$childOrder : null,
    $householdNumber !== '' ? $householdNumber : null,
    $nik !== '' ? $nik : null,
    $motherName !== '' ? $motherName : null,
    $fatherName !== '' ? $fatherName : null,
    $imd,
    $measurements[0],
    $measurements[1],
    $measurements[2],
    $measurements[3],
  ];
  $id = null;
  if (array_key_exists('id', $input)) {
    $id = filter_var($input['id'], FILTER_VALIDATE_INT);
    if (!$id || $id < 1) {
      respond(422, ['error' => 'ID balita tidak valid.']);
    }
  }

  if ($id) {
    $legacyParentUpdate = $hasLegacyParent ? ', nama_ortu = ?' : '';
    $stmt = $pdo->prepare(
      'UPDATE balita SET nama = ?, tanggal_lahir = ?, alamat = ?, jenis_kelamin = ?,
       anak_ke = ?, nomor_kk = ?, nik = ?, nama_ibu = ?, nama_ayah = ?, imd = ?, berat_lahir = ?, panjang_lahir = ?,
       lingkar_kepala_lahir = ?, lingkar_lengan_lahir = ?' . $legacyParentUpdate . ' WHERE id = ?'
    );
    $stmt->execute(array_merge(
      $values,
      $hasLegacyParent ? [$legacyParent !== '' ? $legacyParent : null, $id] : [$id]
    ));
    $exists = $pdo->prepare('SELECT id FROM balita WHERE id = ?');
    $exists->execute([$id]);
    if (!$exists->fetchColumn()) {
      respond(404, ['error' => 'Data balita tidak ditemukan.']);
    }
  } else {
    $stmt = $pdo->prepare(
      'INSERT INTO balita
       (nama, tanggal_lahir, alamat, jenis_kelamin, anak_ke, nomor_kk, nik, nama_ibu, nama_ayah, imd,
        berat_lahir, panjang_lahir, lingkar_kepala_lahir, lingkar_lengan_lahir, nama_ortu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute(array_merge($values, [
      $hasLegacyParent && $legacyParent !== '' ? $legacyParent : null,
    ]));
    $id = (int)$pdo->lastInsertId();
  }

  $stmt = $pdo->prepare(
    'SELECT id, nama, tanggal_lahir, alamat, nama_ortu, jenis_kelamin, anak_ke, nomor_kk, nik,
            nama_ibu, nama_ayah, imd,
            berat_lahir, panjang_lahir, lingkar_kepala_lahir, lingkar_lengan_lahir, lulus_manual
     FROM balita WHERE id = ?'
  );
  $stmt->execute([$id]);
  respond(200, ['data' => formatBalita($stmt->fetch())]);
} catch (Throwable $error) {
  error_log('api-balita.php: ' . $error->getMessage());
  respond(500, ['error' => 'Terjadi kesalahan saat mengakses data balita. Periksa koneksi database.']);
}

function formatBalita(array $row): array
{
  return [
    'id' => (int)$row['id'],
    'nama' => $row['nama'],
    'lahir' => $row['tanggal_lahir'],
    'alamat' => $row['alamat'],
    'ortu' => $row['nama_ortu'],
    'nomorKK' => $row['nomor_kk'],
    'gender' => $row['jenis_kelamin'],
    'anakKe' => $row['anak_ke'] !== null ? (int)$row['anak_ke'] : null,
    'nik' => $row['nik'],
    'namaIbu' => $row['nama_ibu'],
    'namaAyah' => $row['nama_ayah'],
    'imd' => $row['imd'],
    'beratLahir' => $row['berat_lahir'],
    'panjangLahir' => $row['panjang_lahir'],
    'lingkarKepala' => $row['lingkar_kepala_lahir'],
    'lingkarLenganLahir' => $row['lingkar_lengan_lahir'],
    'lulusManual' => (bool)$row['lulus_manual'],
  ];
}
