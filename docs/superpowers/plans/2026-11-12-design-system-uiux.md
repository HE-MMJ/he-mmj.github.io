# Design System + UI/UX Dashboard MMJ — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satu `theme.css` (token bersama, reset, komponen inti, tema gelap dasar) untuk kelima dashboard — tampilan terang harus tetap sama, data & fungsi tidak berubah.

**Architecture:** `theme.css` dimuat sekali di `index.html` **sebelum** CSS tab (tab tetap bisa menimpa). Aturan `.mmjnav` yang 5× terduplikasi pindah ke `theme.css` (dari `BAR_CSS` di `build_gabungan.py`). Palet gelap yang identik di kelima tab jadi token bersama; palet terang tetap per-tab. Verifikasi memakai **pixel-diff** per tab (regression guard).

**Tech Stack:** HTML/CSS/JS murni, Python 3 untuk build + pixel-diff (PIL), Chrome headless untuk screenshot.

**Spec:** `docs/superpowers/specs/2026-11-12-design-system-uiux-design.md`

## Global Constraints

- Tanpa dependensi/framework baru. Tanpa mengubah data, perhitungan, atau alur fungsi.
- Semua file sumber baru di `dashboard-mmj/tools/gabungan/`; `assets/` **generated** — jangan diedit manual.
- **Seluruh pembacaan file sumber wajib `encoding="utf-8-sig"`** (BOM di tengah CSS → Chrome membuang seluruh stylesheet).
- `_write()` menulis tanpa BOM (`encoding="utf-8", newline="\n"`).
- Situs harus tetap jalan **offline lewat `file://`** (double-click index.html).
- Token, nama variabel, dan ID yang dipakai lintas file (tak boleh diubah):
  - `theme.css` → `assets/css/theme.css`, dimuat via `<link rel="stylesheet" href="assets/css/theme.css%(q)s">` di `index.html` **setelah** `boot.css` dan **sebelum** link CSS tab.
  - 21 token bersama (nilai gelap, identik di kelima tab):
    `--accent:#818cf8; --accent-soft:rgba(129,140,248,.18); --bad:#f87171; --bg-a:rgba(79,70,229,.34); --bg-b:rgba(124,58,237,.26); --bg-c:rgba(42,120,214,.22); --blur:blur(18px) saturate(160%); --border:rgba(255,255,255,.09); --good:#34d399; --h1-grad:linear-gradient(90deg,#a5b4fc,#c4b5fd); --hair:rgba(255,255,255,.08); --ink:#eef0ff; --ink-2:#b7bce0; --muted:#8a90b8; --page:#0a0c1d; --shadow:0 10px 30px rgba(0,0,0,.35); --side:rgba(22,25,54,.66); --surface:rgba(24,27,60,.62); --surface-2:rgba(42,46,94,.7); --surface-3:#272b5e; --surface-solid:#181b3c`
  - Aturan `.mmjnav` yang dipindah (dari `BAR_CSS`, `build_gabungan.py`): blok `.mmjnav` desktop + mobile, `.mmjnav .mlbl`, `.mmjnav .mmjg`, `.mmjnav a`, `.mmjnav a svg`, `.mmjnav a:hover`, `.mmjnav a[aria-current="page"]`, `.mmjnav .mhere`, `.mmjtop`, `.side{overflow-y:auto;scrollbar-width:thin}`, dan `@media print{.mmjnav,.mmjtop{display:none!important}}`.
  - Token **per-tab** (tetap di CSS tab): `--accent-2`, `--axis`, `--warn-bg`, `--warn-ink` (nilainya berbeda antar tab).
  - CLI pixel-diff: `python tools/gabungan/check_visual.py [--max 0.5] [--make-baseline]`.

## Review Focus

1. **Token per-tab hilang tak sengaja** → palet terang tiap dashboard berubah (warna kartu/garis/teks) → cek pixel-diff; juga cek nilai `--accent-2/--axis/--warn-bg/--warn-ink` masih ada per tab.
2. **Aturan `.mmjnav` hilang** → menu pemilih dashboard (Overview/Monitoring) tidak muncul atau tidak bisa diklik.
3. **`theme.css` dimuat setelah CSS tab** → tema gelap tidak berlaku (token gelap tertimpa palet terang).
4. **Ukuran file CSS membengkak** → `theme.css` harus tetap < 20 KB dan total CSS tidak naik (duplikasi hilang).
5. **Mode `file://` rusak** → assets dimuat lewat path relatif ✔; cek `file://` masih membuka dashboard.

