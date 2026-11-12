# Desain: Menu Login + Halaman Login (Dashboard MMJ)

Tanggal: 2026-11-12 · Status: menunggu persetujuan · Ukuran: perubahan kecil

## 1. Maksud & latar

Dashboard MMJ (`he-mmj.github.io`) sekarang terbuka untuk siapa saja. Pemohon
minta **menu login + halaman login** lebih dulu; **peran (role) menyusul** dan
akan diminta terpisah.

Model yang dipilih (disepakati): **pintu masuk sisi browser** — validasi di
`assets/js/auth.js`, sesi di `localStorage`/`sessionStorage`.

### Batasan yang harus disadari (sudah dibicarakan)

Situsnya statis di GitHub Pages, dan **data dashboard berupa file JS publik**
(`assets/data/he.js`, `lt.js`, dst. ±2 MB). Maka:

- Login ini **pembatas akses, bukan pengaman**. Pengunjung yang tahu URL tetap
  bisa membuka `assets/data/he.js` langsung di browser.
- Pengaman sungguhan butuh layanan di luar repo (Cloudflare Access / Supabase
  / Firebase) atau backend sendiri. Jalur ini nanti bisa dipasang **tanpa
  mengubah halaman**, karena semua pengecekan terkumpul di `MMJ_AUTH`.
- Karena itu kata sandi disimpan apa adanya di `auth.js` (itu memang tidak
  menambah keamanan, tapi membuat daftar user mudah diedit nanti).

## 2. Tujuan / bukan tujuan

**Tujuan**

1. Halaman login terpisah (`login.html`) yang konsisten dengan tema dashboard.
2. `assets/js/auth.js` sebagai satu-satunya sumber kebenaran (login, logout,
   sesi, cek role).
3. `index.html` terlindungi: belum login → diarahkan ke `login.html`.
4. Menu user di sidebar (nama pengguna + tombol Keluar) untuk semua tab.
5. Pondasi role sudah ada sejak awal (field `role` + `MMJ_AUTH.can(...)`),
   supaya nanti tinggal diisi.

**Bukan tujuan (sekarang)**

- Pengaman sungguhan / enkripsi kredensial.
- Role & hak akses per menu (menunggu perintah).
- Halaman profil, ganti kata sandi, daftar user UI (manfaat).
- Multi-user sungguhan (login dipakai bergantian di perangkat yang sama).

## 3. Batasan teknis

| Batasan | Dampak |
|---|---|
| Statis, tanpa server | Validasi hanya di browser; sesi pakai Web Storage |
| `assets/` di root **dihasilkan build** (`emit_site.py`) | File baru harus dibuat di `tools/gabungan/` lalu di-emit, bukan ditulis manual di `assets/` |
| Sidebar dibuat per-template | Menu user disuntikkan oleh loader (satu tempat) agar konsisten di 5 tab |
| Loader (`assets/js/shell.js`) mengosongkan `<body>` tiap pindah tab | Elemen menu user ikut hilang → harus disuntikkan ulang tiap mount |
| Intro pembuka sudah ada | Halaman login memakai tema gelap yang sama dengan intro agar menyambung |

## 4. Pendekatan yang dipertimbangkan

| Opsi | Trade-off | Dipilih |
|---|---|---|
| **Pintu masuk sisi browser** (JS + Web Storage) | Cepat, tanpa akun/izin luar, jalan offline. Bukan pengaman sungguhan | ✅ |
| Autentikasi lewat layanan luar (Cloudflare Access/Supabase/Firebase) | Kredensial asli, data terlindungi. Perlu akun + kunci + konfigurasi domain; login UI di luar kendali kita | Tidak (nanti) |
| Backend sendiri | Kontrol penuh. Rewrite besar: semua data harus jadi API, butuh hosting | Tidak (nanti) |

**Bentuk login** — dialog-overlay di `index.html` **atau** halaman terpisah
`login.html`? → **Halaman terpisah**: pemohon menyebut "halaman login dan
halaman-halamannya", dan terpisah membuat menu user/guard lebih rapi.

## 5. Desain

### 5.1 Halaman `login.html`

Tema gelap senada intro (`#050a14` + glow indigo + grid halus), logo mark MMJ:

