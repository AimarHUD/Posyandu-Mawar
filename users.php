<?php
require __DIR__ . '/admin-auth.php';
header('Cache-Control: no-store');

function usersEscape(string $value): string
{
  return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function usersRedirect(string $location): void
{
  header('Location: ' . $location);
  exit;
}

function generateUserPassword(): string
{
  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  $password = '';
  $length = random_int(10, 12);

  for ($index = 0; $index < $length; $index++) {
    $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
  }

  return $password;
}

if (empty($_SESSION['csrf'])) {
  $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

$error = '';
$newUser = ['nama' => '', 'username' => '', 'role' => 'kader'];
$flash = $_SESSION['user_management_flash'] ?? null;
unset($_SESSION['user_management_flash']);

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'], true)) {
  header('Allow: GET, POST');
  http_response_code(405);
  exit('Metode permintaan tidak didukung.');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $csrf = is_string($_POST['csrf'] ?? null) ? $_POST['csrf'] : '';
  if (!hash_equals($_SESSION['csrf'], $csrf)) {
    $error = 'Sesi tidak valid. Muat ulang halaman lalu coba lagi.';
  } else {
    $action = is_string($_POST['action'] ?? null) ? $_POST['action'] : '';

    if ($action === 'add') {
      $newUser['nama'] = is_string($_POST['nama'] ?? null) ? trim($_POST['nama']) : '';
      $newUser['username'] = is_string($_POST['username'] ?? null) ? trim($_POST['username']) : '';
      $newUser['role'] = is_string($_POST['role'] ?? null) ? $_POST['role'] : '';
      $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
      $nameLength = preg_match_all('/./us', $newUser['nama']);
      $passwordLength = preg_match_all('/./us', $password);

      if ($newUser['nama'] === '' || $nameLength === false || $nameLength > 100) {
        $error = 'Nama wajib diisi dan maksimal 100 karakter.';
      } elseif (!preg_match('/^[A-Za-z0-9_]{3,50}$/', $newUser['username'])) {
        $error = 'Username harus 3-50 karakter dan hanya berisi huruf, angka, atau underscore.';
      } elseif (!in_array($newUser['role'], ['admin', 'kader'], true)) {
        $error = 'Role yang dipilih tidak valid.';
      } elseif ($passwordLength === false || $passwordLength < 8) {
        $error = 'Password harus minimal 8 karakter.';
      } else {
        try {
          $stmt = $pdo->prepare(
            'INSERT INTO users (nama, username, password, role)
             VALUES (?, ?, ?, ?)'
          );
          $stmt->execute([
            $newUser['nama'],
            $newUser['username'],
            password_hash($password, PASSWORD_DEFAULT),
            $newUser['role'],
          ]);
          $_SESSION['user_management_flash'] = ['message' => 'User baru berhasil dibuat.'];
          usersRedirect('users.php');
        } catch (PDOException $exception) {
          if ((string) $exception->getCode() === '23000') {
            $error = 'Username tersebut sudah digunakan.';
          } else {
            throw $exception;
          }
        }
      }
    } elseif ($action === 'reset') {
      $userId = filter_var($_POST['user_id'] ?? null, FILTER_VALIDATE_INT);
      $password = '';
      if (isset($_POST['generate'])) {
        $password = generateUserPassword();
      } else {
        $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
        $passwordLength = preg_match_all('/./us', $password);
        if ($passwordLength === false || $passwordLength < 8) {
          $error = 'Password baru harus minimal 8 karakter, atau gunakan Generate acak.';
        }
      }

      if (!$userId || $userId < 1) {
        $error = 'User yang dipilih tidak valid.';
      }

      if ($error === '') {
        $stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
        $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $userId]);

        if ($stmt->rowCount() === 0) {
          $checkUser = $pdo->prepare('SELECT id FROM users WHERE id = ?');
          $checkUser->execute([$userId]);
          if (!$checkUser->fetchColumn()) {
            $error = 'User tidak ditemukan.';
          }
        }

        if ($error === '') {
          $_SESSION['user_management_flash'] = [
            'message' => 'Password berhasil direset. Sampaikan password ini kepada user melalui saluran aman.',
            'password' => $password,
          ];
          usersRedirect('users.php');
        }
      }
    } elseif ($action === 'role') {
      $userId = filter_var($_POST['user_id'] ?? null, FILTER_VALIDATE_INT);
      $role = is_string($_POST['role'] ?? null) ? $_POST['role'] : '';

      if (!$userId || $userId < 1) {
        $error = 'User yang dipilih tidak valid.';
      } elseif (!in_array($role, ['admin', 'kader'], true)) {
        $error = 'Role yang dipilih tidak valid.';
      } else {
        try {
          $pdo->beginTransaction();
          $adminStmt = $pdo->prepare('SELECT id FROM users WHERE role = ? FOR UPDATE');
          $adminStmt->execute(['admin']);
          $adminIds = array_map('intval', $adminStmt->fetchAll(PDO::FETCH_COLUMN));

          $userStmt = $pdo->prepare('SELECT role FROM users WHERE id = ? FOR UPDATE');
          $userStmt->execute([$userId]);
          $currentRole = $userStmt->fetchColumn();

          if ($currentRole === false) {
            $error = 'User tidak ditemukan.';
          } elseif ($currentRole === 'admin' && $role === 'kader' && count($adminIds) <= 1) {
            $error = 'Admin terakhir tidak dapat diturunkan menjadi kader.';
          } else {
            $updateStmt = $pdo->prepare('UPDATE users SET role = ? WHERE id = ?');
            $updateStmt->execute([$role, $userId]);
            $_SESSION['user_management_flash'] = ['message' => 'Role user berhasil diperbarui.'];
          }

          if ($error !== '') {
            $pdo->rollBack();
          } else {
            $pdo->commit();
            usersRedirect('users.php');
          }
        } catch (PDOException $exception) {
          if ($pdo->inTransaction()) {
            $pdo->rollBack();
          }
          throw $exception;
        }
      }
    } elseif ($action === 'delete') {
      $userId = filter_var($_POST['user_id'] ?? null, FILTER_VALIDATE_INT);

      if (!$userId || $userId < 1) {
        $error = 'User yang dipilih tidak valid.';
      } elseif ((int) $userId === (int) $_SESSION['user']['id']) {
        $error = 'Anda tidak dapat menghapus akun yang sedang digunakan.';
      } else {
        try {
          $pdo->beginTransaction();
          $adminStmt = $pdo->prepare('SELECT id FROM users WHERE role = ? FOR UPDATE');
          $adminStmt->execute(['admin']);
          $adminIds = array_map('intval', $adminStmt->fetchAll(PDO::FETCH_COLUMN));

          $userStmt = $pdo->prepare('SELECT role FROM users WHERE id = ? FOR UPDATE');
          $userStmt->execute([$userId]);
          $currentRole = $userStmt->fetchColumn();

          if ($currentRole === false) {
            $error = 'User tidak ditemukan.';
          } elseif ($currentRole === 'admin' && count($adminIds) <= 1) {
            $error = 'Admin terakhir tidak dapat dihapus.';
          } else {
            $deleteStmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
            $deleteStmt->execute([$userId]);
            $_SESSION['user_management_flash'] = ['message' => 'User berhasil dihapus.'];
          }

          if ($error !== '') {
            $pdo->rollBack();
          } else {
            $pdo->commit();
            usersRedirect('users.php');
          }
        } catch (PDOException $exception) {
          if ($pdo->inTransaction()) {
            $pdo->rollBack();
          }
          throw $exception;
        }
      }
    } else {
      $error = 'Aksi tidak dikenali.';
    }
  }
}

