<?php require __DIR__ . '/auth.php'; ?>
<?php
if (empty($_SESSION['growth_csrf'])) {
  $_SESSION['growth_csrf'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="growth-csrf" content="<?= htmlspecialchars($_SESSION['growth_csrf'], ENT_QUOTES, 'UTF-8') ?>">
<title>Posyandu Mawar</title>
<link rel="stylesheet" href="css/style.css">
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
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script src="js/app.js"></script>
<script src="js/growth.js"></script>
</body>
</html>