```
+--------------------------------------------------+
|                   [ logo mark ]                   |
|                                                  |
|               DASHBOARD MMJ 2026                 |
|          Masuk untuk membuka dashboard            |
|                                                  |
|   Nama pengguna   [______________________]       |
|   Kata sandi      [______________________]  👁    |
|                                                  |
|   [ ] Ingat saya di perangkat ini                 |
|                                                  |
|              [        Masuk        ]             |
|                                                  |
|      "Nama pengguna atau kata sandi salah"        |
+--------------------------------------------------+
```

- Tombol 👁 untuk lihat/sembunyikan kata sandi.
- Pesan salah di bawah form (bukan alert).
- Setelah berhasil → `location.replace("index.html")` (supaya tombol "kembali"
  tidak mengulang form).
- Tombol "Masuk" dinonaktifkan + teks "Memproses…" saatFade proses.

### 5.2 `assets/js/auth.js` (sumber `tools/gabungan/auth.js`)

```js
window.MMJ_AUTH = {
  users: [                       // <- diganti/diisi nanti (role menyusul)
    { id: "u1", name: "Rizualdi Fadli", username: "admin", pass: "mmj2026",
      role: "admin" }
  ],
  login(username, pass)  -> user | null,
  logout(),
  current()              -> user | null,
  isLoggedIn()           -> bool,
  can(cap)               -> bool,     // cek role; sekarang semua role = semua
  sessionKey: "mmjSession",
  rememberKey: "mmjRemember"
};
```

- Sesi: `localStorage` bila "Ingat saya" dicentang, else `sessionStorage`.
- `login()` menerima username **tanpa** case-sensitive; pesan error sama untuk
  username salah maupun sandi salah (tidak membocorkan mana yang salah).
- `can(cap)` untuk sementara selalu `true` untuk role yang ada; nanti jadi
  pemeriksa `role`.

### 5.3 Guard di halaman dashboard

Di `assets/js/shell.js` (loader), **sebelum** tab dipasang:

```js
if (!window.MMJ_AUTH || !MMJ_AUTH.isLoggedIn()) {
  location.replace("login.html");
  return;   // jangan pasang dashboard
}
```

`auth.js` dimuat **sebelum** `shell.js` di `index.html` (dari `emit_site.py`).

### 5.4 Menu user di sidebar

Loader menyuntikkan (setiap mount, ke bawah sidebar):

```
+----------------------------+
| ( R )  Rizualdi Fadli      |
|       admin               |
|       [  Keluar  ]        |
+----------------------------+
```

- Inisial pada avatar bulat, nama, role, tombol Keluar.
- "Keluar" → `MMJ_AUTH.logout()` → `location.replace("login.html")`.
- Disesuaikan dengan tema terang/gelap tab HE.

### 5.5 Role (nanti)

- Field `role` sudah ada di data user + helper `MMJ_AUTH.can(...)`.
- Titik sambung untuk menyembunyikan menu per role: filter di
  `shell_loader.js` (fungsi `markNav`/`placeNav`) → nanti satu blok filter.

## 6. Yang dikerjakan (pemetaan file)

| File | Status | Peran |
|---|---|---|
| `tools/gabungan/auth.js` | baru → emit `assets/js/auth.js` | daftar user, login/logout, sesi, `can()` |
| `tools/gabungan/login.css` | baru → emit `assets/css/login.css` | gaya halaman login |
| `tools/gabungan/login.html` | baru → `login.html` | halaman login |
| `tools/gabungan/shell_loader.js` | ubah → `assets/js/shell.js` | guard login + suntik menu user |
| `tools/gabungan/emit_site.py` | ubah | emit `auth.js` + `login.css`, sisipkan tag `<script>`/`<link>` & `login.html` |
| `tools/gabungan/build_gabungan_he.py` | ubah | salin `login.html` ke root repo |

## 7. Yang belum diputuskan (untuk perintah berikutnya)

1. **Daftar user & role** (siapa saja, peran masing-masing).
2. **Menu/tab mana yang boleh dibuka per role** (mis. role `he` hanya Heavy Equipment).
3. **Kebijakan "Ingat saya"** (default nyala/mati, durasi).
4. Possibly: logout otomatis setelah idle.

## 8. Cara verifikasi

- `http://localhost:8109/index.html` → harus heartbreak ke `login.html`.
- Login gagal → pesan error, tetap di halaman.
- Login benar → masuk ke dashboard, intro plays, menu user tampil di sidebar.
- Pindah tab → menu user tetap ada, nav tetap di sidebar.
- "Keluar" → kembali ke `login.html`.
- `?nointro=1` untuk memeriksa halaman tanpa intro.
