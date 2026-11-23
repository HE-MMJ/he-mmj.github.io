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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"23-11-2026 08:15","periode":"November 2026","lastDate":"2026-11-30"}},"unit":70,"wtUnit":31,"totalUnit":101,"hm":10600.1,"ma":90.9,"pa":93.1,"fuel":141801.0,"ratio":13.49,"penyiraman":1766,"belumUnit":4,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","FBS","GIP H1","GIP H2","JTU","SKN"],[6,1,31,16,11,5],[972.4,137.4,4828.5,2237.2,1683.8,740.8],[94.1,82.4,93.1,91.4,87.0,82.9],[9068.3,0.0,65832.6,31520.7,23055.3,12324.1]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN","EX-01 FBS"],[["GIP H2",16],["GIP H1",31],["JTU",11],["BDK",6],["SKN",5],["FBS",1]],"0010011100101100223455223534554264653245522325266778887678887676787866","0001111122233345000000111111111112222233333365501010111222333333001122",[95.95,92.14,97.38,98.24,95.24,99.05,76.19,100.0,94.52,97.24,100.0,92.86,92.86,91.19,39.52,100.0,94.67,98.57,94.97,96.9,91.66,91.71,100.0,97.76,100.0,94.57,100.0,90.48,100.0,83.33,99.52,100.0,80.0,99.26,87.48,91.79,96.31,94.67,85.75,93.34,70.57,99.0,88.24,92.86,72.3,100.0,100.0,98.71,100.0,45.2,64.29,88.15,88.3,86.59,93.24,98.14,94.19,100.0,94.5,89.5,87.14,96.55,97.14,100.0,91.1,98.05,93.55,33.62,98.0,82.38],[158.1,148.6,168.1,162.0,148.9,165.5,128.6,157.8,117.9,160.0,175.1,141.7,128.2,148.3,33.4,95.0,155.7,173.1,171.5,163.0,163.3,162.3,162.4,164.8,172.5,152.7,176.5,145.0,163.8,135.4,152.0,155.2,125.3,172.7,134.2,162.3,172.4,163.9,150.0,163.0,115.0,161.3,164.9,167.9,78.4,160.0,168.0,174.1,178.3,83.7,130.7,142.8,142.2,133.4,178.7,177.7,165.6,176.6,164.6,149.0,158.0,161.5,177.0,162.3,166.0,177.9,166.0,66.8,164.1,137.4],[96.0,93.0,97.0,98.0,96.0,99.0,78.0,100.0,95.0,97.0,100.0,94.0,94.0,92.0,45.0,100.0,95.0,99.0,95.0,97.0,92.0,93.0,100.0,98.0,100.0,95.0,100.0,96.0,100.0,85.0,100.0,100.0,83.0,99.0,87.0,96.0,96.0,94.0,88.0,94.0,85.0,99.0,89.0,94.0,76.0,100.0,100.0,98.0,100.0,85.0,71.0,88.0,98.0,100.0,100.0,100.0,99.0,100.0,95.0,90.0,87.0,97.0,97.0,100.0,91.0,98.0,95.0,35.0,98.0,97.0],[3012.0,2952.0,3357.0,1990.6,1847.6,2582.5,1605.0,1930.6,2240.0,2763.0,2915.0,1264.0,1064.0,1216.0,481.4,300.0,2597.2,2353.0,3139.7,3053.4,3158.5,2842.9,1827.2,1724.0,2004.0,1721.4,1631.0,1458.0,2277.5,4406.4,1717.4,1836.4,1521.0,2755.8,3900.0,2587.1,3095.6,2922.1,1519.0,1599.0,1303.0,1562.0,1560.0,1557.0,923.0,640.0,640.0,2662.0,2106.5,1077.0,1136.4,2141.4,1465.2,1434.8,1827.9,3582.4,2745.0,2876.7,1668.6,1375.0,1502.4,1463.0,1631.9,1427.4,3109.8,2975.3,2180.3,923.6,3135.1,0.0],[19.05,19.87,19.97,12.29,12.41,15.6,12.48,12.23,19.0,17.27,16.65,8.92,8.3,8.2,14.41,3.16,16.68,13.59,18.31,18.73,19.34,17.52,11.25,10.46,11.62,11.27,9.24,10.06,13.9,32.54,11.3,11.83,12.14,15.96,29.06,15.94,17.96,17.83,10.13,9.81,11.33,9.68,9.46,9.27,11.77,4.0,3.81,15.29,11.81,12.87,8.7,15.0,10.3,10.76,10.23,20.16,16.58,16.29,10.14,9.23,9.51,9.06,9.22,8.79,18.73,16.72,13.13,13.83,19.1,0.0],"0001121133344456070000111111211113333344444456671717111333444444001133",[[0,15],[1,1],[0,24],[1,1],[0,12],[1,1],[0,14],[1,1],[0,1]]],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area Dayung","Area Mekarsari","Area Ketapat","Area ISP","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"],"9":["14 FT","10 Ton","20 Ton","PC 200","30 Ton","-","5 KL","12 FT"]},"$M":[0,1,2,2,0,0,0,0,0,2,1]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["SKN",4],["WT ASA",1],["WT FBS",4],["WT PBT",1],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[66.0,132.0,47.0,18.0,63.0,18.0,7.0,3.0,12.0,58.0,59.0,92.0,84.0,77.0,60.0,80.0,71.0,83.0,53.0,54.0,3.0,60.0,72.0,80.0,67.0,63.0,105.0,0.0,57.0,67.0,55.0],[92.1,146.2,57.4,22.9,0.0,44.5,15.0,6.0,24.0,56.5,118.2,163.3,149.8,159.0,114.8,147.1,149.5,176.1,100.0,115.5,8.5,102.0,128.0,143.4,113.5,110.0,155.0,0.0,104.0,105.0,110.5],[77.21,75.33,18.92,15.15,0.0,100.0,100.0,100.0,80.0,95.83,85.88,100.0,95.68,84.92,73.81,96.93,96.57,97.08,96.88,95.83,16.67,93.4,94.23,86.87,85.73,80.56,99.58,0.0,100.0,99.0,100.0],[98.0,84.0,31.0,35.0,0.0,147.0,182.0,100.0,140.0,97.0,86.0,100.0,96.0,85.0,83.0,97.0,97.0,97.0,97.0,96.0,18.0,93.0,94.0,87.0,88.0,81.0,100.0,0.0,100.0,100.0,91.0]],"$M":[0,1,0,0,0,0]}}});
