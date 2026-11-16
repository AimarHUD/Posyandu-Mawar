<?php
session_start();

$localConfig = __DIR__ . '/config.local.php';
if (!is_file($localConfig)) {
  throw new RuntimeException('config.local.php belum dibuat.');
}
$cfg = require $localConfig;

$pdo = new PDO(
  "mysql:host={$cfg['db_host']};dbname={$cfg['db_name']};charset=utf8mb4",
  $cfg['db_user'],
  $cfg['db_pass'],
  [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]
);