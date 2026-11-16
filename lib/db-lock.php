<?php

/**
 * Menjalankan $callback dengan kunci MySQL bernama, supaya dua pengguna yang
 * menyimpan data yang sama pada saat bersamaan diproses satu per satu.
 */
function withDbLock(PDO $pdo, string $name, callable $callback)
{
  $stmt = $pdo->prepare('SELECT GET_LOCK(?, 5)');
  $stmt->execute([$name]);
  if ((int) $stmt->fetchColumn() !== 1) {
    throw new RuntimeException('Server sedang sibuk menyimpan data lain. Coba lagi sebentar.');
  }
  try {
    return $callback();
  } finally {
    $release = $pdo->prepare('SELECT RELEASE_LOCK(?)');
    $release->execute([$name]);
    $release->fetchAll();
  }
}
