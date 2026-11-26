# AGENTS.md — Dashboard MMJ (Timesheet / Heavy Equipment)

Dibaca otomatis oleh Hermes Agent saat bekerja di repo ini (`D:\Timesheet\Dashboard`).
Tujuan dokumen: agent Hermes bisa mengerjakan/menjaga website dashboard MMJ seperti yang dilakukan di OpenCode.

## Apa repo ini

Website dashboard laporan MMJ (PT. Musi Mitra Jaya) yang di-deploy ke GitHub Pages:
`https://he-mmj.github.io/` — remote: `https://github.com/HE-MMJ/he-mmj.github.io.git`.

Isi: Dashboard Eksekutif (`index.html`), Heavy Equipment (`Heavy-Equipment/`), Coal Hauling,
Batu Split, Loss Time, Rainfall, plus halaman data (CSR, Cost-Control, Data-Simper, Data-DT).

Halaman utama dibangun (generated) dari template + data — **jangan edit file hasil build langsung**,
edit sumbernya lalu jalankan build (lihat bagian Build).

## Layout penting

| Path | Fungsi |
|---|---|
| `js/data.js` | Data HE inline (const DATA, DAILY, BELUM, DAILYUNIT, UNITDETAIL) |
| `js/app.js` | Logika dashboard HE: kartu KPI, tabel Review Unit, Control HE, panel vendor |
| `js/standar-he.js` | Data SOP: Fuel Ratio standar Tabel 1 (window.MMJ_STD), batas MA/UA/EU |
| `js/wt-data.js`, `js/wt.js` | Data + logika Water Truck |
| `css/style.css` | CSS dashboard HE |
| `dashboard-mmj/index.html` | Shell halaman utama (dibaca build, TIDAK diedit manual) |
| `dashboard-mmj/tools/gabungan/he_index.html` | Sumber markup dashboard HE (dipakai build) |
| `dashboard-mmj/tools/gabungan/he_mmj_theme.css` | Tema HE untuk shell |
| `dashboard-mmj/tools/gabungan/build_gabungan_he.py` | **Build utama**: gabung shell + HE → `index.html` + `assets/` |
| `dashboard-mmj/tools/gabungan/merge_he_bulanan.py` | Merge export bulanan → `js/data-bulanan/`, `js/wt-bulanan/` |
| `dashboard-mmj/tools/gabungan/export_he_bulanan.py` | Driver export HE/WT dari Excel share → `D:\Temp\wa_timesheet\bulan\<NN>\*.json` |
| `dashboard-mmj/tools/gabungan/update_fuel_he.ps1` | Ambil fuel dari Rekap Solar, timpa `review_export.json` |
| `data/*.json` | Data HE mentah (copy dari `D:\Temp\wa_timesheet\*.json`) |
| `assets/` | Hasil build: css, data, js per bulan |

