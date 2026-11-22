/* assets/js/tab/cmp.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){

/* ---------- Mesin hitung Coal Achievement vs Loss Time ----------
   Satu menit hanya boleh dihitung satu kali:
   - semua kejadian pada route yang digabung diletakkan di satu garis waktu per hari operasional (06.00-06.00);
   - bobot menit itu = bobot kejadian TERBESAR yang aktif (bobot = Convert Duration / (To - From), maks 1), tidak dijumlah;
   - pembagian MMJ / Bukan MMJ mengikuti prioritas R > S > T > SI > D > lainnya, jumlahnya tetap = bobot terbesar.
   Maka: route terbesar <= gabungan <= jumlah route, dan gabungan <= 24 jam per hari. */
function cmpEngine(H, L){
  const MMJ = new Set(["T","WB","A","E","M","D"]), PRI = {R:0, S:1, T:2, SI:3, D:4}, DAY0 = 360, DAY1 = 1800;
  const pad = n => String(n).padStart(2,"0"), add = (a,b) => a+b;
  const iso = (y,m,d) => `${y}-${pad(m)}-${pad(d)}`, dim = (y,m) => new Date(y,m,0).getDate();
  const next = d => new Date(Date.parse(d+"T00:00:00Z")+864e5).toISOString().slice(0,10);
  const mins = s => { const m=/^(\d{1,2}):(\d{2})/.exec(s||""); if(!m) return null; const v=+m[1]*60 + +m[2]; return v<DAY0 ? v+1440 : v; };

  // keputusan user: Jan-Jun 2026 ISP diabaikan karena sudah termasuk di H1 & H2; dipakai mulai Juli
  const ISP_FROM = "2026-07", active = (r,d) => r!=="ISP" || d.slice(0,7)>=ISP_FROM;
  const byDay = new Map(), put = e => { if(!byDay.has(e.d)) byDay.set(e.d,[]); byDay.get(e.d).push(e); };
  const seen = new Map(), noTime = [];
  L.stop.forEach(s => {
    if(!(s.h>0)) return;
    const a = mins(s.f); let b = mins(s.t);
    const base = {d:s.d, r:s.r, c:s.c, h:s.h};
    if(a==null || b==null){ put({...base, a:null}); noTime.push(s); return; }
    if(b<=a) b += 1440;
    const k = [s.d, s.r, a, b, s.c, s.h.toFixed(3), (s.desc||"").trim().toLowerCase()].join("|");
    if(!seen.has(k)) seen.set(k,[]);
    seen.get(k).push(s);
    const w = Math.min(1, s.h/((b-a)/60));
    put({...base, a, b:Math.min(b,DAY1), w});
    if(b>DAY1) put({...base, d:next(s.d), h:0, a:DAY0, b:b-1440, w});   // lewat 06.00 = milik hari berikutnya
  });

  function union(list){
    let mmj=0, non=0;
    const ev = list.filter(e => e.a!=null).sort((x,y) => (PRI[x.c]??5)-(PRI[y.c]??5) || y.w-x.w);
    const pts = [...new Set(ev.flatMap(e => [e.a,e.b]))].sort((x,y) => x-y);
    for(let i=0; i<pts.length-1; i++){
      const x=pts[i], y=pts[i+1]; let used=0;
      for(const e of ev){ if(e.a>x || e.b<y || e.w<=used) continue;
        const v=(e.w-used)*(y-x)/60; if(MMJ.has(e.c)) mmj+=v; else non+=v;
        used=e.w; }
    }
    // tanpa jam From/To: tumpang tindih tidak bisa diperiksa, jadi tidak ditambahkan di atas jam yang sudah ada
    list.filter(e => e.a==null).forEach(e => { const v=Math.min(24,e.h)-(mmj+non); if(v>0){ if(MMJ.has(e.c)) mmj+=v; else non+=v; } });
    return {t:mmj+non, mmj, non};
  }
  function lossDay(d, routes){
    const ev = (byDay.get(d)||[]).filter(e => routes.includes(e.r) && active(e.r,d)), all = union(ev);
    const raw = routes.map(r => active(r,d) ? ev.filter(e => e.r===r).map(e => e.h).reduce(add,0) : null);   // null = route tidak dipakai, bukan 0 jam
    const net = routes.map(r => union(ev.filter(e => e.r===r)).t);
    return {...all, raw, inR:raw.reduce(add,0)-net.reduce(add,0), xR:net.reduce(add,0)-all.t};
  }
  function total(ds, routes){
    const o = {t:0, mmj:0, non:0, inR:0, xR:0, raw:routes.map(()=>null)};
    ds.forEach(x => { ["t","mmj","non","inR","xR"].forEach(k => o[k]+=x[k]); x.raw.forEach((v,i) => { if(v!=null) o.raw[i]=(o.raw[i]||0)+v; }); });
    return o;
  }

  const Y=H.meta.year, MO=H.meta.month, DIM=H.meta.daysInMonth, A=H.annual, M=H.mitra;
  // RAIN FALL bisa berisi tanggal lebih maju daripada data stop hauling, jadi tidak dipakai sebagai batas data
  const ltLast = [...L.stop.map(s=>s.d), ...L.rain.filter(r=>r.no!=="RAIN FALL").map(r=>r.d)].reduce((a,b) => a>b?a:b, "");
  const files = new Set(L.meta.files.map(f => f.ym));
  const DEF = [
    {id:"h1",  base:"H1", run:"H1",  st:"st1",  routes:["H1","ISP"], prod:"H1",    loss:"H1 + ISP"},
    {id:"h02", base:"H2", run:"H02", st:"st02", routes:["ISP","H2"], prod:"H0+H2", loss:"ISP + H2"},
  ];
  const pairs = DEF.map(p => {
    const run = new Array(DIM).fill(0), RK = H.rkap[p.run] || {};
    H.run[p.run].facts.forEach(f => run[f[0]] += f[5]);
    const prodLast = run.reduce((z,v,i) => v>0 ? i+1 : z, 0);
    const curYm = `${Y}-${pad(MO)}`;
    const ltDay = !files.has(curYm) || ltLast.slice(0,7)<curYm ? 0 : ltLast.slice(0,7)>curYm ? DIM : +ltLast.slice(8);
    const cut = Math.min(prodLast, ltDay);
    const rk = k => M.map(c => (RK[c]||[])[k]||0).reduce(add,0);

    const days = [...Array(Math.max(prodLast,ltDay)).keys()].map(i => {
      const tg = rk(MO-1)/DIM, ton = i<prodLast ? run[i] : null, lt = i<ltDay ? lossDay(iso(Y,MO,i+1),p.routes) : null;
      return {i, d:i+1, n:1, ton, tg, ach:ton!=null && tg ? ton/tg*100 : null, lt, ok:i<cut};
    });
    const months = [...Array(MO).keys()].map(k => {
      const n=dim(Y,k+1), cur=k===MO-1, st=A[p.st][k], ym=`${Y}-${pad(k+1)}`;
      let ton=null;
      if(st==="run") ton = run.slice(0,cut).reduce(add,0);
      else if(st==="wb") ton = M.map(c => A.WB[c][k]).reduce(add,0);
      else if(st==="ba" || st==="unsplit") ton = M.map(c => p.run==="H1" ? A.H1[c][k] : A.H0[c][k]+A.H2[c][k]).reduce(add,0);
      const part = cur && st==="run", use = part ? cut : n;                 // produksi & loss time: rentang tanggal sama
      const has = use>0 && files.has(ym) && iso(Y,k+1,use)<=ltLast;
      const lt = has ? total([...Array(use).keys()].map(i => lossDay(iso(Y,k+1,i+1),p.routes)), p.routes) : null;
      if(part && !cut) ton=null;
      const tg = rk(k)*use/n;
      return {i:k, k, n:use, routes:p.routes.filter(r => active(r,ym)), part, st, ton, tg, ach:ton!=null && tg ? ton/tg*100 : null, lt, ok:ton!=null && !!lt};
    });
    const sumUp = list => {
      const v=list.filter(x => x.ok), n=v.map(x=>x.n).reduce(add,0), ton=v.map(x=>x.ton).reduce(add,0), tg=v.map(x=>x.tg).reduce(add,0);
      return {n, ton, tg, ach:tg?ton/tg*100:null, lt:total(v.map(x=>x.lt),p.routes), count:v.length};
    };
    // korelasi: capaian % lawan rata-rata jam loss time per hari
    const corr = list => {
      const v=list.filter(x => x.ok && x.ach!=null); if(v.length<3) return null;
      const X=v.map(x=>x.lt.t/x.n), Z=v.map(x=>x.ach), mx=X.reduce(add,0)/v.length, mz=Z.reduce(add,0)/v.length;
      let a=0,b=0,c=0; X.forEach((x,i) => { a+=(x-mx)*(Z[i]-mz); b+=(x-mx)**2; c+=(Z[i]-mz)**2; });
      return b&&c ? {r:a/Math.sqrt(b*c), n:v.length} : null;
    };
    return {...p, days, months, sumUp, corr, cut, prodLast, ltDay, mtd:sumUp(days), ytd:sumUp(months), rDay:corr(days), rMon:corr(months)};
  });
  return {Y, MO, DIM, ltLast, pairs, dup:[...seen.values()].filter(v => v.length>1), noTime};
}
const BLN=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"], BLNF=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const NF=d=>new Intl.NumberFormat("id-ID",{minimumFractionDigits:d,maximumFractionDigits:d}), nf0=NF(0), nf1=NF(1), nf2=NF(2);
const fmt=v=>v==null?"–":nf0.format(v), jam=v=>v==null?"–":nf2.format(Math.abs(v)<.005?0:v), pct=v=>v==null?"–":nf1.format(v)+"%";
const compact=v=>v>=1e6?nf2.format(v/1e6)+"jt":v>=1e3?nf1.format(v/1e3)+"rb":nf0.format(v);
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const $=id=>document.getElementById(id), getD=k=>typeof window.mmjData==="function"?window.mmjData(k):null;
const H=getD("haul"), L=getD("lt"), R=H&&L?cmpEngine(H,L):null;

