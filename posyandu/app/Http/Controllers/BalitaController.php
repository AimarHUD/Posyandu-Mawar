<?php
namespace App\Http\Controllers;

use App\Models\Balita;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BalitaController extends Controller
{
    private function rules(?Balita $b = null): array
    {
        return [
            'nama' => 'required|string|max:255',
            'nik' => ['nullable', 'digits:16', Rule::unique('balitas', 'nik')->ignore($b?->id)],
            // Balita: umur 0-59 bulan
            'tanggal_lahir' => 'required|date|before_or_equal:today|after:' . now()->subMonths(60)->toDateString(),
            'jenis_kelamin' => 'required|in:Laki-laki,Perempuan',
            'nama_wali' => 'nullable|string|max:255',
            'alamat' => 'nullable|string',
        ];
    }

    public function index(Request $r)
    {
        Balita::perbaruiStatus();
        $status = $r->get('status', 'aktif');
        $items = Balita::query()
            ->when($status !== 'semua', fn($q) => $q->where('status', $status))
            ->when($r->q, fn($q, $s) => $q->where('nama', 'like', "%$s%"))
            ->orderBy('nama')->get();
        return view('balita.index', compact('items', 'status'));
    }

    public function create() { return view('balita.form', ['item' => new Balita]); }

    public function store(Request $r)
    {
        Balita::create($r->validate($this->rules()));
        return redirect()->route('balita.index')->with('ok', 'Data balita disimpan.');
    }

    public function edit(Balita $balita) { return view('balita.form', ['item' => $balita]); }

    public function update(Request $r, Balita $balita)
    {
        $data = $r->validate($this->rules($balita));
        $balita->update($data);
        return redirect()->route('balita.index')->with('ok', 'Data balita diperbarui.');
    }

    public function destroy(Balita $balita)
    {
        $balita->delete();
        return back()->with('ok', 'Data balita dihapus.');
    }
}
