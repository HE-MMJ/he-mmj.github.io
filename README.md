# Dashboard Timesheet HE â€” MMJ

Dashboard web sederhana untuk menampilkan data Timesheet HE periode **November 2026**
(vendor GIP H1, GIP H2, JTU, BDK, SKN).

## Cara membuka

Klik dua kali `index.html` (buka di Chrome/Edge). Tidak perlu server, tidak perlu internet â€”
data sudah tertanam di `js/data.js`.

## Struktur

```
Dashboard/
â”œâ”€â”€ index.html          halaman utama (tabel + grafik HM/MA)
â”œâ”€â”€ css/style.css       tampilan
â”œâ”€â”€ js/app.js           logika filter, tabel, grafik gabungan (bar HM + garis MA)
â”œâ”€â”€ js/data.js          data tertanam (dipakai halaman)
â””â”€â”€ data/
    â”œâ”€â”€ data.json       data Review Unit per unit
    â””â”€â”€ daily.json      total HM per tanggal per vendor
```

## Isi data

| Kolom | Sumber |
|---|---|
| Unit ID | Review Unit, kolom UNIT |
| Unit Type | file List Unit, sheet `database`, kolom **E** (JENIS: Motor Grader, Compactor, Dump Truck, …), dicocokkan lewat Unit ID |
| Area Kerja | Review Unit, kolom Area Kerja |
| Model | Review Unit, kolom Model |
| HM Total | Review Unit, HM By BA |
| MA | Review Unit, MA By BA |
| PA | Review Unit, blok **EFISIENSI**, sub-kolom **PA** (persen; kolom R di GIP H1/H2 & JTU, kolom Q di BDK & SKN) |
| Fuel | file `05. Fuel Report\11. Rekap Fuel November 2026\2026.11.08 Rekap Penggunaan Solar MMJ_November_2026.xlsx`, sheet `Input Daily` + `Input Daily All GIP`, kolom Total Volume, per Unit ID, tanggal 1â€“8 Nov 2026 |
| Fuel Ratio | Fuel / HM Total |

## Cara memperbarui data

Jalankan skrip ekspor, lalu salin hasilnya:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Rizualdi Fadli\Documents\WB SBL Report\export_review.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Rizualdi Fadli\Documents\WB SBL Report\export_daily.ps1"
```

Lalu:

1. `D:\Temp\wa_timesheet\review_export.json` â†’ `data\data.json`
2. `D:\Temp\wa_timesheet\daily_export.json` â†’ `data\daily.json`
3. Bangun ulang `js/data.js` (isi `const DATA = ...` dari data.json, `const DAILY = ...` dari daily.json)

## Catatan

- **Fuel** diambil (read-only, file tidak diubah) dari file Rekap Penggunaan Solar November 2026,
  sheet `Input Daily` (JTU/BDK/SKN) dan `Input Daily All GIP` (GIP H1/H2), kolom **Total Volume**.
  Recap Fuel di dalam file timesheet masing-masing masih berhenti di 31-Okt-2026, jadi tidak dipakai.
- **PA** diambil langsung dari kolom **PA** pada blok **EFISIENSI** di Review Unit
  (persen, mis. 93% untuk MG-01 GIP = (IDLE + OPERATION + WORKING) / MOHH).
  Jam AVAILABLE (IDLE + OPERATION) tetap disimpan di `data.json` sebagai `PAHours`
  untuk referensi.
- **GIP H2** HM/MA/PA masih 0 karena file timesheet GIP H2 bulan November belum diisi
  (fuel-nya sudah ada).
- Ekspor membaca kolom **berdasarkan nama header**, karena susunan kolom tiap file berbeda
  (GIP H2: C=Model, D=Area; GIP H1/JTU/BDK/SKN: C=Area, D=Model).
- **Unit Type** diambil read-only dari file List Unit
  `02. List Unit\2026.10. List Unit HE HM PT. Musi Mitra Jaya Periode Oktober 2026_R00.xlsx`,
  sheet `database` (header baris 4, data mulai baris 6; C = Unit ID lama, D = Unit ID baru,
  E = JENIS), dicocokkan ke Unit ID timesheet. Kolom F (MEREK) tidak dipakai di tampilan.
  `TRADO-02 GIP H2` tidak ada di list unit sehingga Unit Type-nya tampil `-`.
- **Unit ID** tampil di kolom pertama tabel (bersama Unit Type).
- Filter yang tersedia: **Vendor**, **Area Kerja**, dan **Unit Type** (JENIS).
- Data `Merek` (kolom F) tetap ikut diekspor di `data.json` kalau nanti dibutuhkan.
- **Tabel Timesheet Belum di Terima** (di bawah Tabel Review Unit): grid `Kode Unit | Area | 1…30 | Total`
  untuk unit vendor **GIP H1, GIP H2, JTU, BDK, SKN** (73 unit Review Unit + unit List Unit yg belum
  masuk Review Unit, mis. TRADO 01). Setiap sel tanggal membaca **TOTAL HM** (kolom G) sheet harian unit
  tersebut: **terisi → ✓**, **masih 0 → -**. Kolom **Total** = jumlah ✓.
  Tabel ini **ikut terfilter** oleh dropdown Vendor, Area Kerja, dan Unit Type (sinkron dengan Tabel Review Unit).
  Sumber: `cek_belum_terima.ps1` → `belum_terima.json`, `export_grid_all.ps1` → `belum_grid.json`,
  keduanya dibaca oleh `rebuild_dashboard.ps1` menjadi `data\belum.json` (`const BELUM` di `js/data.js`).

