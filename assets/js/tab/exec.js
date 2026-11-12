/* assets/js/tab/exec.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){

const BLN=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"], BLNF=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const nf0=new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}), nf1=new Intl.NumberFormat("id-ID",{maximumFractionDigits:1,minimumFractionDigits:1}), nf2=new Intl.NumberFormat("id-ID",{maximumFractionDigits:2,minimumFractionDigits:2});
const fmt=v=>nf0.format(v||0), pct=v=>v==null||!isFinite(v)?"–":nf1.format(v)+"%";
const short=v=>Math.abs(v)>=1e6?nf2.format(v/1e6)+" jt":Math.abs(v)>=1e4?nf1.format(v/1e3)+" rb":fmt(v);
const sum=a=>a.reduce((x,y)=>x+(y||0),0);
const dLabel=d=>`${+d.slice(8)} ${BLN[+d.slice(5,7)-1]} ${d.slice(0,4)}`;
const getD = k => (typeof window.mmjData==="function" ? window.mmjData(k) : null);
const H=getD("haul"), B=getD("batu"), L=getD("lt");
const go = t => { if(typeof window.mmjSwitch==="function") window.mmjSwitch(t); };
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
let st={p:"mtd"}; try{ st.p=localStorage.getItem("execPer")||"mtd"; }catch(e){}
ePer.onclick=e=>{ const b=e.target.closest("button"); if(!b) return; st.p=b.dataset.v; try{ localStorage.setItem("execPer",st.p); }catch(x){} render(); };
function applyTheme(t){ if(t==="dark") document.documentElement.setAttribute("data-theme","dark"); else document.documentElement.removeAttribute("data-theme"); eTheme.textContent="Tema: "+(t==="dark"?"gelap":"terang"); }
let theme="light"; try{ theme=localStorage.getItem("dashTheme3")||"light"; }catch(e){} applyTheme(theme);
eTheme.onclick=()=>{ theme=theme==="dark"?"light":"dark"; applyTheme(theme); try{ localStorage.setItem("dashTheme3",theme); }catch(e){} };
ePdf.onclick=()=>{ const dk=document.documentElement.getAttribute("data-theme")==="dark"; if(dk) applyTheme("light"); const done=()=>{ if(dk) applyTheme("dark"); removeEventListener("afterprint",done); }; addEventListener("afterprint",done); setTimeout(()=>print(),100); };
const tipEl=document.getElementById("etip");
const tip=(e,h)=>{ tipEl.innerHTML=h; tipEl.style.display="block"; const w=tipEl.offsetWidth,hh=tipEl.offsetHeight; let x=e.clientX+14,y=e.clientY+14; if(x+w>innerWidth-8) x=e.clientX-w-14; if(y+hh>innerHeight-8) y=e.clientY-hh-14; tipEl.style.left=x+"px"; tipEl.style.top=y+"px"; };
const hide=()=>tipEl.style.display="none";
const navL=[...document.querySelectorAll("#enav a")], secs=navL.map(a=>document.querySelector(a.getAttribute("href")));
addEventListener("scroll",()=>{ let k=0; secs.forEach((s,i)=>{ if(s && s.getBoundingClientRect().top<160) k=i; }); navL.forEach((a,i)=>a.classList.toggle("on",i===k)); },{passive:true});
const ICON={
  port:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 15h18l-2 5H5l-2-5Zm3 0V9h12v6M12 9V4"/></svg>',
  truck:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 16V7h11v9M13 10h4l4 4v2h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/></svg>',
  rock:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/></svg>',
  clock:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
};
const dchip=v=>v==null||!isFinite(v)?"":`<span class="d${v<100?" down":""}">${v>=100?"↑":"↓"} ${nf1.format(v)}%</span>`;

/* ---------- Coal Hauling (logika sama dengan dashboard Coal Hauling) ---------- */
const HC = H ? (()=>{
  const M=H.mitra, Y=H.meta.year, MO=H.meta.month, LD=H.meta.lastDay, DIM=H.meta.daysInMonth, CUR=Y===2026?MO-1:-1, A=H.annual, RK=H.rkap;
  const run=(r,i)=>{ let t=0,n=0; H.run[r].facts.forEach(f=>{ if(f[1]===i){ t+=f[5]; n+=f[6]; } }); return {t,n}; };
  const RUN={H02:M.map((_,i)=>run("H02",i)), H1:M.map((_,i)=>run("H1",i))};
  const y02=(k,c)=>{ const s=A.st02[k], i=M.indexOf(c); return s==="ba"||s==="unsplit"?A.H0[c][k]+A.H2[c][k]:s==="wb"?A.WB[c][k]:s==="run"?RUN.H02[i].t:0; };
  const y1=(k,c)=>{ const s=A.st1[k], i=M.indexOf(c); return s==="ba"?A.H1[c][k]:s==="run"?RUN.H1[i].t:0; };
  const tg=(r,c,k)=>((RK[r==="H1"?"H1":"H02"]||{})[c]||[])[k]||0;
  const NM=CUR>=0?CUR+1:12, ks=[...Array(NM).keys()], frac=LD/DIM;
  const remDays=(DIM-LD)+[...Array(12).keys()].filter(k=>k>CUR).reduce((s,k)=>s+new Date(Y,k+1,0).getDate(),0);
  const calc=(r,p)=>M.map((c,i)=>{ const yv=r==="H1"?y1:y02;
    if(p==="mtd"){ const T=tg(r,c,CUR), a=RUN[r][i].t; return {c, a, trip:RUN[r][i].n, T, e:T*frac}; }
    const a=sum(ks.map(k=>yv(k,c))), e=sum(ks.map(k=>tg(r,c,k)*(k===CUR?frac:1))); return {c, a, T:sum([...Array(12).keys()].map(k=>tg(r,c,k))), e}; });
  return {M, MN:H.mitraName, logos:H.logos||{}, Y, MO, LD, DIM, CUR, NM, calc, remDays, h1Pct:RK.h1Pct, missH1:A.st1.slice(0,NM).map((s,k)=>s==="none"?BLN[k]:null).filter(Boolean)};
})() : null;

