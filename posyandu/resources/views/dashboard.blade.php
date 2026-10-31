@extends('layouts.app')
@section('title', 'Ringkasan')
@section('content')
<h2>Ringkasan</h2>
<div class="stats">
  <div class="stat"><b>{{ $balitaAktif }}</b><span>Balita aktif</span></div>
  <div class="stat"><b>{{ $balitaLulus }}</b><span>Balita lulus</span></div>
  <div class="stat"><b>{{ $lansiaAktif }}</b><span>Lansia aktif</span></div>
  <div class="stat"><b>{{ $lansiaMeninggal }}</b><span>Lansia meninggal</span></div>
</div>
@if($hampirLulus->count())
<div class="warn"><b>{{ $hampirLulus->count() }} balita akan keluar dari sistem dalam ≤ 2 bulan (umur 57-59 bulan):</b>
  <ul style="margin:6px 0 0">@foreach($hampirLulus as $b)<li>{{ $b->nama }} - umur {{ $b->umur_teks }}</li>@endforeach</ul></div>
@else
<div class="card hint">Tidak ada balita yang mendekati batas 59 bulan.</div>
@endif
@endsection
