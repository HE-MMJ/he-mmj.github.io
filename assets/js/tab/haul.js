/* assets/js/tab/haul.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){
var DATA = window.MMJ_DATA["haul"];

const BLN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const BLNF = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const M = DATA.mitra, MN = DATA.mitraName, META = DATA.meta, A = DATA.annual;
const MCOL = Object.fromEntries(M.map(c=>[c,`var(--m${c})`]));
const Y = META.year, MO = META.month, LASTD = META.lastDay, DIM = META.daysInMonth, CUR = Y===2026 ? MO-1 : -1;
const nf0 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:1,minimumFractionDigits:1});
const nf2 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:2,minimumFractionDigits:2});
const fmt = v => nf0.format(v);
const pct = v => v==null||!isFinite(v) ? "–" : nf1.format(v)+"%";
const short = v => Math.abs(v)>=1e6 ? nf2.format(v/1e6)+" jt" : Math.abs(v)>=1e4 ? nf1.format(v/1e3)+" rb" : fmt(v);
const dStr = d => `${d+1} ${BLN[MO-1]} ${Y}`;
const dName = d => HARI[new Date(Y,MO-1,d+1).getDay()];
const ROUTE = {H02:{n:"H0 + H2", l:"Coal received at Port SBL", s:"sheet SBL WB"}, H1:{n:"H1", l:"Coal hauled CPP → ISP61", s:"sheet Input CH CCP - ISP61"}};
const BLK = Array.from({length:12},(_,i)=>{ const a=(6+2*i)%24, b=(8+2*i)%24; return `${String(a).padStart(2,"0")}–${String(b).padStart(2,"0")}`; });
const STLAB = {ba:"BA", unsplit:"Belum dipisah", run:"Berjalan", wb:"WB", none:"Kosong"};
const RK = DATA.rkap, LOGO = DATA.logos||{};
const tgtM = (route,c,k) => ((RK[route==="H1"?"H1":"H02"]||{})[c]||[])[k]||0;
const TGLAB = {H02:`RKAP H0+H2`, H1:`H1 = ${RK.h1Pct}% × RKAP H0+H2`};
const logoHTML = (c,cls="lg") => LOGO[c] ? `<span class="${cls}"><img src="${LOGO[c]}" alt="Logo ${MN[c]}"></span>` : `<span class="${cls} ini" style="--c:${MCOL[c]}" title="${MN[c]}">${c}</span>`;

let saved={}; try{ saved=JSON.parse(localStorage.getItem("haulDash")||"{}")||{}; }catch(e){}
const st = {route:saved.route==="H1"?"H1":"H02", yRoute:["H02","H0","H2","H1"].includes(saved.yRoute)?saved.yRoute:"H02", d0:0, d1:LASTD-1, mitra:new Set(M.map((_,i)=>i))};
if((st.route==="H1")!==(st.yRoute==="H1")) st.yRoute = st.route==="H1" ? "H1" : "H02";
st.hMitra = new Set(M.map((_,i)=>i));
const save = () => { try{ localStorage.setItem("haulDash", JSON.stringify({route:st.route, yRoute:st.yRoute, hMet:st.hMet})); }catch(e){} };
/* satu klik route = semua kartu ikut (filter utama, tahunan, RKAP, performa mitra) */
function setRoute(v, yr){ st.route = v==="H1" ? "H1" : "H02"; st.yRoute = yr || (st.route==="H1" ? "H1" : (st.yRoute==="H1" ? "H02" : st.yRoute)); save(); render(); }
const selM = () => M.filter((_,i)=>st.mitra.has(i));
const allRange = () => st.d0===0 && st.d1===LASTD-1;

/* ---------- data bulan berjalan ---------- */
function runAgg(route, {d0=st.d0, d1=st.d1, mitra=st.mitra}={}){
  const R = DATA.run[route];
  const o = {ton:0, trip:0, day:Array.from({length:LASTD},()=>M.map(()=>0)), dayTrip:Array.from({length:LASTD},()=>M.map(()=>0)),
    m:M.map(()=>({ton:0,trip:0})), blk:Array.from({length:12},()=>M.map(()=>0)), blkN:Array.from({length:12},()=>M.map(()=>0)), org:new Map(), ven:new Map()};
  for(const f of R.facts){ const [d,m,b,og,vn,t,n]=f; if(d<d0||d>d1||!mitra.has(m)) continue;
    o.ton+=t; o.trip+=n; o.day[d][m]+=t; o.dayTrip[d][m]+=n; o.m[m].ton+=t; o.m[m].trip+=n; if(b>=0){ o.blk[b][m]+=t; o.blkN[b][m]+=n; }
    const ko=R.dims.origin[og], kv=R.dims.vendor[vn];
    const a=o.org.get(ko)||{t:0,n:0,m:M.map(()=>0)}; a.t+=t; a.n+=n; a.m[m]+=t; o.org.set(ko,a);
    const v=o.ven.get(kv)||{t:0,n:0,m:M.map(()=>0)}; v.t+=t; v.n+=n; v.m[m]+=t; o.ven.set(kv,v); }
  const uAll=new Set(), uDay=new Set(), uM=M.map(()=>new Set()), uDayM=M.map(()=>new Set());
  for(const [d,m,us] of R.units){ if(d<d0||d>d1||!mitra.has(m)) continue;
    us.forEach(u=>{ uAll.add(u); uDay.add(d*100000+u); uM[m].add(u); uDayM[m].add(d*100000+u); }); }
  o.dt=uAll.size; o.unitDay=uDay.size; o.m.forEach((x,i)=>{ x.dt=uM[i].size; x.unitDay=uDayM[i].size; });
  o.days = o.day.filter((r,i)=>i>=d0&&i<=d1&&r.some(v=>v>0)).length;
  return o;
}
const FULL = {d0:0, d1:LASTD-1};
const RUNFULL = {H02:M.map((_,i)=>runAgg("H02",{...FULL,mitra:new Set([i])}).ton), H1:M.map((_,i)=>runAgg("H1",{...FULL,mitra:new Set([i])}).ton)};

/* ---------- data tahunan ---------- */
function yParts(k, c){
  const i=M.indexOf(c), s02=A.st02[k], s1=A.st1[k], o={H0:0,H2:0,X:0,RUN:0,H1:0};
  if(s02==="ba"){ o.H0=A.H0[c][k]; o.H2=A.H2[c][k]; }
  else if(s02==="unsplit"){ o.X=A.H0[c][k]+A.H2[c][k]; }
  else if(s02==="wb"){ o.X=A.WB[c][k]; }
  else if(s02==="run"){ o.RUN=RUNFULL.H02[i]; }
  if(s1==="ba") o.H1=A.H1[c][k]; else if(s1==="run") o.H1=RUNFULL.H1[i];
  return o;
}
function yVal(k, c, r){ const p=yParts(k,c); return r==="H02"?p.H0+p.H2+p.X+p.RUN : r==="H0"?p.H0 : r==="H2"?p.H2 : p.H1; }
const NMON = CUR>=0 ? CUR+1 : 12;
const yMonths = [...Array(NMON).keys()];

/* ---------- filters ---------- */
fMitra.innerHTML = M.map((c,i)=>`<button class="chip" type="button" data-i="${i}" aria-pressed="true" title="${MN[c]}"><i style="background:${MCOL[c]}"></i>${c}</button>`).join("");
fMitra.onclick = e => { const b=e.target.closest(".chip"); if(!b) return; const i=+b.dataset.i;
  if(st.mitra.has(i) && st.mitra.size>1) st.mitra.delete(i); else st.mitra.add(i); render(); };
fRoute.onclick = e => { const b=e.target.closest("button"); if(b) setRoute(b.dataset.v); };
yRoute.onclick = e => { const b=e.target.closest("button"); if(b) setRoute(b.dataset.v==="H1"?"H1":"H02", b.dataset.v); };
mRoute.onclick = e => { const b=e.target.closest("button"); if(b) setRoute(b.dataset.v); };
rRoute.onclick = e => { const b=e.target.closest("button"); if(b) setRoute(b.dataset.v); };
st.hMet = ["ton","rit","both"].includes(saved.hMet) ? saved.hMet : "ton";
hMet.onclick = e => { const b=e.target.closest("button"); if(!b) return; st.hMet=b.dataset.v; try{ const s=JSON.parse(localStorage.getItem("haulDash")||"{}")||{}; s.hMet=st.hMet; localStorage.setItem("haulDash",JSON.stringify(s)); }catch(err){} render(); };
hMitra.onclick = e => { const b=e.target.closest("[data-h]"); if(!b) return; const v=b.dataset.h;
  if(v==="all") st.hMitra=new Set(M.map((_,i)=>i));
  else { const i=+v; if(st.hMitra.has(i)&&[...st.hMitra].filter(x=>st.mitra.has(x)).length>1) st.hMitra.delete(i); else st.hMitra.add(i); }
  render(); };
st.sub=null;
const toggleSub = k => { st.sub = st.sub===k ? null : k; render(); };
ringkasan.onclick = e => { const k=e.target.closest("[data-sub]"); if(k) toggleSub(k.dataset.sub); };
ringkasan.onkeydown = e => { const k=e.target.closest("[data-sub]"); if(k && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); toggleSub(k.dataset.sub); } };
cekBtn.onclick = () => { const open=cekBody.hidden; cekBody.hidden=!open; cekBtn.setAttribute("aria-expanded",open); cekBtn.textContent=open?"Sembunyikan":"Tampilkan"; };
reset.onclick = () => { st.d0=0; st.d1=LASTD-1; st.mitra=new Set(M.map((_,i)=>i)); render(); };

/* range picker (hari dalam bulan berjalan) */
const RP = {open:false, a:null, hover:null};
const rangeText = () => allRange() ? `1–${LASTD} ${BLN[MO-1]} ${Y}` : st.d0===st.d1 ? dStr(st.d0) : `${st.d0+1}–${st.d1+1} ${BLN[MO-1]} ${Y}`;
function rpPresets(){ const L=LASTD-1;
  return [["Bulan berjalan",0,L],["Hari terakhir",L,L],["3 hari terakhir",Math.max(0,L-2),L],["7 hari terakhir",Math.max(0,L-6),L],["Tanggal 1–7",0,Math.min(6,L)],["Tanggal 8–14",Math.min(7,L),Math.min(13,L)],["Tanggal 15–21",Math.min(14,L),Math.min(20,L)]]
    .filter((p,i,a)=>i<4 || p[1]<=L && !(i>4 && p[1]===a[i-1][1])); }
function paintRP(){ let x=RP.a!=null?RP.a:st.d0, y=RP.a!=null?(RP.hover!=null?RP.hover:RP.a):st.d1; if(x>y) [x,y]=[y,x];
  rpPop.querySelectorAll(".rpd").forEach(b=>{ const d=+b.dataset.d; b.classList.toggle("in", d>x&&d<y); b.classList.toggle("end", d===x||d===y); }); }
function drawRP(){
  rpTxt.textContent = rangeText(); rp.classList.toggle("on", !allRange());
  rpPop.hidden=!RP.open; rpBtn.setAttribute("aria-expanded", RP.open); if(!RP.open) return;
  const P=rpPresets(), off=(new Date(Y,MO-1,1).getDay()+6)%7;
  let g=`<div class="rpmh">${BLNF[MO-1]} ${Y}</div><div class="rpg">`+["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=>`<span class="rpw">${x}</span>`).join("")+"<span></span>".repeat(off);
  for(let d=0; d<DIM; d++) g+=`<button type="button" class="rpd${d===LASTD-1?" last":""}" data-d="${d}"${d>=LASTD?" disabled":""}>${d+1}</button>`;
  g+="</div>";
  rpPop.innerHTML = `<div class="rpp">${P.map((p,i)=>`<button type="button" data-p="${i}" class="${st.d0===p[1]&&st.d1===p[2]?"on":""}">${p[0]}</button>`).join("")}</div>
    <div class="rpc"><div class="rpnav">${RP.a!=null?`Mulai ${dStr(RP.a)} · pilih tanggal akhir`:"Klik tanggal awal, lalu tanggal akhir"}</div>${g}<div class="rpf">Data tersedia 1–${LASTD} ${BLN[MO-1]} · titik = data terakhir</div></div>`;
  paintRP();
  rpPop.querySelectorAll("[data-p]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const p=P[+b.dataset.p]; RP.open=false; RP.a=null; st.d0=p[1]; st.d1=p[2]; render(); });
  rpPop.querySelectorAll(".rpd:not(:disabled)").forEach(b=>{
    b.onclick=e=>{ e.stopPropagation(); const d=+b.dataset.d;
      if(RP.a==null){ RP.a=d; RP.hover=d; drawRP(); } else { let a=RP.a, z=d; if(z<a) [a,z]=[z,a]; RP.a=null; RP.open=false; st.d0=a; st.d1=z; render(); } };
    b.onmouseenter=()=>{ if(RP.a!=null){ RP.hover=+b.dataset.d; paintRP(); } }; });
}
rpBtn.onclick = e => { e.stopPropagation(); RP.open=!RP.open; RP.a=null; drawRP(); };
rpPop.onclick = e => e.stopPropagation();
document.addEventListener("click", ()=>{ if(RP.open){ RP.open=false; RP.a=null; drawRP(); } });
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && RP.open){ RP.open=false; RP.a=null; drawRP(); rpBtn.focus(); } });

