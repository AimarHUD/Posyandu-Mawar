<?php
header('Cache-Control: no-store');

function respondExportError(int $status, string $message): void
{
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  require __DIR__ . '/config.php';
  if (empty($_SESSION['user'])) {
    respondExportError(401, 'Sesi login berakhir. Silakan masuk kembali.');
  }
  $userStmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
  $userStmt->execute([$_SESSION['user']['id']]);
  if (!$userStmt->fetchColumn()) {
    respondExportError(401, 'Sesi login tidak lagi berlaku. Silakan masuk kembali.');
  }
  if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    respondExportError(405, 'Metode permintaan tidak didukung.');
  }

  $kind = is_string($_GET['jenis'] ?? null) ? $_GET['jenis'] : '';
  $date = is_string($_GET['tanggal'] ?? null) ? $_GET['tanggal'] : '';
  $parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
  $dateErrors = DateTimeImmutable::getLastErrors();
  if (!in_array($kind, ['balita', 'lansia'], true)) {
    respondExportError(422, 'Jenis data ekspor tidak valid.');
  }
  if (
    !$parsedDate || ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count'])) ||
    $parsedDate->format('Y-m-d') !== $date || $parsedDate > new DateTimeImmutable('today')
  ) {
    respondExportError(422, 'Tanggal pertemuan tidak valid.');
  }

  if ($kind === 'balita') {
    $columns = [
      ['nama', 'Nama Anak', false],
      ['jenis_kelamin', 'Jenis Kelamin', false],
      ['tanggal_lahir', 'Tanggal Lahir', false],
      ['umur_bulan', 'Umur (bulan)', true],
      ['anak_ke', 'Anak Ke-', true],
      ['nomor_kk', 'Nomor KK', false],
      ['nik', 'NIK Anak', false],
      ['nama_ibu', 'Ibu Anak', false],
      ['nama_ayah', 'Ayah Anak', false],
      ['imd', 'IMD', false],
      ['berat_lahir', 'Berat Badan Lahir (kg)', true],
      ['panjang_lahir', 'Panjang Badan Lahir (cm)', true],
      ['lingkar_kepala_lahir', 'Lingkar Kepala Lahir (cm)', true],
      ['lingkar_lengan_lahir', 'Lingkar Lengan Lahir (CM)', true],
      ['tanggal_ukur', 'Tanggal Pengukuran', false],
      ['berat', 'Berat Badan (kg)', true],
      ['tinggi', 'Panjang/Tinggi Badan (cm)', true],
      ['cara_ukur_tinggi', 'Cara Ukur Tinggi', false],
      ['lingkar_kepala', 'Lingkar Kepala (cm)', true],
      ['lila', 'Lingkar Lengan Atas (cm)', true],
      ['catatan_berat', 'Catatan Berat', false],
      ['catatan_tinggi', 'Catatan Tinggi', false],
      ['catatan_lingkar_kepala', 'Catatan Lingkar Kepala', false],
      ['catatan_lila', 'Catatan LILA', false],
    ];
    $stmt = $pdo->prepare(
      'SELECT b.nama, b.jenis_kelamin, b.tanggal_lahir,
              TIMESTAMPDIFF(MONTH, b.tanggal_lahir, p.tanggal_ukur) AS umur_bulan,
              b.anak_ke, b.nomor_kk, b.nik, b.nama_ibu, b.nama_ayah, b.imd,
              b.berat_lahir, b.panjang_lahir, b.lingkar_kepala_lahir, b.lingkar_lengan_lahir,
              p.tanggal_ukur,
              MAX(CASE WHEN p.jenis = \'berat\' THEN p.nilai END) AS berat,
              MAX(CASE WHEN p.jenis = \'tinggi\' THEN p.nilai END) AS tinggi,
              MAX(CASE WHEN p.jenis = \'tinggi\' THEN p.cara_ukur END) AS cara_ukur_tinggi,
              MAX(CASE WHEN p.jenis = \'lingkar_kepala\' THEN p.nilai END) AS lingkar_kepala,
              MAX(CASE WHEN p.jenis = \'lila\' THEN p.nilai END) AS lila,
              MAX(CASE WHEN p.jenis = \'berat\' THEN p.catatan END) AS catatan_berat,
              MAX(CASE WHEN p.jenis = \'tinggi\' THEN p.catatan END) AS catatan_tinggi,
              MAX(CASE WHEN p.jenis = \'lingkar_kepala\' THEN p.catatan END) AS catatan_lingkar_kepala,
              MAX(CASE WHEN p.jenis = \'lila\' THEN p.catatan END) AS catatan_lila
       FROM balita b
       JOIN pengukuran p ON p.balita_id = b.id
       WHERE p.tanggal_ukur = ?
         AND NOT EXISTS (
           SELECT 1 FROM pengukuran newer
           WHERE newer.balita_id = p.balita_id
             AND newer.tanggal_ukur = p.tanggal_ukur
             AND newer.jenis = p.jenis
             AND newer.id > p.id
         )
       GROUP BY b.id, b.nama, b.jenis_kelamin, b.tanggal_lahir, b.anak_ke, b.nomor_kk,
                b.nik, b.nama_ibu, b.nama_ayah, b.imd, b.berat_lahir, b.panjang_lahir,
                b.lingkar_kepala_lahir, b.lingkar_lengan_lahir, p.tanggal_ukur
       ORDER BY b.nama ASC, b.id ASC, p.tanggal_ukur ASC'
    );
    $sheetName = 'Balita';
  } else {
    $columns = [
      ['nama', 'Nama Lengkap', false],
      ['jenis_kelamin', 'Jenis Kelamin', false],
      ['nomor_kk', 'Nomor KK', false],
      ['nik', 'NIK', false],
      ['tanggal_lahir', 'Tanggal Lahir', false],
      ['umur_tahun', 'Umur (tahun)', true],
      ['alamat', 'Alamat', false],
      ['nomor_hp', 'Nomor HP', false],
      ['nama_pendamping', 'Nama Pendamping', false],
      ['nomor_hp_pendamping', 'Nomor HP Pendamping', false],
      ['status', 'Status', false],
      ['tanggal_ukur', 'Tanggal Pengukuran', false],
      ['berat', 'Berat Badan (kg)', true],
      ['lingkar_perut', 'Lingkar Perut (cm)', true],
      ['sistolik', 'Sistolik (mmHg)', true],
      ['diastolik', 'Diastolik (mmHg)', true],
      ['kolesterol', 'Kolesterol (mg/dL)', true],
      ['asam_urat', 'Asam Urat (mg/dL)', true],
      ['gula_darah', 'Gula Darah (mg/dL)', true],
      ['catatan_berat', 'Catatan Berat', false],
      ['catatan_lingkar_perut', 'Catatan Lingkar Perut', false],
      ['catatan_tekanan_darah', 'Catatan Tekanan Darah', false],
      ['catatan_kolesterol', 'Catatan Kolesterol', false],
      ['catatan_asam_urat', 'Catatan Asam Urat', false],
      ['catatan_gula_darah', 'Catatan Gula Darah', false],
    ];
    $stmt = $pdo->prepare(
      'SELECT l.nama, l.jenis_kelamin, l.nomor_kk, l.nik, l.tanggal_lahir,
              TIMESTAMPDIFF(YEAR, l.tanggal_lahir, p.tanggal_ukur) AS umur_tahun,
              l.alamat, l.nomor_hp, l.nama_pendamping, l.nomor_hp_pendamping,
              l.status, p.tanggal_ukur,
              MAX(CASE WHEN p.jenis = \'berat\' THEN p.nilai END) AS berat,
              MAX(CASE WHEN p.jenis = \'lingkar_perut\' THEN p.nilai END) AS lingkar_perut,
              MAX(CASE WHEN p.jenis = \'tekanan_darah\' THEN p.sistolik END) AS sistolik,
              MAX(CASE WHEN p.jenis = \'tekanan_darah\' THEN p.diastolik END) AS diastolik,
              MAX(CASE WHEN p.jenis = \'kolesterol\' THEN p.nilai END) AS kolesterol,
              MAX(CASE WHEN p.jenis = \'asam_urat\' THEN p.nilai END) AS asam_urat,
              MAX(CASE WHEN p.jenis = \'gula_darah\' THEN p.nilai END) AS gula_darah,
              MAX(CASE WHEN p.jenis = \'berat\' THEN p.catatan END) AS catatan_berat,
              MAX(CASE WHEN p.jenis = \'lingkar_perut\' THEN p.catatan END) AS catatan_lingkar_perut,
              MAX(CASE WHEN p.jenis = \'tekanan_darah\' THEN p.catatan END) AS catatan_tekanan_darah,
              MAX(CASE WHEN p.jenis = \'kolesterol\' THEN p.catatan END) AS catatan_kolesterol,
              MAX(CASE WHEN p.jenis = \'asam_urat\' THEN p.catatan END) AS catatan_asam_urat,
              MAX(CASE WHEN p.jenis = \'gula_darah\' THEN p.catatan END) AS catatan_gula_darah
       FROM lansia l
       JOIN pengukuran_lansia p ON p.lansia_id = l.id
       WHERE p.tanggal_ukur = ?
         AND NOT EXISTS (
           SELECT 1 FROM pengukuran_lansia newer
           WHERE newer.lansia_id = p.lansia_id
             AND newer.tanggal_ukur = p.tanggal_ukur
             AND newer.jenis = p.jenis
             AND newer.id > p.id
         )
       GROUP BY l.id, l.nama, l.jenis_kelamin, l.nomor_kk, l.nik, l.tanggal_lahir,
                l.alamat, l.nomor_hp, l.nama_pendamping, l.nomor_hp_pendamping,
                l.status, p.tanggal_ukur
       ORDER BY l.nama ASC, l.id ASC, p.tanggal_ukur ASC'
    );
    $sheetName = 'Lansia';
  }
  $stmt->execute([$date]);
  $records = $stmt->fetchAll();
  if (!$records) {
    respondExportError(404, 'Tidak ada data pengukuran ' . $kind . ' pada tanggal tersebut.');
  }

  $workbook = createWorkbook($sheetName, $columns, $records);
  $filename = 'posyandu-' . $kind . '-' . $date . '.xlsx';
  header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  header('Content-Length: ' . strlen($workbook));
  echo $workbook;
} catch (PDOException $error) {
  error_log('export.php database error: ' . $error->getMessage());
  respondExportError(503, 'Data pengukuran belum dapat diambil. Pastikan migrasi pengukuran sudah dijalankan.');
} catch (Throwable $error) {
  error_log('export.php error: ' . $error->getMessage());
  respondExportError(500, 'File Excel tidak dapat dibuat. Silakan coba kembali.');
}

function createWorkbook(string $sheetName, array $columns, array $records): string
{
  $tempFile = tempnam(sys_get_temp_dir(), 'posyandu-export-');
  if ($tempFile === false) {
    throw new RuntimeException('File sementara tidak dapat dibuat.');
  }

  try {
    $zip = new ZipArchive();
    if ($zip->open($tempFile, ZipArchive::OVERWRITE | ZipArchive::CREATE) !== true) {
      throw new RuntimeException('Arsip Excel tidak dapat dibuka.');
    }

    $worksheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    $worksheet .= xlsxRow(1, array_map(function (array $column): array {
      return [$column[1], false];
    }, $columns));
    foreach ($records as $index => $record) {
      $row = [];
      foreach ($columns as $column) {
        $row[] = [$record[$column[0]] ?? '', $column[2]];
      }
      $worksheet .= xlsxRow($index + 2, $row);
    }
    $worksheet .= '</sheetData></worksheet>';

    $files = [
      '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' .
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' .
        '<Default Extension="xml" ContentType="application/xml"/>' .
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' .
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' .
        '</Types>',
      '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' .
        '</Relationships>',
      'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' .
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' .
        '<sheets><sheet name="' . xlsxText($sheetName) . '" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' .
        '</Relationships>',
      'xl/worksheets/sheet1.xml' => $worksheet,
    ];
    foreach ($files as $name => $contents) {
      if (!$zip->addFromString($name, $contents)) {
        throw new RuntimeException('Bagian file Excel tidak dapat ditulis.');
      }
    }
    if (!$zip->close()) {
      throw new RuntimeException('File Excel tidak dapat diselesaikan.');
    }
    $workbook = file_get_contents($tempFile);
    if ($workbook === false) {
      throw new RuntimeException('File Excel tidak dapat dibaca.');
    }
    return $workbook;
  } finally {
    if (is_file($tempFile)) {
      unlink($tempFile);
    }
  }
}

function xlsxRow(int $rowNumber, array $cells): string
{
  $xml = '<row r="' . $rowNumber . '">';
  foreach ($cells as $index => $cell) {
    $reference = xlsxColumnName($index + 1) . $rowNumber;
    $value = $cell[0];
    if ($cell[1] && $value !== null && $value !== '' && is_numeric($value)) {
      $xml .= '<c r="' . $reference . '" t="n"><v>' . xlsxText((string)$value) . '</v></c>';
    } else {
      $xml .= '<c r="' . $reference . '" t="inlineStr"><is><t xml:space="preserve">' .
        xlsxText((string)($value ?? '')) . '</t></is></c>';
    }
  }
  return $xml . '</row>';
}

function xlsxColumnName(int $number): string
{
  $name = '';
  while ($number > 0) {
    $number--;
    $name = chr(65 + ($number % 26)) . $name;
    $number = intdiv($number, 26);
  }
  return $name;
}

function xlsxText(string $value): string
{
  $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $value);
  return htmlspecialchars($value, ENT_QUOTES | ENT_XML1 | ENT_SUBSTITUTE, 'UTF-8');
}
