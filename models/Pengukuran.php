<?php

final class Pengukuran
{
  public static function allForBalita(PDO $pdo, int $balitaId): array
  {
    $stmt = $pdo->prepare(
      'SELECT id, jenis, nilai, cara_ukur, tanggal_ukur, catatan
       FROM pengukuran WHERE balita_id = ? ORDER BY tanggal_ukur ASC, id ASC'
    );
    $stmt->execute([$balitaId]);
    return $stmt->fetchAll();
  }

  public static function latestForBalita(PDO $pdo, int $balitaId): array
  {
    $stmt = $pdo->prepare(
      'SELECT p.id, p.jenis, p.nilai, p.cara_ukur, p.tanggal_ukur, p.catatan
       FROM pengukuran p
       WHERE p.balita_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM pengukuran newer
           WHERE newer.balita_id = p.balita_id
             AND newer.jenis = p.jenis
             AND (newer.tanggal_ukur > p.tanggal_ukur
               OR (newer.tanggal_ukur = p.tanggal_ukur AND newer.id > p.id))
         )'
    );
    $stmt->execute([$balitaId]);
    return $stmt->fetchAll();
  }

  public static function create(PDO $pdo, int $balitaId, array $measurement): void
  {
    $existing = $pdo->prepare(
      'SELECT id FROM pengukuran
       WHERE balita_id = ? AND jenis = ? AND tanggal_ukur = ? ORDER BY id DESC LIMIT 1'
    );
    $existing->execute([$balitaId, $measurement['jenis'], $measurement['tanggal_ukur']]);
    $existingId = $existing->fetchColumn();
    if ($existingId) {
      $update = $pdo->prepare(
        'UPDATE pengukuran SET nilai = ?, cara_ukur = ?, catatan = ? WHERE id = ?'
      );
      $update->execute([
        $measurement['nilai'],
        $measurement['cara_ukur'],
        $measurement['catatan'],
        $existingId,
      ]);
      return;
    }

    $stmt = $pdo->prepare(
      'INSERT INTO pengukuran (balita_id, jenis, nilai, cara_ukur, tanggal_ukur, catatan)
       VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      $balitaId,
      $measurement['jenis'],
      $measurement['nilai'],
      $measurement['cara_ukur'],
      $measurement['tanggal_ukur'],
      $measurement['catatan'],
    ]);
  }
}