/* tema */
function applyTheme(t){ if(t==="dark") document.documentElement.setAttribute("data-theme","dark"); else document.documentElement.removeAttribute("data-theme"); themeBtn.textContent="Tema: "+(t==="dark"?"gelap":"terang"); }
let theme="light"; try{theme=localStorage.getItem("mmjTheme")||"light"}catch(e){} applyTheme(theme);
themeBtn.onclick=()=>{theme=theme==="dark"?"light":"dark"; applyTheme(theme); try{localStorage.setItem("mmjTheme",theme)}catch(e){} render();};

/* nav aktif saat scroll */
const navLinks=[...document.querySelectorAll("#nav a")], secs=navLinks.map(a=>document.querySelector(a.getAttribute("href")));
addEventListener("scroll",()=>{ let k=0; secs.forEach((s,i)=>{ if(s && s.getBoundingClientRect().top<160) k=i; }); navLinks.forEach((a,i)=>a.classList.toggle("on",i===k)); },{passive:true});

/* tooltip */
const tipEl=document.getElementById("tip");
function tip(e,title,rows,total){
  tipEl.innerHTML=`<div class="t">${title}</div>`+rows.map(r=>`<div class="row"><span>${r.c?`<i style="background:${r.c}"></i>`:""}${r.n}</span><span>${r.v}</span></div>`).join("")+(total!=null?`<div class="row tot"><span>Total</span><span>${total}</span></div>`:"");
  tipEl.style.display="block"; const w=tipEl.offsetWidth,h=tipEl.offsetHeight; let x=e.clientX+14,y=e.clientY+14;
  if(x+w>innerWidth-8) x=e.clientX-w-14; if(y+h>innerHeight-8) y=e.clientY-h-14; tipEl.style.left=Math.max(4,x)+"px"; tipEl.style.top=Math.max(4,y)+"px";
}
const hide=()=>tipEl.style.display="none";

/* table toggle */
const showTable={};
document.querySelectorAll(".tbtn[data-t]").forEach(b=>b.onclick=()=>{ const k=b.dataset.t; showTable[k]=!showTable[k]; b.textContent=showTable[k]?"Grafik":"Tabel"; render(); });
function tableHTML(t){ return `<div class="tw"><table><thead><tr>${t.h.map((x,i)=>`<th class="${i?"r":""}">${x}</th>`).join("")}</tr></thead><tbody>${t.r.map(r=>`<tr>${r.map((x,i)=>`<td class="${i?"r":""}">${x}</td>`).join("")}</tr>`).join("")}</tbody>${t.f?`<tfoot><tr>${t.f.map((x,i)=>`<td class="${i?"r":""}">${x}</td>`).join("")}</tr></tfoot>`:""}</table></div>`; }

/* ---------- column chart ---------- */
function niceStep(v){ if(v<=0) return 1; const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p; }
function colTable(cats,labels,series,tipTitle,tg,unit="t"){
  const tot=cats.map((_,i)=>series.reduce((a,s)=>a+(s.vals[i]||0),0)), T=tot.reduce((a,b)=>a+b,0), TG=tg?tg.reduce((a,b)=>a+b,0):0;
  return {h:["Periode",...series.map(s=>`${s.n} (${unit})`),`Total (${unit})`,...(tg?["Target (t)","Capaian"]:[])], r:cats.map((c,i)=>[tipTitle?tipTitle(i):labels[i],...series.map(s=>s.vals[i]?fmt(s.vals[i]):"–"),fmt(tot[i]),...(tg?[fmt(tg[i]),pct(tg[i]?tot[i]/tg[i]*100:null)]:[])]),
          f:["Total",...series.map(s=>fmt(s.vals.reduce((a,b)=>a+(b||0),0))),fmt(T),...(tg?[fmt(TG),pct(TG?T/TG*100:null)]:[])]};
}
/* ---------- label data grafik (angka di setiap batang / titik) ---------- */
const DLF = {
  full: v => new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(v),
  cmp: v => { const a=Math.abs(v), f=(x,d)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:d,minimumFractionDigits:d}).format(x);
    return a>=1e6 ? f(v/1e6,2)+"jt" : a>=1e4 ? f(v/1e3,1)+"rb" : a>=1e3 ? f(v/1e3,2)+"rb" : f(v, a<10&&a%1?1:0); }
};
const dlW = s => String(s).length*6+10;
const dlPick = (v, room, full, cmp) => { const f=(full||DLF.full)(v); return dlW(f)<=room ? f : (cmp||DLF.cmp)(v); };
function dlChip(x, yTop, txt, col, dy=3){ const w=dlW(txt), h=16, y=yTop-h-dy;
  return `<g pointer-events="none"><rect x="${(x-w/2).toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" rx="8" fill="var(--surface-solid)" stroke="${col}" stroke-width="1.3"/><text x="${x.toFixed(1)}" y="${(y+11.5).toFixed(1)}" text-anchor="middle" style="font-size:10px;font-weight:700;fill:${col}">${txt}</text></g>`; }
function dlRot(x, yTop, txt, col){ const xx=(x+3.5).toFixed(1), yy=(yTop-5).toFixed(1); return `<text x="${xx}" y="${yy}" transform="rotate(-90 ${xx} ${yy})" pointer-events="none" style="font-size:9.5px;font-weight:700;fill:${col}">${txt}</text>`; }
function dlIn(x, yMid, txt){ return `<text x="${x.toFixed(1)}" y="${(yMid+3.4).toFixed(1)}" text-anchor="middle" pointer-events="none" style="font-size:9px;font-weight:700;fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.28);stroke-width:2.2px">${txt}</text>`; }
function dlPt(x, y, txt, col, below){ return `<text x="${x.toFixed(1)}" y="${(below?y+15:y-8).toFixed(1)}" text-anchor="middle" pointer-events="none" style="font-size:10px;font-weight:700;fill:${col};paint-order:stroke;stroke:var(--surface-solid);stroke-width:3px">${txt}</text>`; }
function dlPlan(vals, band, full, cmp){ const room=band-2, C=cmp||DLF.cmp, Fu=full||DLF.full, chip=vals.every(v=>!v || dlW(C(v))<=room);
  const allFull=chip && vals.every(v=>!v || dlW(Fu(v))<=room);   /* satu grafik satu format: semua penuh atau semua ringkas */
  const txt=vals.map(v=>v ? (allFull ? Fu(v) : C(v)) : "");
  return {chip, txt, head: chip ? 22 : Math.max(0,...txt.map(t=>t.length*5.7))+10}; }
