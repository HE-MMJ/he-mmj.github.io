# Login Menu & Login Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan gerbang login (pintu masuk sisi browser) ke Dashboard MMJ: halaman `login.html`, sumber kebenaran `MMJ_AUTH`, guard di loader, dan menu user di sidebar — dengan hook role yang siap diisi nanti.

**Architecture:** `assets/js/auth.js` menyimpan daftar user + sesi di Web Storage; `assets/js/shell.js` (loader) memeriksa sesi **sebelum** memasang dashboard dan menyuntikkan menu user ke sidebar tiap tab. Halaman login terpisah (`login.html`) berada di root repo. Semua file baru dibuat di `tools/gabungan/` lalu di-*emit* ke `assets/` oleh `emit_site.py` — `assets/` tidak boleh diedit manual.

**Tech Stack:** HTML/CSS/JS murni (tanpa dependensi, tanpa build tool frontend), Python 3 untuk build (`emit_site.py`), Chrome headless untuk verifikasi tampilan.

**Spec:** `docs/superpowers/specs/2026-11-12-login-menu-design.md`

## Global Constraints

- **Tidak ada dependensi baru.** Vanilla JS/CSS, tanpa framework, tanpa library.
- **Semua file baru dibuat di `dashboard-mmj/tools/gabungan/`**, lalu di-*emit* ke `assets/` / root repo oleh `emit_site.py`. Jangan menulis langsung ke `assets/`.
- **Pola emit yang dipakai** (mengikuti `intro.css`/`intro.js` yang sudah ada):
  `HDR % rel + isi_file`, dengan `HDR = "/* %s - dibuat otomatis oleh emit_site.py, jangan diedit manual. */\n"`.
- **Baca file sumber dengan `encoding="utf-8-sig"`** — kalau file sumber pernah tersimpan dengan BOM (PowerShell), BOM itu masuk ke tengah hasil emit dan Chrome **membuang seluruh stylesheet** (bug yang sudah pernah terjadi pada `intro.css`).
- **Penulisan file hasil emit tanpa BOM**: `_write()` memakai `encoding="utf-8", newline="\n"`.
- **Tanpa server**: login adalah pembatas akses, bukan pengaman. Data di `assets/data/*.js` tetap publik. Jangan menulis kode yang menyesatkan soal ini (komentar di `auth.js` harus menyebutnya).
- **Nama & ID yang harus persis** (dipakai lintas file):
  - `window.MMJ_AUTH` dengan properti: `users`, `sessionKey`, `rememberKey`, `login()`, `logout()`, `current()`, `isLoggedIn()`, `can()`
  - `sessionKey = "mmjSession"`, `rememberKey = "mmjRemember"`
  - elemen halaman login: `fLogin`, `uUser`, `uPass`, `uRemember`, `btnLogin`, `btnSee`, `errMsg`
  - kelas menu user: `.mmj-user`, `.mmj-user-av`, `.mmj-user-tx`, `.mmj-user-out`
- **Teks dari data user selalu dipasang lewat `textContent`**, tidak pernah `innerHTML` (nama user bisa berisi karakter apa saja).
- **Urutan skrip di `index.html`**: `assets/js/auth.js` **harus sebelum** `assets/js/shell.js`, karena loader memeriksa sesi saat start.
- **Gaya menu user** diletakkan di file CSS baru `assets/css/shell.css` (bukan disalin ke 4 template `dashboard-mmj/index.html` yang masing-masing punya salinan CSS `.mmjnav`).

## Review Focus

Kelima kondisi berikut paling mungkin menggigit pengguna dan **wajib punya test**:

1. **Sesi milik user yang sudah dihapus dari daftar user** → `current()` wajib mengembalikan `null`, sehingga dashboard mengarahkan balik ke login (bukan crash / dashboard kebuka).
2. **`localStorage` diblokir** (mode privat / iframe) → login tetap berhasil memakai `sessionStorage`; kalau keduanya tidak bisa dipakai, tampilkan pesan jelas, jangan `throw`.
3. **Reload saat login gagal** → pesan error tetap muncul setelah reload-retry, dan tidak terjadi loop redirect.
4. **Username dengan huruf besar/kecil/spasi berbeda** (`  Admin ` vs `admin`) → tetap diterima.
5. **Guard harus mendahului intro** → dashboard tidak boleh berkedip di layar sebelum pengguna diarahkan ke halaman login.

---

## File Structure

