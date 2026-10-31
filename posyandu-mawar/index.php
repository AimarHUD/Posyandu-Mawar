<?php require __DIR__ . '/auth.php'; ?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
  <div id="app-error" class="app-error" role="alert" hidden></div>
  <main id="view"></main>
  <button class="fab" id="fab" aria-label="Tambah data">+</button>
  <nav id="nav"></nav>
</div>
<div class="modal" id="modal"><div class="sheet" id="sheet"></div></div>
<script src="js/app.js"></script>
</body>
</html>
