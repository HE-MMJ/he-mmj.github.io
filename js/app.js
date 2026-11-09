// Dashboard Timesheet HE - MMJ November 2026
// Data berasal dari js/data.js (const DATA dan const DAILY) - tidak perlu server.

// ---------- pilihan perbandingan ----------
let CMP = 'MA'; // 'MA' | 'RATIO' | 'PA'

const CMP_CFG = {
  MA: {
    field: 'MA',
    judul: 'MA',
    satuan: 'MA (%)',
    warna: '#d93025',
    tetapMax: 100,
    tick: v => v.toFixed(0) + '%',
    nilai: v => v.toFixed(1) + '%',
    catatan: 'Batang biru = HM Total (skala kiri, jam). Garis merah = MA % (skala kanan 0-100%).'
  },
  RATIO: {
    field: 'FuelRatio',
    judul: 'Fuel Ratio',
    satuan: 'Fuel Ratio (L/Jam)',
    warna: '#0d47a1',
    tetapMax: 30,
    tick: v => v.toFixed(2),
    nilai: v => v.toFixed(2),
    catatan: 'Batang biru = HM Total (skala kiri, jam). Garis biru = Fuel Ratio L/Jam (skala kanan 0-30).'
  },
  PA: {
    field: 'PAPct',
    judul: 'PA',
    satuan: 'PA (%)',
    warna: '#e67e22',
    tetapMax: 100,
    tick: v => v.toFixed(0) + '%',
    nilai: v => v.toFixed(1) + '%',
    catatan: 'Batang biru = HM Total (skala kiri, jam). Garis oranye = PA % (Physical Availability) dari blok EFISIENSI Review Unit (skala kanan 0-100%).'
  }
};

// ---------- state grafik ----------
let lastRows = [];   // data yang sedang tampil (untuk redraw saat hover)
let hoverIdx = -1;   // indeks batang yang disorot mouse
let GEO = null;      // geometri grafik terakhir (untuk hit-test mouse)
let animRAF = null;  // requestAnimationFrame animasi

function filtered() {
  const v = document.getElementById('fVendor').value;
  const area = document.getElementById('fArea').value;
  const jenis = document.getElementById('fJenis').value;
  return DATA.filter(d =>
    (v === 'ALL' || d.Vendor === v) &&
    (area === 'ALL' || (d.Area || '') === area) &&
    (jenis === 'ALL' || (d.Jenis || '-') === jenis)
  );
}

