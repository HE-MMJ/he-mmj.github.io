/* assets/data/wt-02.js - data WT bulan 02 (dibuat otomatis oleh build). */
window.MMJ_WT = window.MMJ_WT || {};
window.MMJ_WT.PERIODE = {"y": 2026, "m": 2, "last": 28};
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
window.MMJ_WT.DATA = window.MMJ_INFLATE({"$D":["Unit","Sheet","Vendor","File","KolomPenyiraman","Sumber","Model","Area","MA","PA","MATarget","BelumS","BelumM","HMTarget","MOHH","HMReview","FuelReview","FuelRatio","TotalPenyiraman","HariAda","HariTerisi","Shift2","Days"],"$R":[["WT ASA-01","WT ATN-02","WT ATN-03","WT ATN-04","WT ATN-05","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],["WT ASA-01","WT ATN-02","WT ATN-03","WT ATN-04","WT ATN-05","WT-01 TJP","WT-02 TJP","WT-03 TJP","WT-04 TJP","WT-05 TJP","WT-06 TJP","WT-09 TJP","WT-10 TJP","WT-11 TJP","WT-12 TJP","WT-13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["WT ASA",1],["WT FBS",4],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[["2026.02. Summary Time Sheet WT ASA Periode Februari 2026.xlsx",1],["2026.02. Summary Time Sheet WT ATN Periode Februari 2026.xlsx",4],["2026.02. Summary Time Sheet WT MMJ_TJP Periode Februari 2026_R01.xlsx",17],["2026.02. Summary Time Sheet WT TLK Periode Februari 2026.xlsx",1],["2026.02. Summary Time Sheet WT TSA Periode Februari 2026.xlsx",3]],[[23,1],[27,4],[29,17],[31,1],[24,3]],[["kolom",26]],"01221333333333333333330000",[["",5],["Area Tapatmekar",6],["Area Bintitapat",3],["Area Dayung",2],["Area B80",2],["Area Mendis",4],["",1],["Area Pakerin",3]],[96.43,99.19,96.43,0,78.73,99.55,99.4,95.91,100,98.29,99.05,98.36,97.57,99.07,100,90.18,98.81,96.88,96.62,95.71,95.39,96.5,96.43,99.29,99.64,100],[87,133,173,0,164,100,99,96,100,98,99,98,98,99,100,96,99,97,97,96,97,97,77,0,0,0],[[85,26]],[[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},26]],[[{"$A":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},26]],[[240,5],[360,17],[240,4]],[[310,1],[298.5,1],[305,1],[280,1],[303,1],[672,17],[280,1],[560,3]],[189,197.5,72.5,0,43.95,194.6,203,226,227.4,236.6,210.6,202,207.8,228.8,231.6,220.1,219.8,166.8,197.6,190.2,186.4,218.6,214,340.5,326,326],[1008.31,1454.54,0,0,1421.05,1627.01,1617,1641.01,1600.96,1717.29,1482.08,1565.91,1604.94,1631.96,1818.08,1686.71,2111.2,1867.12,1846.68,1807.47,1775.22,1860.15,1441.79,2363.27,2368.04,2365.27],[5.33,7.36,0,0,32.33,8.36,7.97,7.26,7.04,7.26,7.04,7.75,7.72,7.13,7.85,7.66,9.61,11.19,9.35,9.5,9.52,8.51,6.74,6.94,7.26,7.26],[[0,26]],[[0,26]],[[0,26]],[[false,26]],[[{"$O":{}},26]]],"$S":{"6":["MITSUBISHI","Water Truck","Mitsubishi","Hino 500"]},"$M":[0,0,1,1,1,1,2,1,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1]});