Script produksi ada di `C:\Users\Rizualdi Fadli\Documents\WB SBL Report\`
(export_review.ps1, export_capacity.ps1, apply_capacity.ps1, rebuild_dashboard.ps1, update_dashboard.ps1, dll).

## Alur update data HE (penting, urut)

Dijalankan otomatis Task Scheduler "Dashboard HE MMJ Update" (13:00) lewat `update_dashboard.ps1`,
tapi kalau manual, urutannya:

1. **Export Excel → JSON** di `D:\Temp\wa_timesheet\`:
   `export_review.ps1` → `review_export.json`, `export_capacity.ps1` → `capacity.json`,
   `apply_capacity.ps1` → tempel `Capacity` ke `review_export.json`,
   `export_daily.ps1`, `export_daily_unit.ps1`, `export_unit_detail.ps1`,
   `export_belum_review.ps1`, `export_wt_penyiraman.ps1`.
2. **Update fuel** (WAJIB setelah export, karena data fuel dari Rekap Solar lebih baru dari file Review Unit):
   `update_fuel_he.ps1 -Apply -Src D:\Temp\wa_timesheet -Bulan 11`
3. **Salin ke repo + generate `js/data.js`**: `rebuild_dashboard.ps1`
   (copy review/daily/belum/daily_unit/unit_detail ke `data/`, tulis `js/data.js`).
4. **Export bulanan** (opsional, kalau data tiap bulan mau disimpan):
   `python export_he_bulanan.py 11` → `D:\Temp\wa_timesheet\bulan\11\`
5. **Merge bulanan + tempel Capacity**: `python merge_he_bulanan.py`
   (membaca `D:\Temp\wa_timesheet\bulan\*\review_export.json`; fungsi `apply_capacity` otomatis tempel
   Capacity dari `D:\Temp\wa_timesheet\capacity.json` kalau belum ada).
6. **Build site**: `python build_gabungan_he.py` (jalankan dari `dashboard-mmj/tools/gabungan/`).
   Output: `index.html` + `assets/css, assets/data, assets/js`.

Hasil build yang benar menampilkan (cek di browser/console):
`HE : 72 unit HE, 31 unit WT, HM 11916.7 jam, MA 90.6%, Penyiraman 1982 rit` (angka berubah tiap bulan).

## Fitur dashboard HE (yang baru, jangan diregress)

- **Kartu KPI**: `data-card="availability"` (MA/PA digabung, threshold terpisah: MA merah <85, PA merah <80),
  `data-card="fueluse"` (Total Fuel + Rata-rata Fuel Ratio), `data-card="penyiraman"`.
- **Klik kartu → modal vendor**: `availabilityVendors()`, tabel unit per vendor dua kolom.
- **Kolom Balance** di Tabel Review Unit: `(Min Hours / hari bulan) × hari terakhir input − HM Total`;
  total = Σ target − Σ HM. Balance negatif = merah.
- **Control HE**: tabel "Fuel di Luar Standar SOP" (`renderControlHE`) memakai `stdFuel(d)` =
  `STD.cariFuelRatio(d.Jenis, d.Capacity)` (Tabel 1 SOP) + "Timesheet terlambat".
- Unit Water Truck ikut di tabel Penyiraman, KPI global tidak ikut filter vendor.

## Gotcha (jangan jatuh di lubang yang sama)

1. **Capacity wajib ada** di data HE. `stdFuel()` butuh `Jenis` + `Capacity` untuk match Tabel 1 SOP.
   Tanpa Capacity → tabel "Fuel di Luar Standar SOP" kosong. Fix: `apply_capacity` di `merge_he_bulanan.py`
   (atau `apply_capacity.ps1` di pipeline harian). Jangan hapus panggilan itu.
2. **Zombie Excel**: kalau ada `EXCEL.EXE` menggantung di file share (mis. `10. WT TJP`), export berikutnya
   kehilangan vendor (SKN/FBS) dan `daily_*.json` 0 byte. Matikan dulu: `Stop-Process -Name EXCEL -Force`
   (hanya proses zombie, bukan Excel user), baru export ulang.
3. **Line ending**: `js/app.js`, `css/style.css`, `he_index.html`, `he_mmj_theme.css` **wajib LF**.
   Edit tool OpenCode tulis CRLF — normalize sesudah edit:
   `[IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding $true))`.
4. **Jangan edit file generated** (`assets/*`, `Heavy-Equipment/index.html`, `index.html` hasil build,
   `login.html`): edit sumber + rebuild.
5. `build_he_template.py` punya error pre-existing `JS_STD not defined` — **bukan jalur build aktif**, jangan dipakai.
6. Merge konflik file generated → resolve `--theirs` (remote), lalu rebuild supaya fitur lokal tersuntik ulang.
   Merge ke main: `git merge --no-ff -X theirs feature/<nama>` (data feature terbaru menang).
7. **Jangan push tanpa instruksi eksplisit** dari user. Push: `git push origin main`.

## Test (verifikasi sebelum klaim selesai)

`python dashboard-mmj\tools\gabungan\test_<nama>.py` per file (unittest, bukan pytest).
Test penting: `test_built_data.py`, `test_data_codec.py`, `test_he_page_latest_month.py`,
`test_theme_sync.py`, `test_wt_monthly_export.py`.

## Preview lokal

`cd D:\Timesheet\Dashboard; python -m http.server 8794 --bind 127.0.0.1` lalu buka
`http://127.0.0.1:8794/index.html` (tab `#tab=he`) atau `Heavy-Equipment/index.html`.
Worktree (branch dev): port 8793.

## Kerja dengan branch

Repo utama dipakai bare worktree: branch `feature/*` di
`D:\Timesheet\Dashboard\.superpowers\worktrees\<nama>`.
- Bekerja di worktree → commit → merge ke main (`git -C D:\Timesheet\Dashboard merge --no-ff -X theirs feature/<nama>`).
- Jangan push tanpa instruksi.
