# Panel Detail Unit di Tabel Review Unit — Dokumen Desain

Tanggal: 2026-11-15
Status: disetujui 2026-11-15
Halaman: Heavy Equipment (`Heavy-Equipment/` → `assets/data/he-<MM>.js`)

## 1. Tujuan

Menambah satu kemampuan pada tabel **Review Unit** di dashboard Timesheet HE:
mengklik **Unit ID** membuka panel yang menjabarkan jam kerugian unit itu
sebulan penuh:

- Breakdown — dipecah per alasan yang ditulis di kolom DESCRIPTION
  (mis. `Breakdown Pecah Ban`), dengan total jam per alasan per bulan
  beserta tanggal-tanggal kejadiannya.
- Standby, No Operator, No Job (= kolom *No Work Location*), dan kategori
  lain dari sheet unit.
- Semua kategori ditampilkan apa adanya (13 kolom) supaya tidak ada angka
  yang disembunyikan.

## 2. Non-tujuan

- **Tidak** mengubah tabel Review Unit, grafik HM/MA/PA, filter vendor/area/
  jenis, rentang tanggal, sortir, dan tabel "Timesheet Belum di Terima".
- **Tidak** mengubah `DAILYUNIT` (dipakai grafik, filter rentang, hitung PA/MA).
- **Tidak** memperbaiki disiplin pengisian DESCRIPTION di file Excel vendor.
- **Tidak** membuat panel yang mengikuti filter rentang tanggal (lihat §9.4).
- Tidak ada perubahan pada tab WT/Penyiraman, Loss Time, Coal Hauling, dll.

## 3. Fakta data (terukur, November 2026, 5 vendor)

- Sheet unit: baris 7 = header (termasuk `DESCRIPTION`), baris 8 = sub-header
  13 kategori, baris data 9–45.
  Kategori: Rain, Slippery, No Work Location, Meals And Rest, P2H,
  Holiday, Travelling, Repair, Break Down, No Fuel, Waiting Operator,
  No Operator, No Tandem.
- Jam breakdown harian = `Repair` + `Break Down`.
- Definisi "Breakdown" di panel = kolom `Repair` + `Break Down`
  (sama dengan exporter `export_daily_unit.ps1`).
- Unit ID ada di sel **E4** tiap sheet dan **sama** dengan nama sheet
  (`MG-01 GIP`, `EX-02 GIP`). Nama sheet dipakai sebagai kunci gabung karena
  itu yang muncul di kolom `Unit` tabel Review Unit (`MG-01 GIP H2`).
- Isi DESCRIPTION nyata:
  - `breakdown` tanpa keterangan: **982,8 jam**
  - tanpa kata breakdown sama sekali (hanya `Repair(13:00-15:00)` dst.):
    **144 jam / 61 baris**
  - PTO 50 j, Seal Pompa 30 j, alasan berupa rentang jam `(07:00-17:00)`
    ±45 j, Pecah Ban 12,7 j, Low Power 12 j, AC 8,2 j.
  - Tidak ada baris yang berisi lebih dari satu label breakdown (tetap
    ditangani untuk berjaga-jaga).
- Belum ada modal/dialog di dashboard ini; panel dibuat baru.

Konsekuensi yang harus disampaikan ke pengguna: rincian breakdown hanya
bermakna untuk entri yang opisisi beri keterangan. Sisanya masuk baris
**"Tanpa keterangan"** (dipilih pengguna), supaya total panel tetap sama
dengan kolom Breakdown di tabel.

## 4. Pendekatan: file data terpisah (A) — dipilih

**A. File data baru `UNITDETAIL`** — exporter baru menulis detail per unit,
build mengemasnya sebagai `window.UNITDETAIL`, `he.js` membacanya saat klik.

**B. Memperluas `DAILYUNIT` menjadi objek per hari** — ditolak: `DAILYUNIT`
dibaca grafik, filter rentang, hitung PA/MA, dan tabel "belum diterima".
Satu perubahan bentuk merusak empat jalur sekaligus, dan bentuk array
7 angka itu juga ditulis oleh `rebuild_dashboard.ps1` untuk jalur lama.

