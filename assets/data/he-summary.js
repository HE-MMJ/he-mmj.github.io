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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"16-11-2026 13:42","periode":"November 2026","lastDate":"2026-11-30"}},"unit":69,"wtUnit":31,"totalUnit":100,"hm":6324.2,"ma":91.5,"pa":93.7,"fuel":85586.3,"ratio":13.39,"penyiraman":985,"belumUnit":25,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","GIP H1","GIP H2","JTU","SKN"],[6,31,16,11,5],[582.7,3212.4,1014.4,1040.4,474.3],[91.8,93.1,95.2,83.4,87.5],[5319.5,42362.4,14128.5,15307.1,8468.8]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN"],[["GIP H2",16],["GIP H1",31],["JTU",11],["BDK",6],["SKN",5]],"001001110010110022345522353455426465324552232526677888767888767678786","000111112223334500000011111111111222223333336550101011122233333300112",[95.56,100.0,100.0,100.0,100.0,97.78,66.67,100.0,96.11,100.0,100.0,85.56,83.33,100.0,98.89,100.0,94.46,98.79,93.74,97.5,89.35,88.93,100.0,98.57,100.0,91.86,100.0,85.71,100.0,82.14,99.29,100.0,100.0,98.9,80.37,88.4,97.18,100.0,79.62,93.85,78.26,100.0,91.14,89.29,67.57,100.0,100.0,98.07,100.0,52.58,37.5,84.93,83.29,83.71,87.09,100.0,89.83,100.0,92.86,85.0,75.45,100.0,97.5,100.0,90.18,96.85,91.67,58.83,100.0],[69.0,72.7,73.9,72.7,71.1,71.9,46.2,71.3,56.5,72.3,75.3,57.7,51.0,68.8,39.0,45.0,108.3,114.4,113.2,107.5,105.2,103.6,103.8,109.4,112.5,98.0,115.7,92.0,104.8,87.8,99.5,106.5,108.2,112.5,102.5,103.9,118.2,119.0,90.0,106.0,72.0,111.0,112.4,104.9,45.6,112.0,112.0,114.9,116.4,59.0,40.6,98.6,94.6,107.6,86.3,112.9,88.7,120.8,108.1,94.0,71.0,107.5,99.0,103.1,87.6,108.2,94.0,66.8,117.7],[96.0,100.0,100.0,100.0,100.0,98.0,68.0,100.0,96.0,100.0,100.0,88.0,85.0,100.0,99.0,100.0,94.0,99.0,94.0,98.0,89.0,90.0,100.0,99.0,100.0,92.0,100.0,94.0,100.0,83.0,100.0,100.0,100.0,99.0,86.0,95.0,97.0,100.0,82.0,94.0,84.0,100.0,91.0,91.0,72.0,100.0,100.0,97.0,100.0,94.0,47.0,86.0,100.0,100.0,100.0,100.0,98.0,99.0,93.0,85.0,75.0,100.0,98.0,100.0,90.0,97.0,92.0,60.0,100.0],[1350.0,1420.0,1480.0,891.0,852.6,1122.5,617.8,860.2,1020.0,1128.0,1195.0,512.0,472.0,576.0,481.4,150.0,1916.2,1643.5,2121.3,2242.1,2121.1,1885.3,1271.6,1284.0,308.0,1179.0,1161.0,1053.0,1880.0,1081.2,1266.2,1289.2,1333.8,1948.3,2560.4,1784.7,887.4,2187.7,1019.0,1135.0,853.0,1322.0,1133.0,1016.0,583.4,448.0,448.0,1888.2,1462.4,722.5,365.2,1556.3,1048.7,1192.4,983.2,2454.1,1448.1,2186.0,1038.6,831.5,676.0,916.2,859.4,997.8,1855.3,2031.3,1238.2,923.6,2420.4],[19.57,19.53,20.03,12.26,11.99,15.61,13.37,12.06,18.05,15.6,15.87,8.87,9.25,8.37,12.34,3.33,17.69,14.37,18.74,20.86,20.16,18.2,12.25,11.74,2.74,12.03,10.03,11.45,17.94,12.31,12.73,12.11,12.33,17.32,24.98,17.18,7.51,18.38,11.32,10.71,11.85,11.91,10.08,9.69,12.79,4.0,4.0,16.43,12.56,12.25,8.99,15.78,11.09,11.08,11.39,21.74,16.33,18.1,9.61,8.85,9.52,8.52,8.68,9.68,21.18,18.77,13.17,13.83,20.56],"000112113334445607000011111121111333334444445667171711133344444400113","000000000000001011111111111111111111111101111111100111010111010101001"],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area Dayung","Area Mekarsari","Area Ketapat","Area ISP","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"],"9":["14 FT","10 Ton","20 Ton","PC 200","30 Ton","-","5 KL","12 FT"],"10":[1,0]},"$M":[0,1,2,2,0,0,0,0,0,2,2]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["SKN",4],["WT ASA",1],["WT FBS",4],["WT PBT",1],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[72.0,73.0,41.0,4.0,63.0,18.0,7.0,3.0,12.0,77.0,33.0,42.0,43.0,25.0,15.0,44.0,37.0,43.0,13.0,15.0,3.0,0.0,0.0,20.0,20.0,14.0,17.0,0.0,77.0,77.0,77.0],[76.3,84.1,47.8,6.4,0.0,44.5,15.0,6.0,24.0,0.0,61.6,106.9,121.1,126.2,83.2,112.0,108.5,151.6,100.0,115.5,8.5,0.0,0.0,89.8,54.0,68.0,48.2,0.0,0.0,0.0,0.0],[95.83,74.85,29.79,22.5,0.0,100.0,100.0,100.0,80.0,0.0,93.75,100.0,99.52,95.14,68.27,95.51,97.22,97.78,96.88,100.0,16.67,0.0,0.0,86.88,85.63,74.58,100.0,0.0,0.0,0.0,0.0],[98.0,83.0,52.0,27.0,0.0,147.0,182.0,100.0,140.0,0.0,93.0,100.0,100.0,96.0,82.0,96.0,97.0,98.0,97.0,100.0,18.0,0.0,0.0,88.0,85.0,75.0,100.0,0.0,0.0,0.0,0.0]],"$M":[0,1,0,0,0,0]}}});
