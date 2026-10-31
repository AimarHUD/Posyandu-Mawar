<?php
namespace App\Http\Controllers;

use App\Models\Lansia;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LansiaController extends Controller
{
    private function rules(?Lansia $l = null): array
    {
        return [
            'nama' => 'required|string|max:255',
            'nik' => ['nullable', 'digits:16', Rule::unique('lansias', 'nik')->ignore($l?->id)],
            // Lansia: mulai umur 59 tahun
            'tanggal_lahir' => 'required|date|before_or_equal:' . now()->subYears(59)->toDateString(),
            'jenis_kelamin' => 'required|in:Laki-laki,Perempuan',
            'alamat' => 'nullable|string',
            'pendamping' => 'nullable|string|max:255',
        ];
    }

    public function index(Request $r)
    {
        $status = $r->get('status', 'aktif');
        $items = Lansia::query()
            ->when($status !== 'semua', fn($q) => $q->where('status', $status))
            ->when($r->q, fn($q, $s) => $q->where('nama', 'like', "%$s%"))
            ->orderBy('nama')->get();
        return view('lansia.index', compact('items', 'status'));
    }

    public function create() { return view('lansia.form', ['item' => new Lansia]); }

    public function store(Request $r)
    {
        Lansia::create($r->validate($this->rules()));
        return redirect()->route('lansia.index')->with('ok', 'Data lansia disimpan.');
    }

    public function edit(Lansia $lansia) { return view('lansia.form', ['item' => $lansia]); }

    public function update(Request $r, Lansia $lansia)
    {
        $lansia->update($r->validate($this->rules($lansia)));
        return redirect()->route('lansia.index')->with('ok', 'Data lansia diperbarui.');
    }

    // Ceklis meninggal: keluar dari daftar aktif, data tetap tersimpan
    public function toggleMeninggal(Lansia $lansia)
    {
        $mati = $lansia->status !== 'meninggal';
        $lansia->update([
            'status' => $mati ? 'meninggal' : 'aktif',
            'tanggal_meninggal' => $mati ? now()->toDateString() : null,
        ]);
        return back()->with('ok', $mati ? 'Lansia ditandai meninggal.' : 'Status lansia dikembalikan ke aktif.');
    }

    public function destroy(Lansia $lansia)
    {
        $lansia->delete();
        return back()->with('ok', 'Data lansia dihapus.');
    }
}
