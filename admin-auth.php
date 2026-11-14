<?php
require __DIR__ . '/auth.php';

if ($_SESSION['user']['role'] !== 'admin') {
  http_response_code(403);
  ?>
  <!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Akses Ditolak - Posyandu Mawar</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
  </head>
  <body>
    <main class="container py-5">
      <div class="alert alert-danger" role="alert">
        <h1 class="h4">Akses ditolak</h1>
        <p class="mb-3">Halaman ini hanya dapat diakses oleh admin.</p>
        <a class="btn btn-primary" href="index.php">Kembali ke beranda</a>
      </div>
    </main>
  </body>
  </html>
  <?php
  exit;
}
