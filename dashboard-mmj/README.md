# Dashboard MMJ 2026

Dashboard HTML PT. Musi Mitra Jaya: Dashboard Eksekutif, Heavy Equipment (Timesheet HE/WT),
Coal Hauling, Batu Split, Loss Time & Rainfall.

Halaman utama (`https://he-mmj.github.io/`) sekarang **modular**: `index.html` hanya berisi markup,
sedangkan CSS, data dan logika tiap dashboard berada di folder `assets/` dan dimuat sesuai tab
yang dibuka. Tetap bisa dibuka offline (double-click `index.html` di Chrome/Edge).

## Struktur halaman utama

```
index.html                     markup + <template id="mmjT_*"> tiap dashboard (~150 KB)
login.html                     halaman login (pintu masuk sisi browser)
assets/css/boot.css            tampilan awal sebelum tab aktif
assets/css/intro.css           CSS animasi pembuka (dari tools/gabungan/intro.css)
assets/css/login.css           CSS halaman login (dari tools/gabungan/login.css)
assets/css/shell.css           CSS menu user di sidebar (dari tools/gabungan/shell.css)
assets/css/<tab>.css           CSS tiap dashboard (exec · haul · batu · lt · he)
assets/data/<tab>.js           data mentah -> window.MMJ_DATA[<tab>]
assets/data/he.js              data unit HE (DATA · DAILY · BELUM) -> window.MMJ_HE
assets/data/wt.js              data Water Truck -> window.MMJ_WT
assets/data/standar-he.js      data kontrol SOP (Fuel Ratio Tabel 1 & kategori MA) -> window.MMJ_STD
assets/js/shell.js             loader: pasang tab, muat CSS/data/logika, pindah tab
assets/js/auth.js              daftar user, sesi, cek role (window.MMJ_AUTH)
assets/js/intro.js             animasi pembuka (dari tools/gabungan/intro.js)
assets/js/tab-nav.js           ganti view Loss Time / Rainfall (bukan muat ulang)
assets/js/tab/<tab>.js         logika tiap dashboard (dibungkus IIFE, aman dijalankan ulang)
assets/img/favicon.png         ikon halaman
```

Cara kerja singkat (`assets/js/shell.js`):

1. Setiap dashboard disimpan sebagai `<template id="mmjT_exec|haul|batu|lt|he">`.
2. Saat tab dibuka, isi template dipasang ke `<body>`; elemen `[data-mmj-head]` (title, font,
   `<link>` CSS tab) dipindah ke `<head>` dan dilepas lagi saat pindah tab.
3. Script di dalam template dieksekusi berurutan:
   `<script type="text/x-mmj-data" src="...">` lalu `<script type="text/x-mmj-app" src="...">`.
4. `window.mmjData("<tab>")` membaca `window.MMJ_DATA[<tab>]` (dipakai Dashboard Eksekutif untuk
   meringkas dashboard lain).

Menu dashboard ("Overview / Monitoring") dipindah ke sidebar **langsung oleh
loader** (`assets/js/shell.js`), sinkron begitu tab dipasang. Kalau dipindah
menunggu `assets/js/tab-nav.js` termuat, selama jeda itu menu terlihat melayang
di paling atas halaman → terlihat "dobel" lalu hilang. Loader juga membuang menu
lain yang nyangkut (cegah dobel) dan menandai item aktif.
`assets/js/tab-nav.js` kini hanya menangani tab Loss Time & Rainfall yang
berbagi satu dashboard (ganti view tanpa memuat ulang).

## Halaman lain di folder ini (versi terpisah, masih 1 file per dashboard)

