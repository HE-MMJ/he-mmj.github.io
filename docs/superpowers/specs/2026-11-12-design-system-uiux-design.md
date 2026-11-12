# Desain Sistem + UI/UX Dashboard MMJ — Fase 1

Tanggal: 2026-11-12 · Status: menunggu persetujuan · Pemohon: Web Developer Professional

## 1. Maksud

Merapikan **tampilan** dashboard MMJ (5 halaman: Monitoring, Heavy Equipment,
Coal Hauling, Batu Split, Loss Time) tanpa mengubah **data** dan **fungsi** yang
ada. Fokus Fase 1: design system (token + komponen inti) dan UI/UX.

Latar audit (angka nyata dari repo):

| Temuan | Bukti |
|---|---|
| Token warna dideklarasikan ulang di tiap tab | 25 token ada di kelima file, 21 **nilainya identik**, hanya 4 yang berbeda |
| Aturan CSS identik terduplikasi | 15 aturan **persis sama** di kelima file — semuanya blok `.mmjnav` |
| Varian komponen inti | `.side` 6 varian, `.card` 6, `.nav a` 4, `.ch` 4, `.seg` 3 → tiap dashboard punya karakter sendiri |
| Tema gelap | hanya tab HE lengkap (17 aturan `data-theme="dark"`); exec 1, haul/batu/lt 2 → tidak konsisten |
| Logika inline di template | 9 blok `<script>` di `dashboard-mmj/index.html` (1,15 MB + 740 KB + 288 KB), diekstrak saat build |
| Copy-paste di sumber | blok nav (CSS + JS) ada **4 salinan identik** di `dashboard-mmj/index.html` |

## 2. Tujuan / bukan tujuan

**Tujuan**

1. Satu sumber token & komponen dasar → `assets/css/theme.css`, dimuat sekali.
2. Menghapus duplikasi: token yang identik & aturan nav pindah ke `theme.css`.
3. Tema gelap seragam di kelima tab (tab HE jadi acuan).
4. UI/UX lebih rapi: skala spasi & radius konsisten, tipografi & kontras
   seragam, fokus keyboard terlihat, mode cetak rapi, mobile enak dipakai.
5. **Verifikasi:tampilan terang tidak berubah** (pixel-diff per tab) → aman.

**Bukan tujuan (Fase 1)**

- Mengubah data, perhitungan, atau alur fungsi apa pun.
- Membongkar tampilan tiap dashboard jadi sama persis (identitasnya dipertahankan).
- Menambah dependensi/framework eksternal (tetap HTML/CSS/JS murni).
- Tahap 2 (lapisan data) & 3 (kode/build) — dibahas terpisah.

## 3. Batasan

- **HTML/CSS/JS murni**, tanpa framework, tanpa build tool frontend.
- `assets/` **dihasilkan build** → semua CSS baru dibuat di `tools/gabungan/`
  lalu di-*emit* oleh `emit_site.py` (pernah bug: BOM di tengah file CSS →
  Chrome membuang seluruh stylesheet; semua pembacaan sumber wajib `utf-8-sig`).
- Situs harus tetap bisa dibuka **offline lewat `file://`** (double-click).
- Opsi URL (`?nointro=1`, `?introAt=`) dan parameter lain tetap berfungsi.

## 4. Pendekatan yang dipertimbangkan

| Opsi | Trade-off | Dipilih |
|---|---|---|
| **Token + komponen inti** — `theme.css` berisi token bersama, reset, shell sidebar, menu dashboard, tipografi, skala spasi, tema gelap dasar; tiap tab CSS menyimpan bagian khusus tabnya | Tampilan tiap dashboard tetap berbeda (identitas terjaga), duplikasi token & nav hilang, perubahan较小 & risiko rendah | ✅ |
| Seragam penuh — kelima dashboard dibongkar ke satu sistem | Paling konsisten, tapi perubahan visual besar di semua halaman & berisiko merusak tata letak | Tidak |
| Poles per halaman — tanpa design system | Paling ringan, tapi token tetap diduplikasi 5× & tema gelap tetap tidak seragam | Tidak |

**Urutan pemuatan CSS** (penting): `theme.css` → `boot.css` → CSS tab.
Theme **tidak** memaksa ulang aturan tab (spesifisitas sama, tab dimuat
sesudahnya → tab tetap bisa menimpa) ✔.

## 5. Desain

### 5.1 `assets/css/theme.css` (baru, dari `tools/gabungan/theme.css`)

Berisi 4 bagian:

1. **Token dasar** — 21 token yang identik di kelima tab dipindah ke sini
   (warna permukaan/garis/ink/muted/accent, radius, shadow, font).
   Token yang berbeda per tab (`--accent-2`, `--axis`, `--warn-bg`, `--warn-ink`)
   tetap di CSS tab ✔.
2. **Reset & base** — `html/body`, scrollbar, `::selection`, `:focus-visible`
   (fokus keyboard yang jelas), aturan `print`.
