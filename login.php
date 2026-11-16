<?php
require __DIR__ . '/config.php';

if (!empty($_SESSION['user'])) {
  $stmt = $pdo->prepare(
    'SELECT id, nama, username, role FROM users WHERE id = ?'
  );
  $stmt->execute([$_SESSION['user']['id'] ?? 0]);
  $existingUser = $stmt->fetch();

  if ($existingUser) {
    $_SESSION['user'] = [
      'id' => $existingUser['id'],
      'nama' => $existingUser['nama'],
      'username' => $existingUser['username'],
      'role' => $existingUser['role'],
    ];
    header('Location: index.php');
    exit;
  }

  unset($_SESSION['user']);
}

if (empty($_SESSION['csrf'])) {
  $_SESSION['csrf'] = bin2hex(random_bytes(16));
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (!hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '')) {
    $error = 'Sesi tidak valid, muat ulang halaman.';
  } else {
    $username = is_string($_POST['username'] ?? null) ? trim($_POST['username']) : '';
    $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';

    $stmt = $pdo->prepare(
      'SELECT id, nama, username, password, role FROM users WHERE username = ?'
    );
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
  <link rel="stylesheet" href="css/login.css?v=<?= filemtime(__DIR__ . '/css/login.css') ?>-<?= filesize(__DIR__ . '/css/login.css') ?>">
</head>
<body>
  <main class="login-phone">
    <img class="login-decoration login-decoration-top" src="assets/images/login-decoration-top.svg" alt="" aria-hidden="true">
    <img class="login-decoration login-decoration-bottom" src="assets/images/login-decoration-bottom.svg" alt="" aria-hidden="true">
    <section class="login-content" aria-labelledby="login-title">
      <h1 class="login-title" id="login-title">
        <span class="title-line title-posyandu">
          <svg class="title-pulse" viewBox="0 0 420 150" aria-hidden="true" focusable="false">
            <path d="M4 75h125l39-68 42 136 42-68h164" />
          </svg>
          <span>Posyandu</span>
        </span>
        <span class="title-line title-mawar">Mawar</span>
      </h1>

      <form class="login-form" method="post" autocomplete="on">
        <?php if ($error): ?>
          <div class="login-alert" role="alert"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($_SESSION['csrf']) ?>">

        <div class="form-group">
          <label for="username">Username</label>
          <input id="username" type="text" name="username" autocomplete="username" placeholder="Masukkan Username" required autofocus>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" type="password" name="password" autocomplete="current-password" placeholder="Masukkan Password" required>
        </div>
        <button class="login-submit" type="submit">Masuk</button>
      </form>

      <p class="login-help">Jika Anda belum memiliki akun, hubungi administrator.</p>
    </section>
  </main>
</body>
</html>
