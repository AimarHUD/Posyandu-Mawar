# Posyandu Mawar

Aplikasi pencatatan balita dan lansia berbasis Laravel 10 dan MySQL.

## Menjalankan di Windows dengan Laragon

1. Buka Laragon, lalu pilih **Start All** agar MySQL berjalan.
2. Buka Terminal Laragon dan jalankan:

   ```powershell
   cd "C:\Users\Risqi Maulana\Downloads\posyandu-laravel\posyandu"
   composer install --no-dev
   mysql -u root -e "CREATE DATABASE IF NOT EXISTS posyandu_laravel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   php artisan migrate --seed
   php artisan serve --host=127.0.0.1 --port=8000
   ```

3. Buka <http://127.0.0.1:8000> di browser.
4. Masuk dengan akun awal:
   - Email: `kader@posyandu.test`
   - Password: `password123`

Konfigurasi lokal menggunakan MySQL Laragon (`root`, tanpa password) dan database
`posyandu_laravel`. Sesuaikan `DB_*` di `.env` bila konfigurasi MySQL berbeda.

## Fitur

- Ringkasan jumlah balita dan lansia.
- Tambah, ubah, cari, arsip, dan hapus data balita/lansia.
- Status balita otomatis menjadi lulus setelah berusia 60 bulan.
- Status lansia dapat ditandai meninggal tanpa menghapus datanya.
