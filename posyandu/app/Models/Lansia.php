<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lansia extends Model
{
    protected $table = 'lansias';
    protected $fillable = ['nama','nik','tanggal_lahir','jenis_kelamin','alamat','pendamping','status','tanggal_meninggal'];
    protected $casts = ['tanggal_lahir' => 'date', 'tanggal_meninggal' => 'date'];

    public function getUmurAttribute(): int
    {
        return (int) floor($this->tanggal_lahir->diffInYears(now()));
    }
}
