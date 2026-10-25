<?php
session_start();

$pdo = new PDO(
  'mysql:host=localhost;dbname=posyandu_mawar;charset=utf8mb4',
  'root',   // user default Laragon
  '',       // password default Laragon (kosong)
  [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]
);
