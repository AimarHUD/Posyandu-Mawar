<?php

final class Balita
{
  public static function ensureForGrowth(PDO $pdo, array $profile): int
  {
    $name = trim(is_string($profile['nama'] ?? null) ? $profile['nama'] : '');
    $birthday = is_string($profile['lahir'] ?? null) ? $profile['lahir'] : '';
    $parent = trim(is_string($profile['ortu'] ?? null) ? $profile['ortu'] : '');
    $clientId = filter_var($profile['id'] ?? null, FILTER_VALIDATE_INT);
    $growthId = filter_var($profile['growthBalitaId'] ?? null, FILTER_VALIDATE_INT);

    if ($name === '' || !self::validDate($birthday)) {
      throw new InvalidArgumentException('Data profil balita tidak valid.');
    }

    if ($growthId) {
      $stmt = $pdo->prepare('SELECT id FROM balita WHERE id = ?');
      $stmt->execute([$growthId]);
      if ($stmt->fetchColumn()) {
        $stmt = $pdo->prepare(
          'UPDATE balita SET nama = ?, tanggal_lahir = ?, nama_ortu = ? WHERE id = ?'
        );
        $stmt->execute([$name, $birthday, $parent, $growthId]);
        return $growthId;
      }
    }

    if ($clientId && self::hasProfile($pdo, $clientId, $name, $birthday)) {
      return $clientId;
    }

    $stmt = $pdo->prepare(
      'INSERT INTO balita (nama, tanggal_lahir, nama_ortu) VALUES (?, ?, ?)'
    );
    $stmt->execute([$name, $birthday, $parent]);
    return (int) $pdo->lastInsertId();
  }

  private static function hasProfile(PDO $pdo, int $id, string $name, string $birthday): bool
  {
    $stmt = $pdo->prepare(
      'SELECT id FROM balita WHERE id = ? AND nama = ? AND tanggal_lahir = ? LIMIT 1'
    );
    $stmt->execute([$id, $name, $birthday]);
    return (bool) $stmt->fetchColumn();
  }

  private static function validDate(string $date): bool
  {
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    return $parsed !== false && $parsed->format('Y-m-d') === $date
      && $date <= (new DateTimeImmutable('today'))->format('Y-m-d');
  }
}
