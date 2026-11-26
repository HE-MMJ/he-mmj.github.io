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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"25-11-2026 13:16","periode":"November 2026","lastDate":"2026-11-30"}},"unit":72,"wtUnit":31,"totalUnit":103,"hm":11655.8,"ma":91.1,"pa":93.1,"fuel":153338.5,"ratio":13.08,"penyiraman":1964,"belumUnit":29,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","FBS","GIP H1","GIP H2","JTU","SKN"],[6,1,33,16,11,5],[1050.5,160.8,5630.5,2237.2,1792.4,784.4],[94.4,83.4,93.0,91.4,87.4,82.8],[9942.1,0.0,72504.2,31520.7,25694.9,13676.6]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-06 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-06 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN","EX-01 FBS"],[["GIP H2",16],["GIP H1",33],["JTU",11],["BDK",6],["SKN",5],["FBS",1]],"001001110010110022345662246345665235364256622426233778887378887373787833","000111112223334500400001111411111112222233333365501010111222333333001122",[95.95,92.14,97.38,98.24,95.24,99.05,76.19,100.0,94.52,97.24,100.0,92.86,92.86,91.19,39.52,100.0,81.93,98.75,100.0,95.6,96.3,92.71,92.75,100.0,98.04,100.0,95.25,100.0,100.0,91.3,99.17,85.42,99.13,100.0,82.13,98.73,89.77,92.82,96.77,95.33,88.13,92.91,66.13,94.58,88.46,87.92,69.52,100.0,100.0,98.77,100.0,45.64,65.91,88.71,88.86,86.59,93.55,98.38,94.45,100.0,94.76,90.0,87.73,97.0,97.14,100.0,91.5,98.05,93.86,32.09,98.26,83.38],[158.1,148.6,168.1,162.0,148.9,165.5,128.6,157.8,117.9,160.0,175.1,141.7,128.2,148.3,33.4,95.0,162.0,200.0,16.9,197.3,179.0,189.6,188.4,188.1,191.4,198.0,182.0,16.7,202.2,162.0,188.9,163.1,169.0,190.0,159.3,197.2,182.6,186.9,199.1,196.5,185.0,187.0,131.0,184.8,187.8,180.9,91.8,184.0,192.0,183.2,187.7,93.3,140.4,152.1,150.7,133.4,187.0,205.4,173.5,185.7,174.6,159.0,167.0,185.5,177.0,187.4,176.6,177.9,174.1,66.8,189.0,160.8],[96.0,93.0,97.0,98.0,96.0,99.0,78.0,100.0,95.0,97.0,100.0,94.0,94.0,92.0,45.0,100.0,84.0,99.0,100.0,96.0,96.0,93.0,94.0,100.0,98.0,100.0,95.0,100.0,100.0,96.0,99.0,87.0,100.0,100.0,85.0,99.0,90.0,97.0,97.0,95.0,90.0,93.0,79.0,95.0,89.0,89.0,74.0,100.0,100.0,98.0,100.0,87.0,72.0,88.0,98.0,100.0,100.0,100.0,99.0,100.0,95.0,90.0,88.0,97.0,97.0,100.0,92.0,98.0,95.0,33.0,98.0,96.0],[3012.0,2952.0,3357.0,1990.6,1847.6,2582.5,1605.0,1930.6,2240.0,2763.0,2915.0,1264.0,1064.0,1216.0,481.4,300.0,2597.2,2759.5,200.0,3620.4,3532.2,3521.4,3374.9,2148.8,1994.0,2204.0,2044.2,56.4,1899.0,1726.0,2619.5,1850.6,2098.0,2159.2,1776.6,3236.9,4151.4,3029.1,3527.4,3317.3,1799.0,1821.0,1475.0,1817.0,1792.0,1822.0,1062.2,736.0,736.0,2939.9,2335.5,1196.2,1350.5,2338.9,1608.1,1434.8,2039.8,4349.2,3014.4,3087.6,1783.6,1505.0,1577.4,1718.6,1631.9,1725.6,3409.1,3160.6,2318.7,923.6,3864.6,0.0],[19.05,19.87,19.97,12.29,12.41,15.6,12.48,12.23,19.0,17.27,16.65,8.92,8.3,8.2,14.41,3.16,16.03,13.8,11.83,18.35,19.73,18.57,17.91,11.42,10.42,11.13,11.23,3.38,9.39,10.65,13.87,11.35,12.41,11.36,11.15,16.41,22.73,16.21,17.72,16.88,9.72,9.74,11.26,9.83,9.54,10.07,11.57,4.0,3.83,16.05,12.44,12.82,9.62,15.38,10.67,10.76,10.91,21.17,17.37,16.63,10.22,9.47,9.45,9.26,9.22,9.21,19.3,17.77,13.32,13.83,20.45,0.0],"000112113334445607000001111111211113333344444456671717111333444444001133","000000000000000011011111111011111111111111111111111110001110001001100101"],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area ISP","Area Dayung","Area Mekarsari","Area Ketapat","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"],"9":["14 FT","10 Ton","20 Ton","PC 200","30 Ton","-","5 KL","12 FT"],"10":[1,0]},"$M":[0,1,2,2,0,0,0,0,0,2,2]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT TSA-01","WT TSA-02","WT TSA-03","WT TLK-01","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT PBT-01"],[["05. SKN",4],["06. WT TSA",3],["07. WT TLK",1],["08. WT ASA",1],["09. WT FBS",4],["10. WT TJP",17],["11. WT PBT",1]],[66.0,132.0,47.0,31.0,57.0,67.0,74.0,0.0,0.0,44.0,18.0,13.0,41.0,59.0,92.0,84.0,77.0,62.0,84.0,78.0,85.0,83.0,90.0,51.0,90.0,76.0,94.0,67.0,65.0,105.0,32.0],[92.1,146.2,57.4,40.1,100.0,95.0,156.5,0.0,0.0,99.0,40.0,27.0,91.0,118.2,163.3,149.8,159.0,119.8,158.6,159.5,176.1,159.0,184.3,99.6,160.7,137.6,168.2,113.5,114.0,155.0,102.5],[76.54,71.75,24.84,48.15,100.0,99.0,87.88,0.0,0.0,90.63,100.0,95.31,86.67,85.88,100.0,93.71,74.31,72.71,97.57,87.67,95.14,93.48,91.3,64.61,95.3,95.47,86.43,83.24,74.02,98.57,97.69],[98.0,79.0,34.0,50.0,100.0,100.0,69.0,0.0,0.0,139.0,179.0,95.0,136.0,86.0,100.0,93.0,76.0,81.0,98.0,88.0,95.0,98.0,100.0,70.0,95.0,95.0,88.0,85.0,76.0,99.0,98.0]],"$M":[0,1,0,0,0,0]}}});