---

### Task 1: Pixel-diff regression guard

**Files:**
- Create: `dashboard-mmj/tools/gabungan/check_visual.py`
- Create (generated): `dashboard-mmj/tools/gabungan/.visual-baseline/*.png` (git-ignored)

**Interfaces:**
- Consumes: URL lokal `http://127.0.0.1:<port>/index.html?nointro=1#tab=<tab>` (server statis dari root repo).
- Produces: `python check_visual.py` → exit 0 kalau semua tab dalam ambang; exit 1 kalau ada yang melewati; `--make-baseline` menulis ulang baseline.

- [ ] **Step 1: Tulis `check_visual.py`**

Spesifikasi:
- Server statis: `http.server` di root repo (3 tingkat ke atas dari file ini), port bebas.
- 5 tab: `exec, haul, batu, lt, he` × 2 lebar: `1280,760` dan `430,860` → 10 screenshot.
- Chrome headless: `--headless=new --disable-gpu --window-size=<w>,<h> --virtual-time-budget=9000 --screenshot=<file> "<url>"`.
- Baseline: folder `.visual-baseline/` di samping skrip; nama file `<tab>-<w>.png`.
- Bandingkan dengan PIL: `ImageChops.difference` → hitung piksel berbeda (`!= 0` per channel) → persen = differed / total.
- Ambang default **0,5%** (`--max`), opsional `--make-baseline` (menulis baseline, tidak membandingkan).
- Keluaran: satu baris per kombinasi `tab w: 0.12% (OK)`; ringkasan di akhir; exit 1 bila ada yang melewati ambang.

- [ ] **Step 2: Jalankan dengan `--make-baseline`** (dasar dari build saat ini)

Run: `cd D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan; python check_visual.py --make-baseline`
Expected: 10 file PNG dibuat, pesan "baseline dibuat (10 screenshot)".

- [ ] **Step 3: Jalankan sebagai pembanding**

Run: `python check_visual.py`
Expected: semua 0,00% → "OK: tampilan tidak berubah" → exit 0.

- [ ] **Step 4: Simpan baseline & skrip**

`git add dashboard-mmj/tools/gabungan/check_visual.py` + tambahkan `.visual-baseline/` ke `.gitignore`.

---

### Task 2: `theme.css` — token bersama, reset, komponen `.mmjnav`

**Files:**
- Create: `dashboard-mmj/tools/gabungan/theme.css`
- Modify: `dashboard-mmj/tools/gabungan/emit_site.py` (emit theme.css + tag `<link>`)
- Modify: `dashboard-mmj/tools/gabungan/build_gabungan.py` (BAR_CSS jadi kosong / tidak diinjeksi)
- Modify: `dashboard-mmj/tools/gabungan/build_gabungan_he.py` (hapus injeksi `nav_css`)
- Modify: `dashboard-mmj/index.html` (4 salinan blok nav di template → hapus)
- Modify: `dashboard-mmj/tools/gabungan/exec_template.html` (hapus blok nav bila ada)

**Interfaces:**
- Consumes: `BAR_CSS` (build_gabungan.py) → isi `theme.css`.
- Produces: `assets/css/theme.css` + `<link ... href="assets/css/theme.css?v=...">` di `index.html`.

- [ ] **Step 1: Buat `tools/gabungan/theme.css`**

Isi:
1. Header komentar (bahasa Indonesia, menyebut file sumber & aturan "jangan diedit manual").
2. Blok token bersama (21 token di atas) **di dalam `html[data-theme="dark"]`** (bukan `:root`) → palet terang tiap tab tetap menang ✔ (tab CSS dimuat setelahnya).
3. Reset & base: `html,body`, `*,::before,::after{box-sizing:border-box}`, `body{...}` minimal (jangan menimpa `font`/`background` tab), `::selection`, `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`, `::-webkit-scrollbar` tipis.
4. Blok `.mmjnav` **persis** dari `BAR_CSS` sekarang (desktop + mobile + `@media print` + `.mmjtop` + `.side{overflow-y:auto;scrollbar-width:thin}`).
5. `@media print{.mmjnav,.mmjtop{display:none!important}}` ✔.

