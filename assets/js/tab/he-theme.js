/* assets/js/tab/he-theme.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){

(function(){
  var b=document.getElementById('heTheme') || document.querySelector('.side .theme'); if(!b) return;
  var KEY='mmjTheme';
  var read=function(){
    try{ var t=localStorage.getItem(KEY); if(!t) t=localStorage.getItem('dashTheme3') || localStorage.getItem('heTheme'); return t==='dark'; }
    catch(e){ return false; }
  };
  var apply=function(dark,save){
    if(dark) document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    b.textContent = dark? 'Tema: gelap' : 'Tema: terang';
    if(save){ try{ localStorage.setItem(KEY,dark?'dark':'light'); }catch(e){} }
  };
  /* shell.js owns click binding; HE only applies initial state and storage updates. */
  window.addEventListener('storage', function(e){
    if(e.key===KEY || e.key==='dashTheme3' || e.key==='heTheme') apply(e.newValue==='dark',false);
  });
  apply(read(),false);
})();
;try{ if(typeof setView==="function") window.setView=setView; }catch(e){}
})();
