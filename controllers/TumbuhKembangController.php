<?php

require_once __DIR__ . '/../models/Balita.php';
require_once __DIR__ . '/../models/Pengukuran.php';
require_once __DIR__ . '/../models/VitaminA.php';

final class TumbuhKembangController
{
  private PDO $pdo;

  public function __construct(PDO $pdo)
  {
    $this->pdo = $pdo;
  }

  public function handle(array $input): array
  {
    $profile = $input['balita'] ?? null;
    if (!is_array($profile)) {
      throw new InvalidArgumentException('Profil balita wajib disertakan.');
    }

    $action = $input['action'] ?? '';
    if (!in_array($action, ['load', 'measurement', 'vitamin'], true)) {
      throw new InvalidArgumentException('Permintaan tidak dikenali.');
    }

    $this->pdo->beginTransaction();
    try {
      $balitaId = Balita::ensureForGrowth($this->pdo, $profile);
      if ($action === 'measurement') {
        $this->saveMeasurement($balitaId, $input['measurement'] ?? []);
      } elseif ($action === 'vitamin') {
        $this->saveVitamin($balitaId, $profile, $input['vitamin'] ?? []);
      }

      $result = [
        'balita_id' => $balitaId,
        'measurements' => Pengukuran::allForBalita($this->pdo, $balitaId),
        'latest' => Pengukuran::latestForBalita($this->pdo, $balitaId),
        'vitamins' => VitaminA::latestForBalita($this->pdo, $balitaId),
        'vitamin_history' => VitaminA::allForBalita($this->pdo, $balitaId),
      ];
      $this->pdo->commit();
      return $result;
    } catch (Throwable $error) {
      if ($this->pdo->inTransaction()) {
        $this->pdo->rollBack();
      }
      throw $error;
    }
  }

  private function saveMeasurement(int $balitaId, array $measurement): void
  {
    $limits = [
      'berat' => [1, 30],
      'tinggi' => [40, 130],
      'lingkar_kepala' => [30, 60],
      'lila' => [8, 25],
    ];
    $kind = is_string($measurement['jenis'] ?? null) ? $measurement['jenis'] : '';
    $value = filter_var($measurement['nilai'] ?? null, FILTER_VALIDATE_FLOAT);
    $date = is_string($measurement['tanggal_ukur'] ?? null) ? $measurement['tanggal_ukur'] : '';
    $method = is_string($measurement['cara_ukur'] ?? null) ? $measurement['cara_ukur'] : null;
    $noteValue = $measurement['catatan'] ?? '';
    if (!is_string($noteValue)) {
      throw new InvalidArgumentException('Catatan pengukuran tidak valid.');
    }
    $note = trim($noteValue);

    if ($kind === '' || !isset($limits[$kind])) {
      throw new InvalidArgumentException('Jenis pengukuran tidak valid.');
    }
    if ($value === false || $value < $limits[$kind][0] || $value > $limits[$kind][1]) {
      throw new InvalidArgumentException(
        'Nilai di luar batas wajar: ' . $limits[$kind][0] . '–' . $limits[$kind][1] . '.'
      );
    }
    if (!self::validDate($date)) {
      throw new InvalidArgumentException('Tanggal pengukuran tidak valid.');
    }
    if ($kind === 'tinggi') {
      if (!in_array($method, ['berbaring', 'berdiri'], true)) {
        throw new InvalidArgumentException('Pilih cara ukur tinggi badan.');
      }
    } elseif ($method !== null && $method !== '') {
      throw new InvalidArgumentException('Cara ukur hanya berlaku untuk tinggi badan.');
    } else {
      $method = null;
    }
    if (mb_strlen($note) > 2000) {
      throw new InvalidArgumentException('Catatan maksimal 2.000 karakter.');
    }

    $value = $this->correctedHeight($balitaId, $kind, (float) $value, $method, $date);
    if ($value !== null) {
      if ($value < $limits[$kind][0] || $value > $limits[$kind][1]) {
        throw new InvalidArgumentException('Nilai setelah koreksi berada di luar batas wajar.');
      }
      $value = round($value, 2);
    }

    Pengukuran::create($this->pdo, $balitaId, [
      'jenis' => $kind,
      'nilai' => $value,
      'cara_ukur' => $method,
      'tanggal_ukur' => $date,
      'catatan' => $note === '' ? null : $note,
    ]);
  }

