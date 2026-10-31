@extends('layouts.app')
@section('title', 'Form balita')
@section('content')
<h2>{{ $item->exists ? 'Ubah' : 'Tambah' }} balita</h2>
<div class="card"><form method="POST" action="{{ $item->exists ? route('balita.update', $item) : route('balita.store') }}">
@csrf @if($item->exists) @method('PUT') @endif
<div class="grid">
<div><label for="nama">Nama</label><input id="nama" name="nama" value="{{ old('nama', $item->nama) }}" required>@error('nama')<div class="err">{{ $message }}</div>@enderror</div>
<div><label for="nik">NIK (opsional)</label><input id="nik" name="nik" maxlength="16" value="{{ old('nik', $item->nik) }}">@error('nik')<div class="err">{{ $message }}</div>@enderror</div>
<div><label for="tanggal_lahir">Tanggal lahir</label><input id="tanggal_lahir" type="date" name="tanggal_lahir" value="{{ old('tanggal_lahir', $item->tanggal_lahir?->format('Y-m-d')) }}" required>@error('tanggal_lahir')<div class="err">{{ $message }}</div>@enderror<div class="hint">Umur balita 0-59 bulan.</div></div>
<div><label for="jk">Jenis kelamin</label><select id="jk" name="jenis_kelamin">@foreach(['Laki-laki','Perempuan'] as $j)<option @selected(old('jenis_kelamin', $item->jenis_kelamin)==$j)>{{ $j }}</option>@endforeach</select></div>
<div><label for="nama_wali">Nama orang tua/wali</label><input id="nama_wali" name="nama_wali" value="{{ old('nama_wali', $item->nama_wali) }}"></div>
</div>
<label for="alamat">Alamat</label><textarea id="alamat" name="alamat" rows="2">{{ old('alamat', $item->alamat) }}</textarea>
<p><button class="btn">Simpan</button> <a class="btn gr" href="{{ route('balita.index') }}">Batal</a></p>
</form></div>
@endsection