- [ ] **Step 2: Emit `theme.css` + sisipkan `<link>` di `emit_site.py`**

- Tambahkan blok emit (setelah blok intro):
  `theme_css = open(os.path.join(here, "theme.css"), encoding="utf-8-sig").read()` → `_write(os.path.join(root, "assets/css/theme.css"), HDR % "assets/css/theme.css" + theme_css)`.
- Di template `doc` (index.html), tambahkan **setelah** `<link ... intro.css>` dan **sebelum** `%(preloads)s`:
  `<link rel="stylesheet" href="assets/css/theme.css%(q)s">`
  (CSS tab dimuat lewat `<link data-mmj-head>` saat tab dipasang → selalu setelah theme.css ✔)

- [ ] **Step 3: Hapus injeksi `BAR_CSS` ke tab**

- `build_gabungan.py`: `BAR_CSS` → `""` (dan jangan lagi diinjeksi ke template).
- `build_gabungan_he.py`: hapus `nav_css = mod.BAR_CSS` dan `+ nav_css +` dari `he_tpl`.
- `dashboard-mmj/index.html`: hapus blok `<style>` berisi `.mmjnav` dari keempat template (bagian yang persis sama dengan BAR_CSS).
- `exec_template.html`: hapus blok nav yang sama bila ada.

- [ ] **Step 4: Build + verifikasi**

Run:
```
cd D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan
python build_gabungan_he.py
python check_login.py
python check_visual.py
```
Expected: build sukses; `check_login.py` OK; `check_visual.py` → semua ≤ 0,5% (tampilan tidak berubah) ✔.

- [ ] **Step 5: Cek menu dashboard masih berfungsi**

Run: `python check_login_browser.py`
Expected: semua PASS (termasuk "publik: menu Cost Control tersembunyi" ✔ yang memakai `.mmjnav` ✔).

- [ ] **Step 6: Commit**

```bash
git add dashboard-mmj/tools/gabungan/theme.css dashboard-mmj/tools/gabungan/emit_site.py dashboard-mmj/tools/gabungan/build_gabungan.py dashboard-mmj/tools/gabungan/build_gabungan_he.py dashboard-mmj/index.html dashboard-mmj/tools/gabungan/exec_template.html assets/css/theme.css assets/css/*.css index.html
git commit -m "refactor(ui): theme.css bersama (token gelap, reset, menu dashboard) tanpa ubah tampilan"
```

---

### Task 3: Tema gelap seragam di kelima tab

**Files:**
- Modify: `dashboard-mmj/tools/gabungan/theme.css` (tambah blok `html[data-theme="dark"]` global: body, .side, .card, .ch, tabel, input, select, .nav a, .btn)
- Modify: 4 template di `dashboard-mmj/index.html` + `exec_template.html` (tambah varian gelap untuk komponen khusus tab)
- Modify: `dashboard-mmj/tools/gabungan/shell_loader.js` (pilihan tema disimpan di satu tempat & berlaku lintas tab)

**Interfaces:**
- Consumes: token gelap bersama dari Task 2; `localStorage` key `heTheme` (sudah dipakai tab HE).
- Produces: `html[data-theme="dark"]` berlaku di semua tab; tombol tema di tab lain (bila ada) memakai key yang sama.

- [ ] **Step 1: Tambah blok dark global di `theme.css`**

Isi (hanya properti generik; jangan sentuh komponen spesifik tab):
`html[data-theme="dark"] body{background:var(--page);color:var(--ink)}`, `.side`, `.card`, `.ch h2`, `table th/td/border`, `input,select,textarea`, `.nav a`, `.btn`, `.chip`, `.empty`.

- [ ] **Step 2: Varian gelap untuk komponen khusus 4 tab**

Untuk tiap tab (exec/haul/batu/lt): tambahkan blok `html[data-theme="dark"]` yang menata komponen khusus tab (kartu, tabel, grafik label, chip status) memakai token bersama ✔.

- [ ] **Step 3: Samakan penyimpanan tema lintas tab**

