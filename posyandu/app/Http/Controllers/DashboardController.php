<?php
namespace App\Http\Controllers;

use App\Models\Balita;
use App\Models\Lansia;

class DashboardController extends Controller
{
    public function index()
    {
        Balita::perbaruiStatus();
        return view('dashboard', [
            'balitaAktif'   => Balita::where('status', 'aktif')->count(),
            'balitaLulus'   => Balita::where('status', 'lulus')->count(),
            'lansiaAktif'   => Lansia::where('status', 'aktif')->count(),
            'lansiaMeninggal' => Lansia::where('status', 'meninggal')->count(),
            'hampirLulus'   => Balita::daftarHampirLulus(),
        ]);
    }
}
