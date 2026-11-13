/* assets/data/wt-01.js - data WT bulan 01 (dibuat otomatis oleh build). */
window.MMJ_WT = window.MMJ_WT || {};
window.MMJ_WT.PERIODE = {"y": 2026, "m": 1, "last": 31};
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
window.MMJ_WT.DATA = window.MMJ_INFLATE({"$D":["Unit","Sheet","Vendor","File","KolomPenyiraman","Sumber","Model","Area","MA","PA","MATarget","BelumS","BelumM","HMTarget","MOHH","HMReview","FuelReview","FuelRatio","TotalPenyiraman","HariAda","HariTerisi","Shift2","Days"],"$R":[["WT ASA-01","WT ATN-02","WT ATN-03","WT ATN-04","WT ATN-05","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],["WT ASA-01","WT ATN-02","WT ATN-03","WT ATN-04","WT ATN-05","WT-01 TJP","WT-02 TJP","WT-03 TJP","WT-04 TJP","WT-05 TJP","WT-06 TJP","WT-09 TJP","WT-10 TJP","WT-11 TJP","WT-12 TJP","WT-13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["WT ASA",1],["WT FBS",4],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[["2026.01. Summary Time Sheet WT ASA Periode Januari 2026.xlsx",1],["2026.01. Summary Time Sheet WT ATN Periode Januari 2026.xlsx",4],["2026.01. Summary Time Sheet WT MMJ_TJP Periode Januari 2026.xlsx",17],["2026.01. Summary Time Sheet WT TLK Periode Januari 2025.xlsx",1],["2026.01. Summary Time Sheet WT TSA Periode Januari 2026.xlsx",3]],[[23,1],[27,4],[29,17],[31,1],[29,3]],[["kolom",26]],"01221333333333333333330000",[["",5],["Area Tapatmekar",6],["Area Bintitapat",3],["Area Dayung",2],["Area B80",2],["Area Mendis",4],["",1],["Area Bintialo",2],["Area Dayung",1]],[100,98.89,96.77,83.87,93.55,98.66,95.16,98.66,98.31,97.45,97.33,96.1,97.54,98.47,98.78,95.35,99.45,92.42,97.51,96.37,90.19,95.83,96.77,100,99.85,98.39],[100,145,163,89,181,99,95,99,98,97,97,96,98,99,99,97,99,92,98,96,95,96,87,201,206,197],[[85,26]],[[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},26]],[[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},26]],[[240,5],[360,17],[240,4]],"01111222222222322222220000",[223,192,91.5,159,46,188.8,212.3,222,243.1,249.6,214.2,252.9,253.5,246.2,252.1,244.7,218.5,219.8,197.5,162.4,206.2,210.3,236,438,437.5,451],[1036.48,1357.09,0,1522.7,1472.51,1624.38,1642.42,1697.62,1732.54,1817.77,1685.41,1682.53,1743.65,1726.62,1988.2,1827.96,2214.65,2157.79,2146.78,2101.74,1957.49,2081.4,1429.22,2275.78,2404.65,2364.61],[4.65,7.07,0,9.58,32.01,8.6,7.74,7.65,7.13,7.28,7.87,6.65,6.88,7.01,7.89,7.47,10.14,9.82,10.87,12.94,9.49,9.9,6.06,5.2,5.5,5.24],[[0,26]],[[0,26]],[[0,26]],[[false,26]],[[{"$O":{}},26]]],"$S":{"6":["MITSUBISHI","Water Truck","Mitsubishi","Hino 500"],"14":[310,300,744,743.6]},"$M":[0,0,1,1,1,1,2,1,0,0,1,1,1,1,2,0,0,0,1,1,1,1,1]});
