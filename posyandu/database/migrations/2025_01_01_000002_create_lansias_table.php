<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('lansias', function (Blueprint $t) {
            $t->id();
            $t->string('nama');
            $t->string('nik', 16)->nullable()->unique();
            $t->date('tanggal_lahir');
            $t->enum('jenis_kelamin', ['Laki-laki', 'Perempuan']);
            $t->text('alamat')->nullable();
            $t->string('pendamping')->nullable();
            $t->enum('status', ['aktif', 'meninggal'])->default('aktif');
            $t->date('tanggal_meninggal')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('lansias'); }
};
