/* assets/data/he-summary.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
window.MMJ_DATA = window.MMJ_DATA || {};
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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"21-11-2026 16:34","periode":"November 2026","lastDate":"2026-11-30"}},"unit":70,"wtUnit":31,"totalUnit":101,"hm":9850.9,"ma":91.0,"pa":93.1,"fuel":132460.8,"ratio":13.55,"penyiraman":1715,"belumUnit":4,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","FBS","GIP H1","GIP H2","JTU","SKN"],[6,1,31,16,11,5],[860.4,129.7,4606.9,2021.8,1549.3,682.8],[93.8,85.8,93.0,91.4,86.8,84.1],[8918.3,0.0,59569.2,28340.5,23110.8,12522.0]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN","EX-01 FBS"],[["GIP H2",16],["GIP H1",31],["JTU",11],["BDK",6],["SKN",5],["FBS",1]],"0010011100101100223455223534554264653245522325266778887678887676787866","0001111122233345000000111111111112222233333365501010111222333333001122",[95.53,91.32,97.11,98.95,94.74,98.95,73.68,100.0,93.95,97.89,100.0,92.11,92.11,92.63,43.68,100.0,94.67,98.5,94.72,96.58,91.25,91.3,100.0,97.65,100.0,94.3,100.0,89.47,100.0,82.5,99.47,100.0,84.21,99.23,86.74,91.38,96.13,94.4,85.75,92.99,70.57,99.0,87.65,92.5,72.3,100.0,100.0,98.58,100.0,47.58,60.53,87.53,87.68,86.59,92.53,100.0,93.58,100.0,94.21,88.95,85.0,96.16,98.24,100.0,94.32,97.72,93.21,37.16,97.89,85.79],[141.1,133.7,151.9,146.7,134.1,148.6,111.2,141.8,102.3,145.9,158.2,125.7,115.9,136.3,33.4,95.0,155.7,164.2,163.3,145.0,154.3,153.4,153.6,156.0,163.5,143.5,167.5,127.0,154.7,125.9,134.0,155.2,125.3,164.2,125.5,154.2,165.1,161.8,150.0,154.0,115.0,161.3,156.4,158.9,78.4,160.0,160.0,157.2,160.9,83.7,111.8,136.0,135.5,133.4,160.6,153.6,149.3,167.3,154.7,139.0,132.0,145.5,144.0,145.2,155.3,149.2,155.8,66.8,155.7,129.7],[96.0,92.0,97.0,99.0,96.0,99.0,76.0,100.0,94.0,98.0,100.0,93.0,93.0,94.0,49.0,100.0,95.0,99.0,95.0,97.0,91.0,92.0,100.0,98.0,100.0,94.0,100.0,96.0,100.0,84.0,100.0,100.0,87.0,99.0,87.0,96.0,96.0,94.0,88.0,93.0,85.0,99.0,89.0,93.0,76.0,100.0,100.0,97.0,100.0,85.0,68.0,88.0,99.0,100.0,100.0,100.0,99.0,100.0,94.0,89.0,85.0,96.0,98.0,100.0,94.0,98.0,95.0,39.0,98.0,96.0],[2732.0,2747.0,3037.0,1810.6,1717.6,2322.5,1404.8,1725.6,1965.0,2388.0,2605.0,1136.0,816.0,1152.0,481.4,300.0,2522.2,2254.0,2976.3,2918.5,3052.1,2704.2,1768.4,1676.0,1676.0,1644.6,1550.0,1439.0,2385.5,1538.4,1717.4,1790.8,1521.0,2657.2,3869.8,2469.8,1531.7,2922.1,1429.0,1515.0,1198.0,1736.0,1560.0,1472.0,858.2,608.0,608.0,2662.0,2106.6,1077.0,1136.4,2141.4,1465.2,1490.2,1827.9,3582.4,2745.0,2876.7,1668.6,1375.0,1427.4,1463.0,1556.9,1427.4,3109.8,2975.3,2180.3,923.6,3333.0,0.0],[19.36,20.55,19.99,12.34,12.81,15.63,12.63,12.17,19.21,16.37,16.47,9.04,7.04,8.45,14.41,3.16,16.2,13.73,18.23,20.13,19.78,17.63,11.51,10.74,10.25,11.46,9.25,11.33,15.42,12.22,12.82,11.54,12.14,16.18,30.84,16.02,9.28,18.06,9.53,9.84,10.42,10.76,9.97,9.26,10.95,3.8,3.8,16.93,13.09,12.87,10.17,15.75,10.81,11.17,11.38,23.32,18.39,17.19,10.79,9.89,10.81,10.06,10.81,9.83,20.02,19.94,13.99,13.83,21.41,0.0],[["",70]],[[0,34],[1,1],[0,18],[1,1],[0,8],[1,1],[0,5],[1,1],[0,1]]],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area Dayung","Area Mekarsari","Area Ketapat","Area ISP","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"]},"$M":[0,1,2,2,0,0,0,0,0,1,1]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["SKN",4],["WT ASA",1],["WT FBS",4],["WT PBT",1],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[66.0,132.0,47.0,18.0,63.0,18.0,7.0,3.0,12.0,58.0,59.0,92.0,84.0,77.0,60.0,80.0,71.0,83.0,53.0,54.0,3.0,47.0,50.0,80.0,67.0,47.0,105.0,0.0,57.0,67.0,55.0],[92.1,146.2,57.4,22.9,0.0,44.5,15.0,6.0,24.0,56.5,118.2,163.3,149.8,159.0,114.8,147.1,149.5,176.1,100.0,115.5,8.5,78.0,83.0,143.4,113.5,86.0,155.0,0.0,104.0,105.0,110.5],[77.21,75.33,18.92,15.15,0.0,100.0,100.0,100.0,80.0,95.83,85.88,100.0,95.68,89.17,72.5,96.76,96.57,96.93,96.88,95.83,16.67,100.0,91.35,86.87,84.14,78.82,99.58,0.0,100.0,99.0,100.0],[98.0,84.0,31.0,35.0,0.0,147.0,182.0,100.0,140.0,97.0,86.0,100.0,96.0,89.0,82.0,97.0,97.0,97.0,97.0,96.0,18.0,100.0,92.0,87.0,87.0,78.0,100.0,0.0,100.0,100.0,91.0]],"$M":[0,1,0,0,0,0]}}});
