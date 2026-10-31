<?php
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): void
{
  http_response_code($status);
  echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function input_text(array $input, string $key, int $maxLength, bool $required = true): string
{
  $value = $input[$key] ?? null;
  if (!$required && ($value === null || $value === '')) {
    return '';
  }
  if (!is_string($value)) {
    throw new InvalidArgumentException('Data yang dikirim tidak valid.');
  }

  $value = trim($value);
  if (($required && $value === '') || mb_strlen($value) > $maxLength) {
    throw new InvalidArgumentException('Data wajib diisi dan tidak boleh melebihi batas karakter.');
  }

  return $value;
}

function input_date(array $input): DateTimeImmutable
{
  $value = $input['lahir'] ?? null;
  if (!is_string($value)) {
    throw new InvalidArgumentException('Tanggal lahir wajib diisi.');
  }

  $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
  $errors = DateTimeImmutable::getLastErrors();
  if (
    !$date
    || ($errors && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))
    || $date->format('Y-m-d') !== $value
    || $date > new DateTimeImmutable('today')
  ) {
    throw new InvalidArgumentException('Tanggal lahir tidak valid.');
  }

  return $date;
}

function input_id(array $input): int
{
  $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
  if ($id === false || $id < 1) {
    throw new InvalidArgumentException('ID data tidak valid.');
  }

  return $id;
}

function age_in_months(DateTimeImmutable $birthDate): int
{
  $age = $birthDate->diff(new DateTimeImmutable('today'));
  return ($age->y * 12) + $age->m;
}

function read_data(PDO $pdo): array
{
  $balita = $pdo->query(
    'SELECT id, nama, tanggal_lahir AS lahir, nama_ortu AS ortu FROM balita ORDER BY nama'
  )->fetchAll();
  $lansia = $pdo->query(
    "SELECT id, nama, tanggal_lahir AS lahir, alamat, status = 'meninggal' AS wafat,
            tanggal_wafat AS tglWafat
     FROM lansia ORDER BY nama"
  )->fetchAll();

  foreach ($lansia as &$record) {
    $record['wafat'] = (bool) $record['wafat'];
  }
  unset($record);

  return ['balita' => $balita, 'lansia' => $lansia];
}

if (empty($_SESSION['user'])) {
  respond(401, ['error' => 'Sesi login berakhir. Silakan masuk kembali.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
  }

  try {
    respond(200, ['csrf' => $_SESSION['csrf']] + read_data($pdo));
  } catch (PDOException $exception) {
    error_log($exception->getMessage());
    respond(500, ['error' => 'Data gagal dimuat dari database.']);
  }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  header('Allow: GET, POST');
  respond(405, ['error' => 'Metode permintaan tidak didukung.']);
}

try {
  $input = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
  if (!is_array($input)) {
    throw new InvalidArgumentException('Format permintaan tidak valid.');
  }
  if (
    empty($_SESSION['csrf'])
    || !is_string($input['csrf'] ?? null)
    || !hash_equals($_SESSION['csrf'], $input['csrf'])
  ) {
    respond(403, ['error' => 'Sesi tidak valid. Muat ulang halaman lalu coba kembali.']);
  }

  $action = $input['action'] ?? '';
  if ($action === 'save') {
    $kind = $input['kind'] ?? '';
    if (!in_array($kind, ['balita', 'lansia'], true)) {
      throw new InvalidArgumentException('Jenis data tidak valid.');
    }

    $name = input_text($input, 'nama', 100);
    $birthDate = input_date($input);
    $other = input_text($input, $kind === 'balita' ? 'ortu' : 'alamat', $kind === 'balita' ? 100 : 150, false);
    if ($kind === 'balita' && age_in_months($birthDate) > 59) {
      throw new InvalidArgumentException('Umur balita tidak boleh lebih dari 59 bulan.');
    }
    if ($kind === 'lansia' && $birthDate->diff(new DateTimeImmutable('today'))->y < 59) {
      throw new InvalidArgumentException('Umur lansia minimal 59 tahun.');
    }

    $id = isset($input['id']) ? input_id($input) : null;
    if ($id !== null) {
      $table = $kind === 'balita' ? 'balita' : 'lansia';
      $statement = $pdo->prepare("SELECT id FROM {$table} WHERE id = ?");
      $statement->execute([$id]);
      if (!$statement->fetch()) {
        respond(404, ['error' => 'Data tidak ditemukan.']);
      }
    }

    if ($kind === 'balita') {
      if ($id === null) {
        $statement = $pdo->prepare(
          'INSERT INTO balita (nama, tanggal_lahir, nama_ortu) VALUES (?, ?, ?)'
        );
        $statement->execute([$name, $birthDate->format('Y-m-d'), $other]);
      } else {
        $statement = $pdo->prepare(
          'UPDATE balita SET nama = ?, tanggal_lahir = ?, nama_ortu = ? WHERE id = ?'
        );
        $statement->execute([$name, $birthDate->format('Y-m-d'), $other, $id]);
      }
    } elseif ($id === null) {
      $statement = $pdo->prepare(
        'INSERT INTO lansia (nama, tanggal_lahir, alamat) VALUES (?, ?, ?)'
      );
      $statement->execute([$name, $birthDate->format('Y-m-d'), $other]);
    } else {
      $statement = $pdo->prepare(
        'UPDATE lansia SET nama = ?, tanggal_lahir = ?, alamat = ? WHERE id = ?'
      );
      $statement->execute([$name, $birthDate->format('Y-m-d'), $other, $id]);
    }
  } elseif ($action === 'delete') {
    $kind = $input['kind'] ?? '';
    if (!in_array($kind, ['balita', 'lansia'], true)) {
      throw new InvalidArgumentException('Jenis data tidak valid.');
    }
    $table = $kind === 'balita' ? 'balita' : 'lansia';
    $statement = $pdo->prepare("DELETE FROM {$table} WHERE id = ?");
    $statement->execute([input_id($input)]);
    if ($statement->rowCount() === 0) {
      respond(404, ['error' => 'Data tidak ditemukan.']);
    }
  } elseif ($action === 'deceased' || $action === 'revive') {
    $status = $action === 'deceased' ? 'meninggal' : 'aktif';
    $date = $action === 'deceased' ? date('Y-m-d') : null;
    $statement = $pdo->prepare(
      'UPDATE lansia SET status = ?, tanggal_wafat = ? WHERE id = ?'
    );
    $statement->execute([$status, $date, input_id($input)]);
    if ($statement->rowCount() === 0) {
      respond(404, ['error' => 'Data lansia tidak ditemukan atau statusnya sudah berubah.']);
    }
  } else {
    throw new InvalidArgumentException('Aksi tidak dikenal.');
  }

  respond(200, ['success' => true]);
} catch (JsonException | InvalidArgumentException $exception) {
  respond(422, ['error' => $exception->getMessage()]);
} catch (PDOException $exception) {
  error_log($exception->getMessage());
  respond(500, ['error' => 'Perubahan data gagal disimpan ke database.']);
}
