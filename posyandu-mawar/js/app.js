var KEY='posyandu-mawar-v1', db, tab='home', sub='balita', rsub='balita', today=new Date();
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function ago(m,y){var d=new Date(today.getFullYear()-(y||0),today.getMonth()-(m||0),Math.min(today.getDate(),28));return iso(d)}
function load(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}}
function seed(){return{id:20,balita:[
 {id:1,nama:'Aisyah Putri',lahir:ago(6),ortu:'Ibu Rina'},
 {id:2,nama:'Raka Pratama',lahir:ago(24),ortu:'Ibu Sari'},
 {id:3,nama:'Nayla Azzahra',lahir:ago(41),ortu:'Ibu Dewi'},
 {id:4,nama:'Fajar Ramadhan',lahir:ago(58),ortu:'Ibu Lilis'},
 {id:5,nama:'Salsa Maharani',lahir:ago(63),ortu:'Ibu Tuti'}],
 lansia:[
 {id:11,nama:'Bu Siti Aminah',lahir:ago(0,66),alamat:'RT 01',wafat:false},
 {id:12,nama:'Pak Slamet',lahir:ago(0,72),alamat:'RT 02',wafat:false},
 {id:13,nama:'Bu Marni',lahir:ago(0,59),alamat:'RT 03',wafat:false},
 {id:14,nama:'Pak Darto',lahir:ago(0,81),alamat:'RT 02',wafat:true,tglWafat:ago(2)}]}}
function bulan(l){var b=new Date(l),m=(today.getFullYear()-b.getFullYear())*12+today.getMonth()-b.getMonth();if(today.getDate()<b.getDate())m--;return Math.max(m,0)}
function tahun(l){var b=new Date(l),y=today.getFullYear()-b.getFullYear();if(today.getMonth()<b.getMonth()||(today.getMonth()==b.getMonth()&&today.getDate()<b.getDate()))y--;return y}
function lulus(b){return bulan(b.lahir)>59}
function sisa(b){return 60-bulan(b.lahir)}
function umurTxt(m){return m>=12?Math.floor(m/12)+' th '+(m%12)+' bln':m+' bln'}
function aktifB(){return db.balita.filter(function(b){return !lulus(b)})}
function lulusB(){return db.balita.filter(lulus)}
function aktifL(){return db.lansia.filter(function(l){return !l.wafat})}
function wafatL(){return db.lansia.filter(function(l){return l.wafat})}
function notif(){return aktifB().filter(function(b){return sisa(b)<=3})}