| File | Status | Tanggung jawab |
|---|---|---|
| `dashboard-mmj/tools/gabungan/auth.js` | create | `window.MMJ_AUTH`: daftar user, login/logout, sesi, `can()` |
| `dashboard-mmj/tools/gabungan/login.css` | create | gaya halaman login (tema gelap senada intro) |
| `dashboard-mmj/tools/gabungan/login.html` | create | halaman login (form + perilaku) |
| `dashboard-mmj/tools/gabungan/shell.css` | create | gaya menu user di sidebar (terang + gelap) |
| `dashboard-mmj/tools/gabungan/shell_loader.js` | modify | guard login + suntik menu user tiap mount |
| `dashboard-mmj/tools/gabungan/emit_site.py` | modify | emit `auth.js`, `login.css`, `shell.css`; salin `login.html`; sisipkan tag ke `index.html` |
| `dashboard-mmj/tools/gabungan/check_login.py` | create | pemeriksaan otomatis hasil build (pytest tidak ada di project ini) |
| `assets/js/auth.js`, `assets/css/login.css`, `assets/css/shell.css`, `login.html` | generated | keluaran build |
| `dashboard-mmj/README.md` | modify | dokumentasi |

---

### Task 1: `auth.js` + emit + halaman login

**Files:**
- Create: `dashboard-mmj/tools/gabungan/auth.js`
- Create: `dashboard-mmj/tools/gabungan/login.css`
- Create: `dashboard-mmj/tools/gabungan/login.html`
- Create: `dashboard-mmj/tools/gabungan/shell.css`
- Modify: `dashboard-mmj/tools/gabungan/emit_site.py` (bagian "intro (animasi pembuka)")
- Test: `dashboard-mmj/tools/gabungan/check_login.py`

**Interfaces:**
- Consumes: tidak ada (task pertama).
- Produces:
  - `assets/js/auth.js` → `window.MMJ_AUTH` dengan `users`, `sessionKey`, `rememberKey`, `login(username, pass, remember)`, `logout()`, `current()`, `isLoggedIn()`, `can(cap)`.
  - `assets/css/login.css`, `assets/css/shell.css`, `login.html` (root repo).
  - `check_login.py` yang dipakai Task 2-4.

- [ ] **Step 1: Tulis `tools/gabungan/auth.js`**

Buat file dengan isi berikut (persis; nilai `users` diganti nanti):

```js
/* =============================================================================
   Auth Dashboard MMJ - daftar user, sesi, dan cek role.
   Dibuat dari tools/gabungan/auth.js  ->  assets/js/auth.js
   -----------------------------------------------------------------------------
   PENTING: situsnya statis (GitHub Pages) dan data dashboard berupa file JS
   publik. Jadi login ini PEMBATAS AKSES, bukan pengaman: siapa pun yang tahu
   URL masih bisa membuka assets/data/<tab>.js langsung. Pengaman sungguhan
   butuh layanan/server di luar repo.

   Daftar user & ROLE diisi di sini (bagian `users`). Role dipakai lewat
   MMJ_AUTH.can("...") - untuk sekarang semua hak akses milik role "admin".
   ============================================================================= */
(function () {
  "use strict";

  /* daftar user: ganti nanti sesuai permintaan */
  var users = [
    { id: "u1", name: "Rizualdi Fadli", username: "admin", pass: "mmj2026", role: "admin" }
  ];

  /* hak akses per role - diisi nanti; "admin" selalu boleh semuanya */
  var CAPS = { admin: { all: true } };

  var sessionKey = "mmjSession";
  var rememberKey = "mmjRemember";

  function store(pick) {
    try { return pick(window.localStorage); } catch (e) { }
    try { return pick(window.sessionStorage); } catch (e) { }
    return null;
  }

  function readSession() {
    var raw = store(function (s) { return s.getItem(sessionKey); });
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function findUser(username) {
    var u = String(username == null ? "" : username).trim().toLowerCase();
    if (!u) return null;
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].username).trim().toLowerCase() === u) return users[i];
    }
    return null;
  }

  function publicUser(u) {
    return { id: u.id, name: u.name, username: u.username, role: u.role };
  }

  var MMJ_AUTH = {
    users: users,
    sessionKey: sessionKey,
    rememberKey: rememberKey,

    /* login(username, pass, remember) -> user|null */
    login: function (username, pass, remember) {
      var u = findUser(username);
      if (!u) return null;
      if (String(u.pass) !== String(pass == null ? "" : pass)) return null;
      var sess = { id: u.id, name: u.name, role: u.role, ts: Date.now() };
      var json = JSON.stringify(sess);
      var ok = false;
      if (remember) {
        ok = !!store(function (s) { s.setItem(sessionKey, json); return true; });
        try { window.localStorage.setItem(rememberKey, "1"); } catch (e) { }
      } else {
        ok = !!store(function (s) { s.setItem(sessionKey, json); return true; });
      }
      if (!ok) return null;            /* storage diblokir -> gagal, bukan crash */
      return publicUser(u);
    },

    logout: function () {
      try { window.localStorage.removeItem(sessionKey); } catch (e) { }
      try { window.sessionStorage.removeItem(sessionKey); } catch (e) { }
      try { window.localStorage.removeItem(rememberKey); } catch (e) { }
      return true;
    },

    /* user yang sedang login, atau null. Sesi milik user yang sudah dihapus
       dari daftar -> dianggap belum login. */
    current: function () {
      var s = readSession();
      if (!s || !s.id) return null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === s.id) return publicUser(users[i]);
      }
      return null;
    },

    isLoggedIn: function () { return !!MMJ_AUTH.current(); },

    /* cek hak akses; dipakai nanti untuk menyembunyikan menu per role */
    can: function (cap) {
      var u = MMJ_AUTH.current();
      if (!u) return false;
      if (u.role === "admin") return true;
      return !!(CAPS[u.role] && CAPS[u.role][cap]);
    }
  };

  window.MMJ_AUTH = MMJ_AUTH;
})();
```