| File | Isi |
|---|---|
| `index.html` | Shell gabungan tanpa tab HE (Eksekutif, Coal Hauling, Batu Split, Loss Time, Rainfall) — sumber shell untuk halaman utama |
| `coal-hauling.html` | Dashboard Coal Hauling (H0+H2 dari SBL WB, H1 dari Input CH CCP, tahunan dari BA) |
| `batu-split.html` | Dashboard Angkutan Batu Split |
| `loss-time.html` | Dashboard Loss Time & Curah Hujan |
| `gabungan.html` | Pengalihan (redirect) ke halaman utama — tautan lama tetap jalan |

## Kode generator (`tools/`)

| Folder | Isi |
|---|---|
| `tools/coal-hauling` | `update_dashboard_hauling.py`, `hauling_template.html`, `target_rkap.json`, logo mitra |
| `tools/batu-split` | `update_dashboard.py`, `dashboard_template.html` |
| `tools/loss-time` | `update_dashboard_losstime.py`, `losstime_template.html` |
| `tools/gabungan` | `build_gabungan.py`, `shell_template.html`, `exec_template.html` (shell MMJ) |
| `tools/gabungan` (HE) | `build_gabungan_he.py` (build halaman utama), `emit_site.py` (pemecah HTML → `assets/`), `shell_loader.js` (sumber `assets/js/shell.js`), `build_he_template.py` + `he_template.html` (tab HE mandiri), `he_index.html` (sumber HTML HE), `he_mmj_theme.css` (tema glass indigo + mode gelap), `patch_nav_he.py` (nav Monitoring) |

Generator membaca file Excel Daily Report terbaru di server lokal (Python + openpyxl), lalu menanam
datanya ke template sebagai `const DATA = {...}`. File Excel tidak ikut diunggah.

## Animasi pembuka (intro)

Tiap kali halaman dibuka, muncul intro singkat (~2,7 detik):

1. mark logo MMJ muncul di tengah (blur + scale)
2. "MUSI MITRA JAYA" tersingkap dari sisi logo ke kanan (tepi reveal berupa
   gradient/mask lembut, bukan potongan keras)
3. lockup bernafas, nama memudar
4. mark **terbang ke logo di sidebar/header** lalu memudar → menyisakan logo asli
5. tirai terangkat, dashboard terlihat

Sumbernya `tools/gabungan/intro.css` + `tools/gabungan/intro.js` → hasil build
`assets/css/intro.css` dan `assets/js/intro.js` (disisipkan `emit_site.py`).
Warna teks mengikuti wordmark logo asli: "MUSI" abu-abu, "MITRA JAYA" biru.

Yang perlu dijaga kalau nanti diubah:

| Aturan | Kenapa |
|---|---|
| Satu elemen = satu animasi per properti | Chrome memakai animasi yang dibuat **lebih dulu** (jika `fill:both`), jadi animasi berikutnya tak terlihat. Karena itu `mark` (muncul), `fly` (terbang), `glow`/`glow > i` dipisah — lihat `intro.css` |
| Posisi logo target diukur **tepat saat** logo akan terbang, setelah `load` | Kalau diukur lebih awal, layout masih berubah (data dimuat, scrollbar muncul) → logo mendarat jauh dari logo navigasi |
| Teks nama pakai `--mmj-rv` (custom property terdaftar) | Kalau tidak terdaftar, nilainya lompat dan reveal terasa kasar |
| Overlay dipasang di luar `<body>` | Loader mengosongkan isi `<body>` tiap pindah tab; overlay di dalam body akan ikut hilang |

Bantuan cek: `?nointro=1` (lewati intro) dan `?introAt=950` (bekukan intro pada
detik ke-0,95 untuk memeriksa satu frame). `prefers-reduced-motion` otomatis
melewati intro.

## Login (pintu masuk sisi browser)

**Seluruh dashboard terbuka untuk semua orang** — Monitoring, Heavy Equipment,
Coal Hauling, Batu Split, Loss Time, dan Rainfall bisa dilihat tanpa login.

