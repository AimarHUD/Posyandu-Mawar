# Posyandu Mawar

Aplikasi pencatatan balita dan lansia dengan PHP dan MySQL. Data aplikasi
disimpan di database, bukan di `localStorage` browser.

## Menjalankan dengan Laragon

1. Pastikan MySQL aktif di Laragon. Salin folder `posyandu-mawar` ke
   `C:\laragon\www\` jika ingin memakai Apache.
2. Buka `http://localhost/posyandu-mawar/setup.php` satu kali untuk membuat
   database, tabel, view, dan akun admin.
3. Buka `http://localhost/posyandu-mawar/` lalu masuk dengan:
   - Username: `admin`
   - Password: `admin123`

Ganti kata sandi awal sebelum aplikasi digunakan bersama atau dipublikasikan.

## Menjalankan dari folder proyek

Jika Apache tidak digunakan, jalankan PHP server dari folder ini:

```powershell
C:\laragon\bin\php\php-8.1.10-Win32-vs16-x64\php.exe -S 127.0.0.1:8123
```

Buka `http://127.0.0.1:8123/setup.php` sekali, kemudian
`http://127.0.0.1:8123/`. MySQL tetap harus aktif.

## Database

`database.sql` membuat database `posyandu_mawar` dan tabel `users`, `balita`,
serta `lansia`. Installer membuat akun admin jika belum tersedia. Kredensial
database default mengikuti Laragon (`root` tanpa kata sandi); sesuaikan dengan
environment variable `POSYANDU_DB_HOST`, `POSYANDU_DB_PORT`,
`POSYANDU_DB_NAME`, `POSYANDU_DB_USER`, dan `POSYANDU_DB_PASSWORD` bila perlu.

Endpoint `api.php` menangani baca dan perubahan data dengan sesi login dan
validasi permintaan. `v_balita` menyediakan umur dalam bulan, sisa bulan, dan
status kelulusan balita.
