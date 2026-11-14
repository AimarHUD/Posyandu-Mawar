<?php
require __DIR__ . '/config.php';

if (empty($_SESSION['user']['id'])) {
  header('Location: login.php');
  exit;
}

$stmt = $pdo->prepare(
  'SELECT id, nama, username, role FROM users WHERE id = ?'
);
$stmt->execute([$_SESSION['user']['id']]);
$user = $stmt->fetch();

if (!$user) {
  $_SESSION = [];
  session_regenerate_id(true);
  header('Location: login.php');
  exit;
}

$_SESSION['user'] = [
  'id' => $user['id'],
  'nama' => $user['nama'],
  'username' => $user['username'],
  'role' => $user['role'],
];