- [ ] **Step 2: Tulis `tools/gabungan/login.html`**

Halaman mandiri (tema gelap senada intro). Wajib memuat `assets/js/auth.js` **sebelum** script form-nya, dan memakai placeholder `__V__` (diganti nomor versi oleh `emit_site.py`).

```html
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Masuk · Dashboard MMJ 2026</title>
<link rel="icon" href="assets/img/favicon.png?__V__">
<link rel="stylesheet" href="assets/css/login.css?__V__">
</head>
<body>
<main class="lg-wrap">
  <form class="lg-card" id="fLogin" autocomplete="on" novalidate>
    <img class="lg-logo" src="assets/logo-mmj.png" alt="Musi Mitra Jaya">
    <h1 class="lg-title">Dashboard MMJ 2026</h1>
    <p class="lg-sub">Masuk untuk membuka dashboard</p>

    <label class="lg-field">
      <span>Nama pengguna</span>
      <input id="uUser" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required>
    </label>

    <label class="lg-field">
      <span>Kata sandi</span>
      <span class="lg-pw">
        <input id="uPass" name="password" type="password" autocomplete="current-password" required>
        <button id="btnSee" type="button" class="lg-see" aria-label="Lihat kata sandi">&#9673;</button>
      </span>
    </label>

    <label class="lg-remember">
      <input id="uRemember" type="checkbox">
      <span>Ingat saya di perangkat ini</span>
    </label>

    <button id="btnLogin" type="submit" class="lg-btn">Masuk</button>

    <p id="errMsg" class="lg-err" hidden>Nama pengguna atau kata sandi salah.</p>
  </form>
</main>

<script src="assets/js/auth.js?__V__"></script>
<script>
(function () {
  "use strict";
  var f = document.getElementById("fLogin"),
      u = document.getElementById("uUser"),
      p = document.getElementById("uPass"),
      r = document.getElementById("uRemember"),
      b = document.getElementById("btnLogin"),
      e = document.getElementById("errMsg"),
      see = document.getElementById("btnSee");

  see.addEventListener("click", function () {
    var show = p.type === "password";
    p.type = show ? "text" : "password";
    see.setAttribute("aria-label", show ? "Sembunyikan kata sandi" : "Lihat kata sandi");
  });

  f.addEventListener("submit", function (ev) {
    ev.preventDefault();
    e.hidden = true;
    var user = window.MMJ_AUTH.login(u.value, p.value, r.checked);
    if (!user) {
      e.hidden = false;
      f.classList.remove("lg-shake");
      void f.offsetWidth;
      f.classList.add("lg-shake");
      return;
    }
    b.disabled = true;
    b.textContent = "Memproses…";
    location.replace("index.html");
  });
})();
</script>
</body>
</html>
```

- [ ] **Step 3: Tulis `tools/gabungan/login.css`**

Gaya halaman login (latar `#050a14` + glow indigo + grid halus, kartu kaca, error merah, animasi `lg-shake`):