function num(x) {
  if (x === null || x === undefined) return 0;
  const s = String(x).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// format angka gaya Indonesia: titik untuk ribuan, koma untuk desimal (mis. 1.190,5)
function fmt(v, dec = 1) {
  const n = Number(v) || 0;
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

// skala "bulat" untuk sumbu kanan (1, 2, 2.5, 5, 10 x 10^n)
function niceMax(v) {
  if (!(v > 0)) return 1;
  const exp = Math.floor(Math.log10(v));
  const f = v / Math.pow(10, exp);
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * Math.pow(10, exp);
}

// ---------- state sortir tabel ----------
let SORT = { col: null, dir: 1 }; // col: 'HMTotal' | 'MA' | 'Fuel' | 'FuelRatio'

function render() {
  const rows = filtered();

  // kartu ringkasan
  const sumHM = rows.reduce((s, d) => s + num(d.HMTotal), 0);
  const sumFuel = rows.reduce((s, d) => s + num(d.Fuel), 0);
  const sumPA = rows.filter(d => num(d.PAPct) > 0);
  const avgPA = sumPA.length ? sumPA.reduce((s, d) => s + num(d.PAPct), 0) / sumPA.length : 0;
  const avgMA = rows.length ? rows.reduce((s, d) => s + num(d.MA), 0) / rows.length : 0;
  const sumRatio = rows.filter(d => num(d.FuelRatio) > 0);
  const avgRatio = sumRatio.length ? sumRatio.reduce((s, d) => s + num(d.FuelRatio), 0) / sumRatio.length : 0;
  document.getElementById('cards').innerHTML = [
    ['Unit tampil', rows.length, '#0f3d5e'],
    ['Total HM (Jam)', sumHM.toFixed(1), '#1677d2'],
    ['Rata-rata MA', avgMA.toFixed(1) + '%', '#d93025'],
    ['Rata-rata PA', avgPA.toFixed(1) + '%', '#e67e22'],
    ['Total Fuel (L)', fmt(sumFuel, 0), '#1e88e5'],
    ['Rata-rata Fuel Ratio', fmt(avgRatio, 2), '#0d47a1']
  ].map(([l, v, c]) => `<div class="card" style="--c:${c}"><div class="label">${l}</div><div class="val">${v}</div></div>`).join('');

  // tabel (urutan sesuai sortir aktif; default = urutan data)
  const tabelRows = [...rows];
  if (SORT.col) {
    tabelRows.sort((a, b) => (num(a[SORT.col]) - num(b[SORT.col])) * SORT.dir);
  }
  document.getElementById('tbody').innerHTML = tabelRows.map(d => `<tr>
    <td><b>${d.Unit || '-'}</b></td>
    <td>${d.Jenis || '-'}</td>
    <td>${d.Area || '-'}</td>
    <td>${d.Model || '-'}</td>
    <td><b>${num(d.HMTotal).toFixed(1)}</b></td>
    <td>${num(d.MA).toFixed(1)}%</td>
    <td>${num(d.PAPct).toFixed(1)}%</td>
    <td>${fmt(d.Fuel, 1)}</td>
    <td>${fmt(d.FuelRatio, 2)}</td>
  </tr>`).join('');

  lastRows = rows;
  hoverIdx = -1;
  animateChart();
  renderBelum();
}

// ---------- tabel Timesheet Belum di Terima (grid Kode Unit | Area | 1..30 | Total) ----------
// ikut terfilter oleh Vendor, Area Kerja, dan Unit Type seperti tabel Review Unit
function renderBelum() {
  const tb = document.getElementById('belumTbody');
  if (!tb) return;
  const raw = (typeof BELUM !== 'undefined') ? BELUM : [];
  const all = Array.isArray(raw) ? raw : (raw ? [raw] : []);

  const fV = document.getElementById('fVendor').value;
  const fA = document.getElementById('fArea').value;
  const fJ = document.getElementById('fJenis').value;
  const list = all.filter(d =>
    (fV === 'ALL' || d.Vendor === fV) &&
    (fA === 'ALL' || (d.Area || '') === fA) &&
    (fJ === 'ALL' || (d.Jenis || '-') === fJ)
  );

  tb.innerHTML = list.map(d => {
    const days = d.Days || {};
    let total = 0;
    let cells = '';
    for (let hari = 1; hari <= 30; hari++) {
      const hm = num(days[String(hari)] ?? days[hari]);
      const ada = hm > 0;               // inputan terisi -> ceklis, masih 0 -> -
      if (ada) total++;
      cells += `<td class="day-cell">${ada ? '✓' : '-'}</td>`;
    }
    return `<tr>
      <td><b>${d.Unit || '-'}</b></td>
      <td>${d.Area || '-'}</td>
      ${cells}
      <td><b>${total}</b></td>
    </tr>`;
  }).join('');
}

// ---------- animasi: batang & garis tumbuh dari 0 ----------
function animateChart() {
  if (animRAF) cancelAnimationFrame(animRAF);
  const dur = 650;
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
    drawCombo(lastRows, e);
    if (p < 1) {
      animRAF = requestAnimationFrame(step);
    } else {
      animRAF = null;
      drawCombo(lastRows, 1);
    }
  };
  animRAF = requestAnimationFrame(step);
}

// batang dengan sudut membulat (fallback kalau roundRect tidak ada)
function barPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, Math.max(h, 0) / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- Grafik gabungan: BAR = HM Total, GARIS = metrik pembanding ----
// prog = 0..1 (progres animasi), 1 = tampil penuh
function drawCombo(rows, prog = 1) {
  const cfg = CMP_CFG[CMP];
  const c = document.getElementById('comboChart');
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const H = 360;
  c.width = c.clientWidth * dpr;
  c.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = c.clientWidth, h = H;
  ctx.clearRect(0, 0, w, h);

  const topN = window.innerWidth < 620 ? 8 : 15;
  const top15 = [...rows].sort((a, b) => num(b.HMTotal) - num(a.HMTotal)).slice(0, topN);
  // urutkan sesuai nomor unit lalu Unit ID (tidak acak)
  const nomorUnit = u => { const m = String(u || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; };
  const top = top15.sort((a, b) =>
    (nomorUnit(a.Unit) - nomorUnit(b.Unit)) ||
    String(a.Unit).localeCompare(String(b.Unit), 'id', { numeric: true })
  );
  if (!top.length) {
    GEO = null;
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Segoe UI';
    ctx.fillText('Tidak ada data untuk filter ini.', 20, 30);
    return;
  }

  const maxHM = Math.max(...top.map(d => num(d.HMTotal)), 1);
  const vals = top.map(d => num(d[cfg.field]));
  const maxCmp = cfg.tetapMax !== null ? cfg.tetapMax : niceMax(Math.max(...vals) * 1.15);

  const padL = 64, padR = 74, padB = 84, padT = 34;
  const plotW = w - padL - padR;
  const plotH = h - padB - padT;
  const bw = plotW / top.length;
  const xCenter = i => padL + i * bw + bw / 2;
  const baseY = h - padB;

  // simpan geometri untuk hit-test mouse
  GEO = { padL, padB, padT, bw, plotH, n: top.length, w, h, xCenter };

  // --- sorotan latar untuk batang yang di-hover ---
  if (hoverIdx >= 0 && hoverIdx < top.length) {
    ctx.fillStyle = 'rgba(22,119,210,0.07)';
    ctx.fillRect(padL + hoverIdx * bw, padT, bw, plotH + 6);
  }

  // --- grid + sumbu kiri (HM) + sumbu kanan (metrik) ---
  ctx.font = '11px Segoe UI';
  for (let i = 0; i <= 4; i++) {
    const y = baseY - i * plotH / 4;
    ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillStyle = '#0f3d5e';
    ctx.textAlign = 'right';
    ctx.fillText((maxHM * i / 4).toFixed(0), padL - 8, y + 4);
    ctx.fillStyle = cfg.warna;
    ctx.textAlign = 'left';
    ctx.fillText(cfg.tick(maxCmp * i / 4), w - padR + 8, y + 4);
  }

  // judul sumbu
  ctx.fillStyle = '#0f3d5e';
  ctx.textAlign = 'center';
  ctx.fillText('HM (jam)', padL - 34, padT - 16);
  ctx.fillStyle = cfg.warna;
  ctx.fillText(cfg.satuan, w - padR + 36, padT - 16);

  // --- bar HM ---
  const barW = bw * 0.64;
  top.forEach((d, i) => {
    const hm = num(d.HMTotal);
    const bh = plotH * (hm / maxHM) * prog;
    const x = padL + i * bw + bw * 0.18;
    const y = baseY - bh;
    const aktif = i === hoverIdx;

    if (bh > 0.5) {
      const grad = ctx.createLinearGradient(0, y, 0, baseY);
      if (aktif) {
        grad.addColorStop(0, '#4aa6f5');
        grad.addColorStop(1, '#0f5fb8');
      } else {
        grad.addColorStop(0, '#2b8ce0');
        grad.addColorStop(1, '#1677d2');
      }
      ctx.save();
      if (aktif) {
        ctx.shadowColor = 'rgba(13,71,161,0.45)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;
      }
      ctx.fillStyle = grad;
      barPath(ctx, x, y, barW, bh, 4);
      ctx.fill();
      ctx.restore();

      if (aktif) {
        ctx.strokeStyle = '#0d47a1';
        ctx.lineWidth = 1.5;
        barPath(ctx, x, y, barW, bh, 4);
        ctx.stroke();
      }
    }

    // angka HM (fade in setelah animasi jalan)
    if (hm > 0 && prog > 0.55) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (prog - 0.55) / 0.45);
      ctx.font = 'bold 10px Segoe UI';
      ctx.textAlign = 'center';
      if (bh > 22) {
        // angka ditaruh di bagian BAWAH bar (putih) supaya tidak tertutup garis
        ctx.fillStyle = '#ffffff';
        ctx.fillText(hm.toFixed(1), x + barW / 2, baseY - 6);
      } else {
        ctx.fillStyle = '#0f3d5e';
        ctx.fillText(hm.toFixed(1), x + barW / 2, y - 5);
      }
      ctx.restore();
    }

    // label unit
    ctx.save();
    ctx.translate(xCenter(i), baseY + 12);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = i === hoverIdx ? '#0d47a1' : '#334155';
    ctx.font = (i === hoverIdx ? 'bold ' : '') + '10px Segoe UI';
    ctx.textAlign = 'right';
    ctx.fillText(String(d.Unit).replace(/ (GIP|JTU|BDK|SKN)( H[12])?$/, ''), 0, 0);
    ctx.restore();
  });

  // --- garis metrik pembanding (ikut animasi naik dari dasar) ---
  const cmpY = v => baseY - plotH * (Math.min(Math.max(v, 0), maxCmp) / maxCmp);
  const cmpYA = v => baseY - (baseY - cmpY(v)) * prog;

  ctx.save();
  ctx.globalAlpha = Math.min(1, prog * 1.6);
  ctx.strokeStyle = cfg.warna;
  ctx.lineWidth = 2;
  ctx.beginPath();
  top.forEach((d, i) => {
    const x = xCenter(i), y = cmpYA(num(d[cfg.field]));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  top.forEach((d, i) => {
    const x = xCenter(i), y = cmpYA(num(d[cfg.field]));
    const r = i === hoverIdx ? 6 : 4;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = cfg.warna;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.restore();

  // --- label angka pada tiap titik garis ---
  if (prog > 0.7) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (prog - 0.7) / 0.3);
    ctx.font = 'bold 9px Segoe UI';
    ctx.textAlign = 'center';
    top.forEach((d, i) => {
      const v = num(d[cfg.field]);
      const x = xCenter(i), y = cmpY(v);
      const teks = cfg.nilai(v);
      const diAtas = y > padT + 16;
      const tw = ctx.measureText(teks).width;
      const ty = diAtas ? y - 7 : y + 13;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(x - tw / 2 - 2, ty - 8, tw + 4, 11);
      ctx.fillStyle = cfg.warna;
      ctx.fillText(teks, x, ty);
    });
    ctx.restore();
  }

  // --- legenda ---
  ctx.textAlign = 'left';
  ctx.font = '12px Segoe UI';
  ctx.fillStyle = '#1677d2';
  ctx.fillRect(padL, 8, 12, 8);
  ctx.fillStyle = '#0f3d5e';
  ctx.fillText('HM Total (jam)', padL + 18, 16);
  ctx.strokeStyle = cfg.warna;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(padL + 140, 12); ctx.lineTo(padL + 168, 12); ctx.stroke();
  ctx.fillStyle = cfg.warna;
  ctx.beginPath(); ctx.arc(padL + 154, 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f3d5e';
  ctx.fillText(cfg.satuan, padL + 174, 16);

  // --- tooltip saat hover ---
  if (hoverIdx >= 0 && hoverIdx < top.length && prog >= 1) {
    drawTooltip(ctx, top[hoverIdx], hoverIdx, cfg, GEO, barW, maxHM, baseY, plotH);
  }
}

// kotak tooltip: nama unit, vendor/unit type, HM, dan nilai metrik pembanding
function drawTooltip(ctx, d, i, cfg, geo, barW, maxHM, baseY, plotH) {
  const barTop = baseY - plotH * (num(d.HMTotal) / maxHM);
  const lines = [
    { t: String(d.Unit), bold: true, warna: '#0f3d5e' },
    { t: [d.Vendor, d.Jenis, d.Area].filter(Boolean).join(' - '), bold: false, warna: '#64748b' },
    { t: 'HM Total: ' + fmt(num(d.HMTotal), 1) + ' jam', bold: true, warna: '#1677d2' },
    { t: cfg.judul + ': ' + cfg.nilai(num(d[cfg.field])), bold: true, warna: cfg.warna }
  ];

  ctx.save();
  ctx.font = '11px Segoe UI';
  let maxW = 0;
  lines.forEach(l => {
    ctx.font = (l.bold ? 'bold ' : '') + '11px Segoe UI';
    maxW = Math.max(maxW, ctx.measureText(l.t).width);
  });

  const padX = 10, padY = 8, lineH = 15;
  const boxW = maxW + padX * 2;
  const boxH = lines.length * lineH + padY * 2 - 4;
  let bx = geo.xCenter(i) - boxW / 2;
  bx = Math.max(4, Math.min(bx, geo.w - boxW - 4));
  let by = barTop - boxH - 12;
  if (by < 4) by = Math.min(barTop + 12, geo.h - boxH - 4);

  // bayangan + kotak
  ctx.shadowColor = 'rgba(15,23,42,0.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  barPath(ctx, bx, by, boxW, boxH, 6);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  barPath(ctx, bx, by, boxW, boxH, 6);
  ctx.stroke();

  // isi teks
  ctx.textAlign = 'left';
  lines.forEach((l, k) => {
    ctx.font = (l.bold ? 'bold ' : '') + '11px Segoe UI';
    ctx.fillStyle = l.warna;
    ctx.fillText(l.t, bx + padX, by + padY + k * lineH + 4);
  });
  ctx.restore();
}

// ---------- interaksi mouse: hover batang ----------
(function pasangHover() {
  const c = document.getElementById('comboChart');
  if (!c) return;

  c.addEventListener('mousemove', e => {
    if (!GEO) return;
    const r = c.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    let idx = -1;
    if (x >= GEO.padL && x <= GEO.padL + GEO.bw * GEO.n) {
      const i = Math.floor((x - GEO.padL) / GEO.bw);
      if (i >= 0 && i < GEO.n) idx = i;
    }
    if (idx !== hoverIdx) {
      hoverIdx = idx;
      c.style.cursor = idx >= 0 ? 'pointer' : 'default';
      if (!animRAF) drawCombo(lastRows, 1);
    }
  });

  c.addEventListener('mouseleave', () => {
    if (hoverIdx !== -1) {
      hoverIdx = -1;
      c.style.cursor = 'default';
      if (!animRAF) drawCombo(lastRows, 1);
    }
  });

  // sentuh (HP): tap & geser menunjuk seperti hover
  function sentuh(e) {
    if (!GEO || !e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const r = c.getBoundingClientRect();
    const x = t.clientX - r.left;
    let idx = -1;
    if (x >= GEO.padL && x <= GEO.padL + GEO.bw * GEO.n) {
      const i = Math.floor((x - GEO.padL) / GEO.bw);
      if (i >= 0 && i < GEO.n) idx = i;
    }
    if (idx !== hoverIdx) {
      hoverIdx = idx;
      if (!animRAF) drawCombo(lastRows, 1);
    }
  }
  c.addEventListener('touchstart', sentuh, { passive: true });
  c.addEventListener('touchmove', sentuh, { passive: true });

  window.addEventListener('resize', () => {
    if (!animRAF) drawCombo(lastRows, 1);
  });
})();

// ---------- isi dropdown Area Kerja sesuai vendor ----------
function fillAreas() {
  const v = document.getElementById('fVendor').value;
  const sel = document.getElementById('fArea');
  const prev = sel.value;

  const areas = [...new Set(
    DATA.filter(d => v === 'ALL' || d.Vendor === v)
        .map(d => (d.Area || '').trim())
        .filter(a => a)
  )].sort((a, b) => a.localeCompare(b));

  sel.innerHTML = '<option value="ALL">Semua Area</option>' +
    areas.map(a => `<option value="${a}">${a}</option>`).join('');

  sel.value = (prev === 'ALL' || areas.includes(prev)) ? prev : 'ALL';
}

// ---------- isi dropdown Unit Type (JENIS) sesuai vendor + area ----------
function fillJenis() {
  const v = document.getElementById('fVendor').value;
  const area = document.getElementById('fArea').value;
  const sel = document.getElementById('fJenis');
  const prev = sel.value;

  const rows = DATA.filter(d =>
    (v === 'ALL' || d.Vendor === v) &&
    (area === 'ALL' || (d.Area || '') === area)
  );

  const jenisList = [...new Set(rows.map(d => d.Jenis || '-'))].sort((a, b) => a.localeCompare(b));

  sel.innerHTML = '<option value="ALL">Semua Unit Type</option>' +
    jenisList.map(j => `<option value="${j}">${j}</option>`).join('');

  sel.value = (prev === 'ALL' || jenisList.includes(prev)) ? prev : 'ALL';
}

// ---------- sortir kolom tabel via klik header ----------
function refreshArrows() {
  document.querySelectorAll('.arrow').forEach(a => {
    a.textContent = (SORT.col === a.dataset.arrow) ? (SORT.dir === 1 ? '▲' : '▼') : '';
  });
}

function setSort(col) {
  if (SORT.col === col) {
    SORT.dir = -SORT.dir;          // klik kolom yang sama -> balik arah
  } else {
    SORT.col = col;
    SORT.dir = -1;                 // kolom baru -> terbesar dulu
  }
  refreshArrows();
  render();
}

document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => setSort(th.dataset.sort));
});

// ---------- menu perbandingan ----------
function setCmp(key) {
  CMP = key;
  const cfg = CMP_CFG[key];
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cmp === key);
  });
  const topN = window.innerWidth < 620 ? 8 : 15;
  document.getElementById('chartTitle').textContent =
    `Grafik HM (Bar) & ${cfg.judul} (Garis) per Unit - Top ${topN}`;
  document.getElementById('chartNote').textContent = cfg.catatan;
  render();
}

document.querySelectorAll('.seg-btn').forEach(b => {
  b.addEventListener('click', () => setCmp(b.dataset.cmp));
});

document.getElementById('fVendor').addEventListener('change', () => { fillAreas(); fillJenis(); render(); });
document.getElementById('fArea').addEventListener('change', () => { fillJenis(); render(); });
document.getElementById('fJenis').addEventListener('change', () => render());

fillAreas();
fillJenis();
setCmp('MA');
