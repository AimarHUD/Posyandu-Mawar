@extends('layouts.app')
@section('title', 'Data Lansia')
@section('content')
<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Data Lansia</h2><a class="btn" href="{{ route('lansia.create') }}">Tambah lansia</a></div>
<div class="card">
<form method="GET" class="row"><input name="q" value="{{ request('q') }}" placeholder="Cari nama..."><select name="status" onchange="this.form.submit()"><option value="aktif" @selected($status=='aktif')>Aktif</option><option value="meninggal" @selected($status=='meninggal')>Meninggal (arsip)</option><option value="semua" @selected($status=='semua')>Semua</option></select><button class="btn gr">Cari</button></form>
<div class="tw"><table><thead><tr><th>Nama</th><th>Umur</th><th>Pendamping</th><th>Status</th><th></th></tr></thead><tbody>
@forelse($items as $i)
<tr><td>{{ $i->nama }}<br><span class="hint">{{ $i->jenis_kelamin }} · lahir {{ $i->tanggal_lahir->format('d/m/Y') }}</span></td><td>{{ $i->umur }} th</td><td>{{ $i->pendamping ?: '-' }}</td>
<td>@if($i->status=='meninggal')<span class="badge g">Meninggal {{ $i->tanggal_meninggal?->format('d/m/Y') }}</span>@else<span class="badge">Aktif</span>@endif</td>
<td style="white-space:nowrap"><a class="btn sm gr" href="{{ route('lansia.edit', $i) }}">Ubah</a>
<form method="POST" action="{{ route('lansia.meninggal', $i) }}" class="inline" onsubmit="return confirm('Ubah status meninggal?')">@csrf @method('PATCH')<button class="btn sm gr">{{ $i->status=='meninggal' ? 'Batalkan meninggal' : 'Ceklis meninggal' }}</button></form>
<form method="POST" action="{{ route('lansia.destroy', $i) }}" class="inline" onsubmit="return confirm('Hapus permanen?')">@csrf @method('DELETE')<button class="btn sm rd">Hapus</button></form></td></tr>
@empty<tr><td colspan="5" class="hint" style="text-align:center;padding:22px">Belum ada data.</td></tr>
@endforelse
</tbody></table></div></div>
@endsection
