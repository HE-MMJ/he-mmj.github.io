/* assets/js/shell.js - dibuat dari tools/gabungan/shell_loader.js */
/* ==========================================================================
   Dashboard MMJ 2026 - loader halaman gabungan (index.html)
   --------------------------------------------------------------------------
   Markup tiap dashboard disimpan sebagai <template id="mmjT_*"> di index.html.
   CSS, data dan logika tiap dashboard ada di folder assets/ dan hanya dimuat
   saat tab itu dibuka:

     <link data-mmj-head rel="stylesheet" href="assets/css/<tab>.css">
     <script type="text/x-mmj-data" src="assets/data/<tab>.js"></script>
     <script type="text/x-mmj-app"  src="assets/js/tab/<tab>.js"></script>

   - script data  : mengisi window.MMJ_DATA[<tab>] (dibaca juga oleh Dashboard
                    Eksekutif lewat window.mmjData)
   - script app   : logika dashboard; dibungkus IIFE oleh generator sehingga
                    aman dijalankan ulang setiap kali tab dibuka
   ========================================================================== */
(function () {
  "use strict";

  /* CATATAN AKSES: seluruh dashboard (Monitoring, HE, Coal Hauling, Batu Split,
     Loss Time, Rainfall) terbuka untuk semua orang - tanpa login.
     Login dipakai untuk menu TAMBAHAN (mis. Cost Control) yang berlabel
     data-mmj-auth="<izin>" dan hanya ditunjukkan bila user punya izin. */

  var KEYS = ["exec", "haul", "batu", "lt", "he"];

  var asFrag = function (t) {
    if (!t) return null;
    if (t.content) return t.content;
    var d = document.createElement("div");
    d.innerHTML = t.innerHTML;
    var f = document.createDocumentFragment();
    while (d.firstChild) f.appendChild(d.firstChild);
    return f;
  };

  var T = {};
  for (var i = 0; i < KEYS.length; i++) T[KEYS[i]] = asFrag(document.getElementById("mmjT_" + KEYS[i]));

  /* ---------------------------------------------------------------- data --- */
  window.MMJ_DATA = window.MMJ_DATA || {};

  window.mmjData = function (k) {
    if (window.MMJ_DATA && Object.prototype.hasOwnProperty.call(window.MMJ_DATA, k)) {
      return window.MMJ_DATA[k];
    }
    /* cadangan: format lama (data masih menempel di dalam <template>) */
    var f = T[k];
    if (!f) return null;
    var ss = f.querySelectorAll("script");
    for (var i = 0; i < ss.length; i++) {
      var m = /const DATA\s*=\s*(\{[\s\S]*?\});\s*\n/.exec(ss[i].text || ss[i].textContent || "");
      if (m) {
        try { return (window.MMJ_DATA[k] = JSON.parse(m[1])); } catch (e) { }
        break;
      }
    }
    return null;
  };

  if (!KEYS.some(function (k) { return T[k]; })) {
    var nb = document.getElementById("mmjNojs");
    if (nb) nb.innerHTML = "<b>Dashboard belum berhasil dibuat.</b>Jalankan ulang Update Dashboard Gabungan.bat.";
    return;
  }

  /* ------------------------------------------------- listener per tab ----- */
  /* catat listener window/document milik dashboard aktif, supaya bisa
     dilepas saat pindah dashboard */
  var L = [], orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opt) {
    if (this === window || this === document) L.push([this, type, fn, opt]);
    return orig.call(this, type, fn, opt);
  };

  /* ------------------------------------------- menu dashboard di sidebar --- */
  /* Menu "Overview / Monitoring" (id=mmjNav) ada di dalam <template> tiap
     dashboard. Menu itu harus dipindah ke sidebar. Kalau ditunda (menunggu
     tab-nav.js termuat), selama jeda itu menu terlihat melayang di paling atas
     halaman -> terlihat "dobel" lalu hilang. Karena itu dipindah LANGSUNG di
     sini, sinkron begitu tab dipasang. */
  var LT_TABS = { lt: 1, rf: 1 };

  function placeNav() {
    var nav = document.getElementById("mmjNav");
    if (!nav) return null;
    var side = document.querySelector(".side");
    if (side) {
      /* buang menu dashboard lain yang masih nyangkut (cegah menu dobel) */
      var dup = document.querySelectorAll(".mmjnav");
      for (var d = dup.length - 1; d >= 0; d--) {
        if (dup[d] !== nav && dup[d].parentNode) dup[d].parentNode.removeChild(dup[d]);
      }
      var logo = side.querySelector(".logo");
      if (logo && logo.nextSibling) side.insertBefore(nav, logo.nextSibling);
      else side.insertBefore(nav, side.firstChild);
    }
    return nav;
  }

  function markNav() {
    document.querySelectorAll("[data-mmjtab]").forEach(function (a) {
      if (a.dataset.mmjtab === window.__MMJ_TAB) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }
  window.mmjMarkNav = markNav;

  /* ------------------------------------------------- menu user di sidebar --- */
  /* Disuntik tiap tab. Belum login -> tombol "Masuk"; sudah login -> avatar,
     nama, role, dan tombol "Keluar". */
  function mountUserMenu() {
    var side = document.querySelector(".side");
    if (!side) return;
    var u = window.MMJ_AUTH && window.MMJ_AUTH.current();
    var old = side.querySelector(".mmj-user");
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var box = document.createElement("div");
    box.className = "mmj-user";

    if (!u) {
      /* belum login -> hanya tombol Masuk */
      box.innerHTML = '<button type="button" class="mmj-user-in">Masuk</button>';
      box.querySelector(".mmj-user-in").addEventListener("click", function () {
        location.replace("login.html");
      });
      side.appendChild(box);
      return;
    }

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

  /* --------------------------------- menu tambahan berlabel (per izin/role) --- */
  /* Elemen ber-atribut data-mmj-auth="<izin>" disembunyikan untuk yang tidak
     punya izin; contoh: data-mmj-auth="costcontrol" -> menu Cost Control. */
  function applyAuthMenus() {
    var can = (window.MMJ_AUTH && window.MMJ_AUTH.can) ? window.MMJ_AUTH.can : function () { return false; };
    document.querySelectorAll("[data-mmj-auth]").forEach(function (el) {
      var ok = can(el.getAttribute("data-mmj-auth"));
      if (ok) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  }

  function bindNav() {
    var nav = document.getElementById("mmjNav");
    if (!nav || nav.__mmjBound) return;
    nav.__mmjBound = true;
    nav.querySelectorAll("[data-mmjtab]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var t = a.dataset.mmjtab;
        if (t === window.__MMJ_TAB) return;
        try { localStorage.setItem("mmjTab", t); } catch (x) { }
        /* Loss Time & Rainfall satu dashboard: ganti view, jangan muat ulang */
        if (LT_TABS[t] && LT_TABS[window.__MMJ_TAB] && typeof window.setView === "function") {
          window.__MMJ_TAB = t; window.setView(t); markNav(); return;
        }
        window.mmjSwitch(t);
      });
    });
  }

  var seq = 0;

  function runQueue(queue, tab, token, i) {
    if (token !== seq || i >= queue.length) return;
    var item = queue[i];
    var next = function () { if (token === seq) runQueue(queue, tab, token, i + 1); };

    if (item.src) {
      var s = document.createElement("script");
      s.src = item.src;
      s.async = false;
      s.onload = next;
      s.onerror = next;
      document.body.appendChild(s);
      return;
    }
    /* script inline (cadangan) - dibungkus fungsi seperti versi lama */
    var ns = document.createElement("script");
    ns.text = "(function(){\n" + String(item.code).replace(/__MMJ_TAB__/g, tab) +
      "\n;try{ if(typeof setView===\"function\") window.setView=setView; }catch(e){}\n})();";
    document.body.appendChild(ns);
    next();
  }

  function mount(tab) {
    var key = (tab === "batu" || tab === "haul" || tab === "exec" || tab === "he") ? tab : "lt";
    if (!T[key]) {
      key = KEYS.filter(function (k) { return T[k]; })[0];
      tab = key;
    }
    if (!key) return;
    try { localStorage.setItem("mmjTab", tab); } catch (e) { }

    var token = ++seq;

    /* bersihkan dashboard sebelumnya */
    for (var i = 0; i < L.length; i++) {
      try { L[i][0].removeEventListener(L[i][1], L[i][2], L[i][3]); } catch (e) { }
    }
    L = [];
    var own = document.querySelectorAll("[data-mmj-own], #mmjBootCss");
    for (var k = 0; k < own.length; k++) own[k].parentNode.removeChild(own[k]);
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    while (document.body.attributes.length) document.body.removeAttribute(document.body.attributes[0].name);
    document.documentElement.removeAttribute("data-theme");
    try { delete window.setView; } catch (e) { window.setView = undefined; }

    /* pasang dashboard terpilih */
    var frag = T[key].cloneNode(true);

    /* <title> / <link> / <style> bertanda data-mmj-head dipindah ke <head> */
    var heads = frag.querySelectorAll("[data-mmj-head]");
    for (var h = 0; h < heads.length; h++) {
      var el = heads[h];
      el.removeAttribute("data-mmj-head");
      if (el.tagName === "TITLE") {
        document.title = el.textContent;
        el.parentNode.removeChild(el);
      } else {
        el.setAttribute("data-mmj-own", "");
        document.head.appendChild(el);
      }
    }

    /* kumpulkan script (data + app) sesuai urutan di template */
    var queue = [], ss = frag.querySelectorAll("script");
    for (var r = 0; r < ss.length; r++) {
      var o = ss[r];
      if (o.src) queue.push({ src: o.getAttribute("src") });
      else queue.push({ code: o.text || o.textContent });
      o.parentNode.removeChild(o);
    }

    document.body.appendChild(frag);
    window.__MMJ_TAB = tab;
    window.scrollTo(0, 0);

    /* menu dashboard langsung ditaruh ke sidebar (bukan menunggu tab-nav.js) */
    placeNav();
    bindNav();
    markNav();
    mountUserMenu();
    applyAuthMenus();

    runQueue(queue, tab, token, 0);
  }

  /* dipanggil dari bar tab di atas dashboard */
  window.mmjSwitch = function (tab) { setTimeout(function () { mount(tab); }, 0); };

  var tab = "", m = /tab=(exec|haul|batu|lt|rf|he)/.exec(location.hash || "");
  if (m) tab = m[1];
  if (!tab) { try { tab = localStorage.getItem("mmjTab") || ""; } catch (e) { } }
  if (["exec", "haul", "batu", "lt", "rf", "he"].indexOf(tab) < 0) tab = "exec";
  mount(tab);
})();