/* ---------- Loss time H0 (salinan aturan dashboard Loss Time: jam bersamaan antar route dihitung sekali) ---------- */
const PRI={R:0,S:1,T:2,SI:3,D:4}, ROUTES=["H1","ISP","H2"], MMJ_CODES=new Set(["T","A","E","M","CP","D","SI"]);
const tmin=s=>{ const m=/^(\d{1,2}):(\d{2})/.exec(s||""); if(!m) return null; const v=+m[1]*60 + +m[2]; return v<360?v+1440:v; };
if(L) L.stop.forEach(s=>{ if(s.__x) return; s.__x=1; const a=tmin(s.f); let b=tmin(s.t); if(a==null||b==null||!(s.h>0)){ s.a=null; return; } if(b<=a) b+=1440; s.a=a; s.b=b; s.fr=s.h/((b-a)/60); });
function calcH0(rows){
  const out={t:0,c:{}}; const add=(c,h)=>{ out.t+=h; out.c[c]=(out.c[c]||0)+h; };
  const byDay=new Map();
  rows.forEach(s=>{ if(!(s.h>0)) return; if(s.a==null){ add(s.c,s.h); return; } let l=byDay.get(s.d); if(!l){ l=[]; byDay.set(s.d,l); } l.push(s); });
  const pr=e=>PRI[e.c]??5;
  byDay.forEach(ev=>{ const pts=[...new Set(ev.flatMap(e=>[e.a,e.b]))].sort((x,y)=>x-y);
    for(let i=0;i<pts.length-1;i++){ const x=pts[i], y=pts[i+1], len=(y-x)/60; const act=ev.filter(e=>e.a<=x&&e.b>=y); if(!act.length) continue;
      let best=null,bp=99,bl=-1;
      for(const r of ROUTES){ const ar=act.filter(e=>e.r===r); if(!ar.length) continue; const p=Math.min(...ar.map(pr)), l=Math.min(1,ar.reduce((a,e)=>a+e.fr,0)); if(p<bp||(p===bp&&l>bl)){ bp=p; bl=l; best=ar; } }
      let cap=1; [...best].sort((u,v)=>pr(u)-pr(v)||v.fr-u.fr).forEach(e=>{ const f=Math.min(e.fr,cap); if(f>1e-9){ add(e.c,f*len); cap-=f; } }); } });
  return out;
}

