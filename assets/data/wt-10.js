/* assets/data/wt-10.js - data WT bulan 10 (dibuat otomatis oleh build). */
window.MMJ_WT = window.MMJ_WT || {};
window.MMJ_WT.PERIODE = {"y": 2026, "m": 10, "last": 31};
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
window.MMJ_WT.DATA = window.MMJ_INFLATE({"$D":["Unit","Sheet","Vendor","File","KolomPenyiraman","Sumber","Model","Area","MA","PA","MATarget","BelumS","BelumM","HMTarget","MOHH","HMReview","FuelReview","FuelRatio","TotalPenyiraman","HariAda","HariTerisi","Shift2","Days"],"$R":[["WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],["WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT-01 TJP","WT-02 TJP","WT-03 TJP","WT-04 TJP","WT-05 TJP","WT-06 TJP","WT-09 TJP","WT-10 TJP","WT-11 TJP","WT-12 TJP","WT-13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["WT ASA",1],["WT FBS",4],["WT PBT",1],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[["2026.10. Summary Time Sheet WT ASA Periode Oktober 2026.xlsx",1],["2026.10. Summary Time Sheet WT FBS Periode Oktober 2026.xlsx",4],["2026.10. Summary Time Sheet WT PBT Periode Oktober 2026.xlsx",1],["2026.10. Summary Time Sheet WT MMJ_TJP Periode Oktober 2026.xlsx",17],["2026.10. Summary Time Sheet WT TLK Periode Oktober 2026.xlsx",1],["2026.10. Summary Time Sheet WT TSA Periode Oktober 2026.xlsx",3]],[[23,1],[27,4],[24,1],[29,17],[31,1],[24,3]],[["kolom",27]],"012210333333333333333330000",[["",5],["Area Pakerin",1],["Area Tapatmekar",6],["Area Bintitapat",3],["Area Dayung",2],["Area B80",2],["Area Mendis",4],["",1],["Area Pakerin",3]],[29.03,94.57,100,78.39,81.52,99.68,87.49,92.11,83.82,57.89,58.6,95.7,89.99,93.8,97.85,91.68,97.93,90.73,71.51,90.63,70.28,73.92,80.63,0,100,100,100],[29,136,164,87,127,100,87,92,84,74,70,96,90,94,98,92,98,91,72,91,70,74,81,0,100,100,102],[[85,27]],[[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},24],[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1]},3]],[[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},24],[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1]},3]],[[240,6],[360,17],[240,4]],[[310,1],[294.75,1],[280,1],[295,1],[293.5,1],[620,1],[744,17],[280,1],[620,3]],[63,231.25,150,156,213.5,338.5,355.8,438.6,412.2,282.1,283.5,374.7,347.5,355.7,363,356.6,358.1,289.1,244.7,404.3,253.5,296.3,331.1,0,445,449.5,449.5],[326.48,2721.88,194.05,2005.89,0,3129.54,2754.8,3101.4,3256.84,2771.96,2657.36,3182,3329.76,3283.24,3252.77,3371.49,3606.26,3442.8,4628.65,3631.27,1368.65,2735,2510,0,2750.31,2866.88,3046.97],[5.18,11.77,1.29,12.86,0,9.25,7.74,7.07,7.9,9.83,9.37,8.49,9.58,9.23,8.96,9.45,10.07,11.91,18.92,8.98,5.4,9.23,7.58,0,6.18,6.38,6.78],[[0,27]],[[0,27]],[[0,27]],[[false,27]],[[{"$O":{}},27]]],"$S":{"6":["MITSUBISHI","Water Truck","Mitsubishi","Hino 500"]},"$M":[0,0,1,1,1,1,2,1,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1]});