A dipilih karena penambahan bersifat aditif: file baru, kunci baru, satu
panel baru. Tidak ada konsumen lama yang berubah.

## 5. Alur data

```
Excel share (per vendor, sheet unit)
  └─ export_unit_detail.ps1              (baru, PowerShell + Excel COM)
        └─ D:\Temp\wa_timesheet\unit_detail.json
              ├─ (bulanan) export_he_bulanan.py → D:\Temp\wa_timesheet\bulan\<NN>\unit_detail.json
              │     └─ merge_he_bulanan.py  → js\data-bulanan\<NN>.json  (kunci UNITDETAIL)
              │           └─ build_gabungan_he.py → assets\data\he-<NN>.js  (window.UNITDETAIL)
              │                 └─ Heavy-Equipment/index.html + assets/js/tab/he.js
              └─ (harian, jalur lama) rebuild_dashboard.ps1 → js\data.js (const UNITDETAIL)
```

Jalur bulanan adalah jalur yang dipakai halaman HE yang live
(`assets/data/he-11.js`). Jalur `js\data.js` ikut diisi supaya halaman lama
tidak menampilkan panel kosong.

## 6. Bentuk data `UNITDETAIL`

Objek berkunci `UNIT` (nama sheet, huruf besar, spasi dirapikan):

```json
{
  "MG-01 GIP H2": {
    "u": "MG-01 GIP H2",
    "v": "GIP H2",
    "j": "Motor Grader",
    "c": {
      "rain": 12.5, "slip": 3, "nowork": 8, "meals": 20, "p2h": 5,
      "hol": 0, "trav": 0, "rep": 4, "bd": 10, "nofuel": 0,
      "waitop": 2, "noop": 6, "notandem": 0
    },
    "b": [
      { "l": "pecah ban", "h": 5, "d": [[1, 5]] },
      { "l": "tanpa keterangan", "h": 9, "d": [[2, 4], [7, 5]] }
    ]
  }
}
```

- `c` = total jam sebulan per kategori (13 kunci, angka jam, dibulatkan 1 desimal).
- `b` = rincian breakdown: `l` label ternormalisasi, `h` total jam,
  `d` daftar `[tanggal, jam]`. `sum(b[].h)` **wajib** sama dengan
  `c.rep + c.bd` (±0,1).
- Label `tanpa keterangan` selalu ada bila ada jam breakdown tanpa alasan.
- Perkiraan ukuran: 73 unit HE → ±20 KB JSON, jauh di bawah batas.

## 7. Aturan normalisasi label breakdown

1. Ambil sel DESCRIPTION, pecah pada `,` `;` dan baris baru.
2. Sebuah potongan dianggap alasan breakdown bila (setelah huruf kecil dan
   spasi dirapikan) diawali `break down`, `breakdown`, `bd `, atau `repair`.
3. Buang awalan itu; sisanya = detail (`breakdown pecah ban` → `pecah ban`).
4. Detail dianggap kosong bila kosong atau hanya rentang jam
   (`(07:00-17:00)`, `07.00-15.00`) → jadi `tanpa keterangan`.
5. Tidak ada potongan yang cocok → seluruh jam baris masuk `tanpa keterangan`.
6. Bila satu baris punya beberapa detail berbeda, jam dibagi rata antar detail
   (tidak terjadi di data November, hanya pengaman).
7. Deduplikasi label dalam satu baris; label disimpan huruf kecil.

Label akhir yang tampil di panel di-Title Case-kan untuk dibaca.

## 8. Pemetaan kategori → baris panel

| Baris panel | Sumber kolom sheet unit |
|---|---|
| **Breakdown** (dengan rincian) | Repair + Break Down |
| Standby – Rain | Rain |
| Standby – Slippery | Slippery |
| **No Operator** | No Operator |
| **No Job** | No Work Location |
| Meals And Rest | Meals And Rest |
| P2H | P2H |
| Holiday | Holiday |
| Travelling | Travelling |
| No Fuel | No Fuel |
| Waiting Operator | Waiting Operator |
| No Tandem | No Tandem |