function applyTheme(t){ if(t==="dark") document.documentElement.setAttribute("data-theme","dark"); else document.documentElement.removeAttribute("data-theme"); $("cTheme").textContent="Tema: "+(t==="dark"?"gelap":"terang"); }
let theme="light"; try{ theme=localStorage.getItem("mmjTheme")||localStorage.getItem("dashTheme3")||"light"; }catch(e){} applyTheme(theme);
$("cTheme").onclick=()=>{ theme=theme==="dark"?"light":"dark"; applyTheme(theme); try{ localStorage.setItem("mmjTheme",theme); }catch(e){} };
if($("cPdf")) $("cPdf").onclick=()=>{ const dk=theme==="dark"; if(dk) applyTheme("light"); const done=()=>{ if(dk) applyTheme("dark"); removeEventListener("afterprint",done); }; addEventListener("afterprint",done); setTimeout(()=>print(),100); };
const navL=[...document.querySelectorAll("#cnav a")];
addEventListener("scroll",()=>{ let k=0; navL.forEach((a,i)=>{ const s=document.querySelector(a.getAttribute("href")); if(s&&s.getBoundingClientRect().top<$("cLock").offsetHeight+120) k=i; }); navL.forEach((a,i)=>a.classList.toggle("on",i===k)); },{passive:true});

const tipEl=$("etip"), hide=()=>{ tipEl.style.display="none"; };
function tip(e,h){ tipEl.innerHTML=h; tipEl.style.display="block"; const w=tipEl.offsetWidth,hh=tipEl.offsetHeight; let x=e.clientX+14,y=e.clientY+14; if(x+w>innerWidth-8) x=e.clientX-w-14; if(y+hh>innerHeight-8) y=e.clientY-hh-14; tipEl.style.left=Math.max(8,x)+"px"; tipEl.style.top=Math.max(8,y)+"px"; }

