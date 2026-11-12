/* assets/js/tab/exec-he.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){

/* Ringkasan Timesheet HE + Water Truck untuk Dashboard Monitoring */
(function(){
  var H = (typeof window.mmjData === "function") ? window.mmjData("he") : null;
  var pHe = document.getElementById("pHe"), cHe = document.getElementById("cHe");
  var pHeWt = document.getElementById("pHeWt"), cHeWt = document.getElementById("cHeWt");
  if(!pHe || !cHe) return;
  if(!H){ pHe.textContent = "Data Timesheet HE tidak tersedia"; cHe.innerHTML = '<div class="empty">Data tidak tersedia</div>'; return; }
  var nf0 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:0});
  var nf1 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:1,minimumFractionDigits:1});
  var nf2 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:2,minimumFractionDigits:2});
  var fmt = function(v){ return nf0.format(v||0); };
  var dec1 = function(v){ return nf1.format(v||0); };
  var dec2 = function(v){ return nf2.format(v||0); };
  var mg = function(items){ return '<div class="mg">' + items.map(function(it){
      return '<div><span>'+it[0]+'</span><b>'+it[1]+'</b>'+(it[2]?'<em>'+it[2]+'</em>':'')+'</div>'; }).join("") + '</div>'; };

  pHe.textContent = "Periode " + H.meta.periode + " \u00b7 " + H.unit + " unit HE (tanpa WT) \u00b7 data per " + H.meta.generated;
  var vendorRows = H.vendor.map(function(v){
      return '<tr><td><b>'+v.v+'</b></td><td class="r">'+v.unit+'</td><td class="r">'+dec1(v.hm)+'</td><td class="r">'+dec1(v.ma)+'%</td><td class="r">'+fmt(v.fuel)+'</td></tr>'; }).join("");
  var top = H.rows.slice().sort(function(a,b){ return b.hm-a.hm; }).slice(0,5).map(function(r){
      return '<tr><td><b>'+r.u+'</b></td><td>'+(r.v||'-')+'</td><td class="r">'+dec1(r.hm)+'</td><td class="r">'+dec1(r.ma)+'%</td><td class="r">'+dec1(r.pa)+'%</td></tr>'; }).join("");
  cHe.innerHTML =
      mg([["Total HM", nf1.format(H.hm)+"<small>jam</small>", H.unit+" unit"],
          ["Rata-rata MA", dec1(H.ma)+"%", "Mechanical Availability"],
          ["Rata-rata PA", dec1(H.pa)+"%", "Physical Availability"],
          ["Total Fuel", fmt(H.fuel)+"<small>L</small>", "liter terpakai"],
          ["Rata-rata Fuel Ratio", dec2(H.ratio), "liter / jam"]]) +
      '<div class="ttl2">Per vendor</div><table><thead><tr><th>Vendor</th><th class="r">Unit</th><th class="r">HM (jam)</th><th class="r">MA</th><th class="r">Fuel (L)</th></tr></thead><tbody>' + vendorRows + '</tbody></table>' +
      '<div class="ttl2">5 unit dengan HM tertinggi</div><table><thead><tr><th>Unit</th><th>Vendor</th><th class="r">HM</th><th class="r">MA</th><th class="r">PA</th></tr></thead><tbody>' + top + '</tbody></table>';

  var wt = H.wt.slice().sort(function(a,b){ return b.p-a.p; });
  var wtTop = wt.slice(0,5).map(function(w){
      return '<tr><td><b>'+w.u+'</b></td><td>'+(w.v||'-')+'</td><td class="r">'+fmt(w.p)+'</td><td class="r">'+dec1(w.ma)+'%</td></tr>'; }).join("");
  pHeWt.textContent = H.wtUnit + " unit WT \u00b7 total penyiraman " + fmt(H.penyiraman) + " rit";
  cHeWt.innerHTML =
      mg([["Penyiraman", fmt(H.penyiraman)+"<small>rit</small>", H.wtUnit+" unit WT"],
          ["Ketersediaan Unit", fmt(H.totalUnit), "HE + WT"],
          ["Unit belum lengkap", fmt(H.belumUnit), "timesheet HE"]]) +
      '<div class="ttl2">Penyiraman tertinggi</div><table><thead><tr><th>Unit</th><th>Vendor</th><th class="r">Penyiraman</th><th class="r">MA</th></tr></thead><tbody>' + wtTop + '</tbody></table>';
})();
;try{ if(typeof setView==="function") window.setView=setView; }catch(e){}
})();
