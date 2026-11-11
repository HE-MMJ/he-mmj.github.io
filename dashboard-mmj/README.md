# Dashboard MMJ 2026

Dashboard HTML PT. Musi Mitra Jaya: Dashboard Eksekutif, Coal Hauling, Batu Split, Loss Time & Rainfall.
Satu file HTML berisi HTML + CSS + JavaScript + data, bisa dibuka offline di Chrome (laptop/HP).

## Halaman

| File | Isi |
|---|---|
| `index.html` | Dashboard gabungan (menu di sidebar: Eksekutif, Coal Hauling, Batu Split, Loss Time, Rainfall) |
| `coal-hauling.html` | Dashboard Coal Hauling (H0+H2 dari SBL WB, H1 dari Input CH CCP, tahunan dari BA) |
| `batu-split.html` | Dashboard Angkutan Batu Split |
| `loss-time.html` | Dashboard Loss Time & Curah Hujan |

## Kode generator (`tools/`)

| Folder | Isi |
|---|---|
| `tools/coal-hauling` | `update_dashboard_hauling.py`, `hauling_template.html`, `target_rkap.json`, logo mitra |
| `tools/batu-split` | `update_dashboard.py`, `dashboard_template.html` |
| `tools/loss-time` | `update_dashboard_losstime.py`, `losstime_template.html` |
| `tools/gabungan` | `build_gabungan.py`, `shell_template.html`, `exec_template.html` |

Generator membaca file Excel Daily Report terbaru di server lokal (Python + openpyxl), lalu menanam
datanya ke template sebagai `const DATA = {...}`. File Excel tidak ikut diunggah.

## Cara update

1. Jalankan `.bat` di folder dashboard masing-masing (atau `Update Dashboard Gabungan.bat`).
2. Salin HTML hasil ke folder ini, lalu commit & push.