const achTxt=v=>v==null?"–":`<b class="${v>=100?"up":"down"}">${v>=100?"▲":"▼"} ${pct(v)}</b>`;
const rWord=c=>{ if(!c) return "data belum cukup"; const a=Math.abs(c.r); if(a<.3) return "hubungan lemah / tidak terlihat";
  return c.r<0 ? `hubungan ${a>=.6?"kuat":"sedang"}: loss time naik, capaian cenderung turun` : "searah: naik-turun capaian tidak dijelaskan oleh loss time (ada faktor lain)"; };

/* Dua panel satu sumbu waktu (bukan dua sumbu Y): produksi di atas, loss time di bawah */
function drawPair(el,p,list,mode){
  if(!list.length){ el.innerHTML='<div class="empty">Belum ada data</div>'; return; }
  const day=mode==="d", ml=52, mr=10;
  const W=Math.round(Math.max(el.clientWidth||900, ml+mr+list.length*(day?(innerWidth<700?45:36):62))), band=(W-ml-mr)/list.length, bw=Math.min(band*.64,46), cx=i=>ml+band*(i+.5);
  const xLab=x=>day?String(x.d):BLN[x.k]+(x.part?` 1–${x.n}`:"");
  const step=m=>{ const s=m/3, q=Math.pow(10,Math.floor(Math.log10(s))), r=s/q; return (r>5?10:r>2.5?5:r>2?2.5:r>1?2:1)*q; };
  function panel(max,h,f){ const st=step(max||1), top=Math.ceil((max||1)/st)*st, y=v=>18+h-v/top*h; let g="";
    for(let v=0;v<=top+1e-6;v+=st) g+=`<line x1="${ml}" x2="${W-mr}" y1="${y(v)}" y2="${y(v)}" stroke="${v?"var(--grid)":"var(--axis)"}"/><text x="${ml-7}" y="${y(v)+4}" text-anchor="end">${f(v)}</text>`;
    return {g,y}; }
  const val=(i,y,t)=>`<text class="dl" x="${cx(i)}" y="${y}" text-anchor="middle">${t}</text>`;
  const hit=(i,h)=>`<rect class="hit" data-i="${i}" x="${ml+band*i}" y="0" width="${band}" height="${h}" fill="transparent"/>`;

  const h1=170, A=panel(Math.max(...list.map(x=>Math.max(x.ton||0,x.tg)))*1.08,h1,v=>v?compact(v).replace(/,(\d*?)0+(?=\D)/,(m,d)=>d?","+d:""):"0"); let a=A.g;
  list.forEach((x,i)=>{
    if(x.ton!=null){ const y=A.y(x.ton); a+=`<rect x="${cx(i)-bw/2}" y="${y}" width="${bw}" height="${Math.max(A.y(0)-y,.5)}" rx="3" fill="var(--prod)" ${x.ok?"":'opacity=".4"'}/>`; }
    if(x.tg) a+=`<line x1="${cx(i)-bw/2-3}" x2="${cx(i)+bw/2+3}" y1="${A.y(x.tg)}" y2="${A.y(x.tg)}" stroke="var(--ink)" stroke-width="2"/>`;
    if(x.ton!=null){ let y=A.y(x.ton)-5; const t=A.y(x.tg); if(x.tg && t<=y+3 && t>=y-11) y=t-5; a+=val(i,y,compact(x.ton)); }
    else a+=`<text x="${cx(i)}" y="${A.y(0)-6}" text-anchor="middle">belum</text>`;
    a+=`<text class="ach ${x.ach==null?"":x.ach>=100?"up":"down"}" x="${cx(i)}" y="${h1+38}" text-anchor="middle">${pct(x.ach)}</text>`+hit(i,h1+46);
  });
  a+=`<text x="${ml-7}" y="${h1+38}" text-anchor="end">Capaian</text>`;

  const h2=125, hB=h2+(day?44:56), B=panel(Math.max(1,...list.map(x=>x.lt?x.lt.t:0))*1.12,h2,v=>String(+v.toFixed(1)).replace(".",",")); let b=B.g;
  list.forEach((x,i)=>{
    if(x.lt){ let acc=0;
      [["mmj","var(--mmj)"],["non","var(--non)"]].forEach(([k,c])=>{ const v=x.lt[k]; if(v<=1e-9) return; const y0=B.y(acc), y1=B.y(acc+v); acc+=v;
        b+=`<rect x="${cx(i)-bw/2}" y="${y1}" width="${bw}" height="${Math.max(y0-y1-(acc>v?1.5:0),.5)}" rx="2" fill="${c}" ${x.ok?"":'opacity=".4"'}/>`; });
      b+=val(i,B.y(x.lt.t)-5,nf1.format(x.lt.t));
    } else b+=`<text x="${cx(i)}" y="${B.y(0)-6}" text-anchor="middle">belum</text>`;
    b+=`<text class="xl" x="${cx(i)}" y="${h2+36}" text-anchor="middle">${xLab(x)}</text>`
      +(day?"":`<text x="${cx(i)}" y="${h2+49}" text-anchor="middle" style="font-size:9px">${x.routes.length>1?p.loss:x.routes[0]+" saja"}</text>`)+hit(i,hB);
  });

  el.innerHTML=`<div class="pl" style="width:${W}px"><div class="pt">Produksi ${p.prod} (ton)</div><svg viewBox="0 0 ${W} ${h1+46}" width="${W}" height="${h1+46}" role="img" aria-label="Produksi ${p.prod} ${day?"harian":"bulanan"}; rincian ada di tabel">${a}</svg>`
    +`<div class="pt">${day?`Loss time gabungan ${p.loss}`:"Loss time per bulan"} (jam)</div><svg viewBox="0 0 ${W} ${hB}" width="${W}" height="${hB}" role="img" aria-label="Loss time ${p.loss} ${day?"harian":"bulanan"}; rincian ada di tabel">${b}</svg></div>`;
  el.querySelectorAll(".hit").forEach(r=>{ const x=list[+r.dataset.i], l=x.lt;
    const h=`<b>${day?`${x.d} ${BLNF[R.MO-1]} ${R.Y}`:`${BLNF[x.k]} ${R.Y}${x.part?` (1–${x.n})`:""}`}</b><br>Produksi ${p.prod}: <b>${fmt(x.ton)} t</b><br>Target RKAP: ${fmt(x.tg)} t · capaian ${pct(x.ach)}`
      +(l?`<hr>${p.routes.map((rt,j)=>l.raw[j]==null?`${rt}: sudah termasuk di ${p.base}`:`${rt} tercatat: ${jam(l.raw[j])} jam`).join("<br>")}<br>Jam dobel dibuang: ${jam(l.inR+l.xR)} jam<br>Gabungan: <b>${jam(l.t)} jam</b><br>MMJ ${jam(l.mmj)} · Bukan MMJ ${jam(l.non)}`:"<hr>Loss time belum ada data")
      +(x.ok?"":"<br><i>Belum lengkap, tidak masuk total perbandingan</i>");
    const mark=on=>el.querySelectorAll(`.hit[data-i="${r.dataset.i}"]`).forEach(z=>z.classList.toggle("hot",on));
    r.onmousemove=e=>{ mark(true); tip(e,h); }; r.onclick=e=>tip(e,h); r.onmouseleave=()=>{ mark(false); hide(); }; });
  if(day) el.scrollLeft=el.scrollWidth;                                  // di HP: tanggal terbaru langsung terlihat
}

