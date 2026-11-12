# Dashboard MMJ 2026

Dashboard HTML PT. Musi Mitra Jaya: Dashboard Eksekutif, Heavy Equipment (Timesheet HE/WT),
Coal Hauling, Batu Split, Loss Time & Rainfall.

Halaman utama (`https://he-mmj.github.io/`) sekarang **modular**: `index.html` hanya berisi markup,
sedangkan CSS, data dan logika tiap dashboard berada di folder `assets/` dan dimuat sesuai tab
yang dibuka. Tetap bisa dibuka offline (double-click `index.html` di Chrome/Edge).

## Struktur halaman utama

```
index.html                     markup + <template id="mmjT_*"> tiap dashboard (~150 KB)
assets/css/boot.css            tampilan awal sebelum tab aktif
assets/css/<tab>.css           CSS tiap dashboard (exec · haul · batu · lt · he)
assets/data/<tab>.js           data mentah -> window.MMJ_DATA[<tab>]
assets/data/he.js              data unit HE (DATA · DAILY · BELUM) -> window.MMJ_HE
assets/data/wt.js              data Water Truck -> window.MMJ_WT
assets/js/shell.js             loader: pasang tab, muat CSS/data/logika, pindah tab
assets/js/tab-nav.js           menu dashboard di sidebar (dipakai semua tab)
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

## Cara update

1. Jalankan `.bat` di folder dashboard masing-masing (atau `Update Dashboard Gabungan.bat`).
2. Jalankan `python tools/gabungan/build_gabungan_he.py` → membangun ulang `../index.html`
   **dan** folder `../assets/` (CSS, data, JS).
3. Commit & push.

> `assets/css`, `assets/data`, `assets/js` **dihasilkan otomatis** — jangan diedit manual,
> perubahannya akan hilang saat build berikutnya. Edit sumbernya di `tools/gabungan/`
> (`shell_loader.js`, `emit_site.py`) atau di `css/`, `js/` pada repo root.
