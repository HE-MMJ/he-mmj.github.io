/* assets/js/intro.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
/* ==========================================================================
   Intro animasi pembuka Dashboard MMJ
   Dibuat dari tools/gabungan/intro.js  ->  assets/js/intro.js
   --------------------------------------------------------------------------
   Alur:
     1. mark logo muncul (blur + scale)
     2. "MUSI MITRA JAYA" tersingkap dari kiri ke kanan (mask gradient lembut)
     3. lockup bernafas, lalu nama memudar
     4. mark terbang ke logo di sidebar/header lalu memudar
     5. tirai terangkat -> dashboard terlihat

   PENTING (Chrome):
   1) Dua animasi WAAPI pada elemen yang sama TIDAK boleh memakai properti
      yang sama. Chrome memakai animasi yang dibuat LEBIH DAHULU (jika
      fill:both), sehingga animasi berikutnya tidak terlihat sama sekali.
      Karena itu tiap tahap memakai elemennya sendiri (lihat intro.css):
        mark  = logo muncul            fly = logo terbang + memudar
        glow  = glow meredup            glow > i = glow menyala
   2) Posisi logo target harus diukur TEPAT saat logo akan terbang, setelah
      halaman selesai memuat. Kalau diukur lebih awal, layout masih berubah
      (data dimuat, scrollbar muncul, animasi "muncul" masih berjalan) lalu
      logo mendarat jauh dari logo navigasi.
   3) Jangan pakai requestAnimationFrame satu-shot untuk mengukur posisi:
      bisa tidak pernah terpanggil. getBoundingClientRect() sudah memaksa
      layout dihitung ulang, jadi cukup dipanggil langsung.

   Catatan lain:
   - Overlay dipasang di luar <body> supaya tidak ikut terhapus saat
     pengguna pindah tab (loader mengosongkan isi <body> tiap pindah tab).
   - ?nointro=1   -> intro dilewati (untuk debugging).
   - ?introAt=950 -> intro dibekukan pada detik ke-0,95 (untuk cek frame).
   - prefers-reduced-motion -> intro dilewati.
   ========================================================================== */
