/* assets/js/tab/lt.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){
var DATA = window.MMJ_DATA["lt"];

const $ = id => document.getElementById(id);
const BLN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const BLNF = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const ROUTES = DATA.routes;
const RCOL = {H1:"var(--s1)", ISP:"var(--s2)", H2:"var(--s3)"};
const TYPES = DATA.types, TN = Object.fromEntries(TYPES.map(t=>[t.c,t.n]));
const TCOL = {R:"#2a78d6",S:"#5bb8e8",A:"#d03b3b",E:"#e0842a",M:"#8b5cf6",T:"#f2b632",NH:"#94a3b8",CP:"#e2559b",D:"#a47148",SI:"#14b8a6",FM:"#64748b",MC:"#5b4bd6",RG:"#7fb13a"};
const MCPAL = ["#5b4bd6","#8f7cf0","#2f9e8f","#e0842a","#d9578a","#5bb8e8","#a47148","#94a3b8"];
const POS = DATA.pos, POSR = Object.fromEntries(POS.map(p=>[p.n,p.r]));
const nf0 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:1,minimumFractionDigits:1});
const nf2 = new Intl.NumberFormat("id-ID",{maximumFractionDigits:2,minimumFractionDigits:2});
const fh = v => nf2.format(v||0);                       // jam
const fmm = v => nf1.format(v||0);                      // mm
const hm = h => { const m=Math.round((h||0)*60); return `${Math.floor(m/60)}j ${String(m%60).padStart(2,"0")}m`; };
const pct = (a,b) => b>0 ? Math.round(a/b*100) : 0;
const dLabel = d => `${+d.slice(8)} ${BLN[+d.slice(5,7)-1]} ${d.slice(0,4)}`;
const dayName = d => HARI[new Date(d+"T00:00:00").getDay()];
const mLabel = m => BLN[+m.slice(5,7)-1]+" "+m.slice(2,4);
const esc = s => String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const FIRST = DATA.meta.first, LAST = DATA.meta.last;
const months = [...new Set([...DATA.stop,...DATA.rain].map(r=>r.d.slice(0,7)))].sort();
const addDays = (s,n) => { const d=new Date(s+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const monthRange = m => [m+"-01", m+"-"+String(new Date(+m.slice(0,4), +m.slice(5), 0).getDate()).padStart(2,"0")];

let pref = {}; try{ pref = JSON.parse(localStorage.getItem("ltDashPref")||"{}"); }catch(e){}
const savePref = () => { try{ localStorage.setItem("ltDashPref", JSON.stringify({hm:st.hm, gv:st.gv, pos:st.pos, av:st.av, view:st.view})); }catch(e){} };
const st = {bulan:"", dari:"", sampai:"", routes:new Set(ROUTES), type:"", hm:pref.hm||"mm", gv:pref.gv||"mmj", pos:pref.pos||"dash", cb:"all", rh:"all", mc:false, mcv:"t2", kp:"", av:pref.av||"bar", view:(window.MMJ_VIEW||pref.view||"lt"), dt:new Set(), open:{evt:false, cek:false}, q:""};
/* acuan pos: "dash" = ISP68 hanya ISP · "sop" = ISP68 dipakai bersama H1, ISP & H2 (SOP 8.2) */
const posRoutes = p => (st.pos==="sop" && POSR[p]==="ISP") ? ["H1","ISP","H2"] : [POSR[p]];
const posIn = (p, r) => posRoutes(p).includes(r);
const inRange = d => (!st.dari || d>=st.dari) && (!st.sampai || d<=st.sampai);
function setMonth(m){ if(!m){ st.bulan=""; st.dari=""; st.sampai=""; } else { st.bulan=m; [st.dari,st.sampai]=monthRange(m); } render(); }
function setRange(a,b){
  if(a && b && a>b) [a,b]=[b,a];
  st.dari=a||""; st.sampai=b||"";
  const m = a ? a.slice(0,7) : "";
  st.bulan = (a && b && monthRange(m)[0]===a && monthRange(m)[1]===b) ? m : "";
  render();
}

/* ---------- filters ---------- */
function opts(sel, items, all){ sel.innerHTML = `<option value="">${all}</option>` + items.map(([v,t])=>`<option value="${v}">${t}</option>`).join(""); }
opts($("fBulan"), months.map(m=>[m, BLNF[+m.slice(5)-1]+" "+m.slice(0,4)]), "Semua bulan");
opts($("fType"), TYPES.map(t=>[t.c, `${t.c} · ${t.n}`]), "Semua tipe");
$("fRoute").innerHTML = ROUTES.map(r=>`<button class="chip" type="button" data-r="${r}" aria-pressed="true"><i style="background:${RCOL[r]}"></i>${r}</button>`).join("");
$("fRoute").onclick = e => { const b=e.target.closest(".chip"); if(!b) return; const r=b.dataset.r;
  if(st.routes.has(r) && st.routes.size>1) st.routes.delete(r); else st.routes.add(r); render(); };
$("fBulan").onchange = ()=>setMonth($("fBulan").value);
$("fType").onchange = ()=>{ st.type=$("fType").value; render(); };
$("reset").onclick = ()=>{ Object.assign(st,{bulan:"",dari:"",sampai:"",type:"",routes:new Set(ROUTES),cb:"all",rh:"all",q:""}); $("qEvt").value=""; render(); };
function openMc(v){ st.mc=true; if(typeof v==="string") st.mcv=v; render(); $("mitraSec").scrollIntoView({behavior:"smooth"}); }
$("mcClose").onclick = ()=>{ st.mc=false; render(); $("sop").scrollIntoView({behavior:"smooth"}); };
$("mcBtn2").onclick = ()=>openMc();
$("navMc").onclick = e => { e.preventDefault(); if(st.mc){ st.mc=false; render(); } else openMc(); };
$("mcSub").onclick = e => { const a=e.target.closest("[data-mcv]"); if(!a) return; e.preventDefault(); openMc(a.dataset.mcv); };
function setView(v){ st.view=v; savePref(); render(); scrollTo({top:0, behavior:"smooth"}); }
$("viewSw").onclick = e => { const b=e.target.closest("[data-view-btn]"); if(b) setView(b.dataset.viewBtn); };
$("navDash").onclick = e => { e.preventDefault(); scrollTo({top:0, behavior:"smooth"}); };
$("segArea").onclick =e => { const b=e.target.closest("button"); if(!b) return; st.av=b.dataset.v; savePref(); render(); };
document.addEventListener("click", e => {
  const d=e.target.closest(".dtb"); if(d){ const k=d.dataset.dt; st.dt.has(k)?st.dt.delete(k):st.dt.add(k); render(); return; }
  const t=e.target.closest(".tog"); if(t){ const k=t.dataset.open; st.open[k]=!st.open[k]; applyOpen(); if(k==="evt") renderEvents(); }
});
function applyOpen(){
  document.querySelectorAll(".tog").forEach(b=>{ const o=st.open[b.dataset.open]; b.textContent=o?"Sembunyikan ▴":"Tampilkan ▾"; b.setAttribute("aria-expanded",o); });
  $("tEvt").hidden=!st.open.evt; $("qEvt").hidden=!st.open.evt; $("tCek").hidden=!st.open.cek;
}
$("segMc").onclick =e => { const b=e.target.closest("button"); if(!b) return; st.mcv=b.dataset.v; render(); };
$("ringkasan").onclick = e => { const k=e.target.closest(".kpi.clk"); if(!k) return; st.kp = st.kp===k.dataset.kp ? "" : k.dataset.kp; render(); };
$("ringkasan").onkeydown = e => { if(e.key!=="Enter" && e.key!==" ") return; const k=e.target.closest(".kpi.clk"); if(!k) return; e.preventDefault(); st.kp = st.kp===k.dataset.kp ? "" : k.dataset.kp; render(); };
$("segRh").innerHTML = [["all","Semua"],...ROUTES.map(r=>[r,r])].map(([v,t])=>`<button type="button" data-v="${v}">${t}</button>`).join("");
$("segGv").onclick = e => { const b=e.target.closest("button"); if(!b) return; st.gv=b.dataset.v; savePref(); render(); };
$("segPos").onclick = e => { const b=e.target.closest("button"); if(!b) return; st.pos=b.dataset.v; savePref(); render(); };
$("segRh").onclick =e => { const b=e.target.closest("button"); if(!b) return; st.rh=b.dataset.v; render(); };
$("segHm").onclick = e => { const b=e.target.closest("button"); if(!b) return; st.hm=b.dataset.v; savePref(); render(); };
$("segCb").innerHTML = [["all","Semua"],...ROUTES.map(r=>[r,r])].map(([v,t])=>`<button type="button" data-v="${v}">${t}</button>`).join("");
$("segCb").onclick = e => { const b=e.target.closest("button"); if(!b) return; st.cb=b.dataset.v; render(); };
let qT; $("qEvt").oninput = ()=>{ clearTimeout(qT); qT=setTimeout(()=>{ st.q=$("qEvt").value.trim().toLowerCase(); renderEvents(); },150); };

/* ---------- range picker ---------- */
const RP = {open:false, a:null, hover:null, view:null};
const addMonths = (m,n) => { let y=+m.slice(0,4), mo=+m.slice(5)-1+n; y+=Math.floor(mo/12); mo=((mo%12)+12)%12; return `${y}-${String(mo+1).padStart(2,"0")}`; };
const rangeText = () => { if(!st.dari && !st.sampai) return "Semua tanggal"; const a=st.dari||FIRST, b=st.sampai||LAST; return a===b ? dLabel(a) : `${dLabel(a).replace(a.slice(0,4)===b.slice(0,4)?/ \d{4}$/:/$^/,"")} – ${dLabel(b)}`; };
function rpPresets(){
  const lm = LAST.slice(0,7);
  return [["Semua tanggal","",""],["7 hari terakhir",addDays(LAST,-6),LAST],["14 hari terakhir",addDays(LAST,-13),LAST],
          ["Bulan ini",lm+"-01",LAST],["Bulan lalu",...monthRange(addMonths(lm,-1))]]
    .map(p=>[p[0], p[1]&&p[1]<FIRST?FIRST:p[1], p[2]]);
}
function monthGrid(m){
  const [a,z]=monthRange(m), off=(new Date(a+"T00:00:00Z").getUTCDay()+6)%7, nd=+z.slice(8);
  let h=`<div class="rpm"><div class="rpmh">${BLNF[+m.slice(5)-1]} ${m.slice(0,4)}</div><div class="rpg">`+["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(x=>`<span class="rpw">${x}</span>`).join("")+"<span></span>".repeat(off);
  for(let d=1; d<=nd; d++){ const ds=`${m}-${String(d).padStart(2,"0")}`, dis=ds<FIRST||ds>LAST;
    h+=`<button type="button" class="rpd${ds===LAST?" last":""}" data-d="${ds}"${dis?" disabled":""}>${d}</button>`; }
  return h+"</div></div>";
}
function paintRP(){
  let x = RP.a || st.dari, y = RP.a ? (RP.hover||RP.a) : st.sampai;
  if(!RP.a && (st.dari||st.sampai)){ x=st.dari||FIRST; y=st.sampai||LAST; }
  if(x && y && x>y) [x,y]=[y,x];
  $("rpPop").querySelectorAll(".rpd").forEach(b=>{ const d=b.dataset.d;
    b.classList.toggle("in", !!(x&&y&&d>x&&d<y)); b.classList.toggle("end", d===x||d===y); });
}
function drawRP(){
  const pop=$("rpPop");
  $("rpTxt").textContent = rangeText();
  $("rp").classList.toggle("on", !!(st.dari||st.sampai));
  pop.hidden = !RP.open; $("rpBtn").setAttribute("aria-expanded", RP.open);
  if(!RP.open) return;
  const two = innerWidth > 760, m2 = RP.view, m1 = two ? addMonths(m2,-1) : m2, P = rpPresets();
  pop.innerHTML = `<div class="rpp">${P.map((p,i)=>`<button type="button" data-p="${i}" class="${st.dari===p[1]&&st.sampai===p[2]?"on":""}">${p[0]}</button>`).join("")}</div>
    <div class="rpc"><div class="rpnav"><button type="button" data-nav="-1" aria-label="Bulan sebelumnya">‹</button><span>${RP.a?`Mulai ${dLabel(RP.a)} · pilih tanggal akhir`:"Klik tanggal awal, lalu tanggal akhir"}</span><button type="button" data-nav="1" aria-label="Bulan berikutnya">›</button></div>
    <div class="rpms">${two?monthGrid(m1):""}${monthGrid(m2)}</div><div class="rpf">Data tersedia ${dLabel(FIRST)} – ${dLabel(LAST)} · titik = data terakhir</div></div>`;
  paintRP();
  pop.querySelectorAll("[data-p]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const p=P[+b.dataset.p]; RP.open=false; RP.a=null; setRange(p[1],p[2]); });
  pop.querySelectorAll("[data-nav]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); RP.view=addMonths(RP.view,+b.dataset.nav); drawRP(); });
  pop.querySelectorAll(".rpd:not(:disabled)").forEach(b=>{
    b.onclick=e=>{ e.stopPropagation(); const d=b.dataset.d;
      if(!RP.a){ RP.a=d; RP.hover=d; drawRP(); }
      else { let a=RP.a, z=d; if(z<a) [a,z]=[z,a]; RP.a=null; RP.open=false; setRange(a,z); } };
    b.onmouseenter=()=>{ if(RP.a){ RP.hover=b.dataset.d; paintRP(); } };
  });
}
$("rpBtn").onclick = e => { e.stopPropagation(); RP.open=!RP.open; RP.a=null; RP.view=(st.sampai||LAST).slice(0,7); drawRP(); };
$("rpPop").onclick = e => e.stopPropagation();
document.addEventListener("click", ()=>{ if(RP.open){ RP.open=false; RP.a=null; drawRP(); } });
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && RP.open){ RP.open=false; RP.a=null; drawRP(); $("rpBtn").focus(); } });

