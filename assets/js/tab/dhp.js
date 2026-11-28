/* assets/js/tab/dhp.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){

const getD=k=>typeof window.mmjData==="function"?window.mmjData(k):null;
const $=id=>document.getElementById(id);
const H=getD("haul"), L=getD("lt");
const BLN=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"], BLNF=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const NF=d=>new Intl.NumberFormat("id-ID",{minimumFractionDigits:d,maximumFractionDigits:d}), nf0=NF(0), nf2=NF(2);
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const pad=n=>String(n).padStart(2,"0");

function applyTheme(t){ if(t==="dark") document.documentElement.setAttribute("data-theme","dark"); else document.documentElement.removeAttribute("data-theme"); $("cTheme").textContent="Tema: "+(t==="dark"?"gelap":"terang"); }
let theme="light"; try{ theme=localStorage.getItem("mmjTheme")||localStorage.getItem("dashTheme3")||"light"; }catch(e){} applyTheme(theme);
$("cTheme").onclick=()=>{ theme=theme==="dark"?"light":"dark"; applyTheme(theme); try{ localStorage.setItem("mmjTheme",theme); }catch(e){} };

/* ---------- Loss time gabungan tanpa jam overlap ----------
   Salinan mesin halaman "Coal Achievement vs Loss Time" (cmp_template.html, cmpEngine):
   semua kejadian route yang digabung diletakkan di satu garis waktu hari operasional 06.00-06.00,
   bobot tiap menit = bobot kejadian TERBESAR yang aktif (Convert Duration / (To - From), maks 1), tidak dijumlah.
   Kalau aturan di cmp_template berubah, ubah juga di sini. */
function ltEngine(L){
  const MMJ=new Set(["T","WB","A","E","M","D"]), PRI={R:0,S:1,T:2,SI:3,D:4}, DAY0=360, DAY1=1800;
  const next=d=>new Date(Date.parse(d+"T00:00:00Z")+864e5).toISOString().slice(0,10);
  const mins=s=>{ const m=/^(\d{1,2}):(\d{2})/.exec(s||""); if(!m) return null; const v=+m[1]*60 + +m[2]; return v<DAY0?v+1440:v; };
  const ISP_FROM="2026-07", active=(r,d)=>r!=="ISP"||d.slice(0,7)>=ISP_FROM;
  const byDay=new Map(), put=e=>{ if(!byDay.has(e.d)) byDay.set(e.d,[]); byDay.get(e.d).push(e); };
  L.stop.forEach(s=>{
    if(!(s.h>0)) return;
    const a=mins(s.f); let b=mins(s.t);
    const base={d:s.d, r:s.r, c:s.c, h:s.h};
    if(a==null||b==null){ put({...base, a:null}); return; }
    if(b<=a) b+=1440;
    const w=Math.min(1, s.h/((b-a)/60));
    put({...base, a, b:Math.min(b,DAY1), w});
    if(b>DAY1) put({...base, d:next(s.d), h:0, a:DAY0, b:b-1440, w});
  });
  function union(list){
    let mmj=0, non=0; const by={};
    const ev=list.filter(e=>e.a!=null).sort((x,y)=>(PRI[x.c]??5)-(PRI[y.c]??5) || y.w-x.w);
    const pts=[...new Set(ev.flatMap(e=>[e.a,e.b]))].sort((x,y)=>x-y);
    for(let i=0;i<pts.length-1;i++){
      const x=pts[i], y=pts[i+1]; let used=0;
      for(const e of ev){ if(e.a>x||e.b<y||e.w<=used) continue;
        const v=(e.w-used)*(y-x)/60; if(MMJ.has(e.c)) mmj+=v; else non+=v; by[e.r]=(by[e.r]||0)+v; used=e.w; }
    }
    list.filter(e=>e.a==null).forEach(e=>{ const v=Math.min(24,e.h)-(mmj+non); if(v>0){ if(MMJ.has(e.c)) mmj+=v; else non+=v; by[e.r]=(by[e.r]||0)+v; } });
    return {t:mmj+non, mmj, non, by};   /* by = jam per route; menit overlap ikut kejadian yang dipakai (prioritas/bobot terbesar) */
  }
  const raw=(d,routes)=>(byDay.get(d)||[]).filter(e=>routes.includes(e.r)&&active(e.r,d)&&e.h>0).map(e=>e.h).reduce((a,b)=>a+b,0);
  const last=L.stop.map(s=>s.d).reduce((a,b)=>a>b?a:b,"");
  return {last, day:(d,routes)=>{ const all=union((byDay.get(d)||[]).filter(e=>routes.includes(e.r)&&active(e.r,d))); return {...all, raw:raw(d,routes)}; }};
}

/* ---------- data ---------- */
const ORD=["BKL","GPU","TRA","BSL","GE"];
const COL={BKL:{hd:"#c6e0b4",f2:"#70ad47",f1:"#e2efda",ln:"#70ad47"}, GPU:{hd:"#dde5f0",f2:"#5b9bd5",f1:"#ddebf7",ln:"#2e75b6"},
  TRA:{hd:"#d9d9d9",f2:"#a6a6a6",f1:"#f2f2f2",ln:"#7f7f7f"}, BSL:{hd:"#ffe699",f2:"#ffc000",f1:"#fff2cc",ln:"#ffc000"},
  GE:{hd:"#f8cbad",f2:"#ed7d31",f1:"#fce4d6",ln:"#c55a11"}, TOTAL:{hd:"#a6a6a6",f2:"#3a3a3a",f1:"#d9d9d9"}};
