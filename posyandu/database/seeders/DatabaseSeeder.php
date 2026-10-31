<?php
namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Akun kader dibuat di sini / lewat tinker (tidak ada pendaftaran publik)
        User::updateOrCreate(['email' => 'kader@posyandu.test'], [
            'name' => 'Kader Posyandu',
            'password' => Hash::make('password123'),
        ]);
    }
}