const OPEN=new Set();                                                  // tabel yang dibuka tetap terbuka saat ganti filter
function table(p,list,tot,mode){
  const day=mode==="d", [r1,r2]=p.routes;
  const cells=(x,l)=>`<td class="r">${fmt(x.ton)}</td><td class="r">${fmt(x.tg)}</td><td class="r">${achTxt(x.ach)}</td>`
    +(l?`<td class="r">${jam(l.raw[0])}</td><td class="r">${jam(l.raw[1])}</td><td class="r">${jam(l.inR)}</td><td class="r">${jam(l.xR)}</td><td class="r"><b>${jam(l.t)}</b></td><td class="r">${jam(l.mmj)}</td><td class="r">${jam(l.non)}</td><td class="r">${pct(l.t/(24*x.n)*100)}</td>`:'<td colspan="8">Loss time belum ada data</td>');
  return `<details class="dt" data-k="${mode}" ${OPEN.has(mode)?"open":""}><summary>Tabel &amp; pembuktian tanpa jam dobel (${day?"harian":"bulanan"})</summary><div class="tw"><table><thead>
    <tr><th rowspan="2">${day?"Tanggal":"Bulan"}</th><th colspan="3" class="mid">Produksi ${p.prod} (ton)</th><th colspan="2" class="mid">Tercatat (jam)</th><th colspan="2" class="mid">Dikurangi jam dobel</th><th colspan="4" class="mid">Loss time gabungan</th></tr>
    <tr>${["Aktual","Target","Capaian",r1,r2,"Dalam route","Antar route","Total","MMJ","Bukan MMJ","% waktu"].map(t=>`<th class="r">${t}</th>`).join("")}</tr></thead><tbody>`
    +list.map(x=>`<tr class="${x.ok?"":"off"}"><td>${day?`${x.d} ${BLN[R.MO-1]}`:BLN[x.k]+(x.part?` 1–${x.n}`:"")}${x.ok?"":" *"}</td>${cells(x,x.lt)}</tr>`).join("")
    +`</tbody><tfoot><tr><td>Total</td>${tot.count?cells(tot,tot.lt):'<td colspan="11">Belum ada data</td>'}</tr></tfoot></table></div>`
    +`<p class="cap">Total = ${r1} + ${r2} − dobel dalam route − dobel antar route.${day?"":` Jan–Jun hanya ${p.base} (ISP sudah termasuk, ditandai –); kolom ISP mulai Juli.`}${list.some(x=>!x.ok)?" * Data belum lengkap, tidak masuk total.":""}</p></details>`;
}

/* periode: SEL null = Semua (per bulan) · {a,z} = tanggal a s/d z bulan berjalan (per hari) */
let CUR=null, SEL=null;
const span=(a,z)=>(a===z?`${a}`:`${a}–${z}`)+` ${BLN[R.MO-1]}`;
function viewOf(p){
  if(!SEL) return {mode:"m", list:p.months, tot:p.ytd, c:p.rMon};
  const list=p.days.filter(x=>x.d>=SEL.a&&x.d<=SEL.z), ok=list.filter(x=>x.ok);
  return {mode:"d", list, ok, tot:p.sumUp(list), c:ok.length>=7?p.corr(list):null};      // korelasi di bawah 7 hari menyesatkan
}

function summary(p,v){
  const row=(n,t)=>t.count?`<tr><td>${n}</td><td class="r"><b>${fmt(t.ton)}</b></td><td class="r">${fmt(t.tg)}</td><td class="r">${achTxt(t.ach)}</td><td class="r"><b>${jam(t.lt.t)}</b></td><td class="r">${pct(t.n?t.lt.t/(24*t.n)*100:null)}</td></tr>`
    :`<tr><td>${n}</td><td colspan="5">Data produksi / loss time belum lengkap</td></tr>`;
  let rows, note;
  if(v.mode==="m"){
    rows=row(`${BLN[R.MO-1]} 1–${p.cut}`,p.mtd)+row("Tahun berjalan",p.ytd);
    note=`Jan–Jun: loss time ${p.base} saja (ISP sudah termasuk) · mulai Juli: ${p.loss}`;
  }else{
    const o=v.ok, all=o.length&&o.length===p.cut;                  // pilihan sudah mencakup seluruh bulan berjalan
    rows=row(o.length?span(o[0].d,o[o.length-1].d):span(SEL.a,SEL.z),v.tot)+(all?"":row(`${BLN[R.MO-1]} 1–${p.cut} (pembanding)`,p.mtd));
    note=`Periode dipilih: ${span(SEL.a,SEL.z)} ${R.Y}${SEL.z>p.cut?` · data lengkap baru s/d tanggal ${p.cut}`:""}`;
  }
  return `<div class="card"><div class="ch"><div><h2>Produksi ${p.prod} vs loss time ${p.loss}</h2><p>${note}</p></div></div>
    <div class="tw"><table><thead><tr><th>Periode</th><th class="r">Produksi (t)</th><th class="r">Target (t)</th><th class="r">Capaian</th><th class="r">Loss time (jam)</th><th class="r">% waktu</th></tr></thead><tbody>
    ${rows}</tbody></table></div></div>`;
}