Kepala panel (angka besar) menampilkan 4 ringkasan:
Breakdown, Standby (Rain + Slippery), No Operator, No Job.
Sisanya muncul di tabel rincian di bawahnya, termasuk Repair dan Break Down
terpisah supaya angka bisa ditelusuri ke Excel.

## 9. Spesifikasi UI

### 9.1 Pemicu
- Sel Unit ID di tabel berubah menjadi `<button class="unit-id" data-unit="…">`.
- Satu listener delegasi di `#tbody` (tidak menambah listener per baris).
- Enter/Spasi pada tombol ikut membuka panel.

### 9.2 Panel
- Overlay `<div class="ud-wrap">` berisi `<div class="ud-panel" role="dialog"
  aria-modal="true" aria-labelledby="ud-judul">`, dibuat lewat JS dan
  ditempel ke `document.body` saat pertama kali dipakai (template HTML tidak
  disentuh, jadi build ulang tidak menghapusnya).
- Isi: judul `UNIT · Jenis · Vendor`, 4 kartu ringkasan, tabel kategori,
  lalu blok **Rincian breakdown** berisi label + total jam + tanggal
  (`Pecah Ban — 12,7 jam · 3 Nov, 9 Nov`) dan batang proporsi sederhana.
- Tutup: tombol ×, klik latar, tombol Esc. Fokus kembali ke tombol Unit ID
  asal setelah ditutup.
- Tinggi maksimum 80vh, isi bisa digulir; lebar 560 px di desktop,
  penuh di layar < 640 px; mengikuti variabel warna tema yang sudah ada.

### 9.3 Data yang dibaca
- `window.UNITDETAIL[unitKey(d.Unit)]` dibaca **saat klik** (bukan saat load),
  supaya urutan pemuatan `he-<MM>.js` yang disuntik `shell.js` tidak jadi
  masalah.
- Angka ringkasan diambil dari detail; bila tidak ada, panel tetap terbuka
  memakai jumlah `DAILYUNIT` (`bd`, `idle`, `ops`) dengan catatan
  "rincian breakdown belum tersedia untuk bulan ini".

### 9.4 Bulan & rentang tanggal
Panel menampilkan **total bulanan**, sesuai permintaan ("total perbulannya"),
dan diberi label `Total <Bulan> <Tahun> — tidak ikut filter rentang tanggal`.
Bila nanti ingin ikut rentang, exporter perlu menyimpan matriks harian; itu
dicatat sebagai pekerjaan lanjutan, bukan bagian desain ini.

## 10. Titik integrasi (berkas per berkas)

1. **`C:\Users\Rizualdi Fadli\Documents\WB SBL Report\export_unit_detail.ps1`** (baru)
   - Pola sama dengan `export_daily_unit.ps1`: `$base`, `$files` (5 vendor),
     `$BULAN`, `$TAHUN`, `$tmpDir = "D:\Temp\wa_timesheet"`,
     `$outFile = "$tmpDir\unit_detail.json"`.
   - Deteksi kolom dari header baris 7/8 (bukan posisi tetap), lewati sheet
     `Review Unit`, `Recap Fuel`, `List Data`, `Sheet*`, `BA *`.
   - Tulis JSON `UNITDETAIL` (§6), urut kunci, UTF-8 tanpa BOM.
2. **`dashboard-mmj\tools\gabungan\export_he_bulanan.py`**
   - Tambah `"export_unit_detail.ps1"` ke `SCRIPTS`.
   - `patch_script()` baris 126 sekarang **selalu** menulis
     `$outFile = "<outdir>\daily_unit.json"`; harus diubah agar hanya
     mengganti folder dan mempertahankan nama berkas asli, kalau tidak
     exporter baru akan menimpa `daily_unit.json`.