/* ---------- helper tampilan ---------- */
const logo=c=>HC&&HC.logos[c]?`<span class="lg"><img src="${HC.logos[c]}" alt=""></span>`:`<span class="lg" style="background:var(--m${c});color:#fff;font-weight:800;font-size:10px">${c}</span>`;
const mbar=(a,e,T,col)=>{ const mx=Math.max(T,a,1), p=e?a/e*100:null; return `<div class="mb"><div class="t"><i style="width:${a/mx*100}%;background:${col}"></i>${T?`<b style="left:${e/mx*100}%"></b>`:""}</div><span class="${p==null?"":p>=100?"up":"down"}">${pct(p)}</span></div>`; };
function hbars(el,items,unit){ if(!items.length){ el.innerHTML='<div class="empty">Tidak ada data</div>'; return; } const mx=Math.max(...items.map(i=>i.v),1);
  el.innerHTML=`<div class="hb">${items.map(it=>`<div class="hbr"><span class="lb" title="${it.n}">${it.n}</span><span class="tr"><i style="width:${it.v/mx*100}%;background:${it.c}"></i></span><span class="vl">${it.txt||fmt(it.v)+" "+unit}${it.x?` <em>${it.x}</em>`:""}</span></div>`).join("")}</div>`; }
const dlCmp=v=>{ const a=Math.abs(v), f=(x,d)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:d,minimumFractionDigits:d}).format(x); return a>=1e6?f(v/1e6,2)+"jt":a>=1e4?f(v/1e3,1)+"rb":a>=1e3?f(v/1e3,2)+"rb":f(v,0); };
function miniCols(vals,labels,col,unit){ if(!vals.length) return ""; const W=320,Hh=110,m=6,mx=Math.max(...vals,1),bw=(W-2*m)/vals.length;
  const head=Math.max(0,...vals.map(v=>v?dlCmp(v).length*5.4:0))+8, chip=bw>=40;
  const lab=(v,x,yt)=>{ if(!v) return ""; const t=dlCmp(v);
    if(chip){ const w=t.length*6+10; return `<g pointer-events="none"><rect x="${x-w/2}" y="${yt-19}" width="${w}" height="16" rx="8" fill="var(--surface-solid)" stroke="${col}" stroke-width="1.2"/><text x="${x}" y="${yt-7.5}" text-anchor="middle" style="font-size:10px;font-weight:700;fill:${col}">${t}</text></g>`; }
    return `<text x="${x+3}" y="${yt-4}" transform="rotate(-90 ${x+3} ${yt-4})" pointer-events="none" style="font-size:9px;font-weight:700;fill:${col}">${t}</text>`; };
  const H0=chip?22:head;
  return `<svg viewBox="0 0 ${W} ${Hh+16+H0}" width="100%" style="height:auto" role="img">${vals.map((v,i)=>{ const h=v/mx*Hh, x=m+i*bw; return `<rect class="mc" data-i="${i}" x="${x+bw*.15}" y="${H0+Hh-h}" width="${bw*.7}" height="${Math.max(h,.5)}" rx="2" fill="${col}"/>`+lab(v,x+bw/2,H0+Hh-h); }).join("")}${labels.map((l,i)=>l?`<text x="${m+i*bw+bw/2}" y="${H0+Hh+13}" text-anchor="middle">${l}</text>`:"").join("")}</svg>`; }