```css
/* Login Dashboard MMJ - dari tools/gabungan/login.css -> assets/css/login.css */
:root{ --lg-ink:#f4f7ff; --lg-muted:#8b97b5; --lg-line:rgba(255,255,255,.14); }
*{box-sizing:border-box}
body{
  margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:24px;color:var(--lg-ink);
  font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;
  background:
    radial-gradient(900px 520px at 50% 42%, rgba(99,102,241,.30), transparent 62%),
    radial-gradient(620px 420px at 50% 42%, rgba(34,211,238,.14), transparent 66%),
    #050a14;
}
body::before{
  content:"";position:fixed;inset:-12%;pointer-events:none;
  background-image:
    linear-gradient(rgba(120,160,255,.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120,160,255,.055) 1px, transparent 1px);
  background-size:64px 64px;
  -webkit-mask-image:radial-gradient(circle at 50% 42%,#000 8%,transparent 70%);
  mask-image:radial-gradient(circle at 50% 42%,#000 8%,transparent 70%);
}
.lg-wrap{position:relative;width:100%;max-width:400px}
.lg-card{
  display:flex;flex-direction:column;align-items:center;gap:10px;
  padding:34px 28px 26px;border-radius:22px;
  background:rgba(12,18,32,.72);border:1px solid var(--lg-line);
  box-shadow:0 24px 60px rgba(0,0,0,.45);backdrop-filter:blur(14px);
}
.lg-logo{width:76px;height:auto;filter:drop-shadow(0 10px 26px rgba(120,160,255,.35))}
.lg-title{margin:6px 0 0;font-size:20px;letter-spacing:.06em;text-transform:uppercase}
.lg-sub{margin:0 0 12px;color:var(--lg-muted);font-size:13.5px;text-align:center}
.lg-field{display:flex;flex-direction:column;gap:6px;width:100%}
.lg-field>span{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--lg-muted)}
.lg-field input{
  width:100%;padding:11px 13px;border-radius:12px;font-size:15px;color:var(--lg-ink);
  background:rgba(255,255,255,.06);border:1px solid var(--lg-line);outline:none;
}
.lg-field input:focus{border-color:#6366f1;background:rgba(99,102,241,.12)}
.lg-pw{position:relative;display:block}
.lg-pw input{padding-right:44px}
.lg-see{
  position:absolute;right:6px;top:50%;transform:translateY(-50%);
  width:34px;height:34px;border:0;border-radius:9px;cursor:pointer;
  background:transparent;color:var(--lg-muted);font-size:15px;
}
.lg-see:hover{color:var(--lg-ink)}
.lg-remember{display:flex;align-items:center;gap:8px;width:100%;color:var(--lg-muted);font-size:13px}
.lg-btn{
  width:100%;margin-top:6px;padding:12px;border:0;border-radius:12px;cursor:pointer;
  font-size:15px;font-weight:700;color:#fff;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  box-shadow:0 10px 24px rgba(99,102,241,.35);
}
.lg-btn:disabled{opacity:.7;cursor:default}
.lg-err{margin:2px 0 0;color:#fca5a5;font-size:13px;text-align:center}
.lg-shake{animation:lg-shake .32s ease-in-out}
@keyframes lg-shake{
  0%,100%{transform:translateX(0)}
  25%{transform:translateX(-7px)}
  75%{transform:translateX(7px)}
}
@media (max-width:420px){ .lg-card{padding:26px 20px 22px;border-radius:18px} }
```

- [ ] **Step 4: Tulis `tools/gabungan/shell.css`**

Gaya menu user di sidebar (dipakai di semua tab, terang + gelap):

```css
/* Menu user Dashboard MMJ - dari tools/gabungan/shell.css -> assets/css/shell.css */
.mmj-user{
  display:flex;align-items:center;gap:10px;margin-top:auto;padding:12px 10px 2px;
  border-top:1px solid var(--line,#e2e8f0);
}
.mmj-user-av{
  flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;
  font-size:14px;font-weight:700;color:#fff;background:linear-gradient(135deg,#6366f1,#8b5cf6);
}
.mmj-user-tx{display:flex;flex-direction:column;min-width:0;flex:1}
.mmj-user-tx b{font-size:13px;font-weight:600;color:var(--ink,#121833);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mmj-user-tx span{font-size:11px;color:var(--muted,#64748b);text-transform:uppercase;letter-spacing:.08em}
.mmj-user-out{
  flex:none;border:1px solid var(--line,#e2e8f0);background:transparent;color:var(--muted,#64748b);
  border-radius:9px;padding:6px 9px;font-size:11.5px;cursor:pointer;
}
.mmj-user-out:hover{color:#e11d48;border-color:#fda4af;background:#fff1f2}
html[data-theme="dark"] .mmj-user{border-top-color:rgba(255,255,255,.12)}
html[data-theme="dark"] .mmj-user-tx b{color:#e8ecf7}
html[data-theme="dark"] .mmj-user-out{color:#9aa6c4;border-color:rgba(255,255,255,.16)}
html[data-theme="dark"] .mmj-user-out:hover{color:#fda4af;border-color:#fda4af;background:rgba(253,164,175,.12)}
```

- [ ] **Step 5: Emit file baru di `emit_site.py`**