function cols(el,{cats,labels,series,h=270,line,lineName,marks,tipTitle,onClick,dimFn,tgts,unit="t",noDL}){
  const W=Math.max(el.clientWidth,260), m={l:48,r:8,t:16,b:26}, iw=W-m.l-m.r;
  const tot=cats.map((_,i)=>series.reduce((a,s)=>a+(s.vals[i]||0),0)), band=iw/cats.length, bw=Math.min(34,band*0.62);
  const P=noDL?null:dlPlan(tot,band), dcol=series.length===1?series[0].c:"var(--accent)";
  if(P) m.t+=P.head+(marks&&marks.some(Boolean)?14:0);
  const H=h+(P?P.head:0), ih=H-m.t-m.b;
  const raw=Math.max(...tot, line||0, ...(tgts||[]), 0), step=niceStep(raw/4||1), nt=Math.max(1,Math.ceil(raw/step)), mx=step*nt;
  const y=v=>m.t+ih-v/mx*ih;
  let g="";
  for(let k=0;k<=nt;k++){ const v=step*k, yy=y(v);
    g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${yy}" y2="${yy}" stroke="${k?"var(--grid)":"var(--axis)"}" ${k?'stroke-dasharray="3 4"':""}/>`;
    g+=`<text x="${m.l-8}" y="${yy+4}" text-anchor="end">${short(v)}</text>`; }
  const every=Math.ceil(cats.length/Math.max(1,Math.floor(iw/30)));
  const top=(x,yy,w,hh,c,dim)=>{ const r=Math.min(4,hh,w/2); return `<path d="M${x},${yy+hh} V${yy+r} Q${x},${yy} ${x+r},${yy} H${x+w-r} Q${x+w},${yy} ${x+w},${yy+r} V${yy+hh} Z" fill="${c}"${dim}/>`; };
  cats.forEach((c,i)=>{ const cx=m.l+band*i+band/2;
    if(i%every===0) g+=`<text x="${cx}" y="${H-7}" text-anchor="middle">${labels[i]}</text>`;
    const dim=dimFn&&dimFn(i)?' opacity=".25"':"";
    let acc=0; const vis=series.filter(s=>(s.vals[i]||0)>0);
    vis.forEach((s,si)=>{ const v=s.vals[i], y0=y(acc), y1=y(acc+v); acc+=v; const x=cx-bw/2, hh=Math.max(y0-y1-(si?2:0),0.5);
      g+= si===vis.length-1&&hh>3 ? top(x,y1,bw,hh,s.c,dim) : `<rect x="${x}" y="${y1}" width="${bw}" height="${hh}" fill="${s.c}"${dim}/>`;
      if(P && !dim && vis.length>1 && hh>=14){ const t=dlPick(v,bw+4); if(t.length*5.3<=bw+3) g+=dlIn(cx,(y0+y1)/2,t); } });
    if(tgts&&tgts[i]) g+=`<line x1="${cx-bw/2-5}" x2="${cx+bw/2+5}" y1="${y(tgts[i])}" y2="${y(tgts[i])}" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" pointer-events="none"/>`;
    const yTop=Math.min(y(tot[i]), tgts&&tgts[i]?y(tgts[i])-2:1e9);
    if(P && P.txt[i] && !dim) g+= P.chip ? dlChip(cx,yTop,P.txt[i],dcol) : dlRot(cx,yTop,P.txt[i],dcol);
    if(marks&&marks[i]) g+=`<text x="${cx}" y="${yTop-6-(P&&P.txt[i]?(P.chip?20:P.txt[i].length*5.7+6):0)}" text-anchor="middle" style="font-size:9.5px;font-weight:600;fill:var(--accent)">${marks[i]}</text>`;
    g+=`<rect class="hit" data-i="${i}" x="${m.l+band*i}" y="${m.t}" width="${band}" height="${ih}" fill="transparent" style="cursor:${onClick?"pointer":"default"}"/>`; });
  if(line) g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y(line)}" y2="${y(line)}" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="6 4" pointer-events="none"/><text x="${m.l+4}" y="${y(line)+13}" text-anchor="start" pointer-events="none" style="font-weight:700;fill:var(--ink-2);paint-order:stroke;stroke:var(--surface-solid);stroke-width:3px">${lineName||"Target"} ${fmt(line)}</text>`;
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" role="img">${g}</svg>`;
  el.querySelectorAll(".hit").forEach(r=>{ const i=+r.dataset.i;
    r.onmousemove=e=>tip(e, tipTitle?tipTitle(i):labels[i], series.filter(s=>s.vals[i]).map(s=>({n:s.n,c:s.c,v:fmt(s.vals[i])+" "+unit})).concat(line?[{n:lineName||"Target",v:fmt(line)+" "+unit}]:[]).concat(tgts&&tgts[i]?[{n:"Target",v:fmt(tgts[i])+" "+unit},{n:"Capaian",v:pct(tot[i]/tgts[i]*100)}]:[]), series.length>1?fmt(tot[i])+" "+unit:null);
    r.onmouseleave=hide; if(onClick) r.onclick=()=>{hide(); onClick(i);}; });
}
/* grup bertumpuk: beberapa batang bertumpuk per kategori, masing-masing dengan penanda target */
function gcols(el,{cats,labels,groups,h=280,tipTitle}){
  const tot=groups.map(g=>cats.map((_,i)=>g.series.reduce((a,s)=>a+(s.vals[i]||0),0)));
  const head=Math.max(0,...tot.flat().map(v=>v?DLF.cmp(v).length*5.7:0))+12;
  const W=Math.max(el.clientWidth,260), H=h+head, m={l:48,r:8,t:16+head,b:26}, iw=W-m.l-m.r, ih=H-m.t-m.b;
  const raw=Math.max(0,...tot.flat(),...groups.flatMap(g=>g.tg||[])), step=niceStep(raw/4||1), nt=Math.max(1,Math.ceil(raw/step)), mx=step*nt;
  const y=v=>m.t+ih-v/mx*ih, band=iw/cats.length, ng=groups.length, gap=4, bw=Math.min(24,(band*0.72-gap*(ng-1))/ng);
  let g="";
  for(let k=0;k<=nt;k++){ const yy=y(step*k); g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${yy}" y2="${yy}" stroke="${k?"var(--grid)":"var(--axis)"}" ${k?'stroke-dasharray="3 4"':""}/><text x="${m.l-8}" y="${yy+4}" text-anchor="end">${short(step*k)}</text>`; }
  cats.forEach((c,i)=>{ const cx=m.l+band*i+band/2, x0=cx-(ng*bw+(ng-1)*gap)/2;
    g+=`<text x="${cx}" y="${H-7}" text-anchor="middle">${labels[i]}</text>`;
    groups.forEach((gr,gi)=>{ const x=x0+gi*(bw+gap); let acc=0;
      const vis=gr.series.filter(s=>(s.vals[i]||0)>0);
      vis.forEach((s,si)=>{ const v=s.vals[i], y0=y(acc), y1=y(acc+v); acc+=v; g+=`<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(y0-y1-(si?1.5:0),0.5)}" rx="${si===vis.length-1?3:0}" fill="${s.c}"/>`; });
      if(gr.tg&&gr.tg[i]) g+=`<line x1="${x-3}" x2="${x+bw+3}" y1="${y(gr.tg[i])}" y2="${y(gr.tg[i])}" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>`;
      if(tot[gi][i]) g+=dlRot(x+bw/2-1, Math.min(y(tot[gi][i]), gr.tg&&gr.tg[i]?y(gr.tg[i])-2:1e9), DLF.cmp(tot[gi][i]), gr.lc||(gr.series.length===1?gr.series[0].c:"var(--accent)")); });
    g+=`<rect class="hit" data-i="${i}" x="${m.l+band*i}" y="${m.t}" width="${band}" height="${ih}" fill="transparent"/>`; });
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" role="img">${g}</svg>`;
  el.querySelectorAll(".hit").forEach(r=>{ const i=+r.dataset.i;
    r.onmousemove=e=>{ const rows=[]; groups.forEach((gr,gi)=>{ rows.push({n:`<b>${gr.n}</b>`,v:`<b>${fmt(tot[gi][i])} t</b>`});
        gr.series.filter(s=>s.vals[i]).forEach(s=>rows.push({n:"&nbsp;&nbsp;"+s.n,c:s.c,v:fmt(s.vals[i])+" t"}));
        if(gr.tg&&gr.tg[i]) rows.push({n:"&nbsp;&nbsp;Target · capaian",v:`${fmt(gr.tg[i])} t · ${pct(tot[gi][i]/gr.tg[i]*100)}`}); });
      tip(e, tipTitle?tipTitle(i):labels[i], rows); };
    r.onmouseleave=hide; });
}
/* kumulatif tahunan actual vs RKAP */
function cumYear(el, act, tgt){
  const W=Math.max(el.clientWidth,240), H=250, m={l:50,r:12,t:34,b:24}, iw=W-m.l-m.r, ih=H-m.t-m.b, n=12;
  const raw=Math.max(...act,...tgt,1), step=niceStep(raw/4), nt=Math.ceil(raw/step), mx=step*nt;
  const x=i=>m.l+i*iw/(n-1), y=v=>m.t+ih-v/mx*ih, path=a=>a.map((v,i)=>`${i?"L":"M"}${x(i)},${y(v)}`).join(" ");
  let g=""; for(let k=0;k<=nt;k++){ const yy=y(step*k); g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${yy}" y2="${yy}" stroke="${k?"var(--grid)":"var(--axis)"}" ${k?'stroke-dasharray="3 4"':""}/><text x="${m.l-8}" y="${yy+4}" text-anchor="end">${short(step*k)}</text>`; }
  BLN.forEach((b,i)=>g+=`<text x="${x(i)}" y="${H-6}" text-anchor="middle">${b}</text>`);
  const L=act.length-1;
  g+=`<path d="M${x(L)},${y(act[L])} L${x(L)},${y(tgt[11])}" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="2 3" opacity=".7"/>`;
  g+=`<path d="${path(tgt)}" fill="none" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="6 4"/>${tgt.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="2.5" fill="var(--ink-2)"/>`).join("")}`;
  g+=`<path d="${path(act)} L${x(L)},${y(0)} L${x(0)},${y(0)} Z" fill="var(--accent)" opacity=".12"/><path d="${path(act)}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${act.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="var(--surface-solid)" stroke="var(--accent)" stroke-width="2"/>`).join("")}`;
  const kk=Math.max(1,Math.ceil(44/(iw/(n-1))));
  act.forEach((v,i)=>{ if(i%kk===0||i===L) g+=dlPt(x(i),y(v),DLF.cmp(v),"var(--accent)", v<tgt[i]); });
  g+=dlChip(Math.min(x(11),W-m.r-dlW(DLF.cmp(tgt[11]))/2), y(tgt[11])-2, "RKAP "+DLF.cmp(tgt[11]), "var(--ink-2)");
  for(let i=0;i<n;i++) g+=`<rect class="hit" data-i="${i}" x="${x(i)-iw/(n-1)/2}" y="${m.t}" width="${iw/(n-1)}" height="${ih}" fill="transparent"/>`;
  el.innerHTML=`<div class="legend"><span><i style="background:var(--accent)"></i>Actual kumulatif</span><span><i class="ln"></i>RKAP kumulatif</span><span><i style="background:var(--bad);opacity:.7"></i>Sisa ke RKAP setahun</span></div><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" role="img">${g}</svg>`;
  el.querySelectorAll(".hit").forEach(r=>{ const i=+r.dataset.i; r.onmousemove=e=>tip(e,`s/d ${BLNF[i]} 2026`,[{n:"Actual",c:"var(--accent)",v:act[i]!=null?fmt(act[i])+" t":"belum ada"},{n:"RKAP",v:fmt(tgt[i])+" t"},...(act[i]!=null?[{n:"Capaian",v:pct(act[i]/tgt[i]*100)},{n:"Selisih",v:(act[i]-tgt[i]>=0?"+":"−")+fmt(Math.abs(act[i]-tgt[i]))+" t"}]:[])]); r.onmouseleave=hide; });
}
/* kumulatif vs target */
function cumChart(el, act, tgt, name){
  const W=Math.max(el.clientWidth,240), H=210, m={l:48,r:10,t:30,b:24}, iw=W-m.l-m.r, ih=H-m.t-m.b, n=DIM;
  const raw=Math.max(...act,...(tgt||[]),1), step=niceStep(raw/4), nt=Math.ceil(raw/step), mx=step*nt;
  const x=i=>m.l+i*iw/(n-1), y=v=>m.t+ih-v/mx*ih;
  let g=""; for(let k=0;k<=nt;k++){ const yy=y(step*k); g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${yy}" y2="${yy}" stroke="${k?"var(--grid)":"var(--axis)"}" ${k?'stroke-dasharray="3 4"':""}/><text x="${m.l-8}" y="${yy+4}" text-anchor="end">${short(step*k)}</text>`; }
  [0,4,9,14,19,24,n-1].filter((v,i,a)=>v<n&&a.indexOf(v)===i).forEach(i=>g+=`<text x="${x(i)}" y="${H-6}" text-anchor="middle">${i+1}</text>`);
  const path=a=>a.map((v,i)=>`${i?"L":"M"}${x(i)},${y(v)}`).join(" ");
  if(tgt) g+=`<path d="${path(tgt)}" fill="none" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="6 4"/>`;
  g+=`<path d="${path(act)} L${x(act.length-1)},${y(0)} L${x(0)},${y(0)} Z" fill="var(--accent)" opacity=".12"/><path d="${path(act)}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
  g+=`<circle cx="${x(act.length-1)}" cy="${y(act[act.length-1])}" r="4" fill="var(--surface-solid)" stroke="var(--accent)" stroke-width="2.5"/>`;
  { const L=act.length-1, kk=Math.max(1,Math.ceil(44/(iw/(n-1))));
    act.forEach((v,i)=>{ if((i%kk===0&&L-i>=kk)||i===L){ if(i!==L) g+=`<circle cx="${x(i)}" cy="${y(v)}" r="2.5" fill="var(--accent)"/>`; g+=dlPt(x(i),y(v),DLF.cmp(v),"var(--accent)"); } });
    if(tgt) g+=dlChip(Math.min(x(n-1),W-m.r-dlW("Target "+DLF.cmp(tgt[n-1]))/2), y(tgt[n-1])-2, "Target "+DLF.cmp(tgt[n-1]), "var(--ink-2)"); }
  for(let i=0;i<n;i++) g+=`<rect class="hit" data-i="${i}" x="${x(i)-iw/(n-1)/2}" y="${m.t}" width="${iw/(n-1)}" height="${ih}" fill="transparent"/>`;
  el.innerHTML=`<div class="legend"><span><i style="background:var(--accent)"></i>Aktual kumulatif${name?" "+name:""}</span>${tgt?'<span><i class="ln"></i>Target kumulatif</span>':""}</div><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" role="img">${g}</svg>`;
  el.querySelectorAll(".hit").forEach(r=>{ const i=+r.dataset.i; r.onmousemove=e=>tip(e,`s/d ${dStr(i)}`,[{n:"Aktual",c:"var(--accent)",v:act[i]!=null?fmt(act[i])+" t":"belum ada"},...(tgt?[{n:"Target",v:fmt(tgt[i])+" t"}]:[]),...(tgt&&act[i]!=null?[{n:"Capaian",v:pct(act[i]/tgt[i]*100)}]:[])]); r.onmouseleave=hide; });
}
/* horizontal bars */
function hbars(el, items, extra){
  if(!items.length){ el.innerHTML='<div class="empty">Tidak ada data untuk filter ini</div>'; return; }
  const mx=Math.max(...items.map(it=>it.total),1);
  el.innerHTML=items.map((it,k)=>`<div class="hbr" data-k="${k}"><span class="lb" title="${it.label}">${it.html||it.label}</span><span class="tr">${it.segs.filter(s=>s.v>0).map(s=>`<b style="width:${s.v/mx*100}%;background:${s.c}"></b>`).join("")}</span><span class="vl">${fmt(it.total)}${extra?` <em>(${extra(it)})</em>`:""}</span></div>`).join("");
  el.querySelectorAll(".hbr").forEach(row=>{ const it=items[+row.dataset.k];
    row.onmousemove=e=>tip(e,it.label,it.segs.filter(s=>s.v>0).map(s=>({n:s.n,c:s.c,v:fmt(s.v)+" t"})).concat(it.n!=null?[{n:"Ritase",v:fmt(it.n)}]:[]), it.segs.filter(s=>s.v>0).length>1?fmt(it.total)+" t":null); row.onmouseleave=hide; });
}
/* donut */
function donut(el, parts, sub){
  const total=parts.reduce((a,p)=>a+p.v,0);
  if(!total){ el.innerHTML='<div class="empty">Tidak ada data</div>'; return; }
  const R=68, C=2*Math.PI*R, gap=parts.filter(p=>p.v>0).length>1?3:0; let off=0, arcs="";
  parts.forEach((p,i)=>{ if(!p.v) return; const len=p.v/total*C, dl=Math.max(len-gap,0.5);
    arcs+=`<circle class="arc" data-i="${i}" cx="85" cy="85" r="${R}" fill="none" stroke="${p.c}" stroke-width="22" stroke-dasharray="${dl} ${C-dl}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)"/>`;
    const sh=p.v/total; if(sh>=0.05){ const a=(off+len/2)/C*2*Math.PI-Math.PI/2; arcs+=`<text x="${(85+R*Math.cos(a)).toFixed(1)}" y="${(85+R*Math.sin(a)+3.5).toFixed(1)}" text-anchor="middle" pointer-events="none" style="font-size:10px;font-weight:800;fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.3);stroke-width:2.4px">${Math.round(sh*100)}%</text>`; }
    off+=len; });
  el.innerHTML=`<svg width="170" height="170" viewBox="0 0 170 170" role="img"><circle cx="85" cy="85" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="22"/>${arcs}
    <text x="85" y="82" text-anchor="middle" style="fill:var(--ink);font-size:21px;font-weight:800">${short(total)}</text><text x="85" y="102" text-anchor="middle" style="font-size:11px">${sub}</text></svg>
    <div class="dl-list">${parts.filter(p=>p.v>0).map(p=>`<div><span><i style="background:${p.c}"></i>${p.n}</span><b>${nf1.format(p.v/total*100)}%</b></div><small>${fmt(p.v)} t</small>`).join("")}</div>`;
  el.querySelectorAll(".arc").forEach(a=>{ const p=parts[+a.dataset.i]; a.onmousemove=e=>tip(e,p.n,[{n:"Tonase",c:p.c,v:fmt(p.v)+" t"},{n:"Porsi",v:nf1.format(p.v/total*100)+"%"}]); a.onmouseleave=hide; });
}
/* sparkline */
function spark(vals, activeIdx){
  if(!vals.length) return "";
  const W=260,H=46,p=5, mx=Math.max(...vals,1), mn=Math.min(...vals,0);
  const xs=vals.map((_,i)=>p+i*(W-2*p)/Math.max(vals.length-1,1)), ys=vals.map(v=>H-p-(v-mn)/(mx-mn||1)*(H-2*p));
  let d=`M${xs[0]},${ys[0]}`; for(let i=1;i<xs.length;i++){ const cx=(xs[i-1]+xs[i])/2; d+=` C${cx},${ys[i-1]} ${cx},${ys[i]} ${xs[i]},${ys[i]}`; }
  const gid="sg"+Math.random().toString(36).slice(2,8);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--c);stop-opacity:0"/></linearGradient></defs><path d="${d} L${xs[xs.length-1]},${H} L${xs[0]},${H} Z" fill="url(#${gid})"/><path d="${d}" fill="none" style="stroke:var(--c)" stroke-width="2" vector-effect="non-scaling-stroke"/>${activeIdx!=null&&activeIdx>=0?`<circle cx="${xs[activeIdx]}" cy="${ys[activeIdx]}" r="4" style="fill:var(--surface-solid);stroke:var(--c)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`:""}</svg>`;
}
const ICON = {
  port:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 15h18l-2 5H5l-2-5Zm3 0V9h12v6M12 9V4"/></svg>',
  truck:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 16V7h11v9M13 10h4l4 4v2h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/></svg>',
  ton:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/></svg>',
  chart:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18M6 16l4-5 4 3 5-7"/></svg>',
  cal:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  rit:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/></svg>',
  truck2:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 16V7h11v9M13 10h4l4 4v2h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/></svg>',
  goal:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
  warn:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.5"/></svg>',
  info:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
};
const dchip = (v,lab) => v==null||!isFinite(v) ? "" : `<span class="d${v<100?" down":""}">${v>=100?"↑":"↓"} ${nf1.format(v)}%${lab?" "+lab:""}</span>`;

/* ---------- achievement ---------- */
function achCalc(route=st.route){
  const ag=runAgg(route,FULL), frac=LASTD/DIM, rem=DIM-LASTD;
  const mk=(c,name,col,T,a,trip)=>{ const e=T*frac; return {c,name,col,T,a,e,trip,pE:e?a/e*100:null,pT:T?a/T*100:null,need:rem>0?Math.max(T-a,0)/rem:0,avg:a/LASTD,proj:a/LASTD*DIM}; };
  const rows=selM().map(c=>{ const i=M.indexOf(c); return mk(c,MN[c],MCOL[c],tgtM(route,c,MO-1),ag.m[i].ton,ag.m[i].trip); });
  const tot=mk("TOTAL", selM().length===M.length?"Semua mitra":selM().join(", "), "var(--accent)", rows.reduce((s,r)=>s+r.T,0), rows.reduce((s,r)=>s+r.a,0), rows.reduce((s,r)=>s+r.trip,0));
  return {rows, tot, rem};
}
function blHTML(r, isTot, rem){
  const mx=Math.max(r.T, r.a, 1), status=!r.T?"na":r.a>=r.e?"ahead":"behind";
  return `<div class="bl${isTot?" tot":""}">
    <div class="bl-h"><span class="nm">${isTot?`<i style="background:${r.col}"></i>`:logoHTML(r.c)}<span class="tx"><b>${r.c}</b><small>${r.name}</small></span></span><span class="pill ${status}">${status==="na"?"Tanpa target":status==="ahead"?"▲ Ahead":"▼ Behind"} ${r.pE!=null?pct(r.pE):""}</span></div>
    <div class="bl-tr" role="img" aria-label="${r.c}: aktual ${fmt(r.a)} ton, target s/d hari ini ${fmt(r.e)} ton, target bulanan ${fmt(r.T)} ton">
      <div class="bl-fill" style="width:${r.a/mx*100}%;background:${r.col}"></div>
      ${r.T?`<div class="bl-mk" style="left:${r.e/mx*100}%"></div><div class="bl-end" style="left:${r.T/mx*100}%"></div>`:""}
    </div>
    <div class="bl-n">
      <div><span>Aktual MTD</span><b>${fmt(r.a)}<small>t</small></b></div>
      <div><span>Target s/d tgl ${LASTD}</span><b>${fmt(r.e)}<small>t</small></b></div>
      <div><span>Capaian bulanan</span><b>${pct(r.pT)}<small>dari ${short(r.T)}</small></b></div>
      <div><span>${rem?`Perlu/hari (sisa ${rem} hr)`:"Proyeksi"}</span><b class="${r.avg>=r.need?"up":"down"}">${rem?fmt(r.need):fmt(r.proj)}<small>t</small></b></div>
    </div></div>`;
}

function acHTML(r, isTot){
  const st_=!r.T?"na":r.a>=r.e?"ok":"no", dT=r.T/DIM, pD=dT?r.avg/dT*100:null, dst=!r.T?"na":r.avg>=dT?"ok":"no";
  const v=r.a-r.e, k=x=>(x<0?"−":"+")+nf1.format(Math.abs(x)/1000)+"K";
  const box=(cls,lab,p,big,w,fl,fr,extra)=>`<div class="bx" style="--st:var(--${cls==="ok"?"good":cls==="no"?"bad":"muted"})${isTot?`;--st:${cls==="ok"?"#6ee7b7":cls==="no"?"#fca5a5":"#fff"}`:""}"><div class="t"><span>${lab}</span></div><div class="a"><span>${big}</span><b>${pct(p)}</b></div><div class="br"><i style="width:${Math.min(100,p||0)}%"></i></div><div class="f"><b>${fl}</b><span>${fr}</span></div>${extra||""}</div>`;
  return `<div class="acc ${st_}${isTot?" tot":""}" style="--mc:${isTot?"#a5b4fc":r.col}">
    <div class="hd"><span class="cd">${isTot?"":logoHTML(r.c,"lg sm")}<b>${r.c}</b></span><span class="pill ${st_==="ok"?"ahead":st_==="no"?"behind":"na"}">${st_==="ok"?"● Ahead":st_==="no"?"● Behind":"Tanpa target"}</span></div>
    <div><div class="k">Monthly target</div><div class="vv">${fmt(r.T)}</div><div class="u">ton</div></div>
    <div><div class="k" title="Target s/d hari ini = ${nf1.format(LASTD/DIM*100)}% dari target bulanan">Expected MTD · ${nf1.format(LASTD/DIM*100)}%</div><div class="vv">${fmt(r.e)}</div><div class="u">ton</div></div>
    ${box(st_,"Progress vs MTD",r.pE,`${fmt(r.a)} ton`,0,`${k(v)} ton`,`${fmt(r.trip)} trips`,`<div class="m">Monthly achievement <b>${pct(r.pT)}</b> · ${nf1.format(r.a/1000)}K / ${nf1.format(r.T/1000)}K</div>`)}
    <div class="sep"></div>
    <div><div class="k">Daily target</div><div class="vv">${fmt(dT)}</div><div class="u">ton/hari</div></div>
    ${box(dst,"Rata-rata harian",pD,`${nf1.format(r.avg)} ton`,0,`vs target ${fmt(dT)}`,`${nf1.format(r.trip/LASTD)} trip/hari`)}
  </div>`;
}
/* ---------- render ---------- */
/* ---------- running text info penting ---------- */
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
/* kunci running text + filter: tombol Filter (HP), tinggi untuk kartu sticky, bayangan saat menempel */
(function(){ const lb=document.getElementById("lockbar"), bt=document.getElementById("lkFt"); if(!lb) return;
  if(bt) bt.onclick=()=>{ const o=!lb.classList.contains("open"); lb.classList.toggle("open",o); bt.setAttribute("aria-expanded",o); bt.querySelector("span").textContent=o?"Tutup filter":"Filter"; };
  const setH=()=>{ if(lb.parentElement) lb.parentElement.style.setProperty("--lockH", lb.offsetHeight+"px"); };
  setH(); if(window.ResizeObserver) new ResizeObserver(setH).observe(lb);
  addEventListener("scroll",()=>lb.classList.toggle("stuck", lb.getBoundingClientRect().top<=10), {passive:true});
})();
function render(){
  hide(); drawRP();
  fRoute.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===st.route));
  yRoute.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===st.yRoute));
  mRoute.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===st.route));
  rRoute.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===st.route));
  fMitra.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed", st.mitra.has(+b.dataset.i)));
  const ms=selM(), mLab=ms.length===M.length?"semua mitra":ms.join(", ");
  const R=st.route, ag=runAgg(R), ag02=runAgg("H02"), ag1=runAgg("H1");
  const nd=st.d1-st.d0+1, days=[...Array(LASTD).keys()];

  /* header */
  eyebrow.textContent=`Performa coal hauling · ${BLNF[MO-1]} ${Y}`;
  sub.textContent=`Data harian s/d ${dName(LASTD-1)}, ${dStr(LASTD-1)} · hari ke-${LASTD} dari ${DIM}`;
  periodTxt.textContent=rangeText();
  stamp.innerHTML=`Diperbarui<br>${META.generated}`;
  pinfo.textContent=`Periode ${rangeText()} · ${mLab} · sumber ${META.source}`;

  /* KPI */
  const Tm=route=>ms.reduce((s,c)=>s+tgtM(route,c,MO-1),0), T02=Tm("H02"), T1=Tm("H1"), TR=Tm(R), Tday=TR/DIM;
  const ytdM=r=>yMonths.map(k=>ms.reduce((a,c)=>a+yVal(k,c,r),0)), y02=ytdM("H02"), y1=ytdM("H1");
  const sum=a=>a.reduce((x,y)=>x+y,0);
  const ytdT=r=>yMonths.reduce((s,k)=>s+ms.reduce((a,c)=>a+tgtM(r,c,k),0)*(k===CUR?LASTD/DIM:1),0);
  logos.innerHTML=M.map(c=>`<div class="lgi" style="${st.mitra.has(M.indexOf(c))?"":"opacity:.45"}">${logoHTML(c)}<div><b>${c}</b>${MN[c].replace("PT ","")}</div></div>`).join("");
  const dSum=a=>a.day.slice(st.d0,st.d1+1).map(r=>sum(r));
  const kpi=(c,ic,l,v,d,n,sp,ai,sub)=>`<div class="kpi${sub?" clk":""}" style="--c:${c}"${sub?` data-sub="${sub}" role="button" tabindex="0" aria-pressed="${st.sub===sub}" aria-label="${l}: tampilkan detail"`:""}>${sub?`<span class="kh">${st.sub===sub?"Tutup ▴":"Detail ▾"}</span>`:""}<div class="hd"><div class="ic">${ic}</div><div style="min-width:0"><div class="l">${l}</div><div class="v">${v}${d}</div></div></div><div class="n" title="${n.replace(/<[^>]+>/g,"")}">${n}</div>${spark(sp,ai)}</div>`;
  const empty1=A.st1.slice(0,NMON).map((s,k)=>s==="none"?BLN[k]:null).filter(Boolean);
  ringkasan.innerHTML=
    kpi("var(--k1)",ICON.port,"H0+H2 · Port SBL",`${fmt(ag02.ton)}<small>t</small>`, T02?dchip(ag02.ton/(T02/DIM*nd)*100):"", `${fmt(ag02.trip)} rit · target ${allRange()?"MTD":"periode"} ${fmt(T02/DIM*nd)} t`, dSum(ag02), nd-1, "H02")
   +kpi("var(--k4)",ICON.truck,"H1 · CPP → ISP61",`${fmt(ag1.ton)}<small>t</small>`, T1?dchip(ag1.ton/(T1/DIM*nd)*100):"", `${fmt(ag1.trip)} rit · target ${allRange()?"MTD":"periode"} ${fmt(T1/DIM*nd)} t`, dSum(ag1), nd-1, "H1")
   +kpi("var(--k2)",ICON.ton,"YTD 2026 · H0+H2",`${short(sum(y02))}<small>t</small>`, ytdT("H02")?dchip(sum(y02)/ytdT("H02")*100):"", `${fmt(sum(y02))} t · target RKAP YTD ${fmt(ytdT("H02"))} t`, y02, NMON-1)
   +kpi("var(--k3)",ICON.chart,"YTD 2026 · H1",`${short(sum(y1))}<small>t</small>`, ytdT("H1")?dchip(sum(y1)/ytdT("H1")*100):"", `${fmt(sum(y1))} t · target ${fmt(ytdT("H1"))} t${empty1.length?` · ${empty1.join(", ")} belum ada data`:""}`, y1, NMON-1);
  const ac=achCalc(R);
  minis.hidden=!st.sub;
  if(st.sub){ const S=st.sub, aS=S==="H02"?ag02:ag1, TS=Tm(S), TdS=TS/DIM, opd=Math.max(aS.days,1), rit=aS.unitDay?aS.trip/aS.unitDay:0, proj=achCalc(S).tot.proj;
    const mini=(ic,l,v,s)=>`<div class="mini"><div class="dot">${ic}</div><div style="min-width:0"><div class="l">${l}</div><div class="v">${v}</div><div class="s" title="${s}">${s}</div></div></div>`;
    minis.innerHTML=
       mini(ICON.cal,`Rata-rata harian · ${ROUTE[S].n}`,`${fmt(aS.ton/opd)}<small>t/hari</small>`, TS?`target ${fmt(TdS)} t/hari (${pct(aS.ton/opd/TdS*100)})`:`${aS.days} hari operasi`)
      +mini(ICON.rit,`Ritase · ${ROUTE[S].n}`,`${nf2.format(rit)}<small>rit/DT/hari</small>`,`${fmt(aS.dt)} DT aktif · ${fmt(aS.unitDay)} unit-hari`)
      +mini(ICON.truck2,`Rata-rata muatan · ${ROUTE[S].n}`,`${nf2.format(aS.trip?aS.ton/aS.trip:0)}<small>t/rit</small>`,`${fmt(aS.trip)} rit`)
      +mini(ICON.goal,`Proyeksi akhir bulan · ${ROUTE[S].n}`,`${short(proj)}<small>t</small>`, TS?`${pct(proj/TS*100)} dari target ${short(TS)} t`:"tanpa target"); }

  /* achievement */
  achSub.textContent=`· ${ROUTE[R].n} · s/d ${dStr(LASTD-1)} · sisa ${ac.rem} hari`;
  tAch.textContent=`${ROUTE[R].l} vs target · ${ROUTE[R].n}`;
  pAch.textContent=`Ton · target ${TGLAB[R]} ${BLNF[MO-1]} · target s/d hari ini = target bulanan × ${LASTD}/${DIM} hari · ikut filter route & mitra, tidak terpengaruh filter tanggal`;
  if(showTable.ach) cAch.innerHTML=tableHTML({h:["Mitra","Target bulanan (t)","Target s/d hari ini (t)","Aktual (t)","Rit","Capaian s/d hari ini","Capaian bulanan","Rata-rata/hari (t)","Perlu/hari (t)","Proyeksi (t)"],
    r:ac.rows.map(r=>[`<span class="tag"><i style="background:${r.col}"></i>${r.c}</span>`,fmt(r.T),fmt(r.e),fmt(r.a),fmt(r.trip),pct(r.pE),pct(r.pT),fmt(r.avg),fmt(r.need),fmt(r.proj)]),
    f:["Total",fmt(ac.tot.T),fmt(ac.tot.e),fmt(ac.tot.a),fmt(ac.tot.trip),pct(ac.tot.pE),pct(ac.tot.pT),fmt(ac.tot.avg),fmt(ac.tot.need),fmt(ac.tot.proj)]});
  else cAch.innerHTML=`<div class="acg">${ac.rows.map(r=>acHTML(r,false)).join("")}${acHTML(ac.tot,true)}</div>`;
  nAch.textContent=`Expected MTD = target bulanan × ${LASTD}/${DIM} hari. Rata-rata harian & trip/hari = aktual ÷ ${LASTD} hari berjalan. ${ac.rem?`Untuk mencapai target bulanan, perlu ${fmt(ac.tot.need)} t/hari selama ${ac.rem} hari tersisa.`:""}`;

  /* harian */
  harSub.textContent=`· ${ROUTE[R].l} · ${rangeText()} · ${mLab}`;
  tDay.textContent=`Tonase harian per mitra · ${ROUTE[R].n}`;
  pDay.textContent=`${ROUTE[R].l} · ton per hari (mode shift) · sumber ${ROUTE[R].s} · klik batang untuk pilih hari`;
  bigDay.innerHTML=`<b>${fmt(ag.ton)} t</b><span class="vs">${fmt(ag.trip)} rit · ${ag.days} hari operasi${TR?` · garis putus = target harian ${fmt(Tday)} t`:""}</span>`;
  lgDay.innerHTML=ms.map(c=>`<span><i style="background:${MCOL[c]}"></i>${c}</span>`).join("")+(TR?`<span><i class="ln"></i>Target harian</span>`:"");
  const dayAll=runAgg(R,FULL);
  const sDay=ms.map(c=>{ const i=M.indexOf(c); return {n:c,c:MCOL[c],vals:days.map(d=>dayAll.day[d][i])}; });
  const dTT=d=>`${dName(d)}, ${dStr(d)}`;
  if(showTable.day){ const t=colTable(days,days.map(d=>d+1),sDay.map(s=>({...s,vals:s.vals.map((v,d)=>d>=st.d0&&d<=st.d1?v:0)})),dTT); t.r=t.r.filter((_,d)=>d>=st.d0&&d<=st.d1); cDay.innerHTML=tableHTML(t); }
  else cols(cDay,{cats:days,labels:days.map(d=>d+1),series:sDay,line:TR?Tday:null,lineName:"Target harian",tipTitle:dTT,dimFn:d=>d<st.d0||d>st.d1,
    onClick:d=>{ if(st.d0===d&&st.d1===d){st.d0=0;st.d1=LASTD-1;} else {st.d0=d;st.d1=d;} render(); }});

  /* insight & tipcard */
  const t=ac.tot, ranked=[...ac.rows].filter(r=>r.T).sort((a,b)=>(b.pE||0)-(a.pE||0));
  insight.innerHTML=`<svg class="trophy" width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="var(--accent-soft)"/><path d="M22 18h20v8a10 10 0 0 1-20 0v-8Z" fill="var(--accent)"/><path d="M22 21h-5a5 5 0 0 0 5 7M42 21h5a5 5 0 0 1-5 7M28 36h8v6h-8zM24 46h16" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>
    <div><div class="k">Proyeksi akhir bulan · ${ROUTE[R].n}</div><h3>${t.T?`${pct(t.proj/t.T*100)} dari target bulanan (${short(t.proj)} / ${short(t.T)} t)`:`${short(t.proj)} t`}</h3>
    <p>${t.T&&ac.rem?`Perlu rata-rata ${fmt(t.need)} t/hari selama ${ac.rem} hari tersisa; saat ini ${fmt(t.avg)} t/hari.`:""}${ranked.length>1?` Tertinggi vs target: <b>${ranked[0].c}</b> ${pct(ranked[0].pE)}; terendah: <b>${ranked[ranked.length-1].c}</b> ${pct(ranked[ranked.length-1].pE)}.`:""}</p></div>
    <a href="#achieve">Lihat achievement</a>`;
  (document.getElementById("tipcard")||{}).innerHTML=t.T?`<span class="pill">Capaian s/d hari ini</span><b>${ROUTE[R].n} ${pct(t.pE)} dari target ${short(t.e)} t</b><p>${t.a>=t.e?"Di atas":"Kurang dari"} target ${fmt(Math.abs(t.a-t.e))} t · ${mLab}</p><svg width="110" height="110" viewBox="0 0 24 24" fill="#fff"><path d="M3 15h18l-2 5H5l-2-5Zm3 0V9h12v6M12 9V4"/></svg>`:"";

  /* running text */
  { const a02=achCalc("H02"), a1=achCalc("H1"), t02=a02.tot, t1=a1.tot;
    const tone=p=>p==null||!isFinite(p)?"info":p>=100?"good":p>=90?"warn":"bad";
    const ld=LASTD-1, dlv=sum(runAgg("H02",FULL).day[ld]), Td02=T02/DIM;
    const rk=[...a02.rows].filter(r=>r.T).sort((x,y)=>y.pE-x.pE), lo=rk[rk.length-1];
    const yT=ytdT("H02"), yA=sum(y02);
    const annT=ms.reduce((s,c)=>s+[...Array(12).keys()].reduce((a,k)=>a+tgtM("H02",c,k),0),0), sisa=Math.max(annT-yA,0);
    const remDays=(DIM-LASTD)+[...Array(12).keys()].filter(k=>k>CUR).reduce((s,k)=>s+new Date(Y,k+1,0).getDate(),0);
    tickerRender(ticker,[
      {ic:"truck",tone:tone(t02.pE),tag:"H0+H2 MTD",html:`<b>${fmt(t02.a)} t</b> · ${pct(t02.pE)} dari target s/d tgl ${LASTD} (${fmt(t02.e)} t)`},
      {ic:"truck",tone:tone(t1.pE),tag:"H1 MTD",html:`<b>${fmt(t1.a)} t</b> · ${pct(t1.pE)} dari target s/d tgl ${LASTD} (${fmt(t1.e)} t)`},
      {ic:"cal",tone:tone(Td02?dlv/Td02*100:null),tag:`Hari terakhir · ${dStr(ld)}`,html:`H0+H2 <b>${fmt(dlv)} t</b>${Td02?` vs target harian ${fmt(Td02)} t (${pct(dlv/Td02*100)})`:""}`},
      t02.T&&a02.rem?{ic:"goal",tone:t02.avg>=t02.need?"good":"warn",tag:"Kejar target bulan ini",html:`Perlu <b>${fmt(t02.need)} t/hari</b> selama ${a02.rem} hari · saat ini ${fmt(t02.avg)} t/hari`}:null,
      t02.T?{ic:"trend",tone:tone(t02.proj/t02.T*100),tag:"Proyeksi akhir bulan",html:`H0+H2 <b>${short(t02.proj)} t</b> · ${pct(t02.proj/t02.T*100)} dari target ${short(t02.T)} t`}:null,
      rk.length?{ic:"trophy",tone:"good",tag:"Mitra terbaik",html:`<b>${rk[0].c}</b> ${pct(rk[0].pE)} vs target s/d hari ini`}:null,
      rk.length>1?{ic:"alert",tone:tone(lo.pE),tag:"Perlu perhatian",html:`<b>${lo.c}</b> ${pct(lo.pE)} vs target${lo.e>lo.a?` · kurang ${fmt(lo.e-lo.a)} t`:""}`}:null,
      yT?{ic:"chart",tone:tone(yA/yT*100),tag:"YTD 2026 · H0+H2",html:`<b>${short(yA)} t</b> · ${pct(yA/yT*100)} dari target RKAP YTD`}:null,
      annT?{ic:"flag",tone:"info",tag:"Sisa RKAP 2026",html:sisa?`<b>${fmt(sisa)} t</b> lagi · ${fmt(remDays?sisa/remDays:0)} t/hari s/d 31 Des`:`<b>RKAP setahun sudah tercapai</b>`}:null,
    ]);
  }

  /* donut & kumulatif */
  pMix.textContent=`${ROUTE[R].n} · ${rangeText()}`;
  donut(cMix, ms.map(c=>({n:c,c:MCOL[c],v:ag.m[M.indexOf(c)].ton})), "ton");
  { let s=0; const act=days.map(d=>s+=sum(dayAll.day[d]));
    if(TR){ pCum.textContent=`${ROUTE[R].n} · ${mLab} · target ${TGLAB[R]} · ton kumulatif sejak tgl 1`; cumChart(cCum, act, [...Array(DIM).keys()].map(d=>Tday*(d+1))); }
    else { pCum.textContent=`${ROUTE[R].n} · ${mLab} · target hanya tersedia untuk H0+H2`; cumChart(cCum, act, null, ROUTE[R].n); } }

  /* tahunan */
  const yr=st.yRoute, YL={H02:"H0 + H2 (Port SBL)",H0:"H0 · Mine → Port",H2:"H2 · ISP → Port",H1:"H1 · CPP → ISP"};
  tYear.textContent=`Tonase bulanan per mitra · ${YL[yr]}`;
  const ySer=ms.map(c=>({n:c,c:MCOL[c],vals:yMonths.map(k=>yVal(k,c,yr))}));
  const stOf=k=>yr==="H1"?A.st1[k]:A.st02[k];
  const marks=yMonths.map(k=>({run:"berjalan",unsplit:"blm dipisah",wb:"WB",none:"kosong"})[stOf(k)]||"");
  const yTot=sum(ySer.map(s=>sum(s.vals)));
  pYear.textContent=`Ton · ${mLab} · label di atas batang = status data bulan itu`;
  const pend=(yr==="H0"||yr==="H2")?yMonths.reduce((s,k)=>s+(["unsplit","run","wb"].includes(A.st02[k])?ms.reduce((a,c)=>a+yVal(k,c,"H02"),0):0),0):0;
  const hasTg=yr==="H02"||yr==="H1", yTg=hasTg?yMonths.map(k=>ms.reduce((a,c)=>a+tgtM(yr,c,k),0)):null, yTgYtd=hasTg?ytdT(yr):0;
  bigYear.innerHTML=`<b>${fmt(yTot)} t</b><span class="vs">Jan–${BLN[NMON-1]} 2026${hasTg?` · target ${TGLAB[yr]} YTD ${fmt(yTgYtd)} t → <strong class="${yTot>=yTgYtd?"up":"down"}">${pct(yTot/yTgYtd*100)}</strong>`:""}${pend?` · belum termasuk ${fmt(pend)} t H0+H2 yang belum dipisah / masih berjalan`:""}</span>`;
  lgYear.innerHTML=ms.map(c=>`<span><i style="background:${MCOL[c]}"></i>${c}</span>`).join("")+(hasTg?`<span><i class="tk"></i>Target ${yr==="H1"?`H1 (${RK.h1Pct}% RKAP)`:"RKAP"}</span>`:`<span style="color:var(--muted)">Target RKAP hanya untuk H0+H2 gabungan &amp; H1</span>`);
  const yTT=k=>`${BLNF[k]} 2026 · ${STLAB[stOf(k)]}${k===CUR?` (s/d tgl ${LASTD})`:""}`;
  if(showTable.year) cYear.innerHTML=tableHTML(colTable(yMonths,yMonths.map(k=>BLN[k]),ySer,yTT,yTg));
  else cols(cYear,{cats:yMonths,labels:yMonths.map(k=>BLN[k]),series:ySer,marks,tipTitle:yTT,h:280,tgts:yTg});
  const rs={H0:0,H2:0,X:0,RUN:0,H1:0}; yMonths.forEach(k=>ms.forEach(c=>{ const p=yParts(k,c); for(const q in rs) rs[q]+=p[q]; }));
  pRoute.textContent=`Jan–${BLN[NMON-1]} 2026 · ${mLab} · H0 Mine–Port, H2 ISP–Port, H1 CPP–ISP (ruas terpisah)`;
  donut(cRoute,[{n:"H0",c:"var(--rH0)",v:rs.H0},{n:"H2",c:"var(--rH2)",v:rs.H2},{n:"H0+H2 blm pisah",c:"var(--rX)",v:rs.X},{n:`H0+H2 ${BLN[MO-1]}`,c:"var(--rRUN)",v:rs.RUN},{n:"H1",c:"var(--rH1)",v:rs.H1}],"ton 2026");
  pYtdM.textContent=`${YL[yr]} · Jan–${BLN[NMON-1]} 2026 · ton (${hasTg?"capaian vs target YTD":"porsi"})`;
  hbars(cYtdM, ms.map((c,j)=>{ const tg=hasTg?yMonths.reduce((s,k)=>s+tgtM(yr,c,k)*(k===CUR?LASTD/DIM:1),0):0;
      return {label:`${c} · ${MN[c]}`, html:`${logoHTML(c,"lg sm")}${c}`, total:sum(ySer[j].vals), tg, segs:[{n:c,c:MCOL[c],v:sum(ySer[j].vals)}]}; }).sort((a,b)=>b.total-a.total),
    it=>hasTg&&it.tg?`${pct(it.total/it.tg*100)} target`:yTot?nf1.format(it.total/yTot*100)+"%":"–");
  // rekap route
  pRek.textContent=`Ton · ${mLab} · H0 = baris Mine–Port, H2 = baris ISP–Port (Periode I + II) · status: BA = sudah rekonsiliasi`;
  const rowsR=[["H0 · Mine–Port","H0","var(--rH0)"],["H2 · ISP–Port","H2","var(--rH2)"],["H0+H2 belum dipisah / WB","X","var(--rX)"],["H0+H2 berjalan (SBL WB)","RUN","var(--rRUN)"]];
  const val=(k,q)=>ms.reduce((a,c)=>a+yParts(k,c)[q],0), cell=v=>v?fmt(v):'<span class="z">–</span>';
  const tot02=yMonths.map(k=>rowsR.reduce((a,r)=>a+val(k,r[1]),0)), tot1=yMonths.map(k=>val(k,"H1"));
  let c2=0, c1=0;
  const tgRows=(r,act,lab)=>{ const tg=yMonths.map(k=>ms.reduce((a,c)=>a+tgtM(r,c,k),0)), tgP=yMonths.map((k,i)=>tg[i]*(k===CUR?LASTD/DIM:1)), A_=sum(act), T_=sum(tgP);
    const cl=(a,t)=>t?`<td class="r ${a>=t?"ok":"no"}">${pct(a/t*100)}</td>`:`<td class="r"><span class="z">–</span></td>`;
    return `<tr class="tg"><td>${lab}</td>${tg.map(v=>`<td class="r">${cell(v)}</td>`).join("")}<td class="r">${cell(sum(tg))}</td></tr>`
      + `<tr class="tg"><td>Capaian vs target${CUR>=0?` <small style="color:var(--muted)">(${BLN[CUR]}: s/d tgl ${LASTD})</small>`:""}</td>${act.map((a,i)=>cl(a,tgP[i])).join("")}${cl(A_,T_)}</tr>`; };
  tRoute.innerHTML=`<table><thead><tr><th>Route</th>${yMonths.map(k=>`<th class="r">${BLN[k]}<br><span class="stt ${A.st02[k]}">${STLAB[A.st02[k]]}</span></th>`).join("")}<th class="r">Total</th></tr></thead><tbody>`
    + rowsR.filter(r=>yMonths.some(k=>val(k,r[1]))).map(r=>`<tr><td><span class="tag"><i style="background:${r[2]}"></i>${r[0]}</span></td>${yMonths.map(k=>`<td class="r">${cell(val(k,r[1]))}</td>`).join("")}<td class="r"><b>${cell(yMonths.reduce((a,k)=>a+val(k,r[1]),0))}</b></td></tr>`).join("")
    + `<tr class="sum"><td>Total H0+H2 (Port SBL)</td>${tot02.map(v=>`<td class="r">${cell(v)}</td>`).join("")}<td class="r">${cell(sum(tot02))}</td></tr>`
    + `<tr class="cum"><td>Kumulatif H0+H2</td>${tot02.map(v=>`<td class="r">${cell(c2+=v)}</td>`).join("")}<td></td></tr>`
    + tgRows("H02", tot02, "Target RKAP H0+H2")
    + `<tr class="sum"><td><span class="tag"><i style="background:var(--rH1)"></i>H1 · CPP–ISP</span></td>${tot1.map((v,k)=>`<td class="r">${cell(v)}${A.st1[k]!=="ba"?`<br><span class="stt ${A.st1[k]}">${STLAB[A.st1[k]]}</span>`:""}</td>`).join("")}<td class="r">${cell(sum(tot1))}</td></tr>`
    + `<tr class="cum"><td>Kumulatif H1</td>${tot1.map(v=>`<td class="r">${cell(c1+=v)}</td>`).join("")}<td></td></tr>`
    + tgRows("H1", tot1, `Target H1 (${RK.h1Pct}% RKAP)`)
    + `</tbody></table>`;
  // grafik rekap route
  tRoute.style.display=showTable.rek?"":"none"; cRek.style.display=lgRek.style.display=showTable.rek?"none":"";
  const rkParts=[["H0","H0 · Mine–Port","var(--rH0)"],["H2","H2 · ISP–Port","var(--rH2)"],["X","H0+H2 belum dipisah","var(--rX)"],["RUN",`H0+H2 ${BLN[MO-1]} berjalan`,"var(--rRUN)"]];
  const tgG=r=>yMonths.map(k=>ms.reduce((a,c)=>a+tgtM(r,c,k),0));
  lgRek.innerHTML=rkParts.filter(p=>yMonths.some(k=>val(k,p[0]))).map(p=>`<span><i style="background:${p[2]}"></i>${p[1]}</span>`).join("")+`<span><i style="background:var(--rH1)"></i>H1 · CPP–ISP</span><span><i class="tk"></i>Target (RKAP / ${RK.h1Pct}% RKAP)</span><span style="color:var(--muted)">Batang kiri = H0+H2, kanan = H1</span>`;
  if(!showTable.rek) gcols(cRek,{cats:yMonths,labels:yMonths.map(k=>BLN[k]),h:290,tipTitle:k=>`${BLNF[k]} 2026${k===CUR?` (s/d tgl ${LASTD})`:""}`,
    groups:[{n:"H0+H2 (Port SBL)",series:rkParts.map(p=>({n:p[1],c:p[2],vals:yMonths.map(k=>val(k,p[0]))})),tg:tgG("H02")},
            {n:"H1 (CPP–ISP)",series:[{n:"H1",c:"var(--rH1)",vals:tot1}],tg:tgG("H1")}]});

  /* actual vs RKAP & sisa angkutan */
  { const rr=st.route, rl=rr==="H02"?"H0+H2 (Port SBL)":"H1 (CPP → ISP)";
    const remDays=(DIM-LASTD)+[...Array(12).keys()].filter(k=>k>CUR).reduce((s,k)=>s+new Date(Y,k+1,0).getDate(),0);
    const remMon=12-NMON+(DIM-LASTD)/DIM;
    const per=c=>{ const a=yMonths.reduce((s,k)=>s+yVal(k,c,rr),0), T=yMonths.concat([...Array(12).keys()].filter(k=>k>=NMON)).reduce((s,k)=>s+tgtM(rr,c,k),0),
      e=yMonths.reduce((s,k)=>s+tgtM(rr,c,k)*(k===CUR?LASTD/DIM:1),0); return {c,a,T,e,sisa:Math.max(T-a,0),lebih:Math.max(a-T,0)}; };
    const rows=ms.map(per), A_=sum(rows.map(r=>r.a)), T_=sum(rows.map(r=>r.T)), E_=sum(rows.map(r=>r.e)), S_=Math.max(T_-A_,0);
    pRk.textContent=`${rl} · ${mLab} · target ${TGLAB[rr]} Jan–Des 2026 · actual Jan–${BLN[NMON-1]} (${BLN[NMON-1]} s/d tgl ${LASTD}) · sisa hari ${remDays} (s/d 31 Des)`;
    const avgDay=A_/((Date.UTC(Y,MO-1,LASTD)-Date.UTC(Y,0,1))/864e5+1);
    rkStat.innerHTML=`<div><span>RKAP 2026 · ${rr==="H02"?"H0+H2":"H1"}</span><b>${short(T_)}<small>t</small></b><em>${fmt(T_)} t</em></div>
      <div><span>Actual YTD</span><b>${short(A_)}<small>t</small></b><em>${fmt(A_)} t</em></div>
      <div><span>Capaian vs RKAP setahun</span><b class="${A_>=E_?"up":"down"}">${pct(A_/T_*100)}</b><em>vs target s/d hari ini ${pct(A_/E_*100)}</em></div>
      <div class="hl"><span>Sisa angkutan</span><b>${short(S_)}<small>t</small></b><em>${S_?`${fmt(S_)} t lagi`:`melebihi RKAP ${fmt(A_-T_)} t`}</em></div>
      <div class="hl"><span>Perlu per hari / bulan</span><b>${fmt(remDays?S_/remDays:0)}<small>t/hari</small></b><em>${short(remMon?S_/remMon:0)} t/bulan · saat ini ${fmt(avgDay)} t/hari</em></div>`;
    pRkC.textContent=`Ton kumulatif · ${rl}`;
    let ca=0, ct=0; cumYear(cRkC, yMonths.map(k=>ca+=ms.reduce((a,c)=>a+yVal(k,c,rr),0)), [...Array(12).keys()].map(k=>ct+=ms.reduce((a,c)=>a+tgtM(rr,c,k),0)));
    cRkM.innerHTML=`<div class="rkm">${rows.map(r=>{ const mx=Math.max(r.T,r.a,1);
      return `<div class="rkr">${logoHTML(r.c,"lg sm")}<div><div class="rkt"><b>${r.c}</b><span class="${r.a>=r.e?"up":"down"}">${pct(r.T?r.a/r.T*100:null)} dari RKAP</span></div>
        <div class="bl-tr"><div class="bl-fill" style="width:${r.a/mx*100}%;background:${MCOL[r.c]}"></div>${r.T?`<div class="bl-mk" style="left:${r.e/mx*100}%"></div><div class="bl-end" style="left:${r.T/mx*100}%"></div>`:""}</div>
        <div class="rkn"><span>Actual <b>${fmt(r.a)}</b> / RKAP ${fmt(r.T)} t</span><span>${r.sisa?`Sisa <b>${fmt(r.sisa)} t</b> · ${fmt(remDays?r.sisa/remDays:0)} t/hari`:`<b class="up">Lebih ${fmt(r.lebih)} t</b>`}</span></div></div></div>`; }).join("")}</div>`;
    EXPRK={rr,rl,rows,A_,T_,E_,S_,remDays}; }

  /* rincian per mitra */
  const MR=st.route, am=ag, TM=Tm(MR);
  rinSub.textContent=`· ${ROUTE[MR].l} · ${rangeText()} · route ikut filter utama`;
  pMit.textContent=`${ROUTE[MR].l} · ${rangeText()} · DT aktif = nomor unit berbeda · ritase = rit ÷ unit-hari (unit × hari unit bekerja)`;
  const tgtShow=TM>0;
  const mrow=(x,share,T)=>`<td class="r">${fmt(x.ton)}</td><td class="r">${fmt(x.trip)}</td><td class="r">${nf2.format(x.trip?x.ton/x.trip:0)}</td><td class="r">${fmt(x.dt)}</td><td class="r">${fmt(x.unitDay)}</td><td class="r">${nf2.format(x.unitDay?x.trip/x.unitDay:0)}</td><td class="r">${fmt(x.ton/Math.max(am.days,1))}</td>${tgtShow?`<td class="r">${T?fmt(T/DIM*nd):"–"}</td><td class="r ${T&&x.ton>=T/DIM*nd?"ok":"no"}">${T?pct(x.ton/(T/DIM*nd)*100):"–"}</td>`:""}<td class="r">${share}</td>`;
  tMit.innerHTML=`<table><thead><tr><th>Mitra</th><th class="r">Tonase (t)</th><th class="r">Rit</th><th class="r">t/rit</th><th class="r">DT aktif</th><th class="r">Unit-hari</th><th class="r">Ritase</th><th class="r">Rata-rata/hari (t)</th>${tgtShow?'<th class="r">Target periode (t)</th><th class="r">Capaian</th>':""}<th class="r">Share</th></tr></thead><tbody>`
    + ms.map(c=>{ const x=am.m[M.indexOf(c)]; return `<tr><td><span class="tag">${logoHTML(c,"lg sm")}${c} <small>${MN[c]}</small></span></td>${mrow(x,pct(am.ton?x.ton/am.ton*100:0),tgtM(MR,c,MO-1))}</tr>`; }).join("")
    + `</tbody><tfoot><tr><td>Total</td>${mrow({ton:am.ton,trip:am.trip,dt:am.dt,unitDay:am.unitDay},"100%",TM)}</tr></tfoot></table>`;
  let hm=ms.filter(c=>st.hMitra.has(M.indexOf(c))); if(!hm.length){ ms.forEach(c=>st.hMitra.add(M.indexOf(c))); hm=ms; }
  const hAll=hm.length===ms.length;
  hMitra.innerHTML=`<button class="chip" type="button" data-h="all" aria-pressed="${hAll}">Semua</button>`+ms.map(c=>{ const i=M.indexOf(c), on=st.hMitra.has(i);
    return `<button class="chip" type="button" data-h="${i}" aria-pressed="${on}" title="${MN[c]}"><i style="background:${MCOL[c]}"></i>${c}</button>`; }).join("");
  hMet.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===st.hMet));
  const hTot=hm.reduce((s,c)=>s+am.m[M.indexOf(c)].ton,0), hRit=hm.reduce((s,c)=>s+am.m[M.indexOf(c)].trip,0);
  const HL={ton:`${fmt(hTot)} t`, rit:`${fmt(hRit)} rit`, both:`${fmt(hTot)} t · ${fmt(hRit)} rit`};
  pHour.textContent=`${ROUTE[MR].n} · ${hAll?"semua mitra":hm.join(", ")} · ${HL[st.hMet]} · per blok 2 jam (mode shift, mulai 06:00)`;
  lgHour.innerHTML=hm.map(c=>`<span><i style="background:${MCOL[c]}"></i>${c}</span>`).join("");
  const sH=k=>hm.map(c=>{ const i=M.indexOf(c); return {n:c,c:MCOL[c],vals:BLK.map((_,b)=>am[k][b][i])}; });
  const hT=k=>`T${String(k+1).padStart(2,"0")} · ${BLK[k]}`;
  const mets=st.hMet==="both"?[["blk","t","Tonase"],["blkN","rit","Ritase"]]:st.hMet==="rit"?[["blkN","rit","Ritase"]]:[["blk","t","Tonase"]];
  if(showTable.hour){
    if(mets.length===1) cHour.innerHTML=tableHTML(colTable(BLK,BLK,sH(mets[0][0]),hT,null,mets[0][1]));
    else { const sT=sH("blk"), sN=sH("blkN");
      cHour.innerHTML=tableHTML({h:["Blok jam",...hm.flatMap(c=>[c+" (t)",c+" (rit)"]),"Total (t)","Total (rit)","t/rit"],
        r:BLK.map((_,b)=>{ const t=sum(sT.map(s=>s.vals[b])), n=sum(sN.map(s=>s.vals[b])); return [hT(b),...hm.flatMap((c,j)=>[fmt(sT[j].vals[b]),fmt(sN[j].vals[b])]),fmt(t),fmt(n),nf2.format(n?t/n:0)]; }),
        f:["Total",...hm.flatMap((c,j)=>[fmt(sum(sT[j].vals)),fmt(sum(sN[j].vals))]),fmt(hTot),fmt(hRit),nf2.format(hRit?hTot/hRit:0)]}); }
  } else {
    cHour.innerHTML=mets.map((m,j)=>`${mets.length>1?`<div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2);margin:${j?"14px":"0"} 0 4px">${m[2]} (${m[1]})</div>`:""}<div id="cHour${j}"></div>`).join("");
    mets.forEach((m,j)=>cols(document.getElementById("cHour"+j),{cats:BLK.map((_,k)=>k),labels:BLK,series:sH(m[0]),tipTitle:hT,h:mets.length>1?200:250,unit:m[1]}));
  }
  pCo.textContent=`${ROUTE[MR].n} · ${rangeText()} · ton (rit · porsi)`;
  hbars(cCo, ms.map(c=>{ const x=am.m[M.indexOf(c)]; return {label:`${c} · ${MN[c]}`, html:`${logoHTML(c,"lg sm")}${c}`, total:x.ton, n:x.trip, segs:[{n:c,c:MCOL[c],v:x.ton}]}; }).sort((a,b)=>b.total-a.total),
    it=>`${fmt(it.n)} rit · ${am.ton?nf1.format(it.total/am.ton*100):0}%`);
}
let EXPRK=null;