(function () {
  "use strict";

  var LOGO = "assets/logo-mmj.png";
  var LOGO_W = 174, LOGO_H = 110, MARK = 80;   /* mark = 80x80 di kiri-atas logo */

  /* waktu (ms, dihitung dari mulai intro) */
  var T_MARK_IN = 120, T_NAME = 600, T_BREATH = 1060, T_NAME_OUT = 1400;
  var T_FLIGHT = 1620, D_FLIGHT = 800, D_VEIL = 500, D_MARK_OUT = 220;

  var q = new URLSearchParams(location.search);
  if (q.get("nointro") === "1") return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var AT = q.has("introAt") ? Math.max(0, parseInt(q.get("introAt"), 10) || 0) : -1;

  var anims = [], t0 = performance.now();
  function anim(el, kf, opt) {
    try {
      var a = el.animate(kf, Object.assign({ fill: "both" }, opt));
      a.__mmjC = performance.now() - t0;   /* waktu pembuatan (relatif t0) */
      anims.push(a);
      return a;
    } catch (e) { return null; }
  }

  /* --mmj-rv menggerakkan tepi mask teks nama. Wajib didaftarkan supaya
     Chrome menginterpolasi nilainya (halus); tanpa itu nilainya lompat. */
  var RV_OK = false;
  try {
    CSS.registerProperty({ name: "--mmj-rv", syntax: "<percentage>", inherits: false, initialValue: "100%" });
  } catch (e) { /* mungkin sudah terdaftar -> dicek di bawah */ }
  try {
    RV_OK = getComputedStyle(document.documentElement).getPropertyValue("--mmj-rv").trim() === "100%";
  } catch (e) { RV_OK = false; }

  /* ------------------------------------------------------- cari logo target - */
  function findTarget() {
    return document.querySelector(".side .logo img") ||
           document.querySelector(".header-logo") ||
           document.querySelector(".logo img");
  }

  /* kotak mark di dalam gambar logo (mark = 80/174 lebar, 80/110 tinggi) */
  function targetMarkRect(img) {
    if (!img || !img.isConnected) return null;
    var r = img.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
      left: r.left,
      top: r.top,
      width: r.width * (MARK / LOGO_W),
      height: r.height * (MARK / LOGO_H)
    };
  }

  /* tunggu gambar target siap (kalau belum, ukurannya masih 0) */
  function whenReady(img, cb) {
    if (!img) return cb();
    if (img.complete && img.naturalWidth) return cb();
    var done = false;
    function fin() { if (done) return; done = true; cb(); }
    img.addEventListener("load", fin);
    img.addEventListener("error", fin);
    setTimeout(fin, 1500);            /* jaring pengaman */
  }

  /* tunggu stylesheet tab aktif siap; tanpa ini posisi logo belum final */
  function stylesReady(cb) {
    var links = [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'));
    var pending = links.filter(function (l) { return !l.sheet; });
    if (!pending.length) return cb();
    var n = pending.length, done = false;
    function fin() {
      if (done) return;
      if (--n > 0) return;
      done = true;
      cb();
    }
    pending.forEach(function (l) {
      l.addEventListener("load", fin);
      l.addEventListener("error", fin);
    });
    setTimeout(function () { if (!done) { done = true; cb(); } }, 2500);
  }

  /* tunggu halaman selesai memuat (batas 5 detik) */
  function whenLoaded(cb) {
    if (document.readyState === "complete") return cb();
    var done = false;
    function fin() { if (done) return; done = true; cb(); }
    window.addEventListener("load", fin);
    setTimeout(fin, 5000);
  }

  /* ---------------------------------------------------------------- overlay - */
  function build() {
    var el = document.createElement("div");
    el.className = "mmj-intro";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="mmj-intro-veil"></div>' +
      '<div class="mmj-intro-glow"><i></i></div>' +
      '<div class="mmj-intro-lockup">' +
        '<div class="mmj-intro-mark"><div class="mmj-intro-fly">' +
          '<img alt="" src="' + LOGO + '">' +
        '</div></div>' +
        '<div class="mmj-intro-name"><span class="wm">Musi</span> <span class="wj">Mitra Jaya</span></div>' +
      '</div>';
    document.documentElement.appendChild(el);
    return el;
  }

  function elapsed() { return performance.now() - t0; }

  function start() {
    var el = build();
    var veil = el.querySelector(".mmj-intro-veil");
    var glow = el.querySelector(".mmj-intro-glow");
    var glowIn = el.querySelector(".mmj-intro-glow > i");
    var lockup = el.querySelector(".mmj-intro-lockup");
    var mark = el.querySelector(".mmj-intro-mark");
    var fly = el.querySelector(".mmj-intro-fly");
    var nameEl = el.querySelector(".mmj-intro-name");

    function cleanup() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }

    /* fallback: tidak ada logo target -> langsung buka tirai */
    function liftNow() {
      anim(veil, [{ opacity: 1 }, { opacity: 0 }], { duration: D_VEIL, easing: "ease-out" });
      setTimeout(cleanup, D_VEIL + 80);
    }

    /* --- 1) mark logo muncul (blur + scale) --- */
    anim(mark, [
      { opacity: 0, transform: "scale(.78)", filter: "blur(10px)" },
      { opacity: 1, transform: "scale(1)", filter: "blur(0px)", offset: .72 },
      { opacity: 1, transform: "scale(1)", filter: "blur(0px)" }
    ], { duration: 760, delay: T_MARK_IN, easing: "cubic-bezier(.22,.9,.24,1)" });

    /* --- glow menyala (elemen dalam) --- */
    anim(glowIn, [
      { opacity: 0, transform: "scale(.7)" },
      { opacity: 1, transform: "scale(1)" }
    ], { duration: 900, delay: T_MARK_IN, easing: "ease-out" });

    /* --- 2) nama tersingkap dari kiri ke kanan (tepi lembut) --- */
    if (RV_OK) {
      anim(nameEl, [
        { "--mmj-rv": "-20%" },
        { "--mmj-rv": "100%" }
      ], { duration: 950, delay: T_NAME, easing: "cubic-bezier(.3,.72,.3,1)" });
    }

    /* --- 3) lockup bernafas --- */
    anim(lockup, [
      { transform: "scale(1)" },
      { transform: "scale(1.05)", offset: .5 },
      { transform: "scale(1)" }
    ], { duration: 500, delay: T_BREATH, easing: "ease-in-out" });

    /* --- 4) nama memudar sebelum terbang --- */
    anim(nameEl, [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: "translateX(14px)" }
    ], { duration: 320, delay: T_NAME_OUT, easing: "ease-in" });

    /* --- 5) mark terbang ke logo sidebar/header lalu memudar --- */
    whenReady(findTarget(), function () {
      stylesReady(function () {
        whenLoaded(function () {
          /* logo mulai terbang pada T_FLIGHT; posisi diukur TEPAT saat itu */
          setTimeout(function () {
            var to = targetMarkRect(findTarget());
            var from = mark.getBoundingClientRect();
            if (!to || !from.width) { liftNow(); return; }

            var scale = to.width / from.width;
            var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
            var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
            var land = "translate(" + dx + "px," + dy + "px) scale(" + scale + ")";
            var total = D_FLIGHT + D_MARK_OUT;

            /* terbang + memudar jadi satu animasi (satu elemen, satu Animation) */
            anim(fly, [
              { transform: "translate(0px,0px) scale(1)", opacity: 1,
                easing: "cubic-bezier(.66,0,.2,1)" },
              { transform: land, opacity: 1, offset: D_FLIGHT / total,
                easing: "ease-out" },
              { transform: land, opacity: 0 }
            ], { duration: total });

            /* --- 6) tirai terangkat (dashboard terlihat) --- */
            anim(veil, [{ opacity: 1 }, { opacity: 0 }],
              { duration: D_VEIL, delay: 250, easing: "ease-out" });
            anim(glow, [
              { opacity: 1, transform: "scale(1)" },
              { opacity: 0, transform: "scale(1)" }
            ], { duration: 450, delay: 250, easing: "ease-out" });

            if (AT < 0) {
              setTimeout(cleanup, 250 + D_VEIL + D_MARK_OUT + 120);
            } else {
              /* mode cek frame: bekukan semua animasi pada waktu AT */
              Promise.all(anims.map(function (a) { return a.ready; })).then(function () {
                anims.forEach(function (a) {
                  a.pause();
                  a.currentTime = AT - (a.__mmjC || 0);
                });
                document.documentElement.setAttribute("data-intro-at", String(AT));
              });
            }
          }, Math.max(0, T_FLIGHT - elapsed()));
        });
      });
    });

    /* pengaman: overlay tidak boleh tertinggal di layar */
    if (AT < 0) setTimeout(cleanup, 15000);
  }

  start();
})();
