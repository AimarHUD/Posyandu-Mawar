<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@yield('title', 'Posyandu Mawar') - Panel Kader</title>
<style>
:root{--pri:#0b8f82;--bd:#d7e0dd;--mut:#5d716c;--bg:#f3f5f4}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:#17302b;font:15px/1.5 system-ui,Segoe UI,sans-serif}
.wrap{max-width:960px;margin:0 auto;padding:16px}
nav{background:var(--pri);color:#fff}nav .wrap{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:10px 16px}
nav b{margin-right:auto}nav a{color:#fff;text-decoration:none;padding:6px 12px;border-radius:8px}nav a.on{background:rgba(255,255,255,.22)}
nav button{background:none;border:1px solid #fff;color:#fff;border-radius:8px;padding:5px 12px;cursor:pointer}
.card{background:#fff;border:1px solid var(--bd);border-radius:12px;padding:16px;margin-bottom:14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}
.stat{background:#fff;border:1px solid var(--bd);border-radius:12px;padding:12px}.stat b{font-size:26px;display:block}.stat span{color:var(--mut);font-size:13px}
label{display:block;font-weight:600;margin:10px 0 4px}input,select,textarea{width:100%;padding:9px 11px;border:1px solid var(--bd);border-radius:8px;font:inherit}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0 14px}
.btn{display:inline-block;background:var(--pri);color:#fff;border:0;border-radius:8px;padding:9px 16px;cursor:pointer;text-decoration:none;font:inherit}
.btn.sm{padding:4px 10px;font-size:13px}.btn.gr{background:#e8edeb;color:#17302b}.btn.rd{background:#b42318}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--bd)}th{color:var(--mut);font-size:13px}
.tw{overflow-x:auto}.tw table{min-width:620px}
.badge{padding:2px 9px;border-radius:99px;font-size:12px;font-weight:600;background:#dcfce7;color:#157347}.badge.w{background:#fef3c7;color:#b45309}.badge.g{background:#e8edeb;color:var(--mut)}
.ok{background:#dcfce7;color:#157347;padding:10px 14px;border-radius:10px;margin-bottom:14px}
.warn{background:#fef3c7;color:#b45309;padding:12px 14px;border-radius:10px;margin-bottom:14px}
.err{color:#b42318;font-size:13px}.row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.row input,.row select{width:auto;flex:1;min-width:140px}
.hint{color:var(--mut);font-size:13px}form.inline{display:inline}
</style>
</head>
<body>
@auth
<nav><div class="wrap"><b>🌹 Posyandu Mawar</b>
<a href="{{ route('dashboard') }}" class="{{ request()->routeIs('dashboard') ? 'on' : '' }}">Ringkasan</a>
<a href="{{ route('balita.index') }}" class="{{ request()->routeIs('balita.*') ? 'on' : '' }}">Balita</a>
<a href="{{ route('lansia.index') }}" class="{{ request()->routeIs('lansia.*') ? 'on' : '' }}">Lansia</a>
<form method="POST" action="{{ route('logout') }}" class="inline">@csrf<button>Keluar</button></form></div></nav>
@endauth
<div class="wrap">
@if(session('ok'))<div class="ok">{{ session('ok') }}</div>@endif
@yield('content')
</div>
</body>
</html>