/* ---------- cek data (statis) ---------- */
{
  const ck=DATA.cek||[];
  pCek.textContent=`${ck.length} catatan · sumber ${META.source} (folder ${META.sourceFolder}, disimpan ${META.sourceModified})`;
  cCek.innerHTML=(ck.length?ck.map(c=>`<div class="ck ${c.lvl}">${c.lvl==="warn"?ICON.warn:ICON.info}<span>${c.msg}</span></div>`).join(""):`<div class="ck info">${ICON.info}<span>Tidak ada catatan.</span></div>`)
    +(META.rock&&META.rock.n?`<div class="ck info">${ICON.info}<span>SBL WB juga berisi ${fmt(META.rock.n)} rit batu (MMJ Rock, ${nf2.format(META.rock.t)} t) — tidak dihitung sebagai coal.</span></div>`:"");
}
note.innerHTML=`<span aria-hidden="true">⚠</span><span><b>Catatan data:</b> dibuat dari <i>${META.source}</i> (folder ${META.sourceFolder}) pada ${META.generated}. Bulan berjalan: H0+H2 dari sheet SBL WB (coal saja, tanggal unload mode shift), H1 dari sheet Input CH CCP - ISP61 (tanggal dumping mode shift). Tahunan: tabel BA di sheet ANNUAL GPU-BKL — H0 = Mine–Port, H2 = ISP–Port, Periode I + II dijumlah; H1 = tabel Coal Haul Use Partial MMJ Haul Road (CPP GPU-ISP68). Bulan yang belum ada BA memakai data harian bulan berjalan. Target: ${RK.source==="RKAP"?`RKAP 2026 Road Usage Volume H0+H2 per mitra; target H1 = ${RK.h1Pct}% × target H0+H2`:RK.source}. Target bulan berjalan di grafik tahunan dibandingkan secara proporsional (s/d tgl ${LASTD}).</span>`;

