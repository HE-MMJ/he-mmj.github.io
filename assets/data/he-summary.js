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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"26-11-2026 16:41","periode":"November 2026","lastDate":"2026-11-30"}},"unit":71,"wtUnit":31,"totalUnit":102,"hm":12645.2,"ma":90.7,"pa":92.5,"fuel":172693.0,"ratio":13.62,"penyiraman":1992,"belumUnit":4,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","GIP H1","GIP H2","JTU","SKN"],[6,33,16,11,5],[1142.0,5942.6,2684.6,1999.5,876.5],[92.8,93.2,91.1,85.3,81.5],[11066.0,79952.4,37461.7,28878.2,15334.7]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-06 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-06 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN"],[["GIP H2",16],["GIP H1",33],["JTU",11],["BDK",6],["SKN",5]],"00100111001011002234566224634566523536425662242623377888737888737378783","00011111222333450040000111141111111222223333336550101011122233333300112",[96.6,89.4,97.8,98.52,94.4,99.2,80.0,96.0,95.4,97.68,100.0,94.0,92.6,92.6,33.2,100.0,82.66,98.8,100.0,95.78,96.0,93.0,93.04,99.0,97.16,100.0,95.44,100.0,100.0,92.0,99.2,86.0,99.2,100.0,82.84,98.78,90.18,93.1,96.9,95.52,88.6,93.47,65.64,94.8,88.52,88.32,71.96,100.0,100.0,98.88,100.0,48.16,70.0,81.79,90.64,61.33,94.32,98.38,95.12,100.0,91.96,85.83,88.75,97.24,93.04,100.0,87.68,98.29,94.84,28.24,98.4],[190.0,172.5,199.8,195.0,176.3,197.2,163.2,182.0,146.9,191.1,208.3,173.3,148.7,180.9,33.4,126.0,170.7,208.9,25.7,205.8,194.5,198.3,196.9,194.5,198.0,207.0,191.7,25.2,211.2,180.5,197.4,171.7,187.5,198.6,170.3,205.3,191.6,192.5,208.0,205.6,194.0,205.0,136.0,193.3,195.4,188.4,93.1,200.0,200.0,201.0,206.1,112.6,170.0,160.3,179.9,133.4,211.2,205.4,198.7,220.9,203.1,174.0,184.0,201.5,183.0,196.4,192.3,201.0,210.8,66.8,205.6],[97.0,94.0,98.0,99.0,97.0,99.0,82.0,97.0,95.0,98.0,100.0,95.0,95.0,95.0,38.0,100.0,85.0,99.0,100.0,96.0,96.0,93.0,94.0,99.0,97.0,100.0,95.0,100.0,100.0,97.0,99.0,87.0,100.0,100.0,86.0,99.0,90.0,97.0,97.0,96.0,90.0,94.0,78.0,96.0,89.0,90.0,75.0,100.0,100.0,98.0,100.0,88.0,75.0,81.0,98.0,71.0,100.0,100.0,99.0,100.0,92.0,86.0,89.0,97.0,93.0,100.0,88.0,98.0,96.0,29.0,98.0],[3572.0,3402.0,3962.0,2390.8,2172.6,3097.5,2005.4,2290.8,2775.0,3138.2,3485.0,1520.0,1256.0,1472.0,481.4,441.0,2814.7,3109.0,551.5,3956.7,3834.3,3899.5,3722.6,2351.6,2203.0,2404.0,2273.4,302.1,2074.0,1911.0,2845.4,2048.6,2300.8,2378.8,2028.6,3478.3,4545.8,3321.5,3845.3,3630.1,1967.0,2023.0,1475.0,1893.0,1978.0,1892.0,1293.8,800.0,800.0,3248.8,2561.3,1505.1,1655.1,2549.8,1951.0,1490.1,2309.2,4349.2,3482.0,3776.6,2175.0,1777.6,1722.4,1879.2,1711.7,1800.1,3743.5,3566.4,2847.0,923.6,4254.2],[18.8,19.72,19.83,12.26,12.32,15.71,12.29,12.59,18.89,16.42,16.73,8.77,8.45,8.14,14.41,3.5,16.49,14.88,21.46,19.23,19.71,19.66,18.91,12.09,11.13,11.61,11.86,11.99,9.82,10.59,14.41,11.93,12.27,11.98,11.91,16.94,23.73,17.25,18.49,17.66,10.14,9.87,10.85,9.79,10.12,10.04,13.9,4.0,4.0,16.16,12.43,13.37,9.74,15.91,10.85,11.17,10.93,21.17,17.52,17.1,10.71,10.22,9.36,9.33,9.35,9.17,19.47,17.74,13.51,13.83,20.69],"00011211333444560700000111111121111333334444445667171711133344444400113",[[0,18],[1,1],[0,8],[1,1],[0,33],[1,1],[0,2],[1,1],[0,6]]],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area ISP","Area Dayung","Area Mekarsari","Area Ketapat","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"],"9":["14 FT","10 Ton","20 Ton","PC 200","30 Ton","-","5 KL","12 FT"]},"$M":[0,1,2,2,0,0,0,0,0,2,1]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["SKN",4],["WT ASA",1],["WT FBS",4],["WT PBT",1],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[66.0,132.0,47.0,31.0,0.0,44.0,18.0,13.0,41.0,50.0,59.0,92.0,84.0,77.0,62.0,84.0,78.0,85.0,83.0,90.0,55.0,96.0,76.0,94.0,67.0,65.0,105.0,0.0,57.0,67.0,74.0],[95.0,146.2,57.4,40.1,0.0,99.0,40.0,27.0,91.0,146.5,118.2,163.3,149.8,159.0,119.8,158.6,159.5,176.1,159.0,184.3,111.6,170.7,137.6,168.2,113.5,114.0,155.0,0.0,100.0,95.0,156.5],[70.79,72.08,24.84,45.87,0.0,90.63,100.0,95.31,86.67,97.69,85.88,100.0,93.71,71.33,72.57,97.67,84.17,95.33,94.0,92.0,74.41,95.71,95.47,87.79,84.58,74.02,98.57,0.0,100.0,99.0,87.88],[98.0,80.0,36.0,48.0,0.0,139.0,179.0,95.0,136.0,97.0,86.0,100.0,93.0,71.0,81.0,98.0,84.0,95.0,98.0,100.0,79.0,96.0,95.0,88.0,87.0,76.0,99.0,0.0,100.0,100.0,69.0]],"$M":[0,1,0,0,0,0]}}});
