<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respondStatistics(int $status, array $body): void
{
  http_response_code($status);
  echo json_encode($body, JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  require __DIR__ . '/config.php';

  if (empty($_SESSION['user'])) {
    respondStatistics(401, ['error' => 'Sesi login berakhir. Silakan masuk kembali.']);
  }
  $userStmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
  $userStmt->execute([$_SESSION['user']['id']]);
  if (!$userStmt->fetchColumn()) {
    respondStatistics(401, ['error' => 'Sesi login tidak lagi berlaku. Silakan masuk kembali.']);
  }
  if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    respondStatistics(405, ['error' => 'Metode permintaan tidak didukung.']);
  }

  $timezone = new DateTimeZone('Asia/Jakarta');
  $now = new DateTimeImmutable('now', $timezone);
  $monthStart = $now->setDate((int) $now->format('Y'), (int) $now->format('n'), 1)->setTime(0, 0);
  $nextMonth = $monthStart->modify('+1 month');
  $startDate = $monthStart->format('Y-m-d');
  $endDate = $nextMonth->format('Y-m-d');

  $balitaStmt = $pdo->prepare(
    'SELECT COUNT(DISTINCT balita_id)
     FROM pengukuran
     WHERE tanggal_ukur >= ? AND tanggal_ukur < ?'
  );
  $balitaStmt->execute([$startDate, $endDate]);

  $lansiaStmt = $pdo->prepare(
    'SELECT COUNT(DISTINCT kunjungan.lansia_id)
     FROM (
       SELECT lansia_id
       FROM pengukuran_lansia
       WHERE tanggal_ukur >= ? AND tanggal_ukur < ?
       UNION ALL
       SELECT lansia_id
       FROM catatan_kunjungan_lansia
       WHERE tanggal_kunjungan >= ? AND tanggal_kunjungan < ?
     ) AS kunjungan'
  );
  $lansiaStmt->execute([$startDate, $endDate, $startDate, $endDate]);

  $monthFormatter = new IntlDateFormatter(
    'id_ID',
    IntlDateFormatter::NONE,
    IntlDateFormatter::NONE,
    'Asia/Jakarta',
    IntlDateFormatter::GREGORIAN,
    'MMMM yyyy'
  );
  $monthLabel = $monthFormatter->format($monthStart);
  if ($monthLabel === false) {
    throw new RuntimeException('Label bulan tidak dapat diformat.');
  }

  respondStatistics(200, [
    'data' => [
      'balita' => (int) $balitaStmt->fetchColumn(),
      'lansia' => (int) $lansiaStmt->fetchColumn(),
      'monthLabel' => $monthLabel,
    ],
  ]);
} catch (PDOException $error) {
  error_log('api-statistik.php database error: ' . $error->getMessage());
  respondStatistics(503, ['error' => 'Statistik kunjungan belum dapat dimuat. Pastikan migrasi database sudah dijalankan.']);
} catch (Throwable $error) {
  error_log('api-statistik.php error: ' . $error->getMessage());
  respondStatistics(500, ['error' => 'Statistik kunjungan tidak dapat dimuat. Silakan coba kembali.']);
}