Di `emit_site.py`, tepat setelah blok "---- intro (animasi pembuka)", tambahkan:

```python
    # ---- auth (login) + css login + css shell
    auth_js = open(os.path.join(here, "auth.js"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/js/auth.js"), HDR % "assets/js/auth.js" + auth_js)
    login_css = open(os.path.join(here, "login.css"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/css/login.css"), HDR % "assets/css/login.css" + login_css)
    shell_css = open(os.path.join(here, "shell.css"), encoding="utf-8-sig").read()
    _write(os.path.join(root, "assets/css/shell.css"), HDR % "assets/css/shell.css" + shell_css)

    # ---- halaman login (dari tools/gabungan/login.html)
    with open(os.path.join(here, "login.html"), encoding="utf-8-sig") as f:
        login_html = f.read()
    login_html = login_html.replace("__V__", q)
    _write(os.path.join(root, "login.html"), login_html)
```

Lalu di template `index.html` (variabel `doc`), tambahkan dua baris:

- di `<head>`, setelah link `intro.css`:
  `<link rel="stylesheet" href="assets/css/shell.css%(q)s">`
- di `<body>`, **sebelum** `<script src="assets/js/shell.js%(q)s"></script>`:
  `<script src="assets/js/auth.js%(q)s"></script>`

- [ ] **Step 6: Tulis `tools/gabungan/check_login.py`**

Pemeriksaan hasil build (project ini tidak punya test framework; ini menggantinya):

```python
"""Cek hasil build untuk fitur login. Jalankan: python check_login.py"""
import os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
fails = []

def need(path, must=()):
    p = os.path.join(ROOT, path)
    if not os.path.exists(p):
        fails.append("hilang: " + path); return ""
    txt = open(p, encoding="utf-8").read()
    for m in must:
        if m not in txt:
            fails.append("%s: tidak memuat %r" % (path, m))
    return txt

need("login.html", ("assets/js/auth.js", 'id="fLogin"', "assets/css/login.css"))
need("assets/js/auth.js", ("window.MMJ_AUTH", "login:", "logout:", "current:", "isLoggedIn:", "can:"))
need("assets/css/login.css", (".lg-card", ".lg-err"))
need("assets/css/shell.css", (".mmj-user", ".mmj-user-out"))
idx = need("index.html", ("assets/js/auth.js", "assets/css/shell.css", "assets/js/shell.js"))
if idx:
    a = idx.find("assets/js/auth.js")
    b = idx.find("assets/js/shell.js")
    if a < 0 or b < 0 or a > b:
        fails.append("index.html: auth.js harus dimuat sebelum shell.js")
need("assets/js/shell.js", ("isLoggedIn", "mmj-user", "location.replace"))

if fails:
    print("GAGAL:"); [print("  - " + f) for f in fails]; sys.exit(1)
print("OK: login.html, auth.js, login.css, shell.css, guard & menu user ada.")
```

- [ ] **Step 7: Build + jalankan pemeriksaan**

Run:
```powershell
cd D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan
python build_gabungan_he.py
python check_login.py
```
Expected: build mencetak "Selesai : ... index.html" lalu `OK: login.html, auth.js, ...`

- [ ] **Step 8: Cek tampilan halaman login di browser**

Run:
```powershell
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
& $chrome --headless=new --disable-gpu --user-data-dir="$env:TEMP\opencode\profA" --hide-scrollbars --window-size=1280,760 --virtual-time-budget=6000 --screenshot="$env:TEMP\opencode\login.png" "http://localhost:8109/login.html"
```
Expected: kartu login tampil di tengah layar gelap; form berisi dua input + tombol Masuk; **tidak ada** error di console. (Bila server belum jalan: `cd D:\Timesheet\Dashboard; python -m http.server 8109`.)

- [ ] **Step 9: Commit**

```bash
git add dashboard-mmj/tools/gabungan/auth.js dashboard-mmj/tools/gabungan/login.css dashboard-mmj/tools/gabungan/login.html dashboard-mmj/tools/gabungan/shell.css dashboard-mmj/tools/gabungan/shell.css dashboard-mmj/tools/gabungan/check_login.py dashboard-mmj/tools/gabungan/emit_site.py assets/js/auth.js assets/css/login.css assets/css/shell.css login.html index.html
git commit -m "feat(login): halaman login, MMJ_AUTH, dan emit file auth"
```

---

### Task 2: Guard login di loader

**Files:**
- Modify: `dashboard-mmj/tools/gabungan/shell_loader.js` (awal IIFE)
- Test: `dashboard-mmj/tools/gabungan/check_login.py` (Step 6 Task 1) + browser

