<?php
require __DIR__ . '/config.php';

if (empty($_SESSION['user'])) {
  header('Location: login.php');
  exit;
}
