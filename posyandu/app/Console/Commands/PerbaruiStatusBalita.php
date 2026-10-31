<?php
namespace App\Console\Commands;

use App\Models\Balita;
use Illuminate\Console\Command;

class PerbaruiStatusBalita extends Command
{
    protected $signature = 'posyandu:perbarui-status';
    protected $description = 'Ubah status balita yang umurnya lewat 59 bulan menjadi lulus';

    public function handle(): int
    {
        $this->info(Balita::perbaruiStatus() . ' balita diubah menjadi lulus.');
        return self::SUCCESS;
    }
}
