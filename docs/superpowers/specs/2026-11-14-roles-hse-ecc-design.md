# Role Admin General / Admin HSE / Admin ECC — Design

## Intent
Dashboard MMJ dipakai beberapa bagian. Dashboard monitoring tetap publik, tetapi
menu yang tampil di sidebar mengikuti role user yang login. HSE hanya melihat data
HSE (Data Simper, Data DT); ECC hanya melihat Cost Control; Admin General melihat
semua.

## Goals
- Tiga role: `admin` (Admin General), `hse` (Admin HSE), `ecc` (Admin ECC).
- Menu sidebar disaring per role; tamu (belum login) tetap melihat menu publik.
- Dua halaman baru: `/Data-Simper/` dan `/Data-DT/`, hanya untuk role HSE + General.
- Cost Control tetap hanya untuk General + ECC.
- Setelah login tanpa `?next=`, user mendarat di halaman role-nya.
- Label role di sidebar: "Admin General", "Admin HSE", "Admin ECC".

## Non-goals
- Tidak mengunci halaman monitoring publik (keputusan user: tetap publik).
- Tidak mengubah data atau desain dashboard yang sudah ada.
- Tidak membuat backend; pembatas akses tetap sebatas UI (situs statis).
- Tidak mengisi data Simper/DT (menunggu perintah lanjutan).

## Anti-goals
- Menu dobel / sidebar berubah bentuk karena menu dibangun ulang dari JS.
- Halaman publik jadi butuh login.

## Approaches
1. **Penanda capability pada markup (dipilih).** Tiap tautan sidebar diberi
   `data-mmj-cap="public|hse|costcontrol"`; `shell.js` menyembunyikan yang tidak
   cocok dengan role. Markup & desain tetap, hanya visibilitas diatur.
2. **Menu diduplikasi per role.** Ditolak: markup menu jadi tiga salinan, rawan
   tidak sinkron saat menu berubah.
3. **Menu dirender dari peta role→item di JS.** Ditolak: sidebar dibangun ulang,
   berisiko mengubah desain dan urutan ikon.

## Design
- **auth.js**: daftar user (admin/hse/ecc), `CAPS` per role, `roleLabel(role)`,
  `homeOf(role)`; `can(cap)` tetap satu pintu (role `admin` = semua).
- **Menu**: `data-mmj-cap` pada tautan `#mmjNav`; aturan tampil
  `can(cap) || (cap === "public" && belum login)`.
  - Tamu: 5 monitoring + Eksekutif.
  - General: semua (monitoring, Data Simper, Data DT, Cost Control).
  - HSE: Data Simper + Data DT.
  - ECC: Cost Control.
- **Halaman baru**: template `mmjT_simper` dan `mmjT_dt` diturunkan dari template
  Eksekutif (shell/sidebar sama, isi diganti), memakai `data-mmj-auth-page="hse"`.
  Isi sementara: satu kartu "data belum tersedia" (tanpa mengarang metrik).
- **Gate halaman**: `data-mmj-auth-page` → belum login: panel "Perlu masuk" +
  tombol ke `login.html?next=…`; sudah login tanpa izin: panel "Tidak punya akses"
  + tombol ke halaman role-nya.
- **Login**: `?next=` (hanya path internal) atau halaman role.

## Constraints
- Situs statis GitHub Pages; data berupa file JS publik → pembatasan ini hanya
  UI, bukan pengaman.
- URL halaman tanpa ekstensi (folder + `index.html`).
- Data dashboard tidak boleh berubah (`test_built_data.py` harus tetap OK).