**Interfaces:**
- Consumes: `window.MMJ_AUTH.isLoggedIn()` dari `assets/js/auth.js` (Task 1).
- Produces: `assets/js/shell.js` yang me-redirect ke `login.html` bila belum login.

- [ ] **Step 1: Tambahkan guard di `shell_loader.js`**

Tepat setelah baris `"use strict";` (dan sebelum blok `var KEYS = ...`), sisipkan:

```js
  /* ---------------------------------------------------------------- login --
     Gerbang masuk: belum login -> ke halaman login. Dicek SEBELUM dashboard
     dipasang, supaya dashboard tidak pernah berkedip di layar. */
  if (!(window.MMJ_AUTH && window.MMJ_AUTH.isLoggedIn())) {
    try { location.replace("login.html"); } catch (e) { location.href = "login.html"; }
    return;
  }
```

- [ ] **Step 2: Build + pemeriksaan statis**

Run:
```powershell
cd D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan
python build_gabungan_he.py
python check_login.py
```
Expected: `OK: ...`

- [ ] **Step 3: Uji redirect di browser**

Run:
```powershell
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
& $chrome --headless=new --disable-gpu --user-data-dir="$env:TEMP\opencode\profB" --virtual-time-budget=8000 --dump-dom "http://localhost:8109/index.html" 2>$null | Out-File "$env:TEMP\opencode\dom_guard.html" -Encoding utf8
Select-String -Path "$env:TEMP\opencode\dom_guard.html" -Pattern 'id="fLogin"' | Select-Object -First 1
```
Expected: satu baris yang memuat `id="fLogin"` → halaman login yang tampil (bukan dashboard).

- [ ] **Step 4: Uji sesi yang sudah ada → dashboard terbuka**

Buat file sementara `D:\Timesheet\Dashboard\_sess.html` (hapus setelah tes):

```html
<!doctype html><meta charset="utf-8">
<script>
localStorage.setItem("mmjSession", JSON.stringify({id:"u1",name:"Rizualdi Fadli",role:"admin",ts:Date.now()}));
location.replace("index.html");
</script>
```

Run:
```powershell
& $chrome --headless=new --disable-gpu --user-data-dir="$env:TEMP\opencode\profC" --virtual-time-budget=9000 --dump-dom "http://localhost:8109/_sess.html" 2>$null | Out-File "$env:TEMP\opencode\dom_sess.html" -Encoding utf8
Select-String -Path "$env:TEMP\opencode\dom_sess.html" -Pattern 'class="app"' | Select-Object -First 1
Remove-Item "D:\Timesheet\Dashboard\_sess.html" -Force
```
Expected: baris yang memuat `class="app"` → dashboard terpasang (guard lolos).