/* tema */
function applyTheme(t){ if(t==="dark") document.documentElement.setAttribute("data-theme","dark"); else document.documentElement.removeAttribute("data-theme"); $("themeBtn").textContent="Tema: "+(t==="dark"?"gelap":"terang"); }
let theme="light"; try{theme=localStorage.getItem("dashTheme3")||"light"}catch(e){} applyTheme(theme);
$("themeBtn").onclick=()=>{theme=theme==="dark"?"light":"dark"; applyTheme(theme); try{localStorage.setItem("dashTheme3",theme)}catch(e){} render();};

/* nav aktif saat scroll */
const navLinks=[...document.querySelectorAll("#nav a")];
const secs=navLinks.map(a=>document.querySelector(a.getAttribute("href")));
addEventListener("scroll",()=>{ let k=0; secs.forEach((s,i)=>{ if(s && s.offsetParent!==null && s.getBoundingClientRect().top<160) k=i; }); navLinks.forEach((a,i)=>a.classList.toggle("on",i===k)); },{passive:true});

/* ---------- tooltip ---------- */
const tipEl = $("tip");
function tip(e, title, rows, total, extra){
  tipEl.innerHTML = `<div class="t">${title}</div>` + rows.map(r=>`<div class="row"><span>${r.c?`<i style="background:${r.c}"></i>`:""}${r.n}</span><span>${r.v}</span></div>`).join("")
    + (total!=null?`<div class="row tot"><span>Total</span><span>${total}</span></div>`:"") + (extra?`<div class="x">${extra}</div>`:"");
  tipEl.style.display="block";
  const w=tipEl.offsetWidth,h=tipEl.offsetHeight; let x=e.clientX+14,y=e.clientY+14;
  if(x+w>innerWidth-8) x=e.clientX-w-14; if(y+h>innerHeight-8) y=e.clientY-h-14;
  tipEl.style.left=Math.max(4,x)+"px"; tipEl.style.top=Math.max(4,y)+"px";
}
const hide=()=>tipEl.style.display="none";