function section(p,v){
  const day=v.mode==="d";
  const title=day?`Per hari · ${span(SEL.a,SEL.z)} ${R.Y}`:`Per bulan ${R.Y}`;
  const sub=day?`Target harian = RKAP bulan ÷ ${R.DIM} hari${p.prodLast!==p.ltDay&&SEL.z>p.cut?` · produksi terisi s/d tanggal ${p.prodLast}, loss time s/d tanggal ${p.ltDay}`:""}`
    :`Bulan selesai = sebulan penuh · ${BLNF[R.MO-1]} = tanggal 1–${p.cut}, target pro rata`;
  const leg='<div class="legend"><span><i style="background:var(--prod)"></i>Produksi</span><span><i class="tl"></i>Target RKAP</span><span><i style="background:var(--mmj)"></i>Loss time MMJ</span><span><i style="background:var(--non)"></i>Bukan MMJ</span></div>';
  return `<section class="grid" style="margin-top:16px"><div class="card c12" id="cv-main"><div class="ch"><div><h2>${title}</h2><p>${sub}</p></div>${v.c?`<span class="rel">r = ${nf2.format(v.c.r)} · ${rWord(v.c)}</span>`:""}</div>${leg}<div class="plot" id="cPlot"></div>${table(p,v.list,v.tot,v.mode)}</div></section>`;
}

function render(){
  hide();
  const v=viewOf(CUR); drawPair($("cPlot"),CUR,v.list,v.mode);
}

function tickItems(p,v){
  const day=v.mode==="d", mon=BLN[R.MO-1];
  const top=(day?v.ok:p.months.filter(x=>x.ok)).slice().sort((a,b)=>b.lt.t-a.lt.t)[0];
  return [
    !day&&p.mtd.count?{ic:"route",tone:p.mtd.ach>=100?"good":"bad",tag:p.prod,html:`Capaian 1–${p.cut} ${mon} <b>${pct(p.mtd.ach)}</b> · loss time ${p.loss} <b>${jam(p.mtd.lt.t)} jam</b>`}:null,
    !day&&p.ytd.count?{ic:"route",tone:p.ytd.ach>=100?"good":"bad",tag:"Tahun berjalan",html:`Capaian <b>${pct(p.ytd.ach)}</b> · loss time <b>${jam(p.ytd.lt.t)} jam</b>`}:null,
    day&&v.ok.length?{ic:"route",tone:v.tot.ach>=100?"good":"bad",tag:p.prod,html:`Capaian ${span(v.ok[0].d,v.ok[v.ok.length-1].d)} <b>${pct(v.tot.ach)}</b> · loss time ${p.loss} <b>${jam(v.tot.lt.t)} jam</b>`}:null,
    top?{ic:"clock",tone:"warn",tag:"Loss time tertinggi",html:`<b>${day?`Tanggal ${top.d} ${mon}`:BLNF[top.k]}</b>: ${jam(top.lt.t)} jam · capaian ${pct(top.ach)}`}:null,
    p.prodLast!==p.ltDay&&(!day||SEL.z>p.cut)?{ic:"clock",tone:"info",tag:"Batas data",html:`${p.prod} dibandingkan s/d tanggal <b>${p.cut}</b>`}:null];
}

/* satu pintu untuk semua perubahan filter (pasangan & periode) */
function show(){
  const p=CUR, v=viewOf(p), y=window.scrollY;
  $("cPair").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===p.id));
  $("cBody").querySelectorAll("details[data-k]").forEach(d=>{ if(d.open) OPEN.add(d.dataset.k); else OPEN.delete(d.dataset.k); });
  $("cSub").textContent=`${BLNF[R.MO-1]} ${R.Y} berjalan · produksi ${p.prod} s/d tgl ${p.prodLast} · loss time s/d ${+R.ltLast.slice(8)} ${BLN[+R.ltLast.slice(5,7)-1]}`;
  $("cNavView").textContent=v.mode==="d"?"Per hari":"Per bulan";
  $("cSum").innerHTML=summary(p,v);
  $("cBody").innerHTML=section(p,v);
  tickerRender($("ticker"),tickItems(p,v));
  drawRP();
  render();
  window.scrollTo(0,y);                                                 // posisi baca tetap saat ganti filter
}
function setPair(id){ CUR=R.pairs.find(p=>p.id===id)||R.pairs[0]; show(); }

/* ---------- kalender (gaya sama dengan Coal Hauling) ----------
   Klik satu tanggal = langsung tampil hari itu; klik tanggal kedua = rentang. */
