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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"28-11-2026 15:31","periode":"November 2026","lastDate":"2026-11-30"}},"unit":72,"wtUnit":31,"totalUnit":103,"hm":13102.1,"ma":90.7,"pa":92.6,"fuel":174277.1,"ratio":13.37,"penyiraman":2006,"belumUnit":2,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","FBS","GIP H1","GIP H2","JTU","SKN"],[6,1,33,16,11,5],[1192.6,177.7,6090.9,2684.6,2063.1,893.2],[92.9,84.7,93.3,91.1,85.7,81.4],[11364.7,0.0,79952.4,37461.7,29838.8,15659.5]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-06 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-06 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN","EX-01 FBS"],[["GIP H2",16],["GIP H1",33],["JTU",11],["BDK",6],["SKN",5],["FBS",1]],"001001110010110022345662246345665235364256622426233778887378887373787833","000111112223334500400001111411111112222233333365501010111222333333001122",[96.6,89.4,97.8,98.52,94.4,99.2,80.0,96.0,95.4,97.68,100.0,94.0,92.6,92.6,33.2,100.0,82.94,98.23,100.0,95.94,96.0,93.0,93.04,99.04,97.27,100.0,95.44,100.0,100.0,92.0,99.2,86.0,99.2,100.0,83.5,98.78,90.56,93.1,97.02,95.69,88.6,93.47,65.64,95.0,88.96,88.77,71.96,100.0,100.0,98.96,100.0,50.15,71.15,82.38,90.64,61.33,94.32,98.44,95.31,100.0,91.96,86.4,89.2,97.34,92.4,100.0,88.15,98.29,94.84,27.15,98.46,84.65],[190.0,172.5,199.8,195.0,176.3,197.2,163.2,182.0,146.9,191.1,208.3,173.3,148.7,180.9,33.4,126.0,178.7,216.3,34.3,214.4,194.5,198.3,196.9,203.0,206.7,216.0,191.7,33.7,219.7,180.5,197.4,171.7,187.5,207.1,179.8,205.3,200.9,192.5,216.0,214.8,194.0,205.0,136.0,202.3,205.1,197.7,93.1,200.0,200.0,218.2,214.2,122.2,180.0,161.7,179.9,133.4,211.2,213.8,207.6,220.9,203.1,183.0,194.0,209.5,198.0,205.0,200.4,201.0,210.8,66.8,214.2,177.7],[97.0,94.0,98.0,99.0,97.0,99.0,82.0,97.0,95.0,98.0,100.0,95.0,95.0,95.0,38.0,100.0,85.0,98.0,100.0,96.0,96.0,93.0,94.0,99.0,97.0,100.0,95.0,100.0,100.0,97.0,99.0,87.0,100.0,100.0,86.0,99.0,91.0,97.0,97.0,96.0,90.0,94.0,78.0,96.0,90.0,90.0,75.0,100.0,100.0,98.0,100.0,89.0,76.0,82.0,98.0,71.0,100.0,100.0,99.0,100.0,92.0,87.0,89.0,97.0,92.0,100.0,88.0,98.0,96.0,28.0,98.0,96.0],[3572.0,3402.0,3962.0,2390.8,2172.6,3097.5,2005.4,2290.8,2775.0,3138.2,3485.0,1520.0,1256.0,1472.0,481.4,441.0,2814.7,3109.0,551.5,3956.7,3834.3,3899.5,3722.6,2351.6,2203.0,2404.0,2273.4,302.1,2074.0,1911.0,2845.4,2048.6,2300.8,2378.8,2028.6,3478.3,4545.8,3321.5,3845.3,3630.1,1967.0,2023.0,1475.0,1893.0,1978.0,1892.0,1293.8,800.0,800.0,3519.3,2659.3,1649.9,1761.6,2549.8,1951.0,1490.1,2309.2,4540.9,3631.1,3776.6,2175.0,1777.6,1797.4,1953.7,1786.3,1874.7,3897.9,3566.4,2847.0,923.6,4424.6,0.0],[18.8,19.72,19.83,12.26,12.32,15.71,12.29,12.59,18.89,16.42,16.73,8.77,8.45,8.14,14.41,3.5,15.75,14.37,16.08,18.45,19.71,19.66,18.91,11.58,10.66,11.13,11.86,8.96,9.44,10.59,14.41,11.93,12.27,11.49,11.28,16.94,22.63,17.25,17.8,16.9,10.14,9.87,10.85,9.36,9.64,9.57,13.9,4.0,4.0,16.13,12.41,13.5,9.79,15.77,10.85,11.17,10.93,21.24,17.49,17.1,10.71,9.71,9.26,9.33,9.02,9.14,19.45,17.74,13.51,13.83,20.66,0.0],"000112113334445607000001111111211113333344444456671717111333444444001133",[[0,18],[1,1],[0,8],[1,1],[0,44]]],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area ISP","Area Dayung","Area Mekarsari","Area Ketapat","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"],"9":["14 FT","10 Ton","20 Ton","PC 200","30 Ton","-","5 KL","12 FT"]},"$M":[0,1,2,2,0,0,0,0,0,2,1]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["SKN",4],["WT ASA",1],["WT FBS",4],["WT PBT",1],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[66.0,132.0,47.0,31.0,14.0,44.0,18.0,13.0,41.0,50.0,59.0,92.0,84.0,77.0,62.0,84.0,78.0,85.0,83.0,90.0,55.0,96.0,76.0,94.0,67.0,65.0,105.0,0.0,57.0,67.0,74.0],[95.0,146.2,57.4,40.1,0.0,99.0,40.0,27.0,91.0,146.5,118.2,163.3,149.8,159.0,119.8,158.6,159.5,176.1,159.0,184.3,111.6,170.7,137.6,168.2,113.5,114.0,155.0,0.0,100.0,95.0,156.5],[70.79,73.3,24.84,45.87,14.76,90.63,100.0,95.31,86.67,97.69,85.88,100.0,93.71,68.59,72.76,97.76,84.17,94.87,94.0,92.0,74.41,95.71,95.47,83.91,84.58,74.02,98.57,0.0,100.0,99.0,87.88],[98.0,80.0,36.0,48.0,10.0,139.0,179.0,95.0,136.0,97.0,84.0,100.0,93.0,70.0,81.0,98.0,84.0,95.0,98.0,100.0,79.0,96.0,95.0,86.0,87.0,76.0,99.0,0.0,100.0,100.0,69.0]],"$M":[0,1,0,0,0,0]}}});