/* ---------- PDF ---------- */
function presentPDF(){
  const wasDark=document.documentElement.getAttribute("data-theme")==="dark", old=document.title;
  if(wasDark) document.documentElement.removeAttribute("data-theme");
  document.title=`Presentasi Coal Hauling PT. Musi Mitra Jaya - ${rangeText()}`; RP.open=false; render();
  const done=()=>{ document.title=old; if(wasDark){ document.documentElement.setAttribute("data-theme","dark"); render(); } removeEventListener("afterprint",done); };
  addEventListener("afterprint",done); setTimeout(()=>window.print(),120);
}

/* ---------- Export Excel (.xlsx tanpa internet) ---------- */
const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
const crc32=b=>{ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
async function deflate(d){ if(typeof CompressionStream==="undefined") return null; try{ const s=new Blob([d]).stream().pipeThrough(new CompressionStream("deflate-raw")); return new Uint8Array(await new Response(s).arrayBuffer()); }catch(e){ return null; } }
async function zipFiles(files){
  const enc=new TextEncoder(), parts=[], central=[]; let off=0;
  for(const f of files){ const nm=enc.encode(f.name), raw=f.data, crc=crc32(raw), z=await deflate(raw), method=z?8:0, d=z||raw;
    const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,method,true); h.setUint16(12,0x21,true);
    h.setUint32(14,crc,true); h.setUint32(18,d.length,true); h.setUint32(22,raw.length,true); h.setUint16(26,nm.length,true); parts.push(new Uint8Array(h.buffer),nm,d);
    const c=new DataView(new ArrayBuffer(46)); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,method,true); c.setUint16(14,0x21,true);
    c.setUint32(16,crc,true); c.setUint32(20,d.length,true); c.setUint32(24,raw.length,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true); central.push(new Uint8Array(c.buffer),nm);
    off+=30+nm.length+d.length; }
  const csz=central.reduce((a,x)=>a+x.length,0), e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,csz,true); e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