3. **Shell & komponen inti** — blok `.mmjnav` (15 aturan identik) dipindah ke
   sini, plus aturan bersama yang dipakai semua tab: `.side` (posisi sticky,
   scroll), `.logo`, `.nav a`, `.sec`, heading & `.ch` (judul kartu),
   `.card` (dasar: background, border, radius, shadow), tabel (header, garis),
   tombol/`.seg`/`.chip`/`.badge` dasar, form control, state `empty`/`loading`.
   Varian khusus tab tetap di CSS tab ✔.
4. **Tema gelap dasar** — blok token gelap tab HE jadi acuan (`--surface`,
   `--side`, `--ink`, `--muted`, `--line`, …) + global dark (body, .side,
   .card, tabel, input) →第五 tab dapat mode gelap yang konsisten.
   Detail dark yang spesifik per tab tetap di CSS tab ✔.

### 5.2 Skala UI/UX bersama

- **Spasi**: `--sp-1..--sp-6` (4/8/12/16/24/32 px) → jarak antar kartu, judul,
  tabel seragam.
- **Radius**: `--r-sm/--r-md/--r-lg` → kartu 16, input 12, chip 999.
- **Tipografi**: skala ukuran & bobot diseragamkan untuk judul halaman, judul
  kartu, label, angka besar (tabular-nums untuk angka tabel ✔).
- **Aksesibilitas**: kontras teks & label dicek (token `--ink-2`/`--muted` di
  latar卡片), fokus keyboard terlihat, `aria-current` pada menu aktif ✔ (sudah ada).
- **Mobile**: lebar < 900 px → sidebar jadi bar mendatar, kartu jadi 1–2 kolom,
  tabel bisa di-scroll horizontal (bukan terpotong), tombol minimal 40 px.
- **Cetak**: nav & tombol disembunyikan, kartu tanpa bayangan, warna teks hitam.

### 5.3 Yang berubah di file tab

- Token identik (21) & blok `.mmjnav` **dihapus** dari masing-masing CSS tab.
- Tab HE: token & aturan dark-nya dipindah ke `theme.css` (dark tetap aktif
  lewat `html[data-theme="dark"]` ✔).
- Tab lain: dapat tambahan blok token dark + aturan dark dasar.

### 5.4 Pembersihan sampingan (aman, tanpa mengubah fungsi)

- `dashboard-mmj/index.html` (sumber shell): 4 salinan blok nav dihapus →
  digantikan 1 blok di `tools/gabungan/build_gabungan.py` (`BAR_CSS`/`BAR_JS`).
  Perhatian: 4 template itu **dipakai verbatim** oleh build → nav harus
  disisipkan saat build (bukan di dalam template).

## 6. Verifikasi

| Cara | Yang diperiksa |
|---|---|
| `python build_gabungan_he.py` | build sukses, semua CSS tab terbit |
| `python check_login.py` | kelengkapan file hasil build |
| `python check_login_browser.py` | 16 pemeriksaan perilaku (login, menu per izin, Keluar→halaman utama) tetap hijau |
| **Pixel-diff 5 tab × 2 lebar** (1280 & 460) | tema terang **tidak berubah** (beda < ambang) → Regression guard |
| Cek manual | 5 tab desktop + mobile + tema gelap + mode cetak |

## 7. Yang belum diputuskan (untuk instruksi berikutnya)

1. **Ambang pixel-diff** yang masih dianggap aman (usul: ≤ 0,5% piksel beda).
2. **Fase 2 — lapisan data**: cara mengirim data (JSON + loader kecil) tanpa
   mematikan mode `file://`; target: `lt.js` 1 MB → jauh lebih kecil.
3. **Fase 3 — kode/build**: hilangkan sisa duplikasi, rapikan struktur folder.

## 8. Yang dikerjakan (pemetaan file)

| File | Status | Peran |
|---|---|---|
| `dashboard-mmj/tools/gabungan/theme.css` | baru | token bersama, reset, komponen inti, tema gelap dasar |
| `dashboard-mmj/tools/gabungan/emit_site.py` | ubah | emit `assets/css/theme.css` + tag `<link>` di `index.html` |
| `dashboard-mmj/tools/gabungan/build_gabungan.py` | ubah | hapus blok nav dari 4 template (sisipkan saat build) |
| `dashboard-mmj/tools/gabungan/build_gabungan_he.py` | ubah | sisipkan CSS tema ke 5 template |
| `dashboard-mmj/index.html` (sumber shell) | ubah | hapus 4 salinan nav |
| 4 template di `dashboard-mmj/index.html` + `exec_template.html` | ubah | hapus token identik + blok nav; tambah varian dark |
| `dashboard-mmj/tools/gabungan/check_visual.py` | baru | pixel-diff per tab (regression guard) |
| `dashboard-mmj/README.md` | ubah | dokumentasi design system |