let S=null, MODE="H02", LTE;
function prep(mode){
  const Y=H.meta.year, MO=H.meta.month, DIM=H.meta.daysInMonth;
  const ton={}, trip={};
  ORD.forEach(c=>{ ton[c]=new Array(DIM).fill(0); trip[c]=new Array(DIM).fill(0); });
  H.run[mode].facts.forEach(f=>{ const c=H.mitra[f[1]]; if(ton[c]&&f[0]<DIM){ ton[c][f[0]]+=f[5]; trip[c][f[0]]+=f[6]; } });
  const last=Math.max(1, ...ORD.map(c=>ton[c].reduce((z,v,i)=>v>0?i+1:z,0)));
  const planX=H.planExcel||{}, fromX=ORD.some(c=>planX[c]>0);
  /* H1: Monthly Plan Excel x persen H1 (sama dengan aturan RKAP H1); mitra yang bulan ini tidak lewat H1 targetnya 0 */
  const h1=mode==="H1", pct=h1?((H.rkap||{}).h1Pct||85)/100:1, nol={};
  const plan={}; ORD.forEach(c=>{ nol[c]=h1&&!ton[c].some(v=>v>0);
    plan[c]=nol[c]?0:fromX ? (planX[c]||0)*pct : (((H.rkap||{})[mode]||{})[c]||[])[MO-1]||0; });
  const RT=h1?"H1":"H2", LT_ROUTES=["ISP",RT];
  if(LTE===undefined) LTE=L&&L.stop?ltEngine(L):null;
  const E=LTE, ym=`${Y}-${pad(MO)}`;
  const ltLastDay=!E||!E.last||E.last.slice(0,7)<ym ? 0 : E.last.slice(0,7)>ym ? DIM : +E.last.slice(8);
  const lt=new Array(DIM).fill(null);
  if(E) for(let i=0;i<ltLastDay;i++) lt[i]=E.day(`${ym}-${pad(i+1)}`, LT_ROUTES);
  S={Y, MO, DIM, last, ton, trip, plan, fromX, lt, ltLastDay, mode, h1, pct, nol, RT};
}