const xesc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,"");
const colL=i=>{ let s=""; i++; while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; };
function sheetXML(s){
  let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
  if(s.freeze) x+=`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${s.freeze}" topLeftCell="A${s.freeze+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
  if(s.widths) x+="<cols>"+s.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")+"</cols>";
  x+="<sheetData>";
  s.rows.forEach((r,ri)=>{ x+=`<row r="${ri+1}">`; (r||[]).forEach((c,ci)=>{ let v=c,st_=null; if(c&&typeof c==="object"){ v=c.v; st_=c.s; } if(v==null||v==="") return;
    const ref=colL(ci)+(ri+1); if(typeof v==="number"&&isFinite(v)) x+=`<c r="${ref}" s="${st_!=null?st_:(Number.isInteger(v)?4:2)}"><v>${v}</v></c>`; else x+=`<c r="${ref}" t="inlineStr" s="${st_||0}"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`; });
    x+="</row>"; });
  return x+"</sheetData></worksheet>";
}
function makeXlsx(sheets){
  const enc=new TextEncoder(), X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', N=sheets.length;
  const styles=X+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="#,##0"/><numFmt numFmtId="166" formatCode="0.0%"/></numFmts>'
    +'<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF3730A3"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    +'<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8E8FF"/><bgColor indexed="64"/></patternFill></fill></fills>'
    +'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    +'<cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="3" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>';
  const files=[
    {name:"[Content_Types].xml",data:enc.encode(X+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")+"</Types>")},
    {name:"_rels/.rels",data:enc.encode(X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
    {name:"xl/workbook.xml",data:enc.encode(X+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>`<sheet name="${xesc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")+"</sheets></workbook>")},
    {name:"xl/_rels/workbook.xml.rels",data:enc.encode(X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")+`<Relationship Id="rId${N+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)},
    {name:"xl/styles.xml",data:enc.encode(styles)},
    ...sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,data:enc.encode(sheetXML(s))})),
  ];
  return zipFiles(files);
}
const HD=a=>a.map(v=>({v,s:1})), r2=v=>Math.round(v*100)/100, TT=v=>({v,s:5}), TL=v=>({v,s:6}), PC=v=>v==null||!isFinite(v)?"":{v:Math.round(v*10)/1000,s:8};
function buildSheets(){
  const ms=selM(), mLab=ms.length===M.length?"semua mitra":ms.join(", ");
  const title=t=>[[{v:t,s:3}],[`PT. Musi Mitra Jaya · ${mLab} · data s/d ${dStr(LASTD-1)}`],[`Sumber: ${META.source} · dibuat ${META.generated}`],[]];
  const ach=[...title(`Achievement ${BLNF[MO-1]} ${Y} vs Target`)];
  ["H02","H1"].forEach(route=>{ const ac=achCalc(route);
    ach.push([{v:`${ROUTE[route].n} · ${ROUTE[route].l} · target ${TGLAB[route]}`,s:6}]);
    ach.push(HD(["Mitra","Nama","Target bulanan (t)","Target s/d hari ini (t)","Aktual (t)","Rit","Capaian s/d hari ini","Capaian bulanan","Rata-rata/hari (t)","Perlu/hari (t)","Proyeksi akhir bulan (t)"]));
    ac.rows.forEach(r=>ach.push([r.c,r.name,r2(r.T),r2(r.e),r2(r.a),r.trip,PC(r.pE),PC(r.pT),r2(r.avg),r2(r.need),r2(r.proj)]));
    ach.push([TL("Total"),TL(""),TT(r2(ac.tot.T)),TT(r2(ac.tot.e)),TT(r2(ac.tot.a)),TL(ac.tot.trip),PC(ac.tot.pE),PC(ac.tot.pT),TT(r2(ac.tot.avg)),TT(r2(ac.tot.need)),TT(r2(ac.tot.proj))]);
    ach.push([]); });
  const daily=route=>{ const ag=runAgg(route,FULL); const out=[...title(`Tonase Harian ${ROUTE[route].n} · ${ROUTE[route].l} · ${BLNF[MO-1]} ${Y}`), HD(["Tanggal",...ms.map(c=>c+" (t)"),"Total (t)",...ms.map(c=>c+" (rit)"),"Total rit"])];
    const tt=ms.map(()=>0), tn=ms.map(()=>0);
    for(let d=0; d<LASTD; d++){ const v=ms.map(c=>ag.day[d][M.indexOf(c)]), n=ms.map(c=>ag.dayTrip[d][M.indexOf(c)]); v.forEach((x,i)=>tt[i]+=x); n.forEach((x,i)=>tn[i]+=x);
      out.push([`${dName(d)}, ${dStr(d)}`,...v.map(r2),r2(v.reduce((a,b)=>a+b,0)),...n,n.reduce((a,b)=>a+b,0)]); }
    out.push([TL("Total"),...tt.map(v=>TT(r2(v))),TT(r2(tt.reduce((a,b)=>a+b,0))),...tn.map(TL),TL(tn.reduce((a,b)=>a+b,0))]); return out; };
  const perM=route=>{ const ag=runAgg(route); const out=[[{v:`Performa per Mitra · ${ROUTE[route].n} · ${rangeText()}`,s:3}],[]];
    out.push(HD(["Mitra","Tonase (t)","Rit","t/rit","DT aktif","Unit-hari","Ritase (rit/DT/hari)","Rata-rata/hari (t)","Share"]));
    ms.forEach(c=>{ const x=ag.m[M.indexOf(c)]; out.push([c,r2(x.ton),x.trip,r2(x.trip?x.ton/x.trip:0),x.dt,x.unitDay,r2(x.unitDay?x.trip/x.unitDay:0),r2(x.ton/Math.max(ag.days,1)),PC(ag.ton?x.ton/ag.ton*100:0)]); });
    out.push([TL("Total"),TT(r2(ag.ton)),TL(ag.trip),TT(r2(ag.trip?ag.ton/ag.trip:0)),TL(ag.dt),TL(ag.unitDay),TT(r2(ag.unitDay?ag.trip/ag.unitDay:0)),TT(r2(ag.ton/Math.max(ag.days,1))),PC(100)]); out.push([]); return out; };
  const yearS=r=>{ const out=[...title(`Tahunan 2026 · ${r==="H02"?"H0+H2":r}`), HD(["Mitra",...yMonths.map(k=>BLN[k]),"Total"]), ["Status",...yMonths.map(k=>STLAB[r==="H1"?A.st1[k]:A.st02[k]])]];
    const tt=yMonths.map(()=>0); ms.forEach(c=>{ const v=yMonths.map(k=>yVal(k,c,r)); v.forEach((x,i)=>tt[i]+=x); out.push([c,...v.map(r2),r2(v.reduce((a,b)=>a+b,0))]); });
    out.push([TL("Total"),...tt.map(v=>TT(r2(v))),TT(r2(tt.reduce((a,b)=>a+b,0)))]); let cm=0; out.push(["Kumulatif",...tt.map(v=>r2(cm+=v))]);
    if(r==="H02"||r==="H1"){ const tg=yMonths.map(k=>ms.reduce((a,c)=>a+tgtM(r,c,k),0)), tgP=yMonths.map((k,i)=>tg[i]*(k===CUR?LASTD/DIM:1));
      out.push([`Target ${TGLAB[r]}`,...tg,tg.reduce((a,b)=>a+b,0)]);
      out.push([`Capaian (${BLN[CUR]||""} s/d tgl ${LASTD})`,...tt.map((v,i)=>PC(tgP[i]?v/tgP[i]*100:null)),PC(tgP.reduce((a,b)=>a+b,0)?tt.reduce((a,b)=>a+b,0)/tgP.reduce((a,b)=>a+b,0)*100:null)]);
      out.push([]); out.push(HD(["Target per mitra",...yMonths.map(k=>BLN[k]),"Total"]));
      ms.forEach(c=>{ const v=yMonths.map(k=>tgtM(r,c,k)); out.push([c,...v,v.reduce((a,b)=>a+b,0)]); }); }
    return out; };
  const det=[...title("Detail Tabel BA & H1 (Periode I / II) dari ANNUAL GPU-BKL"), HD(["Route","Mitra","Baris sumber",...BLN,"Total"])];
  A.detail.filter(d=>ms.includes(d[1])).forEach(d=>det.push([d[0],d[1],d[2],...d[3].map(r2),r2(d[3].reduce((a,b)=>a+b,0))]));
  const remDays=(DIM-LASTD)+[...Array(12).keys()].filter(k=>k>CUR).reduce((s,k)=>s+new Date(Y,k+1,0).getDate(),0);
  const rk=[...title(`Actual vs RKAP 2026 & Sisa Angkutan (sisa ${remDays} hari s/d 31 Des)`)];
  ["H02","H1"].forEach(r=>{ rk.push([{v:`${r==="H02"?"H0+H2 (Port SBL)":"H1 (CPP → ISP)"} · target ${TGLAB[r]}`,s:6}]);
    rk.push(HD(["Mitra","RKAP 2026 (t)","Target s/d hari ini (t)","Actual YTD (t)","Capaian vs RKAP setahun","Capaian vs target s/d hari ini","Sisa angkutan (t)","Perlu/hari (t)","Lebih dari RKAP (t)"]));
    let a_=0,t_=0,e_=0;
    ms.forEach(c=>{ const a=yMonths.reduce((s,k)=>s+yVal(k,c,r),0), T=[...Array(12).keys()].reduce((s,k)=>s+tgtM(r,c,k),0), e=yMonths.reduce((s,k)=>s+tgtM(r,c,k)*(k===CUR?LASTD/DIM:1),0);
      a_+=a; t_+=T; e_+=e; rk.push([c,r2(T),r2(e),r2(a),PC(T?a/T*100:null),PC(e?a/e*100:null),r2(Math.max(T-a,0)),r2(remDays?Math.max(T-a,0)/remDays:0),r2(Math.max(a-T,0))]); });
    rk.push([TL("Total"),TT(r2(t_)),TT(r2(e_)),TT(r2(a_)),PC(t_?a_/t_*100:null),PC(e_?a_/e_*100:null),TT(r2(Math.max(t_-a_,0))),TT(r2(remDays?Math.max(t_-a_,0)/remDays:0)),TT(r2(Math.max(a_-t_,0)))]); rk.push([]); });
  const ck=[[{v:"Cek Data",s:3}],[],HD(["Level","Catatan"])]; (DATA.cek||[]).forEach(c=>ck.push([c.lvl==="warn"?"Perlu dicek":"Info",c.msg]));
  const w=(a,n,x=14)=>[a,...Array(n).fill(x)];
  return [
    {name:"Achievement",rows:ach,widths:[10,28,16,18,14,9,16,14,15,14,18],freeze:5},
    {name:"Harian H0+H2",rows:daily("H02"),widths:w(24,ms.length*2+2,11),freeze:5},
    {name:"Harian H1",rows:daily("H1"),widths:w(24,ms.length*2+2,11),freeze:5},
    {name:"Per Mitra",rows:[...perM("H02"),...perM("H1")],widths:w(12,8)},
    {name:"Tahunan H0+H2",rows:yearS("H02"),widths:w(14,13,13),freeze:5},
    {name:"Tahunan H0",rows:yearS("H0"),widths:w(14,13,13),freeze:5},
    {name:"Tahunan H2",rows:yearS("H2"),widths:w(14,13,13),freeze:5},
    {name:"Tahunan H1",rows:yearS("H1"),widths:w(14,13,13),freeze:5},
    {name:"RKAP & Sisa",rows:rk,widths:[10,16,20,16,22,26,18,14,18],freeze:5},
    {name:"Detail BA",rows:det,widths:[8,8,16,...Array(13).fill(12)],freeze:5},
    {name:"Cek Data",rows:ck,widths:[13,120]},
  ];
}
async function exportExcel(btn){
  try{ btn&&(btn.disabled=true); const blob=await makeXlsx(buildSheets());
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`Dashboard Coal Hauling MMJ - ${rangeText()}.xlsx`; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500);
  }catch(err){ alert("Export Excel gagal: "+err.message); }
  finally{ btn&&setTimeout(()=>btn.disabled=false,600); }
}
document.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{ if(b.dataset.act==="pdf") presentPDF(); else exportExcel(b); });

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

;(function(){ const _r=render; render=function(){ const out=_r.apply(this,arguments); try{ mmjMotion(); }catch(e){} return out; }; })();

render();
let rz; addEventListener("resize",()=>{clearTimeout(rz); rz=setTimeout(render,150);});
;try{ if(typeof setView==="function") window.setView=setView; }catch(e){}
})();
