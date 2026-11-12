<?php require __DIR__ . '/auth.php'; ?>
<?php
if (empty($_SESSION['csrf'])) {
  $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
if (empty($_SESSION['growth_csrf'])) {
  $_SESSION['growth_csrf'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="csrf-token" content="<?= htmlspecialchars($_SESSION['csrf'], ENT_QUOTES, 'UTF-8') ?>">
<meta name="growth-csrf" content="<?= htmlspecialchars($_SESSION['growth_csrf'], ENT_QUOTES, 'UTF-8') ?>">
<title>Posyandu Mawar</title>
<link rel="stylesheet" href="css/style.css?v=<?= filemtime(__DIR__ . '/css/style.css') ?>">
</head>
<body>
<div id="app">
  <header>
    <div class="header-top">
      <h1><span aria-hidden="true">🌹</span> Posyandu Mawar</h1>
      <a class="logout" href="logout.php">Keluar <span aria-hidden="true">⏻</span></a>
    </div>
    <p id="sub">Halo, <?= htmlspecialchars($_SESSION['user']['nama']) ?></p>
  </header>
  <main id="view"></main>
  <button class="fab" id="fab" aria-label="Tambah data">+</button>
  <nav id="nav"></nav>
</div>
<div class="modal" id="modal"><div class="sheet" id="sheet"></div></div>
<script src="js/app.js?v=<?= filemtime(__DIR__ . '/js/app.js') ?>"></script>
<script src="js/growth.js?v=<?= filemtime(__DIR__ . '/js/growth.js') ?>"></script>
</body>
</html>