- [ ] **Step 5: Uji sesi milik user yang sudah dihapus (Review Focus #1)**

Buat `_sess2.html` dengan `id:"uX"` (tidak ada di daftar user), jalankan seperti Step 4.
Expected: **tidak** ada `class="app"` → diarahkan ke login (user tidak dikenal = belum login).

- [ ] **Step 6: Commit**

```bash
git add dashboard-mmj/tools/gabungan/shell_loader.js assets/js/shell.js index.html
git commit -m "feat(login): guard sesi di loader sebelum dashboard dipasang"
```

---

### Task 3: Menu user di sidebar + logout

**Files:**
- Modify: `dashboard-mmj/tools/gabungan/shell_loader.js` (fungsi `mount()` + fungsi baru)
- Test: `dashboard-mmj/tools/gabungan/check_login.py` + browser

**Interfaces:**
- Consumes: `window.MMJ_AUTH.current()` → `{ id, name, username, role }`; `window.MMJ_AUTH.logout()` (Task 1).
- Produces: elemen `.mmj-user` di dalam `.side` tiap tab.

- [ ] **Step 1: Tambahkan fungsi `mountUserMenu()` di `shell_loader.js`**

Taruh fungsi ini tepat setelah fungsi `markNav()`:

```js
  /* menu user di sidebar (nama + role + tombol Keluar) */
  function mountUserMenu() {
    var side = document.querySelector(".side");
    if (!side) return;
    var u = window.MMJ_AUTH && window.MMJ_AUTH.current();
    if (!u) return;
    var old = side.querySelector(".mmj-user");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var box = document.createElement("div");
    box.className = "mmj-user";
    box.innerHTML =
      '<span class="mmj-user-av"></span>' +
      '<span class="mmj-user-tx"><b></b><span></span></span>' +
      '<button type="button" class="mmj-user-out">Keluar</button>';
    box.querySelector(".mmj-user-av").textContent = String(u.name || "?").trim().charAt(0).toUpperCase();
    box.querySelector(".mmj-user-tx b").textContent = u.name || "";
    box.querySelector(".mmj-user-tx span").textContent = u.role || "";
    box.querySelector(".mmj-user-out").addEventListener("click", function () {
      try { window.MMJ_AUTH.logout(); } catch (e) { }
      location.replace("login.html");
    });
    side.appendChild(box);
  }
```

- [ ] **Step 2: Panggil `mountUserMenu()` di `mount()`**

Di `mount()`, tepat setelah baris `markNav();` (yang sudah ada), tambahkan:

```js
    mountUserMenu();
```

- [ ] **Step 3: Build + pemeriksaan statis**

Run:
```powershell
cd D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan
python build_gabungan_he.py
python check_login.py
```
Expected: `OK: ...` (pemeriksaan sudah menuntut `mmj-user` ada di `assets/js/shell.js`).

- [ ] **Step 4: Uji menu user muncul (dengan sesi)**

Buat `_sess.html` seperti Task 2 Step 4, lalu:

```powershell
& $chrome --headless=new --disable-gpu --user-data-dir="$env:TEMP\opencode\profD" --hide-scrollbars --window-size=1280,760 --virtual-time-budget=9000 --screenshot="$env:TEMP\opencode\usermenu.png" "http://localhost:8109/_sess.html"
Remove-Item "D:\Timesheet\Dashboard\_sess.html" -Force
```
Expected: di sidebar bagian bawah ada avatar + "Rizualdi Fadli" + "admin" + tombol "Keluar".

- [ ] **Step 5: Uji menu user bertahan saat pindah tab**

Di `_sess.html`, tambahkan skrip yang memuat `index.html` lalu mengklik nav "Heavy Equipment" setelah 2 detik:

```html
<script>
setTimeout(function(){ var l=document.querySelector('[data-mmjtab="he"]'); if(l) l.click(); }, 2000);
</script>
```
Run dengan `--virtual-time-budget=12000 --screenshot=...`.
Expected: setelah pindah tab, `.mmj-user` **masih ada** (satu) di sidebar.

- [ ] **Step 6: Uji tombol Keluar**

Di `_sess.html`, tambahkan skrip yang mengklik `.mmj-user-out` setelah 2 detik, lalu dump DOM:
Expected: DOM akhir berisi `id="fLogin"` (kembali ke halaman login) dan `localStorage.mmjSession` terhapus.

- [ ] **Step 7: Commit**

```bash
git add dashboard-mmj/tools/gabungan/shell_loader.js assets/js/shell.js index.html
git commit -m "feat(login): menu user di sidebar dengan tombol Keluar"
```

---

### Task 4: Perilaku login + dokumentasi + verifikasi akhir

**Files:**
- Modify: `dashboard-mmj/tools/gabungan/login.html` (bila perlu)
- Modify: `dashboard-mmj/README.md`
- Test: browser end-to-end

**Interfaces:**
- Consumes: semua dari Task 1-3.
- Produces: perilaku login yang terverifikasi + README.

- [ ] **Step 1: Uji login gagal → pesan error, tidak ada loop**

Jalankan `_try.html` di root repo (hapus setelah tes):

```html
<!doctype html><meta charset="utf-8">
<form id="f" onsubmit="return false"></form>
<script>
localStorage.removeItem("mmjSession");
var f = document.getElementById("fLogin");
</script>
```

Lebih praktis: buka `login.html` lalu di console jalankan `MMJ_AUTH.login("admin","salah")` → harus `null` (dicek lewat dump DOM halaman login yang memanggil fungsi itu dan menulis hasilnya ke `document.title`).

Run:
```powershell
& $chrome --headless=new --disable-gpu --user-data-dir="$env:TEMP\opencode\profE" --virtual-time-budget=6000 --dump-dom "http://localhost:8109/login.html" 2>$null | Out-File "$env:TEMP\opencode\dom_login.html" -Encoding utf8
```
Tambahkan sementara di `login.html` (hapus lagi setelah tes) satu baris di script form:
`document.title = String(window.MMJ_AUTH.login("admin","salah"));`
Expected: `<title>` berisi `null` (login gagal ditolak, tanpa crash).

- [ ] **Step 2: Uji username dengan spasi/kapital (Review Focus #4)**

Ganti baris sementara di `login.html` dengan:
`document.title = String(window.MMJ_AUTH.login("  ADMIN  ","mmj2026") !== null);`
Expected: `<title>` berisi `true`.

- [ ] **Step 3: Uji storage diblokir (Review Focus #2)**

Ganti baris sementara:
`document.title = String(window.MMJ_AUTH.login("admin","mmj2026",false) !== null);`
lalu jalankan Chrome dengan `--incognito` (`--user-data-dir` kosong + `--incognito`) sehingga storage diblokir.
Expected: `<title>` berisi `true` (fallback ke sessionStorage) **atau** `false` **tanpa** `Uncaught` di dump DOM (tidak crash).

- [ ] **Step 4: Hapus baris sementara dari `login.html`**

Pastikan `login.html` kembali ke bentuk Step 2 Task 1 (hanya `e.hidden = false;` saat gagal).

- [ ] **Step 5: Uji reload saat login gagal (Review Focus #3)**

Di `login.html`, sementara ubah handler submit agar `location.replace("login.html")` **tidak** dipanggil saat gagal (memang sudah begitu) → buka `login.html`, submit dengan sandi salah → pesan error muncul → reload → halaman login lagi, **tanpa** loop redirect.
Expected: dump DOM menunjukkan `id="errMsg"` ada dan tidak ada navigasi berulang.

- [ ] **Step 6: Update `dashboard-mmj/README.md`**

Tambahkan ke bagian "Struktur halaman utama":

```
login.html                      halaman login (pintu masuk sisi browser)
assets/js/auth.js               daftar user, sesi, cek role (MMJ_AUTH)
assets/css/login.css            gaya halaman login
assets/css/shell.css            gaya menu user di sidebar
```

Dan tambahkan bagian baru setelah "Animasi pembuka (intro)":

```markdown
## Login (pintu masuk sisi browser)

`assets/js/auth.js` → `window.MMJ_AUTH` (daftar user, `login()`, `logout()`,
`current()`, `isLoggedIn()`, `can()`). Sesi disimpan di `localStorage`
(bila "Ingat saya" dicentang) atau `sessionStorage`.

Loader (`assets/js/shell.js`) memeriksa sesi **sebelum** dashboard dipasang;
belum login → diarahkan ke `login.html`. Menu user (nama, role, tombol
Keluar) disuntik ke sidebar tiap tab.

> Situsnya statis dan data dashboard berupa file JS publik, jadi ini **pembatas
> akses, bukan pengaman**. Pengaman sungguhan butuh layanan/server di luar repo.
> Daftar user & role ada di `tools/gabungan/auth.js` (bagian `users`).

Periksa hasil build: `python tools/gabungan/check_login.py`.
```

- [ ] **Step 7: Verifikasi akhir end-to-end**

Run:
```powershell
cd D:\Timesheet\Dashboard\dashboard-mmj\tools\gabungan
python build_gabungan_he.py
python check_login.py
```
Lalu cek manual di `http://localhost:8109/`:
1. Buka → harus langsung ke halaman login (intro tidak boleh tampil dulu).
2. `admin` / `salah` → pesan "Nama pengguna atau kata sandi salah." (tidak masuk).
3. `admin` / `mmj2026` → masuk, intro plays, dashboard tampil, menu user ada di sidebar.
4. Pindah tab → menu user tetap ada, nav tetap di sidebar (tidak dobel).
5. Klik "Keluar" → kembali ke halaman login.
6. Buka `http://localhost:8109/index.html` lagi → langsung ke login ✔.

- [ ] **Step 8: Commit**

```bash
git add dashboard-mmj/README.md dashboard-mmj/tools/gabungan/login.html
git commit -m "docs(login): dokumentasi gerbang login dan cara cek build"
```

---

## Self-Review

- **Spec coverage:** §5.1 halaman login → Task 1 Step 2-3; §5.2 `MMJ_AUTH` → Task 1 Step 1; §5.3 guard → Task 2; §5.4 menu user → Task 3; §5.5 role (`role` + `can()`) → Task 1 Step 1 (`users[].role`, `can()`), titik sambung filter per role dicatat di `auth.js`; §6 pemetaan file → File Structure; §7 hal yang belum diputuskan → tetap menunggu perintah role; §8 verifikasi → Review Focus + Task 4 Step 7.
- **Step scan:** tiap langkah berisi satu tindakan dengan hasil yang bisa dicek; tidak ada "TBD".
- **Type consistency:** `MMJ_AUTH.login(username, pass, remember)` dipakai konsisten di Task 1 (auth.js, login.html) dan Task 4; `sessionKey="mmjSession"` dipakai di auth.js dan `_sess.html`; `rememberKey="mmjRemember"` hanya di auth.js.
- **Review Focus:** #1 → Task 2 Step 5; #2 → Task 4 Step 3; #3 → Task 4 Step 5; #4 → Task 4 Step 2; #5 → Task 2 Step 3.
- **Proportion:** 4 task; kode panjang hanya untuk file baru (auth.js, login.html, login.css, shell.css) yang memang harus ditulis utuh; task lain menyebut signature, bukan menyalin isi.
