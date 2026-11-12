/* assets/js/tab-nav.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){
  /* tab aktif diisi oleh loader (assets/js/shell.js) */
  /* pindahkan menu dashboard ke sidebar (di bawah logo); tanpa sidebar tetap di atas halaman */
  var nav = document.getElementById("mmjNav"), side = document.querySelector(".side"), logo = side && side.querySelector(".logo");
  if(nav && side){ if(logo && logo.nextSibling) side.insertBefore(nav, logo.nextSibling); else side.insertBefore(nav, side.firstChild); }
  else if(nav){ var top = document.createElement("div"); top.className = "mmjtop"; nav.parentNode.insertBefore(top, nav); top.appendChild(nav); var h = nav.querySelector(".mhere"); if(h) h.remove(); }
  var mark = function(){ document.querySelectorAll("[data-mmjtab]").forEach(function(a){ if(a.dataset.mmjtab===window.__MMJ_TAB) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); }); };
  var lt = function(t){ return t==="lt" || t==="rf"; };
  document.querySelectorAll("[data-mmjtab]").forEach(function(a){
    a.addEventListener("click", function(e){
      e.preventDefault(); var t = a.dataset.mmjtab;
      if(t===window.__MMJ_TAB) return;
      try{ localStorage.setItem("mmjTab", t); }catch(x){}
      if(lt(t) && lt(window.__MMJ_TAB) && typeof window.setView==="function"){ window.__MMJ_TAB=t; window.setView(t); mark(); return; }
      if(typeof window.mmjSwitch==="function") window.mmjSwitch(t);     /* pindah dashboard tanpa muat ulang */
    });
  });
  if(window.__mmjObs){ try{ window.__mmjObs.disconnect(); }catch(x){} window.__mmjObs = null; }
  if(lt(window.__MMJ_TAB) && typeof window.setView==="function"){
    window.setView(window.__MMJ_TAB);
    window.__mmjObs = new MutationObserver(function(){ var v=document.body.dataset.v; if(v && v!==window.__MMJ_TAB){ window.__MMJ_TAB=v; mark(); try{ localStorage.setItem("mmjTab", v); }catch(x){} } });
    window.__mmjObs.observe(document.body, {attributes:true, attributeFilter:["data-v"]});
  }
  mark();
})();
