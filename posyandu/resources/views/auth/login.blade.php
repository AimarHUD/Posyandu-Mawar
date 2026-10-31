@extends('layouts.app')
@section('title', 'Masuk')
@section('content')
<div class="card" style="max-width:400px;margin:8vh auto 0">
  <h2 style="margin:0 0 4px">🌹 Posyandu Mawar</h2>
  <p class="hint">Masuk untuk mengelola data balita dan lansia.</p>
  <form method="POST" action="{{ route('login') }}">@csrf
    <label for="email">Email</label>
    <input id="email" name="email" type="email" value="{{ old('email') }}" placeholder="Contoh: kader@posyandu.test" required autofocus>
    @error('email')<div class="err">{{ $message }}</div>@enderror
    <label for="password">Password</label>
    <input id="password" name="password" type="password" required>
    <label style="font-weight:400"><input type="checkbox" name="remember" style="width:auto"> Ingat saya</label>
    <p><button class="btn" style="width:100%">Masuk</button></p>
  </form>
</div>
@endsection
