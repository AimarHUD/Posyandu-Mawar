<?php
$success = false;
$error = '';

try {
  $dbHost = getenv('POSYANDU_DB_HOST') ?: '127.0.0.1';
  $dbPort = getenv('POSYANDU_DB_PORT') ?: '3306';
  $dbName = getenv('POSYANDU_DB_NAME') ?: 'posyandu_mawar';
  $dbUser = getenv('POSYANDU_DB_USER') ?: 'root';
  $dbPass = getenv('POSYANDU_DB_PASSWORD') ?: '';
  if (!preg_match('/\A[A-Za-z0-9_]+\z/', $dbName)) {
    throw new RuntimeException('Nama database hanya boleh berisi huruf, angka, dan garis bawah.');
  }

  $pdo = new PDO(
    "mysql:host={$dbHost};port={$dbPort};charset=utf8mb4",
    $dbUser,
    $dbPass,
    [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]
  );

  $sqlFile = __DIR__ . '/database.sql';
  $sql = file_get_contents($sqlFile);
  if ($sql === false) {
    throw new RuntimeException('File database.sql tidak dapat dibaca.');
  }
  $sql = str_replace('posyandu_mawar', $dbName, $sql);

  foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
    $pdo->exec($statement);
  }

  $statement = $pdo->prepare('SELECT id FROM users WHERE username = ?');
  $statement->execute(['admin']);
  if (!$statement->fetch()) {
    $statement = $pdo->prepare(
      'INSERT INTO users (nama, username, password, role) VALUES (?, ?, ?, ?)'
    );
    $statement->execute([
      'Administrator',
      'admin',
      password_hash('admin123', PASSWORD_DEFAULT),
      'admin',
    ]);
  }

  $success = true;
} catch (PDOException $exception) {
  error_log($exception->getMessage());
  $error = 'Koneksi atau proses database gagal. Pastikan MySQL sudah berjalan dan pengaturan database benar.';
} catch (RuntimeException $exception) {
  $error = $exception->getMessage();
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Setup Posyandu Mawar</title>
</head>
<body>
  <?php if ($success): ?>
    <h1>Setup berhasil</h1>
    <p>Database, tabel, dan akun admin sudah siap.</p>
    <p>Login admin: <strong>admin</strong> / <strong>admin123</strong></p>
    <p><a href="login.php">Buka halaman login</a></p>
  <?php else: ?>
    <h1>Setup gagal</h1>
    <p><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
  <?php endif; ?>
</body>
</html>