const RP={open:false, a:null};
const lastDay=()=>Math.max(0,...R.pairs.map(p=>p.days.length));
function paintRP(to){
  let a=SEL?SEL.a:null, z=SEL?SEL.z:null;
  if(RP.a!=null&&to){ a=Math.min(RP.a,to); z=Math.max(RP.a,to); }
  $("rpPop").querySelectorAll(".rpd").forEach(b=>{ const d=+b.dataset.d;
    b.classList.toggle("in",a!=null&&d>a&&d<z); b.classList.toggle("end",d===a||d===z); });
}
function closeRP(){ RP.open=false; RP.a=null; drawRP(); }
function drawRP(){
  const pop=$("rpPop");
  $("rpTxt").innerHTML=SEL?`${span(SEL.a,SEL.z)}<span class="rpm2"> · per hari</span>`:'Semua<span class="rpm2"> · per bulan</span>';
  $("rp").classList.toggle("on",!!SEL);
  $("rpBtn").setAttribute("aria-expanded",RP.open);
  pop.hidden=!RP.open; if(!RP.open) return;
  const L0=lastDay(), P=[["Semua","per bulan "+R.Y,null]];
  if(L0){ P.push(["Bulan berjalan","per hari",{a:1,z:L0}],["Hari terakhir","",{a:L0,z:L0}]);
    if(L0>7) P.push(["7 hari terakhir","",{a:L0-6,z:L0}]);
    if(L0>14) P.push(["14 hari terakhir","",{a:L0-13,z:L0}]); }
  const same=s=>(!s&&!SEL)||(s&&SEL&&s.a===SEL.a&&s.z===SEL.z);
  let g="<span></span>".repeat((new Date(R.Y,R.MO-1,1).getDay()+6)%7);
  for(let d=1;d<=R.DIM;d++) g+=`<button type="button" class="rpd${d===L0?" last":""}" data-d="${d}" aria-label="${d} ${BLNF[R.MO-1]} ${R.Y}"${d>L0?" disabled":""}>${d}</button>`;
  pop.innerHTML=`<div class="rpp">${P.map((x,i)=>`<button type="button" data-p="${i}" class="${same(x[2])?"on":""}">${x[0]}${x[1]?`<small>${x[1]}</small>`:""}</button>`).join("")}</div>
    <div class="rpc"><div class="rpnav">${RP.a!=null?"Klik tanggal lain untuk rentang":"Klik tanggal untuk tampilan per hari"}</div>
    <div class="rpmh">${BLNF[R.MO-1]} ${R.Y}</div><div class="rpg">${["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=>`<span class="rpw">${x}</span>`).join("")}${g}</div>
    <div class="rpf">${L0?`Data tersedia 1–${L0} ${BLN[R.MO-1]} · titik = data terakhir`:"Belum ada data bulan berjalan"}</div></div>`;
  paintRP();
  pop.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{ SEL=P[+b.dataset.p][2]; RP.open=false; RP.a=null; show(); $("rpBtn").focus({preventScroll:true}); });
  pop.querySelectorAll(".rpd:not(:disabled)").forEach(b=>{
    const d=+b.dataset.d;
    b.onclick=()=>{
      if(RP.a==null){ RP.a=d; SEL={a:d,z:d}; show(); pop.querySelector(`.rpd[data-d="${d}"]`).focus({preventScroll:true}); }
      else { SEL={a:Math.min(RP.a,d),z:Math.max(RP.a,d)}; RP.open=false; RP.a=null; show(); $("rpBtn").focus({preventScroll:true}); } };
    b.onmouseenter=()=>paintRP(d); });
}

