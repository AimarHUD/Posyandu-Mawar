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
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet" href="css/login.css?v=<?= filemtime(__DIR__ . '/css/login.css') ?>-<?= filesize(__DIR__ . '/css/login.css') ?>">
</head>
<body>
  <main class="login-page is-desktop-preview container-fluid min-vh-100 d-flex align-items-center justify-content-center p-3 p-md-4" id="loginPage">
    <button class="view-switch btn btn-light" id="viewSwitch" type="button" aria-pressed="false" aria-label="Ubah ke tampilan mobile">
      <span class="view-switch-icon" aria-hidden="true">▯</span>
      <span class="view-switch-label">Tampilan mobile</span>
    </button>
    <span class="visually-hidden" id="viewStatus" aria-live="polite"></span>
    <div class="login-card row g-0 overflow-hidden w-100">
      <section class="login-intro col-lg-5 d-flex flex-column justify-content-between p-4 p-md-5 text-white">
        <div class="intro-content">
          <div class="brand-mark mb-4" aria-hidden="true">🌹</div>
          <p class="intro-eyebrow text-uppercase small fw-semibold mb-2">Layanan kesehatan masyarakat</p>
          <h1 class="intro-title display-6 fw-bold mb-3">Posyandu Mawar</h1>
          <p class="mb-0 intro-copy">Kelola data balita dan lansia dengan mudah dalam satu tempat.</p>
        </div>
        <p class="small mb-0 mt-5 intro-footer">Melayani dengan sepenuh hati</p>
      </section>

      <section class="col-lg-7 p-4 p-md-5">
        <div class="form-content mx-auto">
          <div class="mb-4">
            <h2 class="h3 fw-bold mb-2">Selamat datang</h2>
            <p class="text-secondary mb-0">Masuk ke akun Anda untuk melanjutkan.</p>
          </div>

          <form method="post" autocomplete="on">
            <?php if ($error): ?>
              <div class="alert alert-danger" role="alert"><?= htmlspecialchars($error) ?></div>
            <?php endif; ?>
            <input type="hidden" name="csrf" value="<?= htmlspecialchars($_SESSION['csrf']) ?>">

            <div class="mb-3">
              <label class="form-label fw-semibold" for="username">Username</label>
              <input class="form-control form-control-lg" id="username" type="text" name="username" autocomplete="username" placeholder="Masukkan username" required autofocus>
            </div>
            <div class="mb-4">
              <label class="form-label fw-semibold" for="password">Password</label>
              <input class="form-control form-control-lg" id="password" type="password" name="password" autocomplete="current-password" placeholder="Masukkan password" required>
            </div>
            <button class="btn btn-primary btn-lg w-100" type="submit">Masuk</button>
          </form>

          <p class="small text-secondary text-center mt-4 mb-0">Jika Anda belum memiliki akun, hubungi administrator.</p>
        </div>
      </section>
    </div>
  </main>
  <script src="js/login.js"></script>
</body>
</html>