/* ---------- table toggle ---------- */
const showTable = {};
document.querySelectorAll(".tbtn[data-t]").forEach(b=>b.onclick=()=>{const k=b.dataset.t; showTable[k]=!showTable[k]; b.textContent=showTable[k]?"Grafik":"Tabel"; render();});
function tableHTML(t){ return `<div class="tw"><table><thead><tr>${t.h.map((x,i)=>`<th class="${i?"r":""}">${x}</th>`).join("")}</tr></thead><tbody>${t.r.map(r=>`<tr>${r.map((x,i)=>`<td class="${i?"r":""}">${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; }

/* ---------- column chart ---------- */
function niceStep(v){ if(v<=0) return 1; const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p; }
const axisFmt = v => new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v);
/* ---------- label data grafik (angka di setiap batang / titik) ---------- */
const DLF = {
  full: v => new Intl.NumberFormat("id-ID",{maximumFractionDigits:1,minimumFractionDigits:1}).format(v),
  cmp: v => { const a=Math.abs(v), f=(x,d)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:d,minimumFractionDigits:d}).format(x);
    return a>=1e4 ? f(v/1e3,1)+"rb" : a>=1e3 ? f(v/1e3,2)+"rb" : a>=100 ? f(v,0) : f(v,1); }
};
const dlW = s => String(s).length*6+10;
const dlPick = (v, room) => { const f=DLF.full(v); return dlW(f)<=room ? f : DLF.cmp(v); };
function dlChip(x, yTop, txt, col, dy=3){ const w=dlW(txt), h=16, y=yTop-h-dy;
  return `<g pointer-events="none"><rect x="${(x-w/2).toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" rx="8" fill="var(--surface-solid)" stroke="${col}" stroke-width="1.3"/><text x="${x.toFixed(1)}" y="${(y+11.5).toFixed(1)}" text-anchor="middle" style="font-size:10px;font-weight:700;fill:${col}">${txt}</text></g>`; }
function dlRot(x, yTop, txt, col){ const xx=(x+3.5).toFixed(1), yy=(yTop-5).toFixed(1); return `<text x="${xx}" y="${yy}" transform="rotate(-90 ${xx} ${yy})" pointer-events="none" style="font-size:9.5px;font-weight:700;fill:${col}">${txt}</text>`; }
function dlIn(x, yMid, txt){ return `<text x="${x.toFixed(1)}" y="${(yMid+3.4).toFixed(1)}" text-anchor="middle" pointer-events="none" style="font-size:9px;font-weight:700;fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.28);stroke-width:2.2px">${txt}</text>`; }
function dlPt(x, y, txt, col){ return `<text x="${x.toFixed(1)}" y="${(y-8).toFixed(1)}" text-anchor="middle" pointer-events="none" style="font-size:10px;font-weight:700;fill:${col};paint-order:stroke;stroke:var(--surface-solid);stroke-width:3px">${txt}</text>`; }
function dlPlan(vals, band){ const room=band-2, chip=vals.every(v=>!v || dlW(DLF.cmp(v))<=room), allFull=chip && vals.every(v=>!v || dlW(DLF.full(v))<=room);
  const txt=vals.map(v=>v>0 ? (allFull ? DLF.full(v) : DLF.cmp(v)) : "");
  return {chip, txt, head: chip ? 22 : Math.max(0,...txt.map(t=>t.length*5.7))+10}; }
function cols(el, {cats, labels, series, h=270, tipTitle, unit="jam", vf=fh, onClick, ymax}){
  const W = Math.max(el.clientWidth, 260), m={l:40,r:6,t:22,b:26}, iw=W-m.l-m.r;
  const tot = cats.map((_,i)=>series.reduce((a,s)=>a+(s.vals[i]||0),0));
  const P = dlPlan(tot, iw/cats.length), dcol = series.length===1 ? series[0].c : "var(--accent)";
  m.t += P.head; const H = h + P.head, ih=H-m.t-m.b;
  const raw = Math.max(...tot,0,ymax||0);
  const step = niceStep(raw/4 || 1), nt = Math.max(1, Math.ceil(raw/step)), mx = step*nt;
  const y = v => m.t + ih - v/mx*ih;
  const band = iw/cats.length, bw = Math.min(30, band*0.62);
  let g = "";
  for(let k=0;k<=nt;k++){ const v=step*k, yy=y(v);
    g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${yy}" y2="${yy}" stroke="${k?"var(--grid)":"var(--axis)"}" ${k?'stroke-dasharray="3 4"':""}/>`;
    g+=`<text x="${m.l-8}" y="${yy+4}" text-anchor="end">${axisFmt(v)}</text>`; }
  g+=`<text x="${m.l-32}" y="10" text-anchor="start" style="font-size:10px">${unit}</text>`;
  const lw = Math.max(...labels.map(l=>String(l).length),1)*6.4+10;
  const every = Math.ceil(cats.length / Math.max(1, Math.floor(iw/lw)));
  const top = (x,yy,w,hh,c)=>{ const r=Math.min(4,hh,w/2); return `<path d="M${x},${yy+hh} V${yy+r} Q${x},${yy} ${x+r},${yy} H${x+w-r} Q${x+w},${yy} ${x+w},${yy+r} V${yy+hh} Z" fill="${c}"/>`; };
  cats.forEach((c,i)=>{
    const cx = m.l + band*i + band/2;
    if(i%every===0) g+=`<text x="${cx}" y="${H-7}" text-anchor="middle">${labels[i]}</text>`;
    let acc=0; const vis = series.filter(s=>(s.vals[i]||0)>0);
    vis.forEach((s,si)=>{ const v=s.vals[i]; const y0=y(acc), y1=y(acc+v); acc+=v;
      const x=cx-bw/2, hh=Math.max(y0-y1-(si?1.5:0),0.6);
      g += si===vis.length-1 && hh>3 ? top(x,y1,bw,hh,s.c) : `<rect x="${x}" y="${y1}" width="${bw}" height="${hh}" fill="${s.c}"/>`; });
    if(P.txt[i]) g += P.chip ? dlChip(cx,y(tot[i]),P.txt[i],dcol) : dlRot(cx,y(tot[i]),P.txt[i],dcol);
    g+=`<rect class="hit" data-i="${i}" x="${m.l+band*i}" y="${m.t}" width="${band}" height="${ih}" fill="transparent" style="cursor:${onClick?"pointer":"default"}"/>`;
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" role="img" aria-label="Grafik batang">${g}</svg>`;
  el.querySelectorAll(".hit").forEach(r=>{
    const i=+r.dataset.i;
    r.onmousemove=e=>tip(e, tipTitle?tipTitle(i):labels[i], series.filter(s=>(s.vals[i]||0)>0).map(s=>({n:s.n,c:s.c,v:vf(s.vals[i])+" "+unit})), series.length>1?vf(tot[i])+" "+unit:null);
    r.onmouseleave=hide;
    if(onClick) r.onclick=()=>{hide(); onClick(cats[i]);};
  });
  const withTot = series.length>1;
  return {h:["Periode",...series.map(s=>`${s.n} (${unit})`),...(withTot?[`Total (${unit})`]:[])],
          r:cats.map((c,i)=>[labels[i],...series.map(s=>vf(s.vals[i]||0)),...(withTot?[vf(tot[i])]:[])])};
}

/* ---------- combo: bar (mm) + line (jam) ---------- */
function combo(el, {cats, labels, bars, line, h=260, tipTitle}){
  const LC = line.c || "var(--line)", LU = line.u || "jam";
  const W0 = Math.max(el.clientWidth, 260), bmax = Math.max(...bars.flatMap(s=>s.vals),0), lmax=Math.max(...line.vals,0);
  const head = Math.max(0,...bars.flatMap(s=>s.vals).map(v=>v>0?DLF.cmp(v).length*5.7:0))+12;
  const W = W0, H=h+head, m={l:40,r:40,t:24+head,b:26};
  const iw=W-m.l-m.r, ih=H-m.t-m.b;
  const s1=niceStep(bmax/4||1), n1=Math.max(1,Math.ceil(bmax/s1)), s2=niceStep(lmax/4||1), n2=Math.max(1,Math.ceil(lmax/s2));
  const nt=Math.max(n1,n2), M1=s1*nt, M2=s2*nt;
  const y1=v=>m.t+ih-v/M1*ih, y2=v=>m.t+ih-v/M2*ih;
  const band=iw/cats.length, nb=bars.length, bw=Math.min(nb>1?12:26, band*(nb>1?0.26:0.6));
  let g="";
  for(let k=0;k<=nt;k++){ const yy=y1(s1*k);
    g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${yy}" y2="${yy}" stroke="${k?"var(--grid)":"var(--axis)"}" ${k?'stroke-dasharray="3 4"':""}/>`;
    g+=`<text x="${m.l-8}" y="${yy+4}" text-anchor="end">${axisFmt(s1*k)}</text><text x="${W-m.r+8}" y="${yy+4}" text-anchor="start" style="fill:${LC}">${axisFmt(s2*k)}</text>`; }
  g+=`<text x="${m.l-32}" y="10" text-anchor="start" style="font-size:10px">mm</text><text x="${W-m.r+8}" y="10" style="font-size:10px;fill:${LC}">${LU}</text>`;
  const lw = Math.max(...labels.map(l=>String(l).length),1)*6.4+10;
  const every = Math.ceil(cats.length / Math.max(1, Math.floor(iw/lw)));
  const pts=[];
  cats.forEach((c,i)=>{
    const cx=m.l+band*i+band/2;
    if(i%every===0) g+=`<text x="${cx}" y="${H-7}" text-anchor="middle">${labels[i]}</text>`;
    bars.forEach((s,si)=>{ const v=s.vals[i]||0; if(v<=0) return; const x=cx-(nb*bw+(nb-1)*2)/2+si*(bw+2), yy=y1(v);
      g+=`<rect x="${x}" y="${yy}" width="${bw}" height="${Math.max(y1(0)-yy,0.6)}" rx="${Math.min(3,bw/2)}" fill="${s.c}" opacity=".85"/>`;
      g+=dlRot(x+bw/2-1,yy,DLF.cmp(v),s.c); });
    pts.push([cx, y2(line.vals[i]||0)]);
  });
  if(pts.length){ g+=`<path d="${pts.map((p,i)=>(i?"L":"M")+p[0]+","+p[1]).join(" ")}" fill="none" stroke="${LC}" stroke-width="2.2" stroke-linejoin="round"/>`;
    pts.forEach((p,i)=>{ if((line.vals[i]||0)>0) g+=`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--surface-solid)" stroke="${LC}" stroke-width="2"/>`; });
    const kk=Math.max(1,Math.ceil(30/band)); pts.forEach((p,i)=>{ const v=line.vals[i]||0; if(v>0 && i%kk===0) g+=dlPt(p[0],p[1],DLF.cmp(v),LC); }); }
  cats.forEach((c,i)=>{ g+=`<rect class="hit" data-i="${i}" x="${m.l+band*i}" y="${m.t}" width="${band}" height="${ih}" fill="transparent"/>`; });
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto" role="img" aria-label="Grafik curah hujan dan loss time">${g}</svg>`;
  el.querySelectorAll(".hit").forEach(r=>{ const i=+r.dataset.i;
    r.onmousemove=e=>tip(e, tipTitle?tipTitle(i):labels[i], [...bars.map(s=>({n:s.n,c:s.c,v:fmm(s.vals[i])+" mm"})),{n:line.n,c:LC,v:fh(line.vals[i])+" "+LU}]);
    r.onmouseleave=hide; });
  return {h:["Periode",...bars.map(s=>s.n+" (mm)"),`${line.n} (${LU})`], r:cats.map((c,i)=>[labels[i],...bars.map(s=>fmm(s.vals[i])),fh(line.vals[i])])};
}

/* ---------- horizontal bars ---------- */
function hbars(el, items, {extra, unit="jam", vf=fh, onClick}={}){
  const bars = items.filter(it=>!it.header);
  if(!bars.length){ el.innerHTML='<div class="empty">Tidak ada data untuk filter ini</div>'; return {h:[],r:[]}; }
  const mx = Math.max(...bars.map(it=>it.total), 1e-9);
  el.innerHTML = items.map((it,k)=> it.header
    ? `<div class="hgrp">${it.c?`<i style="background:${it.c}"></i>`:""}${esc(it.label)}<span>${vf(it.total)} ${unit}</span></div>`
    : `<div class="hbr${it.total?"":" zero"}" data-k="${k}" style="${onClick?"cursor:pointer":""}"><span class="lb" title="${esc(it.label)}">${esc(it.label)}</span><span class="tr">${it.segs.filter(s=>s.v>0).map(s=>`<b style="width:${s.v/mx*100}%;background:${s.c}"></b>`).join("")}</span><span class="vl">${it.total?vf(it.total):"–"}${extra&&it.total?` <em>(${extra(it)})</em>`:""}</span></div>`).join("");
  el.querySelectorAll(".hbr").forEach(row=>{ const it=items[+row.dataset.k];
    row.onmousemove=e=>tip(e,esc(it.label),it.segs.filter(s=>s.v>0).map(s=>({n:s.n,c:s.c,v:vf(s.v)+" "+unit})).concat(it.more||[]), it.segs.length>1?vf(it.total)+" "+unit:null);
    row.onmouseleave=hide; if(onClick) row.onclick=()=>{hide(); onClick(it);}; });
  return {h:["Nama",...bars[0].segs.map(s=>`${s.n} (${unit})`),`Total (${unit})`], r:bars.map(it=>[it.label,...it.segs.map(s=>vf(s.v)),vf(it.total)])};
}

/* ---------- donut ---------- */
function donut(el, parts, sub, onPick){
  const total = parts.reduce((a,p)=>a+p.v,0);
  if(!total){ el.innerHTML='<div class="empty">Tidak ada loss time</div>'; return; }
  const R=68, C=2*Math.PI*R, gap=parts.filter(p=>p.v>0).length>1?3:0; let off=0, arcs="";
  parts.forEach((p,i)=>{ if(!p.v) return; const len=p.v/total*C; const dl=Math.max(len-gap,0.5);
    arcs+=`<circle class="arc" data-i="${i}" cx="85" cy="85" r="${R}" fill="none" stroke="${p.c}" stroke-width="22" stroke-dasharray="${dl} ${C-dl}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)"/>`;
    const sh=p.v/total; if(sh>=0.05){ const a=(off+len/2)/C*2*Math.PI-Math.PI/2; arcs+=`<text x="${(85+R*Math.cos(a)).toFixed(1)}" y="${(85+R*Math.sin(a)+3.5).toFixed(1)}" text-anchor="middle" pointer-events="none" style="font-size:10px;font-weight:800;fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.3);stroke-width:2.4px">${Math.round(sh*100)}%</text>`; }
    off+=len; });
  el.innerHTML = `<svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label="Komposisi tipe"><circle cx="85" cy="85" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="22"/>${arcs}
    <text x="85" y="82" text-anchor="middle" style="fill:var(--ink);font-size:22px;font-weight:800">${nf1.format(total)}</text><text x="85" y="102" text-anchor="middle" style="font-size:11px">${sub}</text></svg>
    <div class="dl-list">${parts.map((p,i)=>p.v>0?`<div data-i="${i}" style="${onPick&&onPick.can(p)?"cursor:pointer":""}"><span><i style="background:${p.c}"></i>${p.n}${onPick&&onPick.can(p)?' <small style="color:var(--accent);font-weight:600">detail ›</small>':""}</span><b>${pct(p.v,total)}%<small>${fh(p.v)} j</small></b></div>`:"").join("")}</div>`;
  el.querySelectorAll(".arc").forEach(a=>{ const p=parts[+a.dataset.i]; a.onmousemove=e=>tip(e,p.n,[{n:"Loss time",c:p.c,v:fh(p.v)+" jam"},{n:"Durasi",v:hm(p.v)},{n:"Porsi",v:pct(p.v,total)+"%"}],null,onPick&&onPick.can(p)?"Klik untuk detail":""); a.onmouseleave=hide;
    if(onPick&&onPick.can(p)){ a.style.cursor="pointer"; a.onclick=()=>{hide(); onPick.go(p);}; } });
  if(onPick) el.querySelectorAll(".dl-list [data-i]").forEach(r=>{ const p=parts[+r.dataset.i]; if(onPick.can(p)) r.onclick=()=>onPick.go(p); });
}

/* ---------- sparkline ---------- */
function spark(vals){
  const W=260,H=46,p=5; const mx=Math.max(...vals,1e-9), mn=0;
  const xs=vals.map((_,i)=>p+i*(W-2*p)/Math.max(vals.length-1,1)), ys=vals.map(v=>H-p-(v-mn)/(mx-mn||1)*(H-2*p));
  if(!xs.length) return "";
  let d=`M${xs[0]},${ys[0]}`; for(let i=1;i<xs.length;i++){ const cx=(xs[i-1]+xs[i])/2; d+=` C${cx},${ys[i-1]} ${cx},${ys[i]} ${xs[i]},${ys[i]}`; }
  const area=d+` L${xs[xs.length-1]},${H} L${xs[0]},${H} Z`;
  const gid="sg"+Math.random().toString(36).slice(2,8);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--c);stop-opacity:0"/></linearGradient></defs><path d="${area}" fill="url(#${gid})"/><path d="${d}" fill="none" style="stroke:var(--c)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

/* ---------- agregasi ---------- */
function buckets(){
  const a=st.dari||FIRST, b=st.sampai||LAST, ds=[];
  for(let d=a; d<=b && ds.length<800; d=addDays(d,1)) ds.push(d);
  if(ds.length<=62){ const multi=a.slice(0,7)!==b.slice(0,7);
    return {daily:true, keys:ds, key:d=>d, label:k=>multi?`${+k.slice(8)}/${+k.slice(5,7)}`:String(+k.slice(8)), title:k=>`${dayName(k)}, ${dLabel(k)}`, n:ds.length}; }
  const ms=months.filter(m=>m>=a.slice(0,7) && m<=b.slice(0,7));
  return {daily:false, keys:ms, key:d=>d.slice(0,7), label:mLabel, title:k=>`${BLNF[+k.slice(5)-1]} ${k.slice(0,4)}`, n:ds.length};
}
const stopRows = (opt={}) => DATA.stop.filter(s=>inRange(s.d) && (opt.allRoutes||st.routes.has(s.r)) && (opt.allTypes||!st.type||s.c===st.type));
const rainRows = () => DATA.rain.filter(x=>inRange(x.d) && posRoutes(x.p).some(r=>st.routes.has(r)));
const sum = (arr, f) => arr.reduce((a,x)=>a+f(x),0);
function groupBy(arr, kf, vf){ const m=new Map(); arr.forEach(x=>{ const k=kf(x); m.set(k,(m.get(k)||0)+vf(x)); }); return m; }
const ICON = {
  clock:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  rain:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 9a4 4 0 0 1-1 7.9M8 19l-1 2M12 18l-1 3M16 19l-1 2"/></svg>',
  mitra:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>',
  drop:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/></svg>',
  hour:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/></svg>',
};
let EXP = null;

/* ---------- H0: gabungan 3 route tanpa jam ganda ----------
   Per hari operasional (06.00-06.00): pada rentang jam yang sama di lebih dari satu route,
   hanya SATU route yang dihitung, yaitu route yang memuat penyebab berprioritas tertinggi
   (SOP 8.4: R > S > T > SI > D > lainnya; seri = beban terbesar). Bobot tiap kejadian =
   Convert Duration / (To - From), jadi rumus Mitra terdampak sebagian (SOP 8.7) tetap ikut.
   Dalam satu route bebannya dibatasi maksimal 100% waktu (SOP 8.4 butir 4). */
const PRI = {R:0, S:1, T:2, SI:3, D:4};
const tmin = s => { const m=/^(\d{1,2}):(\d{2})/.exec(s||""); if(!m) return null; const v=+m[1]*60 + +m[2]; return v<360 ? v+1440 : v; };
DATA.stop.forEach(s=>{ const a=tmin(s.f); let b=tmin(s.t); if(a==null||b==null||!(s.h>0)){ s.a=null; return; } if(b<=a) b+=1440; s.a=a; s.b=b; s.fr=s.h/((b-a)/60); });
function calcH0(rows){
  const out=new Map();
  const add=(d,c,h)=>{ let o=out.get(d); if(!o){o={t:0,c:{}};out.set(d,o);} o.t+=h; o.c[c]=(o.c[c]||0)+h; };
  const byDay=new Map();
  rows.forEach(s=>{ if(!(s.h>0)) return; if(s.a==null){ add(s.d,s.c,s.h); return; } let l=byDay.get(s.d); if(!l){l=[];byDay.set(s.d,l);} l.push(s); });
  const pr = e => PRI[e.c]??5;
  byDay.forEach((ev,d)=>{
    const pts=[...new Set(ev.flatMap(e=>[e.a,e.b]))].sort((x,y)=>x-y);
    for(let i=0;i<pts.length-1;i++){
      const x=pts[i], y=pts[i+1], len=(y-x)/60;
      const act=ev.filter(e=>e.a<=x && e.b>=y); if(!act.length) continue;
      let best=null, bp=99, bl=-1;
      for(const r of ROUTES){ const ar=act.filter(e=>e.r===r); if(!ar.length) continue;
        const p=Math.min(...ar.map(pr)), l=Math.min(1, ar.reduce((a,e)=>a+e.fr,0));
        if(p<bp || (p===bp && l>bl)){ bp=p; bl=l; best=ar; } }
      // satu route maksimal 100% waktu: kapasitas dibagi mulai penyebab berprioritas tertinggi
      let cap=1; [...best].sort((u,v)=>pr(u)-pr(v) || v.fr-u.fr).forEach(e=>{ const f=Math.min(e.fr,cap); if(f>1e-9){ add(d,e.c,f*len); cap-=f; } });
    }
  });
  return out;
}
const GROUPS = [["Technical",["T"],1],["Traffic",["A","E","M"],1],["Dust & Social",["CP","D","SI"],1],["Idle",["R","S"],0],["National Holiday",["NH"],0],["Force Majeure",["FM"],0],["Regulation",["RG"],0],["Mitra Company",["MC"],0]];
const MMJ_CODES = new Set(["T","A","E","M","CP","D","SI"]);
const AREA_SOP = new Set(["Area Mekar Sari","Area Ketapat","Area Bintialo","Area Dayung","Area ISP","Area Selaro","Area Pakerin","Area B 80","Area Mendis"]);

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
  document.body.dataset.v = st.view;
  $("viewSw").querySelectorAll("[data-view-btn]").forEach(b=>b.setAttribute("aria-selected", b.dataset.viewBtn===st.view));
  $("h1t").textContent = st.view==="lt" ? "Loss Time Hauling" : "Rainfall & Curah Hujan";
  document.title = st.view==="lt" ? "Loss Time MMJ" : "Rainfall MMJ";
  $("fBulan").value=st.bulan; $("fType").value=st.type; drawRP();
  $("fRoute").querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed", st.routes.has(b.dataset.r)));
  [["segHm",st.hm],["segCb",st.cb],["segRh",st.rh],["segGv",st.gv],["segPos",st.pos],["segArea",st.av]].forEach(([id,v])=>$(id).querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===v)));
  const B = buckets();
  const SA = stopRows({allTypes:true}), S = stopRows(), R = rainRows();
  const tf = c => !st.type || c===st.type;
  const H0m = calcH0(SA);
  const h0Type = {}; H0m.forEach(o=>{ for(const c in o.c) h0Type[c]=(h0Type[c]||0)+o.c[c]; });
  const g0 = codes => sum(codes.filter(tf), c=>h0Type[c]||0);
  const H0 = g0(TYPES.map(t=>t.c));
  const sumR = sum(S, s=>s.h), ovl = Math.max(0, sumR-H0);
  const h0B = codes => { const cs=(codes||TYPES.map(t=>t.c)).filter(tf); const m=new Map(); H0m.forEach((o,d)=>{ const k=B.key(d); m.set(k,(m.get(k)||0)+sum(cs,c=>o.c[c]||0)); }); return B.keys.map(k=>m.get(k)||0); };
  const h0DayVal = o => sum(TYPES.map(t=>t.c).filter(tf), c=>o.c[c]||0);
  const evN = S.filter(s=>s.h>0).length;
  const ltDays = [...H0m.values()].filter(o=>h0DayVal(o)>0).length;
  const a=st.dari||FIRST, b=st.sampai||LAST;
  const routesSel = ROUTES.filter(r=>st.routes.has(r));
  const typeTxt = st.type ? ` · tipe ${TN[st.type]}` : "";
  const byRoute = Object.fromEntries(ROUTES.map(r=>[r, S.filter(s=>s.r===r)]));
  const rTot = Object.fromEntries(ROUTES.map(r=>[r, sum(byRoute[r],s=>s.h)]));

  /* header */
  $("periodTxt").textContent = `${dLabel(a).replace(a.slice(0,4)===b.slice(0,4)?/ \d{4}$/:/$^/,"")} – ${dLabel(b)}`;
  const vw = st.view==="lt" ? "Loss time" : "Rainfall";
  $("eyebrow").textContent = st.bulan ? `${vw} ${BLNF[+st.bulan.slice(5)-1]} ${st.bulan.slice(0,4)}` : (st.dari||st.sampai) ? `${vw} periode terpilih` : `${vw} ${months.length===1?BLNF[+months[0].slice(5)-1]+" "+months[0].slice(0,4):"2026"}`;
  $("sub").textContent = st.view==="lt" ? `${evN} kejadian stop hauling · route ${routesSel.join(", ")}${typeTxt} · data sampai ${dLabel(LAST)}`
    : `${R.length} catatan hujan Input TCH · route ${routesSel.join(", ")} · data sampai ${dLabel(LAST)}`;
  $("stamp").innerHTML = `Diperbarui<br>${DATA.meta.generated||""}`;

  /* KPI */
  const perB = arr => { const m=groupBy(arr, s=>B.key(s.d), s=>s.h); return B.keys.map(k=>m.get(k)||0); };
  const topType = arr => { const m=groupBy(arr,s=>s.c,s=>s.h); const t=[...m.entries()].sort((x,y)=>y[1]-x[1])[0]; return t&&t[1]>0?t:null; };
  const K = [{c:"var(--k1)", ic:'<b>H0</b>', l:"Total loss time (H0)", v:fh(H0), u:"jam", d:"",
              n:`Jumlah route ${fh(sumR)} j − overlap ${fh(ovl)} j · ${ltDays} hari ada stop`, s:h0B(), off:false}];
  ROUTES.forEach((r,i)=>{ const arr=byRoute[r], t=rTot[r], tt=topType(arr);
    K.push({c:["var(--k2)","var(--k3)","var(--k4)"][i], ic:`<b>${r}</b>`, l:`Loss time ${r}`, v:st.routes.has(r)?fh(t):"–", u:"jam", d:st.routes.has(r)&&H0?pct(t,H0)+"% H0":"",
      n: !st.routes.has(r) ? "Route tidak dipilih di filter" : (r==="ISP" && b<"2026-07") ? "Jan–Jun belum ada route ISP (input hanya H1 & H2)" : tt ? `Terbesar: ${TN[tt[0]]} ${fh(tt[1])} j · ${arr.filter(s=>s.h>0).length} kejadian` : "Tidak ada loss time", s:perB(arr), off:!st.routes.has(r)}); });
  K[0].kp="H0"; ROUTES.forEach((r,i)=>{ K[i+1].kp=r; });
  if(st.kp && st.kp!=="H0" && !st.routes.has(st.kp)) st.kp="";
  $("ringkasan").innerHTML = K.map(k=>{ const can=!k.off; return `<div class="kpi${k.off?" off":""}${can?" clk":""}${st.kp===k.kp?" sel":""}" style="--c:${k.c}"${can?` data-kp="${k.kp}" role="button" tabindex="0" aria-pressed="${st.kp===k.kp}" title="Klik untuk rincian ${k.kp}"`:""}>${can?`<span class="pick">${st.kp===k.kp?"Tutup ✕":"Rincian ›"}</span>`:""}<div class="hd"><div class="ic">${k.ic}</div><div style="min-width:0"><div class="l">${k.l}</div><div class="v">${k.v}<small>${k.u}</small>${k.d?`<span class="d">${k.d}</span>`:""}</div></div></div><div class="n" title="${esc(k.n)}">${k.n}</div>${spark(k.s)}</div>`; }).join("");

  /* rata-rata curah hujan: rata-rata dari akumulasi harian per pos pada hari hujan (bukan penjumlahan) */
  const rainAvg = rows => { const mm=groupBy(rows, x=>x.p+"|"+x.d, x=>x.mm), hh=groupBy(rows, x=>x.p+"|"+x.d, x=>x.h);
    const keys=[...mm.keys()].filter(k=>(mm.get(k)||0)>0 || (hh.get(k)||0)>0);
    return {mm: keys.length?sum(keys,k=>mm.get(k)||0)/keys.length:0, h: keys.length?sum(keys,k=>hh.get(k)||0)/keys.length:0,
            days:new Set(keys.map(k=>k.split("|")[1])).size, pos:new Set(keys.map(k=>k.split("|")[0])).size, n:keys.length}; };
  const lMMJ = g0([...MMJ_CODES]), lIdle = g0(["R","S"]), lMC = g0(["MC"]);
  const posMm = groupBy(R, x=>x.p, x=>x.mm), posH = groupBy(R, x=>x.p, x=>x.h);
  const RA = rainAvg(R);
  const nPos = RA.pos || 1, mmTot = sum(R,x=>x.mm), hTot = sum(R,x=>x.h), rainDays = RA.days;
  const wettest = [...posMm.entries()].sort((x,y)=>y[1]-x[1])[0];

  /* kartu ringkas: hanya muncul bila salah satu route (H0/H1/ISP/H2) diklik */
  const mEl = $("minis");
  if(!st.kp){ mEl.hidden = true; mEl.innerHTML = ""; }
  else {
    const isH0 = st.kp==="H0", r = st.kp;
    const arr = isH0 ? null : byRoute[r];
    const tot = isH0 ? H0 : rTot[r];
    const mmj = isH0 ? lMMJ : sum(arr.filter(s=>MMJ_CODES.has(s.c)), s=>s.h);
    const idle = isH0 ? lIdle : sum(arr.filter(s=>s.c==="R"||s.c==="S"), s=>s.h);
    const ra = rainAvg(isH0 ? R : R.filter(x=>posIn(x.p, r)));
    const col = isH0 ? "var(--k1)" : RCOL[r];
    mEl.hidden = false; mEl.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
    mEl.innerHTML = `<div class="mhd"><i style="background:${col}"></i>Rincian ${isH0?"H0 (total tanpa overlap)":"route "+r}<button type="button" id="kpClose">Tutup ✕</button></div>` + [
      ['<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z"/></svg>',"Loss Time MMJ (T + Traffic + Dust & Social)", fh(mmj), `jam · ${pct(mmj,tot)}% ${st.kp}`],
      ['<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 15a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 9a4 4 0 0 1-1 7.9"/><path d="M12 13v8"/></svg>',"Loss Time Bukan MMJ (Idle + NH + FM + RG + MC)", fh(tot-mmj), `jam · ${pct(tot-mmj,tot)}% ${st.kp} · Idle ${fh(idle)} j`],
      [ICON.drop,`Curah hujan rata-rata per hari hujan (${ra.pos} pos)`, fmm(ra.mm), `mm/hari · ${fh(ra.h)} jam hujan/hari · ${ra.days} hari hujan`],
    ].map(m=>`<div class="mini"><div class="dot" style="color:${col}">${m[0]}</div><div style="min-width:0"><div class="l">${m[1]}</div><div class="v">${m[2]}<small>${m[3]}</small></div></div></div>`).join("");
    $("kpClose").onclick = ()=>{ st.kp=""; render(); };
  }

  /* C1: H0 per tipe */
  const typesH0 = TYPES.filter(t=>tf(t.c) && (h0Type[t.c]||0)>0);
  const series = typesH0.map(t=>({n:t.n, c:TCOL[t.c], vals:h0B([t.c])}));
  $("lg1").innerHTML = series.map(s=>`<span><i style="background:${s.c}"></i>${s.n}</span>`).join("");
  $("t1").textContent = `Total loss time (H0) ${B.daily?"harian":"bulanan"}`;
  const t1 = cols($("c1"), {cats:B.keys, labels:B.keys.map(B.label), series, tipTitle:i=>B.title(B.keys[i]), onClick:B.daily?null:(m=>setMonth(m))});
  if(showTable.c1) $("c1").innerHTML = tableHTML(t1);
  const peak = [...H0m.entries()].map(([d,o])=>[d,h0DayVal(o)]).sort((x,y)=>y[1]-x[1])[0];
  $("big1").innerHTML = `<b>${fh(H0)} jam</b><span class="vs">${hm(H0)} · jumlah route ${fh(sumR)} − tumpang tindih ${fh(ovl)} = H0 · ${ltDays} hari ada stop hauling${peak&&peak[1]>0?` · tertinggi ${dLabel(peak[0])} (${fh(peak[1])} jam)`:""}${B.daily?"":" · klik batang untuk lihat harian"}</span>`;

  /* grafik per route (satu grafik per route, skala sama) */
  const rSeries = {}; let rMax = 0;
  ROUTES.forEach(r=>{ const used=TYPES.filter(t=>byRoute[r].some(s=>s.c===t.c && s.h>0));
    rSeries[r] = used.map(t=>{ const m=groupBy(byRoute[r].filter(s=>s.c===t.c), s=>B.key(s.d), s=>s.h); return {n:t.n, c:TCOL[t.c], vals:B.keys.map(k=>m.get(k)||0)}; });
    B.keys.forEach((_,i)=>{ rMax=Math.max(rMax, sum(rSeries[r],s=>s.vals[i])); }); });
  const usedR = TYPES.filter(t=>ROUTES.some(r=>st.routes.has(r) && byRoute[r].some(s=>s.c===t.c && s.h>0)));
  $("lgR").innerHTML = usedR.map(t=>`<span><i style="background:${TCOL[t.c]}"></i>${t.n}</span>`).join("") + '<span style="color:var(--muted)">· skala sumbu Y sama untuk ketiga route · Jan–Jun hanya H1 &amp; H2 (ISP mulai Jul)</span>';
  ROUTES.forEach(r=>{
    const el=$("cR_"+r);
    $("tR_"+r).textContent = `${r} ${B.daily?"harian":"bulanan"}`;
    if(!st.routes.has(r)){ el.innerHTML='<div class="empty">Route tidak dipilih di filter</div>'; $("bR_"+r).innerHTML=""; return; }
    $("bR_"+r).innerHTML = `${fh(rTot[r])}<small>jam · ${byRoute[r].filter(s=>s.h>0).length} kejadian · ${pct(rTot[r],sumR)}% jumlah route</small>`;
    const t = cols(el, {cats:B.keys, labels:B.keys.map(B.label), series:rSeries[r], h:220, ymax:rMax, tipTitle:i=>`${r} · ${B.title(B.keys[i])}`, onClick:B.daily?null:(m=>setMonth(m))});
    if(showTable["cR_"+r]) el.innerHTML = tableHTML(t);
  });

  /* insight */
  const tt = topType([...Object.entries(h0Type)].filter(([c])=>tf(c)).map(([c,h])=>({c,h})));
  const rainyPosDays = new Set(R.filter(x=>x.mm>0).flatMap(x=>posRoutes(x.p).filter(r=>st.routes.has(r)).map(r=>x.d+"|"+r)));
  const rsDays = new Set(S.filter(s=>(s.c==="R"||s.c==="S") && s.h>0).map(s=>s.d+"|"+s.r));
  const both = [...rainyPosDays].filter(k=>rsDays.has(k)).length;
  $("insight").innerHTML = !tt ? `<div><div class="k">Insight</div><h3>Tidak ada loss time pada filter ini</h3><p>Coba ubah periode, route, atau tipe.</p></div>` :
    `<svg class="icn" width="70" height="70" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5b4fc"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs><ellipse cx="32" cy="58" rx="18" ry="4" fill="rgba(79,70,229,.3)"/><path d="M18 34a10 10 0 1 1 2.2-19.7A13 13 0 0 1 44 18a8.5 8.5 0 0 1-1 17Z" fill="url(#ig)"/><path d="M22 41l-3 6M32 40l-3 8M42 41l-3 6" stroke="#2a78d6" stroke-width="3.5" stroke-linecap="round"/></svg>
    <div><div class="k">Insight</div><h3>${TN[tt[0]]} penyebab terbesar · ${pct(tt[1],H0)}% dari H0</h3>
    <p>${fh(tt[1])} dari ${fh(H0)} jam H0. Loss Time MMJ ${fh(lMMJ)} jam (${pct(lMMJ,H0)}%), bukan MMJ ${fh(H0-lMMJ)} jam (${pct(H0-lMMJ,H0)}%). ${ovl>0.005?`Ada ${fh(ovl)} jam yang terjadi bersamaan di lebih dari satu route dan hanya dihitung sekali di H0.`:""}${rainyPosDays.size?` Dari ${rainyPosDays.size} kombinasi hari-route yang tercatat hujan di pos, ${both} berujung stop hauling karena hujan/licin.`:""}</p></div>
    <button type="button" onclick="document.getElementById('sop').scrollIntoView({behavior:'smooth'})">Kelompok loss time</button>`;

  /* running text */
  { const o=H0m.get(LAST), lastH0=o?h0DayVal(o):0;
    const topR=ROUTES.filter(r=>st.routes.has(r)).sort((x,y)=>rTot[y]-rTot[x])[0];
    const pd=groupBy(R, x=>x.p+"|"+x.d, x=>x.mm), mxPD=[...pd.entries()].sort((x,y)=>y[1]-x[1])[0];
    const lastPos=[...groupBy(R.filter(x=>x.d===LAST), x=>x.p, x=>x.mm).entries()].sort((x,y)=>y[1]-x[1])[0];
    /* tiap item: H0 + setiap route terpilih (H1, ISP, H2) */
    const RS = ROUTES.filter(r=>st.routes.has(r));
    const RX = RS.map(r=>{ const arr=byRoute[r].filter(x=>x.h>0), tot=rTot[r];
      const mmj=sum(arr.filter(x=>MMJ_CODES.has(x.c)), x=>x.h), idle=sum(arr.filter(x=>x.c==="R"||x.c==="S"), x=>x.h);
      const byD=groupBy(arr, x=>x.d, x=>x.h), pk=[...byD.entries()].sort((x,y)=>y[1]-x[1])[0];
      return {r, tot, mmj, idle, n:arr.length, days:byD.size, top:topType(arr), pk, last:byD.get(LAST)||0}; });
    const H0x = {r:"H0", tot:H0, mmj:lMMJ, idle:lIdle, days:ltDays, top:tt, pk:peak&&peak[1]>0?peak:null, last:lastH0};
    const ALL = [H0x, ...RX];
    const seg = (x, body) => `<b>${x.r}</b> ${body}`;
    const join = f => ALL.map(x=>{ const v=f(x); return v?seg(x,v):null; }).filter(Boolean).join(" &nbsp;·&nbsp; ");
    if(st.view==="lt") tickerRender($("ticker"),[
      {ic:"clock",tone:"info",tag:"Total loss time",html:join(x=>`${fh(x.tot)} jam`)},
      H0>0&&{ic:"tool",tone:pct(lMMJ,H0)>=50?"bad":"warn",tag:"Loss time MMJ",html:join(x=>x.tot?`${fh(x.mmj)} j (${pct(x.mmj,x.tot)}%)`:"–")},
      H0>0&&{ic:"rain",tone:"info",tag:"Bukan MMJ",html:join(x=>x.tot?`${fh(x.tot-x.mmj)} j (${pct(x.tot-x.mmj,x.tot)}%)`:"–")},
      tt&&{ic:"alert",tone:"bad",tag:"Penyebab terbesar",html:join(x=>x.top?`${TN[x.top[0]]} ${fh(x.top[1])} j`:"–")},
      {ic:"route",tone:"warn",tag:"Hari ada stop",html:join(x=>`${x.days} hari`)},
      H0>0&&{ic:"trend",tone:"warn",tag:"Hari tertinggi",html:join(x=>x.pk?`${fh(x.pk[1])} j (${dLabel(x.pk[0]).replace(/ \d{4}$/,"")})`:"–")},
      {ic:"cal",tone:lastH0>0?"warn":"good",tag:`Hari terakhir · ${dLabel(LAST)}`,html:join(x=>x.last>0?`${fh(x.last)} j`:"tanpa stop")},
      lIdle>0&&{ic:"drop",tone:"info",tag:"Idle hujan / slippery",html:join(x=>x.tot?`${fh(x.idle)} j (${pct(x.idle,x.tot)}%)`:"–")},
    ]);
    else tickerRender($("ticker"),[
      {ic:"rain",tone:"info",tag:"Hari hujan",html:`<b>${rainDays} hari</b> · ${RA.pos} pos tercatat`},
      {ic:"drop",tone:"info",tag:"Rata-rata",html:`<b>${fmm(RA.mm)} mm</b> per hari hujan per pos · ${fh(RA.h)} jam hujan`},
      wettest&&wettest[1]>0&&{ic:"pin",tone:"warn",tag:"Pos terbasah",html:`<b>${wettest[0]}</b> ${fmm(wettest[1])} mm`},
      mxPD&&mxPD[1]>0&&{ic:"alert",tone:"bad",tag:"Hujan harian tertinggi",html:`<b>${fmm(mxPD[1])} mm</b> · ${mxPD[0].split("|")[0]}, ${dLabel(mxPD[0].split("|")[1])}`},
      {ic:"cal",tone:lastPos&&lastPos[1]>0?"warn":"good",tag:`Hari terakhir · ${dLabel(LAST)}`,html:lastPos&&lastPos[1]>0?`Hujan s/d <b>${fmm(lastPos[1])} mm</b> di ${lastPos[0]}`:`<b>Tidak ada hujan</b>`},
      both>0&&{ic:"clock",tone:"warn",tag:"Hujan & idle",html:`<b>${both}</b> hari-route hujan bersamaan dengan Idle R/S`},
    ]);
  }

  /* donut H0 + route vs H0 */
  donut($("cMix"), TYPES.map(t=>({n:t.n, c:TCOL[t.c], code:t.c, v:tf(t.c)?(h0Type[t.c]||0):0})), "jam H0", {can:p=>p.code==="MC", go:openMc});
  $("cSplit").innerHTML = !sumR ? '<div class="empty">Tidak ada data</div>' :
    `<div class="split">${ROUTES.filter(r=>rTot[r]>0).map(r=>`<div style="flex:${rTot[r]};background:${RCOL[r]}" title="${r}"></div>`).join("")}</div>
     <div class="dl-list" style="max-height:none">${ROUTES.map(r=>`<div><span><i style="background:${RCOL[r]}"></i>${r}<small style="color:var(--muted);font-size:11px">${DATA.areas[r].filter(x=>AREA_SOP.has(x)).map(s=>s.replace("Area ","")).join(", ")}</small></span><b>${fh(rTot[r])} j<small>${pct(rTot[r],sumR)}%</small></b></div>`).join("")}</div>
     <div class="h0box"><div><span>Jumlah 3 route</span><b>${fh(sumR)}</b></div><div><span>Tumpang tindih</span><b style="color:var(--bad)">− ${fh(ovl)}</b></div><div style="background:var(--accent-soft)"><span>H0</span><b style="color:var(--accent)">${fh(H0)}</b></div></div>`;

  /* kelompok SOP (Tabel 6) — abaikan filter tipe */
  const grpRow = (getC) => { const g=GROUPS.map(([n,cs])=>sum(cs,c=>getC(c))); const mmj=g[0]+g[1]+g[2], non=g.slice(3).reduce((x,y)=>x+y,0); return {g, mmj, non, tot:mmj+non}; };
  const cellR = (r,c) => sum(SA.filter(s=>s.r===r && s.c===c), s=>s.h);
  const grpRows = [...routesSel.map(r=>({lab:r, c:RCOL[r], ...grpRow(c=>cellR(r,c))})), {lab:"H0", h0:true, ...grpRow(c=>h0Type[c]||0)}];
  const gv = v => v>0.004 ? fh(v) : '<span style="color:var(--muted)">–</span>';
  $("cGrp").innerHTML = `<table><thead><tr><th>Route</th>${GROUPS.slice(0,3).map(g=>`<th class="r">${g[0]}</th>`).join("")}<th class="r" style="color:var(--accent)">Loss Time MMJ</th>${GROUPS.slice(3).map(g=>`<th class="r${g[0]==="Idle"?" sep":""}">${g[0]}</th>`).join("")}<th class="r">Bukan MMJ</th><th class="r sep">Total</th><th class="r">% MMJ</th></tr></thead><tbody>`
    + grpRows.map(o=>`<tr class="${o.h0?"h0":""}"><td>${o.h0?'<b>H0</b> <small style="color:var(--muted)">tanpa overlap</small>':`<span class="tag"><i style="background:${o.c}"></i>${o.lab}</span>`}</td>${o.g.slice(0,3).map(v=>`<td class="v">${gv(v)}</td>`).join("")}<td class="v" style="font-weight:700;color:var(--accent)">${gv(o.mmj)}</td>${o.g.slice(3).map((v,i)=>`<td class="v${i===0?" sep":""}"${i===4&&v>0?' style="cursor:pointer;text-decoration:underline dotted" data-mc="1" title="Detail Mitra Company"':""}>${gv(v)}</td>`).join("")}<td class="v" style="font-weight:700">${gv(o.non)}</td><td class="v sep" style="font-weight:700">${gv(o.tot)}</td><td class="v">${o.tot?pct(o.mmj,o.tot)+"%":""}</td></tr>`).join("")
    + `</tbody></table><div class="sopnote">Technical = T · Traffic = Accident + Evacuation + Mobilisation · Dust &amp; Social = Community Party + Dust + Social Issue · Idle = Rain + Slippery. Baris H0 = total setelah jam yang bersamaan antar route dihitung sekali.</div>`;
  $("cGrp").querySelectorAll("[data-mc]").forEach(td=>td.onclick=openMc);

  /* matrix route x tipe */
  const mxVals = TYPES.map(t=>routesSel.map(r=>cellR(r,t.c)));
  const mxMax = Math.max(...mxVals.flat(), 1e-9);
  const shade = v => v>0 ? `background:color-mix(in srgb,var(--accent) ${Math.round(8+v/mxMax*52)}%,transparent);${v/mxMax>.55?"color:#fff;":""}` : "";
  const colTot = routesSel.map((r,j)=>sum(mxVals,row=>row[j])), grand = sum(colTot,x=>x);
  const h0All = sum(TYPES, t=>h0Type[t.c]||0);
  $("cMx").innerHTML = `<table class="mx"><thead><tr><th>Kode</th><th>Tipe</th>${routesSel.map(r=>`<th class="rt"><span class="tag"><i style="background:${RCOL[r]}"></i>${r}</span></th>`).join("")}<th class="r">Jumlah route</th><th class="r" style="color:var(--accent)">H0</th><th class="r">Porsi H0</th></tr></thead><tbody>`
    + TYPES.map((t,i)=>{ const rt=sum(mxVals[i],x=>x), h=h0Type[t.c]||0; return `<tr data-c="${t.c}" class="${st.type===t.c?"sel":""}" style="cursor:pointer" title="${t.c==="MC"?"Klik untuk detail Mitra Company":"Klik untuk filter tipe"}"><td><span class="badge" style="background:${TCOL[t.c]}">${t.c}</span></td><td>${t.n}${t.c==="MC"?' <small style="color:var(--accent);font-weight:600">detail ›</small>':""}</td>${mxVals[i].map(v=>`<td class="v${v?"":" z"}" style="${shade(v)}">${v?fh(v):"–"}</td>`).join("")}<td class="r">${rt?fh(rt):"–"}</td><td class="r" style="font-weight:700">${h>0.004?fh(h):"–"}</td><td class="r">${h>0.004?pct(h,h0All)+"%":""}</td></tr>`; }).join("")
    + `<tr class="tot"><td></td><td>Total</td>${colTot.map(v=>`<td class="r">${fh(v)}</td>`).join("")}<td class="r">${fh(grand)}</td><td class="r">${fh(h0All)}</td><td class="r">100%</td></tr></tbody></table>`;
  $("cMx").querySelectorAll("tr[data-c]").forEach(tr=>tr.onclick=()=>{ if(tr.dataset.c==="MC"){ openMc(); return; } st.type = st.type===tr.dataset.c ? "" : tr.dataset.c; render(); });

  /* area */
  const typesUsed = TYPES.filter(t=>S.some(s=>s.c===t.c && s.h>0));
  $("lgA").innerHTML = typesUsed.map(t=>`<span><i style="background:${TCOL[t.c]}"></i>${t.n}</span>`).join("");
  const aItems = [];
  routesSel.forEach(r=>{
    const arr=byRoute[r]; const rows = DATA.areas[r].map(ar=>{ const x=arr.filter(s=>s.area===ar);
      return {label:ar, total:sum(x,s=>s.h), segs:typesUsed.map(t=>({n:t.n,c:TCOL[t.c],v:sum(x.filter(s=>s.c===t.c),s=>s.h)})), more:[{n:"Kejadian",v:x.filter(s=>s.h>0).length}]}; })
      .filter(it=>it.total>0 || AREA_SOP.has(it.label));
    aItems.push({header:true, label:r, c:RCOL[r], total:sum(arr,s=>s.h)}, ...rows);
  });
  const tA = hbars($("cArea"), aItems, {extra:it=>`${it.more[0].v}×`});
  if(showTable.cArea) $("cArea").innerHTML = tableHTML(tA);

  /* Mitra Company — tampil hanya saat diklik */
  $("mitraSec").hidden = !st.mc;
  $("mcSub").hidden = !st.mc; $("navMc").setAttribute("aria-expanded", st.mc);
  $("mcSub").querySelectorAll("[data-mcv]").forEach(a=>a.classList.toggle("on", st.mc && a.dataset.mcv===st.mcv));
  $("segMc").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===st.mcv));
  document.querySelectorAll("[data-mcp]").forEach(el=>el.hidden = el.dataset.mcp!==st.mcv);
  const MCr = SA.filter(s=>s.c==="MC");
  const t2s = [...groupBy(MCr, s=>s.t2, s=>s.h).entries()].sort((x,y)=>y[1]-x[1]).map(x=>x[0]);
  const t2c = Object.fromEntries(t2s.map((t,i)=>[t, MCPAL[i%MCPAL.length]]));
  const mcTot = sum(MCr,s=>s.h);
  let descRows = [];
  if(st.mc){
    $("pMc").textContent = `${fh(mcTot)} jam (jumlah route) · H0 ${fh(h0Type.MC||0)} jam · ${MCr.filter(s=>s.h>0).length} kejadian · warna = route`;
    $("lgMc").innerHTML = routesSel.map(r=>`<span><i style="background:${RCOL[r]}"></i>${r}</span>`).join("");
    hbars($("cMc"), t2s.map(t=>{ const x=MCr.filter(s=>s.t2===t); return {label:t, total:sum(x,s=>s.h), segs:routesSel.map(r=>({n:r,c:RCOL[r],v:sum(x.filter(s=>s.r===r),s=>s.h)})), more:[{n:"Kejadian",v:x.filter(s=>s.h>0).length}]}; }),
      {extra:it=>`${it.more[0].v}×`});
    $("tMc2").textContent = B.daily ? "Mitra Company harian" : "Mitra Company bulanan";
    const mcSeries = t2s.map(t=>{ const m=groupBy(MCr.filter(s=>s.t2===t), s=>B.key(s.d), s=>s.h); return {n:t, c:t2c[t], vals:B.keys.map(k=>m.get(k)||0)}; });
    $("lgMc2").innerHTML = mcSeries.map(s=>`<span><i style="background:${s.c}"></i>${esc(s.n)}</span>`).join("");
    const tM2 = cols($("cMc2"), {cats:B.keys, labels:B.keys.map(B.label), series:mcSeries, h:240, tipTitle:i=>B.title(B.keys[i])});
    if(showTable.cMc2) $("cMc2").innerHTML = tableHTML(tM2);
  }
  const byDesc = new Map(); MCr.forEach(s=>{ const k=s.r+"|"+s.t2+"|"+s.desc; const o=byDesc.get(k)||{r:s.r,t2:s.t2,desc:s.desc,h:0,n:0,days:new Set(),area:s.area}; o.h+=s.h; if(s.h>0) o.n++; o.days.add(s.d); byDesc.set(k,o); });
  descRows = [...byDesc.values()].sort((x,y)=>y.h-x.h);
  if(st.mc) $("tMc").innerHTML = `<table><thead><tr><th>Route</th><th>Desc Type2</th><th>Keterangan</th><th>Area</th><th class="r">Hari</th><th class="r">Kejadian</th><th class="r">Jam</th><th class="r">Porsi MC</th></tr></thead><tbody>`
    + (descRows.length ? descRows.slice(0,300).map(o=>`<tr><td><span class="tag"><i style="background:${RCOL[o.r]}"></i>${o.r}</span></td><td><span class="tag"><i style="background:${t2c[o.t2]}"></i>${esc(o.t2)}</span></td><td class="wrap">${esc(o.desc)}</td><td>${esc(o.area)}</td><td class="r">${o.days.size}</td><td class="r">${o.n}</td><td class="r">${fh(o.h)}</td><td class="r">${pct(o.h,mcTot)}%</td></tr>`).join("")
      : `<tr><td colspan="8" class="empty">Tidak ada loss time Mitra Company</td></tr>`) + `</tbody></table>`;

  /* heatmap curah hujan */
  const isMm = st.hm==="mm";
  const hv = new Map(); R.forEach(x=>{ const k=x.p+"|"+B.key(x.d); const o=hv.get(k)||{mm:0,h:0,ev:[]}; o.mm+=x.mm; o.h+=x.h; o.ev.push(x); hv.set(k,o); });
  const hmMax = Math.max(...[...hv.values()].map(o=>isMm?o.mm:o.h), 1e-9);
  $("tHm").textContent = `${isMm?"Curah hujan":"Durasi hujan"} ${B.daily?"harian":"bulanan"} per pos`;
  $("pHm").textContent = `${isMm?"Rainfall (mm)":"Rain hours / Duration Convert (jam)"} akumulasi per ${B.daily?"hari":"bulan"} per pos dari Input TCH (SBL Port dari sheet RAIN FALL) · KM 124–KM 75 = H1 · ISP68 = ISP · KM 47–KM 12 & SBL Port = H2`;
  let hmH = `<table><thead><tr><th></th>${B.keys.map(k=>`<th>${B.label(k)}</th>`).join("")}<th style="text-align:right;padding-left:10px">Total</th></tr></thead><tbody>`;
  routesSel.forEach(r=>{
    hmH += `<tr><td class="g" colspan="${B.keys.length+2}"><span class="tag"><i style="background:${RCOL[r]};border-radius:50%"></i>${r}</span></td></tr>`;
    POS.filter(p=>p.r===r).forEach(p=>{
      let rowT=0;
      hmH += `<tr><td class="p">${p.n.replace("MMJ ","")}</td>` + B.keys.map(k=>{ const o=hv.get(p.n+"|"+k); const v=o?(isMm?o.mm:o.h):0; rowT+=v;
        const f=v/hmMax; const bg = o ? `background:color-mix(in srgb,var(--rain) ${Math.round(12+f*80)}%,var(--surface-2))` : "";
        return `<td class="cell${v>0?"":" z"}${f>.5?" dk":""}" data-k="${esc(p.n)}|${k}" style="${bg}">${v>0?(isMm?(v>=100?nf0.format(v):nf1.format(v).replace(",0","")):nf1.format(v)):(o?"0":"")}</td>`; }).join("")
        + `<td class="tt">${isMm?fmm(rowT)+" mm":fh(rowT)+" j"}</td></tr>`;
    });
  });
  $("cHm").innerHTML = hmH + `</tbody></table>`;
  $("cHm").querySelectorAll("td.cell").forEach(td=>{ const [p,k]=td.dataset.k.split("|"); const o=hv.get(p+"|"+k);
    td.onmousemove=e=>tip(e, `${p} · ${B.title(k)}`, o?[{n:"Rainfall",c:"var(--rain)",v:fmm(o.mm)+" mm"},{n:"Durasi hujan",v:fh(o.h)+" jam ("+hm(o.h)+")"},{n:"Catatan",v:o.ev.length+"×"}]:[{n:"Tidak ada catatan hujan",v:""}], null,
      o&&B.daily?o.ev.map(x=>`${x.f}–${x.t}${x.mm?` · ${fmm(x.mm)} mm`:""}`).join("<br>"):"");
    td.onmouseleave=hide; });
  $("scHm").innerHTML = `<span>0</span><b style="background:linear-gradient(90deg,color-mix(in srgb,var(--rain) 12%,var(--surface-2)),var(--rain))"></b><span>${isMm?fmm(hmMax)+" mm":fh(hmMax)+" jam"}</span><span style="margin-left:8px">· sel kosong = tidak ada catatan hujan · nilai 0 = hujan tercatat tanpa angka rainfall</span>`;

  /* rata-rata pos per route per bucket */
  const posN = r => POS.filter(p=>posIn(p.n,r) && DATA.rain.some(x=>x.p===p.n)).length || 1;
  const avgPos = (r, f) => { const m=groupBy(R.filter(x=>posIn(x.p,r)), x=>B.key(x.d), f); return B.keys.map(k=>(m.get(k)||0)/posN(r)); };

  /* kartu ringkas Rainfall: rata-rata per hari hujan (semua pos & per route) */
  const allPosN = POS.filter(p=>posRoutes(p.n).some(r=>st.routes.has(r)) && DATA.rain.some(x=>x.p===p.n)).length || 1;
  const allSpark = (()=>{ const m=groupBy(R, x=>B.key(x.d), x=>x.mm); return B.keys.map(k=>(m.get(k)||0)/allPosN); })();
  const RK = [{c:"var(--k1)", ic:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/></svg>', l:`Semua pos (${RA.pos})`, ra:RA, s:allSpark, off:false,
               n:wettest?`Pos terbasah ${wettest[0].replace("MMJ ","")} · ${fmm(wettest[1])} mm akumulasi`:"Tidak ada hujan tercatat"}];
  ROUTES.forEach((r,i)=>{ const rows=R.filter(x=>posIn(x.p,r)), ra=rainAvg(rows);
    const pm=groupBy(rows,x=>x.p,x=>x.mm), top=[...pm.entries()].sort((a,b)=>b[1]-a[1])[0];
    RK.push({c:["var(--k2)","var(--k3)","var(--k4)"][i], ic:`<b>${r}</b>`, l:`Rainfall ${r} (${ra.pos} pos)`, ra, s:avgPos(r,x=>x.mm), off:!st.routes.has(r),
      n:!st.routes.has(r)?"Route tidak dipilih di filter":top?`Terbasah ${top[0].replace("MMJ ","")} · ${fmm(top[1])} mm akumulasi`:"Tidak ada hujan tercatat"}); });
  $("rfKpi").innerHTML = RK.map(k=>`<div class="kpi${k.off?" off":""}" style="--c:${k.c}"><div class="hd"><div class="ic">${k.ic}</div><div style="min-width:0"><div class="l">${k.l}</div><div class="v">${k.off?"–":fmm(k.ra.mm)}<small>mm/hari hujan</small></div></div></div><div class="n">${k.off?"":`${fh(k.ra.h)} jam hujan/hari · ${k.ra.days} hari hujan`}</div><div class="n" title="${esc(k.n)}">${k.n}</div>${spark(k.s)}</div>`).join("");

  /* rainfall vs rain hours */
  const rhRoutes = st.rh==="all" ? routesSel : [st.rh].filter(r=>st.routes.has(r));
  const rhBars = rhRoutes.map(r=>({n:`Rainfall ${r}`, c:RCOL[r], vals:avgPos(r, x=>x.mm)}));
  const rhPos = new Set(POS.filter(p=>posRoutes(p.n).some(r=>rhRoutes.includes(r)) && DATA.rain.some(x=>x.p===p.n)).map(p=>p.n));
  const rhN = rhPos.size || 1;
  const rhM = groupBy(R.filter(x=>rhPos.has(x.p)), x=>B.key(x.d), x=>x.h);
  const rhLine = {n:`Rain hours ${st.rh==="all"?"":st.rh}`.trim(), c:"var(--accent)", u:"jam", vals:B.keys.map(k=>(rhM.get(k)||0)/rhN)};
  $("lgRh").innerHTML = rhBars.map(s=>`<span><i style="background:${s.c}"></i>${s.n} (rata-rata pos)</span>`).join("") + `<span><i class="ln" style="background:var(--accent)"></i>${rhLine.n} (rata-rata ${rhN} pos)</span>`;
  const tRh = rhRoutes.length ? combo($("cRh"), {cats:B.keys, labels:B.keys.map(B.label), bars:rhBars, line:rhLine, tipTitle:i=>B.title(B.keys[i])}) : ($("cRh").innerHTML='<div class="empty">Route tidak dipilih</div>', {h:[],r:[]});
  if(showTable.cRh) $("cRh").innerHTML = tableHTML(tRh);

  /* curah hujan vs loss time hujan */
  const cbRoutes = st.cb==="all" ? routesSel : [st.cb].filter(r=>st.routes.has(r));
  const cbBars = cbRoutes.map(r=>({n:`Rainfall ${r}`, c:RCOL[r], vals:avgPos(r, x=>x.mm)}));
  let lineVals;
  if(st.cb==="all"){ const m=new Map(); H0m.forEach((o,d)=>{ const k=B.key(d); m.set(k,(m.get(k)||0)+(o.c.R||0)+(o.c.S||0)); }); lineVals=B.keys.map(k=>m.get(k)||0); }
  else { const m=groupBy(SA.filter(s=>(s.c==="R"||s.c==="S") && s.r===st.cb), s=>B.key(s.d), s=>s.h); lineVals=B.keys.map(k=>m.get(k)||0); }
  const cbLine = {n:`Idle (R+S) ${st.cb==="all"?"H0":st.cb}`, vals:lineVals};
  $("lgCb").innerHTML = cbBars.map(s=>`<span><i style="background:${s.c}"></i>${s.n} (rata-rata pos)</span>`).join("") + `<span><i class="ln" style="background:var(--line)"></i>Loss time ${cbLine.n}</span>`;
  const tCb = cbRoutes.length ? combo($("cCb"), {cats:B.keys, labels:B.keys.map(B.label), bars:cbBars, line:cbLine, tipTitle:i=>B.title(B.keys[i])}) : ($("cCb").innerHTML='<div class="empty">Route tidak dipilih</div>', {h:[],r:[]});
  if(showTable.cCb) $("cCb").innerHTML = tableHTML(tCb);

  /* per pos */
  const posItems = [];
  routesSel.forEach(r=>{ const ps=POS.filter(p=>p.r===r);
    posItems.push({header:true, label:r, c:RCOL[r], total:sum(ps,p=>posMm.get(p.n)||0)});
    ps.forEach(p=>{ const x=R.filter(y=>y.p===p.n); posItems.push({label:p.n.replace("MMJ ",""), total:posMm.get(p.n)||0, h:posH.get(p.n)||0, days:new Set(x.filter(y=>y.mm>0||y.h>0).map(y=>y.d)).size,
      segs:[{n:"Rainfall",c:RCOL[r],v:posMm.get(p.n)||0}], more:[{n:"Durasi hujan",v:fh(posH.get(p.n)||0)+" jam"},{n:"Hari hujan",v:new Set(x.map(y=>y.d)).size+" hari"}]}); }); });
  hbars($("cPos"), posItems, {unit:"mm", vf:fmm, extra:it=>`${fh(it.h)} j · ${it.days} hr`});
  if(showTable.cPos) $("cPos").innerHTML = tableHTML({h:["Pos","Rainfall (mm)","Durasi hujan (jam)","Hari hujan"], r:posItems.filter(i=>!i.header).map(i=>[i.label,fmm(i.total),fh(i.h),i.days])});
  if(!DATA.rain.some(x=>x.p==="SBL Port") && st.routes.has("H2")) $("cPos").insertAdjacentHTML("beforeend", `<div style="font-size:11px;color:var(--muted);margin-top:6px">SBL Port belum ada catatan di Input TCH.</div>`);

  /* rekap harian (hanya untuk Export Excel) */
  const h0K = new Map(); H0m.forEach((o,d)=>{ const k=B.key(d); const x=h0K.get(k)||{t:0,rs:0,mc:0}; x.t+=h0DayVal(o); x.rs+=tf("R")?(o.c.R||0):0; x.rs+=tf("S")?(o.c.S||0):0; x.mc+=tf("MC")?(o.c.MC||0):0; h0K.set(k,x); });
  const dayRows = B.keys.map(k=>{ const o={k}; ROUTES.forEach(r=>{ o[r]=sum(byRoute[r].filter(s=>B.key(s.d)===k),s=>s.h); }); o.sum=sum(routesSel,r=>o[r]);
    const x=h0K.get(k)||{t:0,rs:0,mc:0}; o.h0=x.t; o.ovl=Math.max(0,o.sum-o.h0); o.rs=x.rs; o.mc=x.mc;
    ROUTES.forEach(r=>{ o["mm"+r]=sum(R.filter(y=>posIn(y.p,r) && B.key(y.d)===k),y=>y.mm)/posN(r); }); return o; });

  /* tipcard */
  ($("tipcard")||{}).innerHTML = wettest ? `<span class="pill">Pos terbasah</span><b>${wettest[0]} · ${fmm(wettest[1])} mm</b><p>${fh(posH.get(wettest[0])||0)} jam hujan pada periode ini · rute ${POSR[wettest[0]]}</p><svg width="110" height="110" viewBox="0 0 24 24" fill="#fff"><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/></svg>` : `<span class="pill">Curah hujan</span><b>Tidak ada hujan tercatat</b><p>pada periode &amp; route terpilih</p>`;

  $("pinfo").textContent = `Periode: ${rangeText()} · Route: ${routesSel.join(", ")} · Tipe: ${st.type?TN[st.type]:"semua"} · Dicetak ${new Date().toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}`;
  const X = renderExtra({B, SA, R, H0m, h0Type, routesSel, H0, lMMJ, grpRows});
  document.querySelectorAll("[data-av]").forEach(el=>el.hidden = el.dataset.av!==st.av);
  $("pArea").textContent = st.av==="tbl" ? X.t5note : "Jam, dikelompokkan per route · warna = tipe · kejadian dalam kurung";

  /* detail penyebab (jam per tipe) untuk H0 & tiap route, sesuai periode terfilter */
  const dtHTML = (rows, total, label) => { const mx=Math.max(...rows.map(x=>x.h),1e-9);
    return `<div style="font-size:11.5px;color:var(--ink-2);margin-bottom:6px">Periode ${rangeText()}</div><div style="overflow-x:auto"><table><thead><tr><th>Penyebab ${label}</th><th class="r">Jam</th><th class="r">%</th><th class="r">Kej.</th></tr></thead><tbody>`
      + (rows.length ? rows.map(x=>`<tr><td style="white-space:normal"><span class="tag"><i style="background:${TCOL[x.c]}"></i>${TN[x.c]}</span><span class="bar" style="width:${x.h/mx*100}%;background:${TCOL[x.c]}"></span></td><td class="r"><b>${fh(x.h)}</b><br><small style="color:var(--muted)">${hm(x.h)}</small></td><td class="r">${pct(x.h,total)}%</td><td class="r">${x.n??"–"}</td></tr>`).join("")
        : `<tr><td colspan="4" class="empty">Tidak ada loss time</td></tr>`)
      + `<tr class="tot"><td>Total</td><td class="r">${fh(total)}<br><small style="color:var(--muted);font-weight:500">${hm(total)}</small></td><td class="r">100%</td><td class="r">${sum(rows,x=>x.n||0)||"–"}</td></tr></tbody></table></div>`; };
  ["H0",...ROUTES].forEach(k=>{
    const el=$("dt_"+k), open=st.dt.has(k) && (k==="H0" || st.routes.has(k));
    document.querySelectorAll(`.dtb[data-dt="${k}"]`).forEach(b=>{ b.classList.toggle("on",open); b.setAttribute("aria-expanded",open); });
    el.hidden = !open; if(!open){ el.innerHTML=""; return; }
    let rows;
    if(k==="H0") rows = TYPES.filter(t=>tf(t.c) && (h0Type[t.c]||0)>0.004).map(t=>({c:t.c, h:h0Type[t.c], n:S.filter(s=>s.c===t.c && s.h>0).length}));
    else rows = TYPES.map(t=>{ const x=byRoute[k].filter(s=>s.c===t.c && s.h>0); return {c:t.c, h:sum(x,s=>s.h), n:x.length}; }).filter(x=>x.h>0.004);
    rows.sort((a,b)=>b.h-a.h);
    el.innerHTML = dtHTML(rows, sum(rows,x=>x.h), k);
  });
  EXP = {S, SA, R, B, H0, sumR, ovl, h0Type, grpRows, lMMJ, lIdle, lMC, evN, ltDays, routesSel, dayRows, descRows, MCr, t2s, mmTot, hTot, nPos, rainDays, RA, ...X};
  renderEvents();
}