`shell_loader.js`: setelah tab dipasang, terapkan tema tersimpan:
```js
  try { if (localStorage.getItem("heTheme") === "dark") document.documentElement.setAttribute("data-theme", "dark"); } catch (e) { }
```
(hapus `document.documentElement.removeAttribute("data-theme")` di `mount()` supaya tema tidak hilang tiap pindah tab).

- [ ] **Step 4: Verifikasi**

Run: `python build_gabungan_he.py; python check_visual.py` → tampilan terang tetap ≤ 0,5% ✔ (tema gelap tidak aktif default ✔).
Lalu ambil 2 screenshot manual (exec & he, tema gelap aktif) dan bandingkan secara visual ✔.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): tema gelap seragam di kelima dashboard"
```

---

### Task 4: Skala UI/UX, aksesibilitas, cetak, mobile

**Files:**
- Modify: `dashboard-mmj/tools/gabungan/theme.css` (skala spacing/radius/typography, state kosong/loading, aturan cetak, perapian mobile)
- Modify: 5 template (hapus token yang kini duplikat di theme.css; pakai skala baru)
- Modify: `dashboard-mmj/tools/gabungan/check_visual.py` (mode `--info`: tampilkan persen tanpa menggagalkan)

**Interfaces:**
- Consumes: Task 2-3.
- Produces: token skala baru `--sp-1..--sp-6`, `--r-sm/--r-md/--r-lg`; aturan cetak & mobile di theme.css.

- [ ] **Step 1: Tambahkan skala & token dasar**

`theme.css`: `--sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px; --sp-6:32px;` `--r-sm:8px; --r-md:12px; --r-lg:16px;` + `font-variant-numeric:tabular-nums` untuk tabel angka ✔.

- [ ] **Step 2: Aturan cetak**

`@media print`: sembunyikan `.mmjnav,.mmjtop,button,.qbtn`; kartu tanpa bayangan; teks hitam; latar putih; `break-inside:avoid` untuk kartu.

- [ ] **Step 3: Perapian mobile**

`@media (max-width:900px)`: tabel boleh di-scroll (`overflow-x:auto` pada pembungkusnya), target tombol ≥ 40px, judul kartu tidak terlalu besar.

- [ ] **Step 4: Verifikasi + review visual**

Run: `python build_gabungan_he.py; python check_visual.py --info`
Expected: persen beda naik (> 0,5%) **secara wajar** karena jarak/typography dirapikan → **tidak** menggagalkan ✔.
Lalu tinjau 10 screenshot (5 tab × 2 lebar) secara visual dan perbaiki yang破损.

- [ ] **Step 5: Jalankan test perilaku**

Run: `python check_login.py; python check_login_browser.py` → semua PASS ✔.

- [ ] **Step 6: Update README + commit**

Tambahkan bagian "Design system" di `dashboard-mmj/README.md` (struktur theme.css, token, cara menambah komponen baru, aturan "tab CSS boleh menimpa theme.css").

```bash
git commit -m "feat(ui): skala spasi/radius/typography, aksesibilitas fokus, aturan cetak, mobile"
```

---

## Self-Review

- **Spec coverage:** §5.1 (4 bagian theme.css) → Task 2 (1-3) + Task 3 (1-2); §5.2 (skala UI/UX) → Task 4; §5.3 (perubahan di file tab) → Task 2-4; §5.4 (pembersihan 4 salinan) → Task 2 Step 3; §6 (verifikasi) → Task 1 + tiap task; §7 (ambang 0,5%) → Task 1 ✔.
- **Step scan:** tiap langkah satu tindakan + hasil yang bisa dicek ✔; tidak ada TBD.
- **Type consistency:** nama token, nama file, dan parameter CLI konsisten antar task ✔.
- **Review Focus:** #1 → pixel-diff tiap task; #2 → Task 2 Step 5 (check_login_browser memakai .mmjnav) ✔; #3 → urutan muat CSS (Task 2 Step 2) + Task 3 Step 4 ✔; #4 → ukuran theme.css + total CSS (dicek di Step 4 tiap task) ✔; #5 → uji `file://` (Task 4 Step 4) ✔.
- **Proportion:** 4 task; isi panjang hanya untuk `theme.css` & `check_visual.py` yang memang harus ditulis utuh ✔.
