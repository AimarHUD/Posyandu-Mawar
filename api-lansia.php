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

  $userStmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
  $userStmt->execute([$_SESSION['user']['id']]);
  if (!$userStmt->fetchColumn()) {
    respondLansia(401, ['error' => 'Sesi login tidak lagi berlaku. Silakan masuk kembali.']);
  }

  $columns = [
    'jenis_kelamin' => 'VARCHAR(10) NULL',
    'nomor_kk' => 'VARCHAR(16) NULL',
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
    if (isset($_GET['visit_notes'])) {
      $id = filter_var(
        is_string($_GET['visit_notes']) ? $_GET['visit_notes'] : null,
        FILTER_VALIDATE_INT
      );
      if (!$id || $id < 1) {
        respondLansia(422, ['error' => 'ID lansia tidak valid.']);
      }
      $stmt = $pdo->prepare('SELECT id FROM lansia WHERE id = ?');
      $stmt->execute([$id]);
      if (!$stmt->fetchColumn()) {
        respondLansia(404, ['error' => 'Data lansia tidak ditemukan.']);
      }
      respondLansia(200, ['data' => fetchLansiaVisitTimeline($pdo, $id)]);
    }

    if (isset($_GET['measurements'])) {
      $id = filter_var(
        is_string($_GET['measurements']) ? $_GET['measurements'] : null,
        FILTER_VALIDATE_INT
      );
      if (!$id || $id < 1) {
        respondLansia(422, ['error' => 'ID lansia tidak valid.']);
      }
      $stmt = $pdo->prepare('SELECT id FROM lansia WHERE id = ?');
      $stmt->execute([$id]);
      if (!$stmt->fetchColumn()) {
        respondLansia(404, ['error' => 'Data lansia tidak ditemukan.']);
      }
      $stmt = $pdo->prepare(
        'SELECT id, jenis, nilai, sistolik, diastolik, tanggal_ukur, catatan
         FROM pengukuran_lansia WHERE lansia_id = ? ORDER BY tanggal_ukur DESC, id DESC'
      );
      $stmt->execute([$id]);
      respondLansia(200, ['data' => $stmt->fetchAll()]);
    }

    $rows = $pdo->query(
      'SELECT id, nama, tanggal_lahir, alamat, status, tanggal_wafat, jenis_kelamin,
              nomor_kk, nik, nomor_hp, nama_pendamping, nomor_hp_pendamping
       FROM lansia ORDER BY id DESC'
    )->fetchAll();
    respondLansia(200, ['data' => array_map('formatLansia', $rows)]);
  }

  if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, PATCH, DELETE');
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

  if (in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'PATCH'], true)) {
    if (isset($input['action'])) {
      header('Allow: POST');
      respondLansia(405, ['error' => 'Metode ubah hanya berlaku untuk biodata lansia.']);
    }
    if (!array_key_exists('id', $input)) {
      respondLansia(422, ['error' => 'ID lansia wajib disertakan untuk mengubah biodata.']);
    }
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

  if (($input['action'] ?? '') === 'measurement') {
    $measurements = saveLansiaMeasurement($pdo, $input);
    respondLansia(200, ['data' => $measurements]);
  }

  if (($input['action'] ?? '') === 'visit_note') {
    $notes = saveLansiaVisitNote($pdo, $input);
    respondLansia(200, ['data' => $notes]);
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
              nomor_kk, nik, nomor_hp, nama_pendamping, nomor_hp_pendamping
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
  $householdNumber = trim((string)($input['nomorKK'] ?? ''));
  $nik = trim((string)($input['nik'] ?? ''));
  $address = trim((string)($input['alamat'] ?? ''));
  $phone = trim((string)($input['nomorHp'] ?? ''));
  $guardian = trim((string)($input['namaPendamping'] ?? ''));
  $guardianPhone = trim((string)($input['nomorHpPendamping'] ?? ''));
  $gender = $input['gender'] ?? null;
  if ($gender === '') {
    $gender = null;
  }
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
  if ($householdNumber !== '' && !preg_match('/^\d{16}$/', $householdNumber)) {
    respondLansia(422, ['error' => 'Nomor KK harus terdiri dari 16 angka.']);
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
    $householdNumber !== '' ? $householdNumber : null,
    $nik !== '' ? $nik : null,
    $phone !== '' ? $phone : null,
    $guardian !== '' ? $guardian : null,
    $guardianPhone !== '' ? $guardianPhone : null,
  ];

  if ($id) {
    $stmt = $pdo->prepare(
      'UPDATE lansia SET nama = ?, tanggal_lahir = ?, alamat = ?, jenis_kelamin = ?,
       nomor_kk = ?, nik = ?, nomor_hp = ?, nama_pendamping = ?, nomor_hp_pendamping = ? WHERE id = ?'
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
       (nama, tanggal_lahir, alamat, jenis_kelamin, nomor_kk, nik, nomor_hp, nama_pendamping, nomor_hp_pendamping)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute($values);
    $id = (int)$pdo->lastInsertId();
  }

  $stmt = $pdo->prepare(
    'SELECT id, nama, tanggal_lahir, alamat, status, tanggal_wafat, jenis_kelamin,
            nomor_kk, nik, nomor_hp, nama_pendamping, nomor_hp_pendamping
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
    'nomorKK' => $row['nomor_kk'],
    'nik' => $row['nik'],
    'nomorHp' => $row['nomor_hp'],
    'namaPendamping' => $row['nama_pendamping'],
    'nomorHpPendamping' => $row['nomor_hp_pendamping'],
  ];
}

function saveLansiaVisitNote(PDO $pdo, array $input): array
{
  $idValue = $input['id'] ?? null;
  $id = filter_var(is_int($idValue) || is_string($idValue) ? $idValue : null, FILTER_VALIDATE_INT);
  $date = is_string($input['tanggal_kunjungan'] ?? null) ? $input['tanggal_kunjungan'] : '';
  $noteValue = $input['catatan'] ?? null;
  if (!$id || $id < 1) {
    respondLansia(422, ['error' => 'ID lansia tidak valid.']);
  }
  if (!is_string($noteValue) || trim($noteValue) === '' || mb_strlen($noteValue, 'UTF-8') > 2000) {
    respondLansia(422, ['error' => 'Catatan kunjungan wajib diisi dan maksimal 2.000 karakter.']);
  }
  $stmt = $pdo->prepare('SELECT tanggal_lahir FROM lansia WHERE id = ?');
  $stmt->execute([$id]);
  $birthDate = $stmt->fetchColumn();
  if (!$birthDate) {
    respondLansia(404, ['error' => 'Data lansia tidak ditemukan.']);
  }
  $parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
  $dateErrors = DateTimeImmutable::getLastErrors();
  if (
    !$parsedDate || ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count'])) ||
    $parsedDate->format('Y-m-d') !== $date || $date > (new DateTimeImmutable('today'))->format('Y-m-d') ||
    $date < $birthDate
  ) {
    respondLansia(422, ['error' => 'Tanggal kunjungan tidak valid.']);
  }
  $stmt = $pdo->prepare(
    'INSERT INTO catatan_kunjungan_lansia (lansia_id, tanggal_kunjungan, catatan)
     VALUES (?, ?, ?)'
  );
  $stmt->execute([$id, $date, trim($noteValue)]);
  return fetchLansiaVisitTimeline($pdo, $id);
}

function fetchLansiaVisitTimeline(PDO $pdo, int $id): array
{
  $visits = [];
  $stmt = $pdo->prepare(
    'SELECT jenis, nilai, sistolik, diastolik, tanggal_ukur, catatan
     FROM pengukuran_lansia WHERE lansia_id = ?
     ORDER BY tanggal_ukur DESC, id DESC'
  );
  $stmt->execute([$id]);
  foreach ($stmt->fetchAll() as $measurement) {
    $date = $measurement['tanggal_ukur'];
    if (!isset($visits[$date])) {
      $visits[$date] = [
        'tanggal_kunjungan' => $date,
        'measurements' => [],
        'catatan' => [],
      ];
    }
    $visits[$date]['measurements'][] = [
      'jenis' => $measurement['jenis'],
      'nilai' => $measurement['nilai'],
      'sistolik' => $measurement['sistolik'],
      'diastolik' => $measurement['diastolik'],
      'catatan' => $measurement['catatan'],
    ];
  }

  $stmt = $pdo->prepare(
    'SELECT tanggal_kunjungan, catatan
     FROM catatan_kunjungan_lansia WHERE lansia_id = ?
     ORDER BY tanggal_kunjungan DESC, id DESC'
  );
  $stmt->execute([$id]);
  foreach ($stmt->fetchAll() as $note) {
    $date = $note['tanggal_kunjungan'];
    if (!isset($visits[$date])) {
      $visits[$date] = [
        'tanggal_kunjungan' => $date,
        'measurements' => [],
        'catatan' => [],
      ];
    }
    $visits[$date]['catatan'][] = $note['catatan'];
  }

  krsort($visits);
  return array_values($visits);
}

function saveLansiaMeasurement(PDO $pdo, array $input): array
{
  $idValue = $input['id'] ?? null;
  $id = filter_var(is_int($idValue) || is_string($idValue) ? $idValue : null, FILTER_VALIDATE_INT);
  $kind = is_string($input['jenis'] ?? null) ? $input['jenis'] : '';
  $date = is_string($input['tanggal_ukur'] ?? null) ? $input['tanggal_ukur'] : '';
  $noteValue = $input['catatan'] ?? '';
  if (!$id || $id < 1) {
    throw new InvalidArgumentException('ID lansia tidak valid.');
  }
  $stmt = $pdo->prepare('SELECT tanggal_lahir FROM lansia WHERE id = ?');
  $stmt->execute([$id]);
  $birthDate = $stmt->fetchColumn();
  if (!$birthDate) {
    respondLansia(404, ['error' => 'Data lansia tidak ditemukan.']);
  }
  $parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
  $dateErrors = DateTimeImmutable::getLastErrors();
  if (
    !$parsedDate || ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count'])) ||
    $parsedDate->format('Y-m-d') !== $date || $date > (new DateTimeImmutable('today'))->format('Y-m-d') ||
    $date < $birthDate
  ) {
    throw new InvalidArgumentException('Tanggal pengukuran tidak valid.');
  }
  if (!is_string($noteValue) || mb_strlen($noteValue, 'UTF-8') > 2000) {
    throw new InvalidArgumentException('Catatan maksimal 2.000 karakter.');
  }
  $note = trim($noteValue);
  $value = null;
  $systolic = null;
  $diastolic = null;

  if ($kind === 'tekanan_darah') {
    $systolicValue = $input['sistolik'] ?? null;
    $diastolicValue = $input['diastolik'] ?? null;
    $systolic = filter_var(
      is_int($systolicValue) || is_string($systolicValue) ? $systolicValue : null,
      FILTER_VALIDATE_INT
    );
    $diastolic = filter_var(
      is_int($diastolicValue) || is_string($diastolicValue) ? $diastolicValue : null,
      FILTER_VALIDATE_INT
    );
    if (
      $systolic === false || $diastolic === false || $systolic < 50 || $systolic > 300 ||
      $diastolic < 30 || $diastolic > 200 || $systolic <= $diastolic
    ) {
      throw new InvalidArgumentException('Tekanan sistolik harus 50–300 mmHg dan lebih tinggi dari diastolik 30–200 mmHg.');
    }
  } else {
    $limits = [
      'berat' => [1, 300],
      'tinggi' => [50, 250],
      'lingkar_perut' => [20, 250],
    ];
    if (!isset($limits[$kind])) {
      throw new InvalidArgumentException('Jenis pengukuran tidak valid.');
    }
    $valueInput = $input['nilai'] ?? null;
    $value = filter_var(
      is_int($valueInput) || is_float($valueInput) || is_string($valueInput) ? $valueInput : null,
      FILTER_VALIDATE_FLOAT
    );
    if ($value === false || $value < $limits[$kind][0] || $value > $limits[$kind][1]) {
      throw new InvalidArgumentException(
        'Nilai pengukuran harus antara ' . $limits[$kind][0] . '–' . $limits[$kind][1] . '.'
      );
    }
    $value = round((float)$value, 2);
  }

  $stmt = $pdo->prepare(
    'INSERT INTO pengukuran_lansia
     (lansia_id, jenis, nilai, sistolik, diastolik, tanggal_ukur, catatan)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([$id, $kind, $value, $systolic, $diastolic, $date, $note === '' ? null : $note]);

  $stmt = $pdo->prepare(
    'SELECT id, jenis, nilai, sistolik, diastolik, tanggal_ukur, catatan
     FROM pengukuran_lansia WHERE lansia_id = ? ORDER BY tanggal_ukur DESC, id DESC'
  );
  $stmt->execute([$id]);
  return $stmt->fetchAll();
}
