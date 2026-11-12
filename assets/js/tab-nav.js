/* assets/js/tab-nav.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){
  /* tab aktif diisi oleh loader (assets/js/shell.js) */
  /* Menu dashboard (Overview / Monitoring) sudah dipindah ke sidebar oleh
     loader (assets/js/shell.js) secara langsung begitu tab dipasang, jadi
     tidak pernah terlihat melayang di atas halaman / dobel.
     Script ini hanya menangani tab Loss Time & Rainfall yang berbagi satu
     dashboard (ganti view tanpa memuat ulang). */
  var lt = function(t){ return t==="lt" || t==="rf"; };
  if(window.__mmjObs){ try{ window.__mmjObs.disconnect(); }catch(x){} window.__mmjObs = null; }
  if(lt(window.__MMJ_TAB) && typeof window.setView==="function"){
    window.setView(window.__MMJ_TAB);
    window.__mmjObs = new MutationObserver(function(){
      var v = document.body.dataset.v;
      if(v && v!==window.__MMJ_TAB){
        window.__MMJ_TAB = v;
        try{ localStorage.setItem("mmjTab", v); }catch(x){}
        if(typeof window.mmjMarkNav==="function") window.mmjMarkNav();
      }
    });
    window.__mmjObs.observe(document.body, {attributes:true, attributeFilter:["data-v"]});
  }
})();
