<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

$dbHost = getenv('POSYANDU_DB_HOST') ?: '127.0.0.1';
$dbPort = getenv('POSYANDU_DB_PORT') ?: '3306';
$dbName = getenv('POSYANDU_DB_NAME') ?: 'posyandu_mawar';
$dbUser = getenv('POSYANDU_DB_USER') ?: 'root';
$dbPass = getenv('POSYANDU_DB_PASSWORD') ?: '';

$pdo = new PDO(
  "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
  $dbUser,
  $dbPass,
  [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]
);
