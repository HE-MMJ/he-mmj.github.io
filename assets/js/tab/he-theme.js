/* assets/js/tab/he-theme.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){

(function(){
  var b=document.getElementById('heTheme'); if(!b) return;
  var apply=function(dark){
    if(dark) document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    b.textContent = dark? 'Tema: gelap' : 'Tema: terang';
    try{ localStorage.setItem('heTheme', dark?'dark':'light'); }catch(e){}
  };
  b.addEventListener('click', function(){ apply(document.documentElement.getAttribute('data-theme')!=='dark'); });
  try{ if(localStorage.getItem('heTheme')==='dark') apply(true); }catch(e){}
})();
;try{ if(typeof setView==="function") window.setView=setView; }catch(e){}
})();
