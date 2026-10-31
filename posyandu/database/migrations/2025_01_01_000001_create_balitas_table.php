<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('balitas', function (Blueprint $t) {
            $t->id();
            $t->string('nama');
            $t->string('nik', 16)->nullable()->unique();
            $t->date('tanggal_lahir');
            $t->enum('jenis_kelamin', ['Laki-laki', 'Perempuan']);
            $t->string('nama_wali')->nullable();
            $t->text('alamat')->nullable();
            $t->enum('status', ['aktif', 'lulus'])->default('aktif');
            $t->date('tanggal_lulus')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('balitas'); }
};