  private function correctedHeight(
    int $balitaId,
    string $kind,
    float $value,
    ?string $method,
    string $date
  ): float {
    $stmt = $this->pdo->prepare('SELECT tanggal_lahir FROM balita WHERE id = ?');
    $stmt->execute([$balitaId]);
    $birthDate = $stmt->fetchColumn();
    if (!$birthDate || $date < $birthDate) {
      throw new InvalidArgumentException('Tanggal pengukuran tidak boleh sebelum tanggal lahir balita.');
    }
    if ($kind !== 'tinggi') {
      return $value;
    }
    $birthday = new DateTimeImmutable($birthDate);
    $measurementDate = new DateTimeImmutable($date);
    $months = ((int) $birthday->diff($measurementDate)->y * 12)
      + (int) $birthday->diff($measurementDate)->m;

    if ($months <= 24 && $method === 'berdiri') {
      return $value + 0.7;
    }
    if ($months > 24 && $method === 'berbaring') {
      return $value - 0.7;
    }
    return $value;
  }

  private function saveVitamin(int $balitaId, array $profile, array $record): void
  {
    $type = $record['jenis_kapsul'] ?? '';
    $given = filter_var($record['sudah_diberikan'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    $date = $record['tanggal_pemberian'] ?? null;
    if (!in_array($type, ['biru', 'merah'], true) || $given === null) {
      throw new InvalidArgumentException('Status Vitamin A tidak valid.');
    }

    $birthday = new DateTimeImmutable($profile['lahir']);
    $today = new DateTimeImmutable('today');
    $ageMonths = ((int) $birthday->diff($today)->y * 12) + (int) $birthday->diff($today)->m;
    if (($type === 'biru' && ($ageMonths < 6 || $ageMonths > 11))
      || ($type === 'merah' && ($ageMonths < 12 || $ageMonths > 59))) {
      throw new InvalidArgumentException('Kapsul Vitamin A tersebut belum sesuai usia balita.');
    }
    if ($given && !self::validDate($date)) {
      throw new InvalidArgumentException('Tanggal pemberian wajib diisi dengan tanggal yang valid.');
    }
    if ($given) {
      if ($date < $profile['lahir']) {
        throw new InvalidArgumentException('Tanggal pemberian tidak boleh sebelum tanggal lahir balita.');
      }
      $vaccinationDate = new DateTimeImmutable($date);
      $ageAtVaccination = ((int) $birthday->diff($vaccinationDate)->y * 12)
        + (int) $birthday->diff($vaccinationDate)->m;
      if (($type === 'biru' && ($ageAtVaccination < 6 || $ageAtVaccination > 11))
        || ($type === 'merah' && ($ageAtVaccination < 12 || $ageAtVaccination > 59))) {
        throw new InvalidArgumentException('Usia balita pada tanggal pemberian tidak sesuai jenis kapsul.');
      }
    }
    if (!$given) {
      $date = null;
    }

    VitaminA::create($this->pdo, $balitaId, [
      'jenis_kapsul' => $type,
      'sudah_diberikan' => $given ? 1 : 0,
      'tanggal_pemberian' => $date,
    ]);
  }

  private static function validDate(?string $date): bool
  {
    if (!is_string($date) || $date === '') {
      return false;
    }
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    return $parsed !== false && $parsed->format('Y-m-d') === $date
      && $date <= (new DateTimeImmutable('today'))->format('Y-m-d');
  }
}
