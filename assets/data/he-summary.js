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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"28-11-2026 16:00","periode":"November 2026","lastDate":"2026-11-30"}},"unit":71,"wtUnit":31,"totalUnit":102,"hm":13356.1,"ma":90.9,"pa":92.6,"fuel":174845.9,"ratio":12.96,"penyiraman":2273,"belumUnit":6,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","GIP H1","GIP H2","JTU","SKN"],[6,33,16,11,5],[1208.7,6489.2,2684.6,2072.1,901.5],[92.9,93.5,91.1,85.7,81.4],[11513.8,80015.4,37461.7,30014.5,15840.5]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-06 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-06 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN"],[["GIP H2",16],["GIP H1",33],["JTU",11],["BDK",6],["SKN",5]],"00100111001011002234566224634566523536425662242623377888737888737378783","00011111222333450040000111141111111222223333336550101011122233333300112",[96.6,89.4,97.8,98.52,94.4,99.2,80.0,96.0,95.4,97.68,100.0,94.0,92.6,92.6,33.2,100.0,81.2,98.3,100.0,96.09,96.3,93.52,93.19,99.07,97.37,100.0,95.78,100.0,100.0,92.59,99.26,87.04,99.26,100.0,84.11,98.87,90.91,93.61,97.13,95.85,89.11,93.08,67.94,95.19,88.19,89.19,74.04,100.0,100.0,98.96,100.0,50.15,71.15,82.38,90.64,61.33,94.32,98.5,95.31,100.0,91.96,86.4,89.2,97.44,92.4,100.0,88.15,98.29,94.84,27.15,98.52],[190.0,172.5,199.8,195.0,176.3,197.2,163.2,182.0,146.9,191.1,208.3,173.3,148.7,180.9,33.4,126.0,182.3,224.7,42.7,223.1,212.5,216.0,213.6,211.0,215.6,224.0,210.9,41.9,228.7,199.0,215.4,191.2,206.0,214.1,189.8,221.2,210.3,208.6,222.4,223.7,211.0,214.0,154.0,211.0,211.6,207.0,99.9,216.0,216.0,218.2,214.2,122.2,180.0,161.7,179.9,133.4,211.2,222.8,207.6,220.9,203.1,183.0,194.0,217.5,198.0,213.1,200.4,201.0,210.8,66.8,222.5],[97.0,94.0,98.0,99.0,97.0,99.0,82.0,97.0,95.0,98.0,100.0,95.0,95.0,95.0,38.0,100.0,83.0,98.0,100.0,96.0,96.0,93.0,94.0,99.0,97.0,100.0,96.0,100.0,100.0,97.0,99.0,88.0,100.0,100.0,87.0,99.0,91.0,97.0,97.0,96.0,91.0,93.0,80.0,96.0,89.0,91.0,77.0,100.0,100.0,98.0,100.0,89.0,76.0,82.0,98.0,71.0,100.0,100.0,99.0,100.0,92.0,87.0,89.0,97.0,92.0,100.0,88.0,98.0,96.0,28.0,99.0],[3572.0,3402.0,3962.0,2390.8,2172.6,3097.5,2005.4,2290.8,2775.0,3138.2,3485.0,1520.0,1256.0,1472.0,481.4,441.0,2814.7,3109.0,551.5,3956.7,3834.3,3899.5,3722.6,2351.6,2203.0,2404.0,2273.4,302.1,2074.0,1911.0,2845.4,2048.6,2300.8,2378.8,2028.6,3478.3,4545.8,3321.5,3845.3,3630.1,1967.0,2023.0,1538.0,1893.0,1978.0,1892.0,1293.8,800.0,800.0,3519.3,2659.3,1649.9,1761.6,2549.8,1951.0,1490.1,2309.2,4716.6,3631.1,3776.6,2175.0,1777.6,1797.4,2028.3,1786.3,1949.2,3897.9,3566.4,2847.0,923.6,4605.6],[18.8,19.72,19.83,12.26,12.32,15.71,12.29,12.59,18.89,16.42,16.73,8.77,8.45,8.14,14.41,3.5,15.44,13.84,12.92,17.74,18.04,18.05,17.43,11.15,10.22,10.73,10.78,7.21,9.07,9.6,13.21,10.71,11.17,11.11,10.69,15.72,21.62,15.92,17.29,16.23,9.32,9.45,9.99,8.97,9.35,9.14,12.95,3.7,3.7,16.13,12.41,13.5,9.79,15.77,10.85,11.17,10.93,21.17,17.49,17.1,10.71,9.71,9.26,9.33,9.02,9.15,19.45,17.74,13.51,13.83,20.7],"00011211333444560700000111111121111333334444445667171711133344444400113","00000000000000000010000000010000000000000000000000100101000000000001000"],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area ISP","Area Dayung","Area Mekarsari","Area Ketapat","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"],"9":["14 FT","10 Ton","20 Ton","PC 200","30 Ton","-","5 KL","12 FT"],"10":[0,1]},"$M":[0,1,2,2,0,0,0,0,0,2,2]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["SKN",4],["WT ASA",1],["WT FBS",4],["WT PBT",1],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[66.0,132.0,47.0,31.0,14.0,86.0,32.0,24.0,75.0,81.0,59.0,95.0,84.0,77.0,62.0,84.0,78.0,85.0,83.0,90.0,55.0,96.0,76.0,94.0,67.0,65.0,105.0,0.0,85.0,124.0,121.0],[95.0,146.2,57.4,40.1,0.0,177.0,77.0,50.0,162.5,205.0,118.2,167.8,149.8,159.0,119.8,158.6,159.5,176.1,159.0,184.3,111.6,170.7,137.6,168.2,113.5,114.0,155.0,0.0,156.0,166.0,262.0],[70.79,75.43,29.8,50.38,14.76,93.91,100.0,96.59,87.33,98.37,85.88,100.0,93.71,66.05,74.03,97.84,85.49,95.06,93.98,92.21,74.41,95.71,95.47,83.91,85.73,74.02,98.57,0.0,100.0,95.5,94.44],[98.0,81.0,38.0,51.0,10.0,137.0,175.0,97.0,133.0,97.0,84.0,100.0,94.0,66.0,81.0,98.0,86.0,95.0,98.0,100.0,79.0,96.0,95.0,86.0,88.0,76.0,99.0,0.0,100.0,98.0,70.0]],"$M":[0,1,0,0,0,0]}}});
