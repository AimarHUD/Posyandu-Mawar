<?php
require __DIR__ . '/config.php';

if (!empty($_SESSION['user'])) {
  header('Location: index.php');
  exit;
}

if (empty($_SESSION['csrf'])) {
  $_SESSION['csrf'] = bin2hex(random_bytes(16));
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (!hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '')) {
    $error = 'Sesi tidak valid, muat ulang halaman.';
  } else {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
      session_regenerate_id(true);
      $_SESSION['user'] = [
        'id'       => $user['id'],
        'nama'     => $user['nama'],
        'username' => $user['username'],
        'role'     => $user['role'],
      ];
      header('Location: index.php');
      exit;
    }
    $error = 'Username atau password salah.';
  }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Login - Posyandu Mawar</title>
<link rel="stylesheet" href="css/login.css">
</head>
<body>
  <div class="box">
    <div class="top">
      <div style="font-size:36px">🌹</div>
      <h1>Posyandu Mawar</h1>
      <p>Masuk untuk mengelola data balita &amp; lansia</p>
    </div>
    <form method="post" autocomplete="off">
      <?php if ($error): ?>
        <div class="err"><?= htmlspecialchars($error) ?></div>
      <?php endif; ?>
      <input type="hidden" name="csrf" value="<?= $_SESSION['csrf'] ?>">
      <label>Username</label>
      <input type="text" name="username" required autofocus>
      <label>Password</label>
      <input type="password" name="password" required>
      <button type="submit">Masuk</button>
    </form>
  </div>
</body>
</html>
