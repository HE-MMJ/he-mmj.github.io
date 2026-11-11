# Dashboard MMJ 2026

Dashboard HTML PT. Musi Mitra Jaya: Dashboard Eksekutif, Coal Hauling, Batu Split, Loss Time,
Rainfall & Heavy Equipment (Timesheet HE/WT).
Satu file HTML berisi HTML + CSS + JavaScript + data, bisa dibuka offline di Chrome (laptop/HP).

## Halaman utama

| File | Isi |
|---|---|
| `../index.html` | **HALAMAN UTAMA** (https://he-mmj.github.io/) — satu file gabungan: sidebar menu Eksekutif · Heavy Equipment · Coal Hauling · Batu Split · Loss Time · Rainfall. Tab **Heavy Equipment** berisi dashboard Timesheet HE + Water Truck (tema glass indigo, mode gelap, menu halaman). |

> Halaman utama dibangun ulang oleh `tools/gabungan/build_gabungan_he.py`
> (sumber: `dashboard-mmj/index.html` = shell + `tools/gabungan/he_index.html` = HTML HE
> + `css/style.css`, `js/*.js`, `assets/`, `data/` di repo root).

## Halaman di folder ini (versi terpisah per dashboard)

| File | Isi |
|---|---|
| `index.html` | Shell gabungan tanpa tab HE (menu: Eksekutif, Coal Hauling, Batu Split, Loss Time, Rainfall) — sumber shell untuk halaman utama |
| `coal-hauling.html` | Dashboard Coal Hauling (H0+H2 dari SBL WB, H1 dari Input CH CCP, tahunan dari BA) |
| `batu-split.html` | Dashboard Angkutan Batu Split |
| `loss-time.html` | Dashboard Loss Time & Curah Hujan |

## Kode generator (`tools/`)

| Folder | Isi |
|---|---|
| `tools/coal-hauling` | `update_dashboard_hauling.py`, `hauling_template.html`, `target_rkap.json`, logo mitra |
| `tools/batu-split` | `update_dashboard.py`, `dashboard_template.html` |
| `tools/loss-time` | `update_dashboard_losstime.py`, `losstime_template.html` |
| `tools/gabungan` | `build_gabungan.py`, `shell_template.html`, `exec_template.html` (shell MMJ) |
| `tools/gabungan` (HE) | `build_gabungan_he.py` (build halaman utama), `build_he_template.py` + `he_template.html` (tab HE mandiri), `he_index.html` (sumber HTML HE), `he_mmj_theme.css` (tema glass indigo + dark mode), `patch_nav_he.py` (nav Monitoring) |

Generator membaca file Excel Daily Report terbaru di server lokal (Python + openpyxl), lalu menanam
datanya ke template sebagai `const DATA = {...}`. File Excel tidak ikut diunggah.

## Cara update

1. Jalankan `.bat` di folder dashboard masing-masing (atau `Update Dashboard Gabungan.bat`).
2. Jalankan `python tools/gabungan/build_gabungan_he.py` → membangun ulang `../index.html` (halaman utama).
3. Commit & push.