const mg=items=>`<div class="mg">${items.map(([l,v,e])=>`<div><span>${l}</span><b>${v}</b>${e?`<em title="${String(e).replace(/<[^>]+>/g,"")}">${e}</em>`:""}</div>`).join("")}</div>`;

function render(){
  hide();
  ePer.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===st.p));
  const P=st.p, perTxt=d=>P==="mtd"?`${BLNF[+d.slice(5,7)-1]} ${d.slice(0,4)} (s/d ${dLabel(d)})`:`Jan – ${dLabel(d)}`;
  const inP=(d,last)=>P==="mtd"?d.slice(0,7)===last.slice(0,7)&&d<=last:d.slice(0,4)===last.slice(0,4)&&d<=last;
  const hLast=HC?`${HC.Y}-${String(HC.MO).padStart(2,"0")}-${String(HC.LD).padStart(2,"0")}`:null;
  eEye.textContent=`Ringkasan eksekutif · ${P==="mtd"?"bulan berjalan":"tahun berjalan"}`;
  eSub.textContent=`Rekap dari dashboard Monitoring · ${hLast?"Coal Hauling s/d "+dLabel(hLast):""}${B?" · Batu Split s/d "+dLabel(B.meta.lastDate):""}${L?" · Loss Time s/d "+dLabel(L.meta.last):""}`;
  eStamp.innerHTML=`Diperbarui<br>${(B&&B.meta.generated)||(H&&H.meta.generated)||""}`;

  /* --- coal --- */
  let k02=null,k1=null;
  if(HC){ const r02=HC.calc("H02",P), r1=HC.calc("H1",P);
    const tot=r=>({a:sum(r.map(x=>x.a)),e:sum(r.map(x=>x.e)),T:sum(r.map(x=>x.T)),trip:sum(r.map(x=>x.trip||0))});
    k02=tot(r02); k1=tot(r1);
    pHm.textContent=`${P==="mtd"?`${BLNF[HC.MO-1]} ${HC.Y} s/d tgl ${HC.LD} · target = RKAP bulan ini × ${HC.LD}/${HC.DIM} hari`:`Jan – ${BLN[HC.CUR]} ${HC.Y} · target = RKAP s/d hari ini`} · garis hitam = target · H1 target ${HC.h1Pct}% RKAP H0+H2`;
    const row=(x,y)=>`<td class="r">${fmt(x.a)}</td><td class="r">${fmt(x.e)}</td><td>${mbar(x.a,x.e,P==="mtd"?x.T:x.e,"var(--k1)")}</td><td class="r">${fmt(y.a)}</td><td class="r">${fmt(y.e)}</td><td>${mbar(y.a,y.e,P==="mtd"?y.T:y.e,"var(--k4)")}</td>`;
    tHm.innerHTML=`<table><thead><tr><th rowspan="2">Mitra</th><th class="r" colspan="3" style="text-align:center">H0 + H2 · Port SBL</th><th class="r" colspan="3" style="text-align:center">H1 · CPP → ISP61</th></tr><tr><th class="r">Aktual (t)</th><th class="r">Target (t)</th><th>Capaian</th><th class="r">Aktual (t)</th><th class="r">Target (t)</th><th>Capaian</th></tr></thead><tbody>`
      + HC.M.map((c,i)=>`<tr><td><span class="tag">${logo(c)}<b>${c}</b></span></td>${row(r02[i],r1[i])}</tr>`).join("")
      + `</tbody><tfoot><tr><td>Total</td>${row(k02,k1)}</tr></tfoot></table>`;
    // RKAP & sisa
    const ry02=HC.calc("H02","ytd"), ry1=HC.calc("H1","ytd"), t02=tot(ry02), t1=tot(ry1);
    pRk.textContent=`Actual Jan–${BLN[HC.CUR]} vs RKAP setahun · sisa ${HC.remDays} hari s/d 31 Des`;
    const blk=(n,t,col)=>{ const s=Math.max(t.T-t.a,0), mx=Math.max(t.T,t.a,1);
      return `<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;font-size:12.5px"><b>${n}</b><span class="${t.a>=t.e?"up":"down"}" style="font-weight:700">${pct(t.T?t.a/t.T*100:null)} dari RKAP</span></div>
        <div class="bar" style="--c:${col}"><i style="width:${t.a/mx*100}%"></i><b style="left:${t.e/mx*100}%"></b></div>
        ${mg([["Actual YTD",`${short(t.a)}<small>t</small>`,`dari ${short(t.T)} t`],["Sisa angkutan",`${short(s)}<small>t</small>`,s?`${fmt(s)} t`:`lebih ${fmt(t.a-t.T)} t`],["Perlu/hari",`${fmt(HC.remDays?s/HC.remDays:0)}<small>t</small>`,`s/d 31 Des`]]).replace('class="mg"','class="mg" style="margin:10px 0 0"')}</div>`; };
    cRk.innerHTML=blk("H0 + H2 · Port SBL",t02,"var(--k1)")+blk("H1 · CPP → ISP61",t1,"var(--k4)")+(HC.missH1.length?`<div style="font-size:11px;color:var(--muted)">H1 ${HC.missH1.join(", ")} belum ada data di tabel tahunan.</div>`:"");
  } else { tHm.innerHTML='<div class="empty">Data Coal Hauling tidak tersedia</div>'; cRk.innerHTML=""; }

  /* --- batu split --- */
  let kb=null;
  if(B){ const F=B.fields.reduce((a,k,i)=>(a[k]=i,a),{}), last=B.meta.lastDate, di=B.dims.kategori.indexOf("Distribusi ke Area");
    const rows=B.rows.filter(r=>inP(r[0],last)); const ton=sum(rows.map(r=>r[F.ton])), dist=sum(rows.filter(r=>r[F.kategori]===di).map(r=>r[F.ton]));
    const days=new Set(rows.map(r=>r[0])).size, tg=B.tongkang.filter(t=>inP(t.selesai,last));
    const stok=B.stockpile&&B.stockpile.items?sum(B.stockpile.items.map(it=>sum(Object.values(it.own||{}).map(o=>sum(Object.values(o)))))):null;
    kb={ton,n:rows.length};
    pBt.textContent=perTxt(last);
    const JC=["var(--j1)","var(--j2)","var(--j3)"], J=B.dims.jenis.map((j,i)=>({n:j.replace("MMJ-","").replace("Splite","Split"),c:JC[i%3],v:sum(rows.filter(r=>r[F.jenis]===i).map(r=>r[F.ton]))})).sort((a,b)=>b.v-a.v);
    let series, labs;
    if(P==="mtd"){ const ld=+last.slice(8); series=[...Array(ld).keys()].map(d=>sum(rows.filter(r=>+r[0].slice(8)===d+1).map(r=>r[F.ton]))); labs=series.map((_,i)=>i===0||(i+1)%5===0?String(i+1):""); }
    else { const mo=+last.slice(5,7); series=[...Array(mo).keys()].map(k=>sum(rows.filter(r=>+r[0].slice(5,7)===k+1).map(r=>r[F.ton]))); labs=series.map((_,k)=>BLN[k]); }
    cBt.innerHTML=mg([["Tonase angkut",`${short(ton)}<small>t</small>`,`${fmt(rows.length)} rit`],["Distribusi ke area",`${pct(ton?dist/ton*100:null)}`,`${short(dist)} t`],["Rata-rata/hari",`${fmt(days?ton/days:0)}<small>t</small>`,`${days} hari operasi`],["Tongkang diterima",`${tg.length}`,`${short(sum(tg.map(t=>t.ton)))} t`],["Stok akhir",stok==null?"–":`${short(stok)}<small>t</small>`,B.stockpile&&B.stockpile.month?`Daily Summary ${B.stockpile.month}`:""],["Rata-rata/rit",`${nf2.format(rows.length?ton/rows.length:0)}<small>t</small>`,""]])
      +`<div class="ttl2">Tonase ${P==="mtd"?"harian":"bulanan"}</div>${miniCols(series,labs,"var(--j1)","t")}<div class="ttl2">Per jenis batu</div>`;
    const hj=document.createElement("div"); hbars(hj,J.filter(j=>j.v>0).map(j=>({...j,x:ton?nf1.format(j.v/ton*100)+"%":""})),"t"); cBt.appendChild(hj);
    cBt.querySelectorAll(".mc").forEach(r=>{ const i=+r.dataset.i; r.onmousemove=e=>tip(e,`<b>${P==="mtd"?dLabel(last.slice(0,8)+String(i+1).padStart(2,"0")):BLNF[i]}</b><br>${fmt(series[i])} t`); r.onmouseleave=hide; });
  } else cBt.innerHTML='<div class="empty">Data Batu Split tidak tersedia</div>';

  /* --- loss time & hujan --- */
  let kl=null;
  if(L){ const last=L.meta.last, S=L.stop.filter(s=>inP(s.d,last)), h0=calcH0(S), TN=Object.fromEntries(L.types.map(t=>[t.c,t.n]));
    const mmj=sum(Object.entries(h0.c).filter(([c])=>MMJ_CODES.has(c)).map(([,v])=>v));
    kl={t:h0.t,mmj};
    pLt.textContent=`${perTxt(last)} · jam · H0 = gabungan 3 route tanpa jam ganda`;
    const top=Object.entries(h0.c).sort((a,b)=>b[1]-a[1]).slice(0,5);
    cLt.innerHTML=mg([["Loss time H0",`${nf1.format(h0.t)}<small>jam</small>`,`${S.filter(s=>s.h>0).length} kejadian`],["Loss time MMJ",`${nf1.format(mmj)}<small>jam</small>`,`${pct(h0.t?mmj/h0.t*100:null)} dari H0`],["Bukan MMJ",`${nf1.format(h0.t-mmj)}<small>jam</small>`,`Idle, NH, FM, RG, Mitra`]])
      +`<div class="legend"><span><i style="background:var(--mmj)"></i>Loss Time MMJ</span><span><i style="background:var(--non)"></i>Bukan MMJ</span></div><div class="split">${h0.t?`<div style="flex:${mmj};background:var(--mmj)"></div><div style="flex:${h0.t-mmj};background:var(--non)"></div>`:""}</div>`
      +`<div class="ttl2">Per route (jumlah jam route)</div><div id="eLtR"></div><div class="ttl2">Penyebab terbesar (H0)</div><div id="eLtC"></div>`;
    hbars(document.getElementById("eLtR"),ROUTES.map(r=>({n:r,c:"var(--k2)",v:sum(S.filter(s=>s.r===r).map(s=>s.h)),txt:null})).map(o=>({...o,txt:nf1.format(o.v)+" jam"})),"jam");
    hbars(document.getElementById("eLtC"),top.map(([c,v])=>({n:TN[c]||c,c:MMJ_CODES.has(c)?"var(--mmj)":"var(--non)",v,txt:nf1.format(v)+" jam",x:h0.t?nf1.format(v/h0.t*100)+"%":""})),"jam");
    // hujan
    const R=L.rain.filter(x=>inP(x.d,last)), acc=new Map(); R.forEach(x=>{ const k=x.d+"|"+x.p; const o=acc.get(k)||{mm:0,h:0,p:x.p,d:x.d}; o.mm+=x.mm||0; o.h+=x.h||0; acc.set(k,o); });
    const wet=[...acc.values()].filter(o=>o.mm>0), days=new Set(wet.map(o=>o.d)).size, posN=L.pos.length;
    const byPos=L.pos.map(p=>({n:p.n.replace("MMJ ",""),v:sum([...acc.values()].filter(o=>o.p===p.n).map(o=>o.mm)),h:sum([...acc.values()].filter(o=>o.p===p.n).map(o=>o.h)),r:p.r}));
    const wettest=[...byPos].sort((a,b)=>b.v-a.v)[0];
    pRf.textContent=`${perTxt(last)} · mm · per pos pengukuran`;
    cRf.innerHTML=mg([["Hari hujan",`${days}<small>hari</small>`,"minimal 1 pos hujan"],["Rata-rata harian",`${nf1.format(wet.length?sum(wet.map(o=>o.mm))/wet.length:0)}<small>mm</small>`,"per pos, pada hari hujan"],["Jam hujan",`${nf1.format(posN?sum(byPos.map(p=>p.h))/posN:0)}<small>jam</small>`,"rata-rata per pos"]])
      +`<div class="ttl2">Akumulasi curah hujan per pos</div><div id="eRfP"></div>`
      +(wettest&&wettest.v?`<div style="font-size:11.5px;color:var(--ink-2);margin-top:10px">Pos terbasah: <b>${wettest.n}</b> (${wettest.r}) · ${nf1.format(wettest.v)} mm</div>`:"");
    hbars(document.getElementById("eRfP"),byPos.map(p=>({n:`${p.n} · ${p.r}`,c:"var(--k5)",v:p.v,txt:nf1.format(p.v)+" mm"})),"mm");
  } else { cLt.innerHTML='<div class="empty">Data Loss Time tidak tersedia</div>'; cRf.innerHTML=""; }

  /* --- KPI --- */
  const kpi=(c,ic,l,v,d,n,bar,t)=>`<div class="kpi" style="--c:${c}" role="button" tabindex="0" data-go="${t}" aria-label="Buka dashboard ${l}"><span class="go">Buka →</span><div class="hd"><div class="ic">${ic}</div><div style="min-width:0"><div class="l">${l}</div><div class="v">${v}${d}</div></div></div>${bar||""}<div class="n">${n}</div></div>`;
  const bb=(k)=>k&&k.e?`<div class="bar"><i style="width:${Math.min(100,k.a/Math.max(k.e,k.a)*100)}%"></i><b style="left:${k.e/Math.max(k.e,k.a)*100}%"></b></div>`:"";
  eKpi.innerHTML=(HC?kpi("var(--k1)",ICON.port,"Coal H0+H2 · Port SBL",`${short(k02.a)}<small>t</small>`,dchip(k02.e?k02.a/k02.e*100:null),`target ${P==="mtd"?"s/d hari ini":"RKAP YTD"} ${fmt(k02.e)} t`,bb(k02),"haul")
      +kpi("var(--k4)",ICON.truck,"Coal H1 · CPP → ISP61",`${short(k1.a)}<small>t</small>`,dchip(k1.e?k1.a/k1.e*100:null),`target ${fmt(k1.e)} t (${HC.h1Pct}% RKAP)`,bb(k1),"haul"):"")
    +(kb?kpi("var(--k3)",ICON.rock,"Batu Split",`${short(kb.ton)}<small>t</small>`,"",`${fmt(kb.n)} rit · ${perTxt(B.meta.lastDate)}`,"","batu"):"")
    +(kl?kpi("var(--k2)",ICON.clock,"Loss Time H0",`${nf1.format(kl.t)}<small>jam</small>`,"",`MMJ ${nf1.format(kl.mmj)} jam (${pct(kl.t?kl.mmj/kl.t*100:null)}) · Bukan MMJ ${nf1.format(kl.t-kl.mmj)} jam`,"","lt"):"");
  eKpi.querySelectorAll("[data-go]").forEach(k=>{ k.onclick=()=>go(k.dataset.go); k.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(k.dataset.go); } }; });
  eNote.innerHTML=`<b>Catatan:</b> angka direkap otomatis dari dashboard Monitoring dengan aturan yang sama (Coal Hauling: H0+H2 = SBL WB / tabel BA, H1 = Input CH CCP / tabel CPP GPU-ISP68, target RKAP; Loss Time H0 tanpa jam ganda antar route; curah hujan = akumulasi harian per pos). Klik kartu atau tombol <i>Buka</i> untuk melihat rinciannya.`;
}
render();
;try{ if(typeof setView==="function") window.setView=setView; }catch(e){}
})();