function build(){
  $("cStamp").innerHTML=`Diperbarui<br>${esc(L.meta.generated)}`;
  $("cDup").innerHTML=R.dup.length?`<details class="dt"><summary>Baris kembar di Excel: ${R.dup.length} kelompok (dihitung sekali di halaman ini)</summary><div class="tw"><table><thead><tr><th>Tanggal</th><th>Route</th><th>Jam</th><th>Kode</th><th>No baris</th><th>Keterangan</th></tr></thead><tbody>${R.dup.map(v=>`<tr><td>${esc(v[0].d.split("-").reverse().join("-"))}</td><td>${v[0].r}</td><td>${esc(v[0].f)}–${esc(v[0].t)}</td><td>${v[0].c}</td><td>${v.map(s=>esc(s.no)).join(", ")}</td><td>${esc(v[0].desc)}</td></tr>`).join("")}</tbody></table></div></details>`:"";
  if(R.noTime.length) $("cDup").innerHTML+=`<p class="cap">${R.noTime.length} baris loss time tanpa jam From/To: tidak bisa diperiksa tumpang tindihnya, hanya dihitung bila melebihi jam gabungan hari itu.</p>`;
  const lb=$("cLock"); let ro=null;
  const setH=()=>{ if(!lb.isConnected){ if(ro) ro.disconnect(); return; }   // dashboard sudah diganti
    lb.parentElement.style.setProperty("--lockH",lb.offsetHeight+"px"); };
  setH(); if(window.ResizeObserver){ ro=new ResizeObserver(setH); ro.observe(lb); }
  addEventListener("scroll",()=>lb.classList.toggle("stuck",lb.getBoundingClientRect().top<=8.5),{passive:true});
  $("cPair").onclick=e=>{ const b=e.target.closest("button"); if(!b||b.dataset.v===CUR.id) return; try{ localStorage.setItem("cmpPair",b.dataset.v); }catch(x){} setPair(b.dataset.v); };
  $("rpBtn").onclick=e=>{ e.stopPropagation(); RP.open=!RP.open; RP.a=null; drawRP(); };
  $("rpPop").onclick=e=>e.stopPropagation();
  document.addEventListener("click",()=>{ if(RP.open) closeRP(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&RP.open){ closeRP(); $("rpBtn").focus({preventScroll:true}); } });
  let w=innerWidth, t; addEventListener("resize",()=>{ if(innerWidth===w) return; w=innerWidth; clearTimeout(t); t=setTimeout(()=>{ if(lb.isConnected) render(); },180); });
}
const TK_IC = (()=>{ const s=p=>`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return { truck:s('<path d="M2 16V7h11v9M13 10h4l4 4v2h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>'),
    cal:s('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    goal:s('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    trend:s('<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>'),
    trophy:s('<path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M10 15h4v4h-4zM8 21h8"/>'),
    alert:s('<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17v.5"/>'),
    chart:s('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    flag:s('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    pin:s('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    ship:s('<path d="M3 15h18l-2 5H5l-2-5Zm3 0V9h12v6M12 9V4"/>'),
    box:s('<path d="M3 7l9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>'),
    route:s('<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>'),
    clock:s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    tool:s('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z"/>'),
    rain:s('<path d="M7 15a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 9a4 4 0 0 1-1 7.9M8 19l-1 2M12 18l-1 3M16 19l-1 2"/>'),
    drop:s('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>'),
    pause:s('<path d="M9 5v14M15 5v14"/>'), play:s('<path d="M7 5l12 7-12 7V5Z"/>') }; })();
function tickerRender(el, items){
  if(!el) return;
  const li = items.filter(Boolean).map(it=>`<li class="tk-it ${it.tone||"info"}"><span class="tk-ic">${TK_IC[it.ic]||TK_IC.alert}</span>${it.tag?`<span class="tk-tag">${it.tag}</span>`:""}<span>${it.html}</span></li>`).join("");
  if(!li){ el.innerHTML=""; return; }
  const paused = el.classList.contains("paused");
  el.innerHTML = `<div class="tk-lb"><i class="tk-dot" aria-hidden="true"></i><span>Info penting</span></div><div class="tk-vp"><div class="tk-tr"><ul class="tk-list">${li}</ul><ul class="tk-list" aria-hidden="true">${li}</ul></div></div><button class="tk-btn" type="button" aria-pressed="${paused}" aria-label="${paused?"Jalankan":"Jeda"} running text" title="${paused?"Jalankan":"Jeda"}">${paused?TK_IC.play:TK_IC.pause}</button>`;
  const w = el.querySelector(".tk-list").scrollWidth;
  el.querySelector(".tk-tr").style.setProperty("--tkd", Math.max(25, w/60).toFixed(1)+"s");
  el.querySelector(".tk-btn").onclick = ()=>{ el.classList.toggle("paused"); tickerRender(el, items); };
}
/* ===== MMJ MOTION v1: grafik dinamis (disalin sama persis ke tiap template; sumber: Tools\mmj_motion_snippet.js) =====
   Setelah render(): batang tumbuh, garis tergambar, donat berputar masuk, bar HTML terisi, angka KPI naik.
   Tidak jalan saat resize (lebar layar berubah) & bila perangkat minta kurangi animasi. */
(function(){
  if(document.getElementById("mmjMotionCss")) return;
  const css=document.createElement("style"); css.id="mmjMotionCss";
  css.textContent=
   "@keyframes mmGrowY{from{transform:scaleY(0)}}@keyframes mmGrowX{from{transform:scaleX(0)}}"+
   "@keyframes mmDraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes mmFade{from{opacity:0}}"+
   "@keyframes mmPop{from{opacity:0;transform:scale(.3)}}@keyframes mmRing{from{opacity:0;transform:rotate(calc(var(--mmrot,0deg) - 80deg)) scale(.8)}to{transform:rotate(var(--mmrot,0deg))}}"+
   "@keyframes mmWipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}@keyframes mmRise{from{opacity:0;transform:translateY(10px)}}"+
   ".mm-y{transform-box:fill-box;transform-origin:50% 100%;animation:mmGrowY .8s cubic-bezier(.2,.9,.25,1.04) both;animation-delay:var(--mmd,0ms)}"+
   ".mm-x{transform-box:fill-box;transform-origin:0 50%;animation:mmGrowX .8s cubic-bezier(.2,.9,.25,1.04) both;animation-delay:var(--mmd,0ms)}"+
   ".mm-l{stroke-dasharray:1;animation:mmDraw 1.3s cubic-bezier(.45,.05,.25,1) .2s both}"+
   ".mm-p{transform-box:fill-box;transform-origin:center;animation:mmPop .45s cubic-bezier(.3,1.6,.5,1) both;animation-delay:var(--mmd,0ms)}"+
   ".mm-r{transform-box:view-box;transform-origin:50% 50%;transform:rotate(var(--mmrot,0deg));animation:mmRing .8s cubic-bezier(.2,.9,.3,1) both;animation-delay:var(--mmd,0ms)}"+
   ".mm-t{animation:mmFade .5s ease-out both;animation-delay:var(--mmd,450ms)}"+
   ".mm-w{animation:mmWipe .9s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--mmd,0ms)}"+
   ".mm-k{animation:mmRise .55s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--mmd,0ms)}"+
   "svg rect.mm-y,svg rect.mm-x,svg path.mm-y,svg path.mm-x{transition:filter .2s}"+
   ".kpi{transition:transform .2s,box-shadow .2s}.kpi:hover{transform:translateY(-3px)}"+
   "@media (prefers-reduced-motion:reduce){.mm-y,.mm-x,.mm-l,.mm-p,.mm-r,.mm-t,.mm-w,.mm-k{animation:none!important}}";
  document.head.appendChild(css);
})();
var mmjMotion=(function(){
  let lastW=window.innerWidth;
  const still=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paint=el=>{ const f=(el.getAttribute("fill")||el.style.fill||"").trim().toLowerCase(); return f&&f!=="none"&&f!=="transparent"&&!/^rgba\([^)]*,\s*0\)$/.test(f); };
  const num=(el,a)=>parseFloat(el.getAttribute(a))||0;
  function svgChart(svg){
    const box=svg.viewBox&&svg.viewBox.baseVal&&svg.viewBox.baseVal.width?svg.viewBox.baseVal:{width:num(svg,"width")||svg.clientWidth,height:num(svg,"height")||svg.clientHeight};
    if(!box.width||box.width<120) return;                       // ikon kecil: lewati
    const rings=[...svg.querySelectorAll("circle")].filter(c=>c.getAttribute("stroke-dasharray")&&num(c,"r")>20);
    const arcs=[...svg.querySelectorAll("path")].filter(p=>paint(p)&&/A/i.test(p.getAttribute("d")||"")&&!svg.querySelector("rect:not(.hit)"));
    if(rings.length||arcs.length){                               // donat
      rings.concat(arcs).forEach((e,i)=>{
        /* irisan donat sudah diputar lewat atribut (mis. rotate(-90 85 85)); CSS animasi menimpa atribut itu,
           jadi putaran awal dipindah ke --mmrot dan titik putar = pusat lingkaran (bukan pusat kanvas) */
        const t=(e.getAttribute("transform")||"").match(/^\s*rotate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+))?\s*\)\s*$/);
        if(e.tagName.toLowerCase()==="circle"){ const cx=t&&t[2]!=null?t[2]:num(e,"cx"), cy=t&&t[3]!=null?t[3]:num(e,"cy"); e.style.transformOrigin=cx+"px "+cy+"px"; }
        if(t){ e.style.setProperty("--mmrot",t[1]+"deg"); e.removeAttribute("transform"); }
        e.classList.add("mm-r"); e.style.setProperty("--mmd",(i*70)+"ms"); });
      svg.querySelectorAll("text").forEach(t=>{ t.classList.add("mm-t"); t.style.setProperty("--mmd","500ms"); });
      return;
    }
    const bars=[...svg.querySelectorAll("rect,path")].filter(e=>{
      if(e.classList.contains("hit")||!paint(e)) return false;
      if(e.getAttribute("stroke")&&/surface/.test(e.getAttribute("fill")||"")){ e.classList.add("mm-t"); return false; } // chip label
      if(e.tagName.toLowerCase()==="path"&&!/z\s*$/i.test((e.getAttribute("d")||"").trim())) return false; // hanya path tertutup (ujung batang membulat)
      if(e.tagName.toLowerCase()==="rect"){ const w=num(e,"width"),h=num(e,"height"); if(w>box.width*.7&&h>box.height*.4) return false; } // latar
      return true; });
    if(bars.length){
      const rects=bars.filter(e=>e.tagName.toLowerCase()==="rect");
      const cnt=f=>{ const m={}; rects.forEach(r=>{ const k=Math.round(f(r)); m[k]=(m[k]||0)+1; }); return Math.max(0,...Object.values(m)); };
      const sameBottom=cnt(r=>num(r,"y")+num(r,"height")), sameLeft=cnt(r=>num(r,"x"));
      const horiz=sameLeft>sameBottom;
      const pos=e=>{ try{ const b=e.getBBox(); return horiz?b.y:b.x; }catch(_){ return 0; } };
      const order=[...new Set(bars.map(e=>Math.round(pos(e))))].sort((a,b)=>a-b);
      // tumbuh dari garis dasar grafik yang sama → segmen bertumpuk naik bersama
      const bb=bars.map(e=>{ try{ return e.getBBox(); }catch(_){ return null; } }).filter(b=>b&&(b.width||b.height));
      const base=bb.length?(horiz?Math.min(...bb.map(b=>b.x)):Math.max(...bb.map(b=>b.y+b.height))):0;
      bars.forEach(e=>{ e.classList.add(horiz?"mm-x":"mm-y");
        if(base&&!e.closest("g[transform]")){ e.style.transformBox="view-box"; e.style.transformOrigin=horiz?(base+"px 50%"):("50% "+base+"px"); }
        e.style.setProperty("--mmd",Math.min(700,order.indexOf(Math.round(pos(e)))*45)+"ms"); });
    }
    svg.querySelectorAll("polyline,path").forEach(p=>{
      if(paint(p)||!p.getAttribute("stroke")&&!p.style.stroke) return;
      if(p.getAttribute("stroke-dasharray")||p.style.strokeDasharray) return;
      p.setAttribute("pathLength","1"); p.classList.add("mm-l"); });
    svg.querySelectorAll("circle").forEach((c,i)=>{ if(num(c,"r")<=12){ c.classList.add("mm-p"); c.style.setProperty("--mmd",(300+i*60)+"ms"); } });
    svg.querySelectorAll("text").forEach(t=>{ if(!t.closest(".mm-p")) t.classList.add("mm-t"); });
  }
  function countUp(el){
    const tn=[...el.childNodes].find(n=>n.nodeType===3&&/\d/.test(n.nodeValue)); if(!tn) return;
    const m=tn.nodeValue.match(/^(\s*)([\d.]*\d(?:,\d+)?)(.*)$/s); if(!m) return;
    const dec=(m[2].split(",")[1]||"").length, to=parseFloat(m[2].replace(/\./g,"").replace(",","."));
    if(!isFinite(to)||to===0) return;
    const fmt=v=>v.toLocaleString("id-ID",{minimumFractionDigits:dec,maximumFractionDigits:dec});
    const t0=performance.now(), dur=900, fin=()=>{ tn.nodeValue=m[1]+m[2]+m[3]; };
    const step=()=>{ const k=Math.max(0,Math.min(1,(performance.now()-t0)/dur)), e=1-Math.pow(1-k,3); if(k<1){ tn.nodeValue=m[1]+fmt(to*e)+m[3]; requestAnimationFrame(step); } else fin(); };
    tn.nodeValue=m[1]+fmt(0)+m[3]; requestAnimationFrame(step);
    setTimeout(fin,dur+250);   // jaminan: angka akhir selalu tampil walau tab di latar belakang
  }
  return function(){
    const w=window.innerWidth, resized=w!==lastW; lastW=w;
    const fresh=s=>[...document.querySelectorAll(s)].filter(e=>!e.hasAttribute("data-mm"));
    const all=fresh("svg,.hbr .tr,.bar,.split,.mb .t,.kpi");
    all.forEach(e=>e.setAttribute("data-mm",""));
    if(resized||still()) return;
    all.forEach(e=>{
      if(e.tagName.toLowerCase()==="svg"){ if(!e.closest("button,nav,.tk,.ticker,.logo,.ic")) svgChart(e); return; }
      if(e.classList.contains("kpi")){ const i=[...e.parentNode.children].indexOf(e); e.classList.add("mm-k"); e.style.setProperty("--mmd",(i*60)+"ms"); const v=e.querySelector(".v"); if(v) countUp(v); return; }
      const sib=[...e.parentNode.parentNode.children].indexOf(e.parentNode);
      e.classList.add("mm-w"); e.style.setProperty("--mmd",Math.min(600,Math.max(0,sib)*35)+"ms");
    });
  };
})();
/* ===== akhir MMJ MOTION ===== */
;(function(){ const _r=render; render=function(){ const o=_r.apply(this,arguments); try{ mmjMotion(); }catch(e){} return o; }; })();
if(R){ build(); let saved="h1"; try{ saved=localStorage.getItem("cmpPair")||"h1"; }catch(e){} setPair(saved); } else $("cBody").innerHTML='<div class="empty">Data Coal Hauling / Loss Time tidak tersedia</div>';
;try{ if(typeof setView==="function") window.setView=setView; }catch(e){}
})();
