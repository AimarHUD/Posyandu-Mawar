<?php
use App\Http\Controllers\{AuthController, BalitaController, DashboardController, LansiaController};
use Illuminate\Support\Facades\Route;

// Tidak ada route register: akun kader dibuat oleh admin (seeder/tinker)
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::resource('balita', BalitaController::class)->except('show')->parameters(['balita' => 'balita']);
    Route::resource('lansia', LansiaController::class)->except('show')->parameters(['lansia' => 'lansia']);
    Route::patch('lansia/{lansia}/meninggal', [LansiaController::class, 'toggleMeninggal'])->name('lansia.meninggal');
});