Login dipakai untuk **menu tambahan** (mis. **Cost Control**) yang ditandai
`data-mmj-auth="<izin>"`. Elemen bertanda itu disembunyikan untuk pengguna yang
belum login atau belum punya izin; loader (`assets/js/shell.js`) menampilkannya
saat `MMJ_AUTH.can("<izin>")` benar.

| Isi | Keterangan |
|---|---|
| `assets/js/auth.js` | `window.MMJ_AUTH`: daftar user, `login()`, `logout()`, `current()`, `isLoggedIn()`, `can()`, `lastError`, `lastRemember` |
| `login.html` | Halaman login (dipakai saat klik tombol **Masuk**) |
| `assets/css/login.css` | Gaya halaman login |
| `assets/css/shell.css` | Gaya menu user di sidebar |
| Tombol **Masuk** | Di sidebar, hanya untuk yang belum login → ke `login.html` |
| Tombol **Keluar** | Menghapus sesi → langsung kembali ke halaman utama (`index.html`) |

Sesi disimpan di `localStorage` (bila "Ingat saya" dicentang) atau
`sessionStorage`; **kata sandi tidak ikut disimpan** di sesi.

> Situsnya statis dan data dashboard berupa file JS publik, jadi login ini
> **pembatas akses menu, bukan pengaman**. Pengaman sungguhan butuh
> layanan/server di luar repo. Daftar user & role ada di
> `tools/gabungan/auth.js` (bagian `users`); hak akses per role disiapkan di
> `MMJ_AUTH.can("...")` dan `CAPS`.

Pemeriksaan otomatis:

```bash
cd tools/gabungan
python build_gabungan_he.py
python check_login.py            # cek hasil build
python check_login_browser.py    # uji perilaku di Chrome headless
```

## Logo di semua halaman

Semua dashboard memakai **gambar logo yang sama** (`assets/logo-mmj.png`,
174×110) dan ukuran render yang sama (tinggi 80px → 127×80) di desktop maupun
mobile, sama seperti tab Heavy Equipment. Di template, logo ditulis sebagai
placeholder `__LOGO_MMJ__` yang diisi `build_gabungan_he.py` saat build.

## Running text (ticker) tab Heavy Equipment

Isi ticker hanya unit yang bermasalah (kelas `rt-alert` / `rt-warn`), geser 40 px/detik,
berhenti saat kursor di atasnya. Aturannya ada di `RUN_RULES` pada `js/app.js`:

| Aturan | Kondisi | Warna | Sumber |
|---|---|---|---|
| `hm-gt-ma` | HM (jam) > angka MA | merah | — (aturan lama) |
| `fr-gt-std` | Fuel Ratio aktual > standar Tabel 1 untuk Type/Class unit | oranye | SOP butir 9, Tabel 1 (hal. 11) |
| `ma-rendah` | MA < 85% (kategori Rendah/Low) | merah | SOP butir 8.4 (hal. 10) |

Ambang batasnya **tidak ditulis di `app.js`**, melainkan di `js/standar-he.js`
(`window.MMJ_STD`) → hasil build `assets/data/standar-he.js`. Kalau SOP revisi,
cukup ubah angka di file itu lalu build ulang. Butir 9 juga menyebut penyimpangan
**3 liter atau lebih di bawah standar** wajib dilaporkan; aturan itu belum
diaktifkan di ticker (bisa ditambah sebagai `rt-warn` bila diperlukan).

## Cara update

1. Jalankan `.bat` di folder dashboard masing-masing (atau `Update Dashboard Gabungan.bat`).
2. Jalankan `python tools/gabungan/build_gabungan_he.py` → membangun ulang `../index.html`
   **dan** folder `../assets/` (CSS, data, JS).
3. Commit & push.

> `assets/css`, `assets/data`, `assets/js` **dihasilkan otomatis** — jangan diedit manual,
> perubahannya akan hilang saat build berikutnya. Edit sumbernya di `tools/gabungan/`
> (`shell_loader.js`, `emit_site.py`) atau di `css/`, `js/` pada repo root.
