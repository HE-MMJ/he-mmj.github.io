# Kartu Ringkasan HE Bisa Diklik — Panel Per Vendor (Grid Kartu + Dropdown)

**Tanggal:** 2026-11-21
**Status:** disetujui (menunggu review user sebelum push)

## Intent

Tujuh kartu ringkasan di tab Heavy Equipment hanya menampilkan satu angka total.
Angka total tidak memberi tahu vendor mana yang menyumbang. Pengguna ingin bisa mengklik
kartu dan langsung melihat pecahan per vendor.

## Tujuan

- Klik kartu ringkasan → panel menampilkan metrik kartu itu dipecah per vendor.
- Setiap vendor ditampilkan sebagai **kartu** dengan logo, bisa diklik → dropdown daftar
  unit muncul **di dalam kartu** (bukan di bawah grid).
- Latar putih pada logo dihapus (transparan) supaya menyatu dengan tema gelap.

## Non-goal

- Tidak mengubah pipeline data (`export_*`, `refresh_bulanan`, `merge_*`).
- Tidak menambah dependensi, pustaka chart, atau sistem overlay baru.
- Tidak mengubah panel detail unit (`.ud-wrap` yang sudah dipakai tabel Review Unit).
- Tidak menambah filter baru di UI.
- Logo hanya untuk 6 vendor yang diminta user (GIP, JTU, BDK, SKN, TSA, TJP); vendor
  lain (mis. ASA, PBT) tidak diberi logo.

## Pendekatan

Tiga cara dipertimbangkan:

1. **Panel overlay baru khusus vendor** — duplikasi CSS/JS overlay, dua sistem modal
   untuk perilaku yang sama. Ditolak.
2. **Kartu jadi tombol filter vendor** — mengubah arti kartu dari "ringkasan" menjadi
   "kontrol filter"; pengguna kehilangan angka total, dan filter sudah ada di dropdown.
   Ditolak.
3. **Pakai ulang overlay `.ud-wrap` + fungsi render baru (dipilih)** — overlay, tombol
   tutup, Esc, dan klik-backdrop sudah ada dan sudah teruji; hanya isi panel yang beda.

## Desain

**Buka panel.** Listener klik dan keydown dipasang sekali di `#cards` (delegation),
memakai helper `openVendorPanel(kind)` yang menumpang `UD_WRAP`, `UD_FOKUS`, dan
`closeUnitPanel` yang sudah ada. Karena `UD_WRAP` dipakai bersama, handler Esc/Tab yang
sudah terpasang di `document` otomatis berlaku (Tab berputar di antara tombol tutup dan
kartu-kartu vendor).

**Isi panel: grid kartu vendor.** Tiap vendor satu kartu (`.vd-card`) berisi:

- nama vendor, nilai metrik, sub (jumlah unit / `HE · WT`), chevron;
- **logo vendor** (`.vd-logo`, `<img>` data-URI PNG transparan) — pemetaan:
  `GIP H1`/`GIP H2` → logo GIP ("Semua GIP"), `JTU` → JTU, `BDK` → BDK, `SKN` → SKN,
  `TSA` → TSA, `TJP` → TJP; vendor WT dinormalkan dulu (`WT SKN` → `SKN`).

**Dropdown dalam kartu.** Klik kartu → `toggleVendorDrop(kind, card)` mengisi
`.vd-drop` di dalam kartu dengan daftar unit (`.vd-list`, baris `.vd-row`) dari
`vendorUnits(kind, vendor)`. Aturan:

- membuka kartu lain menutup kartu sebelumnya (satu dropdown terbuka);
- klik pada baris unit (`.vd-drop`) **tidak** menutup kartu (fix H1);
- Esc menutup seluruh panel; Enter/Space pada kartu membuka/menutup dropdown (a11y).

**Agregasi per vendor.** `vendorBreakdown(kind)` memakai `vendorAgg(kind, heRows,
wtRows, allHe, allWt)`: HE memakai `Vendor` apa adanya, WT membuang prefiks `WT `
(`WT SKN` → `SKN`). Basis angka sama dengan kartu:

- HM, Fuel, MA, PA, FR: dari `lastRows` (`applyRange(filtered())`);
- Rit WT: dari `WTD` tanpa rentang tanggal;
- Unit: `DATA` + `WTD` tanpa filter.

Kolom penjumlahan (HM, Fuel, Rit, Unit) harus berjumlah sama dengan angka kartu; kolom
rata-rata (MA, PA, FR) tidak, karena kartu memakai rata-rata tertimbang seluruh unit.

**Afordans.** `.card` diberi `data-card="<kind>"`, `role="button"`, `tabindex="0"`,
`cursor:pointer`, cincin fokus `:focus-visible`.

**Logo transparan.** Sumber di `dashboard-mmj/tools/gabungan/logos/vd-<vendor>.png`
(tinggi 64 px, latar putih dihapus lewat flood-fill dari tepi + fringe anti-alias).
Di-runtime di-embed sebagai `data:image/png;base64` di `VD_LOGO` (`js/app.js`), dipilih
via `vdLogoFor(vendor)` (GIP prefix + normalisasi WT).

## File yang disentuh

- `js/app.js` — `VD_LOGO` (base64), `vdLogoFor`, `vendorBreakdown`, `renderVendorPanel`,
  `openVendorPanel`, `toggleVendorDrop`, `vendorUnits`, `data-card`/`role`/`tabindex`
  pada markup kartu, listener delegation klik/keydown, Tab trap.
- `css/style.css` — afordans klik + fokus untuk `.card[data-card]`.
- `dashboard-mmj/tools/gabungan/he_mmj_theme.css` — `.vd-cards`, `.vd-card`,
  `.vd-logo`, `.vd-drop`, `.vd-list`, animasi `vdPop`/`vdDrop`/`udPanelIn`.
- `dashboard-mmj/tools/gabungan/logos/vd-*.png` — logo transparan (sumber build).
- `dashboard-mmj/tools/gabungan/test_vendor_card_panel.mjs` — tes agregasi, `vendorUnits`,
  logo, `vdLogoFor`.

Berkas hasil build (`assets/js/tab/he.js`, `assets/css/*`, `index.html`) tidak diedit
tangan; dibangun ulang lewat `rebuild_gabungan_he.ps1` (churn halaman lain di-restore,
hanya `Heavy-Equipment/index.html` dengan hash baru).

## Yang diserahkan ke pelaksana

- Kelas CSS baru wajib memakai variabel tema (`--muted`, `--ink`, `--surface-2`, `--hair`)
  supaya tema gelap tetap terbaca.
- Daftar unit di dropdown: nilai metrik kartu (mis. Fuel → Unit + Fuel), urut menurun,
  badge `HE`/`WT` untuk kartu units.
