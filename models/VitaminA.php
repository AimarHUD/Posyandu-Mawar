<?php

final class VitaminA
{
  public static function latestForBalita(PDO $pdo, int $balitaId): array
  {
    $stmt = $pdo->prepare(
      'SELECT v.id, v.jenis_kapsul, v.sudah_diberikan, v.tanggal_pemberian
       FROM vitamin_a v
       WHERE v.balita_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM vitamin_a newer
           WHERE newer.balita_id = v.balita_id
             AND newer.jenis_kapsul = v.jenis_kapsul
             AND (COALESCE(newer.tanggal_pemberian, DATE(newer.created_at))
                  > COALESCE(v.tanggal_pemberian, DATE(v.created_at))
               OR (COALESCE(newer.tanggal_pemberian, DATE(newer.created_at))
                   = COALESCE(v.tanggal_pemberian, DATE(v.created_at))
                 AND newer.id > v.id))
         )'
    );
    $stmt->execute([$balitaId]);
    return $stmt->fetchAll();
  }

  public static function allForBalita(PDO $pdo, int $balitaId): array
  {
    $stmt = $pdo->prepare(
      'SELECT id, jenis_kapsul, sudah_diberikan, tanggal_pemberian, created_at
       FROM vitamin_a WHERE balita_id = ? ORDER BY COALESCE(tanggal_pemberian, DATE(created_at)) ASC, id ASC'
    );
    $stmt->execute([$balitaId]);
    return $stmt->fetchAll();
  }

  public static function create(PDO $pdo, int $balitaId, array $record): void
  {
    if ($record['sudah_diberikan'] && $record['tanggal_pemberian'] !== null) {
      $same = $pdo->prepare(
        'SELECT 1 FROM vitamin_a
         WHERE balita_id = ? AND jenis_kapsul = ? AND tanggal_pemberian = ? LIMIT 1'
      );
      $same->execute([$balitaId, $record['jenis_kapsul'], $record['tanggal_pemberian']]);
      if ($same->fetchColumn()) {
        return;
      }
    } else {
      $latest = $pdo->prepare(
        'SELECT sudah_diberikan FROM vitamin_a WHERE balita_id = ? AND jenis_kapsul = ?
         ORDER BY COALESCE(tanggal_pemberian, DATE(created_at)) DESC, id DESC LIMIT 1'
      );
      $latest->execute([$balitaId, $record['jenis_kapsul']]);
      $latestStatus = $latest->fetchColumn();
      if ($latestStatus !== false && (int) $latestStatus === 0) {
        return;
      }
    }

    $stmt = $pdo->prepare(
      'INSERT INTO vitamin_a (balita_id, jenis_kapsul, sudah_diberikan, tanggal_pemberian)
       VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([
      $balitaId,
      $record['jenis_kapsul'],
      $record['sudah_diberikan'],
      $record['tanggal_pemberian'],
    ]);
  }
}
