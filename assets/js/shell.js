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

  /* kotak "Dashboard belum tampil?" itu untuk pengguna TANPA JavaScript.
     Begitu JS jalan, sembunyikan supaya tidak sempat berkedip. */
  var nojsBox = document.getElementById("mmjNojs");
  if (nojsBox) nojsBox.hidden = true;

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
    if (nb) {
      nb.hidden = false;
      nb.innerHTML = "<b>Dashboard belum berhasil dibuat.</b>Jalankan ulang Update Dashboard Gabungan.bat.";
    }
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

  /* ------------------------------------------------- kaki sidebar --------- */
  /* Menu user (Masuk/Keluar) + tombol Tema dikumpulkan di satu wadah sticky
     di dasar sidebar, jadi keduanya selalu terlihat & tidak tertutup. */
  function sideFoot(side) {
    var foot = side.querySelector(".side-foot");
    if (!foot) {
      foot = document.createElement("div");
      foot.className = "side-foot";
      side.appendChild(foot);
    }
    return foot;
  }

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
    } else {
      box.innerHTML =
        '<span class="mmj-user-av"></span>' +
        '<span class="mmj-user-tx"><b></b><span></span></span>' +
        '<button type="button" class="mmj-user-out">Keluar</button>';
      box.querySelector(".mmj-user-av").textContent = String(u.name || "?").trim().charAt(0).toUpperCase();
      box.querySelector(".mmj-user-tx b").textContent = u.name || "";
      box.querySelector(".mmj-user-tx span").textContent = u.role || "";
      box.querySelector(".mmj-user-out").addEventListener("click", function () {
        try { window.MMJ_AUTH.logout(); } catch (e) { }
        /* keluar -> langsung ke halaman utama (dashboardnya publik) */
        location.replace("index.html");
      });
    }
    sideFoot(side).appendChild(box);
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

  /* ------------------------------------------------- tema (terang/gelap) --- */
  /* Satu implementasi untuk semua tab: tombol "Tema" + penyimpanan lokal,
     tetap berlaku saat pindah tab. */
  var THEME_KEY = "mmjTheme";

  function currentTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (!t) t = localStorage.getItem("mmjTheme") || localStorage.getItem("heTheme");  /* data lama */
      return t === "dark" ? "dark" : "light";
    } catch (e) { return "light"; }
  }

  function applyTheme(t) {
    var dark = (t === "dark");
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    var b = document.querySelector(".side .theme");
    if (b) b.textContent = "Tema: " + (dark ? "gelap" : "terang");
    return dark;
  }

  function mountTheme() {
    applyTheme(currentTheme());
    var side = document.querySelector(".side");
    if (!side) return;
    var b = side.querySelector(".theme");
    if (!b) {                       /* tab tanpa tombol tema -> buat seragam */
      b = document.createElement("button");
      b.className = "theme";
      b.type = "button";
    }
    /* tema diletakkan di kaki sidebar, DI BAWAH menu user (Masuk/Keluar) */
    sideFoot(side).appendChild(b);
    if (b.__mmjBound) return;
    b.__mmjBound = true;
    b.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { }
      applyTheme(next);
      /* grafik perlu digambar ulang supaya warna tema ikut */
      try { if (typeof window.setView === "function") window.setView(window.__MMJ_TAB); } catch (e) { }
    });
  }

  var seq = 0;

  /* ------------------------------------------------- pemilih bulan (HE) --- */
  /* Tab Heavy Equipment bisa menampilkan bulan lain: #tab=he&m=10 memuat
     assets/data/he-10.js (+ wt-10.js). Data tiap bulan dibuat saat build. */
  function bulanAktif() {
    var m = /[?&#]m=(\d{1,2})/.exec(location.hash || "");
    return m ? parseInt(m[1], 10) : 0;
  }

  function srcData(src) {
    var mb = bulanAktif();
    if (!mb || !src) return src;
    var kode = (mb < 10 ? "0" : "") + mb;
    return src
      .replace("assets/data/he.js", "assets/data/he-" + kode + ".js")
      .replace("assets/data/wt.js", "assets/data/wt-" + kode + ".js");
  }

  var BULAN_NAMA = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  function mountBulan(tab) {
    var old = document.querySelector(".mmj-bulan");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var list = window.MMJ_BULAN || [];
    if (tab !== "he" || !list.length) {
      var chip0 = document.querySelector("#he .header-text .chip-period, .header-text .chip-period");
      if (chip0) chip0.style.display = "";
      return;
    }
    /* diletakkan di bawah judul "Dashboard Timesheet HE / MMJ"
       (menggantikan chip periode statis di baris .sub) */
    var host = document.querySelector("#he .header-text .sub")
      || document.querySelector(".header-text .sub");
    if (!host) return;
    var chip = host.querySelector(".chip-period");
    if (chip) chip.style.display = "none";
    var cur = bulanAktif() || list[list.length - 1];
    var wrap = document.createElement("label");
    wrap.className = "mmj-bulan";
    wrap.innerHTML = "<span>Bulan</span><select></select>";
    var sel = wrap.querySelector("select");
    for (var i = 0; i < list.length; i++) {
      var o = document.createElement("option");
      o.value = list[i];
      o.textContent = BULAN_NAMA[list[i] - 1] + " 2026";
      if (list[i] === cur) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", function () {
      location.hash = "tab=he&m=" + sel.value;
      try { window.mmjSwitch("he"); } catch (e) { }
    });
    host.insertBefore(wrap, chip || host.firstChild);
  }

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
    /* CSS tab lama TIDAK langsung dibuang: CSS tab baru dimuat async. Kalau CSS
       lama dibuang dulu, halaman sempat tanpa style -> logo meloncat (muncul
       besar) lalu mengecil saat CSS baru masuk. CSS lama ditahan sampai CSS baru
       siap. */
    var oldStyles = [];
    var own = document.querySelectorAll("[data-mmj-own], #mmjBootCss");
    for (var k = 0; k < own.length; k++) {
      if (own[k].tagName === "LINK" && own[k].rel === "stylesheet") oldStyles.push(own[k]);
      else own[k].parentNode.removeChild(own[k]);
    }
    var dropOldStyles = function () {
      for (var s = 0; s < oldStyles.length; s++) {
        if (oldStyles[s].parentNode) oldStyles[s].parentNode.removeChild(oldStyles[s]);
      }
      oldStyles = [];
    };
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    while (document.body.attributes.length) document.body.removeAttribute(document.body.attributes[0].name);
    try { delete window.setView; } catch (e) { window.setView = undefined; }

    /* pasang dashboard terpilih */
    var frag = T[key].cloneNode(true);

    /* <title> / <link> / <style> bertanda data-mmj-head dipindah ke <head> */
    var heads = frag.querySelectorAll("[data-mmj-head]");
    var newStyle = null;
    for (var h = 0; h < heads.length; h++) {
      var el = heads[h];
      el.removeAttribute("data-mmj-head");
      if (el.tagName === "TITLE") {
        document.title = el.textContent;
        el.parentNode.removeChild(el);
      } else {
        el.setAttribute("data-mmj-own", "");
        document.head.appendChild(el);
        if (el.tagName === "LINK" && el.rel === "stylesheet") newStyle = el;
      }
    }

    /* CSS tab lama dibuang begitu CSS tab baru siap (biar tidak ada halaman
       tanpa style -> logo meloncat) */
    if (oldStyles.length) {
      if (newStyle) {
        if (newStyle.sheet) setTimeout(dropOldStyles, 0);
        else {
          newStyle.addEventListener("load", dropOldStyles);
          newStyle.addEventListener("error", dropOldStyles);
        }
        setTimeout(dropOldStyles, 5000);   /* jaring pengaman */
      } else {
        dropOldStyles();
      }
    }

    /* kumpulkan script (data + app) sesuai urutan di template */
    var queue = [], ss = frag.querySelectorAll("script");
    for (var r = 0; r < ss.length; r++) {
      var o = ss[r];
      if (o.src) queue.push({ src: srcData(o.getAttribute("src")) });
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
    mountTheme();
    mountBulan(tab);
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
