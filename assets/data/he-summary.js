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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"25-11-2026 14:11","periode":"November 2026","lastDate":"2026-11-30"}},"unit":70,"wtUnit":31,"totalUnit":101,"hm":11043.9,"ma":90.9,"pa":93.1,"fuel":147994.9,"ratio":13.44,"penyiraman":1901,"belumUnit":9,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","FBS","GIP H1","GIP H2","JTU","SKN"],[6,1,31,16,11,5],[997.1,146.6,5147.2,2237.2,1748.2,767.6],[94.3,83.2,92.8,91.4,87.2,82.7],[9398.9,0.0,68892.4,31520.7,24857.8,13325.1]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN","EX-01 FBS"],[["GIP H2",16],["GIP H1",31],["JTU",11],["BDK",6],["SKN",5],["FBS",1]],"0010011100101100223455223534554264653245522325266778887678887676787866","0001111122233345000000111111111112222233333365501010111222333333001122",[95.95,92.14,97.38,98.24,95.24,99.05,76.19,100.0,94.52,97.24,100.0,92.86,92.86,91.19,39.52,100.0,86.06,98.64,95.2,97.05,92.04,92.09,100.0,97.86,100.0,94.82,100.0,90.91,100.0,84.09,99.55,100.0,80.5,99.3,89.75,92.16,96.48,94.91,87.05,93.66,67.66,99.09,87.41,93.18,68.86,100.0,100.0,98.77,100.0,45.64,65.91,88.15,88.3,86.59,93.55,98.23,94.45,100.0,94.5,89.5,87.73,96.71,97.14,100.0,91.5,98.05,93.86,32.09,98.1,83.18],[158.1,148.6,168.1,162.0,148.9,165.5,128.6,157.8,117.9,160.0,175.1,141.7,128.2,148.3,33.4,95.0,155.7,182.4,180.0,172.0,172.1,171.3,170.4,173.8,181.5,162.5,185.5,154.0,172.9,144.8,161.0,172.8,138.4,181.4,167.6,170.3,181.2,179.1,168.0,172.0,122.0,177.3,170.9,175.9,78.4,176.0,176.0,183.2,187.7,93.3,140.4,142.8,142.2,133.4,187.0,188.1,173.5,176.6,164.6,149.0,167.0,169.5,177.0,170.0,176.6,177.9,174.1,66.8,172.2,146.6],[96.0,93.0,97.0,98.0,96.0,99.0,78.0,100.0,95.0,97.0,100.0,94.0,94.0,92.0,45.0,100.0,88.0,99.0,95.0,97.0,92.0,93.0,100.0,98.0,100.0,95.0,100.0,96.0,100.0,86.0,100.0,100.0,84.0,99.0,90.0,97.0,96.0,95.0,89.0,94.0,81.0,99.0,88.0,94.0,73.0,100.0,100.0,98.0,100.0,87.0,72.0,88.0,98.0,100.0,100.0,100.0,99.0,100.0,95.0,90.0,88.0,97.0,97.0,100.0,92.0,98.0,95.0,33.0,98.0,97.0],[3012.0,2952.0,3357.0,1990.6,1847.6,2582.5,1605.0,1930.6,2240.0,2763.0,2915.0,1264.0,1064.0,1216.0,481.4,300.0,2597.2,2620.0,3420.9,3387.8,3521.4,3164.0,2046.8,1905.0,2204.0,1936.2,1808.0,1646.0,2516.3,1715.0,2002.0,2056.0,1680.6,3061.8,3916.4,2877.8,3591.1,2922.1,1710.0,1678.0,1364.0,1738.0,1734.0,1741.0,923.0,704.0,704.0,2939.9,2335.5,1196.2,1350.5,2210.1,1499.5,1434.8,2039.8,3960.4,3014.4,2876.7,1668.6,1375.0,1577.4,1569.5,1631.9,1576.5,3409.1,3160.6,2318.7,923.6,3513.1,0.0],[19.05,19.87,19.97,12.29,12.41,15.6,12.48,12.23,19.0,17.27,16.65,8.92,8.3,8.2,14.41,3.16,16.68,14.36,19.0,19.7,20.46,18.47,12.01,10.96,12.14,11.92,9.75,10.69,14.55,11.84,12.43,11.9,12.14,16.88,23.37,16.9,19.82,16.32,10.18,9.76,11.18,9.8,10.15,9.9,11.77,4.0,4.0,16.05,12.44,12.82,9.62,15.48,10.54,10.76,10.91,21.05,17.37,16.29,10.14,9.23,9.45,9.26,9.22,9.27,19.3,17.77,13.32,13.83,20.4,0.0],"0001121133344456070000111111211113333344444456671717111333444444001133",[[0,15],[1,1],[0,35],[1,3],[0,3],[1,3],[0,1],[1,1],[0,6],[1,1],[0,1]]],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area Dayung","Area Mekarsari","Area Ketapat","Area ISP","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"],"9":["14 FT","10 Ton","20 Ton","PC 200","30 Ton","-","5 KL","12 FT"]},"$M":[0,1,2,2,0,0,0,0,0,2,1]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT TSA-01","WT TSA-02","WT TSA-03","WT TLK-01","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT PBT-01"],[["05. SKN",4],["06. WT TSA",3],["07. WT TLK",1],["08. WT ASA",1],["09. WT FBS",4],["10. WT TJP",17],["11. WT PBT",1]],[66.0,132.0,47.0,18.0,57.0,67.0,74.0,0.0,0.0,44.0,18.0,13.0,41.0,59.0,92.0,84.0,77.0,62.0,84.0,78.0,85.0,83.0,90.0,51.0,60.0,72.0,80.0,67.0,63.0,105.0,32.0],[92.1,146.2,57.4,22.9,100.0,95.0,156.5,0.0,0.0,99.0,40.0,27.0,91.0,118.2,163.3,149.8,159.0,119.8,158.6,159.5,176.1,159.0,184.3,99.6,102.0,128.0,143.4,113.5,110.0,155.0,102.5],[73.77,75.33,18.92,15.15,100.0,99.0,87.88,0.0,0.0,90.63,100.0,95.31,86.67,85.88,100.0,95.9,84.92,72.62,97.22,96.63,97.22,93.45,90.48,64.61,93.4,94.23,86.87,85.73,80.56,99.58,97.69],[98.0,84.0,31.0,35.0,100.0,100.0,69.0,0.0,0.0,139.0,179.0,95.0,136.0,86.0,100.0,96.0,85.0,82.0,97.0,97.0,97.0,98.0,100.0,70.0,93.0,94.0,87.0,88.0,81.0,100.0,98.0]],"$M":[0,1,0,0,0,0]}}});
