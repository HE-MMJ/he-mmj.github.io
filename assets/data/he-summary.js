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
window.MMJ_DATA["he"] = window.MMJ_INFLATE({"$O":{"meta":{"$O":{"generated":"14-11-2026 10:34","periode":"November 2026","lastDate":"2026-11-30"}},"unit":69,"wtUnit":31,"totalUnit":100,"hm":5335.7,"ma":91.6,"pa":93.8,"fuel":54952.4,"ratio":10.32,"penyiraman":912,"belumUnit":21,"vendor":{"$D":["v","unit","hm","ma","fuel"],"$R":[["BDK","GIP H1","GIP H2","JTU","SKN"],[6,31,16,11,5],[484.0,2606.5,1014.4,821.3,409.5],[92.8,93.2,95.2,81.8,90.3],[3237.0,24413.4,12595.9,9197.4,5508.7]]},"rows":{"$D":["u","v","a","j","ma","hm","pa","fuel","ratio","cap","belum"],"$R":[["MG-01 GIP H2","MG-03 GIP H2","MG-04 GIP H2","VC-01 GIP H2","VC-02 GIP H2","VC-03 GIP H2","VC-04 GIP H2","VC-06 GIP H2","EX-01 GIP H2","EX-02 GIP H2","EX-03 GIP H2","DT-02 GIP H2","DT-03 GIP H2","DT-04 GIP H2","TRADO-02 GIP H2","FT-03 GIP H2","MG-01 GIP","MG-02 GIP","MG-07 GIP","MG-08 GIP","MG-09 GIP","MG-10 GIP","VC-01 GIP","VC-02 GIP","VC-03 GIP","VC-04 GIP","VC-07 GIP","VC-08 GIP","VC-10 GIP","VC-11 GIP","VC-12 GIP","VC-13 GIP","VC-14 GIP","EX-01 GIP","EX-02 GIP","EX-03 GIP","EX-04 GIP","EX-05 GIP","DT 11 GIP","DT 12 GIP","DT 13 GIP","DT 14 GIP","DT 15 GIP","DT 16 GIP","TRADO 01 GIP","FT- 01 GIP","FT- 02 GIP","MG-01 JTU","VC-01 JTU","MG-02 JTU","VC-02 JTU","MG-03 JTU","VC-03 JTU","VC-07 JTU","VC-08 JTU","EX-02 JTU","EX-04 JTU","EX-05 JTU","DT 08 BDK","DT 10 BDK","DT 11 BDK","DT 14 BDK","DT 15 BDK","DT 20 BDK","MG-01 SKN","MG-02 SKN","VC-01 SKN","VC-02 SKN","EX-01 SKN"],[["GIP H2",16],["GIP H1",31],["JTU",11],["BDK",6],["SKN",5]],"001001110010110022345522353455426465324552232526677888767888767678786","000111112223334500000011111111111222223333336550101011122233333300112",[95.56,100.0,100.0,100.0,100.0,97.78,66.67,100.0,96.11,100.0,100.0,85.56,83.33,100.0,98.89,100.0,95.49,98.45,95.03,97.73,90.09,85.91,100.0,98.18,100.0,89.64,100.0,100.0,100.0,77.27,99.09,100.0,100.0,98.6,69.71,88.33,99.21,100.0,76.82,93.0,74.44,100.0,90.0,87.5,86.0,100.0,100.0,100.0,100.0,43.1,27.78,80.82,76.6,97.2,84.22,100.0,90.0,100.0,90.91,99.09,70.0,100.0,96.67,100.0,94.8,97.36,88.89,70.6,100.0],[69.0,72.7,73.9,72.7,71.1,71.9,46.2,71.3,56.5,72.3,75.3,57.7,51.0,68.8,39.0,45.0,87.6,90.9,98.0,88.0,83.5,78.8,84.6,86.9,97.5,75.5,99.2,84.5,87.7,65.3,80.5,84.2,92.8,87.5,89.2,80.8,104.4,94.6,73.0,80.0,55.0,87.0,89.0,86.9,45.6,80.0,88.0,100.1,100.7,39.7,21.2,74.1,62.5,89.5,66.5,97.5,73.9,95.6,84.4,87.0,53.0,99.5,72.0,88.1,83.2,92.3,66.5,66.8,100.7],[96.0,100.0,100.0,100.0,100.0,98.0,68.0,100.0,96.0,100.0,100.0,88.0,85.0,100.0,99.0,100.0,95.0,98.0,95.0,98.0,90.0,88.0,100.0,98.0,100.0,90.0,100.0,100.0,100.0,79.0,100.0,100.0,100.0,98.0,87.0,97.0,99.0,100.0,80.0,93.0,81.0,100.0,90.0,89.0,87.0,100.0,100.0,98.0,100.0,93.0,28.0,82.0,100.0,100.0,100.0,100.0,100.0,99.0,91.0,99.0,70.0,100.0,97.0,100.0,95.0,97.0,89.0,72.0,100.0],[1190.0,1245.0,1320.0,791.0,753.0,992.5,547.8,765.2,895.0,1128.0,1055.0,448.0,408.0,512.0,395.4,150.0,1196.2,968.5,1162.3,1311.1,1153.1,1020.3,770.6,816.0,108.0,638.0,660.0,708.0,1229.0,563.2,765.2,780.2,763.8,1086.3,1439.4,950.7,607.4,1229.7,549.0,555.0,537.0,626.0,666.0,559.0,482.4,256.0,256.0,1074.5,840.4,488.5,138.4,839.6,644.9,750.3,668.1,1511.6,943.7,1297.4,568.6,519.4,551.2,543.5,503.7,550.6,1380.2,1242.9,758.8,835.2,1291.6],[17.25,17.13,17.86,10.88,10.59,13.8,11.86,10.73,15.84,15.6,14.01,7.76,8.0,7.44,10.14,3.33,13.66,10.65,11.86,14.9,13.81,12.95,9.11,9.39,1.11,8.45,6.65,8.38,14.01,8.62,9.51,9.27,8.23,12.41,16.14,11.77,5.82,13.0,7.52,6.94,9.76,7.2,7.48,6.43,10.58,3.2,2.91,10.73,8.35,12.3,6.53,11.33,10.32,8.38,10.05,15.5,12.77,13.57,6.74,5.97,10.4,5.46,7.0,6.25,16.59,13.47,11.41,12.5,12.83],"000112113334445607000011111121111333334444445667171711133344444400113","000000000000001011111111111111111111111101111111110111011111010111011"],"$S":{"2":["Area Mendis","Area B 80","Area Bintialo","Area Dayung","Area Mekarsari","Area Ketapat","Area ISP","Area Selaro","Area Pakerin"],"3":["Motor Grader","Compactor","Excavator","Dump Truck","","Fuel Truck","Trado"],"9":["14 FT","10 Ton","20 Ton","PC 200","30 Ton","-","5 KL","12 FT"],"10":[1,0]},"$M":[0,1,2,2,0,0,0,0,0,2,2]},"wt":{"$D":["u","v","p","hm","ma","pa"],"$R":[["WT SKN-01","WT SKN-02","WT SKN-03","WT SKN-04","WT ASA-01","WT FBS-02","WT FBS-03","WT FBS-04","WT FBS-05","WT PBT-01","WT 01 TJP","WT 02 TJP","WT 03 TJP","WT 04 TJP","WT 05 TJP","WT 06 TJP","WT 09 TJP","WT 10 TJP","WT 11 TJP","WT 12 TJP","WT 13 TJP","WT-18 TJP","WT-19 TJP","WT-22 TJP","WT-23 TJP","WT-24 TJP","WT-25 TJP","WT TLK-01","WT TSA-01","WT TSA-02","WT TSA-03"],[["SKN",4],["WT ASA",1],["WT FBS",4],["WT PBT",1],["WT TJP",17],["WT TLK",1],["WT TSA",3]],[37.0,50.0,26.0,4.0,63.0,18.0,7.0,3.0,12.0,77.0,33.0,42.0,43.0,25.0,15.0,44.0,37.0,43.0,13.0,15.0,3.0,0.0,0.0,20.0,20.0,14.0,17.0,0.0,77.0,77.0,77.0],[28.9,58.4,30.3,6.4,0.0,44.5,15.0,6.0,24.0,0.0,54.6,71.4,84.3,50.2,27.0,79.0,86.5,96.6,30.0,36.8,8.5,0.0,0.0,35.2,33.2,27.5,25.3,0.0,0.0,0.0,0.0],[97.5,75.0,16.67,22.5,0.0,100.0,100.0,100.0,80.0,0.0,93.75,100.0,99.26,100.0,53.33,98.15,100.0,100.0,92.71,100.0,25.0,0.0,0.0,81.77,92.71,62.5,100.0,0.0,0.0,0.0,0.0],[99.0,81.0,42.0,27.0,0.0,147.0,182.0,100.0,140.0,0.0,94.0,100.0,99.0,100.0,70.0,98.0,100.0,100.0,93.0,100.0,29.0,0.0,0.0,82.0,90.0,63.0,100.0,0.0,0.0,0.0,0.0]],"$M":[0,1,0,0,0,0]}}});