3. **`dashboard-mmj\tools\gabungan\merge_he_bulanan.py`**
   - Baca `unit_detail.json`, tambahkan kunci `"UNITDETAIL": detail or {}`.
4. **`dashboard-mmj\tools\gabungan\build_gabungan_he.py`** (baris 615–624)
   - Tambah `"UNITDETAIL"` ke loop kunci, keluar sebagai
     `window.UNITDETAIL = window.MMJ_INFLATE(...)` (pola sama dengan
     `DAILYUNIT`), dan pastikan variabelnya di-*reset* per bulan.
5. **`assets\js\tab\he.js`**
   - Helper `unitDetail(key)`, `renderUnitPanel(d)`, `openUnitPanel(d)`,
     `closeUnitPanel()`.
   - Ubah sel Unit ID jadi tombol + listener delegasi di `#tbody`.
6. **`assets\css\he.css`**
   - Kelas `.unit-id`, `.ud-wrap`, `.ud-panel`, `.ud-cards`, `.ud-card`,
     `.ud-table`, `.ud-bd`, `.ud-bar`, `.ud-close` (memakai variabel tema).
7. **`rebuild_dashboard.ps1` + `update_dashboard.ps1`** (jalur `js\data.js`)
   - Salin `unit_detail.json` ke `data\`, tulis `const UNITDETAIL = …` di
     `js\data.js`, dan tambahkan langkah `export_unit_detail` setelah
     `export_daily_unit`.

## 11. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| `patch_script()` menimpa `daily_unit.json` | perbaiki regex dulu (§10.2), uji jalankan 1 bulan |
| Build ulang menghapus panel | panel dibuat lewat JS, bukan template HTML |
| Total rincian ≠ total tabel | uji: `sum(b[].h) == c.rep + c.bd` per unit; selisih > 0,1 gagal |
| Bulan lama tanpa UNITDETAIL | fallback `DAILYUNIT` + catatan (§9.3) |
| Panel menutupi tabel di layar kecil | overlay penuh + tombol tutup, uji 375 px |
| Ukuran `he-<MM>.js` membengkak | ±20 KB; dibandingkan sebelum/sesudah saat uji |

## 12. Kriteria penerimaan

1. `export_unit_detail.ps1` jalan tanpa error untuk November 2026 dan
   menghasilkan 5 vendor; jumlah unit = jumlah sheet unit HE (bukan WT).
2. Untuk 5 unit sampel (satu per vendor): total breakdown panel =
   `Repair + Break Down` unit itu di Excel, dan jumlah baris rincian = total itu.
3. Halaman HE: klik Unit ID membuka panel; Esc, klik latar, dan × menutupnya;
   fokus kembali ke tombol asal.
4. Kunci keyboard Tab mencapai tombol Unit ID dan tombol tutup.
5. Angka tabel, grafik, filter vendor/area/jenis, rentang tanggal, sortir,
   dan tabel "Timesheet Belum di Terima" **identik** sebelum vs sesudah
   perubahan (dibandingkan pada bulan yang sama).
6. Bulan tanpa `UNITDETAIL` (mis. Oktober setelah build) menampilkan panel
   dengan angka `DAILYUNIT` + catatan, tanpa error konsol.
7. `rebuild_gabungan_he.ps1` menghasilkan hash build baru dan tidak menambah
   error di konsol browser.

## 13. Keputusan yang sudah diambil

1. **"Standby" = Rain + Slippery** (dikonfirmasi pengguna 2026-11-15).
   Kolom *Standby By Company / Contractor* di sheet Review Unit tidak dipakai.
2. Baris **Repair** ditampilkan terpisah dari Break Down; totalnya tetap
   digabung di kartu Breakdown, supaya angka bisa ditelusuri ke Excel.
3. Rincian breakdown yang tanpa keterangan tetap tampil sebagai baris
   tersendiri (dikonfirmasi pengguna).
4. "No Job" = kolom *No Work Location* (dikonfirmasi pengguna).
5. Pendekatan A: file data terpisah, `DAILYUNIT` tidak diubah
   (dikonfirmasi pengguna).
