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