$stmt = $pdo->prepare('SELECT id, nama, username, role, created_at FROM users ORDER BY id ASC');
$stmt->execute();
$users = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kelola User - Posyandu Mawar</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css?v=<?= filemtime(__DIR__ . '/css/style.css') ?>">
</head>
<body>
<main class="container py-4">
  <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
    <div>
      <h1 class="h3 mb-1">Kelola User</h1>
      <p class="text-secondary mb-0">Admin yang masuk: <?= usersEscape($_SESSION['user']['nama']) ?></p>
    </div>
    <a class="btn btn-outline-secondary" href="index.php">Kembali ke beranda</a>
  </div>

  <?php if ($error !== ''): ?>
    <div class="alert alert-danger" role="alert"><?= usersEscape($error) ?></div>
  <?php endif; ?>
  <?php if (is_array($flash)): ?>
    <div class="alert alert-success" role="alert">
      <p class="mb-1"><?= usersEscape((string) ($flash['message'] ?? '')) ?></p>
      <?php if (isset($flash['password'])): ?>
        <strong>Password baru:</strong>
        <code><?= usersEscape((string) $flash['password']) ?></code>
      <?php endif; ?>
    </div>
  <?php endif; ?>

  <section class="card shadow-sm mb-4">
    <div class="card-body">
      <h2 class="h5 mb-3">Tambah user</h2>
      <form method="post" autocomplete="off">
        <input type="hidden" name="csrf" value="<?= usersEscape($_SESSION['csrf']) ?>">
        <input type="hidden" name="action" value="add">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label" for="nama">Nama</label>
            <input class="form-control" id="nama" name="nama" maxlength="100" required value="<?= usersEscape($newUser['nama']) ?>">
          </div>
          <div class="col-md-6">
            <label class="form-label" for="username">Username</label>
            <input class="form-control" id="username" name="username" minlength="3" maxlength="50" pattern="[A-Za-z0-9_]+" required value="<?= usersEscape($newUser['username']) ?>">
          </div>
          <div class="col-md-6">
            <label class="form-label" for="role">Role</label>
            <select class="form-select" id="role" name="role" required>
              <option value="kader"<?= $newUser['role'] === 'kader' ? ' selected' : '' ?>>Kader</option>
              <option value="admin"<?= $newUser['role'] === 'admin' ? ' selected' : '' ?>>Admin</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label" for="password">Password awal</label>
            <input class="form-control" id="password" type="password" name="password" minlength="8" autocomplete="new-password" required>
          </div>
        </div>
        <button class="btn btn-primary mt-3" type="submit">Tambah user</button>
      </form>
    </div>
  </section>

  <section class="card shadow-sm">
    <div class="card-body">
      <h2 class="h5 mb-3">Daftar user</h2>
      <div class="table-responsive">
        <table class="table table-striped align-middle">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Role</th>
              <th>Tanggal dibuat</th>
              <th>Reset password</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
          <?php foreach ($users as $user): ?>
            <tr>
              <td><?= usersEscape($user['nama']) ?></td>
              <td><?= usersEscape($user['username']) ?></td>
              <td>
                <form method="post" class="d-flex gap-2">
                  <input type="hidden" name="csrf" value="<?= usersEscape($_SESSION['csrf']) ?>">
                  <input type="hidden" name="action" value="role">
                  <input type="hidden" name="user_id" value="<?= (int) $user['id'] ?>">
                  <select class="form-select form-select-sm" name="role" aria-label="Role <?= usersEscape($user['username']) ?>">
                    <option value="admin"<?= $user['role'] === 'admin' ? ' selected' : '' ?>>Admin</option>
                    <option value="kader"<?= $user['role'] === 'kader' ? ' selected' : '' ?>>Kader</option>
                  </select>
                  <button class="btn btn-sm btn-outline-primary" type="submit">Simpan</button>
                </form>
              </td>
              <td><?= usersEscape((string) $user['created_at']) ?></td>
              <td>
                <form method="post" class="d-grid gap-2">
                  <input type="hidden" name="csrf" value="<?= usersEscape($_SESSION['csrf']) ?>">
                  <input type="hidden" name="action" value="reset">
                  <input type="hidden" name="user_id" value="<?= (int) $user['id'] ?>">
                  <input class="form-control form-control-sm" type="password" name="password" minlength="8" autocomplete="new-password" aria-label="Password baru untuk <?= usersEscape($user['username']) ?>" placeholder="Password baru (min. 8)">
                  <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-sm btn-outline-primary" type="submit">Reset Password</button>
                    <button class="btn btn-sm btn-outline-secondary" type="submit" name="generate" value="1" formnovalidate>Generate acak</button>
                  </div>
                </form>
              </td>
              <td>
                <form method="post" onsubmit="return confirm('Hapus user ini?');">
                  <input type="hidden" name="csrf" value="<?= usersEscape($_SESSION['csrf']) ?>">
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="user_id" value="<?= (int) $user['id'] ?>">
                  <button class="btn btn-sm btn-outline-danger" type="submit"<?= (int) $user['id'] === (int) $_SESSION['user']['id'] ? ' disabled' : '' ?>>Hapus</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</main>
</body>
</html>