function render(){
 var v=document.getElementById('view'),h='',fab=document.getElementById('fab');
 fab.style.display=(tab=='home'||tab=='riwayat')?'none':'block';
 if(tab=='home'){
  var n=notif();
  h+='<div class="grid"><div class="stat"><b>'+aktifB().length+'</b><span>Balita aktif (0-59 bln)</span></div><div class="stat"><b>'+aktifL().length+'</b><span>Lansia aktif (59+ th)</span></div><div class="stat"><b>'+lulusB().length+'</b><span>Balita lulus (tersimpan)</span></div><div class="stat"><b>'+wafatL().length+'</b><span>Lansia riwayat</span></div></div>';
  h+='<h2>🔔 Notifikasi</h2>';
  h+=n.length?n.map(function(b){return'<div class="alert"><b>'+esc(b.nama)+'</b> berumur '+umurTxt(bulan(b.lahir))+'. Akan keluar dari sistem balita dalam '+sisa(b)+' bulan.</div>'}).join(''):'<div class="empty">Belum ada balita yang mendekati usia keluar.</div>';
  h+='<h2>Tentang</h2><div class="stat" style="font-size:13px;color:var(--muted)">Balita dicatat sampai 59 bulan, lalu otomatis lulus dan datanya tetap tersimpan. Lansia dimulai dari umur 59 tahun dan keluar dari daftar aktif dengan ceklis meninggal.</div>';
 }
 if(tab=='balita'){
  h+='<h2 style="margin-top:0">Daftar Balita Aktif</h2>';
  h+=aktifB().length?aktifB().map(function(b){var s=sisa(b);return'<div class="item"><div class="av">👶</div><div class="info"><b>'+esc(b.nama)+'</b><small>'+umurTxt(bulan(b.lahir))+' · Ortu: '+esc(b.ortu||'-')+'</small></div>'+(s<=3?'<span class="badge warn">Keluar '+s+' bln</span>':'<span class="badge">Aktif</span>')+'<div class="item-actions"><button class="item-action" data-edit="balita" data-id="'+b.id+'" aria-label="Edit data '+esc(b.nama)+'">Edit</button><button class="item-action delete" data-delete="balita" data-id="'+b.id+'" aria-label="Hapus data '+esc(b.nama)+'">Hapus</button></div></div>'}).join(''):'<div class="empty">Belum ada data balita.</div>';
 }
 if(tab=='lansia'){
  h+='<h2 style="margin-top:0">Daftar Lansia Aktif</h2>';
  h+=aktifL().length?aktifL().map(function(l){return'<div class="item"><div class="av">👵</div><div class="info"><b>'+esc(l.nama)+'</b><small>'+tahun(l.lahir)+' tahun · '+esc(l.alamat||'-')+'</small></div><div class="item-actions"><button class="item-action" data-edit="lansia" data-id="'+l.id+'" aria-label="Edit data '+esc(l.nama)+'">Edit</button><button class="item-action delete" data-delete="lansia" data-id="'+l.id+'" aria-label="Hapus data '+esc(l.nama)+'">Hapus</button></div><label class="chk"><input type="checkbox" data-w="'+l.id+'">Meninggal</label></div>'}).join(''):'<div class="empty">Belum ada data lansia.</div>';
 }
 if(tab=='riwayat'){
  h+='<div class="seg"><button data-r="balita" class="'+(rsub=='balita'?'on':'')+'">Balita Lulus</button><button data-r="lansia" class="'+(rsub=='lansia'?'on':'')+'">Lansia Meninggal</button></div>';
  if(rsub=='balita')h+=lulusB().length?lulusB().map(function(b){return'<div class="item"><div class="av">🎓</div><div class="info"><b>'+esc(b.nama)+'</b><small>Lahir '+esc(b.lahir)+' · Ortu: '+esc(b.ortu||'-')+'</small></div><span class="badge gray">Lulus</span></div>'}).join(''):'<div class="empty">Belum ada balita yang lulus.</div>';
  else h+=wafatL().length?wafatL().map(function(l){return'<div class="item"><div class="av">🕊️</div><div class="info"><b>'+esc(l.nama)+'</b><small>Wafat '+esc(l.tglWafat||'-')+' · '+esc(l.alamat||'-')+'</small></div><button class="link" data-u="'+l.id+'">Batalkan</button></div>'}).join(''):'<div class="empty">Belum ada riwayat.</div>';
 }
 v.innerHTML=h;
 var tabs=[['home','🏠','Beranda'],['balita','👶','Balita'],['lansia','👵','Lansia'],['riwayat','🗂️','Riwayat']];
 document.getElementById('nav').innerHTML=tabs.map(function(t){return'<button data-t="'+t[0]+'" class="'+(tab==t[0]?'on':'')+'"><span>'+t[1]+'</span>'+t[2]+'</button>'}).join('');
}
function openForm(kind,id){
 var s=document.getElementById('sheet'),b=kind=='balita',record=id?db[kind].find(function(x){return x.id==id}):null;
 if(id&&!record)return;
 var title=(record?'Edit ':'Tambah ')+(b?'Balita':'Lansia');
 s.innerHTML='<h2 style="margin:0">'+title+'</h2><label for="f-nama">Nama lengkap</label><input id="f-nama" value="'+(record?esc(record.nama):'')+'"><label for="f-lahir">Tanggal lahir</label><input type="date" id="f-lahir" max="'+iso(today)+'" value="'+(record?esc(record.lahir):'')+'"><label for="f-x">'+(b?'Nama orang tua':'Alamat / RT')+'</label><input id="f-x" value="'+(record?esc(b?record.ortu||'':record.alamat||''):'')+'"><div class="err" id="f-err"></div><button class="btn" id="f-ok">Simpan</button><button class="btn ghost" id="f-no">Batal</button>';
 document.getElementById('modal').classList.add('show');
 document.getElementById('f-no').onclick=closeM;
 document.getElementById('f-ok').onclick=function(){
  var n=document.getElementById('f-nama').value.trim(),l=document.getElementById('f-lahir').value,x=document.getElementById('f-x').value.trim(),e=document.getElementById('f-err');
  if(!n||!l){e.textContent='Nama dan tanggal lahir wajib diisi.';return}
  if(new Date(l)>today){e.textContent='Tanggal lahir tidak valid.';return}
  if(b){if(bulan(l)>59){e.textContent='Umur lebih dari 59 bulan, tidak masuk kategori balita.';return}
   if(record){record.nama=n;record.lahir=l;record.ortu=x}
   else db.balita.push({id:++db.id,nama:n,lahir:l,ortu:x})
  }
  else{if(tahun(l)<59){e.textContent='Lansia minimal berumur 59 tahun.';return}
   if(record){record.nama=n;record.lahir=l;record.alamat=x}
   else db.lansia.push({id:++db.id,nama:n,lahir:l,alamat:x,wafat:false})
  }
  save();closeM();render();
 };
}
function closeM(){document.getElementById('modal').classList.remove('show')}
document.addEventListener('click',function(e){
 var t=e.target.closest('[data-t]');if(t){tab=t.dataset.t;render();return}
 var r=e.target.closest('[data-r]');if(r){rsub=r.dataset.r;render();return}
 var edit=e.target.closest('[data-edit]');if(edit){openForm(edit.dataset.edit,Number(edit.dataset.id));return}
 var del=e.target.closest('[data-delete]');if(del){
  var list=db[del.dataset.delete],record=list.find(function(x){return x.id==del.dataset.id});
  if(record&&confirm('Hapus data '+record.nama+'? Data yang dihapus tidak dapat dikembalikan.')){
   db[del.dataset.delete]=list.filter(function(x){return x.id!=del.dataset.id});save();render()
  }
  return
 }
 var u=e.target.closest('[data-u]');if(u){var l=db.lansia.find(function(x){return x.id==u.dataset.u});if(l){l.wafat=false;delete l.tglWafat;save();render()}return}
 if(e.target.id=='fab')openForm(tab);
 if(e.target.id=='modal')closeM();
});
document.addEventListener('change',function(e){
 var w=e.target.dataset&&e.target.dataset.w;
 if(w){var l=db.lansia.find(function(x){return x.id==w});
  if(l&&confirm('Tandai '+l.nama+' sebagai meninggal? Data akan pindah ke Riwayat.')){l.wafat=true;l.tglWafat=iso(today);save()}
  render()}
});
db=load()||seed();save();render();
