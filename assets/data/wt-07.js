/* assets/data/wt-07.js - data WT bulan 07 (dibuat otomatis oleh build). */
window.MMJ_WT = window.MMJ_WT || {};
window.MMJ_WT.PERIODE = {"y": 2026, "m": 7, "last": 31};
(function(){
  if (window.MMJ_INFLATE) return;
  var MISS = "\u0000MISSING\u0000";
  var AL = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/";
  function inf(n){
    if (n === null || typeof n !== "object") return n;
    if (Array.isArray(n)){ var a=[],i; for(i=0;i<n.length;i++) a.push(inf(n[i])); return a; }
    if (n.$O){ var o={},k; for(k in n.$O) o[k]=inf(n.$O[k]); return o; }
    if (n.$A){ var b=[],j; for(j=0;j<n.$A.length;j++) b.push(inf(n.$A[j])); return b; }
    if (n.$T){
      /* tabel: list of arrays -> kolom-kolom (RLE / packed sesuai mode) */
      var t=n.$T, tcols=t.c, tdicts=t.d||[], tmodes=t.m||[], out=[], i3, j3, k3, tcol, tdv, tmode;
      for (i3=0;i3<tcols.length;i3++){
        tcol=tcols[i3]; tdv=tdicts[i3]; tmode=tmodes[i3]||0;
        if (tmode===1){
          var pos3=0;
          for (j3=0;j3<tcol.length;j3++){
            var run=tcol[j3], val=run[0], cnt=run[1];
            val = tdv ? tdv[val] : val;
            val = inf(val);
            for (k3=0;k3<cnt;k3++){
              if (!out[pos3]) out[pos3]=[];
              out[pos3].push(val);
              pos3++;
            }
          }
        } else if (tmode===2){
          /* indeks disimpan sebagai string 1-2 byte per nilai */
          var s2=tcol, w2=(tdv && tdv.length<=64)?1:2, n2=Math.floor(s2.length/w2);
          for (j3=0;j3<n2;j3++){
            var ix=0;
            for (k3=0;k3<w2;k3++) ix = ix*64 + AL.indexOf(s2.charAt(j3*w2+k3));
            if (!out[j3]) out[j3]=[];
            out[j3].push(inf(tdv[ix]));
          }
        } else {
          for (j3=0;j3<tcol.length;j3++){
            if (!out[j3]) out[j3]=[];
            out[j3].push(tdv ? inf(tdv[tcol[j3]]) : inf(tcol[j3]));
          }
        }
      }
      return out;
    }
    if (n.$D){
      var keys=n.$D, cols=n.$R, dict=n.$S||{}, modes=n.$M||[], rows=[], i2, j2, k2, col, d, v, dv;
      for (i2=0;i2<cols.length;i2++){
        col=cols[i2]; d=dict[i2];
        var md = modes[i2]||0;
        if (md===1){
          var pos2=0;
          for (j2=0;j2<col.length;j2++){
            v=col[j2][0]; dv = (d !== undefined) ? d[v] : v;
            if (dv === MISS){ pos2 += col[j2][1]; continue; }
            dv = inf(dv);
            for (k2=0;k2<col[j2][1];k2++){
              while (rows.length <= pos2+k2) rows.push({});
              rows[pos2+k2][keys[i2]] = dv;
            }
            pos2 += col[j2][1];
          }
        } else if (md===2){
          var s3=col, w3=(d && d.length<=64)?1:2, n3=Math.floor(s3.length/w3);
          for (j2=0;j2<n3;j2++){
            var ix2=0;
            for (k2=0;k2<w3;k2++) ix2 = ix2*64 + AL.indexOf(s3.charAt(j2*w3+k2));
            dv = d[ix2];
            while (rows.length <= j2) rows.push({});
            if (dv !== MISS) rows[j2][keys[i2]] = inf(dv);
          }
        } else {
          for (j2=0;j2<col.length;j2++){
            while (rows.length <= j2) rows.push({});
            if (d !== undefined){
              dv = d[col[j2]];
              if (dv !== MISS) rows[j2][keys[i2]] = inf(dv);
            }
            else {
              v = col[j2];
              if (v !== MISS && v !== undefined) rows[j2][keys[i2]] = inf(v);
            }
          }
        }
      }
      return rows;
    }
    return n;
  }
  window.MMJ_INFLATE = inf;
})();
window.MMJ_WT.DATA = window.MMJ_INFLATE({"$D":["Unit","Sheet","Vendor","File","KolomPenyiraman","Sumber","Model","Area","MA","PA","MATarget","BelumS","BelumM","HMTarget","MOHH","HMReview","FuelReview","FuelRatio","TotalPenyiraman","HariAda","HariTerisi","Shift2","Days"],"$R":[["WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],["WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["WT ASA",1],["WT FBS",4],["WT TLK",1],["WT TSA",3]],[["2026.07. Summary Time Sheet WT ASA Periode Juli 2026.xlsx",1],["2026.07. Summary Time Sheet WT FBS Periode Juli 2026.xlsx",4],["2026.07. Summary Time Sheet WT TLK Periode Juli 2026.xlsx",1],["2026.07. Summary Time Sheet WT TSA Periode Juli 2026.xlsx",3]],[23,27,27,27,27,31,24,24,24],[["kolom",9]],[["MITSUBISHI",1],["Water Truck",1],["Mitsubishi",2],["Water Truck",1],["MITSUBISHI",4]],[["",6],["Area Pakerin",3]],[29.03,99.7,100,88.39,91.94,80.32,97.42,94.19,100],[29,134,172,96,135,79,99,97,88],[[85,9]],[[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},6],[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1]},3]],[[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},6],[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1]},3]],[[240,9]],[310,291,280,280,284.5,280,620,620,620],[54,248.5,126,117,218,194,439.5,343.5,343.5],[314.8,2440.4,0,1833.38,456.07,1295.01,2419.17,2398.19,2394.19],[5.83,9.82,0,15.67,2.09,6.68,5.5,6.98,6.97],[[0,9]],[[0,9]],[[0,9]],[[false,9]],[[{"$O":{}},9]]],"$M":[0,0,1,1,0,1,1,1,0,0,1,1,1,1,0,0,0,0,1,1,1,1,1]});
