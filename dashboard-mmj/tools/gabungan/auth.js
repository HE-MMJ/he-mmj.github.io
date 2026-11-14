/* =============================================================================
   Auth Dashboard MMJ - daftar user, sesi, dan cek role.
   Dibuat dari tools/gabungan/auth.js  ->  assets/js/auth.js
   -----------------------------------------------------------------------------
   PENTING: situsnya statis (GitHub Pages) dan data dashboard berupa file JS
   publik. Jadi login ini PEMBATAS AKSES, bukan pengaman: siapa pun yang tahu
   URL masih bisa membuka assets/data/<tab>.js langsung. Pengaman sungguhan
   butuh layanan/server di luar repo.

   Daftar user & ROLE diisi di bagian `users` (ganti sesuai permintaan).
   Role dipakai lewat MMJ_AUTH.can("...") untuk menyembunyikan menu per role.
   ============================================================================= */
(function () {
  "use strict";

  /* daftar user: ganti nanti sesuai permintaan */
  var users = [
    { id: "u1", name: "Rizualdi Fadli", username: "admin", pass: "mmj2026", role: "admin" },
    { id: "u2", name: "Admin HSE", username: "hse", pass: "hse2026", role: "hse" },
    { id: "u3", name: "Admin ECC", username: "ecc", pass: "ecc2026", role: "ecc" },
    { id: "u4", name: "Admin Eksternal", username: "ext", pass: "ext2026", role: "external" }
  ];

  /* hak akses per role. Role "admin" (Admin General) selalu boleh semuanya.
     Kunci capability dipakai pada penanda data-mmj-cap di menu sidebar:
       public       -> dashboard monitoring (terbuka juga untuk tamu)
       hse          -> Data Simper + Data DT
       external     -> hanya dasbor publik (tanpa data sensitif)
       costcontrol  -> Cost Control */
  var CAPS = {
    admin: { all: true },
    hse: { hse: true },
    ecc: { costcontrol: true },
    external: {}
  };

  /* nama role yang ditampilkan di sidebar */
  var ROLE_LABEL = {
    admin: "Admin General",
    hse: "Admin HSE",
    ecc: "Admin ECC",
    external: "Admin Eksternal"
  };

  /* halaman pertama tiap role setelah login (relatif terhadap root situs) */
  var ROLE_HOME = {
    admin: "index.html",
    hse: "Data-Simper/",
    ecc: "Cost-Control/",
    external: "index.html"
  };

  var sessionKey = "mmjSession";
  var rememberKey = "mmjRemember";

  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function ss() { try { return window.sessionStorage; } catch (e) { return null; } }

  function readSession() {
    var raw = null;
    var a = ls();
    if (a) { try { raw = a.getItem(sessionKey); } catch (e) { } }
    if (!raw) {
      var b = ss();
      if (b) { try { raw = b.getItem(sessionKey); } catch (e) { } }
    }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function writeSession(obj, remember) {
    var json = JSON.stringify(obj);
    var first = remember ? ls() : ss();
    var second = remember ? ss() : ls();
    var ok = false;
    if (first) { try { first.setItem(sessionKey, json); ok = true; } catch (e) { } }
    /* jangan biarkan sesi lama tertinggal di storage lain */
    if (second) { try { second.removeItem(sessionKey); } catch (e) { } }
    /* "ingat saya" dianggap berhasil HANYA kalau localStorage yang dipakai */
    var remembered = remember && ok;
    if (!ok) {
      var third = ss() || ls();
      if (third) { try { third.setItem(sessionKey, json); ok = true; } catch (e) { } }
    }
    if (remember) { var l = ls(); if (l) { try { l.setItem(rememberKey, "1"); } catch (e) { } } }
    return { ok: ok, remembered: remembered };
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

    /* alasan kegagalan terakhir: "user" | "pass" | "storage" ("" = sukses) */
    lastError: "",
    /* true bila "ingat saya" benar-benar dipakai (localStorage) */
    lastRemember: false,

    /* login(username, pass, remember) -> user|null */
    login: function (username, pass, remember) {
      MMJ_AUTH.lastError = "";
      MMJ_AUTH.lastRemember = false;
      var u = findUser(username);
      if (!u) { MMJ_AUTH.lastError = "user"; return null; }
      if (String(u.pass) !== String(pass == null ? "" : pass)) { MMJ_AUTH.lastError = "pass"; return null; }
      var sess = { id: u.id, name: u.name, role: u.role, ts: Date.now() };
      var res = writeSession(sess, !!remember);
      if (!res.ok) { MMJ_AUTH.lastError = "storage"; return null; }   /* storage diblokir */
      MMJ_AUTH.lastRemember = res.remembered;
      return publicUser(u);
    },

    logout: function () {
      var a = ls(), b = ss();
      if (a) { try { a.removeItem(sessionKey); } catch (e) { } }
      if (b) { try { b.removeItem(sessionKey); } catch (e) { } }
      if (a) { try { a.removeItem(rememberKey); } catch (e) { } }
      return true;
    },

    /* user yang sedang login, atau null. Sesi milik user yang sudah dihapus
       dari daftar -> dianggap belum login (dan sesinya dibuang). */
    current: function () {
      var s = readSession();
      if (!s || !s.id) return null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === s.id) return publicUser(users[i]);
      }
      /* user sudah tidak ada -> buang sesinya supaya tidak aktif lagi nanti */
      try { window.localStorage.removeItem(sessionKey); } catch (e) { }
      try { window.sessionStorage.removeItem(sessionKey); } catch (e) { }
      return null;
    },

    isLoggedIn: function () { return !!MMJ_AUTH.current(); },

    /* nama role untuk ditampilkan (mis. "Admin HSE") */
    roleLabel: function (role) {
      return ROLE_LABEL[role] || String(role || "").toUpperCase();
    },

    /* halaman pertama role ini setelah login ("" = halaman utama) */
    homeOf: function (role) {
      return ROLE_HOME[role] || "index.html";
    },

    /* cek hak akses; dipakai untuk menyembunyikan menu per role */
    can: function (cap) {
      var u = MMJ_AUTH.current();
      if (!u) return false;
      var c = CAPS[u.role];
      if (!c) return false;
      if (c.all) return true;
      return !!c[cap];
    }
  };

  window.MMJ_AUTH = MMJ_AUTH;
})();
