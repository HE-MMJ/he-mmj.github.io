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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"20-11-2026 16:47","periode":"November 2026","lastDate":"2026-11-30"}},"unit":69,"wtUnit":31,"totalUnit":100,"hm":9487.3,"ma":91.1,"pa":93.1,"fuel":103365.7,"ratio":10.84,"penyiraman":1701,"belumUnit":4,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","GIP H1","GIP H2","JTU","SKN"],[6,31,16,11,5],[860.4,4373.0,2021.8,1549.3,682.8],[93.8,93.1,91.4,86.8,84.1],[7310.1,43260.4,21484.1,20234.2,11076.9]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN"],[["GIP H2",16],["GIP H1",31],["JTU",11],["BDK",6],["SKN",5]],"001001110010110022345522353455426465324552232526677888767888767678786","000111112223334500000011111111111222223333336550101011122233333300112",[95.53,91.32,97.11,98.95,94.74,98.95,73.68,100.0,93.95,97.89,100.0,92.11,92.11,92.63,43.68,100.0,95.92,98.42,94.44,96.58,91.63,91.39,100.0,97.53,100.0,94.0,100.0,89.47,100.0,86.84,99.47,100.0,84.21,99.19,86.74,90.93,95.92,97.79,85.0,93.93,68.94,98.95,87.0,92.11,70.84,100.0,100.0,98.58,100.0,47.58,60.53,87.53,87.68,86.59,92.53,100.0,93.58,100.0,94.21,88.95,85.0,96.16,98.24,100.0,94.32,97.72,93.21,37.16,97.89],[141.1,133.7,151.9,146.7,134.1,148.6,111.2,141.8,102.3,145.9,158.2,125.7,115.9,136.3,33.4,95.0,149.6,155.2,155.3,145.0,146.9,140.0,144.6,147.0,154.5,135.0,158.5,127.0,140.5,125.9,134.0,146.2,125.3,155.5,125.5,144.3,156.7,159.8,141.0,139.0,106.0,152.3,147.4,149.9,69.1,144.0,152.0,157.2,160.9,83.7,111.8,136.0,135.5,133.4,160.6,153.6,149.3,167.3,154.7,139.0,132.0,145.5,144.0,145.2,155.3,149.2,155.8,66.8,155.7],[96.0,92.0,97.0,99.0,96.0,99.0,76.0,100.0,94.0,98.0,100.0,93.0,93.0,94.0,49.0,100.0,96.0,98.0,94.0,97.0,92.0,92.0,100.0,98.0,100.0,94.0,100.0,96.0,100.0,88.0,100.0,100.0,87.0,99.0,87.0,96.0,96.0,98.0,87.0,94.0,84.0,99.0,88.0,93.0,75.0,100.0,100.0,97.0,100.0,85.0,68.0,88.0,99.0,100.0,100.0,100.0,99.0,100.0,94.0,89.0,85.0,96.0,98.0,100.0,94.0,98.0,95.0,39.0,98.0],[2175.0,2035.0,2287.0,1380.6,1257.6,1757.5,1107.8,1385.2,1400.0,1878.0,1930.0,832.0,520.0,832.0,481.4,225.0,1916.2,1643.5,2121.3,2242.1,2121.1,1885.3,1271.6,1284.0,1206.0,1179.0,1161.0,1053.0,1880.0,1081.2,1266.2,1289.2,1333.8,1948.3,2560.4,1784.7,887.4,2187.7,1019.0,1135.0,853.0,1322.0,1133.0,1016.0,583.4,448.0,448.0,2270.5,1749.9,1077.0,877.7,1894.3,1301.4,1434.8,1590.2,3217.7,2282.1,2538.6,1318.6,1101.0,1152.0,1223.0,1291.9,1223.6,2729.8,2616.9,1853.6,923.6,2953.0],[15.41,15.22,15.06,9.41,9.38,11.83,9.96,9.77,13.69,12.87,12.2,6.62,4.49,6.1,14.41,2.37,12.81,10.59,13.66,15.46,14.44,13.47,8.79,8.73,7.81,8.73,7.32,8.29,13.38,8.59,9.45,8.82,10.64,12.53,20.4,12.37,5.66,13.69,7.23,8.17,8.05,8.68,7.69,6.78,8.44,3.11,2.95,14.44,10.88,12.87,7.85,13.93,9.6,10.76,9.9,20.95,15.29,15.17,8.52,7.92,8.73,8.41,8.97,8.43,17.58,17.54,11.9,13.83,18.97],"000112113334445607000011111121111333334444445667171711133344444400113",[[0,34],[1,1],[0,4],[1,1],[0,13],[1,1],[0,8],[1,1],[0,6]]],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area Dayung","Area Mekarsari","Area Ketapat","Area ISP","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"],"9":["14 FT","10 Ton","20 Ton","PC 200","30 Ton","-","5 KL","12 FT"]},"$M":[0,1,2,2,0,0,0,0,0,2,1]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["SKN",4],["WT ASA",1],["WT FBS",4],["WT PBT",1],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[64.0,129.0,43.0,14.0,63.0,18.0,7.0,3.0,12.0,58.0,59.0,92.0,84.0,77.0,60.0,80.0,71.0,83.0,53.0,54.0,3.0,47.0,50.0,80.0,67.0,47.0,104.0,0.0,57.0,67.0,55.0],[88.8,142.6,52.8,19.8,0.0,44.5,15.0,6.0,24.0,56.5,118.2,163.3,149.8,159.0,114.8,147.1,149.5,176.1,100.0,115.5,8.5,78.0,83.0,143.4,113.5,86.0,153.4,0.0,104.0,105.0,110.5],[93.75,83.7,29.79,15.15,0.0,100.0,100.0,100.0,80.0,95.83,85.88,100.0,97.31,92.43,71.05,96.57,96.57,96.93,96.88,95.83,16.67,100.0,91.35,86.87,84.14,78.82,99.54,0.0,100.0,99.0,100.0],[97.0,89.0,55.0,33.0,0.0,147.0,182.0,100.0,140.0,97.0,86.0,100.0,97.0,92.0,81.0,97.0,97.0,97.0,97.0,96.0,18.0,100.0,92.0,87.0,87.0,78.0,100.0,0.0,100.0,100.0,91.0]],"$M":[0,1,0,0,0,0]}}});
