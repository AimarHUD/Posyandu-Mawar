@extends('layouts.app')
@section('title', 'Data Balita')
@section('content')
<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Data Balita</h2><a class="btn" href="{{ route('balita.create') }}">Tambah balita</a></div>
<div class="card">
<form method="GET" class="row"><input name="q" value="{{ request('q') }}" placeholder="Cari nama..."><select name="status" onchange="this.form.submit()"><option value="aktif" @selected($status=='aktif')>Aktif</option><option value="lulus" @selected($status=='lulus')>Lulus (arsip)</option><option value="semua" @selected($status=='semua')>Semua</option></select><button class="btn gr">Cari</button></form>
<div class="tw"><table><thead><tr><th>Nama</th><th>Umur</th><th>Orang tua/wali</th><th>Status</th><th></th></tr></thead><tbody>
@forelse($items as $i)
<tr><td>{{ $i->nama }}<br><span class="hint">{{ $i->jenis_kelamin }} · lahir {{ $i->tanggal_lahir->format('d/m/Y') }}</span></td><td>{{ $i->umur_teks }}</td><td>{{ $i->nama_wali ?: '-' }}</td>
<td>@if($i->status=='lulus')<span class="badge g">Lulus {{ $i->tanggal_lulus?->format('d/m/Y') }}</span>@elseif($i->hampir_lulus)<span class="badge w">Hampir lulus</span>@else<span class="badge">Aktif</span>@endif</td>
<td style="white-space:nowrap"><a class="btn sm gr" href="{{ route('balita.edit', $i) }}">Ubah</a>
<form method="POST" action="{{ route('balita.destroy', $i) }}" class="inline" onsubmit="return confirm('Hapus permanen?')">@csrf @method('DELETE')<button class="btn sm rd">Hapus</button></form></td></tr>
@empty<tr><td colspan="5" class="hint" style="text-align:center;padding:22px">Belum ada data.</td></tr>
@endforelse
</tbody></table></div></div>
@endsection