/* ---------- saran SOP: MMJ vs bukan MMJ, Tabel 5, kontrol Slippery, kelengkapan data ---------- */
const GCOL = {"Technical":"#f2b632","Traffic":"#e0842a","Dust & Social":"#a47148","Idle":"#2a78d6","National Holiday":"#94a3b8","Force Majeure":"#64748b","Regulation":"#7fb13a","Mitra Company":"#5b4bd6"};
const C_MMJ = "#e0842a", C_NON = "#5b7cf5";
function renderExtra({B, SA, R, H0m, h0Type, routesSel, H0, lMMJ, grpRows}){
  const out = {};
  /* 1+4. tren kelompok (H0, abaikan filter tipe) */
  const gB = codes => { const m=new Map(); H0m.forEach((o,d)=>{ const k=B.key(d); m.set(k,(m.get(k)||0)+sum(codes,c=>o.c[c]||0)); }); return B.keys.map(k=>m.get(k)||0); };
  const mmjCodes=[...MMJ_CODES], nonCodes=TYPES.map(t=>t.c).filter(c=>!MMJ_CODES.has(c));
  const series = st.gv==="mmj"
    ? [{n:"Loss Time MMJ", c:C_MMJ, vals:gB(mmjCodes)}, {n:"Bukan MMJ", c:C_NON, vals:gB(nonCodes)}]
    : GROUPS.map(([n,cs])=>({n, c:GCOL[n], vals:gB(cs)})).filter(s=>s.vals.some(v=>v>0));
  $("tGt").textContent = `Tren ${st.gv==="mmj"?"Loss Time MMJ vs Bukan MMJ":"kelompok loss time"} (H0) ${B.daily?"harian":"bulanan"}`;
  $("lgGt").innerHTML = series.map(s=>`<span><i style="background:${s.c}"></i>${s.n}</span>`).join("");
  const h0All = sum(TYPES,t=>h0Type[t.c]||0), mmjAll = sum(mmjCodes,c=>h0Type[c]||0);
  $("bGt").innerHTML = `<b style="color:${C_MMJ}">${fh(mmjAll)} j</b><span style="font-size:13px;font-weight:600;color:var(--ink-2)">MMJ (${pct(mmjAll,h0All)}%) · bukan MMJ ${fh(h0All-mmjAll)} j (${pct(h0All-mmjAll,h0All)}%)</span>`;
  const tG = cols($("cGt"), {cats:B.keys, labels:B.keys.map(B.label), series, h:250, tipTitle:i=>B.title(B.keys[i]), onClick:B.daily?null:(m=>setMonth(m))});
  if(showTable.cGt) $("cGt").innerHTML = tableHTML(tG);
  out.gt = tG;
  $("cMmj").innerHTML = grpRows.map(o=>{ const t=o.tot||0; return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><span class="tag">${o.h0?"<b>H0</b>":`<i style="background:${o.c};border-radius:50%"></i><b>${o.lab}</b>`}</span><span style="color:var(--ink-2)">${fh(t)} j</span></div>
      <div class="split" style="margin:0 0 4px;height:14px">${o.mmj>0?`<div style="flex:${o.mmj};background:${C_MMJ}"></div>`:""}${o.non>0?`<div style="flex:${o.non};background:${C_NON}"></div>`:""}</div>
      <div style="display:flex;justify-content:space-between;font-size:11.5px"><span style="color:${C_MMJ};font-weight:600">MMJ ${pct(o.mmj,t)}% · ${fh(o.mmj)} j</span><span style="color:${C_NON};font-weight:600">Bukan MMJ ${pct(o.non,t)}% · ${fh(o.non)} j</span></div></div>`; }).join("")
    + `<div class="sopnote">MMJ = Technical + Traffic + Dust &amp; Social. Bukan MMJ = Idle + National Holiday + Force Majeure + Regulation + Mitra Company.</div>`;

  /* 3. Tabel 5 */
  const codes = TYPES.map(t=>t.c);
  const gv = v => v>0.004 ? fh(v) : '<span style="color:var(--muted)">–</span>';
  let t5 = `<table><thead><tr><th>Route</th><th>Area kerja</th>${codes.map(c=>`<th class="r">${c}</th>`).join("")}<th class="r sep">Total</th><th class="r">Grand Total</th><th class="r">Cek</th></tr></thead><tbody>`;
  const t5rows = []; let nFalse = 0;
  routesSel.forEach(r=>{
    const arr = SA.filter(s=>s.r===r), rt = sum(arr,s=>s.h);
    const areas = DATA.areas[r].filter(a=>AREA_SOP.has(a) || arr.some(s=>s.area===a && s.h>0));
    const noArea = arr.filter(s=>!DATA.areas[r].includes(s.area));
    const rowsA = areas.map(a=>{ const x=arr.filter(s=>s.area===a); return {a, sop:AREA_SOP.has(a), v:codes.map(c=>sum(x.filter(s=>s.c===c),s=>s.h)), t:sum(x,s=>s.h)}; });
    if(noArea.length) rowsA.push({a:"(area kosong)", sop:false, v:codes.map(c=>sum(noArea.filter(s=>s.c===c),s=>s.h)), t:sum(noArea,s=>s.h)});
    const sopSum = sum(rowsA.filter(x=>x.sop), x=>x.t), ok = Math.abs(sopSum-rt) < 0.01; if(!ok) nFalse++;
    rowsA.forEach((x,i)=>{ t5rows.push([i?"":r, x.a, ...x.v, x.t, i?"":rt, i?"":(ok?"TRUE":"FALSE")]);
      t5 += `<tr><td>${i?"":`<span class="tag"><i style="background:${RCOL[r]}"></i><b>${r}</b></span>`}</td><td>${esc(x.a)}${x.sop?"":' <small style="color:var(--bad)">nama area lama</small>'}</td>${x.v.map(v=>`<td class="v">${gv(v)}</td>`).join("")}<td class="v sep" style="font-weight:600">${gv(x.t)}</td><td class="v" style="font-weight:700">${i?"":fh(rt)}</td><td class="r" style="font-weight:700;color:${ok?"var(--good)":"var(--bad)"}">${i?"":(ok?"TRUE":"FALSE")}</td></tr>`; });
    const tv = codes.map(c=>sum(arr.filter(s=>s.c===c),s=>s.h));
    t5rows.push(["", `Total ${r}`, ...tv, rt, "", ""]);
    t5 += `<tr class="tot"><td></td><td>Total ${r}</td>${tv.map(v=>`<td class="r">${gv(v)}</td>`).join("")}<td class="r sep">${fh(rt)}</td><td></td><td></td></tr>`;
  });
  $("cT5").innerHTML = t5 + `</tbody></table>`;
  out.t5note = `Jam per tipe · Cek = TRUE bila jumlah area kerja sama dengan total route${nFalse?` · ${nFalse} route FALSE karena ada nama area lama (Area Tapatmekar / Bintitapat)`:""}`;
  out.t5rows = t5rows;

  return out;
}

function renderEvents(){
  if(!EXP) return;
  const q = st.q;
  const list = EXP.S.filter(s=>s.h>0).filter(s=>!q || [s.desc,s.area,s.blok,s.t2,TN[s.c],s.r,String(s.km??"")].join(" ").toLowerCase().includes(q))
    .sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:(a.f<b.f?-1:1));
  $("pEvt").textContent = `${list.length} kejadian · ${fh(sum(list,s=>s.h))} jam${q?` · cari “${st.q}”`:""}${st.open.evt?" · baris durasi 0 tidak ditampilkan":" · klik Tampilkan untuk melihat daftar"}`;
  if(!st.open.evt){ $("tEvt").innerHTML=""; return; }
  $("tEvt").innerHTML = `<table><thead><tr><th>No</th><th>Tanggal</th><th>Jam</th><th class="r">Durasi (jam)</th><th>Route</th><th>Area / Blok</th><th class="r">KM</th><th>Tipe</th><th>Desc Type2</th><th>Keterangan</th></tr></thead><tbody>`
    + (list.length ? list.map(s=>`<tr><td>${s.no??""}</td><td>${dLabel(s.d)}</td><td>${s.f}–${s.t}</td><td class="r">${fh(s.h)}</td><td><span class="tag"><i style="background:${RCOL[s.r]}"></i>${s.r}</span></td><td>${esc(s.blok||s.area)}</td><td class="r">${s.km??""}</td><td><span class="badge" style="background:${TCOL[s.c]}">${s.c}</span> ${TN[s.c]}</td><td>${esc(s.t2)}</td><td class="wrap">${esc(s.desc)}</td></tr>`).join("")
      : `<tr><td colspan="10" class="empty">Tidak ada kejadian</td></tr>`) + `</tbody></table>`;
}

/* ---------- PDF ---------- */
function presentPDF(){
  const wasDark = document.documentElement.getAttribute("data-theme")==="dark";
  const oldTitle = document.title;
  if(wasDark) document.documentElement.removeAttribute("data-theme");
  document.title = `Loss Time & Curah Hujan MMJ - ${rangeText()}`;
  RP.open=false; render();
  const done = () => { document.title=oldTitle; if(wasDark){ document.documentElement.setAttribute("data-theme","dark"); render(); } removeEventListener("afterprint", done); };
  addEventListener("afterprint", done);
  setTimeout(()=>window.print(), 120);
}

/* ---------- Export Excel (.xlsx tanpa internet) ---------- */
const CRC = (()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
const crc32 = b => { let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
async function deflate(d){
  if(typeof CompressionStream==="undefined") return null;
  try{ const s=new Blob([d]).stream().pipeThrough(new CompressionStream("deflate-raw")); return new Uint8Array(await new Response(s).arrayBuffer()); }
  catch(e){ return null; }
}
async function zipFiles(files){
  const enc=new TextEncoder(), parts=[], central=[]; let off=0;
  for(const f of files){
    const nm=enc.encode(f.name), raw=f.data, crc=crc32(raw);
    const z=await deflate(raw), method=z?8:0, d=z||raw;
    const h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,method,true); h.setUint16(12,0x21,true);
    h.setUint32(14,crc,true); h.setUint32(18,d.length,true); h.setUint32(22,raw.length,true); h.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(h.buffer), nm, d);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,method,true); c.setUint16(14,0x21,true);
    c.setUint32(16,crc,true); c.setUint32(20,d.length,true); c.setUint32(24,raw.length,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer), nm);
    off += 30+nm.length+d.length;
  }
  const csz=central.reduce((a,x)=>a+x.length,0), e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,csz,true); e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
const xesc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,"");
const colL = i => { let s=""; i++; while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; };
function sheetXML(s){
  let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
  if(s.freeze) x+=`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${s.freeze}" topLeftCell="A${s.freeze+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
  if(s.widths) x+="<cols>"+s.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")+"</cols>";
  x+="<sheetData>";
  s.rows.forEach((r,ri)=>{ x+=`<row r="${ri+1}">`;
    (r||[]).forEach((c,ci)=>{ let v=c, st_=null; if(c && typeof c==="object"){ v=c.v; st_=c.s; } if(v==null || v==="") return;
      const ref=colL(ci)+(ri+1);
      if(typeof v==="number" && isFinite(v)) x+=`<c r="${ref}" s="${st_!=null?st_:(Number.isInteger(v)?4:2)}"><v>${v}</v></c>`;
      else x+=`<c r="${ref}" t="inlineStr" s="${st_||0}"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`; });
    x+="</row>"; });
  x+="</sheetData>";
  if(s.filter) x+=`<autoFilter ref="${s.filter}"/>`;
  return x+"</worksheet>";
}
function makeXlsx(sheets){
  const enc=new TextEncoder(), X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', N=sheets.length;
  const styles = X+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="#,##0"/></numFmts>'
    +'<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF3730A3"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    +'<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8E8FF"/><bgColor indexed="64"/></patternFill></fill></fills>'
    +'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    +'<cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="3" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>';
  const files=[
    {name:"[Content_Types].xml", data:enc.encode(X+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")+"</Types>")},
    {name:"_rels/.rels", data:enc.encode(X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
    {name:"xl/workbook.xml", data:enc.encode(X+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>`<sheet name="${xesc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")+"</sheets></workbook>")},
    {name:"xl/_rels/workbook.xml.rels", data:enc.encode(X+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")+`<Relationship Id="rId${N+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)},
    {name:"xl/styles.xml", data:enc.encode(styles)},
    ...sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`, data:enc.encode(sheetXML(s))})),
  ];
  return zipFiles(files);
}
const HD = a => a.map(v=>({v, s:1}));
const xdate = d => ({v:(Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8))-Date.UTC(1899,11,30))/864e5, s:7});
function buildSheets(){
  const E = EXP, r2 = v => Math.round((v||0)*100)/100, RS = E.routesSel;
  const title = t => [[{v:t,s:3}],["PT. Musi Mitra Jaya · Periode: "+rangeText()],[`Route: ${RS.join(", ")} · Tipe: ${st.type?TN[st.type]:"semua"}`],[]];
  const ring = [...title("Ringkasan Loss Time & Curah Hujan"), HD(["Indikator","Nilai","Satuan"]),
    ["Total Loss Time (H0) - tanpa jam ganda antar route", r2(E.H0), "jam"],
    ["Jumlah loss time 3 route (H1 + ISP + H2)", r2(E.sumR), "jam"], ["Jam tumpang tindih antar route", r2(E.ovl), "jam"],
    ...ROUTES.map(r=>[`  · Loss time ${r}`, r2(sum(E.S.filter(s=>s.r===r),s=>s.h)), "jam"]),
    ["Loss Time MMJ (Technical + Traffic + Dust & Social) - H0", r2(E.lMMJ), "jam"], ["Loss Time bukan MMJ - H0", r2(E.H0-E.lMMJ), "jam"],
    ["Idle (Rain + Slippery) - H0", r2(E.lIdle), "jam"], ["Mitra Company - H0", r2(E.lMC), "jam"],
    ["Jumlah kejadian (durasi > 0)", E.evN, "kejadian"], ["Hari ada stop hauling", E.ltDays, "hari"],
    [`Curah hujan rata-rata per hari hujan (${E.RA.pos} pos)`, r2(E.RA.mm), "mm/hari"], ["Durasi hujan rata-rata per hari hujan", r2(E.RA.h), "jam/hari"], ["Hari hujan", E.rainDays, "hari"],
    [], ["H0 = gabungan 3 route; pada jam yang sama di lebih dari satu route hanya dihitung satu route (prioritas: Rain > Slippery > Technical > Social Issue > Dust > lainnya)."],
    ["Sumber: "+(DATA.meta.source||"-")+" · Loss time = Convert Duration (Input Stop Hauling) · Curah hujan = Input TCH · diperbarui "+(DATA.meta.generated||"-")]];
  const grp = [...title("Kelompok Loss Time - jam"), HD(["Route",...GROUPS.slice(0,3).map(g=>g[0]),"Loss Time MMJ",...GROUPS.slice(3).map(g=>g[0]),"Loss Time Bukan MMJ","Total Loss Time"])];
  E.grpRows.forEach(o=>grp.push([o.h0?"H0 (tanpa overlap)":o.lab, ...o.g.slice(0,3).map(r2), {v:r2(o.mmj),s:5}, ...o.g.slice(3).map(r2), {v:r2(o.non),s:5}, {v:r2(o.tot),s:5}]));
  const mx = [...title("Rekap Loss Time Route x Tipe (jam)"), HD(["Kode","Tipe",...RS,"Jumlah route","H0"])];
  const ct = RS.map(()=>0); let h0t=0;
  TYPES.forEach(t=>{ const v=RS.map(r=>sum(E.SA.filter(s=>s.r===r&&s.c===t.c),s=>s.h)); v.forEach((x,i)=>ct[i]+=x); const h=E.h0Type[t.c]||0; h0t+=h; mx.push([t.c,t.n,...v.map(r2),r2(sum(v,x=>x)),r2(h)]); });
  mx.push([{v:"",s:6},{v:"Total",s:6},...ct.map(v=>({v:r2(v),s:5})),{v:r2(sum(ct,x=>x)),s:5},{v:r2(h0t),s:5}]);
  const harian = [...title("Rekap Harian Loss Time & Curah Hujan"), HD([E.B.daily?"Tanggal":"Bulan",...RS.map(r=>`LT ${r} (jam)`),"Jumlah route (jam)","Overlap (jam)","H0 (jam)","Idle R+S H0 (jam)","Mitra H0 (jam)",...RS.map(r=>`RF ${r} rata-rata pos (mm)`)])];
  E.dayRows.forEach(o=>harian.push([E.B.daily?xdate(o.k):E.B.title(o.k),...RS.map(r=>r2(o[r])),r2(o.sum),r2(o.ovl),r2(o.h0),r2(o.rs),r2(o.mc),...RS.map(r=>r2(o["mm"+r]))]));
  const area = [...title("Loss Time per Area (jam)"), HD(["Route","Area",...TYPES.map(t=>t.c),"Total","Kejadian"])];
  RS.forEach(r=>DATA.areas[r].forEach(ar=>{ const x=E.S.filter(s=>s.r===r&&s.area===ar); if(!x.length && !AREA_SOP.has(ar)) return; area.push([r,ar,...TYPES.map(t=>r2(sum(x.filter(s=>s.c===t.c),s=>s.h))),r2(sum(x,s=>s.h)),x.filter(s=>s.h>0).length]); }));
  const mcs = [...title("Mitra Company per Desc Type2 (jam)"), HD(["Desc Type2",...RS,"Total","Kejadian"])];
  E.t2s.forEach(t=>{ const x=E.MCr.filter(s=>s.t2===t); mcs.push([t,...RS.map(r=>r2(sum(x.filter(s=>s.r===r),s=>s.h))),r2(sum(x,s=>s.h)),x.filter(s=>s.h>0).length]); });
  mcs.push([], HD(["Route","Desc Type2","Keterangan","Area","Hari","Kejadian","Jam"]));
  E.descRows.forEach(o=>mcs.push([o.r,o.t2,o.desc,o.area,o.days.size,o.n,r2(o.h)]));
  const posList = POS.filter(p=>RS.includes(p.r));
  const ch = [...title("Curah Hujan Harian per Pos (akumulasi Input TCH)"), HD(["Tanggal",...posList.flatMap(p=>[`${p.n} RF (mm)`,`${p.n} Rain hours (jam)`])])];
  const days=[...new Set(E.R.map(x=>x.d))].sort();
  days.forEach(d=>ch.push([xdate(d),...posList.flatMap(p=>{ const x=E.R.filter(y=>y.d===d&&y.p===p.n); return [r2(sum(x,y=>y.mm)),r2(sum(x,y=>y.h))]; })]));
  ch.push([{v:"Total",s:6},...posList.flatMap(p=>{ const x=E.R.filter(y=>y.p===p.n); return [{v:r2(sum(x,y=>y.mm)),s:5},{v:r2(sum(x,y=>y.h)),s:5}]; })]);
  const evH = ["No","Tanggal","Dari","Sampai","Durasi (jam)","Route","Area","Blok","KM","Kode","Tipe","Desc Type2","Keterangan"];
  const ev = [HD(evH)];
  [...E.S].sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0).forEach(s=>ev.push([s.no??"",xdate(s.d),s.f,s.t,{v:s.h,s:2},s.r,s.area,s.blok,s.km??"",s.c,TN[s.c],s.t2,s.desc]));
  const tch = [HD(["No","Tanggal","Pos","Route","Dari","Sampai","Rainfall (mm)","Durasi (jam)"])];
  E.R.forEach(x=>tch.push([x.no??"",xdate(x.d),x.p,POSR[x.p],x.f,x.t,{v:x.mm,s:2},{v:x.h,s:2}]));
  const ck = [HD(["Sumber","No","Tanggal","Masalah","Status"])];
  (DATA.cek||[]).forEach(c=>ck.push([c.src,c.no??"",c.d,c.msg,c.hapus?"Tidak dihitung":"Tetap dihitung"]));
  const t5 = [...title("Loss Time per Route, Area Kerja & Tipe - jam"), HD(["Route","Area Kerja",...TYPES.map(t=>t.c),"Total","Grand Total","Cek"])];
  (E.t5rows||[]).forEach(r=>t5.push(r.map(v=>typeof v==="number"?r2(v):v)));
  return [
    {name:"Ringkasan", rows:ring, widths:[52,14,10]},
    {name:"Kelompok Loss Time", rows:grp, widths:[18,...Array(13).fill(13)]},
    {name:"Area x Tipe", rows:t5, widths:[8,20,...TYPES.map(()=>7),10,12,8]},
    {name:"Route x Tipe", rows:mx, widths:[8,20,...RS.map(()=>12),14,12]},
    {name:"Rekap Harian", rows:harian, widths:[13,...Array(RS.length*2+5).fill(14)], freeze:5},
    {name:"Per Area", rows:area, widths:[8,18,...TYPES.map(()=>7),10,10], freeze:5},
    {name:"Mitra Company", rows:mcs, widths:[20,12,60,16,8,10,10]},
    {name:"Curah Hujan", rows:ch, widths:[12,...Array(posList.length*2).fill(13)], freeze:5},
    {name:"Detail Stop Hauling", rows:ev, widths:[6,11,7,7,11,7,16,18,7,6,16,18,70], freeze:1, filter:`A1:${colL(evH.length-1)}${ev.length}`},
    {name:"Detail TCH", rows:tch, widths:[6,11,14,7,7,7,13,12], freeze:1, filter:`A1:H${tch.length}`},
    {name:"Cek Data", rows:ck, widths:[18,6,12,70,16], freeze:1},
  ];
}
async function exportExcel(btn){
  try{
    btn && (btn.disabled=true);
    const blob = await makeXlsx(buildSheets());
    const name = `Loss Time & Curah Hujan MMJ - ${rangeText().replace(/[\\/:*?"<>|]/g,"-")}.xlsx`;
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  } catch(err){ alert("Export Excel gagal: "+err.message); }
  finally{ btn && setTimeout(()=>btn.disabled=false, 600); }
}
document.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{ if(b.dataset.act==="pdf") presentPDF(); else exportExcel(b); });

/* cek data (statis) */
{
  const ck = DATA.cek || [];
  $("pCek").textContent = `${ck.filter(c=>c.hapus).length} baris tidak dihitung · ${ck.filter(c=>!c.hapus).length} baris ditandai tapi tetap dihitung · cari di Excel pakai kolom No`;
  $("tCek").innerHTML = `<table><thead><tr><th>Sumber</th><th>No</th><th>Tanggal</th><th>Masalah</th></tr></thead><tbody>`
    + (ck.length ? ck.map(c=>`<tr><td>${c.src}</td><td>${c.no??""}</td><td>${dLabel(c.d)}</td><td style="${c.hapus?"color:var(--crit);font-weight:600":""}">${esc(c.msg)}</td></tr>`).join("")
      : `<tr><td colspan="4" class="empty">Tidak ada data bermasalah</td></tr>`) + `</tbody></table>`;
}
$("note").innerHTML = `<span aria-hidden="true">⚠</span><span><b>Catatan data:</b> dibuat pada ${DATA.meta.generated} dari ${(DATA.meta.files||[]).length} file bulanan: <i>${esc((DATA.meta.files||[]).map(f=>f.file.replace(" Info stop Hauling","")).join(", "))}</i> (prioritas R_Adjust, lalu revisi R_nn tertinggi). Loss time = kolom <b>Convert Duration</b> sheet Input Stop Hauling (sudah direkonsil &amp; duplikat dihapus; file Jan–Mei kolom ini tanpa judul) — ${DATA.stop.length} baris, termasuk ${DATA.stop.filter(s=>!s.h).length} baris berdurasi 0. Pembagian H1/ISP/H2 dari kolom Route; Area ISP selalu dihitung ISP (file Jan–Jun belum punya route ISP). Jan–Jun belum memakai kode Mitra Company &amp; Desc Type2. Curah hujan = sheet Input TCH (${DATA.rain.length} catatan) diakumulasi per hari per pos; rata-rata route dihitung dari pos yang punya catatan.</span>`;

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
