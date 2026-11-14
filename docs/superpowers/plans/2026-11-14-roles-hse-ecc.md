# Role Admin General / HSE / ECC â€” Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (dipilih
> user: "kerjakan" â€” dikerjakan langsung di sesi ini). Steps use checkbox syntax.

**Goal:** Tiga role dengan menu sidebar tersaring, plus halaman Data Simper & Data DT.

**Architecture:** Capability ditandai di markup sidebar (`data-mmj-cap`), disaring
`assets/js/shell.js` memakai `MMJ_AUTH.can()`. Halaman baru dibuat dari template
Eksekutif di emitter, dengan gate `data-mmj-auth-page`.

**Tech Stack:** Python (build/emitter), JS vanilla, CSS, GitHub Pages statis.

**Spec:** `docs/superpowers/specs/2026-11-14-roles-hse-ecc-design.md`

## Global Constraints
- Data dashboard tidak berubah: `python test_built_data.py` harus "SAMA"/OK.
- Desain dashboard lama tidak berubah; menu hanya disembunyikan.
- URL tanpa ekstensi: folder + `index.html` di `D:\Timesheet\Dashboard`.
- Tanpa commit/push tanpa perintah eksplisit.

## Review Focus
- Tamu membuka halaman publik: semua menu publik tampil, Cost Control/Simper/DT tidak.
- Login HSE membuka `/Cost-Control/`: muncul "Tidak punya akses", bukan isi halaman.
- Login ECC membuka `/Data-Simper/`: sama, tidak bocor isinya.
- Menu bertanda `hidden` tetap tidak tampil walau CSS `display:flex` (butuh `!important`).
- Login tanpa `?next=` mendarat di halaman role, bukan selalu Eksekutif.

---

### Task 1: Role & akun di auth.js

**Files:** Modify `dashboard-mmj/tools/gabungan/auth.js`

**Interfaces (Produces):** `MMJ_AUTH.users` (3 user), `MMJ_AUTH.roleLabel(role) -> string`,
`MMJ_AUTH.homeOf(role) -> string` (relatif root, mis. `"Data-Simper/"`), `can(cap)`.

- [x] Tambah user `hse`/`hse2026` (role `hse`) dan `ecc`/`ecc2026` (role `ecc`).
- [x] `CAPS = { admin:{all:true}, hse:{hse:true}, ecc:{costcontrol:true} }`.
- [x] `ROLE_LABEL` + `ROLE_HOME`; expose `roleLabel` dan `homeOf`.
- [x] Verifikasi: `python check_login.py` (setelah build) memuat `roleLabel`.

### Task 2: Filter menu per capability (shell.js + shell.css)

**Files:** Modify `dashboard-mmj/tools/gabungan/shell_loader.js`, `shell.css`

- [x] `applyAuthMenus()` juga memproses `[data-mmj-cap]` dengan aturan
      `can(cap) || (cap === "public" && !loggedIn)`.
- [x] `shell.css`: `[data-mmj-cap][hidden]{display:none!important}`.
- [x] `mountUserMenu()` memakai `MMJ_AUTH.roleLabel(u.role)`.
- [x] `loginWall(perm)`: bedakan belum login vs tidak berhak (tombol ke `homeOf`).
- [x] `PAGE_URL` tambah `simper: "Data-Simper/"`, `dt: "Data-DT/"`.

### Task 3: Halaman Data Simper & Data DT + penanda menu

**Files:** Modify `build_gabungan_he.py`, `emit_site.py`

- [x] `_page_template()` generik (dipakai Cost Control, Simper, DT).
- [x] Template `mmjT_simper`, `mmjT_dt` dengan isi "data belum tersedia".
- [x] `emit_site.PAGES`: entri `simper`/`dt` (`auth: "hse"`, css sendiri).
- [x] `NAV_URL` + `_EXTRA_NAV` (Simper, DT, Cost Control) disisipkan ke `#mmjNav`
      dengan `data-mmj-cap`; tautan `#tab=` diberi `data-mmj-cap="public"`.

### Task 4: Login mendarat di halaman role

**Files:** Modify `dashboard-mmj/tools/gabungan/login.html`

- [x] `location.replace(next && next[0]==="/" ? next : homeOf(user.role))`.

### Task 5: Verifikasi

- [x] `python build_gabungan_he.py` â†’ 3 template baru ter-emit.
- [x] `python check_pages.py`, `python check_login.py`, `python test_built_data.py`,
      `python check_data_browser.py` â†’ semua OK.
- [x] Perbarui `check_pages.py` (3 halaman ber-izin) dan `check_login.py` (role).
- [x] Uji browser: tamu, General, HSE, ECC di `/`, `/Data-Simper/`, `/Cost-Control/`.