/* ---------- gambar laporan (SVG 2000 x 1528, juga dipakai untuk PNG) ---------- */
const W=2000, HT=1528, FONT="Calibri, Carlito, 'Segoe UI', Arial, sans-serif";
function tx(x,y,s,o={}){ return `<text x="${x}" y="${y}" font-size="${o.fs||16}" font-weight="${o.fw||400}" fill="${o.c||"#000"}" text-anchor="${o.a||"start"}"${o.it?' font-style="italic"':""}${o.ls?` letter-spacing="${o.ls}"`:""}${o.tr?` transform="${o.tr}"`:""}${o.ol?` stroke="#262626" stroke-width="${o.olw||4}" stroke-linejoin="round" paint-order="stroke"`:""}${o.cl?` class="${o.cl}" style="--i:${o.i||0}"`:""}>${esc(s)}</text>`; }
function rc(x,y,w,h,o={}){ return `<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" fill="${o.f||"#fff"}"${o.s===null?"":` stroke="${o.s||"#000"}" stroke-width="${o.sw??1.5}"`}${o.rx?` rx="${o.rx}"`:""}${o.at||""}/>`; }
const P=v=>v==null||!isFinite(v)?"":nf0.format(Math.round(v))+"%";

function box(x,y,w,h,lab,val,pct,unit,frac,key,fullFill){
  const vw=Math.round(w*.66), vh=h-24;
  let s=rc(x,y,w,h,{sw:1.5})+tx(x+w/2,y+16,lab,{fs:15,a:"middle"});
  s+=rc(x+4,y+20,vw,vh,{f:"#fff",s:"#7f7f7f",sw:1});
  const fr=fullFill?1:Math.max(0,Math.min(1,frac||0));
  if(frac!=null||fullFill) s+=rc(x+4.5,y+20.5,(vw-1)*fr,vh-1,{f:`url(#g${key})`,s:null,at:' class="ax"'});
  const wt=key==="TOTAL"&&(fullFill||fr>.3);   // angka putih bertepi gelap: tetap terbaca di bagian gradasi terang
  s+=tx(x+4+vw/2,y+h-11,val,{fs:31,fw:700,a:"middle",c:wt?"#fff":"#000",ol:wt});
  if(pct) s+=tx(x+w-6,y+40,pct,{fs:18,fw:700,a:"end"});
  s+=tx(x+w-6,y+h-6,unit,{fs:14,a:"end",it:unit==="trips"});
  return s;
}
function tripBox(x,y,w,h,val){ return rc(x,y,w,h,{sw:1.5})+tx(x+w*.36,y+h-11,val,{fs:31,fw:700,a:"middle"})+tx(x+w-8,y+h-6,"trips",{fs:14,a:"end",it:true}); }

function draw(D){
  const {Y,MO,DIM,ton,trip,plan,lt,h1,RT}=S, i=D-1;
  const sum=a=>a.reduce((p,v)=>p+v,0);
  const row={};
  ORD.forEach(c=>{ const p=plan[c], cum=sum(ton[c].slice(0,D));
    row[c]={p, cumT:p*D/DIM, cum, dt:p/DIM, today:ton[c][i], trips:trip[c][i], cumTrips:sum(trip[c].slice(0,D))}; });
  const tot={}; ["p","cumT","cum","dt","today","trips","cumTrips"].forEach(k=>tot[k]=ORD.map(c=>row[c][k]).reduce((a,b)=>a+b,0));
  row.TOTAL=tot;
  const logo=($("mmjLogo")||{}).src||"";
  let s=`<svg id="rep" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${HT}" width="${W}" height="${HT}" font-family="${FONT}" role="img" aria-label="Daily Hauling Performance ${h1?"H1 ":""}${D} ${BLNF[MO-1]} ${Y}">`;
  s+="<defs>";
  Object.keys(COL).forEach(k=>{ s+=`<linearGradient id="g${k}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${COL[k].f2}"/><stop offset="1" stop-color="${COL[k].f1}"/></linearGradient>`;
    s+=`<linearGradient id="v${k}" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="${COL[k].f2}"/><stop offset="1" stop-color="${COL[k].f1}"/></linearGradient>`; });
  s+=`<linearGradient id="gLT" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ed7d31"/><stop offset=".5" stop-color="#c5e0b4"/><stop offset="1" stop-color="#548235"/></linearGradient></defs>`;
  s+=rc(0,0,W,HT,{f:"#fff",s:null});

  /* header */
  s+=rc(8,8,228,140,{sw:1.5});
  if(logo) s+=`<image href="${logo}" x="16" y="14" width="212" height="128" preserveAspectRatio="xMidYMid meet"/>`;
  s+=rc(240,8,1140,140,{f:"#f2f2f2"})+tx(810,102,h1?"DAILY HAULING PERFORMANCE H1":"DAILY HAULING PERFORMANCE",{fs:h1?58:64,fw:700,a:"middle"});
  s+=rc(1388,8,218,140)+`<line x1="1388" y1="50" x2="1606" y2="50" stroke="#000" stroke-width="1.5"/><line x1="1516" y1="50" x2="1516" y2="148" stroke="#000" stroke-width="1.5"/>`;
  s+=tx(1497,41,BLNF[MO-1],{fs:32,fw:700,a:"middle"})+tx(1452,138,String(D),{fs:96,fw:700,a:"middle"})+tx(1574,99,String(Y),{fs:32,fw:700,a:"middle",tr:"rotate(-90 1574 99)"});
  s+=rc(1614,8,376,140)+`<line x1="1614" y1="52" x2="1990" y2="52" stroke="#000" stroke-width="1.5"/><line x1="1614" y1="100" x2="1990" y2="100" stroke="#000" stroke-width="1.5"/><line x1="1750" y1="52" x2="1750" y2="148" stroke="#000" stroke-width="1.5"/><line x1="1910" y1="52" x2="1910" y2="148" stroke="#000" stroke-width="1.5"/>`;
  s+=tx(1802,41,"Achievement",{fs:32,fw:700,a:"middle"});
  s+=tx(1682,88,"TODAY",{fs:30,fw:700,a:"middle",ls:1})+tx(1904,90,nf0.format(tot.today),{fs:32,fw:700,a:"end"})+tx(1950,77,P(tot.dt?tot.today/tot.dt*100:null),{fs:19,fw:700,a:"middle"})+tx(1950,95,"tonnes",{fs:13,a:"middle"});
  s+=tx(1682,136,"M T D",{fs:30,fw:700,a:"middle",ls:1})+tx(1904,138,nf0.format(tot.cum),{fs:32,fw:700,a:"end"})+tx(1950,125,P(tot.p?tot.cum/tot.p*100:null),{fs:19,fw:700,a:"middle"})+tx(1950,143,"tonnes",{fs:13,a:"middle"});
  s+=rc(8,156,1982,44,{f:"#d9d9d9"})+tx(999,189,h1?"COAL HAULED TO ISP 68  (ROUTE H1)":"COAL RECEIVED AT PORT",{fs:32,fw:700,a:"middle"});

  /* panel tanggal */
  s+=rc(8,210,224,354,{f:"#fff"})+rc(8,210,224,40,{f:"#f2f2f2"})+tx(22,238,"DATE",{fs:21,fw:700});
  const st=Math.max(1,Math.min(D-6, S.last-6)), en=Math.min(S.last, st+6);
  for(let d=st, k=0; d<=en; d++, k++){ const on=d===D, y=258+k*42;
    s+=`<g data-day="${d}">`+rc(20,y,176,36,{f:on?"#404040":"#d9d9d9",s:on?"#202020":"#bfbfbf",sw:1,rx:3})+tx(34,y+26,`${pad(d)}-${BLN[MO-1]}-${String(Y).slice(2)}`,{fs:20,c:on?"#fff":"#000"})+"</g>"; }
  s+=rc(206,258,10,292,{f:"#f2f2f2",s:null,rx:5});
  s+=box(8,572,224,64,"Avg. Daily Achieve",nf0.format(tot.cum/D),P(tot.dt?tot.cum/D/tot.dt*100:null),"tonnes",null,"TOTAL",false);
  s+=tripBox(8,644,224,46,nf0.format(tot.cumTrips/D));

  /* kolom mitra + total */
  const X0=238, CW=245, G=8.4;
  [...ORD,"TOTAL"].forEach((c,k)=>{ const x=Math.round(X0+k*(CW+G)), r=row[c], C=COL[c];
    if(c==="TOTAL") s+=rc(x,210,CW,64,{f:C.hd})+tx(x+CW/2,253,"TOTAL",{fs:34,fw:700,a:"middle",ls:2});
    else { s+=rc(x,210,CW,64,{f:"#fff"})+rc(x+CW*.47,210,CW*.53,64,{f:C.hd});
      if(H.logos&&H.logos[c]) s+=`<image href="${H.logos[c]}" x="${x+8}" y="216" width="${CW*.47-16}" height="52" preserveAspectRatio="xMidYMid meet"/>`;
      else s+=tx(x+CW*.235,252,c,{fs:20,fw:700,a:"middle"});
      s+=tx(x+CW*.735,253,c.split("").join(" "),{fs:32,fw:700,a:"middle",ls:2}); }
    s+=box(x,282,CW,64,"Monthly Target",nf0.format(r.p),"","tonnes",null,c,false);
    s+=box(x,354,CW,64,"Cumulative Target",nf0.format(r.cumT),r.p?P(D/DIM*100):"","tonnes",null,c,r.p>0);
    s+=box(x,426,CW,64,"Cumulative Achieve",nf0.format(r.cum),P(r.p?r.cum/r.p*100:null),"tonnes",r.p?r.cum/r.p:0,c,false);
    s+=box(x,498,CW,64,"Daily Target",nf0.format(r.dt),"","tonnes",null,c,r.p>0);
    s+=box(x,570,CW,64,c==="TOTAL"?"Daily Actual":"Today Achieve",nf0.format(r.today),P(r.dt?r.today/r.dt*100:null),"tonnes",r.dt?r.today/r.dt:0,c,false);
    s+=tripBox(x,644,CW,46,nf0.format(r.trips));
  });

  /* MTD coal achieve (batang tegak) */
  s+=rc(1758,210,232,480,{f:"#d9d9d9",s:null})+tx(1874,242,"MTD COAL",{fs:22,fw:700,a:"middle",ls:1})+tx(1874,268,"ACHIEVE",{fs:22,fw:700,a:"middle",ls:1});
  ORD.forEach((c,k)=>{ const cx=1790+k*42, top=284, h=296, r=row[c], fr=r.p?Math.min(1,r.cum/r.p):0;
    s+=rc(cx-8,top,16,h,{f:"#efefef",s:null});
    s+=rc(cx-8,top+h*(1-fr),16,h*fr,{f:`url(#v${c})`,s:null,at:` class="ay" style="--i:${k*3}"`});
    s+=tx(cx+6,top+h-8,nf0.format(r.cum),{fs:15,tr:`rotate(-90 ${cx+6} ${top+h-8})`});
    s+=tx(cx+6,top+h+12,c.split("").join(" "),{fs:15,a:"end",tr:`rotate(-90 ${cx+6} ${top+h+12})`}); });

  /* grafik coal haul received by port */
  const PX0=40, PX1=1960, slot=(PX1-PX0)/DIM, cxd=j=>PX0+slot*(j+.5);
  s+=rc(8,700,1982,342,{f:"#f2f2f2",s:"#d9d9d9",sw:1})+tx(999,728,h1?"COAL HAUL RECEIVED AT ISP 68":"COAL HAUL RECEIVED BY PORT",{fs:21,fw:700,a:"middle",it:true,ls:2});
  s+=rc(26,744,1946,268,{f:"#fff",s:null});
  const dayTot=[...Array(D).keys()].map(j=>ORD.map(c=>ton[c][j]).reduce((a,b)=>a+b,0));
  const top=Math.max(tot.dt, ...dayTot, 1)*1.1, Yb=978, Yh=190, yv=v=>Yb-v/top*Yh;
  s+=`<line x1="${PX0}" y1="${yv(tot.dt).toFixed(1)}" x2="${PX1}" y2="${yv(tot.dt).toFixed(1)}" stroke="#ff0000" stroke-width="1.6" stroke-dasharray="2 3"/>`;
  s+=`<line x1="${PX0}" y1="${Yb}" x2="${PX1}" y2="${Yb}" stroke="#d9d9d9" stroke-width="1"/>`;
  const bw=Math.min(22,slot*.3);
  for(let j=0;j<D;j++){ const c0=cxd(j);
    s+=rc(c0-bw,yv(ton.BSL[j]),bw,Yb-yv(ton.BSL[j]),{f:"#ffc000",s:"#bf9000",sw:.8,at:` class="ay" style="--i:${j}"`});
    s+=rc(c0,yv(ton.TRA[j]),bw,Yb-yv(ton.TRA[j]),{f:"#bfbfbf",s:"#7f7f7f",sw:.8,at:` class="ay" style="--i:${j}"`}); }
  const line=(arr,o)=>{ const pts=arr.map((v,j)=>`${cxd(j).toFixed(1)},${yv(v).toFixed(1)}`).join(" ");
    let g=`<g class="aclip"><polyline points="${pts}" fill="none" stroke="${o.c}" stroke-width="${o.w||3}" stroke-dasharray="${o.da}" stroke-linecap="round"/>`;
    arr.forEach((v,j)=>{ g+=`<circle cx="${cxd(j).toFixed(1)}" cy="${yv(v).toFixed(1)}" r="${o.r}" fill="${o.dot}" stroke="${o.st||o.dot}" stroke-width="1"/>`; });
    return g+"</g>"; };   /* garis "tergambar" dari kiri ke kanan (animasi layar saja) */
  s+=line(ton.GPU.slice(0,D),{c:"#2e75b6",da:"9 6",r:3.5,dot:"#2e75b6"});
  s+=line(ton.GE.slice(0,D),{c:"#c55a11",da:"9 6",r:5,dot:"#c55a11"});
  s+=line(ton.BKL.slice(0,D),{c:"#70ad47",da:"9 6",r:3.5,dot:"#70ad47"});
  s+=line(dayTot,{c:"#000",da:"1 7",w:4,r:5,dot:"#ed7d31",st:"#c55a11"});
  dayTot.forEach((v,j)=>{ s+=tx(cxd(j),yv(v)-(j%2?18:12),nf0.format(v),{fs:15,a:"middle",cl:"af",i:j}); });
  for(let j=0;j<DIM;j++) s+=tx(cxd(j),1000,pad(j+1),{fs:16,a:"middle"});
  const lg=[["bar","#ffc000","BSL"],["bar","#bfbfbf","TRA"],["ln","#2e75b6","GPU"],["ln","#c55a11","GE"],["ln","#70ad47","BKL"],["dot","#000","Daily Coal Achieve"],["tg","#ff0000","Daily Target"]];
  let lx=560; lg.forEach(([t,c,n])=>{ const y=1028;
    if(t==="bar") s+=rc(lx,y-10,44,12,{f:c,s:"#7f7f7f",sw:.6});
    else if(t==="tg") s+=`<line x1="${lx}" y1="${y-4}" x2="${lx+44}" y2="${y-4}" stroke="${c}" stroke-width="1.6" stroke-dasharray="2 3"/>`;
    else s+=`<line x1="${lx}" y1="${y-4}" x2="${lx+44}" y2="${y-4}" stroke="${c}" stroke-width="3" stroke-dasharray="${t==="dot"?"1 6":"8 5"}" stroke-linecap="round"/><circle cx="${lx+22}" cy="${y-4}" r="4" fill="${t==="dot"?"#ed7d31":c}"/>`;
    s+=tx(lx+52,y+1,n,{fs:16,c:"#404040"}); lx+=60+n.length*8.6+22; });

  /* loss time ISP + H2 (atau ISP + H1) */
  const ltD=lt.slice(0,D), ltv=ltD.map(x=>x?x.t:null), has=ltv.filter(v=>v!=null);
  const part=(x,r)=>x&&x.by?(x.by[r]||0):0;
  const mtd=has.reduce((a,b)=>a+b,0), td=ltv[i], tdx=ltD[i];
  const mH2=ltD.reduce((a,x)=>a+part(x,RT),0), mISP=ltD.reduce((a,x)=>a+part(x,"ISP"),0);
  const LC={[RT]:"#70ad47",ISP:"#ed7d31"};
  s+=rc(8,1050,1982,44,{f:"#fff"})+tx(999,1083,`LOSS TIME ${RT} + ISP`,{fs:32,fw:700,a:"middle"});
  s+=rc(8,1094,1982,426,{f:"#f2f2f2",s:"#d9d9d9",sw:1});
  s+=tx(999,1132,"LOSS TIME  MMJ  HAUL  ROAD",{fs:27,fw:700,a:"middle",ls:2});
  s+=tx(999,1156,`Gabungan route ISP + ${RT}, jam overlap dihitung satu kali (jam)`,{fs:16,a:"middle",c:"#595959"});
  /* legenda */
  s+=rc(50,1116,22,22,{f:LC.ISP,s:null})+tx(80,1134,"ISP",{fs:19,fw:700})+rc(140,1116,22,22,{f:LC[RT],s:null})+tx(170,1134,RT,{fs:19,fw:700});
  s+=tx(50,1158,"Angka di atas batang = total",{fs:14,it:true,c:"#595959"});
  s+=tx(1950,1132,td==null?"Hari ini: –":`Hari ini: ${nf2.format(td)} jam  (ISP ${nf2.format(part(tdx,"ISP"))} · ${RT} ${nf2.format(part(tdx,RT))})`,{fs:18,fw:700,a:"end"});
  s+=tx(1950,1156,`MTD: ${nf2.format(mtd)} jam  (ISP ${nf2.format(mISP)} · ${RT} ${nf2.format(mH2)})`,{fs:18,fw:700,a:"end",c:"#404040"});
  s+=rc(38,1166,1924,340,{f:"#fff",s:null});
  const Lb=1470, Lh=262, ltop=Math.max(1,...has)*1.12, lw=Math.min(40,slot*.6);
  for(let j=0;j<D;j++){ const v=ltv[j]; if(v==null||v<.005) continue; const c0=cxd(j); let y=Lb;
    s+=`<g class="ltb" data-ltb="${j+1}" style="--i:${j}">`;     /* satu batang = satu grup, tumbuh dari garis dasar */
    for(const r of ["ISP",RT]){ const pv=part(ltD[j],r); if(pv<.005) continue; const h=pv/ltop*Lh; y-=h;
      s+=rc(c0-lw/2,y,lw,h,{f:LC[r],s:"#fff",sw:1});
      if(h>=20) s+=tx(c0,y+h/2+5,nf2.format(pv),{fs:15,fw:700,a:"middle",c:"#fff",ol:true,olw:2.2}); }
    s+="</g>"+tx(c0,Lb-v/ltop*Lh-8,nf2.format(v),{fs:17,fw:700,a:"middle",cl:"afl",i:j}); }
  s+=`<line x1="${PX0}" y1="${Lb}" x2="${PX1}" y2="${Lb}" stroke="#d9d9d9" stroke-width="1"/>`;
  for(let j=0;j<DIM;j++) s+=tx(cxd(j),1494,pad(j+1),{fs:16,a:"middle"});
  /* kolom klik per tanggal (transparan, tidak terlihat di PNG) -> panel detail loss time */
  for(let j=0;j<D;j++) s+=`<rect class="lth" data-ltday="${j+1}" x="${(PX0+slot*j).toFixed(1)}" y="1168" width="${slot.toFixed(1)}" height="336" fill="transparent"><title>Klik: detail loss time ${j+1} ${BLNF[MO-1]}</title></rect>`;
  if(D>S.ltLastDay) s+=tx(999,1320,`Loss time tanggal ${S.ltLastDay+1}${D>S.ltLastDay+1?"–"+D:""} belum diinput`,{fs:20,a:"middle",c:"#c00000",it:true});
  s+="</svg>";
  return s;
}

/* ---------- interaksi ---------- */
let CUR=1;
function show(D){
  CUR=Math.max(1,Math.min(S.last,D));
  $("repWrap").innerHTML=draw(CUR);
  $("dSel").value=String(CUR);
  $("dPrev").disabled=CUR<=1; $("dNext").disabled=CUR>=S.last;
  $("dMsg").textContent="";
  $("repWrap").querySelectorAll("[data-day]").forEach(g=>g.addEventListener("click",()=>show(+g.dataset.day)));
  /* grafik loss time: sorot batang saat kursor di atasnya, klik = panel detail */
  $("repWrap").querySelectorAll(".lth").forEach(h=>{ const d=+h.dataset.ltday, bar=()=>$("repWrap").querySelector(`[data-ltb="${d}"]`);
    h.addEventListener("mouseenter",()=>{ const b=bar(); if(b) b.classList.add("hot"); });
    h.addEventListener("mouseleave",()=>{ const b=bar(); if(b) b.classList.remove("hot"); });
    h.addEventListener("click",()=>openDet(d,true)); });
  if(DET){ if(DET>CUR) DET=CUR; openDet(DET,false); }
}

/* ---------- detail loss time per tanggal (klik batang grafik loss time) ---------- */
let DET=0;
const MMJ_C=new Set(["T","WB","A","E","M","D"]);
const TNAME=L&&L.types?Object.fromEntries(L.types.map(t=>[t.c,t.n])):{};
const TCOL={R:"#2a78d6",S:"#5bb8e8",A:"#d03b3b",E:"#e0842a",M:"#8b5cf6",T:"#f2b632",NH:"#94a3b8",CP:"#e2559b",D:"#a47148",SI:"#14b8a6",FM:"#64748b",MC:"#5b4bd6",RG:"#7fb13a",WB:"#0891b2"};
const opMin=s=>{ const m=/^(\d{1,2}):(\d{2})/.exec(s||""); if(!m) return 9999; const v=+m[1]*60 + +m[2]; return v<360?v+1440:v; };
function openDet(d, scroll){
  DET=Math.max(1,Math.min(CUR,d));
  $("repWrap").querySelectorAll(".lth").forEach(h=>h.classList.toggle("sel", +h.dataset.ltday===DET));
  const {Y,MO,RT}=S, ym=`${Y}-${pad(MO)}`, date=`${ym}-${pad(DET)}`, x=S.lt[DET-1];
  const routes=["ISP",RT], ispOn=ym>="2026-07";
  const ev=L&&L.stop?L.stop.filter(e=>e.d===date&&routes.includes(e.r)&&(e.r!=="ISP"||ispOn)&&e.h>0).sort((a,b)=>opMin(a.f)-opMin(b.f)||b.h-a.h):[];   /* urut jam hari operasional 06.00 -> 06.00 */
  const LCR={[RT]:"#548235",ISP:"#c55a11"};
  const raw=ev.reduce((a,e)=>a+e.h,0), byT={};
  ev.forEach(e=>{ byT[e.c]=(byT[e.c]||0)+e.h; });
  let h=`<div class="ltdh"><div><h2>Detail loss time ${DET} ${BLNF[MO-1]} ${Y}</h2><p>Route ISP + ${RT} · klik batang lain di grafik loss time untuk ganti tanggal</p></div>`
    +`<div class="ltnav"><button class="dbtn" type="button" data-dn="-1" aria-label="Tanggal sebelumnya"${DET<=1?" disabled":""}>&#8249;</button><button class="dbtn" type="button" data-dn="1" aria-label="Tanggal berikutnya"${DET>=CUR?" disabled":""}>&#8250;</button><button class="dbtn" type="button" data-dn="0">Tutup</button></div></div>`;
  if(DET>S.ltLastDay){ h+=`<div class="empty">Loss time tanggal ${DET} ${BLNF[MO-1]} belum diinput.</div>`; }
  else if(!ev.length){ h+=`<div class="empty">Tidak ada loss time route ISP + ${RT} pada tanggal ini.</div>`; }
  else {
    const part=r=>x&&x.by?(x.by[r]||0):0;
    h+=`<div class="ltk"><div><span>Total (tanpa overlap)</span><b>${nf2.format(x?x.t:0)}</b><small>jam</small><em>sama dengan angka di atas batang</em></div>`
      +`<div><span>ISP</span><b>${nf2.format(part("ISP"))}</b><small>jam</small></div><div><span>${RT}</span><b>${nf2.format(part(RT))}</b><small>jam</small></div>`
      +`<div><span>MMJ · Bukan MMJ</span><b>${nf2.format(x?x.mmj:0)}</b><small>· ${nf2.format(x?x.non:0)} jam</small></div>`
      +`<div><span>Jumlah durasi kejadian</span><b>${nf2.format(raw)}</b><small>jam</small><em>${ev.length} kejadian${raw-(x?x.t:0)>.005?`, ${nf2.format(raw-(x?x.t:0))} jam bertumpuk`:""}</em></div></div>`;
    h+=`<div class="ltty">`+Object.entries(byT).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<span><i style="background:${TCOL[c]||"#999"}"></i>${esc(TNAME[c]||c)} <b>${nf2.format(v)}</b> jam${MMJ_C.has(c)?"":" · bukan MMJ"}</span>`).join("")+`</div>`;
    h+=`<div class="tw"><table class="ltt"><thead><tr><th>Route</th><th>Tipe</th><th>Sub tipe</th><th class="r">Jam</th><th>Waktu</th><th>Lokasi</th><th>Keterangan</th></tr></thead><tbody>`
      +ev.map(e=>`<tr class="${MMJ_C.has(e.c)?"":"nonmmj"}"><td><span class="rch" style="background:${LCR[e.r]||"#666"}">${esc(e.r)}</span></td>`
        +`<td><i class="d" style="display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;background:${TCOL[e.c]||"#999"}"></i>${esc(TNAME[e.c]||e.c)}</td><td>${esc(e.t2||"")}</td>`
        +`<td class="r"><b>${nf2.format(e.h)}</b></td><td style="white-space:nowrap">${esc(e.f||"")}–${esc(e.t||"")}</td>`
        +`<td style="white-space:nowrap">${e.km!=null?"KM "+nf2.format(e.km).replace(/,00$/,""):""}${e.blok?`<br><small>${esc(e.blok)}</small>`:""}</td><td class="ds">${esc(e.desc||"")}</td></tr>`).join("")
      +`</tbody></table></div>`;
    h+=`<div class="ltdn">Jam per kejadian = Convert Duration (data Loss Time). Total di atas menghitung jam yang bertumpuk antar kejadian/route satu kali (bobot terbesar per menit), jadi bisa lebih kecil dari jumlah durasi kejadian. Kejadian yang lewat tengah malam dicatat di tanggal mulainya.</div>`;
  }
  const P=$("ltDet"); P.innerHTML=h; P.hidden=false;
  P.style.animation="none"; void P.offsetWidth; P.style.animation="";
  P.querySelectorAll("[data-dn]").forEach(b=>b.addEventListener("click",()=>{ const n=+b.dataset.dn; if(n===0){ closeDet(); return; } openDet(DET+n,false); }));
  if(scroll) P.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth", block:"nearest"});
}
function closeDet(){ DET=0; $("ltDet").hidden=true; $("repWrap").querySelectorAll(".lth.sel").forEach(h=>h.classList.remove("sel")); }
function fileName(){ return `Daily Hauling Performance ${S.h1?"H1 ":""}${pad(CUR)} ${BLNF[S.MO-1]} ${S.Y}.png`; }
function toBlob(){
  return new Promise((ok,no)=>{
    const svg=$("rep"); if(!svg) return no(new Error("laporan belum tampil"));
    const src=new XMLSerializer().serializeToString(svg), img=new Image();
    img.onload=()=>{ try{ const c=document.createElement("canvas"); c.width=W; c.height=HT; const g=c.getContext("2d");
      g.fillStyle="#fff"; g.fillRect(0,0,W,HT); g.drawImage(img,0,0,W,HT); c.toBlob(b=>b?ok(b):no(new Error("gagal membuat PNG")),"image/png"); }catch(e){ no(e); } };
    img.onerror=()=>no(new Error("gambar SVG gagal dimuat"));
    img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(src);
  });
}
function setMode(m){
  MODE=m; prep(m);
  const {Y,MO,h1,RT}=S;
  document.querySelectorAll(".dseg [data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===m)));
  $("dSel").innerHTML=[...Array(S.last).keys()].map(j=>`<option value="${j+1}">${j+1} ${BLNF[MO-1]} ${Y}</option>`).join("");
  $("dSub").textContent=h1?`Coal hauled route H1 ke ISP 68 (Input CH CCP) · loss time gabungan ISP + H1 tanpa overlap · ${BLNF[MO-1]} ${Y}`
    :`Coal received at port (H0+H2, SBL WB) · loss time gabungan ISP + H2 tanpa overlap · ${BLNF[MO-1]} ${Y}`;
  const nolTxt=ORD.filter(c=>S.nol[c]);
  $("dNote").innerHTML=`<b>Sumber:</b> ${esc(H.meta.source)} (folder ${esc(H.meta.sourceFolder)}). Tonase &amp; trips = ${h1?"sheet Input CH CCP - ISP68 (route H1)":"sheet SBL WB (Coal, mitra)"}. `
    +`<b>Target bulanan</b> = ${S.fromX?(h1?`Monthly Plan sheet DAILY HAUL DASHBOARD × ${nf0.format(S.pct*100)}% (porsi H1, sama dengan aturan RKAP H1)`:"Monthly Plan sheet DAILY HAUL DASHBOARD"):`RKAP 2026 ${h1?"H1":""} (Monthly Plan Excel tidak terbaca)`}`
    +(nolTxt.length?`; ${nolTxt.join(", ")} tidak lewat H1 bulan ini sehingga targetnya 0`:"")
    +`; Cumulative Target = target bulanan × tanggal ÷ ${S.DIM} hari; Daily Target = target bulanan ÷ ${S.DIM}. `
    +`% Cumulative Achieve dibanding target bulanan; % Today dibanding Daily Target. `
    +`<b>Loss time</b> = route ISP + ${RT} dari data Loss Time (Convert Duration), kejadian yang bertumpuk jamnya dihitung satu kali dengan bobot terbesar (sama dengan halaman Coal Achievement vs Loss Time). `
    +(L?`Data loss time terakhir: ${esc(S.ltLastDay?S.ltLastDay+" "+BLNF[MO-1]:"belum ada bulan ini")}.`:"Data Loss Time tidak tersedia.");
  show(Math.min(CUR>1?CUR:S.last, S.last));
}
function build(){
  $("dStamp").innerHTML=`Diperbarui<br>${esc(H.meta.generated)}`;
  if(!(H.run.H1&&H.run.H1.facts&&H.run.H1.facts.length)){ const b=document.querySelector('.dseg [data-mode="H1"]'); if(b){ b.disabled=true; b.title="Data H1 tidak tersedia"; } }
  document.querySelectorAll(".dseg [data-mode]").forEach(b=>b.addEventListener("click",()=>{ if(b.dataset.mode!==MODE) setMode(b.dataset.mode); }));
  $("dSel").onchange=e=>show(+e.target.value);
  $("dPrev").onclick=()=>show(CUR-1);
  $("dNext").onclick=()=>show(CUR+1);
  $("dPng").onclick=async()=>{ try{ const b=await toBlob(), u=URL.createObjectURL(b), a=document.createElement("a");
      a.href=u; a.download=fileName(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000);
      $("dMsg").textContent="Gambar diunduh: "+fileName(); }catch(e){ $("dMsg").textContent="Gagal unduh: "+e.message; } };
  $("dCopy").onclick=async()=>{ try{ if(!navigator.clipboard||!window.ClipboardItem) throw new Error("browser tidak mendukung salin gambar, pakai Unduh");
      await navigator.clipboard.write([new ClipboardItem({"image/png":toBlob()})]); $("dMsg").textContent="Gambar tersalin, tinggal tempel (Ctrl+V) di WhatsApp."; }
    catch(e){ $("dMsg").textContent="Gagal salin: "+e.message; } };
  document.addEventListener("keydown",e=>{ if(e.target.closest&&e.target.closest("select,input")) return; if(e.key==="ArrowLeft") show(CUR-1); if(e.key==="ArrowRight") show(CUR+1); });
  CUR=0; setMode("H02");
}
if(H&&H.run&&H.run.H02) build(); else $("repWrap").innerHTML='<div class="empty">Data Coal Hauling tidak tersedia. Jalankan Update Dashboard Gabungan.</div>';
;try{ if(typeof setView==="function") window.setView=setView; }catch(e){}
})();
