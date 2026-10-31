<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Balita extends Model
{
    protected $table = 'balitas';
    protected $fillable = ['nama','nik','tanggal_lahir','jenis_kelamin','nama_wali','alamat','status','tanggal_lulus'];
    protected $casts = ['tanggal_lahir' => 'date', 'tanggal_lulus' => 'date'];

    public function getUmurBulanAttribute(): int
    {
        return (int) floor($this->tanggal_lahir->diffInMonths(now()));
    }

    public function getUmurTeksAttribute(): string
    {
        $m = $this->umur_bulan;
        return $m < 24 ? "$m bulan" : intdiv($m, 12) . ' th ' . ($m % 12) . ' bln';
    }

    // Umur 57-59 bulan: notifikasi sebelum keluar dari sistem
    public function getHampirLulusAttribute(): bool
    {
        return $this->status === 'aktif' && $this->umur_bulan >= 57;
    }

    // Umur lebih dari 59 bulan -> status lulus (data tetap tersimpan)
    public static function perbaruiStatus(): int
    {
        return static::where('status', 'aktif')
            ->whereDate('tanggal_lahir', '<=', now()->subMonths(60))
            ->update(['status' => 'lulus', 'tanggal_lulus' => now()->toDateString()]);
    }

    public static function daftarHampirLulus()
    {
        return static::where('status', 'aktif')
            ->whereDate('tanggal_lahir', '>', now()->subMonths(60))
            ->whereDate('tanggal_lahir', '<=', now()->subMonths(57))
            ->orderBy('tanggal_lahir')->get();
    }
}
