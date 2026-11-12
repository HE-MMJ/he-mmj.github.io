/* assets/js/auth.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
/* =============================================================================
   Auth Dashboard MMJ - daftar user, sesi, dan cek role.
   Dibuat dari tools/gabungan/auth.js  ->  assets/js/auth.js
   -----------------------------------------------------------------------------
   PENTING: situsnya statis (GitHub Pages) dan data dashboard berupa file JS
   publik. Jadi login ini PEMBATAS AKSES, bukan pengaman: siapa pun yang tahu
   URL masih bisa membuka assets/data/<tab>.js langsung. Pengaman sungguhan
   butuh layanan/server di luar repo.

   Daftar user & ROLE diisi di bagian `users` (ganti sesuai permintaan).
   Role dipakai lewat MMJ_AUTH.can("...") - untuk sekarang semua hak akses
   milik role "admin".
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
    if (!ok) {
      var third = ss() || ls();
      if (third) { try { third.setItem(sessionKey, json); ok = true; } catch (e) { } }
    }
    if (remember) { var l = ls(); if (l) { try { l.setItem(rememberKey, "1"); } catch (e) { } } }
    return ok;
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
      if (!writeSession(sess, !!remember)) return null;   /* storage diblokir -> gagal, bukan crash */
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
